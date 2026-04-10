import {
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth';
import { CommandContext } from '../../lib/command-context';
import { getItemDisplayLabel } from '../../lib/filenames';
import {
  createInboxItemFromCapture,
  createItemFromTemplate,
  fetchCommandTemplates,
  getCapturePreview,
  ITEMS_REFRESH_EVENT,
  searchCommandItemsByTitle,
} from '../../lib/items';
import { FabButton } from './FabButton';
import styles from './CommandSheet.module.css';

const TEMPLATE_SKELETON_ROWS = ['template-1', 'template-2', 'template-3'];
const CAPTURE_PLACEHOLDER = 'Capture something…';
const PALETTE_PLACEHOLDER = 'Search items, views, and actions…';

const JUMP_DESTINATIONS = [
  { id: 'now', label: 'Now', to: '/' },
  { id: 'knowledge', label: 'Knowledge', to: '/knowledge' },
  { id: 'strategy', label: 'Strategy', to: '/strategy' },
  { id: 'areas', label: 'Areas', to: '/strategy/areas' },
  { id: 'execution', label: 'Execution', to: '/execution' },
  { id: 'inbox', label: 'Inbox', to: '/inbox' },
  { id: 'capture-review', label: 'Capture Review', to: '/wizard/capture' },
  { id: 'notes', label: 'Notes', to: '/notes' },
  { id: 'sources', label: 'Sources', to: '/sources' },
  { id: 'library', label: 'Library', to: '/items' },
  { id: 'settings', label: 'Settings', to: '/settings' },
  { id: 'trash', label: 'Trash', to: '/settings/trash' },
];

const PALETTE_GROUP_ORDER = ['Navigate', 'Create', 'Insert'];

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
  return [result.label, result.meta, ...(result.keywords ?? [])]
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

export function CommandSheet({ children }) {
  const auth = useAuth();
  const navigate = useNavigate();

  // Sheet state
  const [activeSheet, setActiveSheet] = useState(null);
  const [captureValue, setCaptureValue] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [isSavingCapture, setIsSavingCapture] = useState(false);
  const isCreatingRef = useRef(false);

  // Command registry
  const [registeredCommands, setRegisteredCommands] = useState([]);
  const [recentCommandIds, setRecentCommandIds] = useState([]);

  // Palette data
  const [isLoadingPaletteDefaults, setIsLoadingPaletteDefaults] = useState(false);
  const [isLoadingItemSearch, setIsLoadingItemSearch] = useState(false);
  const [paletteError, setPaletteError] = useState('');
  const [paletteQuery, setPaletteQuery] = useState('');
  const [templateItems, setTemplateItems] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0);

  const captureInputRef = useRef(null);
  const paletteInputRef = useRef(null);
  const captureInputId = useId();
  const paletteInputId = useId();
  const deferredPaletteQuery = useDeferredValue(paletteQuery);
  const trimmedPaletteQuery = deferredPaletteQuery.trim();
  const capturePreview = getCapturePreview(captureValue);
  const isCaptureOpen = activeSheet === 'capture';
  const isPaletteOpen = activeSheet === 'palette';

  // --- Sheet open/close (stable callbacks) ---

  const closePalette = useCallback(() => {
    setActiveSheet(null);
    setPaletteError('');
    setPaletteQuery('');
    setSearchResults([]);
    setSelectedPaletteIndex(0);
  }, []);

  const closeCaptureSheet = useCallback(() => {
    setActiveSheet(null);
    setCaptureValue('');
    setCaptureError('');
  }, []);

  const openPalette = useCallback(() => {
    setCaptureValue('');
    setCaptureError('');
    setActiveSheet('palette');
    setPaletteError('');
  }, []);

  const openCaptureSheet = useCallback(() => {
    setPaletteError('');
    setPaletteQuery('');
    setSearchResults([]);
    setSelectedPaletteIndex(0);
    setActiveSheet('capture');
    setCaptureError('');
  }, []);

  // --- Command registry ---

  const registerCommands = useCallback((commands) => {
    setRegisteredCommands((prev) => [
      ...prev.filter((c) => !commands.find((n) => n.id === c.id)),
      ...commands,
    ]);
  }, []);

  const unregisterCommands = useCallback((ids) => {
    setRegisteredCommands((prev) => prev.filter((c) => !ids.includes(c.id)));
  }, []);

  const recordCommandExecution = useCallback((id) => {
    setRecentCommandIds((prev) =>
      [id, ...prev.filter((x) => x !== id)].slice(0, 5),
    );
  }, []);

  // Converts a command to a palette result object
  const commandToResult = useCallback((command) => ({
    id: command.id,
    label: command.label,
    meta: '',
    typeLabel: command.group,
    keywords: command.keywords,
    onSelect: async () => {
      recordCommandExecution(command.id);
      await command.action();
    },
  }), [recordCommandExecution]);

  // --- Built-in navigate commands ---

  const navigateCommands = useMemo(() =>
    JUMP_DESTINATIONS.map((dest) => ({
      id: `navigate-${dest.id}`,
      label: `Go to ${dest.label}`,
      group: 'Navigate',
      keywords: ['go', 'open', 'view', dest.id, dest.to],
      action: async () => {
        closePalette();
        await navigate({ to: dest.to });
      },
    })),
  [closePalette, navigate]);

  // --- Create from template ---

  const handleCreateFromTemplate = useCallback(async (templateItem) => {
    if (isCreatingRef.current) {
      return;
    }

    if (!auth.user?.id) {
      setPaletteError('Your session is missing a user id.');
      return;
    }

    isCreatingRef.current = true;
    setPaletteError('');

    try {
      const createdItem = await createItemFromTemplate({
        templateId: templateItem.id,
        userId: auth.user.id,
      });

      closePalette();
      await navigate({
        params: { id: createdItem.id },
        to: '/items/$id',
      });
    } catch (error) {
      setPaletteError(
        error.message ?? 'Unable to create an item from that template.',
      );
    } finally {
      isCreatingRef.current = false;
    }
  }, [auth.user?.id, closePalette, navigate]);

  // --- Built-in create commands (from templates) ---

  const createCommands = useMemo(() =>
    templateItems.map((t) => ({
      id: `create-${t.id}`,
      label: `New ${formatTemplateLabel(t)}`,
      group: 'Create',
      keywords: ['create', 'new', t.type, t.subtype, t.filename].filter(Boolean),
      action: async () => handleCreateFromTemplate(t),
    })),
  [templateItems, handleCreateFromTemplate]);

  // --- All commands (built-ins + externally registered) ---

  const allCommands = useMemo(() => [
    ...navigateCommands,
    ...createCommands,
    ...registeredCommands,
  ], [navigateCommands, createCommands, registeredCommands]);

  // --- Capture input focus ---

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

  // --- Capture textarea auto-grow ---

  useEffect(() => {
    const input = captureInputRef.current;

    if (!isCaptureOpen || !(input instanceof HTMLTextAreaElement)) {
      return;
    }

    input.style.height = '0px';
    input.style.height = `${input.scrollHeight}px`;
  }, [captureValue, isCaptureOpen]);

  // --- Capture save ---

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

  // --- Sheet-level keyboard shortcuts (Escape + capture Enter) ---

  useEffect(() => {
    if (!isCaptureOpen && !isPaletteOpen) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (isCaptureOpen) {
          closeCaptureSheet(); // discard — does NOT save
          return;
        }

        requestClosePalette();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCaptureOpen, isPaletteOpen, closeCaptureSheet, requestClosePalette]);

  // --- Global open/toggle shortcuts (Cmd+K / Cmd+Shift+K) ---

  useEffect(() => {
    function handleGlobalKeyDown(event) {
      const isMod = event.metaKey || event.ctrlKey;

      if (!isMod) {
        return;
      }

      if (event.key === 'k' && !event.shiftKey) {
        event.preventDefault();

        if (isPaletteOpen) {
          closePalette();
          return;
        }

        if (isCaptureOpen) {
          closeCaptureSheet();
        }

        openPalette();
        return;
      }

      if (event.shiftKey && event.key === 'K') {
        event.preventDefault();

        if (isCaptureOpen) {
          void requestCloseCapture(); // save and close
          return;
        }

        if (isPaletteOpen) {
          closePalette();
        }

        openCaptureSheet();
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    isCaptureOpen,
    isPaletteOpen,
    closeCaptureSheet,
    closePalette,
    openCaptureSheet,
    openPalette,
    requestCloseCapture,
  ]);

  // --- Load templates when palette opens ---

  useEffect(() => {
    if (!isPaletteOpen || !auth.user?.id) {
      return;
    }

    let cancelled = false;

    setIsLoadingPaletteDefaults(true);
    setPaletteError('');

    fetchCommandTemplates(auth.user.id)
      .then((items) => {
        if (cancelled) {
          return;
        }

        setTemplateItems(items);
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

  // --- Item search ---

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

  // --- Open item ---

  const handleOpenItem = useCallback(async (itemId) => {
    closePalette();
    await navigate({ params: { id: itemId }, to: '/items/$id' });
  }, [closePalette, navigate]);

  // --- Palette result arrays ---

  // Recent: look up last-executed command IDs in allCommands
  const defaultPaletteGroups = useMemo(() => {
    const recentResults = recentCommandIds
      .map((id) => allCommands.find((c) => c.id === id))
      .filter(Boolean)
      .map(commandToResult);

    const groups = [
      { id: 'recent', title: 'Recent', items: recentResults },
      ...PALETTE_GROUP_ORDER.map((groupName) => ({
        id: groupName.toLowerCase(),
        title: groupName,
        items: allCommands
          .filter((c) => c.group === groupName)
          .map(commandToResult),
      })),
    ];

    return groups.filter((g) => g.items.length > 0);
  }, [recentCommandIds, allCommands, commandToResult]);

  // Flat list of all default results (for keyboard navigation)
  const flattenedDefaultResults = useMemo(() =>
    defaultPaletteGroups.flatMap((g) => g.items),
  [defaultPaletteGroups]);

  // Search: flat fuzzy list of commands + item search results
  const paletteSearchResults = useMemo(() => {
    if (!trimmedPaletteQuery) {
      return [];
    }

    const itemResults = searchResults.map((item) => ({
      id: `item-${item.id}`,
      label: formatItemLabel(item),
      meta: formatItemMeta(item),
      typeLabel: 'Item',
      keywords: [item.type, item.subtype, item.filename].filter(Boolean),
      onSelect: async () => handleOpenItem(item.id),
    }));

    const commandResults = allCommands.map(commandToResult);
    const combined = [...commandResults, ...itemResults];
    const dedupedResults = new Map();

    combined.forEach((result) => {
      const score = getMatchScore(result, trimmedPaletteQuery);

      if (score == null) {
        return;
      }

      const existing = dedupedResults.get(result.id);

      if (!existing || score < existing.score) {
        dedupedResults.set(result.id, { ...result, score });
      }
    });

    return [...dedupedResults.values()].sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }

      return a.label.localeCompare(b.label);
    });
  }, [trimmedPaletteQuery, searchResults, allCommands, commandToResult, handleOpenItem]);

  const visiblePaletteResults = trimmedPaletteQuery
    ? paletteSearchResults
    : flattenedDefaultResults;

  const selectedPaletteResult = visiblePaletteResults[selectedPaletteIndex] ?? null;

  // Clamp selection index when results change
  useEffect(() => {
    if (visiblePaletteResults.length === 0) {
      setSelectedPaletteIndex(0);
      return;
    }

    setSelectedPaletteIndex((current) =>
      Math.min(current, visiblePaletteResults.length - 1),
    );
  }, [visiblePaletteResults]);

  // --- Sheet interaction ---

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

  // --- Render palette result ---

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

  // --- Context value ---

  const commandContextValue = useMemo(() => ({
    openCapture: openCaptureSheet,
    openPalette,
    registerCommands,
    templateItems,
    unregisterCommands,
  }), [openCaptureSheet, openPalette, registerCommands, templateItems, unregisterCommands]);

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
                      onBlur={() => {
                        if (captureValue.trim() && !isSavingCapture) {
                          void saveCaptureAndClose();
                        }
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
                      onClick={closeCaptureSheet}
                      type="button"
                    >
                      Discard
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
                          setSelectedPaletteIndex((current) =>
                            Math.min(
                              current + 1,
                              Math.max(visiblePaletteResults.length - 1, 0),
                            ),
                          );
                          return;
                        }

                        if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          setSelectedPaletteIndex((current) =>
                            Math.max(current - 1, 0),
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
                        {isLoadingPaletteDefaults && createCommands.length === 0 ? (
                          <section className={styles.commandSheet__section}>
                            <h3 className={styles.commandSheet__sectionTitle}>
                              Create
                            </h3>
                            <div className={styles.commandSheet__skeletonList}>
                              {TEMPLATE_SKELETON_ROWS.map((rowId) => (
                                <div className={styles.commandSheet__skeletonRow} key={rowId} />
                              ))}
                            </div>
                          </section>
                        ) : null}

                        {defaultPaletteGroups.map((group) => (
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
                        ))}
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
