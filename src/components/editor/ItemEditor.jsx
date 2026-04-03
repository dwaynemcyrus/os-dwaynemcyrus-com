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

function buildWikilinkCompletionSource(loadWikilinkSuggestions, cacheRef) {
  return async function completeWikilinks(context) {
    const match = context.matchBefore(/\[\[[^\]\n]*$/);

    if (!match) {
      return null;
    }

    if (match.from === match.to && !context.explicit) {
      return null;
    }

    const query = match.text.slice(2);
    const cacheKey = query.toLowerCase();
    let suggestions = cacheRef.current.get(cacheKey);

    if (!suggestions) {
      suggestions = await loadWikilinkSuggestions(query);
      cacheRef.current.set(cacheKey, suggestions);
    }

    return {
      from: match.from + 2,
      options: suggestions.map((suggestion) => ({
        apply: `${suggestion.label}]]`,
        detail: 'wikilink',
        label: suggestion.label,
        type: 'text',
      })),
      validFor: /^[^\]\n]*$/,
    };
  };
}

function buildTagCompletionSource(loadTagSuggestions, cacheRef) {
  return async function completeTags(context) {
    const match = context.matchBefore(/#[^\s#[\]]*$/);

    if (!match) {
      return null;
    }

    const line = context.state.doc.lineAt(context.pos);
    const matchOffset = match.from - line.from;
    const precedingCharacter = line.text.at(matchOffset - 1);

    if (precedingCharacter && /[A-Za-z0-9_]/.test(precedingCharacter)) {
      return null;
    }

    const query = match.text.slice(1);
    const cacheKey = query.toLowerCase();
    let suggestions = cacheRef.current.get(cacheKey);

    if (!suggestions) {
      suggestions = await loadTagSuggestions(query);
      cacheRef.current.set(cacheKey, suggestions);
    }

    return {
      from: match.from + 1,
      options: suggestions.map((suggestion) => ({
        detail: 'tag',
        label: suggestion,
        type: 'keyword',
      })),
      validFor: /^[^\s#[\]]*$/,
    };
  };
}

export const ItemEditor = forwardRef(function ItemEditor(
  {
    autocompleteCacheKey,
    disabled = false,
    loadTagSuggestions,
    loadWikilinkSuggestions,
    onChange,
    onSave,
    placeholderText,
    value,
  },
  ref,
) {
  const hostRef = useRef(null);
  const editorViewRef = useRef(null);
  const tagSuggestionsCacheRef = useRef(new Map());
  const wikilinkSuggestionsCacheRef = useRef(new Map());
  const handleChange = useEffectEvent((nextValue) => {
    onChange(nextValue);
  });
  const handleTagSuggestions = useEffectEvent(async (query) => {
    return loadTagSuggestions(query);
  });
  const handleSave = useEffectEvent(() => {
    onSave();
  });
  const handleWikilinkSuggestions = useEffectEvent(async (query) => {
    return loadWikilinkSuggestions(query);
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
    tagSuggestionsCacheRef.current.clear();
    wikilinkSuggestionsCacheRef.current.clear();
  }, [autocompleteCacheKey]);

  useEffect(() => {
    if (!hostRef.current || editorViewRef.current) {
      return undefined;
    }

    const wikilinkCompletionSource = buildWikilinkCompletionSource(
      handleWikilinkSuggestions,
      wikilinkSuggestionsCacheRef,
    );
    const tagCompletionSource = buildTagCompletionSource(
      handleTagSuggestions,
      tagSuggestionsCacheRef,
    );

    const editorView = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          markdown(),
          EditorView.lineWrapping,
          EditorState.languageData.of(() => [
            { autocomplete: wikilinkCompletionSource },
            { autocomplete: tagCompletionSource },
          ]),
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
  }, [
    disabled,
    handleChange,
    handleSave,
    handleTagSuggestions,
    handleWikilinkSuggestions,
    placeholderText,
    value,
  ]);

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
