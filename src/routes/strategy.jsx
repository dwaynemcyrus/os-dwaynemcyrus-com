import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';
import styles from './OverviewRoute.module.css';

const STRATEGY_ROWS = [
  'Current Cycle',
  {
    id: 'areas',
    label: 'Arenas / Areas',
    meta: 'Open the list of areas and create a new one.',
    to: '/strategy/areas',
  },
  'Reviews',
  'Weekly Plans',
  'Archive',
  'Scorecard',
];

export const strategyRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/strategy',
  component: function StrategyRoute() {
    const navigate = strategyRoute.useNavigate();

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
          {STRATEGY_ROWS.map((row) => {
            if (typeof row === 'string') {
              return (
                <li key={row}>
                  <div className={styles.overviewRoute__item}>
                    <span className={styles.overviewRoute__content}>
                      <span className={styles.overviewRoute__label}>{row}</span>
                      <span className={styles.overviewRoute__meta}>
                        Placeholder destination for this strategy view.
                      </span>
                    </span>
                    <span className={styles.overviewRoute__badge}>Soon</span>
                  </div>
                </li>
              );
            }

            return (
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
            );
          })}
        </ul>
      </section>
    );
  },
});
