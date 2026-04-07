import { useEffect, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { getItemDisplayLabel } from '../lib/filenames';
import { fetchNotesIndex } from '../lib/items';
import { authenticatedRoute } from './_authenticated';
import styles from './NotesRoute.module.css';

const SKELETON_ROWS = ['n-1', 'n-2', 'n-3'];

function formatMeta(item) {
  const parts = [];

  if (item.type) parts.push(item.type);
  if (item.subtype) parts.push(item.subtype.replaceAll('_', ' '));

  return parts.join(' · ');
}

export const notesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/notes',
  component: function NotesRoute() {
    const auth = useAuth();
    const navigate = notesRoute.useNavigate();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
      if (!auth.user?.id) return;

      let cancelled = false;

      setIsLoading(true);
      setErrorMessage('');

      fetchNotesIndex({ filter: null, userId: auth.user.id })
        .then((data) => {
          if (cancelled) return;
          setItems(data);
        })
        .catch((error) => {
          if (cancelled) return;
          setErrorMessage(error.message ?? 'Unable to load notes right now.');
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [auth.user?.id]);

    return (
      <section className={styles.notesRoute}>
        <header className={styles.notesRoute__header}>
          <p className={styles.notesRoute__eyebrow}>Notes</p>
          <h1 className={styles.notesRoute__title}>All Notes</h1>
        </header>

        {errorMessage ? (
          <p className={styles.notesRoute__error} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <ul aria-hidden="true" className={styles.notesRoute__skeletonList}>
            {SKELETON_ROWS.map((id) => (
              <li className={styles.notesRoute__skeletonRow} key={id} />
            ))}
          </ul>
        ) : !errorMessage && items.length === 0 ? (
          <p className={styles.notesRoute__empty}>No notes yet.</p>
        ) : (
          <ul className={styles.notesRoute__list}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  className={styles.notesRoute__itemButton}
                  onClick={() => {
                    void navigate({ to: '/items/$id', params: { id: item.id } });
                  }}
                  type="button"
                >
                  <span className={styles.notesRoute__itemTitle}>
                    {getItemDisplayLabel(item)}
                  </span>
                  <span className={styles.notesRoute__itemMeta}>
                    {formatMeta(item)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  },
});
