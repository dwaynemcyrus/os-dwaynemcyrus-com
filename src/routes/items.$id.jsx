import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
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
    const textareaRef = useRef(null);
    const insertHandlerRef = useRef(null);
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

    insertHandlerRef.current = ({ body }) => {
      const textareaElement = textareaRef.current;
      const currentValue = textareaElement?.value ?? draftValue;
      const selectionStart = textareaElement?.selectionStart ?? currentValue.length;
      const selectionEnd = textareaElement?.selectionEnd ?? currentValue.length;
      const nextValue = `${currentValue.slice(0, selectionStart)}${body}${currentValue.slice(selectionEnd)}`;
      const nextCursorPosition = selectionStart + body.length;

      updateDraftValue(nextValue);

      window.requestAnimationFrame(() => {
        if (!textareaRef.current) {
          return;
        }

        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          nextCursorPosition,
          nextCursorPosition,
        );
      });
    };

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
          insertHandlerRef.current?.(payload);
        },
      });

      return () => {
        setInsertTemplateTarget(null);
      };
    }, [setInsertTemplateTarget, id]);

    useEffect(() => {
      function handleKeyDown(event) {
        const isSaveShortcut =
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === 's';

        if (!isSaveShortcut) {
          return;
        }

        event.preventDefault();
        handleSave();
      }

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [handleSave]);

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
              Markdown save path is now active for item {id}. Use the FAB to
              open the command sheet and insert a template body at the cursor
              position.
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

        <textarea
          aria-label="Item markdown"
          disabled={isLoading || Boolean(loadErrorMessage)}
          onChange={(event) => {
            updateDraftValue(event.target.value);
          }}
          placeholder="Raw markdown editing will render here in the CodeMirror phase."
          ref={textareaRef}
          rows={18}
          style={{
            background: 'rgba(255, 255, 255, 0.92)',
            border: '1px solid rgba(82, 96, 109, 0.2)',
            borderRadius: '1rem',
            color: '#1f2933',
            font: 'inherit',
            lineHeight: 1.6,
            minHeight: '24rem',
            opacity: isLoading ? 0.7 : 1,
            padding: '1rem',
            resize: 'vertical',
            width: '100%',
          }}
          value={draftValue}
        />
      </section>
    );
  },
});
