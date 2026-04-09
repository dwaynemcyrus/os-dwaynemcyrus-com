import {
  createElement,
  useCallback,
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
import { useCommandContext, useRegisterCommands } from '../../lib/command-context';
import {
  buildTitleFromFilename,
  formatFilenameForDisplay,
  getItemDisplayLabel,
  titleOverridesFilename,
} from '../../lib/filenames';
import {
  normalizeFilenameValue,
  parseEditorMarkdownDocument,
  removeEditorFrontmatterField,
  replaceEditorFrontmatterField,
} from '../../lib/frontmatter';
import {
  buildMaterializedTemplateMarkdown,
  cascadeRenameWikilinks,
  fetchEditorItem,
  fetchItemBacklinkGroups,
  fetchTagSuggestions,
  fetchWikilinkSuggestions,
  fetchWikilinkTargets,
  ITEMS_REFRESH_EVENT,
  saveEditorItem,
  toggleItemPin,
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

function formatTemplateLabel(item) {
  return getItemDisplayLabel(
    item,
    item.subtype ? item.subtype.replaceAll('_', ' ') : 'Untitled template',
  );
}

export function ItemEditorScreen({ editorKind = 'item', itemId }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { templateItems } = useCommandContext();
  const [item, setItem] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const [lastSavedValue, setLastSavedValue] = useState('');
  const [backlinkErrorMessage, setBacklinkErrorMessage] = useState('');
  const [backlinkGroups, setBacklinkGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBacklinks, setIsLoadingBacklinks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cascadeFailures, setCascadeFailures] = useState(null);
  const [isBacklinksDialogOpen, setIsBacklinksDialogOpen] = useState(false);
  const [isFilenameDialogOpen, setIsFilenameDialogOpen] = useState(false);
  const [filenameDialogValue, setFilenameDialogValue] = useState('');
  const [pendingFilename, setPendingFilename] = useState(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [saveStatusMessage, setSaveStatusMessage] = useState('');
  const [isWorkbenchEnabled, setIsWorkbenchEnabled] = useState(false);
  const [isScrollPastEndEnabled, setIsScrollPastEndEnabled] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    try {
      const storedValue = window.localStorage.getItem('editor.scrollPastEnd');

      if (storedValue == null) {
        return true;
      }

      return storedValue !== 'false';
    } catch {
      return true;
    }
  });
  const [wikilinkTargets, setWikilinkTargets] = useState([]);
  const [editorSyncVersion, setEditorSyncVersion] = useState(0);
  const editorRef = useRef(null);
  const draftValueRef = useRef('');
  const itemRef = useRef(null);
  const isTemplateEditor = editorKind === 'template';
  const isReadOnlyTemplate = item?.is_template === true && item?.user_id == null;
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
    pendingFilename ?? currentFrontmatter.filename ?? item?.filename ?? '',
  ).trim();
  const savedFilename = String(item?.filename ?? '').trim();
  const hasPendingFilenameChange =
    pendingFilename != null && pendingFilename !== savedFilename;
  const isDirty = draftValue !== lastSavedValue || hasPendingFilenameChange;
  const editorHeading = getEditorHeading({ isTemplateEditor, item });
  const placeholderText = getEditorPlaceholderText({ isTemplateEditor });
  const editorMetaText = formatFilenameForDisplay(
    currentFilename,
    currentTitle || editorHeading,
  );
  const chromeMetaText = useMemo(() => {
    if (saveErrorMessage) return 'Save failed';
    if (saveStatusMessage) return saveStatusMessage;
    return editorMetaText;
  }, [saveErrorMessage, saveStatusMessage, editorMetaText]);
  const savedLinkLabel = getItemDisplayLabel(item, '');
  const lastSavedText = item
    ? `Last saved ${formatEditorDate(item.date_modified ?? item.date_created)}`
    : 'Loading item...';
  const shouldShowWorkbenchToggle = !isReadOnlyTemplate;

  draftValueRef.current = draftValue;
  itemRef.current = item;

  function buildWikilinkTargetRecord(editorItem) {
    return {
      id: editorItem.id,
      subtype: editorItem.subtype ?? null,
      title: getItemDisplayLabel(editorItem, editorItem.id),
      type: editorItem.type ?? null,
    };
  }

  const handleSave = useEffectEvent(async () => {
    if (!auth.user?.id || !isDirty || isSaving || isReadOnlyTemplate) {
      return;
    }

    const oldLabel = getItemDisplayLabel(item);

    setIsSaving(true);
    setSaveErrorMessage('');
    setSaveStatusMessage('');

    try {
      const savedEditorItem = await saveEditorItem({
        filenameOverride: currentFilename,
        itemId,
        rawMarkdown: draftValue,
        userId: auth.user.id,
      });

      setItem(savedEditorItem.item);
      setDraftValue(savedEditorItem.rawMarkdown);
      setIsWorkbenchEnabled(savedEditorItem.item.workbench === true);
      setLastSavedValue(savedEditorItem.rawMarkdown);
      setPendingFilename(null);
      setWikilinkTargets((currentTargets) => [
        ...currentTargets.filter((target) => target.id !== savedEditorItem.item.id),
        buildWikilinkTargetRecord(savedEditorItem.item),
      ]);
      setEditorSyncVersion((currentVersion) => currentVersion + 1);
      setSaveStatusMessage('Saved.');

      const newLabel = getItemDisplayLabel(savedEditorItem.item);

      if (oldLabel && newLabel && oldLabel !== newLabel) {
        cascadeRenameWikilinks({
          excludeItemId: itemId,
          newLabel,
          oldLabel,
          userId: auth.user.id,
        }).then(({ failedItems }) => {
          if (failedItems.length > 0) {
            setCascadeFailures(failedItems);
          }
        }).catch(() => {
          // cascade errors don't surface as save errors
        });
      }
    } catch (error) {
      if (error.item && error.rawMarkdown) {
        setItem(error.item);
        setDraftValue(error.rawMarkdown);
        setIsWorkbenchEnabled(error.item.workbench === true);
        setLastSavedValue(error.rawMarkdown);
        setPendingFilename(null);
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
      const nextPendingFilename =
        normalizedNextFilename === savedFilename ? null : normalizedNextFilename;
      const nextDerivedTitle = buildTitleFromFilename(
        normalizedNextFilename,
        filenameDialogValue,
      );
      const nextDraftValue = removeEditorFrontmatterField({
        key: 'filename',
        rawMarkdown: draftValue,
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

      setPendingFilename(nextPendingFilename);
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
          setPendingFilename(null);
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

    if (isReadOnlyTemplate || !savedLinkLabel) {
      setBacklinkGroups([]);
      setBacklinkErrorMessage('');
      setIsLoadingBacklinks(false);
      return;
    }

    let cancelled = false;

    setIsLoadingBacklinks(true);
    setBacklinkErrorMessage('');

    fetchItemBacklinkGroups({
      currentLabel: savedLinkLabel,
      itemId: item.id,
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
  }, [auth.user?.id, item?.id, isReadOnlyTemplate, savedLinkLabel]);

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

  const handlePinToggle = useEffectEvent(async () => {
    if (
      !auth.user?.id ||
      !item?.id ||
      isReadOnlyTemplate ||
      isLoading ||
      isSaving ||
      Boolean(loadErrorMessage)
    ) {
      return;
    }

    setSaveErrorMessage('');
    setSaveStatusMessage('');

    try {
      const pinnedItem = await toggleItemPin({
        itemId,
        userId: auth.user.id,
      });

      setItem(pinnedItem);
      setIsWorkbenchEnabled(pinnedItem.workbench === true);
      setWikilinkTargets((currentTargets) => [
        ...currentTargets.filter((target) => target.id !== pinnedItem.id),
        buildWikilinkTargetRecord(pinnedItem),
      ]);
      setEditorSyncVersion((currentVersion) => currentVersion + 1);
      setSaveStatusMessage(pinnedItem.is_pinned ? 'Pinned.' : 'Unpinned.');
      window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
    } catch (error) {
      setSaveErrorMessage(
        error.message ?? 'Unable to update the pin state right now.',
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

  const handleInsertTemplate = useCallback(async (templateItem) => {
    if (!auth.user?.id) {
      setSaveErrorMessage('Your session is missing a user id.');
      return;
    }

    try {
      const draftDocument = parseEditorMarkdownDocument(draftValueRef.current, {
        allowIncompleteFrontmatter: true,
      });
      const currentItem = itemRef.current;
      const title = String(
        draftDocument.frontmatter.title ?? currentItem?.title ?? '',
      ).trim();
      const filename = String(
        pendingFilename
          ?? draftDocument.frontmatter.filename
          ?? currentItem?.filename
          ?? '',
      ).trim();
      const templateRawMarkdown = await buildMaterializedTemplateMarkdown({
        templateItem,
        titleValue: title || filename,
        userId: auth.user.id,
      });

      if (!templateRawMarkdown.trim()) {
        setSaveErrorMessage('That template has no content to insert.');
        return;
      }

      editorRef.current?.insertTemplate(templateRawMarkdown);
      setSaveErrorMessage('');
      setSaveStatusMessage('');
    } catch (error) {
      setSaveErrorMessage(
        error.message ?? 'Unable to insert that template right now.',
      );
    }
  }, [auth.user?.id, pendingFilename]);

  const insertCommands = useMemo(() => {
    if (isReadOnlyTemplate) {
      return [];
    }

    return templateItems.map((t) => ({
      id: `insert-${t.id}`,
      label: `Insert ${formatTemplateLabel(t)}`,
      group: 'Insert',
      keywords: ['insert', 'template', t.type, t.subtype, t.filename].filter(Boolean),
      action: () => handleInsertTemplate(t),
    }));
  }, [isReadOnlyTemplate, templateItems, handleInsertTemplate]);

  useRegisterCommands(insertCommands);

  useEffect(() => {
    if (!saveStatusMessage) return;

    const timeoutId = window.setTimeout(() => {
      setSaveStatusMessage('');
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveStatusMessage]);

  function handleLoadErrorDismiss() {
    void navigate({
      to: isTemplateEditor ? '/settings/templates' : '/items',
    });
  }

  useAppChrome(useMemo(() => {
    const infoActions = [];
    const moreActions = [];

    if (!isTemplateEditor) {
      infoActions.push({
        id: 'backlinks',
        label: 'Backlinks',
        disabled: isLoading || Boolean(loadErrorMessage),
        onSelect() {
          setIsBacklinksDialogOpen(true);
        },
      });
    }

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

    if (!isTemplateEditor && item?.is_template !== true) {
      moreActions.push({
        id: 'pin',
        label: item?.is_pinned ? 'unpin' : 'pin',
        disabled:
          isLoading ||
          isSaving ||
          Boolean(loadErrorMessage) ||
          !item?.id,
        onSelect() {
          void handlePinToggle();
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

    moreActions.push({
      id: 'scroll-past-end',
      label: isScrollPastEndEnabled ? 'Scroll Past End Off' : 'Scroll Past End On',
      disabled: isLoading || Boolean(loadErrorMessage),
      onSelect() {
        setIsScrollPastEndEnabled((currentValue) => {
          const nextValue = !currentValue;

          if (typeof window === 'undefined') {
            return nextValue;
          }

          try {
            window.localStorage.setItem(
              'editor.scrollPastEnd',
              nextValue ? 'true' : 'false',
            );
          } catch {
            // ignore persistence failures
          }

          return nextValue;
        });
      },
    });

    return {
      infoActions,
      infoText: lastSavedText,
      metaAriaLabel: 'Edit filename',
      metaText: chromeMetaText,
      moreActions,
      onMetaActivate: isReadOnlyTemplate
        ? undefined
        : () => {
            openFilenameDialog();
          },
    };
  }, [
    chromeMetaText,
    handleSave,
    handleWorkbenchToggle,
    handlePinToggle,
    isDirty,
    isLoading,
    isScrollPastEndEnabled,
    isTemplateEditor,
    isReadOnlyTemplate,
    isSaving,
    isWorkbenchEnabled,
    lastSavedText,
    loadErrorMessage,
    item?.id,
    item?.is_pinned,
    item?.is_template,
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
      }}
    >
      {loadErrorMessage ? createElement(
        AppDialog,
        {
          ariaLabel: 'Dismiss error',
          onClose: handleLoadErrorDismiss,
          role: 'alertdialog',
        },
        <div style={{ display: 'grid', gap: '1rem', maxInlineSize: '24rem' }}>
          <header style={{ display: 'grid', gap: '0.35rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.2, margin: 0 }}>
              Failed to Load
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {loadErrorMessage}
            </p>
          </header>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(loadErrorMessage);
              }}
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
              Copy Error
            </button>

            <button
              onClick={handleLoadErrorDismiss}
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
              Dismiss
            </button>
          </div>
        </div>,
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
          scrollPastEndEnabled: isScrollPastEndEnabled,
          syncVersion: editorSyncVersion,
          value: draftValue,
          wikilinkTargets,
        })}
      </div>

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
              Enter the filename exactly as you want it stored.
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

      {cascadeFailures !== null ? createElement(
        AppDialog,
        {
          ariaLabel: 'Close link update failures',
          onClose() {
            setCascadeFailures(null);
          },
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
              Link Update Failed
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {cascadeFailures.length} note{cascadeFailures.length !== 1 ? 's' : ''} could not be
              updated. These notes still contain wikilinks pointing to the old name. Select the text
              below to copy it.
            </p>
          </header>

          <pre
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-card)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family-mono)',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              margin: 0,
              maxBlockSize: '12rem',
              overflowY: 'auto',
              padding: '0.75rem 1rem',
              userSelect: 'all',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {cascadeFailures.map((f) => f.title || f.filename).join('\n')}
          </pre>

          <button
            onClick={() => {
              setCascadeFailures(null);
            }}
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
            Dismiss
          </button>
        </>,
      ) : null}

      {isBacklinksDialogOpen ? createElement(
        AppDialog,
        {
          ariaLabel: 'Close backlinks',
          onClose() {
            setIsBacklinksDialogOpen(false);
          },
          role: 'dialog',
        },
        createElement(BacklinksPanel, {
          backlinkGroups,
          errorMessage: backlinkErrorMessage,
          isDialog: true,
          isLoading: isLoadingBacklinks,
          isReadOnlyTemplate,
          onOpenItem(openItemId) {
            setIsBacklinksDialogOpen(false);

            return navigate({
              params: {
                id: openItemId,
              },
              to: '/items/$id',
            });
          },
          savedLabel: savedLinkLabel,
        }),
      ) : null}
    </section>
  );
}
