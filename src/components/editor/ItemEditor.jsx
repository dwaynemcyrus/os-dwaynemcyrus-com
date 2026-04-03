import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { basicSetup } from 'codemirror';
import { mergeTemplateIntoEditorDocument } from '../../lib/frontmatter';
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
    syncVersion,
    value,
  },
  ref,
) {
  const hostRef = useRef(null);
  const editorViewRef = useRef(null);
  const initialDisabledRef = useRef(disabled);
  const initialPlaceholderTextRef = useRef(placeholderText);
  const initialValueRef = useRef(value);
  const latestLoadTagSuggestionsRef = useRef(loadTagSuggestions);
  const latestLoadWikilinkSuggestionsRef = useRef(loadWikilinkSuggestions);
  const latestOnChangeRef = useRef(onChange);
  const latestOnSaveRef = useRef(onSave);
  const tagSuggestionsCacheRef = useRef(new Map());
  const wikilinkSuggestionsCacheRef = useRef(new Map());

  latestLoadTagSuggestionsRef.current = loadTagSuggestions;
  latestLoadWikilinkSuggestionsRef.current = loadWikilinkSuggestions;
  latestOnChangeRef.current = onChange;
  latestOnSaveRef.current = onSave;

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
      insertTemplate(templateRawMarkdown) {
        const editorView = editorViewRef.current;

        if (!editorView) {
          return;
        }

        const selection = editorView.state.selection.main;
        const { rawMarkdown, selectionAnchor } = mergeTemplateIntoEditorDocument({
          currentRawMarkdown: editorView.state.doc.toString(),
          selectionEnd: selection.to,
          selectionStart: selection.from,
          templateRawMarkdown,
        });

        editorView.dispatch({
          changes: {
            from: 0,
            insert: rawMarkdown,
            to: editorView.state.doc.length,
          },
          scrollIntoView: true,
          selection: {
            anchor: selectionAnchor,
          },
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
      async (query) => latestLoadWikilinkSuggestionsRef.current(query),
      wikilinkSuggestionsCacheRef,
    );
    const tagCompletionSource = buildTagCompletionSource(
      async (query) => latestLoadTagSuggestionsRef.current(query),
      tagSuggestionsCacheRef,
    );

    const editorView = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          basicSetup,
          markdown(),
          EditorView.lineWrapping,
          EditorState.languageData.of(() => [
            { autocomplete: wikilinkCompletionSource },
            { autocomplete: tagCompletionSource },
          ]),
          placeholder(initialPlaceholderTextRef.current),
          editableCompartment.of(
            EditorView.editable.of(!initialDisabledRef.current),
          ),
          keymap.of([
            {
              key: 'Mod-s',
              run() {
                latestOnSaveRef.current();
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) {
              return;
            }

            latestOnChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });

    editorViewRef.current = editorView;

    return () => {
      editorView.destroy();
      editorViewRef.current = null;
    };
  }, []);

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
  }, [syncVersion, value]);

  return (
    <div
      className={`${styles.editor}${disabled ? ` ${styles.editorDisabled}` : ''}`}
      ref={hostRef}
    />
  );
});
