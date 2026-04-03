import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { fetchUnprocessedInboxItems } from '../lib/items';
import { useAuth } from '../lib/auth';
import { authenticatedRoute } from './_authenticated';

function formatInboxDate(value) {
  if (!value) {
    return 'No capture date';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatInboxPreview(item) {
  if (item.content?.trim()) {
    return item.content.trim();
  }

  if (item.title?.trim()) {
    return item.title.trim();
  }

  return 'No captured content yet.';
}

export const inboxRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/inbox',
  component: function InboxRoute() {
    const auth = useAuth();
    const navigate = inboxRoute.useNavigate();
    const [inboxItems, setInboxItems] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const inboxCountLabel = useMemo(() => {
      if (inboxItems.length === 1) {
        return '1 unprocessed item';
      }

      return `${inboxItems.length} unprocessed items`;
    }, [inboxItems.length]);

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      setIsLoading(true);
      setErrorMessage('');

      fetchUnprocessedInboxItems(auth.user.id)
        .then((items) => {
          if (cancelled) {
            return;
          }

          setInboxItems(items);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setErrorMessage(
            error.message ?? 'Unable to load your inbox right now.',
          );
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [auth.user?.id]);

    return (
      <section
        style={{
          display: 'grid',
          gap: '1rem',
          maxWidth: '56rem',
        }}
      >
        <header
          style={{
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <h1 style={{ margin: 0 }}>Inbox</h1>
          <p style={{ margin: 0 }}>
            Review captured items before assigning a real type and moving them
            into backlog.
          </p>
          <p
            style={{
              color: '#52606d',
              fontSize: '0.95rem',
              margin: 0,
            }}
          >
            {isLoading ? 'Loading inbox...' : inboxCountLabel}
          </p>
        </header>

        {errorMessage ? (
          <p
            role="alert"
            style={{
              background: 'rgba(186, 73, 73, 0.1)',
              borderRadius: '1rem',
              color: '#8f2d2d',
              margin: 0,
              padding: '1rem',
            }}
          >
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <div
            aria-hidden="true"
            style={{
              display: 'grid',
              gap: '0.875rem',
            }}
          >
            {['inbox-skeleton-1', 'inbox-skeleton-2', 'inbox-skeleton-3'].map(
              (rowId) => (
                <div
                  key={rowId}
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(220, 211, 200, 0.5) 0%, rgba(245, 241, 236, 0.9) 50%, rgba(220, 211, 200, 0.5) 100%)',
                    backgroundSize: '200% 100%',
                    borderRadius: '1rem',
                    height: '6rem',
                  }}
                />
              ),
            )}
          </div>
        ) : inboxItems.length > 0 ? (
          <ul
            style={{
              display: 'grid',
              gap: '0.875rem',
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {inboxItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    void navigate({
                      search: {
                        itemId: item.id,
                      },
                      to: '/inbox',
                    });
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.82)',
                    border: '1px solid rgba(82, 96, 109, 0.12)',
                    borderRadius: '1rem',
                    color: 'inherit',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: '0.5rem',
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
                    {item.title || 'Untitled inbox item'}
                  </span>
                  <span
                    style={{
                      color: '#52606d',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {formatInboxPreview(item)}
                  </span>
                  <span
                    style={{
                      color: '#7c6754',
                      fontSize: '0.9rem',
                    }}
                  >
                    Captured {formatInboxDate(item.date_created ?? item.date_modified)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <section
            style={{
              background: 'rgba(255, 255, 255, 0.76)',
              border: '1px solid rgba(82, 96, 109, 0.1)',
              borderRadius: '1rem',
              padding: '1.25rem',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                margin: '0 0 0.5rem',
              }}
            >
              Inbox Clear
            </h2>
            <p
              style={{
                color: '#52606d',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              No unprocessed captures are waiting right now. Use the command
              sheet to capture something new.
            </p>
          </section>
        )}
      </section>
    );
  },
});
