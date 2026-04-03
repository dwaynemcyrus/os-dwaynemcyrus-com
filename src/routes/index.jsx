import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { fetchHomeSummary, openOrCreateDailyNote } from '../lib/items';
import { authenticatedRoute } from './_authenticated';

function formatHomeDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }).format(date);
}

function isMissingDailyTemplateError(error) {
  return error?.message === 'No daily template has been selected yet.';
}

function formatInboxCountLabel(inboxCount) {
  if (inboxCount === 1) {
    return '1 item needs review';
  }

  return `${inboxCount} items need review`;
}

function formatWorkbenchCountLabel(workbenchCount) {
  if (workbenchCount === 1) {
    return '1 workbench item';
  }

  return `${workbenchCount} workbench items`;
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
    const [isOpeningDailyNote, setIsOpeningDailyNote] = useState(false);
    const [toastState, setToastState] = useState(null);
    const today = new Date();
    const inboxCountLabel = useMemo(
      () => formatInboxCountLabel(homeSummary.inboxCount),
      [homeSummary.inboxCount],
    );
    const workbenchCountLabel = useMemo(
      () => formatWorkbenchCountLabel(homeSummary.workbenchItems.length),
      [homeSummary.workbenchItems.length],
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
            actionLabel: 'Choose Template',
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
      await navigate({
        params: {
          id: itemId,
        },
        to: '/items/$id',
      });
    }

    return (
      <section
        style={{
          display: 'grid',
          gap: '1rem',
          maxWidth: '64rem',
        }}
      >
        <section
          style={{
            background:
              'radial-gradient(circle at top, rgba(233, 217, 193, 0.7), transparent 36%), linear-gradient(180deg, #f7f3ec 0%, #efe6d7 100%)',
            border: '1px solid rgba(104, 85, 63, 0.14)',
            borderRadius: '1.25rem',
            boxShadow: '0 24px 60px rgba(84, 61, 37, 0.08)',
            display: 'grid',
            gap: '1rem',
            padding: '1.5rem',
          }}
        >
          <header
            style={{
              display: 'grid',
              gap: '0.5rem',
            }}
          >
            <p
              style={{
                color: '#7c6754',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Personal OS
            </p>
            <h1
              style={{
                fontSize: '2.2rem',
                lineHeight: 1.05,
                margin: 0,
              }}
            >
              Open Today&apos;s Note
            </h1>
            <p
              style={{
                color: '#52606d',
                fontSize: '1rem',
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {formatHomeDate(today)}
            </p>
          </header>

          <p
            style={{
              color: '#243b53',
              lineHeight: 1.6,
              margin: 0,
              maxWidth: '38rem',
            }}
          >
            Open the existing daily note for your local calendar date, or create
            it from your selected daily template when it does not exist yet.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <button
              disabled={isOpeningDailyNote}
              onClick={() => {
                void handleOpenDailyNote();
              }}
              style={{
                background: isOpeningDailyNote
                  ? 'rgba(82, 96, 109, 0.18)'
                  : 'linear-gradient(135deg, #2f6f51 0%, #25543d 100%)',
                border: 'none',
                borderRadius: '0.95rem',
                color: isOpeningDailyNote ? '#52606d' : '#f8fafc',
                cursor: isOpeningDailyNote ? 'wait' : 'pointer',
                font: 'inherit',
                fontSize: '1rem',
                fontWeight: 700,
                minHeight: '3.25rem',
                minWidth: '13rem',
                padding: '0 1.4rem',
              }}
              type="button"
            >
              {isOpeningDailyNote ? 'Opening...' : 'Open Today’s Note'}
            </button>

            <button
              onClick={() => {
                void navigate({
                  to: '/settings',
                });
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                border: '1px solid rgba(82, 96, 109, 0.18)',
                borderRadius: '0.95rem',
                color: '#243b53',
                cursor: 'pointer',
                font: 'inherit',
                fontWeight: 700,
                minHeight: '3.25rem',
                minWidth: '10rem',
                padding: '0 1.25rem',
              }}
              type="button"
            >
              Settings
            </button>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
          }}
        >
          <section
            style={{
              background: 'rgba(255, 252, 247, 0.92)',
              border: '1px solid rgba(104, 85, 63, 0.14)',
              borderRadius: '1.1rem',
              boxShadow: '0 18px 44px rgba(84, 61, 37, 0.06)',
              display: 'grid',
              gap: '0.75rem',
              padding: '1.25rem',
            }}
          >
            <p
              style={{
                color: '#7c6754',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Inbox
            </p>
            <h2
              style={{
                fontSize: '1.5rem',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              {isLoadingHome ? 'Loading...' : inboxCountLabel}
            </h2>
            <p
              style={{
                color: '#52606d',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Review unprocessed captures before assigning a real type and
              moving them into backlog.
            </p>
            <button
              onClick={() => {
                void navigate({
                  to: '/inbox',
                });
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                border: '1px solid rgba(82, 96, 109, 0.18)',
                borderRadius: '0.9rem',
                color: '#243b53',
                cursor: 'pointer',
                font: 'inherit',
                fontWeight: 700,
                justifySelf: 'start',
                minHeight: '3rem',
                padding: '0 1rem',
              }}
              type="button"
            >
              Open Inbox
            </button>
          </section>

          <section
            style={{
              background: 'rgba(255, 252, 247, 0.92)',
              border: '1px solid rgba(104, 85, 63, 0.14)',
              borderRadius: '1.1rem',
              boxShadow: '0 18px 44px rgba(84, 61, 37, 0.06)',
              display: 'grid',
              gap: '0.75rem',
              padding: '1.25rem',
            }}
          >
            <p
              style={{
                color: '#7c6754',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Workbench
            </p>
            <h2
              style={{
                fontSize: '1.5rem',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              {isLoadingHome ? 'Loading...' : workbenchCountLabel}
            </h2>
            <p
              style={{
                color: '#52606d',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Surface the items you are actively shaping, revising, or reviewing
              most often.
            </p>
          </section>
        </section>

        <section
          style={{
            background: 'rgba(255, 252, 247, 0.94)',
            border: '1px solid rgba(104, 85, 63, 0.14)',
            borderRadius: '1.15rem',
            boxShadow: '0 24px 60px rgba(84, 61, 37, 0.08)',
            display: 'grid',
            gap: '1rem',
            padding: '1.4rem',
          }}
        >
          <header
            style={{
              display: 'grid',
              gap: '0.45rem',
            }}
          >
            <p
              style={{
                color: '#7c6754',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Workbench
            </p>
            <h2
              style={{
                fontSize: '1.6rem',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Active Items
            </h2>
            <p
              style={{
                color: '#52606d',
                lineHeight: 1.55,
                margin: 0,
                maxWidth: '40rem',
              }}
            >
              The 12 most recently modified workbench items stay close to the
              home surface so you can jump back into ongoing work quickly.
            </p>
          </header>

          {homeErrorMessage ? (
            <p
              role="alert"
              style={{
                background: 'rgba(255, 248, 248, 0.98)',
                border: '1px solid rgba(186, 73, 73, 0.18)',
                borderRadius: '0.95rem',
                color: '#8f2d2d',
                lineHeight: 1.5,
                margin: 0,
                padding: '0.9rem 1rem',
              }}
            >
              {homeErrorMessage}
            </p>
          ) : null}

          {isLoadingHome ? (
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              {[0, 1, 2].map((skeletonRow) => (
                <div
                  key={skeletonRow}
                  style={{
                    background: 'rgba(240, 231, 218, 0.88)',
                    borderRadius: '1rem',
                    minHeight: '4.5rem',
                  }}
                />
              ))}
            </div>
          ) : homeSummary.workbenchItems.length > 0 ? (
            <ul
              style={{
                display: 'grid',
                gap: '0.75rem',
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              {homeSummary.workbenchItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      void handleOpenWorkbenchItem(item.id);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.82)',
                      border: '1px solid rgba(82, 96, 109, 0.12)',
                      borderRadius: '1rem',
                      color: '#243b53',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: '0.45rem',
                      padding: '1rem',
                      textAlign: 'left',
                      width: '100%',
                    }}
                    type="button"
                  >
                    <span
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                      }}
                    >
                      {formatWorkbenchLabel(item)}
                    </span>
                    <span
                      style={{
                        color: '#7c6754',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {formatWorkbenchMeta(item)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p
              style={{
                color: '#52606d',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              No items are pinned to the workbench yet. Toggle workbench on any
              item in the editor to keep it visible here.
            </p>
          )}
        </section>

        {toastState ? (
          <div
            role={toastState.kind === 'error' ? 'alert' : 'status'}
            style={{
              background:
                toastState.kind === 'warning'
                  ? 'rgba(255, 247, 237, 0.98)'
                  : 'rgba(255, 248, 248, 0.98)',
              border:
                toastState.kind === 'warning'
                  ? '1px solid rgba(191, 131, 45, 0.24)'
                  : '1px solid rgba(186, 73, 73, 0.18)',
              borderRadius: '1rem',
              bottom: 'calc(7.5rem + env(safe-area-inset-bottom))',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.12)',
              color:
                toastState.kind === 'warning' ? '#7c4a03' : '#8f2d2d',
              display: 'grid',
              gap: '0.75rem',
              maxWidth: '26rem',
              padding: '1rem',
              position: 'fixed',
              right: '1.25rem',
              width: 'calc(100vw - 2.5rem)',
              zIndex: 20,
            }}
          >
            <p
              style={{
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {toastState.message}
            </p>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'end',
              }}
            >
              {toastState.actionLabel ? (
                <button
                  onClick={() => {
                    setToastState(null);
                    void navigate({
                      to: '/settings',
                    });
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.88)',
                    border: '1px solid rgba(124, 74, 3, 0.18)',
                    borderRadius: '0.75rem',
                    color: 'inherit',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontWeight: 700,
                    minHeight: '2.75rem',
                    padding: '0 1rem',
                  }}
                  type="button"
                >
                  {toastState.actionLabel}
                </button>
              ) : null}

              <button
                onClick={() => {
                  setToastState(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontWeight: 700,
                  minHeight: '2.75rem',
                  padding: '0 0.5rem',
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
