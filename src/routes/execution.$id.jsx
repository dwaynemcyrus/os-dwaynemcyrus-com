import { createElement, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { useAppChrome } from '../lib/app-chrome';
import { ITEMS_REFRESH_EVENT } from '../lib/items';
import {
  fetchTaskById,
  TASK_STATUS_ACTIONS,
  TASK_STATUS_LABELS,
  TASK_SUBTYPE_LABELS,
  trashTask,
  updateTaskStatus,
} from '../lib/tasks';
import { ItemEditorScreen } from '../components/editor/ItemEditorScreen';
import { authenticatedRoute } from './_authenticated';
import styles from './ExecutionIdRoute.module.css';

function formatTaskDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export const executionIdRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/execution/$id',
  component: function ExecutionIdRoute() {
    const auth = useAuth();
    const navigate = executionIdRoute.useNavigate();
    const { id } = executionIdRoute.useParams();
    const [task, setTask] = useState(null);
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
        await trashTask(id, auth.user.id);
        await navigate({ to: '/execution/$filter', params: { filter: 'backlog' } });
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to move task to trash.');
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
          metaText: task?.title ?? '',
          moreActions,
        }),
        [task?.title, moreActions],
      ),
    );

    useEffect(() => {
      if (!auth.user?.id) return;

      let cancelled = false;

      function loadTask() {
        setIsLoading(true);
        setErrorMessage('');

        fetchTaskById(id, auth.user.id)
          .then((data) => {
            if (cancelled) return;
            setTask(data);
          })
          .catch((error) => {
            if (cancelled) return;
            setErrorMessage(error.message ?? 'Unable to load this task right now.');
          })
          .finally(() => {
            if (cancelled) return;
            setIsLoading(false);
          });
      }

      loadTask();
      window.addEventListener(ITEMS_REFRESH_EVENT, loadTask);

      return () => {
        cancelled = true;
        window.removeEventListener(ITEMS_REFRESH_EVENT, loadTask);
      };
    }, [auth.user?.id, id]);

    useEffect(() => {
      if (!statusMessage) return;
      const t = window.setTimeout(() => setStatusMessage(''), 3000);
      return () => window.clearTimeout(t);
    }, [statusMessage]);

    async function handleStatusChange(nextStatus) {
      if (!auth.user?.id || !task) return;

      setIsUpdatingStatus(true);
      setErrorMessage('');

      try {
        const updated = await updateTaskStatus(id, auth.user.id, nextStatus);
        setTask((prev) => ({ ...prev, ...updated }));
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to update status.');
      } finally {
        setIsUpdatingStatus(false);
      }
    }

    if (isEditMode && task) {
      return createElement(
        'div',
        { className: styles.executionIdRoute__editorWrap },
        createElement(ItemEditorScreen, { itemId: id }),
      );
    }

    if (isLoading) {
      return (
        <div className={styles.executionIdRoute}>
          <div className={styles.executionIdRoute__skeleton} />
        </div>
      );
    }

    if (errorMessage && !task) {
      return (
        <div className={styles.executionIdRoute}>
          <p className={styles.executionIdRoute__error} role="alert">
            {errorMessage}
          </p>
        </div>
      );
    }

    if (!task) {
      return (
        <div className={styles.executionIdRoute}>
          <p className={styles.executionIdRoute__error}>Task not found.</p>
        </div>
      );
    }

    const subtypeLabel = TASK_SUBTYPE_LABELS[task.subtype] ?? task.subtype ?? '';
    const statusLabel = TASK_STATUS_LABELS[task.status] ?? task.status ?? '';
    const displayTitle = task.title || 'Untitled task';
    const dateStartLabel = formatTaskDate(task.date_start);
    const dateEndLabel = formatTaskDate(task.date_end);

    return (
      <article className={styles.executionIdRoute}>
        {statusMessage ? (
          <p className={styles.executionIdRoute__statusMessage} role="status">
            {statusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className={styles.executionIdRoute__error} role="alert">
            {errorMessage}
          </p>
        ) : null}

        <header className={styles.executionIdRoute__header}>
          <h1 className={styles.executionIdRoute__title}>{displayTitle}</h1>

          <div className={styles.executionIdRoute__badges}>
            {subtypeLabel ? (
              <span className={styles.executionIdRoute__badge}>{subtypeLabel}</span>
            ) : null}
            {statusLabel ? (
              <span className={styles.executionIdRoute__badge}>{statusLabel}</span>
            ) : null}
          </div>
        </header>

        {(task.area || task.project || dateStartLabel || dateEndLabel || task.blocked) ? (
          <div className={styles.executionIdRoute__meta}>
            {task.area ? (
              <div className={styles.executionIdRoute__metaRow}>
                <span className={styles.executionIdRoute__metaLabel}>Area</span>
                <span className={styles.executionIdRoute__metaValue}>{task.area}</span>
              </div>
            ) : null}
            {task.project ? (
              <div className={styles.executionIdRoute__metaRow}>
                <span className={styles.executionIdRoute__metaLabel}>Project</span>
                <span className={styles.executionIdRoute__metaValue}>{task.project}</span>
              </div>
            ) : null}
            {dateStartLabel ? (
              <div className={styles.executionIdRoute__metaRow}>
                <span className={styles.executionIdRoute__metaLabel}>Start</span>
                <span className={styles.executionIdRoute__metaValue}>{dateStartLabel}</span>
              </div>
            ) : null}
            {dateEndLabel ? (
              <div className={styles.executionIdRoute__metaRow}>
                <span className={styles.executionIdRoute__metaLabel}>Due</span>
                <span className={styles.executionIdRoute__metaValue}>{dateEndLabel}</span>
              </div>
            ) : null}
            {task.blocked ? (
              <div className={styles.executionIdRoute__metaRow}>
                <span className={styles.executionIdRoute__metaLabel}>Blocked</span>
                <span className={styles.executionIdRoute__metaValue}>{task.blocked}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={styles.executionIdRoute__actions}>
          {(TASK_STATUS_ACTIONS[task.status] ?? []).map((action) => (
            <button
              className={[
                styles.executionIdRoute__actionButton,
                action.id === 'done' ? styles['executionIdRoute__actionButton--primary'] : '',
              ].filter(Boolean).join(' ')}
              disabled={isUpdatingStatus}
              key={action.id}
              onClick={() => void handleStatusChange(action.id)}
              type="button"
            >
              {action.label}
            </button>
          ))}
          <button
            className={styles.executionIdRoute__actionButton}
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
