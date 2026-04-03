import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { fetchTrashedItems } from '../lib/items';
import styles from './TrashRoute.module.css';
import { authenticatedRoute } from './_authenticated';

const SKELETON_ROWS = ['trash-1', 'trash-2', 'trash-3'];

function formatItemLabel(item) {
  if (item.title?.trim()) {
    return item.title.trim();
  }

  if (item.content?.trim()) {
    return item.content.trim().split('\n')[0];
  }

  return item.cuid;
}

function formatPreview(item) {
  if (item.content?.trim()) {
    return item.content.trim().split('\n').slice(0, 2).join(' ');
  }

  return 'No body content was saved for this item.';
}

function formatTrashDate(value) {
  if (!value) {
    return 'No trash date';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatItemMeta(item) {
  const metaParts = [];

  if (item.type) {
    metaParts.push(item.type);
  }

  if (item.subtype) {
    metaParts.push(item.subtype.replaceAll('_', ' '));
  }

  metaParts.push(`trashed ${formatTrashDate(item.date_trashed)}`);

  return metaParts.join(' · ');
}

function formatTrashCountLabel(itemCount) {
  if (itemCount === 1) {
    return '1 item in trash';
  }

  return `${itemCount} items in trash`;
}

export const trashRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/trash',
  component: function TrashRoute() {
    const auth = useAuth();
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [trashedItems, setTrashedItems] = useState([]);
    const trashCountLabel = useMemo(
      () => formatTrashCountLabel(trashedItems.length),
      [trashedItems.length],
    );
    const selectedItem =
      trashedItems.find((item) => item.id === selectedItemId) ?? null;

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      setIsLoading(true);
      setErrorMessage('');

      fetchTrashedItems(auth.user.id)
        .then((items) => {
          if (cancelled) {
            return;
          }

          setTrashedItems(items);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setErrorMessage(error.message ?? 'Unable to load trash right now.');
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [auth.user?.id]);

    useEffect(() => {
      if (!trashedItems.length) {
        setSelectedItemId('');
        return;
      }

      setSelectedItemId((currentItemId) => {
        if (currentItemId && trashedItems.some((item) => item.id === currentItemId)) {
          return currentItemId;
        }

        return trashedItems[0].id;
      });
    }, [trashedItems]);

    return (
      <section className={styles.trashRoute}>
        <section className={styles.trashRoute__hero}>
          <p className={styles.trashRoute__eyebrow}>Workspace</p>
          <h1 className={styles.trashRoute__title}>Trash</h1>
          <p className={styles.trashRoute__description}>
            Trashed items stay hidden from active views. Review what was
            discarded here before restoring it or deleting it permanently.
          </p>
        </section>

        <div className={styles.trashRoute__layout}>
          <section className={styles.trashRoute__panel}>
            <header className={styles.trashRoute__panelHeader}>
              <p className={styles.trashRoute__eyebrow}>Discarded</p>
              <h2 className={styles.trashRoute__panelTitle}>Trashed Items</h2>
              <p className={styles.trashRoute__summary}>
                {isLoading ? 'Loading trash...' : trashCountLabel}
              </p>
            </header>

            {errorMessage ? (
              <p className={styles.trashRoute__error} role="alert">
                {errorMessage}
              </p>
            ) : null}

            {isLoading ? (
              <div className={styles.trashRoute__skeletonList}>
                {SKELETON_ROWS.map((rowId) => (
                  <div className={styles.trashRoute__skeletonRow} key={rowId} />
                ))}
              </div>
            ) : trashedItems.length > 0 ? (
              <ul className={styles.trashRoute__list}>
                {trashedItems.map((item) => (
                  <li key={item.id}>
                    <button
                      className={`${styles.trashRoute__itemButton} ${
                        selectedItemId === item.id
                          ? styles['trashRoute__itemButton--active']
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedItemId(item.id);
                      }}
                      type="button"
                    >
                      <span className={styles.trashRoute__itemTitle}>
                        {formatItemLabel(item)}
                      </span>
                      <span className={styles.trashRoute__itemMeta}>
                        {formatItemMeta(item)}
                      </span>
                      <p className={styles.trashRoute__itemPreview}>
                        {formatPreview(item)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.trashRoute__emptyState}>
                Trash is empty right now. Deleted items will surface here until
                you restore them or remove them permanently.
              </p>
            )}
          </section>

          <section className={styles.trashRoute__panel}>
            <header className={styles.trashRoute__panelHeader}>
              <p className={styles.trashRoute__eyebrow}>Selection</p>
              <h2 className={styles.trashRoute__panelTitle}>Item Detail</h2>
            </header>

            {selectedItem ? (
              <div className={styles.trashRoute__detailBody}>
                <h3 className={styles.trashRoute__itemTitle}>
                  {formatItemLabel(selectedItem)}
                </h3>
                <p className={styles.trashRoute__detailMeta}>
                  {formatItemMeta(selectedItem)}
                </p>
                <p className={styles.trashRoute__detailCopy}>
                  {formatPreview(selectedItem)}
                </p>
                <p className={styles.trashRoute__detailCopy}>
                  Restore and permanent delete controls land here next.
                </p>
              </div>
            ) : (
              <p className={styles.trashRoute__detailEmpty}>
                Select a trashed item to review its details before deciding what
                to do with it.
              </p>
            )}
          </section>
        </div>
      </section>
    );
  },
});
