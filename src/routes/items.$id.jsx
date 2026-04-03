import { createElement, useEffect, useEffectEvent, useRef, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { ItemEditor } from '../components/editor/ItemEditor';
import { useAuth } from '../lib/auth';
import { useCommandContext } from '../lib/command-context';
import { fetchEditorItem, saveEditorItem } from '../lib/items';
import { authenticatedRoute } from './_authenticated';

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

export const itemEditorRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/items/$id',
  component: function ItemEditorRoute() {
    const { id } = itemEditorRoute.useParams();
    const auth = useAuth();
    const { setInsertTemplateTarget } = useCommandContext();
    const [item, setItem] = useState(null);
    const [draftValue, setDraftValue] = useState('');
    const [lastSavedValue, setLastSavedValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [loadErrorMessage, setLoadErrorMessage] = useState('');
    const [saveErrorMessage, setSaveErrorMessage] = useState('');
    const [saveStatusMessage, setSaveStatusMessage] = useState('');
    const editorRef = useRef(null);
    const isDirty = draftValue !== lastSavedValue;

    const handleSave = useEffectEvent(async () => {
      if (!auth.user?.id || !isDirty || isSaving) {
        return;
      }

      setIsSaving(true);
      setSaveErrorMessage('');
      setSaveStatusMessage('');

      try {
        const savedEditorItem = await saveEditorItem({
          itemId: id,
          rawMarkdown: draftValue,
          userId: auth.user.id,
        });

        setItem(savedEditorItem.item);
        setDraftValue(savedEditorItem.rawMarkdown);
        setLastSavedValue(savedEditorItem.rawMarkdown);
        setSaveStatusMessage('Saved.');
      } catch (error) {
        if (error.item && error.rawMarkdown) {
          setItem(error.item);
          setDraftValue(error.rawMarkdown);
          setLastSavedValue(error.rawMarkdown);
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
      setLoadErrorMessage('');
      setSaveErrorMessage('');
      setSaveStatusMessage('');

      fetchEditorItem({
        itemId: id,
        userId: auth.user.id,
      })
        .then((editorItem) => {
          if (cancelled) {
            return;
          }

          setItem(editorItem.item);
          setDraftValue(editorItem.rawMarkdown);
          setLastSavedValue(editorItem.rawMarkdown);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setLoadErrorMessage(error.message ?? 'Unable to load this item right now.');
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
    }, [auth.user?.id, id]);

    useEffect(() => {
      setInsertTemplateTarget({
        itemId: id,
        onInsertTemplate(payload) {
          editorRef.current?.insertText(payload.body);
        },
      });

      return () => {
        setInsertTemplateTarget(null);
      };
    }, [setInsertTemplateTarget, id]);

    return (
      <section
        style={{
          display: 'grid',
          gap: '1rem',
          maxWidth: '56rem',
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
              Raw markdown editing is now active for item {id}. Use the save
              button or Cmd/Ctrl+S, and use the FAB to insert a template body
              at the current cursor position.
            </p>
            <p
              style={{
                color: '#52606d',
                fontSize: '0.95rem',
                margin: 0,
              }}
            >
              {item
                ? `Last saved ${formatEditorDate(item.date_modified ?? item.date_created)}`
                : 'Loading item...'}
            </p>
          </div>

          <button
            disabled={isLoading || isSaving || !isDirty}
            onClick={() => {
              handleSave();
            }}
            style={{
              background:
                isLoading || isSaving || !isDirty
                  ? 'rgba(82, 96, 109, 0.18)'
                  : 'linear-gradient(135deg, #2f6f51 0%, #25543d 100%)',
              border: 'none',
              borderRadius: '0.875rem',
              color: isLoading || isSaving || !isDirty ? '#52606d' : '#f8fafc',
              cursor:
                isLoading || isSaving || !isDirty ? 'not-allowed' : 'pointer',
              font: 'inherit',
              fontWeight: 700,
              minHeight: '3rem',
              minWidth: '8rem',
              padding: '0 1.25rem',
            }}
            type="button"
          >
            {isSaving ? 'Saving...' : isDirty ? 'Save' : 'Saved'}
          </button>
        </header>

        {loadErrorMessage ? (
          <p
            role="alert"
            style={{
              background: 'rgba(186, 73, 73, 0.1)',
              borderRadius: '1rem',
              color: '#8f2d2d',
              margin: 0,
              padding: '1rem',
            }}
          >
            {loadErrorMessage}
          </p>
        ) : null}

        {saveErrorMessage ? (
          <p
            role="alert"
            style={{
              background: 'rgba(186, 73, 73, 0.1)',
              borderRadius: '1rem',
              color: '#8f2d2d',
              margin: 0,
              padding: '1rem',
            }}
          >
            {saveErrorMessage}
          </p>
        ) : null}

        {saveStatusMessage ? (
          <p
            style={{
              background: 'rgba(47, 111, 81, 0.12)',
              borderRadius: '1rem',
              color: '#25543d',
              margin: 0,
              padding: '1rem',
            }}
          >
            {saveStatusMessage}
          </p>
        ) : null}

        {createElement(ItemEditor, {
          disabled: isLoading || Boolean(loadErrorMessage),
          onChange(nextValue) {
            updateDraftValue(nextValue);
          },
          onSave() {
            handleSave();
          },
          placeholderText: 'Write raw markdown with YAML frontmatter here.',
          ref: editorRef,
          value: draftValue,
        })}
      </section>
    );
  },
});
