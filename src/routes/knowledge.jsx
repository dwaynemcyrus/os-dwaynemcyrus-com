import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';
import styles from './OverviewRoute.module.css';

const KNOWLEDGE_ROWS = [
  {
    id: 'notes',
    label: 'Notes',
    meta: 'Browse all notes, then narrow by todo, today, or pinned.',
    to: '/notes',
  },
  {
    id: 'sources',
    label: 'Sources',
    meta: 'Open the sources inbox, reading list, and archive.',
    to: '/sources',
  },
];

export const knowledgeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/knowledge',
  component: function KnowledgeRoute() {
    const navigate = knowledgeRoute.useNavigate();

    return (
      <section className={styles.overviewRoute}>
        <header className={styles.overviewRoute__header}>
          <p className={styles.overviewRoute__eyebrow}>Overview</p>
          <h1 className={styles.overviewRoute__title}>Knowledge</h1>
          <p className={styles.overviewRoute__description}>
            Read, connect, and revisit the material you want to keep close.
          </p>
        </header>

        <ul className={styles.overviewRoute__list}>
          {KNOWLEDGE_ROWS.map((row) => (
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
