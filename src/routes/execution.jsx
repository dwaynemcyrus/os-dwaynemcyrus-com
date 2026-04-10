import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';
import styles from './OverviewRoute.module.css';

const EXECUTION_ROWS = [
  {
    id: 'today',
    label: 'Today',
    meta: 'Tasks you have moved into focus for today.',
    to: '/execution/today',
  },
  {
    id: 'upcoming',
    label: 'Upcoming',
    meta: 'Backlog tasks with a scheduled start date.',
    to: '/execution/upcoming',
  },
  {
    id: 'backlog',
    label: 'Backlog',
    meta: 'All unscheduled tasks waiting to be worked on.',
    to: '/execution/backlog',
  },
  {
    id: 'someday',
    label: 'Someday',
    meta: 'Ideas and tasks with no immediate commitment.',
    to: '/execution/someday',
  },
  {
    id: 'logbook',
    label: 'Logbook',
    meta: 'Completed tasks and closed projects.',
    to: '/execution/logbook',
  },
];

export const executionRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/execution',
  component: function ExecutionRoute() {
    const navigate = executionRoute.useNavigate();

    return (
      <section className={styles.overviewRoute}>
        <header className={styles.overviewRoute__header}>
          <p className={styles.overviewRoute__eyebrow}>Overview</p>
          <h1 className={styles.overviewRoute__title}>Execution</h1>
          <p className={styles.overviewRoute__description}>
            Hold the active work, upcoming queue, and operational lists in one
            place.
          </p>
        </header>

        <ul className={styles.overviewRoute__list}>
          {EXECUTION_ROWS.map((row) => (
            <li key={row.id}>
              <button
                className={`${styles.overviewRoute__item} ${styles['overviewRoute__item--link']}`}
                onClick={() => {
                  void navigate({ to: row.to });
                }}
                type="button"
              >
                <span className={styles.overviewRoute__content}>
                  <span className={styles.overviewRoute__label}>{row.label}</span>
                  <span className={styles.overviewRoute__meta}>{row.meta}</span>
                </span>
                <span aria-hidden="true" className={styles.overviewRoute__trail}>
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  },
});
