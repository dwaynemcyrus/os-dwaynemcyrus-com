import {
  forwardRef,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
} from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { basicSetup } from 'codemirror';
import styles from './ItemEditor.module.css';

const editableCompartment = new Compartment();

export const ItemEditor = forwardRef(function ItemEditor(
  {
    disabled = false,
    onChange,
    onSave,
    placeholderText,
    value,
  },
  ref,
) {
  const hostRef = useRef(null);
  const editorViewRef = useRef(null);
  const handleChange = useEffectEvent((nextValue) => {
    onChange(nextValue);
  });
  const handleSave = useEffectEvent(() => {
    onSave();
  });

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        editorViewRef.current?.focus();
      },
      insertText(text) {
        const editorView = editorViewRef.current;

        if (!editorView) {
          return;
        }

        const selection = editorView.state.selection.main;
        const nextCursorPosition = selection.from + text.length;

        editorView.dispatch({
          changes: {
            from: selection.from,
            insert: text,
            to: selection.to,
          },
          selection: {
            anchor: nextCursorPosition,
          },
          scrollIntoView: true,
        });
        editorView.focus();
      },
    }),
    [],
  );

  useEffect(() => {
    if (!hostRef.current || editorViewRef.current) {
      return undefined;
    }

    const editorView = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          markdown(),
          EditorView.lineWrapping,
          placeholder(placeholderText),
          editableCompartment.of(EditorView.editable.of(!disabled)),
          keymap.of([
            {
              key: 'Mod-s',
              run() {
                handleSave();
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) {
              return;
            }

            handleChange(update.state.doc.toString());
          }),
        ],
      }),
    });

    editorViewRef.current = editorView;

    return () => {
      editorView.destroy();
      editorViewRef.current = null;
    };
  }, [disabled, handleChange, handleSave, placeholderText, value]);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (!editorView) {
      return;
    }

    editorView.dispatch({
      effects: editableCompartment.reconfigure(EditorView.editable.of(!disabled)),
    });
  }, [disabled]);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (!editorView) {
      return;
    }

    const currentValue = editorView.state.doc.toString();

    if (currentValue === value) {
      return;
    }

    const nextCursorPosition = Math.min(
      editorView.state.selection.main.head,
      value.length,
    );

    editorView.dispatch({
      changes: {
        from: 0,
        insert: value,
        to: currentValue.length,
      },
      selection: {
        anchor: nextCursorPosition,
      },
    });
  }, [value]);

  return (
    <div
      className={`${styles.editor}${disabled ? ` ${styles.editorDisabled}` : ''}`}
      ref={hostRef}
    />
  );
});
