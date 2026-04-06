import {
  createElement,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react';
import { createRoute } from '@tanstack/react-router';
import { AppDialog } from '../components/ui/AppDialog';
import { useAuth } from '../lib/auth';
import { useAppChrome } from '../lib/app-chrome';
import { getItemDisplayLabel } from '../lib/filenames';
import {
  fetchHomeSummary,
  HOME_WORKBENCH_LIMIT,
  openOrCreateDailyNote,
} from '../lib/items';
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
  return getItemDisplayLabel(item);
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
      hasTodayDailyNote: false,
      inboxCount: 0,
      workbenchItems: [],
    });
    const [isDailyTemplateDialogOpen, setIsDailyTemplateDialogOpen] =
      useState(false);
    const [isLoadingHome, setIsLoadingHome] = useState(true);
    const [isOpeningDailyNote, setIsOpeningDailyNote] = useState(false);
    const [isWorkbenchDialogOpen, setIsWorkbenchDialogOpen] = useState(false);
    const today = useMemo(() => new Date(), []);
    const homeDateLabel = useMemo(() => formatHomeDate(today), [today]);
    const inboxCountValue = useMemo(
      () => (isLoadingHome ? '...' : String(homeSummary.inboxCount)),
      [homeSummary.inboxCount, isLoadingHome],
    );
    const workbenchCountValue = useMemo(
      () =>
        isLoadingHome
          ? '...'
          : `${homeSummary.workbenchItems.length}/${HOME_WORKBENCH_LIMIT}`,
      [homeSummary.workbenchItems.length, isLoadingHome],
    );
    const dailyNoteLabel = homeSummary.hasTodayDailyNote
      ? 'Open Today’s Note'
      : 'Create Today’s Note';

    const openSettings = useEffectEvent(async () => {
      await navigate({
        to: '/settings',
      });
    });

    useAppChrome(useMemo(() => ({
      metaText: homeDateLabel,
      moreActions: [
        {
          id: 'settings',
          label: 'Settings',
          onSelect() {
            void openSettings();
          },
        },
      ],
    }), [homeDateLabel, openSettings]));

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
      if (!isWorkbenchDialogOpen && !isDailyTemplateDialogOpen) {
        return undefined;
      }

      function handleKeyDown(event) {
        if (event.key === 'Escape') {
          setIsDailyTemplateDialogOpen(false);
          setIsWorkbenchDialogOpen(false);
        }
      }

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [isDailyTemplateDialogOpen, isWorkbenchDialogOpen]);

    async function handleOpenDailyNote() {
      if (!auth.user?.id) {
        setHomeErrorMessage('Your session is missing a user id.');
        return;
      }

      setIsOpeningDailyNote(true);
      setHomeErrorMessage('');
      setIsDailyTemplateDialogOpen(false);

      try {
        const dailyNoteResult = await openOrCreateDailyNote({
          date: today,
          userId: auth.user.id,
        });

        setHomeSummary((currentSummary) => ({
          ...currentSummary,
          hasTodayDailyNote: true,
        }));

        await navigate({
          params: {
            id: dailyNoteResult.item.id,
          },
          to: '/items/$id',
        });
      } catch (error) {
        if (isMissingDailyTemplateError(error)) {
          setIsDailyTemplateDialogOpen(true);
          return;
        }

        setHomeErrorMessage(
          error.message ?? 'Unable to open today’s note right now.',
        );
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

    async function handleOpenDailyNoteSettings() {
      setIsDailyTemplateDialogOpen(false);

      await navigate({
        to: '/settings/daily-note',
      });
    }

    return (
      <section className={styles.homeRoute}>
        <header className={styles.homeRoute__header}>
          <p className={styles.homeRoute__date}>{homeDateLabel}</p>
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
            <span className={styles.homeRoute__rowLabel}>{dailyNoteLabel}</span>
            <span className={styles.homeRoute__rowValue}>
              {isOpeningDailyNote ? 'Opening...' : ''}
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
          createElement(
            AppDialog,
            {
              ariaLabel: 'Close workbench',
              onClose: () => {
                setIsWorkbenchDialogOpen(false);
              },
              panelClassName: styles.homeRoute__dialog,
            },
            <>
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
            </>,
          )
        ) : null}

        {isDailyTemplateDialogOpen ? (
          createElement(
            AppDialog,
            {
              ariaLabel: 'Close daily note template dialog',
              onClose: () => {
                setIsDailyTemplateDialogOpen(false);
              },
              panelClassName: styles.homeRoute__dialog,
              role: 'alertdialog',
            },
            <>
              <p className={styles.homeRoute__dialogMessage}>
                No daily template is selected yet. Choose one in settings before
                opening today&apos;s note.
              </p>

              <div className={styles.homeRoute__dialogActions}>
                <button
                  className={styles.homeRoute__dialogButton}
                  onClick={() => {
                    setIsDailyTemplateDialogOpen(false);
                  }}
                  type="button"
                >
                  Dismiss
                </button>
                <button
                  className={styles.homeRoute__dialogButton}
                  onClick={() => {
                    void handleOpenDailyNoteSettings();
                  }}
                  type="button"
                >
                  Settings
                </button>
              </div>
            </>,
          )
        ) : null}
      </section>
    );
  },
});
