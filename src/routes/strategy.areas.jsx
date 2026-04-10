import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { getItemDisplayLabel } from '../lib/filenames';
import {
  createBlankArea,
  fetchStrategyAreas,
  ITEMS_REFRESH_EVENT,
} from '../lib/items';
import { authenticatedRoute } from './_authenticated';
import styles from './StrategyAreasRoute.module.css';

const SKELETON_ROWS = ['area-1', 'area-2', 'area-3'];

function formatAreaDate(value) {
  if (!value) {
    return 'No saved date';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function formatAreaLabel(item) {
  return getItemDisplayLabel(item, 'Untitled area');
}

function formatAreaMeta(item) {
  return [
    'review',
    'area',
    formatAreaDate(item.date_modified ?? item.date_created),
  ].join(' · ');
}

function formatAreaPreview(item) {
  if (item.content?.trim()) {
    return item.content.trim().split('\n').slice(0, 2).join(' ');
  }

  return 'Open this area to define its responsibility, standards, and notes.';
}

export const strategyAreasRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/strategy/areas',
  component: function StrategyAreasRoute() {
    const auth = useAuth();
    const navigate = strategyAreasRoute.useNavigate();
    const [areas, setAreas] = useState([]);
    const [createErrorMessage, setCreateErrorMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const areaSummary = useMemo(() => {
      if (areas.length === 1) {
        return '1 area';
      }

      return `${areas.length} areas`;
    }, [areas.length]);

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      async function loadAreas() {
        setIsLoading(true);
        setErrorMessage('');

        try {
          const nextAreas = await fetchStrategyAreas(auth.user.id);

          if (cancelled) {
            return;
          }

          setAreas(nextAreas);
        } catch (error) {
          if (cancelled) {
            return;
          }

          setErrorMessage(error.message ?? 'Unable to load areas right now.');
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      }

      void loadAreas();
      window.addEventListener(ITEMS_REFRESH_EVENT, loadAreas);

      return () => {
        cancelled = true;
        window.removeEventListener(ITEMS_REFRESH_EVENT, loadAreas);
      };
    }, [auth.user?.id]);

    async function handleCreateArea() {
      if (!auth.user?.id || isCreating) {
        return;
      }

      setIsCreating(true);
      setCreateErrorMessage('');

      try {
        const createdArea = await createBlankArea({
          userId: auth.user.id,
        });
        window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));

        await navigate({
          params: {
            id: createdArea.id,
          },
          to: '/items/$id',
        });
      } catch (error) {
        setCreateErrorMessage(
          error.message ?? 'Unable to create an area right now.',
        );
      } finally {
        setIsCreating(false);
      }
    }

    return (
      <section className={styles.strategyAreasRoute}>
        <header className={styles.strategyAreasRoute__header}>
          <p className={styles.strategyAreasRoute__eyebrow}>Strategy</p>
          <h1 className={styles.strategyAreasRoute__title}>Areas</h1>
          <p className={styles.strategyAreasRoute__description}>
            Keep the long-term responsibilities you manage visible, editable,
            and connected to the rest of the system.
          </p>
        </header>

        <section className={styles.strategyAreasRoute__toolbar}>
          <p className={styles.strategyAreasRoute__summary}>
            {isLoading ? 'Loading areas…' : areaSummary}
          </p>
          <button
            className={styles.strategyAreasRoute__createButton}
            disabled={isCreating}
            onClick={() => {
              void handleCreateArea();
            }}
            type="button"
          >
            {isCreating ? 'Creating area…' : 'Create Area'}
          </button>
          {createErrorMessage ? (
            <p className={styles.strategyAreasRoute__error} role="alert">
              {createErrorMessage}
            </p>
          ) : null}
        </section>

        {errorMessage ? (
          <p className={styles.strategyAreasRoute__error} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <ul className={styles.strategyAreasRoute__skeletonList}>
            {SKELETON_ROWS.map((rowId) => (
              <li
                className={styles.strategyAreasRoute__skeletonItem}
                key={rowId}
              />
            ))}
          </ul>
        ) : null}

        {!isLoading && !errorMessage && areas.length === 0 ? (
          <p className={styles.strategyAreasRoute__emptyState}>
            No areas yet. Create the first one to start giving strategy a real
            shape.
          </p>
        ) : null}

        {!isLoading && !errorMessage && areas.length > 0 ? (
          <ul className={styles.strategyAreasRoute__list}>
            {areas.map((area) => (
              <li key={area.id}>
                <button
                  className={styles.strategyAreasRoute__itemButton}
                  onClick={() => {
                    void navigate({
                      params: {
                        id: area.id,
                      },
                      to: '/items/$id',
                    });
                  }}
                  type="button"
                >
                  <span className={styles.strategyAreasRoute__itemTitle}>
                    {formatAreaLabel(area)}
                  </span>
                  <span className={styles.strategyAreasRoute__itemMeta}>
                    {formatAreaMeta(area)}
                  </span>
                  <p className={styles.strategyAreasRoute__itemPreview}>
                    {formatAreaPreview(area)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  },
});
