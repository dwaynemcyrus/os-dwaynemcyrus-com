import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { fetchUnprocessedInboxItems, ITEMS_REFRESH_EVENT } from '../lib/items';
import { useAuth } from '../lib/auth';
import { getItemDisplayLabel } from '../lib/filenames';
import { authenticatedRoute } from './_authenticated';
import styles from './InboxRoute.module.css';

function formatInboxDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatInboxPreview(item) {
  if (item.content?.trim()) return item.content.trim();
  return getItemDisplayLabel(item, 'No captured content.');
}

export const inboxRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/inbox',
  component: function InboxRoute() {
    const auth = useAuth();
    const navigate = inboxRoute.useNavigate();
    const [inboxItems, setInboxItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const countLabel = useMemo(() => {
      if (isLoading) return '';
      if (inboxItems.length === 1) return '1 unprocessed item';
      return `${inboxItems.length} unprocessed items`;
    }, [inboxItems.length, isLoading]);

    useEffect(() => {
      if (!auth.user?.id) return;

      let cancelled = false;

      setIsLoading(true);
      setErrorMessage('');

      fetchUnprocessedInboxItems(auth.user.id)
        .then((data) => {
          if (cancelled) return;
          setInboxItems(data);
        })
        .catch((error) => {
          if (cancelled) return;
          setErrorMessage(error.message ?? 'Unable to load your inbox right now.');
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoading(false);
        });

      return () => { cancelled = true; };
    }, [auth.user?.id]);

    useEffect(() => {
      function handleRefresh() {
        if (!auth.user?.id) return;
        fetchUnprocessedInboxItems(auth.user.id)
          .then(setInboxItems)
          .catch(() => {});
      }

      window.addEventListener(ITEMS_REFRESH_EVENT, handleRefresh);
      return () => window.removeEventListener(ITEMS_REFRESH_EVENT, handleRefresh);
    }, [auth.user?.id]);

    return (
      <section className={styles.inboxRoute}>
        <header className={styles.inboxRoute__header}>
          <div className={styles.inboxRoute__meta}>
            <h1 className={styles.inboxRoute__title}>Inbox</h1>
            {countLabel ? (
              <p className={styles.inboxRoute__count}>{countLabel}</p>
            ) : null}
          </div>

          {!isLoading && inboxItems.length > 0 ? (
            <button
              className={styles.inboxRoute__processButton}
              onClick={() => void navigate({ to: '/wizard/capture' })}
              type="button"
            >
              Process Inbox
            </button>
          ) : null}
        </header>

        {errorMessage ? (
          <p className={styles.inboxRoute__error} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <ul className={styles.inboxRoute__list} aria-hidden="true">
            {['a', 'b', 'c'].map((k) => (
              <li key={k} className={styles.inboxRoute__skeleton} />
            ))}
          </ul>
        ) : inboxItems.length > 0 ? (
          <ul className={styles.inboxRoute__list}>
            {inboxItems.map((item) => (
              <li key={item.id}>
                <button
                  className={styles.inboxRoute__item}
                  onClick={() =>
                    void navigate({
                      to: '/wizard/capture',
                      search: { itemId: item.id },
                    })
                  }
                  type="button"
                >
                  <span className={styles.inboxRoute__itemLabel}>
                    {getItemDisplayLabel(item, 'Untitled capture')}
                  </span>
                  <span className={styles.inboxRoute__itemPreview}>
                    {formatInboxPreview(item)}
                  </span>
                  <span className={styles.inboxRoute__itemDate}>
                    Captured {formatInboxDate(item.date_created ?? item.date_modified)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.inboxRoute__empty}>
            <p className={styles.inboxRoute__emptyTitle}>Inbox clear</p>
            <p className={styles.inboxRoute__emptyText}>
              No unprocessed captures waiting. Use the command sheet to add something new.
            </p>
          </div>
        )}
      </section>
    );
  },
});
