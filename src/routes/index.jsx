import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { fetchHomeSummary, openOrCreateDailyNote } from '../lib/items';
import styles from './HomeRoute.module.css';
import { authenticatedRoute } from './_authenticated';

function formatHomeDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  })
    .format(date)
    .toUpperCase();
}

function isMissingDailyTemplateError(error) {
  return error?.message === 'No daily template has been selected yet.';
}

function formatWorkbenchDate(value) {
  if (!value) {
    return 'No saved date';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function formatWorkbenchLabel(item) {
  if (item.title?.trim()) {
    return item.title.trim();
  }

  if (item.content?.trim()) {
    return item.content.trim().split('\n')[0];
  }

  return item.cuid;
}

function formatWorkbenchMeta(item) {
  const metaParts = [];

  if (item.type) {
    metaParts.push(item.type);
  }

  if (item.subtype) {
    metaParts.push(item.subtype.replaceAll('_', ' '));
  }

  metaParts.push(formatWorkbenchDate(item.date_modified ?? item.date_created));

  return metaParts.join(' · ');
}

export const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: function HomeRoute() {
    const auth = useAuth();
    const navigate = indexRoute.useNavigate();
    const [homeErrorMessage, setHomeErrorMessage] = useState('');
    const [homeSummary, setHomeSummary] = useState({
      inboxCount: 0,
      workbenchItems: [],
    });
    const [isLoadingHome, setIsLoadingHome] = useState(true);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [isOpeningDailyNote, setIsOpeningDailyNote] = useState(false);
    const [isWorkbenchDialogOpen, setIsWorkbenchDialogOpen] = useState(false);
    const [toastState, setToastState] = useState(null);
    const today = new Date();
    const inboxCountValue = useMemo(
      () => (isLoadingHome ? '...' : String(homeSummary.inboxCount)),
      [homeSummary.inboxCount, isLoadingHome],
    );
    const workbenchCountValue = useMemo(
      () => (isLoadingHome ? '...' : String(homeSummary.workbenchItems.length)),
      [homeSummary.workbenchItems.length, isLoadingHome],
    );

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      setIsLoadingHome(true);
      setHomeErrorMessage('');

      fetchHomeSummary(auth.user.id)
        .then((summary) => {
          if (cancelled) {
            return;
          }

          setHomeSummary(summary);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setHomeErrorMessage(
            error.message ?? 'Unable to load your home summary right now.',
          );
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setIsLoadingHome(false);
        });

      return () => {
        cancelled = true;
      };
    }, [auth.user?.id]);

    useEffect(() => {
      if (!isMoreMenuOpen && !isWorkbenchDialogOpen) {
        return undefined;
      }

      function handleKeyDown(event) {
        if (event.key === 'Escape') {
          setIsMoreMenuOpen(false);
          setIsWorkbenchDialogOpen(false);
        }
      }

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [isMoreMenuOpen, isWorkbenchDialogOpen]);

    async function handleOpenDailyNote() {
      if (!auth.user?.id) {
        setToastState({
          actionLabel: null,
          kind: 'error',
          message: 'Your session is missing a user id.',
        });
        return;
      }

      setIsOpeningDailyNote(true);
      setToastState(null);

      try {
        const dailyNoteResult = await openOrCreateDailyNote({
          date: today,
          userId: auth.user.id,
        });

        await navigate({
          params: {
            id: dailyNoteResult.item.id,
          },
          to: '/items/$id',
        });
      } catch (error) {
        if (isMissingDailyTemplateError(error)) {
          setToastState({
            actionLabel: 'Settings',
            kind: 'warning',
            message:
              'No daily template is selected yet. Choose one in settings before opening today’s note.',
          });
          return;
        }

        setToastState({
          actionLabel: null,
          kind: 'error',
          message: error.message ?? 'Unable to open today’s note right now.',
        });
      } finally {
        setIsOpeningDailyNote(false);
      }
    }

    async function handleOpenWorkbenchItem(itemId) {
      setIsWorkbenchDialogOpen(false);

      await navigate({
        params: {
          id: itemId,
        },
        to: '/items/$id',
      });
    }

    async function handleOpenSettings() {
      setIsMoreMenuOpen(false);

      await navigate({
        to: '/settings',
      });
    }

    return (
      <section className={styles.homeRoute}>
        <div className={styles.homeRoute__chrome}>
          <button
            aria-expanded={isMoreMenuOpen}
            aria-haspopup="menu"
            aria-label="More"
            className={styles.homeRoute__moreButton}
            onClick={() => {
              setIsMoreMenuOpen((currentValue) => !currentValue);
            }}
            type="button"
          >
            <span aria-hidden="true" className={styles.homeRoute__moreDots}>
              <span className={styles.homeRoute__moreDot} />
              <span className={styles.homeRoute__moreDot} />
              <span className={styles.homeRoute__moreDot} />
            </span>
          </button>

          {isMoreMenuOpen ? (
            <>
              <button
                aria-label="Close more menu"
                className={styles.homeRoute__overlayDismiss}
                onClick={() => {
                  setIsMoreMenuOpen(false);
                }}
                type="button"
              />
              <div className={styles.homeRoute__menu} role="menu">
                <button
                  className={styles.homeRoute__menuItem}
                  onClick={() => {
                    void handleOpenSettings();
                  }}
                  role="menuitem"
                  type="button"
                >
                  Settings
                </button>
              </div>
            </>
          ) : null}
        </div>

        <header className={styles.homeRoute__header}>
          <p className={styles.homeRoute__date}>{formatHomeDate(today)}</p>
          <h1 className={styles.homeRoute__title}>Now</h1>
        </header>

        {homeErrorMessage ? (
          <p className={styles.homeRoute__error} role="alert">
            {homeErrorMessage}
          </p>
        ) : null}

        <div className={styles.homeRoute__sectionList}>
          <button
            className={styles.homeRoute__row}
            disabled={isOpeningDailyNote}
            onClick={() => {
              void handleOpenDailyNote();
            }}
            type="button"
          >
            <span className={styles.homeRoute__rowLabel}>Today&apos;s Note</span>
            <span className={styles.homeRoute__rowValue}>
              {isOpeningDailyNote ? 'Opening...' : 'Open'}
            </span>
          </button>

          <button
            className={`${styles.homeRoute__row} ${styles['homeRoute__row--placeholder']}`}
            disabled
            type="button"
          >
            <span className={styles.homeRoute__rowLabel}>Focus</span>
            <span className={styles.homeRoute__rowValue}>Soon</span>
          </button>

          <button
            className={styles.homeRoute__row}
            onClick={() => {
              setIsWorkbenchDialogOpen(true);
            }}
            type="button"
          >
            <span className={styles.homeRoute__rowLabel}>Workbench</span>
            <span className={styles.homeRoute__rowValue}>{workbenchCountValue}</span>
          </button>

          <button
            className={styles.homeRoute__row}
            onClick={() => {
              void navigate({
                to: '/inbox',
              });
            }}
            type="button"
          >
            <span className={styles.homeRoute__rowLabel}>Inbox</span>
            <span className={styles.homeRoute__rowValue}>{inboxCountValue}</span>
          </button>
        </div>

        {isWorkbenchDialogOpen ? (
          <>
            <button
              aria-label="Close workbench"
              className={styles.homeRoute__dialogBackdrop}
              onClick={() => {
                setIsWorkbenchDialogOpen(false);
              }}
              type="button"
            />

            <section
              aria-modal="true"
              className={styles.homeRoute__dialog}
              role="dialog"
            >
              <header className={styles.homeRoute__dialogHeader}>
                <h2 className={styles.homeRoute__dialogTitle}>Workbench</h2>
                <button
                  className={styles.homeRoute__dialogClose}
                  onClick={() => {
                    setIsWorkbenchDialogOpen(false);
                  }}
                  type="button"
                >
                  Close
                </button>
              </header>

              {homeSummary.workbenchItems.length > 0 ? (
                <ul className={styles.homeRoute__dialogList}>
                  {homeSummary.workbenchItems.map((item) => (
                    <li key={item.id}>
                      <button
                        className={styles.homeRoute__dialogItem}
                        onClick={() => {
                          void handleOpenWorkbenchItem(item.id);
                        }}
                        type="button"
                      >
                        <span className={styles.homeRoute__dialogItemTitle}>
                          {formatWorkbenchLabel(item)}
                        </span>
                        <span className={styles.homeRoute__dialogItemMeta}>
                          {formatWorkbenchMeta(item)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.homeRoute__dialogEmpty}>
                  No items are on the workbench yet.
                </p>
              )}
            </section>
          </>
        ) : null}

        {toastState ? (
          <div
            className={styles.homeRoute__toast}
            role={toastState.kind === 'error' ? 'alert' : 'status'}
          >
            <p className={styles.homeRoute__toastMessage}>{toastState.message}</p>

            <div className={styles.homeRoute__toastActions}>
              {toastState.actionLabel ? (
                <button
                  className={styles.homeRoute__toastButton}
                  onClick={() => {
                    setToastState(null);
                    void handleOpenSettings();
                  }}
                  type="button"
                >
                  {toastState.actionLabel}
                </button>
              ) : null}

              <button
                className={styles.homeRoute__toastButton}
                onClick={() => {
                  setToastState(null);
                }}
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </section>
    );
  },
});
