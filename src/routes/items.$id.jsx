import { useEffect, useRef, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useCommandContext } from '../lib/command-context';
import { authenticatedRoute } from './_authenticated';

export const itemEditorRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/items/$id',
  component: function ItemEditorRoute() {
    const { id } = itemEditorRoute.useParams();
    const { setInsertTemplateTarget } = useCommandContext();
    const [draftValue, setDraftValue] = useState('');
    const textareaRef = useRef(null);
    const insertHandlerRef = useRef(null);

    insertHandlerRef.current = ({ body }) => {
      const textareaElement = textareaRef.current;
      const currentValue = textareaElement?.value ?? draftValue;
      const selectionStart = textareaElement?.selectionStart ?? currentValue.length;
      const selectionEnd = textareaElement?.selectionEnd ?? currentValue.length;
      const nextValue = `${currentValue.slice(0, selectionStart)}${body}${currentValue.slice(selectionEnd)}`;
      const nextCursorPosition = selectionStart + body.length;

      setDraftValue(nextValue);

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
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <h1 style={{ margin: 0 }}>Item Editor</h1>
          <p style={{ margin: 0 }}>
            Thin editor placeholder for item {id}. Use the FAB to open the
            command sheet and insert a template body at the cursor position.
          </p>
        </header>

        <textarea
          aria-label="Item markdown placeholder"
          onChange={(event) => {
            setDraftValue(event.target.value);
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
