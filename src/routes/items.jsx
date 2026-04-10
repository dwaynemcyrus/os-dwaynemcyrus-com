import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { getItemDisplayLabel } from '../lib/filenames';
import { fetchItemsFilters, fetchItemsIndex, ITEMS_REFRESH_EVENT } from '../lib/items';
import styles from './ItemsRoute.module.css';
import { authenticatedRoute } from './_authenticated';

const SKELETON_ROWS = ['item-1', 'item-2', 'item-3'];

function formatSubtypeLabel(value) {
  return value.replaceAll('_', ' ');
}

function formatItemLabel(item) {
  return getItemDisplayLabel(item);
}

function formatItemPreview(item) {
  if (item.content?.trim()) {
    return item.content.trim().split('\n').slice(0, 2).join(' ');
  }

  return 'Open this item in the editor to continue shaping it.';
}

function formatItemDate(value) {
  if (!value) {
    return 'No saved date';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function formatItemMeta(item) {
  const metaParts = [];

  if (item.type) {
    metaParts.push(item.type);
  }

  if (item.subtype) {
    metaParts.push(formatSubtypeLabel(item.subtype));
  }

  if (item.workbench) {
    metaParts.push('workbench');
  }

  metaParts.push(formatItemDate(item.date_modified ?? item.date_created));

  return metaParts.join(' · ');
}

function formatItemsSummary(itemsLength, selectedSort) {
  const sortLabels = {
    date_created: 'recently created',
    date_modified: 'recently modified',
    title: 'title',
  };
  const itemLabel = itemsLength === 1 ? 'item' : 'items';

  return `${itemsLength} ${itemLabel} shown, sorted by ${
    sortLabels[selectedSort] ?? sortLabels.date_modified
  }.`;
}

export const itemsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/items',
  component: function ItemsRoute() {
    const auth = useAuth();
    const navigate = itemsRoute.useNavigate();
    const [errorMessage, setErrorMessage] = useState('');
    const [filterOptions, setFilterOptions] = useState({
      subtypeOptions: [],
      typeOptions: [],
    });
    const [items, setItems] = useState([]);
    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [query, setQuery] = useState('');
    const [selectedSort, setSelectedSort] = useState('date_modified');
    const [selectedSubtype, setSelectedSubtype] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const deferredQuery = useDeferredValue(query);
    const normalizedQuery = deferredQuery.trim();
    const availableSubtypeOptions = useMemo(
      () =>
        filterOptions.subtypeOptions.filter((option) =>
          selectedType ? option.type === selectedType : true,
        ),
      [filterOptions.subtypeOptions, selectedType],
    );
    const activeFilterCount = useMemo(() => {
      let nextCount = 0;

      if (normalizedQuery) {
        nextCount += 1;
      }

      if (selectedType) {
        nextCount += 1;
      }

      if (selectedSubtype) {
        nextCount += 1;
      }

      if (selectedSort !== 'date_modified') {
        nextCount += 1;
      }

      return nextCount;
    }, [normalizedQuery, selectedSort, selectedSubtype, selectedType]);
    const itemsSummary = useMemo(
      () => formatItemsSummary(items.length, selectedSort),
      [items.length, selectedSort],
    );

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      setIsLoadingFilters(true);

      fetchItemsFilters(auth.user.id)
        .then((nextFilterOptions) => {
          if (cancelled) {
            return;
          }

          setFilterOptions(nextFilterOptions);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setErrorMessage(
            error.message ?? 'Unable to load item filters right now.',
          );
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setIsLoadingFilters(false);
        });

      return () => {
        cancelled = true;
      };
    }, [auth.user?.id]);

    useEffect(() => {
      if (
        selectedSubtype &&
        !availableSubtypeOptions.some(
          (option) => option.subtype === selectedSubtype,
        )
      ) {
        setSelectedSubtype('');
      }
    }, [availableSubtypeOptions, selectedSubtype]);

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      function loadItems() {
        setIsLoadingItems(true);
        setErrorMessage('');

        fetchItemsIndex({
          query: normalizedQuery,
          sort: selectedSort,
          subtype: selectedSubtype,
          type: selectedType,
          userId: auth.user.id,
        })
          .then((nextItems) => {
            if (cancelled) {
              return;
            }

            setItems(nextItems);
          })
          .catch((error) => {
            if (cancelled) {
              return;
            }

            setErrorMessage(
              error.message ?? 'Unable to load items right now.',
            );
          })
          .finally(() => {
            if (cancelled) {
              return;
            }

            setIsLoadingItems(false);
          });
      }

      loadItems();
      window.addEventListener(ITEMS_REFRESH_EVENT, loadItems);

      return () => {
        cancelled = true;
        window.removeEventListener(ITEMS_REFRESH_EVENT, loadItems);
      };
    }, [auth.user?.id, normalizedQuery, selectedSort, selectedSubtype, selectedType]);

    return (
      <section className={styles.itemsRoute}>
        <section className={styles.itemsRoute__hero}>
          <header className={styles.itemsRoute__heroHeader}>
            <p className={styles.itemsRoute__eyebrow}>Library</p>
            <h1 className={styles.itemsRoute__title}>Browse All Items</h1>
            <p className={styles.itemsRoute__description}>
              Search your item library, narrow it by type and subtype, and sort
              it by the view that best matches the work you are doing.
            </p>
          </header>

          <div className={styles.itemsRoute__toolbar}>
            <label className={styles.itemsRoute__searchField}>
              <span className={styles.itemsRoute__label}>Search</span>
              <input
                className={styles.itemsRoute__input}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                placeholder="Search titles and body content"
                type="search"
                value={query}
              />
            </label>

            <div className={styles.itemsRoute__filterGrid}>
              <label className={styles.itemsRoute__searchField}>
                <span className={styles.itemsRoute__label}>Type</span>
                <select
                  className={styles.itemsRoute__select}
                  disabled={isLoadingFilters}
                  onChange={(event) => {
                    setSelectedType(event.target.value);
                  }}
                  value={selectedType}
                >
                  <option value="">All types</option>
                  {filterOptions.typeOptions.map((typeOption) => (
                    <option key={typeOption} value={typeOption}>
                      {typeOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.itemsRoute__searchField}>
                <span className={styles.itemsRoute__label}>Subtype</span>
                <select
                  className={styles.itemsRoute__select}
                  disabled={isLoadingFilters || availableSubtypeOptions.length === 0}
                  onChange={(event) => {
                    setSelectedSubtype(event.target.value);
                  }}
                  value={selectedSubtype}
                >
                  <option value="">All subtypes</option>
                  {availableSubtypeOptions.map((option) => (
                    <option key={`${option.type}-${option.subtype}`} value={option.subtype}>
                      {formatSubtypeLabel(option.subtype)}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.itemsRoute__searchField}>
                <span className={styles.itemsRoute__label}>Sort</span>
                <select
                  className={styles.itemsRoute__select}
                  onChange={(event) => {
                    setSelectedSort(event.target.value);
                  }}
                  value={selectedSort}
                >
                  <option value="date_modified">Recently modified</option>
                  <option value="date_created">Recently created</option>
                  <option value="title">Title A-Z</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className={styles.itemsRoute__panel}>
          <header className={styles.itemsRoute__panelHeader}>
            <p className={styles.itemsRoute__eyebrow}>Items</p>
            <h2 className={styles.itemsRoute__panelTitle}>Item Results</h2>
          </header>

          <div className={styles.itemsRoute__summaryRow}>
            <p className={styles.itemsRoute__summary}>
              {isLoadingItems ? 'Loading items...' : itemsSummary}
            </p>

            {activeFilterCount > 0 ? (
              <span className={styles.itemsRoute__chip}>
                {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
              </span>
            ) : null}
          </div>

          {errorMessage ? (
            <p className={styles.itemsRoute__error} role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isLoadingItems ? (
            <div className={styles.itemsRoute__skeletonList}>
              {SKELETON_ROWS.map((rowId) => (
                <div className={styles.itemsRoute__skeletonRow} key={rowId} />
              ))}
            </div>
          ) : items.length > 0 ? (
            <ul className={styles.itemsRoute__list}>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    className={styles.itemsRoute__itemButton}
                    onClick={() => {
                      void navigate({
                        params: {
                          id: item.id,
                        },
                        to: '/items/$id',
                      });
                    }}
                    type="button"
                  >
                    <span className={styles.itemsRoute__itemTitle}>
                      {formatItemLabel(item)}
                    </span>
                    <span className={styles.itemsRoute__itemMeta}>
                      {formatItemMeta(item)}
                    </span>
                    <p className={styles.itemsRoute__itemPreview}>
                      {formatItemPreview(item)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.itemsRoute__emptyState}>
              No items match the current filters yet. Try broadening the search,
              clearing a subtype, or creating a new item from the capture sheet or palette.
            </p>
          )}
        </section>
      </section>
    );
  },
});
