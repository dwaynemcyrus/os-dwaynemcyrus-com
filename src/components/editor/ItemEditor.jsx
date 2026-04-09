import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Compartment, EditorState, StateEffect } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  keymap,
  placeholder,
  scrollPastEnd,
} from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { yaml } from '@codemirror/lang-yaml';
import { HighlightStyle, LanguageDescription, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { basicSetup } from 'codemirror';
import { mergeTemplateIntoEditorDocument } from '../../lib/frontmatter';
import {
  buildWikilinkTargetIndex,
  resolveWikilinkLabel,
} from '../../lib/wikilinks';
import styles from './ItemEditor.module.css';

// ---------------------------------------------------------------------------
// Code languages for fenced code block syntax highlighting
// ---------------------------------------------------------------------------

const CODE_LANGUAGES = [
  LanguageDescription.of({
    alias: ['js', 'javascript', 'mjs', 'cjs'],
    name: 'JavaScript',
    support: javascript(),
  }),
  LanguageDescription.of({
    alias: ['jsx'],
    name: 'JSX',
    support: javascript({ jsx: true }),
  }),
  LanguageDescription.of({
    alias: ['ts', 'typescript'],
    name: 'TypeScript',
    support: javascript({ typescript: true }),
  }),
  LanguageDescription.of({
    alias: ['tsx'],
    name: 'TSX',
    support: javascript({ jsx: true, typescript: true }),
  }),
  LanguageDescription.of({
    alias: ['py', 'python'],
    name: 'Python',
    support: python(),
  }),
  LanguageDescription.of({
    alias: ['html'],
    name: 'HTML',
    support: html(),
  }),
  LanguageDescription.of({
    alias: ['css'],
    name: 'CSS',
    support: css(),
  }),
  LanguageDescription.of({
    alias: ['yaml', 'yml'],
    name: 'YAML',
    support: yaml(),
  }),
  LanguageDescription.of({
    alias: ['json'],
    name: 'JSON',
    support: json(),
  }),
];

// ---------------------------------------------------------------------------
// Syntax highlight style — dark theme colours
// Placed before basicSetup so it takes precedence over defaultHighlightStyle
// (which uses {fallback: true} and only applies to uncovered tags).
// ---------------------------------------------------------------------------

const editorHighlightStyle = HighlightStyle.define([
  // --- Markdown structure ---
  { color: '#ffffff', fontWeight: '500', tag: tags.heading },
  { color: '#89ddff', tag: [tags.link, tags.url] },
  { fontStyle: 'italic', tag: tags.emphasis },
  { fontWeight: '500', tag: tags.strong },
  { textDecoration: 'line-through', tag: tags.strikethrough },
  // Markdown syntax characters (**, *, #, >, `, etc.)
  { color: 'rgba(255, 255, 255, 0.38)', tag: tags.processingInstruction },
  { color: 'rgba(255, 255, 255, 0.38)', tag: tags.contentSeparator },

  // --- Code tokens (inside fenced code blocks) ---
  { color: '#c792ea', tag: tags.keyword },
  { color: 'rgba(255, 255, 255, 0.38)', fontStyle: 'italic', tag: tags.comment },
  { color: '#c3e88d', tag: [tags.string, tags.special(tags.string)] },
  { color: '#f78c6c', tag: [tags.number, tags.bool, tags.null, tags.atom] },
  { color: '#ffcb6b', tag: [tags.typeName, tags.className, tags.namespace] },
  { color: '#82aaff', tag: [tags.propertyName, tags.definition(tags.variableName)] },
  { color: '#82aaff', tag: [tags.function(tags.variableName), tags.function(tags.propertyName)] },
  { color: '#eeffff', tag: tags.variableName },
  { color: '#89ddff', tag: tags.operator },
  { color: 'rgba(255, 255, 255, 0.55)', tag: tags.punctuation },
  { color: '#ff5572', tag: [tags.tagName, tags.labelName] },
  { color: '#ffcb6b', tag: tags.attributeName },
  { color: '#c3e88d', tag: tags.attributeValue },
  { color: '#f78c6c', fontStyle: 'italic', tag: tags.self },

  // --- YAML keys ---
  { color: '#82aaff', tag: tags.propertyName },
]);

// ---------------------------------------------------------------------------
// Editor compartments and effects
// ---------------------------------------------------------------------------

const editableCompartment = new Compartment();
const scrollPastEndCompartment = new Compartment();
const wikilinkRefreshEffect = StateEffect.define();

// ---------------------------------------------------------------------------
// Wikilink autocomplete
// ---------------------------------------------------------------------------

function buildWikilinkCompletionSource(loadWikilinkSuggestions, cacheRef) {
  return async function completeWikilinks(context) {
    const match = context.matchBefore(/\[\[[^\]\n]*$/);

    if (!match) {
      return null;
    }

    if (match.from === match.to && !context.explicit) {
      return null;
    }

    const rawQuery = match.text.slice(2);

    // Once the user starts typing a fragment (#Section or #^block-id),
    // stop autocompleting page names — they're beyond the page name.
    if (rawQuery.includes('#')) {
      return null;
    }

    const cacheKey = rawQuery.toLowerCase();
    let suggestions = cacheRef.current.get(cacheKey);

    if (!suggestions) {
      suggestions = await loadWikilinkSuggestions(rawQuery);
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
      validFor: /^[^#\]\n]*$/,
    };
  };
}

// ---------------------------------------------------------------------------
// Tag autocomplete
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Wikilink decorations
// ---------------------------------------------------------------------------

function shouldOpenResolvedWikilink(event) {
  if (event.button !== 0) {
    return false;
  }

  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches
  ) {
    return true;
  }

  return event.metaKey || event.ctrlKey;
}

// Matches [[Page Name]], [[Page Name#Section]], [[Page Name#^block-id]]
// Capture group 1 = full inner content (page + optional fragment)
const WIKILINK_DECORATION_REGEXP = /\[\[([^\]\n]+?)\]\]/g;

function buildWikilinkDecoration(match, targetIndex) {
  const fullLabel = match[1];
  // Strip fragment (#Section or #^block-id) before resolving the page name
  const pageLabel = fullLabel.split('#')[0].trim();

  const resolution = resolveWikilinkLabel({
    label: pageLabel,
    targetIndex,
  });

  if (resolution.state === 'resolved') {
    return Decoration.mark({
      attributes: {
        'data-wikilink-target-id': resolution.target.id,
        title: 'Open linked item',
      },
      class: 'cm-wikilink cm-wikilinkResolved',
    });
  }

  if (resolution.state === 'ambiguous') {
    return Decoration.mark({
      attributes: {
        title: 'Multiple saved items share this wikilink title.',
      },
      class: 'cm-wikilink cm-wikilinkAmbiguous',
    });
  }

  return Decoration.mark({
    attributes: {
      title: 'No saved item matches this wikilink yet.',
    },
    class: 'cm-wikilink cm-wikilinkUnresolved',
  });
}

function buildWikilinkDecorationsExtension({
  onOpenWikilinkRef,
  targetIndexRef,
}) {
  const decorator = new MatchDecorator({
    decoration(match) {
      return buildWikilinkDecoration(match, targetIndexRef.current);
    },
    regexp: WIKILINK_DECORATION_REGEXP,
  });

  function maybeOpenResolvedWikilink(event) {
    const eventTarget =
      event.target instanceof Element
        ? event.target.closest('[data-wikilink-target-id]')
        : null;
    const targetId = eventTarget?.getAttribute('data-wikilink-target-id');

    if (!targetId || !shouldOpenResolvedWikilink(event)) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    onOpenWikilinkRef.current(targetId);

    return true;
  }

  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = decorator.createDeco(view);
      }

      update(update) {
        if (
          update.transactions.some((transaction) =>
            transaction.effects.some((effect) => effect.is(wikilinkRefreshEffect)),
          )
        ) {
          this.decorations = decorator.createDeco(update.view);
          return;
        }

        if (update.docChanged || update.viewportChanged) {
          this.decorations = decorator.updateDeco(update, this.decorations);
        }
      }
    },
    {
      decorations: (value) => value.decorations,
      eventHandlers: {
        click(event) {
          return maybeOpenResolvedWikilink(event);
        },
      },
    },
  );
}

// ---------------------------------------------------------------------------
// ItemEditor component
// ---------------------------------------------------------------------------

export const ItemEditor = forwardRef(function ItemEditor(
  {
    autocompleteCacheKey,
    disabled = false,
    loadTagSuggestions,
    loadWikilinkSuggestions,
    onChange,
    onOpenWikilink = () => {},
    onSave,
    placeholderText,
    scrollPastEndEnabled = true,
    syncVersion,
    value,
    wikilinkTargets = [],
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
  const latestOnOpenWikilinkRef = useRef(onOpenWikilink);
  const latestOnSaveRef = useRef(onSave);
  const latestWikilinkTargetIndexRef = useRef(
    buildWikilinkTargetIndex(wikilinkTargets),
  );
  const initialScrollPastEndEnabledRef = useRef(scrollPastEndEnabled);
  const tagSuggestionsCacheRef = useRef(new Map());
  const wikilinkSuggestionsCacheRef = useRef(new Map());

  latestLoadTagSuggestionsRef.current = loadTagSuggestions;
  latestLoadWikilinkSuggestionsRef.current = loadWikilinkSuggestions;
  latestOnChangeRef.current = onChange;
  latestOnOpenWikilinkRef.current = onOpenWikilink;
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
    const wikilinkDecorationsExtension = buildWikilinkDecorationsExtension({
      onOpenWikilinkRef: latestOnOpenWikilinkRef,
      targetIndexRef: latestWikilinkTargetIndexRef,
    });

    const editorView = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          // Custom highlight style placed before basicSetup so it takes
          // precedence over defaultHighlightStyle (which uses {fallback: true})
          syntaxHighlighting(editorHighlightStyle),
          basicSetup,
          markdown({ codeLanguages: CODE_LANGUAGES }),
          EditorView.lineWrapping,
          EditorState.languageData.of(() => [
            { autocomplete: wikilinkCompletionSource },
            { autocomplete: tagCompletionSource },
          ]),
          wikilinkDecorationsExtension,
          placeholder(initialPlaceholderTextRef.current),
          editableCompartment.of(
            EditorView.editable.of(!initialDisabledRef.current),
          ),
          scrollPastEndCompartment.of(
            initialScrollPastEndEnabledRef.current ? scrollPastEnd() : [],
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

    if (!initialDisabledRef.current) {
      window.requestAnimationFrame(() => {
        if (editorViewRef.current === editorView) {
          editorView.focus();
        }
      });
    }

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
      effects: scrollPastEndCompartment.reconfigure(
        scrollPastEndEnabled ? scrollPastEnd() : [],
      ),
    });
  }, [scrollPastEndEnabled]);

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
    latestWikilinkTargetIndexRef.current = buildWikilinkTargetIndex(
      wikilinkTargets,
    );

    const editorView = editorViewRef.current;

    if (!editorView) {
      return;
    }

    editorView.dispatch({
      effects: wikilinkRefreshEffect.of(null),
    });
  }, [wikilinkTargets]);

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
