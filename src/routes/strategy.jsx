import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';
import styles from './OverviewRoute.module.css';

const STRATEGY_ROWS = [
  'Current Cycle',
  'Arenas / Areas',
  'Reviews',
  'Weekly Plans',
  'Archive',
  'Scorecard',
];

export const strategyRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/strategy',
  component: function StrategyRoute() {
    return (
      <section className={styles.overviewRoute}>
        <header className={styles.overviewRoute__header}>
          <p className={styles.overviewRoute__eyebrow}>Overview</p>
          <h1 className={styles.overviewRoute__title}>Strategy</h1>
          <p className={styles.overviewRoute__description}>
            Shape direction, review the current cycle, and keep the long view
            visible.
          </p>
        </header>

        <ul className={styles.overviewRoute__list}>
          {STRATEGY_ROWS.map((label) => (
            <li key={label}>
              <div className={styles.overviewRoute__item}>
                <span className={styles.overviewRoute__content}>
                  <span className={styles.overviewRoute__label}>{label}</span>
                  <span className={styles.overviewRoute__meta}>
                    Placeholder destination for this strategy view.
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
