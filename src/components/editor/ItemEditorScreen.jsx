import {
  createElement,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import { BacklinksPanel } from './BacklinksPanel';
import { ItemEditor } from './ItemEditor';
import { AppDialog } from '../ui/AppDialog';
import { useAuth } from '../../lib/auth';
import { useAppChrome } from '../../lib/app-chrome';
import { useCommandContext } from '../../lib/command-context';
import {
  buildTitleFromFilename,
  formatFilenameForDisplay,
  titleOverridesFilename,
} from '../../lib/filenames';
import {
  normalizeFilenameValue,
  parseEditorMarkdownDocument,
  replaceEditorFrontmatterField,
} from '../../lib/frontmatter';
import {
  fetchEditorItem,
  fetchItemBacklinkGroups,
  fetchTagSuggestions,
  fetchWikilinkSuggestions,
  fetchWikilinkTargets,
  saveEditorItem,
} from '../../lib/items';

function formatEditorDate(value) {
  if (!value) {
    return 'No save date';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function getEditorHeading({ isTemplateEditor, item }) {
  const normalizedTitle = String(item?.title ?? '').trim();

  if (normalizedTitle) {
    return normalizedTitle;
  }

  return isTemplateEditor ? 'Untitled Template' : 'Item Editor';
}

function getEditorPlaceholderText({ isTemplateEditor }) {
  if (isTemplateEditor) {
    return 'Draft reusable markdown and optional YAML frontmatter for this template. Save when you are ready to use it elsewhere in the app.';
  }

  return 'Write raw markdown with YAML frontmatter here.';
}

function getFilenameDialogValue({ currentFilename, currentTitle }) {
  return formatFilenameForDisplay(
    currentFilename || currentTitle,
    currentTitle || '',
  );
}

const EDITOR_TOP_CLEARANCE =
  'calc(max(1rem, env(safe-area-inset-top)) + var(--space-top-chrome-height) + var(--space-top-chrome-gap))';

export function ItemEditorScreen({ editorKind = 'item', itemId }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { setInsertTemplateTarget } = useCommandContext();
  const [item, setItem] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const [lastSavedValue, setLastSavedValue] = useState('');
  const [backlinkErrorMessage, setBacklinkErrorMessage] = useState('');
  const [backlinkGroups, setBacklinkGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBacklinks, setIsLoadingBacklinks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFilenameDialogOpen, setIsFilenameDialogOpen] = useState(false);
  const [filenameDialogValue, setFilenameDialogValue] = useState('');
  const [linkErrorMessage, setLinkErrorMessage] = useState('');
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [saveStatusMessage, setSaveStatusMessage] = useState('');
  const [isWorkbenchEnabled, setIsWorkbenchEnabled] = useState(false);
  const [wikilinkTargets, setWikilinkTargets] = useState([]);
  const [editorSyncVersion, setEditorSyncVersion] = useState(0);
  const editorRef = useRef(null);
  const draftValueRef = useRef('');
  const itemRef = useRef(null);
  const isTemplateEditor = editorKind === 'template';
  const isReadOnlyTemplate = item?.is_template === true && item?.user_id == null;
  const isDirty = draftValue !== lastSavedValue;
  const currentFrontmatter = useMemo(
    () =>
      parseEditorMarkdownDocument(draftValue, {
        allowIncompleteFrontmatter: true,
      }).frontmatter,
    [draftValue],
  );
  const currentTitle = String(
    currentFrontmatter.title ?? item?.title ?? '',
  ).trim();
  const currentFilename = String(
    currentFrontmatter.filename ?? item?.filename ?? '',
  ).trim();
  const editorHeading = getEditorHeading({ isTemplateEditor, item });
  const placeholderText = getEditorPlaceholderText({ isTemplateEditor });
  const editorMetaText = formatFilenameForDisplay(
    currentFilename,
    currentTitle || editorHeading,
  );
  const lastSavedText = item
    ? `Last saved ${formatEditorDate(item.date_modified ?? item.date_created)}`
    : 'Loading item...';
  const shouldShowWorkbenchToggle = !isTemplateEditor;
  const shouldShowBacklinksPanel = !isTemplateEditor;

  draftValueRef.current = draftValue;
  itemRef.current = item;

  function buildWikilinkTargetRecord(editorItem) {
    return {
      id: editorItem.id,
      subtype: editorItem.subtype ?? null,
      title: editorItem.title,
      type: editorItem.type ?? null,
    };
  }

  const handleSave = useEffectEvent(async () => {
    if (!auth.user?.id || !isDirty || isSaving || isReadOnlyTemplate) {
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage('');
    setSaveStatusMessage('');

    try {
      const savedEditorItem = await saveEditorItem({
        itemId,
        rawMarkdown: draftValue,
        userId: auth.user.id,
      });

      setItem(savedEditorItem.item);
      setDraftValue(savedEditorItem.rawMarkdown);
      setIsWorkbenchEnabled(savedEditorItem.item.workbench === true);
      setLastSavedValue(savedEditorItem.rawMarkdown);
      setWikilinkTargets((currentTargets) => [
        ...currentTargets.filter((target) => target.id !== savedEditorItem.item.id),
        buildWikilinkTargetRecord(savedEditorItem.item),
      ]);
      setEditorSyncVersion((currentVersion) => currentVersion + 1);
      setSaveStatusMessage('Saved.');
    } catch (error) {
      if (error.item && error.rawMarkdown) {
        setItem(error.item);
        setDraftValue(error.rawMarkdown);
        setIsWorkbenchEnabled(error.item.workbench === true);
        setLastSavedValue(error.rawMarkdown);
        setWikilinkTargets((currentTargets) => [
          ...currentTargets.filter((target) => target.id !== error.item.id),
          buildWikilinkTargetRecord(error.item),
        ]);
        setEditorSyncVersion((currentVersion) => currentVersion + 1);
      }

      setSaveErrorMessage(error.message ?? 'Unable to save this item right now.');
    } finally {
      setIsSaving(false);
    }
  });

  function updateDraftValue(nextValue) {
    setDraftValue(nextValue);
    setSaveErrorMessage('');
    setSaveStatusMessage('');
  }

  const openFilenameDialog = useEffectEvent(() => {
    if (isReadOnlyTemplate) {
      return;
    }

    setFilenameDialogValue(getFilenameDialogValue({
      currentFilename,
      currentTitle,
    }));
    setIsFilenameDialogOpen(true);
  });

  function closeFilenameDialog() {
    setIsFilenameDialogOpen(false);
    setFilenameDialogValue('');
  }

  function handleFilenameDialogSave(event) {
    event.preventDefault();

    try {
      const normalizedNextFilename = normalizeFilenameValue(filenameDialogValue);
      const nextDerivedTitle = buildTitleFromFilename(
        normalizedNextFilename,
        filenameDialogValue,
      );
      const nextDraftValue = replaceEditorFrontmatterField({
        key: 'filename',
        rawMarkdown: draftValue,
        value: filenameDialogValue,
      });
      const shouldSyncTitle = !titleOverridesFilename({
        filename: currentFilename,
        title: currentTitle,
      });
      const nextDraftValueWithTitle = shouldSyncTitle
        ? replaceEditorFrontmatterField({
            key: 'title',
            rawMarkdown: nextDraftValue,
            value: nextDerivedTitle,
          })
        : nextDraftValue;

      updateDraftValue(nextDraftValueWithTitle);
      closeFilenameDialog();

      window.requestAnimationFrame(() => {
        editorRef.current?.focus();
      });
    } catch (error) {
      setSaveErrorMessage(
        error.message ?? 'Unable to update the filename right now.',
      );
    }
  }

  useEffect(() => {
    if (!auth.user?.id) {
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setLinkErrorMessage('');
    setLoadErrorMessage('');
    setSaveErrorMessage('');
    setSaveStatusMessage('');

    Promise.allSettled([
      fetchEditorItem({
        itemId,
        userId: auth.user.id,
      }),
      fetchWikilinkTargets(auth.user.id),
    ])
      .then(([editorItemResult, wikilinkTargetsResult]) => {
        if (cancelled) {
          return;
        }

        if (editorItemResult.status === 'fulfilled') {
          setItem(editorItemResult.value.item);
          setDraftValue(editorItemResult.value.rawMarkdown);
          setIsWorkbenchEnabled(editorItemResult.value.item.workbench === true);
          setLastSavedValue(editorItemResult.value.rawMarkdown);
          setEditorSyncVersion((currentVersion) => currentVersion + 1);
        } else {
          setLoadErrorMessage(
            editorItemResult.reason?.message ??
              'Unable to load this item right now.',
          );
        }

        if (wikilinkTargetsResult.status === 'fulfilled') {
          setWikilinkTargets(wikilinkTargetsResult.value);
        } else {
          setWikilinkTargets(
            editorItemResult.status === 'fulfilled'
              ? [buildWikilinkTargetRecord(editorItemResult.value.item)]
              : [],
          );
          setLinkErrorMessage(
            wikilinkTargetsResult.reason?.message ??
              'Wikilink resolution is unavailable right now.',
          );
        }
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth.user?.id, itemId]);

  useEffect(() => {
    if (!auth.user?.id || !item?.id) {
      return;
    }

    if (isReadOnlyTemplate || !item.title?.trim()) {
      setBacklinkGroups([]);
      setBacklinkErrorMessage('');
      setIsLoadingBacklinks(false);
      return;
    }

    let cancelled = false;

    setIsLoadingBacklinks(true);
    setBacklinkErrorMessage('');

    fetchItemBacklinkGroups({
      itemId: item.id,
      title: item.title,
      userId: auth.user.id,
    })
      .then((nextBacklinkGroups) => {
        if (cancelled) {
          return;
        }

        setBacklinkGroups(nextBacklinkGroups);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setBacklinkErrorMessage(
          error.message ?? 'Unable to load backlinks right now.',
        );
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setIsLoadingBacklinks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth.user?.id, item?.id, item?.title, isReadOnlyTemplate]);

  const handleWorkbenchToggle = useEffectEvent(() => {
    if (isReadOnlyTemplate) {
      return;
    }

    try {
      const nextWorkbenchValue = !isWorkbenchEnabled;
      const nextDraftValue = replaceEditorFrontmatterField({
        key: 'workbench',
        rawMarkdown: draftValue,
        value: nextWorkbenchValue,
      });

      setIsWorkbenchEnabled(nextWorkbenchValue);
      updateDraftValue(nextDraftValue);
      setEditorSyncVersion((currentVersion) => currentVersion + 1);

      window.requestAnimationFrame(() => {
        editorRef.current?.focus();
      });
    } catch (error) {
      setSaveErrorMessage(
        error.message ?? 'Unable to update the workbench toggle right now.',
      );
    }
  });

  async function loadWikilinkOptions(query) {
    if (!auth.user?.id) {
      return [];
    }

    return fetchWikilinkSuggestions({
      excludeItemId: itemId,
      query,
      userId: auth.user.id,
    });
  }

  async function loadTagOptions(query) {
    if (!auth.user?.id) {
      return [];
    }

    return fetchTagSuggestions({
      query,
      userId: auth.user.id,
    });
  }

  async function handleOpenWikilink(targetId) {
    await navigate({
      params: {
        id: targetId,
      },
      to: '/items/$id',
    });
  }

  useEffect(() => {
    if (isReadOnlyTemplate) {
      setInsertTemplateTarget(null);
      return undefined;
    }

    setInsertTemplateTarget({
      getTemplateContext() {
        const draftDocument = parseEditorMarkdownDocument(draftValueRef.current, {
          allowIncompleteFrontmatter: true,
        });
        const currentItem = itemRef.current;
        const title = String(
          draftDocument.frontmatter.title ?? currentItem?.title ?? '',
        ).trim();
        const filename = String(
          draftDocument.frontmatter.filename ?? currentItem?.filename ?? '',
        ).trim();

        return {
          filename,
          title: title || filename,
        };
      },
      itemId,
      onInsertTemplate(payload) {
        try {
          editorRef.current?.insertTemplate(payload.rawMarkdown);
          setSaveErrorMessage('');
          setSaveStatusMessage('');
        } catch (error) {
          setSaveErrorMessage(
            error.message ?? 'Unable to insert that template right now.',
          );
        }
      },
    });

    return () => {
      setInsertTemplateTarget(null);
    };
  }, [setInsertTemplateTarget, itemId, isReadOnlyTemplate]);

  useAppChrome(useMemo(() => {
    const moreActions = [];

    if (!isReadOnlyTemplate) {
      moreActions.push({
        id: 'save',
        label: isSaving ? 'Saving...' : 'Save',
        disabled: isLoading || isSaving || !isDirty,
        onSelect() {
          handleSave();
        },
      });
    }

    if (shouldShowWorkbenchToggle) {
      moreActions.push({
        id: 'workbench',
        label: isWorkbenchEnabled ? 'Workbench Off' : 'Workbench On',
        disabled: isLoading || Boolean(loadErrorMessage) || isReadOnlyTemplate,
        onSelect() {
          handleWorkbenchToggle();
        },
      });
    }

    return {
      infoText: lastSavedText,
      metaAriaLabel: 'Edit filename',
      metaText: editorMetaText,
      moreActions,
      onMetaActivate: isReadOnlyTemplate
        ? undefined
        : () => {
            openFilenameDialog();
          },
    };
  }, [
    editorMetaText,
    handleSave,
    handleWorkbenchToggle,
    isDirty,
    isLoading,
    isReadOnlyTemplate,
    isSaving,
    isWorkbenchEnabled,
    lastSavedText,
    loadErrorMessage,
    openFilenameDialog,
    shouldShowWorkbenchToggle,
  ]));

  return (
    <section
      style={{
        blockSize: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'column',
        minBlockSize: 0,
        overflow: 'hidden',
        paddingTop: isTemplateEditor ? 0 : EDITOR_TOP_CLEARANCE,
      }}
    >
      {loadErrorMessage ? (
        <p role="alert" style={{ color: 'var(--color-danger)', margin: 0 }}>
          {loadErrorMessage}
        </p>
      ) : null}

      {saveErrorMessage ? (
        <p role="alert" style={{ color: 'var(--color-danger)', margin: 0 }}>
          {saveErrorMessage}
        </p>
      ) : null}

      {saveStatusMessage ? (
        <p
          role="status"
          style={{
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          {saveStatusMessage}
        </p>
      ) : null}

      {linkErrorMessage ? (
        <p
          role="alert"
          style={{
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          {linkErrorMessage}
        </p>
      ) : null}

      <div
        style={{
          flex: '1 1 auto',
          minBlockSize: 0,
          overflow: 'hidden',
        }}
      >
        {createElement(ItemEditor, {
          autocompleteCacheKey: `${auth.user?.id ?? 'anonymous'}:${itemId}`,
          disabled: isLoading || Boolean(loadErrorMessage) || isReadOnlyTemplate,
          loadTagSuggestions: loadTagOptions,
          loadWikilinkSuggestions: loadWikilinkOptions,
          onChange(nextValue) {
            updateDraftValue(nextValue);
          },
          onOpenWikilink(targetId) {
            void handleOpenWikilink(targetId);
          },
          onSave() {
            handleSave();
          },
          placeholderText,
          ref: editorRef,
          syncVersion: editorSyncVersion,
          value: draftValue,
          wikilinkTargets,
        })}
      </div>

      {shouldShowBacklinksPanel
        ? createElement(BacklinksPanel, {
            backlinkGroups,
            errorMessage: backlinkErrorMessage,
            isLoading: isLoadingBacklinks,
            isReadOnlyTemplate,
            onOpenItem(openItemId) {
              return navigate({
                params: {
                  id: openItemId,
                },
                to: '/items/$id',
              });
            },
            savedTitle: item?.title ?? '',
          })
        : null}

      {isFilenameDialogOpen ? createElement(
        AppDialog,
        {
          ariaLabel: 'Close filename editor',
          onClose: closeFilenameDialog,
          role: 'dialog',
        },
        <>
          <header
            style={{
              display: 'grid',
              gap: '0.5rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.1rem',
                margin: 0,
              }}
            >
              Change Filename
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Enter a readable name. The app will normalize it to the stored filename format when you save.
            </p>
          </header>

          <form
            onSubmit={handleFilenameDialogSave}
            style={{
              display: 'grid',
              gap: '1rem',
            }}
          >
            <label
              style={{
                color: 'var(--color-text-secondary)',
                display: 'grid',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <span>Filename</span>
              <input
                autoFocus
                onChange={(event) => {
                  setFilenameDialogValue(event.target.value);
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border-card)',
                  color: 'var(--color-text-primary)',
                  font: 'inherit',
                  minHeight: '3.25rem',
                  padding: '0 1rem',
                  width: '100%',
                }}
                type="text"
                value={filenameDialogValue}
              />
            </label>

            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              <button
                onClick={closeFilenameDialog}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border-card)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  font: 'inherit',
                  minHeight: '3rem',
                }}
                type="button"
              >
                Cancel
              </button>

              <button
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border-card)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  font: 'inherit',
                  minHeight: '3rem',
                }}
                type="submit"
              >
                Change/Save
              </button>
            </div>
          </form>
        </>,
      ) : null}
    </section>
  );
}
