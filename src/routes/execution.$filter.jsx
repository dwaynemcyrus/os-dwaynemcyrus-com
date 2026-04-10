import { createElement, useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { AppDialog } from '../components/ui/AppDialog';
import { useAuth } from '../lib/auth';
import { useAppChrome } from '../lib/app-chrome';
import { ITEMS_REFRESH_EVENT } from '../lib/items';
import {
  createTask,
  fetchTasksIndex,
  TASK_FILTER_LABELS,
  TASK_SUBTYPE_LABELS,
  TASK_STATUS_LABELS,
} from '../lib/tasks';
import { authenticatedRoute } from './_authenticated';
import styles from './ExecutionFilterRoute.module.css';

const SKELETON_ROWS = ['t-1', 't-2', 't-3', 't-4'];

function formatTaskDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

const SUBTYPE_OPTIONS = Object.entries(TASK_SUBTYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const executionFilterRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/execution/$filter',
  component: function ExecutionFilterRoute() {
    const auth = useAuth();
    const navigate = executionFilterRoute.useNavigate();
    const { filter } = executionFilterRoute.useParams();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    // Add task dialog
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addTitle, setAddTitle] = useState('');
    const [addSubtype, setAddSubtype] = useState('task');
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState('');
    const [addStatusMessage, setAddStatusMessage] = useState('');

    const label = TASK_FILTER_LABELS[filter] ?? filter;

    useEffect(() => {
      if (!auth.user?.id) return;

      const validFilters = ['today', 'upcoming', 'backlog', 'someday', 'logbook'];

      if (!validFilters.includes(filter)) {
        void navigate({ to: '/execution/$filter', params: { filter: 'today' }, replace: true });
        return;
      }

      let cancelled = false;

      function loadTasks() {
        setIsLoading(true);
        setErrorMessage('');
        setItems([]);

        fetchTasksIndex({ filter, userId: auth.user.id })
          .then((data) => {
            if (cancelled) return;
            setItems(data);
          })
          .catch((error) => {
            if (cancelled) return;
            setErrorMessage(error.message ?? 'Unable to load tasks right now.');
          })
          .finally(() => {
            if (cancelled) return;
            setIsLoading(false);
          });
      }

      loadTasks();
      window.addEventListener(ITEMS_REFRESH_EVENT, loadTasks);

      return () => {
        cancelled = true;
        window.removeEventListener(ITEMS_REFRESH_EVENT, loadTasks);
      };
    }, [auth.user?.id, filter, navigate]);

    useAppChrome(useMemo(() => ({
      moreActions: [
        {
          id: 'add-task',
          label: 'Add Task',
          onSelect() {
            setAddTitle('');
            setAddSubtype('task');
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

    async function handleAddTask(event) {
      event.preventDefault();

      const trimmedTitle = addTitle.trim();

      if (!trimmedTitle) {
        setAddError('Enter a title.');
        return;
      }

      if (!auth.user?.id) {
        setAddError('Your session is missing a user id.');
        return;
      }

      setIsAdding(true);
      setAddError('');

      try {
        const { taskId } = await createTask({
          subtype: addSubtype,
          title: trimmedTitle,
          userId: auth.user.id,
        });

        window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
        setIsAddOpen(false);
        setAddStatusMessage(`${TASK_SUBTYPE_LABELS[addSubtype]} added.`);
        void navigate({ to: '/execution/$id', params: { id: taskId } });
      } catch (error) {
        setAddError(error.message ?? 'Unable to add this task right now.');
      } finally {
        setIsAdding(false);
      }
    }

    const emptyMessages = {
      today: 'Nothing scheduled for today. Move tasks here to work on them.',
      upcoming: 'No upcoming tasks. Set a start date on a backlog task to see it here.',
      backlog: 'Your backlog is clear.',
      someday: 'No someday tasks yet.',
      logbook: 'No completed tasks yet.',
    };

    return (
      <section className={styles.executionFilterRoute}>
        <header className={styles.executionFilterRoute__header}>
          <p className={styles.executionFilterRoute__eyebrow}>Execution</p>
          <h1 className={styles.executionFilterRoute__title}>{label}</h1>
        </header>

        {addStatusMessage ? (
          <p className={styles.executionFilterRoute__status} role="status">
            {addStatusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className={styles.executionFilterRoute__error} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <ul aria-hidden="true" className={styles.executionFilterRoute__skeletonList}>
            {SKELETON_ROWS.map((id) => (
              <li className={styles.executionFilterRoute__skeletonRow} key={id} />
            ))}
          </ul>
        ) : !errorMessage && items.length === 0 ? (
          <p className={styles.executionFilterRoute__empty}>
            {emptyMessages[filter] ?? 'Nothing here yet.'}
          </p>
        ) : (
          <ul className={styles.executionFilterRoute__list}>
            {items.map((item) => {
              const subtypeLabel = TASK_SUBTYPE_LABELS[item.subtype] ?? item.subtype ?? '';
              const statusLabel = TASK_STATUS_LABELS[item.status] ?? item.status ?? '';
              const dateLabel = formatTaskDate(item.date_start ?? item.date_modified ?? item.date_created);

              return (
                <li key={item.id}>
                  <button
                    className={styles.taskRow}
                    onClick={() => {
                      void navigate({ to: '/execution/$id', params: { id: item.id } });
                    }}
                    type="button"
                  >
                    <p className={styles.taskRow__title}>{item.title || 'Untitled task'}</p>
                    <div className={styles.taskRow__meta}>
                      {subtypeLabel ? (
                        <span className={styles.taskRow__subtypeBadge}>{subtypeLabel}</span>
                      ) : null}
                      {filter === 'logbook' && statusLabel ? (
                        <span className={styles.taskRow__subtypeBadge}>{statusLabel}</span>
                      ) : null}
                      {item.area ? (
                        <span className={styles.taskRow__area}>{item.area}</span>
                      ) : null}
                      {dateLabel ? (
                        <span className={styles.taskRow__date}>{dateLabel}</span>
                      ) : null}
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
            ariaLabel: 'Close add task',
            onClose() {
              if (!isAdding) setIsAddOpen(false);
            },
            role: 'dialog',
          },
          <>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Add Task</h2>

            <form
              onSubmit={(e) => { void handleAddTask(e); }}
              style={{ display: 'grid', gap: '1rem' }}
            >
              <label style={{ display: 'grid', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                <span>Title</span>
                <input
                  autoFocus
                  className={styles.executionFilterRoute__input}
                  disabled={isAdding}
                  onChange={(e) => { setAddTitle(e.target.value); setAddError(''); }}
                  placeholder="Task title"
                  type="text"
                  value={addTitle}
                />
              </label>

              <fieldset style={{ border: 'none', display: 'grid', gap: '0.5rem', margin: 0, padding: 0 }}>
                <legend style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem', padding: 0 }}>Type</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {SUBTYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={[
                        styles.executionFilterRoute__typeChip,
                        addSubtype === opt.value ? styles['executionFilterRoute__typeChip--active'] : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <input
                        checked={addSubtype === opt.value}
                        disabled={isAdding}
                        name="task-subtype"
                        onChange={() => setAddSubtype(opt.value)}
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                        type="radio"
                        value={opt.value}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {addError ? (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem', margin: 0 }} role="alert">
                  {addError}
                </p>
              ) : null}

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <button
                  className={styles.executionFilterRoute__actionButton}
                  disabled={isAdding}
                  type="submit"
                >
                  {isAdding ? 'Adding…' : 'Add Task'}
                </button>
                <button
                  className={styles.executionFilterRoute__secondaryButton}
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
