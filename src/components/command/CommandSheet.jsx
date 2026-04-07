import {
  createElement,
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
  createItemFromTemplate,
  createInboxItemFromCapture,
  fetchCommandTemplates,
  fetchRecentCommandItems,
  getCapturePreview,
  searchCommandItemsByTitle,
} from '../../lib/items';
import { getInsertSlashCommands, getSlashCommands } from '../../lib/templates';
import { ContextSheet } from './ContextSheet';
import { FabButton } from './FabButton';
import styles from './CommandSheet.module.css';

const INBOX_COUNT_REFRESH_EVENT = 'personal-os:inbox-count-refresh';
const RECENT_SKELETON_ROWS = ['recent-1', 'recent-2', 'recent-3'];
const TEMPLATE_SKELETON_ROWS = ['template-1', 'template-2', 'template-3'];
const SHEET_COPY = {
  description: 'Search, capture, or run a slash command.',
  placeholder: 'Search or create…',
  title: 'Command',
};

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

function formatSlashCommandMeta(slashCommand) {
  if (!slashCommand.template) {
    return 'Use /new, then choose an existing template subtype';
  }

  const metaParts = [];

  if (slashCommand.template.type) {
    metaParts.push(slashCommand.template.type);
  }

  if (slashCommand.template.subtype) {
    metaParts.push(slashCommand.template.subtype.replaceAll('_', ' '));
  }

  return metaParts.join(' · ');
}

export function CommandSheet({ children }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [isCommandSheetOpen, setIsCommandSheetOpen] = useState(false);
  const [isContextSheetOpen, setIsContextSheetOpen] = useState(false);
  const [isRapidLogEnabled, setIsRapidLogEnabled] = useState(false);
  const [query, setQuery] = useState('');
  const [recentItems, setRecentItems] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [sheetError, setSheetError] = useState('');
  const [sheetStatus, setSheetStatus] = useState('');
  const [templateItems, setTemplateItems] = useState([]);
  const [isLoadingDefaultState, setIsLoadingDefaultState] = useState(false);
  const [isLoadingSearchResults, setIsLoadingSearchResults] = useState(false);
  const [isSavingCapture, setIsSavingCapture] = useState(false);
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false);
  const [insertTemplateTarget, setInsertTemplateTarget] = useState(null);
  const inputRef = useRef(null);
  const titleId = useId();
  const inputId = useId();
  const descriptionId = useId();
  const deferredQuery = useDeferredValue(query);
  const trimmedQuery = deferredQuery.trim();
  const capturePreview = query.trim().startsWith('/') ? null : getCapturePreview(query);
  const handleEscapeClose = useEffectEvent(() => {
    void requestClose();
  });
  const focusInputWithoutMovingShell = useEffectEvent(() => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    const shellScrollContainer = document.querySelector(
      '[data-app-shell-scroll="true"]',
    );
    const previousScrollTop =
      shellScrollContainer instanceof HTMLElement
        ? shellScrollContainer.scrollTop
        : 0;

    try {
      input.focus({
        preventScroll: true,
      });
    } catch {
      input.focus();
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!(shellScrollContainer instanceof HTMLElement)) {
          return;
        }

        shellScrollContainer.scrollTop = previousScrollTop;
      });
    });
  });

  function updateComposerValue(nextValue) {
    setQuery(nextValue);
    setSheetError('');
    setSheetStatus('');
  }

  function closeSheet() {
    setIsCommandSheetOpen(false);
    setIsRapidLogEnabled(false);
    setQuery('');
    setSearchResults([]);
    setSheetError('');
    setSheetStatus('');
  }

  function openSearchMode() {
    setIsContextSheetOpen(false);
    setIsCommandSheetOpen(true);
  }

  function openContextMode() {
    closeSheet();
    setIsContextSheetOpen(true);
  }

  function closeContextSheet() {
    setIsContextSheetOpen(false);
  }

  function handleCloseActiveSheet() {
    if (isCommandSheetOpen) {
      void requestClose();
      return;
    }

    if (isContextSheetOpen) {
      closeContextSheet();
    }
  }

  async function handleCapture(closeAfterCapture) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      closeSheet();
      return true;
    }

    if (normalizedQuery.startsWith('/')) {
      closeSheet();
      return true;
    }

    if (!auth.user?.id) {
      setSheetError('Your session is missing a user id.');
      return false;
    }

    setIsSavingCapture(true);
    setSheetError('');
    setSheetStatus('');

    try {
      const createdItem = await createInboxItemFromCapture({
        rawValue: normalizedQuery,
        userId: auth.user.id,
      });

      setRecentItems((previousItems) => [createdItem, ...previousItems].slice(0, 8));
      window.dispatchEvent(new Event(INBOX_COUNT_REFRESH_EVENT));
      setSheetStatus('Saved to inbox.');

      if (closeAfterCapture) {
        closeSheet();
      } else {
        setQuery('');
        setSearchResults([]);
        focusInputWithoutMovingShell();
      }

      return true;
    } catch (error) {
      setSheetError(error.message ?? 'Unable to save to inbox right now.');
      return false;
    } finally {
      setIsSavingCapture(false);
    }
  }

  async function requestClose() {
    const normalizedQuery = query.trim();

    if (normalizedQuery) {
      await handleCapture(true);
      return;
    }

    closeSheet();
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      void requestClose();
    }
  }

  useEffect(() => {
    if (!isCommandSheetOpen) {
      return;
    }

    focusInputWithoutMovingShell();
  }, [isCommandSheetOpen, focusInputWithoutMovingShell]);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.style.height = '0px';
    inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
  }, [query, isCommandSheetOpen]);

  useEffect(() => {
    if (!isCommandSheetOpen && !isContextSheetOpen) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (isCommandSheetOpen) {
          handleEscapeClose();
          return;
        }

        closeContextSheet();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCommandSheetOpen, isContextSheetOpen, handleEscapeClose]);

  useEffect(() => {
    if (!isCommandSheetOpen || !auth.user?.id) {
      return;
    }

    if (trimmedQuery && !trimmedQuery.startsWith('/')) {
      return;
    }

    let cancelled = false;

    setIsLoadingDefaultState(true);
    setSheetError('');

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

        setSheetError(
          error.message ?? 'Unable to load command sheet items right now.',
        );
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setIsLoadingDefaultState(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isCommandSheetOpen, trimmedQuery, auth.user?.id]);

  useEffect(() => {
    if (!isCommandSheetOpen || !auth.user?.id) {
      return;
    }

    if (!trimmedQuery || trimmedQuery.startsWith('/')) {
      setSearchResults([]);
      setIsLoadingSearchResults(false);
      return;
    }

    let cancelled = false;

    setIsLoadingSearchResults(true);
    setSheetError('');

    const timeoutId = window.setTimeout(() => {
      searchCommandItemsByTitle(auth.user.id, trimmedQuery)
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

          setSheetError(error.message ?? 'Unable to search item titles right now.');
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setIsLoadingSearchResults(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isCommandSheetOpen, trimmedQuery, auth.user?.id]);

  const isSlashQuery = Boolean(trimmedQuery) && trimmedQuery.startsWith('/');
  const shouldShowDefaultState = !trimmedQuery;
  const shouldShowSearchState = Boolean(trimmedQuery) && !isSlashQuery;
  const shouldShowCaptureState = shouldShowSearchState && Boolean(capturePreview);
  const shouldShowInsertTemplateState =
    shouldShowDefaultState && Boolean(insertTemplateTarget?.onInsertTemplate);
  const slashCommands = getSlashCommands(templateItems, trimmedQuery);
  const firstAvailableSlashCommand = slashCommands.find(
    (slashCommand) => slashCommand.template,
  );
  const insertSlashTemplates = getInsertSlashCommands(templateItems, trimmedQuery);
  const isInsertSlashQuery = insertSlashTemplates !== null;
  const commandContextValue = {
    isInsertTemplateAvailable: Boolean(insertTemplateTarget?.onInsertTemplate),
    setInsertTemplateTarget,
  };

  async function handleOpenItem(itemId) {
    closeSheet();
    await navigate({
      params: {
        id: itemId,
      },
      to: '/items/$id',
    });
  }

  async function handleCreateFromSlashCommand(templateId, titleValue = '') {
    if (!auth.user?.id) {
      setSheetError('Your session is missing a user id.');
      return;
    }

    setIsCreatingFromTemplate(true);
    setSheetError('');
    setSheetStatus('');

    try {
      const createdItem = await createItemFromTemplate({
        templateId,
        title: titleValue,
        userId: auth.user.id,
      });

      setRecentItems((previousItems) => [createdItem, ...previousItems].slice(0, 8));
      closeSheet();
      await navigate({
        params: {
          id: createdItem.id,
        },
        to: '/items/$id',
      });
    } catch (error) {
      setSheetError(error.message ?? 'Unable to create an item from that template.');
    } finally {
      setIsCreatingFromTemplate(false);
    }
  }

  async function handleInsertTemplate(templateItem) {
    if (!insertTemplateTarget?.onInsertTemplate) {
      setSheetError('Open an item before inserting a template.');
      return;
    }

    if (!auth.user?.id) {
      setSheetError('Your session is missing a user id.');
      return;
    }

    try {
      const templateContext = insertTemplateTarget?.getTemplateContext?.();
      const templateRawMarkdown = await buildMaterializedTemplateMarkdown({
        templateItem,
        titleValue: templateContext?.title ?? '',
        userId: auth.user.id,
      });

      if (!templateRawMarkdown.trim()) {
        setSheetError('That template has no content to insert.');
        return;
      }

      insertTemplateTarget.onInsertTemplate({
        rawMarkdown: templateRawMarkdown,
        template: templateItem,
      });
      closeSheet();
    } catch (error) {
      setSheetError(
        error.message ?? 'Unable to insert that template right now.',
      );
    }
  }

  const isAnySheetOpen = isCommandSheetOpen || isContextSheetOpen;
  const sheetTree = (
    <div className={styles.commandSheetShell}>
      <div className={styles.commandSheetShell__content}>{children}</div>

      {createElement(FabButton, {
        isSheetOpen: isAnySheetOpen,
        onClose: handleCloseActiveSheet,
        onOpen: openSearchMode,
        onOpenContext: openContextMode,
      })}

      {isCommandSheetOpen ? (
        <div
          className={styles.commandSheet}
          onClick={handleBackdropClick}
          role="presentation"
        >
          <section
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className={styles.commandSheet__panel}
            role="dialog"
          >
            <header className={styles.commandSheet__header}>
              <div>
                <p className={styles.commandSheet__eyebrow}>Personal OS</p>
                <h2 className={styles.commandSheet__title} id={titleId}>
                  {SHEET_COPY.title}
                </h2>
              </div>

              <button
                aria-label="Close command sheet"
                className={styles.commandSheet__close}
                onClick={() => {
                  void requestClose();
                }}
                type="button"
              >
                Close
              </button>
            </header>

            <p className={styles.commandSheet__description} id={descriptionId}>
              {SHEET_COPY.description}
            </p>

            <label className={styles.commandSheet__field} htmlFor={inputId}>
              <span className={styles.commandSheet__label}>Input</span>
              <textarea
                className={styles.commandSheet__input}
                id={inputId}
                onChange={(event) => {
                  updateComposerValue(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !isSlashQuery
                  ) {
                    event.preventDefault();
                    void handleCapture(!isRapidLogEnabled);
                    return;
                  }

                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    isSlashQuery
                  ) {
                    event.preventDefault();

                    if (isInsertSlashQuery) {
                      const firstInsertTemplate = insertSlashTemplates?.[0];
                      if (!firstInsertTemplate) {
                        setSheetError('No templates match. Try /insert <template name>.');
                        return;
                      }
                      void handleInsertTemplate(firstInsertTemplate);
                      return;
                    }

                    if (!firstAvailableSlashCommand?.template?.id) {
                      setSheetError(
                        'Use /new <subtype> <title> with an existing template subtype.',
                      );
                      return;
                    }

                    void handleCreateFromSlashCommand(
                      firstAvailableSlashCommand.template.id,
                      firstAvailableSlashCommand.title,
                    );
                  }
                }}
                placeholder={SHEET_COPY.placeholder}
                ref={inputRef}
                rows={1}
                spellCheck={false}
                value={query}
              />
            </label>

            <div className={styles.commandSheet__body}>
              <section className={styles.commandSheet__controls}>
                <button
                  aria-pressed={isRapidLogEnabled}
                  className={`${styles.commandSheet__modeToggle} ${
                    isRapidLogEnabled
                      ? styles['commandSheet__modeToggle--active']
                      : ''
                  }`}
                  onClick={() => {
                    setIsRapidLogEnabled((currentValue) => !currentValue);
                  }}
                  type="button"
                >
                  Rapid log {isRapidLogEnabled ? 'On' : 'Off'}
                </button>

                <button
                  className={styles.commandSheet__captureButton}
                  disabled={!capturePreview || isSavingCapture || isSlashQuery}
                  onClick={() => {
                    void handleCapture(!isRapidLogEnabled);
                  }}
                  type="button"
                >
                  {isSavingCapture
                    ? 'Saving...'
                    : isRapidLogEnabled
                      ? 'Capture and Keep Open'
                      : 'Capture to Inbox'}
                </button>
              </section>

              {sheetError ? (
                <p
                  className={`${styles.commandSheet__message} ${styles['commandSheet__message--error']}`}
                  role="alert"
                >
                  {sheetError}
                </p>
              ) : null}

              {sheetStatus ? (
                <p
                  className={`${styles.commandSheet__message} ${styles['commandSheet__message--success']}`}
                  role="status"
                >
                  {sheetStatus}
                </p>
              ) : null}

              {isSlashQuery ? (
                <section className={styles.commandSheet__section}>
                  <h3 className={styles.commandSheet__sectionTitle}>
                    Slash Commands
                  </h3>

                  {isLoadingDefaultState && templateItems.length === 0 ? (
                    <div className={styles.commandSheet__skeletonList}>
                      {TEMPLATE_SKELETON_ROWS.map((rowId) => (
                        <div className={styles.commandSheet__skeletonRow} key={rowId} />
                      ))}
                    </div>
                  ) : isInsertSlashQuery ? (
                    insertSlashTemplates.length > 0 ? (
                      <ul className={styles.commandSheet__list}>
                        {insertSlashTemplates.map((templateItem) => (
                          <li
                            className={styles.commandSheet__listItem}
                            key={`insert-slash-${templateItem.id}`}
                          >
                            <button
                              className={styles.commandSheet__itemButton}
                              onClick={() => {
                                void handleInsertTemplate(templateItem);
                              }}
                              type="button"
                            >
                              <span className={styles.commandSheet__itemTitle}>
                                {`/insert `}
                                {formatTemplateLabel(templateItem)}
                              </span>
                              <span className={styles.commandSheet__itemMeta}>
                                {formatItemMeta(templateItem)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.commandSheet__emptyState}>
                        No templates match. Try <code>/insert</code> with a different name.
                      </p>
                    )
                  ) : slashCommands.length > 0 ? (
                    <ul className={styles.commandSheet__list}>
                      {slashCommands.map((slashCommand) => (
                        <li
                          className={styles.commandSheet__listItem}
                          key={slashCommand.command}
                        >
                          <button
                            className={styles.commandSheet__itemButton}
                            disabled={
                              isCreatingFromTemplate || !slashCommand.template
                            }
                            onClick={() => {
                              if (!slashCommand.template?.id) {
                                return;
                              }

                              void handleCreateFromSlashCommand(
                                slashCommand.template.id,
                                slashCommand.title,
                              );
                            }}
                            type="button"
                          >
                            <span className={styles.commandSheet__itemTitle}>
                              {slashCommand.command}
                            </span>
                            <span className={styles.commandSheet__itemMeta}>
                              {formatSlashCommandMeta(slashCommand)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.commandSheet__emptyState}>
                      Use <code>/new</code> to create from an existing template subtype.
                    </p>
                  )}
                </section>
              ) : null}

              {shouldShowCaptureState ? (
                <section className={styles.commandSheet__section}>
                  <h3 className={styles.commandSheet__sectionTitle}>
                    Quick Capture
                  </h3>
                  <p className={styles.commandSheet__previewTitle}>
                    {capturePreview.title}
                  </p>
                  <p className={styles.commandSheet__previewCopy}>
                    {capturePreview.content || 'No overflow content.'}
                  </p>
                </section>
              ) : null}

              {shouldShowSearchState ? (
                <section className={styles.commandSheet__section}>
                  <h3 className={styles.commandSheet__sectionTitle}>
                    Search Results
                  </h3>

                  {isLoadingSearchResults ? (
                    <div className={styles.commandSheet__skeletonList}>
                      {RECENT_SKELETON_ROWS.map((rowId) => (
                        <div className={styles.commandSheet__skeletonRow} key={rowId} />
                      ))}
                    </div>
                  ) : searchResults.length > 0 ? (
                    <ul className={styles.commandSheet__list}>
                      {searchResults.map((item) => (
                        <li className={styles.commandSheet__listItem} key={item.id}>
                          <button
                            className={styles.commandSheet__itemButton}
                            onClick={() => {
                              void handleOpenItem(item.id);
                            }}
                            type="button"
                          >
                            <span className={styles.commandSheet__itemTitle}>
                              {formatItemLabel(item)}
                            </span>
                            <span className={styles.commandSheet__itemMeta}>
                              {formatItemMeta(item)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.commandSheet__emptyState}>
                      No item titles match yet. Capture this text into inbox or keep
                      typing.
                    </p>
                  )}
                </section>
              ) : null}

              {shouldShowInsertTemplateState ? (
                <section className={styles.commandSheet__section}>
                  <h3 className={styles.commandSheet__sectionTitle}>
                    Insert Template
                  </h3>

                  {isLoadingDefaultState ? (
                    <div className={styles.commandSheet__skeletonList}>
                      {TEMPLATE_SKELETON_ROWS.map((rowId) => (
                        <div className={styles.commandSheet__skeletonRow} key={rowId} />
                      ))}
                    </div>
                  ) : templateItems.length > 0 ? (
                    <ul className={styles.commandSheet__list}>
                      {templateItems.map((templateItem) => (
                        <li
                          className={styles.commandSheet__listItem}
                          key={`insert-${templateItem.id}`}
                        >
                          <button
                            className={styles.commandSheet__itemButton}
                            onClick={() => {
                              handleInsertTemplate(templateItem);
                            }}
                            type="button"
                          >
                            <span className={styles.commandSheet__itemTitle}>
                              {formatTemplateLabel(templateItem)}
                            </span>
                            <span className={styles.commandSheet__itemMeta}>
                              {formatItemMeta(templateItem)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.commandSheet__emptyState}>
                      No user templates are available to insert yet.
                    </p>
                  )}
                </section>
              ) : null}

              {shouldShowDefaultState ? (
                <>
                  <section className={styles.commandSheet__section}>
                    <h3 className={styles.commandSheet__sectionTitle}>Recent</h3>

                    {isLoadingDefaultState ? (
                      <div className={styles.commandSheet__skeletonList}>
                        {RECENT_SKELETON_ROWS.map((rowId) => (
                          <div className={styles.commandSheet__skeletonRow} key={rowId} />
                        ))}
                      </div>
                    ) : recentItems.length > 0 ? (
                      <ul className={styles.commandSheet__list}>
                        {recentItems.map((item) => (
                          <li className={styles.commandSheet__listItem} key={item.id}>
                            <button
                              className={styles.commandSheet__itemButton}
                              onClick={() => {
                                void handleOpenItem(item.id);
                              }}
                              type="button"
                            >
                              <span className={styles.commandSheet__itemTitle}>
                                {formatItemLabel(item)}
                              </span>
                              <span className={styles.commandSheet__itemMeta}>
                                {formatItemMeta(item)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.commandSheet__emptyState}>
                        No recent items yet. Your next capture will land here.
                      </p>
                    )}
                  </section>

                  <section className={styles.commandSheet__section}>
                    <h3 className={styles.commandSheet__sectionTitle}>Templates</h3>

                    {isLoadingDefaultState ? (
                      <div className={styles.commandSheet__skeletonList}>
                        {TEMPLATE_SKELETON_ROWS.map((rowId) => (
                          <div className={styles.commandSheet__skeletonRow} key={rowId} />
                        ))}
                      </div>
                    ) : templateItems.length > 0 ? (
                      <ul className={styles.commandSheet__templateList}>
                        {templateItems.map((templateItem) => (
                          <li
                            className={styles.commandSheet__templateItem}
                            key={templateItem.id}
                          >
                            <span className={styles.commandSheet__templateTitle}>
                              {formatTemplateLabel(templateItem)}
                            </span>
                            <span className={styles.commandSheet__templateMeta}>
                              {formatItemMeta(templateItem)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.commandSheet__emptyState}>
                        No user templates are available yet.
                      </p>
                    )}
                  </section>
                </>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {createElement(ContextSheet, {
        isOpen: isContextSheetOpen,
        onClose: closeContextSheet,
      })}
    </div>
  );

  return createElement(CommandContext.Provider, {
    value: commandContextValue,
    children: sheetTree,
  });
}
