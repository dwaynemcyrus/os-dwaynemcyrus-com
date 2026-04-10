import { createElement, useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { AppDialog } from '../components/ui/AppDialog';
import { useAuth } from '../lib/auth';
import { useAppChrome } from '../lib/app-chrome';
import { ITEMS_REFRESH_EVENT } from '../lib/items';
import {
  createSourceDirectly,
  detectSourceType,
  enrichSourceWithMetadata,
  fetchSourcesIndex,
  isLikelyUrl,
  normalizeUrl,
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

const SOURCE_TYPE_OPTIONS = Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

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

    // Add source dialog
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addUrl, setAddUrl] = useState('');
    const [addType, setAddType] = useState('article');
    const [addTitle, setAddTitle] = useState('');
    const [addAuthor, setAddAuthor] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState('');
    const [addStatusMessage, setAddStatusMessage] = useState('');

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

    useAppChrome(useMemo(() => ({
      moreActions: [
        {
          id: 'add-source',
          label: 'Add Source',
          onSelect() {
            setAddUrl('');
            setAddType('article');
            setAddTitle('');
            setAddAuthor('');
            setAddError('');
            setIsAddOpen(true);
          },
        },
      ],
    }), []));

    useEffect(() => {
      if (!addStatusMessage) return;
      const id = window.setTimeout(() => setAddStatusMessage(''), 3000);
      return () => window.clearTimeout(id);
    }, [addStatusMessage]);

    async function handleAddSource(event) {
      event.preventDefault();

      const trimmedUrl = addUrl.trim();
      const trimmedTitle = addTitle.trim();

      if (!trimmedUrl && !trimmedTitle) {
        setAddError('Enter a URL or a title.');
        return;
      }

      if (trimmedUrl && !isLikelyUrl(trimmedUrl) && !normalizeUrl(trimmedUrl)) {
        setAddError('That doesn\'t look like a valid URL.');
        return;
      }

      if (!auth.user?.id) {
        setAddError('Your session is missing a user id.');
        return;
      }

      setIsAdding(true);
      setAddError('');

      try {
        const { sourceId, duplicate } = await createSourceDirectly({
          author: addAuthor,
          sourceType: addType,
          title: trimmedTitle,
          url: trimmedUrl,
          userId: auth.user.id,
        });

        if (!duplicate && trimmedUrl) {
          enrichSourceWithMetadata(sourceId, auth.user.id, trimmedUrl).catch(() => {});
        }

        window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
        setIsAddOpen(false);

        if (duplicate === 'existing') {
          setAddStatusMessage('Already in your sources.');
          void navigate({ to: '/sources/$id', params: { id: sourceId } });
        } else if (duplicate === 'archived') {
          setAddStatusMessage('Source moved back to inbox.');
          void navigate({ to: '/sources/$id', params: { id: sourceId } });
        } else {
          setAddStatusMessage('Source added.');
        }
      } catch (error) {
        setAddError(error.message ?? 'Unable to add this source right now.');
      } finally {
        setIsAdding(false);
      }
    }

    const emptyMessages = {
      inbox: 'No sources in your inbox yet. Use Capture Review to process captures.',
      reading: 'Nothing marked as reading yet.',
      archive: 'No archived sources yet.',
    };

    const showTitleField = addType === 'book' || !addUrl.trim();
    const showAuthorField = addType === 'book';

    return (
      <section className={styles.sourcesFilterRoute}>
        <header className={styles.sourcesFilterRoute__header}>
          <p className={styles.sourcesFilterRoute__eyebrow}>Sources</p>
          <h1 className={styles.sourcesFilterRoute__title}>{label}</h1>
        </header>

        {addStatusMessage ? (
          <p className={styles.sourcesFilterRoute__status} role="status">
            {addStatusMessage}
          </p>
        ) : null}

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
        {isAddOpen ? createElement(
          AppDialog,
          {
            ariaLabel: 'Close add source',
            onClose() {
              if (!isAdding) setIsAddOpen(false);
            },
            role: 'dialog',
          },
          <>
            <header style={{ display: 'grid', gap: '0.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Add Source</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                Paste a URL or enter details for a book or other material.
              </p>
            </header>

            <form
              onSubmit={(e) => { void handleAddSource(e); }}
              style={{ display: 'grid', gap: '1rem' }}
            >
              <label style={{ display: 'grid', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                <span>URL</span>
                <input
                  autoFocus
                  className={styles.sourcesFilterRoute__input}
                  disabled={isAdding}
                  inputMode="url"
                  onChange={(e) => {
                    const val = e.target.value;
                    setAddUrl(val);
                    setAddError('');
                    if (val.trim()) {
                      setAddType(detectSourceType(val.trim()));
                    }
                  }}
                  placeholder="https://…"
                  type="text"
                  value={addUrl}
                />
              </label>

              <fieldset style={{ border: 'none', display: 'grid', gap: '0.5rem', margin: 0, padding: 0 }}>
                <legend style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem', padding: 0 }}>Type</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {SOURCE_TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={[
                        styles.sourcesFilterRoute__typeChip,
                        addType === opt.value ? styles['sourcesFilterRoute__typeChip--active'] : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <input
                        checked={addType === opt.value}
                        disabled={isAdding}
                        name="source-type"
                        onChange={() => setAddType(opt.value)}
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                        type="radio"
                        value={opt.value}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {showTitleField ? (
                <label style={{ display: 'grid', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  <span>Title{addType === 'book' ? '' : ' (optional)'}</span>
                  <input
                    className={styles.sourcesFilterRoute__input}
                    disabled={isAdding}
                    onChange={(e) => { setAddTitle(e.target.value); setAddError(''); }}
                    placeholder={addType === 'book' ? 'Book title' : 'Title'}
                    type="text"
                    value={addTitle}
                  />
                </label>
              ) : null}

              {showAuthorField ? (
                <label style={{ display: 'grid', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  <span>Author (optional)</span>
                  <input
                    className={styles.sourcesFilterRoute__input}
                    disabled={isAdding}
                    onChange={(e) => setAddAuthor(e.target.value)}
                    placeholder="Author name"
                    type="text"
                    value={addAuthor}
                  />
                </label>
              ) : null}

              {addError ? (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem', margin: 0 }} role="alert">
                  {addError}
                </p>
              ) : null}

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <button
                  className={styles.sourcesFilterRoute__actionButton}
                  disabled={isAdding}
                  type="submit"
                >
                  {isAdding ? 'Adding…' : 'Add Source'}
                </button>
                <button
                  className={styles.sourcesFilterRoute__secondaryButton}
                  disabled={isAdding}
                  onClick={() => setIsAddOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>,
        ) : null}
      </section>
    );
  },
});
