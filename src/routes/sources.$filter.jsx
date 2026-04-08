import { useEffect, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { ITEMS_REFRESH_EVENT } from '../lib/items';
import {
  fetchSourcesIndex,
  SOURCE_FILTER_LABELS,
  SOURCE_TYPE_LABELS,
} from '../lib/sources';
import { authenticatedRoute } from './_authenticated';
import styles from './SourcesFilterRoute.module.css';

const SKELETON_ROWS = ['s-1', 's-2', 's-3', 's-4'];

function formatSourceDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getSiteLabel(item) {
  if (item.site_name) return item.site_name;
  if (item.url) {
    try {
      return new URL(item.url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }
  return '';
}

export const sourcesFilterRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/sources/$filter',
  component: function SourcesFilterRoute() {
    const auth = useAuth();
    const navigate = sourcesFilterRoute.useNavigate();
    const { filter } = sourcesFilterRoute.useParams();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const label = SOURCE_FILTER_LABELS[filter] ?? filter;

    useEffect(() => {
      if (!auth.user?.id) return;

      const validFilters = ['inbox', 'reading', 'archive'];

      if (!validFilters.includes(filter)) {
        void navigate({ to: '/sources/$filter', params: { filter: 'inbox' }, replace: true });
        return;
      }

      let cancelled = false;

      function loadSources() {
        setIsLoading(true);
        setErrorMessage('');
        setItems([]);

        fetchSourcesIndex({ filter, userId: auth.user.id })
          .then((data) => {
            if (cancelled) return;
            setItems(data);
          })
          .catch((error) => {
            if (cancelled) return;
            setErrorMessage(error.message ?? 'Unable to load sources right now.');
          })
          .finally(() => {
            if (cancelled) return;
            setIsLoading(false);
          });
      }

      loadSources();
      window.addEventListener(ITEMS_REFRESH_EVENT, loadSources);

      return () => {
        cancelled = true;
        window.removeEventListener(ITEMS_REFRESH_EVENT, loadSources);
      };
    }, [auth.user?.id, filter, navigate]);

    const emptyMessages = {
      inbox: 'No sources in your inbox yet. Use Capture Review to process captures.',
      reading: 'Nothing marked as reading yet.',
      archive: 'No archived sources yet.',
    };

    return (
      <section className={styles.sourcesFilterRoute}>
        <header className={styles.sourcesFilterRoute__header}>
          <p className={styles.sourcesFilterRoute__eyebrow}>Sources</p>
          <h1 className={styles.sourcesFilterRoute__title}>{label}</h1>
        </header>

        {errorMessage ? (
          <p className={styles.sourcesFilterRoute__error} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <ul aria-hidden="true" className={styles.sourcesFilterRoute__skeletonList}>
            {SKELETON_ROWS.map((id) => (
              <li className={styles.sourcesFilterRoute__skeletonCard} key={id} />
            ))}
          </ul>
        ) : !errorMessage && items.length === 0 ? (
          <p className={styles.sourcesFilterRoute__empty}>
            {emptyMessages[filter] ?? 'No sources here yet.'}
          </p>
        ) : (
          <ul className={styles.sourcesFilterRoute__list}>
            {items.map((item) => {
              const typeLabel = SOURCE_TYPE_LABELS[item.source_type] ?? item.source_type ?? '';
              const dateLabel = formatSourceDate(item.date_modified ?? item.date_created);
              const displayTitle = item.title || item.url || 'Untitled source';
              const siteLabel = getSiteLabel(item);

              return (
                <li key={item.id}>
                  <button
                    className={styles.sourceCard}
                    onClick={() => {
                      void navigate({ to: '/sources/$id', params: { id: item.id } });
                    }}
                    type="button"
                  >
                    {item.cover_link ? (
                      <div className={styles.sourceCard__thumbnail}>
                        <img
                          alt=""
                          className={styles.sourceCard__thumbnailImg}
                          loading="lazy"
                          src={item.cover_link}
                        />
                      </div>
                    ) : (
                      <div className={styles.sourceCard__thumbnailPlaceholder} />
                    )}
                    <div className={styles.sourceCard__body}>
                      <div className={styles.sourceCard__source}>
                        {item.favicon_url ? (
                          <img
                            alt=""
                            className={styles.sourceCard__favicon}
                            height={14}
                            loading="lazy"
                            src={item.favicon_url}
                            width={14}
                          />
                        ) : null}
                        {siteLabel ? (
                          <span className={styles.sourceCard__siteName}>{siteLabel}</span>
                        ) : null}
                      </div>
                      <p className={styles.sourceCard__title}>{displayTitle}</p>
                      <div className={styles.sourceCard__meta}>
                        {typeLabel ? (
                          <span className={styles.sourceCard__typeBadge}>{typeLabel}</span>
                        ) : null}
                        <span className={styles.sourceCard__date}>{dateLabel}</span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  },
});
