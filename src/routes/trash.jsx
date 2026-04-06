import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { getItemDisplayLabel } from '../lib/filenames';
import {
  fetchTrashedItems,
  permanentlyDeleteTrashedItem,
  restoreTrashedItem,
} from '../lib/items';
import sheetStyles from './SettingsRoute.module.css';
import styles from './TrashRoute.module.css';
import { settingsRoute } from './settings';

const SKELETON_ROWS = ['trash-1', 'trash-2', 'trash-3'];

function formatItemLabel(item) {
  return getItemDisplayLabel(item);
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
    return '1 item';
  }

  return `${itemCount} items`;
}

function getSheetMessageClassName(kind) {
  return [
    sheetStyles.settingsScreen__message,
    kind === 'error'
      ? sheetStyles['settingsScreen__message--error']
      : sheetStyles['settingsScreen__message--status'],
  ].join(' ');
}

export const trashRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'trash',
  component: function TrashRoute() {
    const auth = useAuth();
    const [errorMessage, setErrorMessage] = useState('');
    const [actionErrorMessage, setActionErrorMessage] = useState('');
    const [actionStatusMessage, setActionStatusMessage] = useState('');
    const [deleteConfirmationValue, setDeleteConfirmationValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [trashedItems, setTrashedItems] = useState([]);
    const trashCountLabel = useMemo(
      () => formatTrashCountLabel(trashedItems.length),
      [trashedItems.length],
    );
    const selectedItem =
      trashedItems.find((item) => item.id === selectedItemId) ?? null;
    const deleteConfirmationLabel = selectedItem
      ? formatItemLabel(selectedItem)
      : '';

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

    useEffect(() => {
      setDeleteConfirmationValue('');
      setActionErrorMessage('');
      setActionStatusMessage('');
    }, [selectedItemId]);

    async function handleRestoreItem() {
      if (!auth.user?.id || !selectedItem) {
        setActionErrorMessage('Select a trashed item before restoring it.');
        return;
      }

      setIsRestoring(true);
      setActionErrorMessage('');
      setActionStatusMessage('');

      try {
        const restoredItem = await restoreTrashedItem({
          itemId: selectedItem.id,
          userId: auth.user.id,
        });

        setTrashedItems((currentItems) =>
          currentItems.filter((item) => item.id !== restoredItem.id),
        );
        setActionStatusMessage('Item restored from trash.');
      } catch (error) {
        if (error.item?.id) {
          setTrashedItems((currentItems) =>
            currentItems.filter((item) => item.id !== error.item.id),
          );
          setActionStatusMessage(
            'Item restored from trash, but the history snapshot failed.',
          );
          return;
        }

        setActionErrorMessage(
          error.message ?? 'Unable to restore that item right now.',
        );
      } finally {
        setIsRestoring(false);
      }
    }

    async function handlePermanentDelete(event) {
      event.preventDefault();

      if (!auth.user?.id || !selectedItem) {
        setActionErrorMessage('Select a trashed item before deleting it.');
        return;
      }

      if (deleteConfirmationValue !== deleteConfirmationLabel) {
        setActionErrorMessage('Type the exact item label to confirm deletion.');
        return;
      }

      setIsDeleting(true);
      setActionErrorMessage('');
      setActionStatusMessage('');

      try {
        const deletedItem = await permanentlyDeleteTrashedItem({
          itemId: selectedItem.id,
          userId: auth.user.id,
        });

        setTrashedItems((currentItems) =>
          currentItems.filter((item) => item.id !== deletedItem.id),
        );
        setActionStatusMessage('Item deleted permanently.');
      } catch (error) {
        setActionErrorMessage(
          error.message ?? 'Unable to permanently delete that item right now.',
        );
      } finally {
        setIsDeleting(false);
      }
    }

    return (
      <section className={`${sheetStyles.settingsScreen} ${styles.trashRoute}`}>
        <header className={sheetStyles.settingsScreen__header}>
          <p className={sheetStyles.settingsScreen__eyebrow}>Settings</p>
          <h1 className={sheetStyles.settingsScreen__title}>Trash</h1>
          <p className={sheetStyles.settingsScreen__copy}>
            {isLoading ? 'Loading trash...' : trashCountLabel}
          </p>
        </header>

        {errorMessage ? (
          <p className={getSheetMessageClassName('error')} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <section aria-hidden="true" className={styles.trashRoute__loadingList}>
            {SKELETON_ROWS.map((rowId) => (
              <div className={styles.trashRoute__loadingRow} key={rowId} />
            ))}
          </section>
        ) : null}

        {!isLoading && !errorMessage && trashedItems.length === 0 ? (
          <section className={styles.trashRoute__emptyState}>
            <h2 className={sheetStyles.settingsScreen__sectionTitle}>Trash is empty</h2>
            <p className={sheetStyles.settingsScreen__copy}>
              Deleted items will surface here until you restore them or remove
              them permanently.
            </p>
          </section>
        ) : null}

        {!isLoading && !errorMessage && trashedItems.length > 0 ? (
          <div className={styles.trashRoute__sections}>
            <section className={styles.trashRoute__section}>
              <header className={styles.trashRoute__sectionHeader}>
                <h2 className={sheetStyles.settingsScreen__sectionTitle}>Items</h2>
                <p className={sheetStyles.settingsScreen__copy}>{trashCountLabel}</p>
              </header>

              <ul className={styles.trashRoute__itemList}>
                {trashedItems.map((item) => {
                  const isActive = selectedItemId === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        className={`${styles.trashRoute__itemButton} ${
                          isActive ? styles['trashRoute__itemButton--active'] : ''
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
                        <span className={styles.trashRoute__itemPreview}>
                          {formatPreview(item)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className={styles.trashRoute__section}>
              <header className={styles.trashRoute__sectionHeader}>
                <h2 className={sheetStyles.settingsScreen__sectionTitle}>Detail</h2>
              </header>

              {selectedItem ? (
                <div className={styles.trashRoute__detail}>
                  <div className={styles.trashRoute__detailCopyBlock}>
                    <p className={styles.trashRoute__detailTitle}>
                      {formatItemLabel(selectedItem)}
                    </p>
                    <p className={styles.trashRoute__detailMeta}>
                      {formatItemMeta(selectedItem)}
                    </p>
                    <p className={styles.trashRoute__detailPreview}>
                      {formatPreview(selectedItem)}
                    </p>
                  </div>

                  {actionErrorMessage ? (
                    <p className={getSheetMessageClassName('error')} role="alert">
                      {actionErrorMessage}
                    </p>
                  ) : null}

                  {actionStatusMessage ? (
                    <p className={getSheetMessageClassName('status')} role="status">
                      {actionStatusMessage}
                    </p>
                  ) : null}

                  <div className={styles.trashRoute__actions}>
                    <button
                      className={sheetStyles.settingsScreen__actionButton}
                      disabled={isRestoring || isDeleting}
                      onClick={() => {
                        void handleRestoreItem();
                      }}
                      type="button"
                    >
                      {isRestoring ? 'Restoring...' : 'Restore Item'}
                    </button>

                    <form
                      className={styles.trashRoute__deleteBlock}
                      onSubmit={(event) => {
                        void handlePermanentDelete(event);
                      }}
                    >
                      <label className={sheetStyles.settingsScreen__label}>
                        <span>Type the exact title to delete permanently</span>
                        <input
                          className={styles.trashRoute__deleteInput}
                          onChange={(event) => {
                            setDeleteConfirmationValue(event.target.value);
                            setActionErrorMessage('');
                            setActionStatusMessage('');
                          }}
                          placeholder={deleteConfirmationLabel}
                          spellCheck={false}
                          type="text"
                          value={deleteConfirmationValue}
                        />
                      </label>

                      <p className={sheetStyles.settingsScreen__copy}>
                        This permanently removes the item and any related history
                        or log records.
                      </p>

                      <button
                        className={`${sheetStyles.settingsScreen__actionButton} ${styles.trashRoute__dangerButton}`}
                        disabled={
                          isDeleting ||
                          isRestoring ||
                          deleteConfirmationValue !== deleteConfirmationLabel
                        }
                        type="submit"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <p className={sheetStyles.settingsScreen__copy}>
                  Select a trashed item to review it before restoring or
                  deleting it.
                </p>
              )}
            </section>
          </div>
        ) : null}
      </section>
    );
  },
});
