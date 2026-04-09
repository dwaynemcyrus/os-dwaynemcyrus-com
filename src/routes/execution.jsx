import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';
import styles from './OverviewRoute.module.css';

const EXECUTION_ROWS = [
  'Today',
  'Upcoming',
  'Backlog',
  'Someday',
  'Logbook',
];

export const executionRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/execution',
  component: function ExecutionRoute() {
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
          {EXECUTION_ROWS.map((label) => (
            <li key={label}>
              <div className={styles.overviewRoute__item}>
                <span className={styles.overviewRoute__content}>
                  <span className={styles.overviewRoute__label}>{label}</span>
                  <span className={styles.overviewRoute__meta}>
                    Placeholder destination for this execution view.
                  </span>
                </span>
                <span className={styles.overviewRoute__badge}>Soon</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  },
});
