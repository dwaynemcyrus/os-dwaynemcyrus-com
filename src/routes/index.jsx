import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { openOrCreateDailyNote } from '../lib/items';
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

export const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: function HomeRoute() {
    const auth = useAuth();
    const navigate = indexRoute.useNavigate();
    const [isOpeningDailyNote, setIsOpeningDailyNote] = useState(false);
    const [toastState, setToastState] = useState(null);
    const today = new Date();

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

    return (
      <section
        style={{
          display: 'grid',
          gap: '1rem',
          maxWidth: '48rem',
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
              bottom: '1.25rem',
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
