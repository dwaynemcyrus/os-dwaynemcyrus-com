import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth';
import { CommandContext } from '../../lib/command-context';
import { getItemDisplayLabel } from '../../lib/filenames';
import {
  buildMaterializedTemplateMarkdown,
  createInboxItemFromCapture,
  createItemFromTemplate,
  fetchCommandTemplates,
  fetchRecentCommandItems,
  getCapturePreview,
  ITEMS_REFRESH_EVENT,
  searchCommandItemsByTitle,
} from '../../lib/items';
import { FabButton } from './FabButton';
import styles from './CommandSheet.module.css';

const EMPTY_GROUP_LIMIT = 5;
const RECENT_SKELETON_ROWS = ['recent-1', 'recent-2', 'recent-3'];
const TEMPLATE_SKELETON_ROWS = ['template-1', 'template-2', 'template-3'];
const CAPTURE_PLACEHOLDER = 'Capture something…';
const PALETTE_PLACEHOLDER = 'Search items, views, and actions…';

const JUMP_DESTINATIONS = [
  {
    id: 'now',
    label: 'Now',
    meta: 'Jump to the home screen.',
    to: '/',
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    meta: 'Open notes and sources.',
    to: '/knowledge',
  },
  {
    id: 'strategy',
    label: 'Strategy',
    meta: 'Open cycles, reviews, and planning placeholders.',
    to: '/strategy',
  },
  {
    id: 'execution',
    label: 'Execution',
    meta: 'Open today, backlog, and logbook placeholders.',
    to: '/execution',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    meta: 'Review unprocessed captures.',
    to: '/inbox',
  },
  {
    id: 'capture-review',
    label: 'Capture Review',
    meta: 'Process inbox captures through the review wizard.',
    to: '/wizard/capture',
  },
  {
    id: 'notes',
    label: 'Notes',
    meta: 'Browse all notes.',
    to: '/notes',
  },
  {
    id: 'sources',
    label: 'Sources',
    meta: 'Open the sources inbox.',
    to: '/sources',
  },
  {
    id: 'library',
    label: 'Library',
    meta: 'Browse every saved item.',
    to: '/items',
  },
  {
    id: 'settings',
    label: 'Settings',
    meta: 'Open preferences and account settings.',
    to: '/settings',
  },
  {
    id: 'trash',
    label: 'Trash',
    meta: 'Open trash from settings.',
    to: '/settings/trash',
  },
];

function formatItemLabel(item) {
  return getItemDisplayLabel(item, 'Untitled item');
}

function formatTemplateLabel(item) {
  return getItemDisplayLabel(
    item,
    item.subtype ? item.subtype.replaceAll('_', ' ') : 'Untitled template',
  );
}

function formatDateLabel(value) {
  if (!value) {
    return 'No date';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function formatItemMeta(item) {
  const metaParts = [];

  if (item.type) {
    metaParts.push(item.type);
  }

  if (item.subtype) {
    metaParts.push(item.subtype.replaceAll('_', ' '));
  }

  metaParts.push(formatDateLabel(item.date_modified ?? item.date_created));

  return metaParts.join(' · ');
}

function buildSearchableText(result) {
  return [
    result.label,
    result.meta,
    ...(result.keywords ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getMatchScore(result, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return 0;
  }

  const label = result.label.toLowerCase();
  const searchableText = buildSearchableText(result);

  if (label === normalizedQuery) {
    return 0;
  }

  if (label.startsWith(normalizedQuery)) {
    return 10;
  }

  const labelWordIndex = label.indexOf(` ${normalizedQuery}`);

  if (labelWordIndex >= 0) {
    return 20 + labelWordIndex;
  }

  const searchableIndex = searchableText.indexOf(normalizedQuery);

  if (searchableIndex >= 0) {
    return 100 + searchableIndex;
  }

  return null;
}

function sliceGroupItems(items) {
  return items.slice(0, EMPTY_GROUP_LIMIT);
}

export function CommandSheet({ children }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [activeSheet, setActiveSheet] = useState(null);
  const [captureValue, setCaptureValue] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [isSavingCapture, setIsSavingCapture] = useState(false);
  const [insertTemplateTarget, setInsertTemplateTarget] = useState(null);
  const [, setIsCreatingFromTemplate] = useState(false);
  const [isLoadingPaletteDefaults, setIsLoadingPaletteDefaults] = useState(false);
  const [isLoadingItemSearch, setIsLoadingItemSearch] = useState(false);
  const [paletteError, setPaletteError] = useState('');
  const [paletteQuery, setPaletteQuery] = useState('');
  const [recentItems, setRecentItems] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0);
  const [templateItems, setTemplateItems] = useState([]);
  const captureInputRef = useRef(null);
  const paletteInputRef = useRef(null);
  const captureInputId = useId();
  const paletteInputId = useId();
  const deferredPaletteQuery = useDeferredValue(paletteQuery);
  const trimmedPaletteQuery = deferredPaletteQuery.trim();
  const capturePreview = getCapturePreview(captureValue);
  const isCaptureOpen = activeSheet === 'capture';
  const isPaletteOpen = activeSheet === 'palette';

  function resetCaptureState() {
    setCaptureValue('');
    setCaptureError('');
  }

  function resetPaletteState() {
    setPaletteError('');
    setPaletteQuery('');
    setSearchResults([]);
    setSelectedPaletteIndex(0);
  }

  function closeCaptureSheet() {
    setActiveSheet(null);
    resetCaptureState();
  }

  function closePalette() {
    setActiveSheet(null);
    resetPaletteState();
  }

  function openCaptureSheet() {
    resetPaletteState();
    setActiveSheet('capture');
    setCaptureError('');
  }

  function openPalette() {
    resetCaptureState();
    setActiveSheet('palette');
    setPaletteError('');
  }

  async function saveCaptureAndClose() {
    const normalizedValue = captureValue.trim();

    if (!normalizedValue) {
      closeCaptureSheet();
      return true;
    }

    if (!auth.user?.id) {
      setCaptureError('Your session is missing a user id.');
      return false;
    }

    setIsSavingCapture(true);
    setCaptureError('');

    try {
      await createInboxItemFromCapture({
        rawValue: normalizedValue,
        userId: auth.user.id,
      });
      window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
      closeCaptureSheet();
      return true;
    } catch (error) {
      setCaptureError(error.message ?? 'Unable to save to inbox right now.');
      return false;
    } finally {
      setIsSavingCapture(false);
    }
  }

  const requestCloseCapture = useEffectEvent(async () => {
    await saveCaptureAndClose();
  });

  const requestClosePalette = useEffectEvent(() => {
    closePalette();
  });

  const focusCaptureInput = useEffectEvent(() => {
    const input = captureInputRef.current;

    if (!input) {
      return;
    }

    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
  });

  const focusPaletteInput = useEffectEvent(() => {
    const input = paletteInputRef.current;

    if (!input) {
      return;
    }

    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
  });

  useEffect(() => {
    if (isCaptureOpen) {
      focusCaptureInput();
      return;
    }

    if (isPaletteOpen) {
      focusPaletteInput();
    }
  }, [focusCaptureInput, focusPaletteInput, isCaptureOpen, isPaletteOpen]);

  useEffect(() => {
    const input = captureInputRef.current;

    if (!isCaptureOpen || !(input instanceof HTMLTextAreaElement)) {
      return;
    }

    input.style.height = '0px';
    input.style.height = `${input.scrollHeight}px`;
  }, [captureValue, isCaptureOpen]);

  useEffect(() => {
    if (!isCaptureOpen && !isPaletteOpen) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (isCaptureOpen) {
          void requestCloseCapture();
          return;
        }

        requestClosePalette();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCaptureOpen, isPaletteOpen, requestCloseCapture, requestClosePalette]);

  useEffect(() => {
    if (!isPaletteOpen || !auth.user?.id) {
      return;
    }

    let cancelled = false;

    setIsLoadingPaletteDefaults(true);
    setPaletteError('');

    Promise.all([
      fetchRecentCommandItems(auth.user.id),
      fetchCommandTemplates(auth.user.id),
    ])
      .then(([nextRecentItems, nextTemplateItems]) => {
        if (cancelled) {
          return;
        }

        setRecentItems(nextRecentItems);
        setTemplateItems(nextTemplateItems);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setPaletteError(
          error.message ?? 'Unable to load command palette items right now.',
        );
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setIsLoadingPaletteDefaults(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth.user?.id, isPaletteOpen]);

  useEffect(() => {
    if (!isPaletteOpen || !auth.user?.id) {
      return;
    }

    if (!trimmedPaletteQuery) {
      setSearchResults([]);
      setIsLoadingItemSearch(false);
      return;
    }

    let cancelled = false;

    setIsLoadingItemSearch(true);

    const timeoutId = window.setTimeout(() => {
      searchCommandItemsByTitle(auth.user.id, trimmedPaletteQuery)
        .then((results) => {
          if (cancelled) {
            return;
          }

          setSearchResults(results);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setPaletteError(error.message ?? 'Unable to search items right now.');
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setIsLoadingItemSearch(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [auth.user?.id, isPaletteOpen, trimmedPaletteQuery]);

  async function handleOpenItem(itemId) {
    closePalette();
    await navigate({
      params: {
        id: itemId,
      },
      to: '/items/$id',
    });
  }

  async function handleOpenTemplate(templateId) {
    closePalette();
    await navigate({
      params: {
        id: templateId,
      },
      to: '/settings/templates/$id',
    });
  }

  async function handleCreateFromTemplate(templateItem) {
    if (!auth.user?.id) {
      setPaletteError('Your session is missing a user id.');
      return;
    }

    setIsCreatingFromTemplate(true);
    setPaletteError('');

    try {
      const createdItem = await createItemFromTemplate({
        templateId: templateItem.id,
        userId: auth.user.id,
      });

      setRecentItems((currentItems) =>
        [createdItem, ...currentItems].slice(0, EMPTY_GROUP_LIMIT),
      );
      closePalette();
      await navigate({
        params: {
          id: createdItem.id,
        },
        to: '/items/$id',
      });
    } catch (error) {
      setPaletteError(
        error.message ?? 'Unable to create an item from that template.',
      );
    } finally {
      setIsCreatingFromTemplate(false);
    }
  }

  async function handleInsertTemplate(templateItem) {
    if (!insertTemplateTarget?.onInsertTemplate) {
      setPaletteError('Open an item before inserting a template.');
      return;
    }

    if (!auth.user?.id) {
      setPaletteError('Your session is missing a user id.');
      return;
    }

    try {
      const templateContext = insertTemplateTarget.getTemplateContext?.();
      const templateRawMarkdown = await buildMaterializedTemplateMarkdown({
        templateItem,
        titleValue: templateContext?.title ?? '',
        userId: auth.user.id,
      });

      if (!templateRawMarkdown.trim()) {
        setPaletteError('That template has no content to insert.');
        return;
      }

      insertTemplateTarget.onInsertTemplate({
        rawMarkdown: templateRawMarkdown,
        template: templateItem,
      });
      closePalette();
    } catch (error) {
      setPaletteError(
        error.message ?? 'Unable to insert that template right now.',
      );
    }
  }

  const jumpResults = JUMP_DESTINATIONS.map((destination) => ({
    id: `jump-${destination.id}`,
    label: destination.label,
    meta: destination.meta,
    onSelect: async () => {
      closePalette();
      await navigate({ to: destination.to });
    },
    typeLabel: 'Jump',
    keywords: ['jump', 'open', 'view', destination.to],
  }));

  const recentResults = recentItems.map((item) => ({
    id: `recent-${item.id}`,
    label: formatItemLabel(item),
    meta: formatItemMeta(item),
    onSelect: async () => {
      await handleOpenItem(item.id);
    },
    typeLabel: 'Recent',
    keywords: [item.type, item.subtype, item.filename].filter(Boolean),
  }));

  const createResults = templateItems.map((templateItem) => ({
    id: `create-${templateItem.id}`,
    label: `Create from template: ${formatTemplateLabel(templateItem)}`,
    meta: formatItemMeta(templateItem),
    onSelect: async () => {
      await handleCreateFromTemplate(templateItem);
    },
    typeLabel: 'Create',
    keywords: [
      'create',
      'new',
      templateItem.type,
      templateItem.subtype,
      templateItem.filename,
    ].filter(Boolean),
  }));

  const insertResults = !insertTemplateTarget?.onInsertTemplate
    ? []
    : templateItems.map((templateItem) => ({
        id: `insert-${templateItem.id}`,
        label: `Insert template: ${formatTemplateLabel(templateItem)}`,
        meta: formatItemMeta(templateItem),
        onSelect: async () => {
          await handleInsertTemplate(templateItem);
        },
        typeLabel: 'Insert',
        keywords: [
          'insert',
          'template',
          templateItem.type,
          templateItem.subtype,
          templateItem.filename,
        ].filter(Boolean),
      }));

  const templateResults = templateItems.map((templateItem) => ({
    id: `template-${templateItem.id}`,
    label: formatTemplateLabel(templateItem),
    meta: formatItemMeta(templateItem),
    onSelect: async () => {
      await handleOpenTemplate(templateItem.id);
    },
    typeLabel: 'Templates',
    keywords: [
      'template',
      'open',
      templateItem.type,
      templateItem.subtype,
      templateItem.filename,
    ].filter(Boolean),
  }));

  const emptyPaletteGroups = [
    {
      id: 'recent',
      title: 'Recent',
      items: sliceGroupItems(recentResults),
    },
    {
      id: 'jump',
      title: 'Jump',
      items: jumpResults,
    },
    {
      id: 'create',
      title: 'Create',
      items: sliceGroupItems(createResults),
    },
    {
      id: 'templates',
      title: 'Templates',
      items: sliceGroupItems(templateResults),
    },
  ];

  if (insertResults.length > 0) {
    emptyPaletteGroups.splice(3, 0, {
      id: 'insert',
      title: 'Insert',
      items: sliceGroupItems(insertResults),
    });
  }

  const visibleEmptyPaletteGroups = emptyPaletteGroups.filter(
    (group) => group.items.length > 0,
  );

  const paletteSearchResults = !trimmedPaletteQuery
    ? []
    : (() => {
        const itemResults = searchResults.map((item) => ({
          id: `item-${item.id}`,
          label: formatItemLabel(item),
          meta: formatItemMeta(item),
          onSelect: async () => {
            await handleOpenItem(item.id);
          },
          typeLabel: 'Item',
          keywords: [item.type, item.subtype, item.filename].filter(Boolean),
        }));
        const combinedResults = [
          ...jumpResults,
          ...createResults,
          ...insertResults,
          ...templateResults,
          ...itemResults,
        ];
        const dedupedResults = new Map();

        combinedResults.forEach((result) => {
          const score = getMatchScore(result, trimmedPaletteQuery);

          if (score == null) {
            return;
          }

          const existingResult = dedupedResults.get(result.id);

          if (!existingResult || score < existingResult.score) {
            dedupedResults.set(result.id, {
              ...result,
              score,
            });
          }
        });

        return [...dedupedResults.values()].sort((leftResult, rightResult) => {
          if (leftResult.score !== rightResult.score) {
            return leftResult.score - rightResult.score;
          }

          return leftResult.label.localeCompare(rightResult.label);
        });
      })();

  const flattenedEmptyResults = visibleEmptyPaletteGroups.flatMap(
    (group) => group.items,
  );
  const visiblePaletteResults = trimmedPaletteQuery
    ? paletteSearchResults
    : flattenedEmptyResults;
  const selectedPaletteResult =
    visiblePaletteResults[selectedPaletteIndex] ?? null;

  useEffect(() => {
    if (visiblePaletteResults.length === 0) {
      setSelectedPaletteIndex(0);
      return;
    }

    setSelectedPaletteIndex((currentIndex) =>
      Math.min(currentIndex, visiblePaletteResults.length - 1),
    );
  }, [visiblePaletteResults]);

  function handleCloseActiveSheet() {
    if (isCaptureOpen) {
      void requestCloseCapture();
      return;
    }

    if (isPaletteOpen) {
      closePalette();
    }
  }

  function handleSheetBackdropClick(event) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (isCaptureOpen) {
      void requestCloseCapture();
      return;
    }

    closePalette();
  }

  function renderPaletteResult(result, isSelected) {
    return (
      <li className={styles.commandSheet__listItem} key={result.id}>
        <button
          aria-selected={isSelected}
          className={`${styles.commandSheet__itemButton} ${
            isSelected ? styles['commandSheet__itemButton--selected'] : ''
          }`}
          onClick={() => {
            void result.onSelect();
          }}
          role="option"
          type="button"
        >
          <span className={styles.commandSheet__itemTitle}>{result.label}</span>
          <span className={styles.commandSheet__itemMeta}>
            {result.typeLabel}
            {result.meta ? ` · ${result.meta}` : ''}
          </span>
        </button>
      </li>
    );
  }

  const commandContextValue = {
    isInsertTemplateAvailable: Boolean(insertTemplateTarget?.onInsertTemplate),
    setInsertTemplateTarget,
  };

  return (
    <CommandContext.Provider value={commandContextValue}>
      <div className={styles.commandSheetShell}>
        <div className={styles.commandSheetShell__content}>{children}</div>

        {activeSheet ? (
          <div
            className={styles.commandSheet}
            onClick={handleSheetBackdropClick}
            role="presentation"
          >
            <section
              aria-label={isCaptureOpen ? 'Capture' : 'Command palette'}
              aria-modal="true"
              className={styles.commandSheet__panel}
              role="dialog"
            >
              {isCaptureOpen ? (
                <>
                  <label className={styles.commandSheet__field} htmlFor={captureInputId}>
                    <span className={styles.commandSheet__label}>Capture</span>
                    <textarea
                      className={styles.commandSheet__input}
                      id={captureInputId}
                      onChange={(event) => {
                        setCaptureValue(event.target.value);
                        setCaptureError('');
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void saveCaptureAndClose();
                        }
                      }}
                      placeholder={CAPTURE_PLACEHOLDER}
                      ref={captureInputRef}
                      rows={1}
                      spellCheck={false}
                      value={captureValue}
                    />
                  </label>

                  <div className={styles.commandSheet__body}>
                    {captureError ? (
                      <p
                        className={`${styles.commandSheet__message} ${styles['commandSheet__message--error']}`}
                        role="alert"
                      >
                        {captureError}
                      </p>
                    ) : null}

                    {capturePreview ? (
                      <section className={styles.commandSheet__section}>
                        <h3 className={styles.commandSheet__sectionTitle}>
                          Capture Preview
                        </h3>
                        <p className={styles.commandSheet__previewTitle}>
                          {capturePreview.title}
                        </p>
                        <p className={styles.commandSheet__previewCopy}>
                          {capturePreview.content || 'No overflow content.'}
                        </p>
                      </section>
                    ) : (
                      <p className={styles.commandSheet__emptyState}>
                        Type and press Enter to save straight to inbox.
                      </p>
                    )}
                  </div>

                  <footer className={styles.commandSheet__footer}>
                    <button
                      className={styles.commandSheet__cancelButton}
                      onClick={() => {
                        void requestCloseCapture();
                      }}
                      type="button"
                    >
                      Close
                    </button>

                    <div className={styles.commandSheet__footerActions}>
                      <button
                        className={styles.commandSheet__saveButton}
                        disabled={!capturePreview || isSavingCapture}
                        onClick={() => {
                          void saveCaptureAndClose();
                        }}
                        type="button"
                      >
                        {isSavingCapture ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </footer>
                </>
              ) : (
                <>
                  <label className={styles.commandSheet__field} htmlFor={paletteInputId}>
                    <span className={styles.commandSheet__label}>Search</span>
                    <input
                      className={styles.commandSheet__input}
                      id={paletteInputId}
                      onChange={(event) => {
                        setPaletteQuery(event.target.value);
                        setPaletteError('');
                        setSelectedPaletteIndex(0);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          setSelectedPaletteIndex((currentIndex) =>
                            Math.min(
                              currentIndex + 1,
                              Math.max(visiblePaletteResults.length - 1, 0),
                            ),
                          );
                          return;
                        }

                        if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          setSelectedPaletteIndex((currentIndex) =>
                            Math.max(currentIndex - 1, 0),
                          );
                          return;
                        }

                        if (event.key === 'Enter' && selectedPaletteResult) {
                          event.preventDefault();
                          void selectedPaletteResult.onSelect();
                        }
                      }}
                      placeholder={PALETTE_PLACEHOLDER}
                      ref={paletteInputRef}
                      spellCheck={false}
                      type="text"
                      value={paletteQuery}
                    />
                  </label>

                  <div className={styles.commandSheet__body}>
                    {paletteError ? (
                      <p
                        className={`${styles.commandSheet__message} ${styles['commandSheet__message--error']}`}
                        role="alert"
                      >
                        {paletteError}
                      </p>
                    ) : null}

                    {!trimmedPaletteQuery ? (
                      <>
                        {isLoadingPaletteDefaults ? (
                          <section className={styles.commandSheet__section}>
                            <h3 className={styles.commandSheet__sectionTitle}>
                              Recent
                            </h3>
                            <div className={styles.commandSheet__skeletonList}>
                              {RECENT_SKELETON_ROWS.map((rowId) => (
                                <div className={styles.commandSheet__skeletonRow} key={rowId} />
                              ))}
                            </div>
                          </section>
                        ) : (
                          visibleEmptyPaletteGroups.map((group) => (
                            <section className={styles.commandSheet__section} key={group.id}>
                              <h3 className={styles.commandSheet__sectionTitle}>
                                {group.title}
                              </h3>
                              <ul
                                className={styles.commandSheet__list}
                                role="listbox"
                              >
                                {group.items.map((result) =>
                                  renderPaletteResult(
                                    result,
                                    selectedPaletteResult?.id === result.id,
                                  ),
                                )}
                              </ul>
                            </section>
                          ))
                        )}
                      </>
                    ) : isLoadingItemSearch && paletteSearchResults.length === 0 ? (
                      <div className={styles.commandSheet__skeletonList}>
                        {TEMPLATE_SKELETON_ROWS.map((rowId) => (
                          <div className={styles.commandSheet__skeletonRow} key={rowId} />
                        ))}
                      </div>
                    ) : paletteSearchResults.length > 0 ? (
                      <ul className={styles.commandSheet__list} role="listbox">
                        {paletteSearchResults.map((result) =>
                          renderPaletteResult(
                            result,
                            selectedPaletteResult?.id === result.id,
                          ),
                        )}
                      </ul>
                    ) : (
                      <p className={styles.commandSheet__emptyState}>
                        No items, views, or actions match this search yet.
                      </p>
                    )}
                  </div>

                  <footer className={styles.commandSheet__footer}>
                    <button
                      className={styles.commandSheet__cancelButton}
                      onClick={closePalette}
                      type="button"
                    >
                      Close
                    </button>
                  </footer>
                </>
              )}
            </section>
          </div>
        ) : null}

        <FabButton
          isSheetOpen={Boolean(activeSheet)}
          onClose={handleCloseActiveSheet}
          onOpen={openCaptureSheet}
          onOpenContext={openPalette}
        />
      </div>
    </CommandContext.Provider>
  );
}
