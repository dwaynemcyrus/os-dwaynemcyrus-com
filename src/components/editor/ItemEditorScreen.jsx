import { createElement, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { BacklinksPanel } from './BacklinksPanel';
import { ItemEditor } from './ItemEditor';
import { useAuth } from '../../lib/auth';
import { useCommandContext } from '../../lib/command-context';
import { replaceEditorFrontmatterField } from '../../lib/frontmatter';
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

export function ItemEditorScreen({ itemId }) {
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
  const [linkErrorMessage, setLinkErrorMessage] = useState('');
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [saveStatusMessage, setSaveStatusMessage] = useState('');
  const [isWorkbenchEnabled, setIsWorkbenchEnabled] = useState(false);
  const [wikilinkTargets, setWikilinkTargets] = useState([]);
  const [editorSyncVersion, setEditorSyncVersion] = useState(0);
  const editorRef = useRef(null);
  const isReadOnlyTemplate = item?.is_template === true && item?.user_id == null;
  const isDirty = draftValue !== lastSavedValue;

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

  function handleWorkbenchToggle() {
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
  }

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

  return (
    <section
      style={{
        blockSize: '100%',
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'column',
        gap: '1rem',
        inlineSize: 'min(56rem, 100%)',
        marginInline: 'auto',
        minBlockSize: 0,
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          alignItems: 'start',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <h1 style={{ margin: 0 }}>{item?.title || 'Item Editor'}</h1>
          <p style={{ margin: 0 }}>
            {isReadOnlyTemplate
              ? 'This system template opens in the shared editor surface for review, but it is read only.'
              : `Raw markdown editing is now active for item ${itemId}. Use the save button or Cmd/Ctrl+S, and use the FAB to merge template frontmatter while inserting template body content at the current cursor position.`}
          </p>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.95rem',
              margin: 0,
            }}
          >
            {item
              ? `Last saved ${formatEditorDate(item.date_modified ?? item.date_created)}`
              : 'Loading item...'}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <button
            aria-pressed={isWorkbenchEnabled}
            disabled={isLoading || Boolean(loadErrorMessage) || isReadOnlyTemplate}
            onClick={handleWorkbenchToggle}
            style={{
              background: isWorkbenchEnabled
                ? 'var(--color-bg-surface)'
                : 'transparent',
              border: '1px solid var(--color-border-card)',
              cursor:
                isLoading || Boolean(loadErrorMessage) || isReadOnlyTemplate
                  ? 'not-allowed'
                  : 'pointer',
              font: 'inherit',
              fontWeight: 700,
              minHeight: '3rem',
              minWidth: '10rem',
              padding: '0 1.25rem',
            }}
            type="button"
          >
            {isWorkbenchEnabled ? 'Workbench On' : 'Workbench Off'}
          </button>

          <button
            disabled={isLoading || isSaving || !isDirty || isReadOnlyTemplate}
            onClick={() => {
              handleSave();
            }}
            style={{
              background:
                isLoading || isSaving || !isDirty || isReadOnlyTemplate
                  ? 'transparent'
                  : 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-card)',
              color:
                isLoading || isSaving || !isDirty || isReadOnlyTemplate
                  ? 'var(--color-text-secondary)'
                  : 'var(--color-text-primary)',
              cursor:
                isLoading || isSaving || !isDirty || isReadOnlyTemplate
                  ? 'not-allowed'
                  : 'pointer',
              font: 'inherit',
              fontWeight: 700,
              minHeight: '3rem',
              minWidth: '9rem',
              padding: '0 1.25rem',
            }}
            type="button"
          >
            {isSaving ? 'Saving...' : isReadOnlyTemplate ? 'Read Only' : 'Save'}
          </button>
        </div>
      </header>

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
          placeholderText: 'Write raw markdown with YAML frontmatter here.',
          ref: editorRef,
          syncVersion: editorSyncVersion,
          value: draftValue,
          wikilinkTargets,
        })}
      </div>

      {createElement(BacklinksPanel, {
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
      })}
    </section>
  );
}
