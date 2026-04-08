import { createElement, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { useAppChrome } from '../lib/app-chrome';
import { ITEMS_REFRESH_EVENT } from '../lib/items';
import {
  fetchSourceById,
  SOURCE_TYPE_LABELS,
  updateSourceStatus,
  trashSource,
} from '../lib/sources';
import { ItemEditorScreen } from '../components/editor/ItemEditorScreen';
import { authenticatedRoute } from './_authenticated';
import styles from './SourcesIdRoute.module.css';

function formatSourceDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

const STATUS_ACTIONS = {
  backlog: [
    { id: 'active', label: 'Move to Reading' },
    { id: 'archived', label: 'Archive' },
  ],
  active: [
    { id: 'backlog', label: 'Move to Inbox' },
    { id: 'archived', label: 'Archive' },
  ],
  archived: [
    { id: 'backlog', label: 'Move to Inbox' },
    { id: 'active', label: 'Move to Reading' },
  ],
};

export const sourcesIdRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/sources/$id',
  component: function SourcesIdRoute() {
    const auth = useAuth();
    const navigate = sourcesIdRoute.useNavigate();
    const { id } = sourcesIdRoute.useParams();
    const [source, setSource] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const handleToggleEdit = useEffectEvent(() => {
      setIsEditMode((v) => !v);
    });

    const handleTrashAction = useEffectEvent(async () => {
      if (!auth.user?.id) return;
      try {
        await trashSource(id, auth.user.id);
        await navigate({ to: '/sources/$filter', params: { filter: 'inbox' } });
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to move source to trash.');
      }
    });

    const moreActions = useMemo(() => [
      {
        id: 'edit',
        label: 'Edit',
        onSelect() {
          handleToggleEdit();
        },
      },
      {
        id: 'trash',
        label: 'Move to Trash',
        onSelect() {
          void handleTrashAction();
        },
      },
    ], [handleToggleEdit, handleTrashAction]);

    useAppChrome(
      useMemo(
        () => ({
          metaText: source?.site_name ?? source?.title ?? '',
          moreActions,
        }),
        [source?.site_name, source?.title, moreActions],
      ),
    );

    useEffect(() => {
      if (!auth.user?.id) return;

      let cancelled = false;

      function loadSource() {
        setIsLoading(true);
        setErrorMessage('');

        fetchSourceById(id, auth.user.id)
          .then((data) => {
            if (cancelled) return;
            setSource(data);
          })
          .catch((error) => {
            if (cancelled) return;
            setErrorMessage(error.message ?? 'Unable to load this source right now.');
          })
          .finally(() => {
            if (cancelled) return;
            setIsLoading(false);
          });
      }

      loadSource();
      window.addEventListener(ITEMS_REFRESH_EVENT, loadSource);

      return () => {
        cancelled = true;
        window.removeEventListener(ITEMS_REFRESH_EVENT, loadSource);
      };
    }, [auth.user?.id, id]);

    useEffect(() => {
      if (!statusMessage) return;
      const t = window.setTimeout(() => setStatusMessage(''), 3000);
      return () => window.clearTimeout(t);
    }, [statusMessage]);

    async function handleStatusChange(nextStatus) {
      if (!auth.user?.id || !source) return;

      setIsUpdatingStatus(true);
      setErrorMessage('');

      try {
        const updated = await updateSourceStatus(id, auth.user.id, nextStatus);
        setSource((prev) => ({ ...prev, ...updated }));

        if (nextStatus === 'backlog' && source.archived_at) {
          setStatusMessage('This source was already archived. Moved it back to inbox.');
        }
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to update status.');
      } finally {
        setIsUpdatingStatus(false);
      }
    }

    if (isEditMode && source) {
      return createElement(
        'div',
        { className: styles.sourcesIdRoute__editorWrap },
        createElement(ItemEditorScreen, { itemId: id, editorKind: 'source' }),
      );
    }

    if (isLoading) {
      return (
        <div className={styles.sourcesIdRoute}>
          <div className={styles.sourcesIdRoute__skeleton} />
        </div>
      );
    }

    if (errorMessage && !source) {
      return (
        <div className={styles.sourcesIdRoute}>
          <p className={styles.sourcesIdRoute__error} role="alert">
            {errorMessage}
          </p>
        </div>
      );
    }

    if (!source) {
      return (
        <div className={styles.sourcesIdRoute}>
          <p className={styles.sourcesIdRoute__error}>Source not found.</p>
        </div>
      );
    }

    const typeLabel = SOURCE_TYPE_LABELS[source.source_type] ?? source.source_type ?? '';
    const displayTitle = source.title || source.url || 'Untitled source';
    const dateLabel = formatSourceDate(source.date_modified ?? source.date_created);

    return (
      <article className={styles.sourcesIdRoute}>
        {statusMessage ? (
          <p className={styles.sourcesIdRoute__statusMessage} role="status">
            {statusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className={styles.sourcesIdRoute__error} role="alert">
            {errorMessage}
          </p>
        ) : null}

        <header className={styles.sourcesIdRoute__header}>
          <div className={styles.sourcesIdRoute__sourceRow}>
            {source.favicon_url ? (
              <img
                alt=""
                className={styles.sourcesIdRoute__favicon}
                height={16}
                loading="lazy"
                src={source.favicon_url}
                width={16}
              />
            ) : null}
            <span className={styles.sourcesIdRoute__siteName}>
              {source.site_name || (source.url
                ? new URL(source.url).hostname.replace(/^www\./, '')
                : 'Unknown source')}
            </span>
          </div>

          <h1 className={styles.sourcesIdRoute__title}>{displayTitle}</h1>

          <div className={styles.sourcesIdRoute__badges}>
            {typeLabel ? (
              <span className={styles.sourcesIdRoute__typeBadge}>{typeLabel}</span>
            ) : null}
            {source.status ? (
              <span className={styles.sourcesIdRoute__statusBadge}>
                {source.status}
              </span>
            ) : null}
            <span className={styles.sourcesIdRoute__date}>{dateLabel}</span>
          </div>
        </header>

        {source.description ? (
          <p className={styles.sourcesIdRoute__description}>{source.description}</p>
        ) : null}

        {source.author ? (
          <p className={styles.sourcesIdRoute__author}>By {source.author}</p>
        ) : null}

        {source.url ? (
          <a
            className={styles.sourcesIdRoute__openUrl}
            href={source.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open Source
          </a>
        ) : null}

        <div className={styles.sourcesIdRoute__actions}>
          {(STATUS_ACTIONS[source.status] ?? []).map((action) => (
            <button
              className={styles.sourcesIdRoute__actionButton}
              disabled={isUpdatingStatus}
              key={action.id}
              onClick={() => void handleStatusChange(action.id)}
              type="button"
            >
              {action.label}
            </button>
          ))}
          <button
            className={styles.sourcesIdRoute__actionButton}
            onClick={() => setIsEditMode(true)}
            type="button"
          >
            Edit
          </button>
        </div>
      </article>
    );
  },
});
