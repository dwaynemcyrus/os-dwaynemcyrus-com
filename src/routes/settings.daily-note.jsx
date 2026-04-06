import { createElement, useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { AppDialog } from '../components/ui/AppDialog';
import { useAuth } from '../lib/auth';
import {
  bulkUpdateDailyNoteFolders,
  DEFAULT_DAILY_NOTE_FOLDER,
  fetchDailyNoteSettings,
  saveDailyNoteSettings,
} from '../lib/settings';
import styles from './SettingsRoute.module.css';
import { authenticatedRoute } from './_authenticated';

const DEFAULT_DAILY_SETTINGS = {
  folder: DEFAULT_DAILY_NOTE_FOLDER,
  selectedTemplateId: '',
};

function formatDailyDatePreview(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatSelectedTemplateLabel({
  hasDailyTemplateOptions,
  selectedTemplateId,
  templateOptions,
}) {
  return (
    templateOptions.find((option) => option.id === selectedTemplateId)?.label ??
    (hasDailyTemplateOptions
      ? 'No daily template selected'
      : 'No daily template available')
  );
}

function buildFilteredFolderOptions(folderOptions, folderValue) {
  const normalizedValue = String(folderValue ?? '').trim().toLowerCase();

  if (!normalizedValue) {
    return folderOptions;
  }

  return folderOptions.filter((option) =>
    option.toLowerCase().includes(normalizedValue),
  );
}

function hasExactFolderMatch(folderOptions, folderValue) {
  const normalizedValue = String(folderValue ?? '').trim().toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return folderOptions.some(
    (option) => option.toLowerCase() === normalizedValue,
  );
}

function formatBulkUpdateStatusMessage({ folder, updatedCount }) {
  if (updatedCount === 0) {
    return 'No existing daily notes needed updating.';
  }

  if (!folder) {
    return updatedCount === 1
      ? 'Removed the folder from 1 existing daily note.'
      : `Removed the folder from ${updatedCount} existing daily notes.`;
  }

  return updatedCount === 1
    ? `Updated 1 existing daily note to use "${folder}".`
    : `Updated ${updatedCount} existing daily notes to use "${folder}".`;
}

export const settingsDailyNoteRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings/daily-note',
  component: function SettingsDailyNoteRoute() {
    const auth = useAuth();
    const [dailyErrorMessage, setDailyErrorMessage] = useState('');
    const [dailyStatusMessage, setDailyStatusMessage] = useState('');
    const [dailySettings, setDailySettings] = useState(DEFAULT_DAILY_SETTINGS);
    const [folderOptions, setFolderOptions] = useState([]);
    const [isApplyingBulkFolderUpdate, setIsApplyingBulkFolderUpdate] =
      useState(false);
    const [isFolderFieldActive, setIsFolderFieldActive] = useState(false);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [pendingBulkFolderValue, setPendingBulkFolderValue] = useState(null);
    const [savedDailySettings, setSavedDailySettings] = useState(
      DEFAULT_DAILY_SETTINGS,
    );
    const [templateOptions, setTemplateOptions] = useState([]);
    const datePreview = useMemo(
      () => formatDailyDatePreview(new Date()),
      [],
    );
    const filteredFolderOptions = useMemo(
      () => buildFilteredFolderOptions(folderOptions, dailySettings.folder),
      [dailySettings.folder, folderOptions],
    );
    const hasDailyTemplateOptions = templateOptions.length > 0;
    const hasExactFolderOptionMatch = useMemo(
      () => hasExactFolderMatch(folderOptions, dailySettings.folder),
      [dailySettings.folder, folderOptions],
    );
    const isDailySettingsDirty =
      dailySettings.folder !== savedDailySettings.folder ||
      dailySettings.selectedTemplateId !== savedDailySettings.selectedTemplateId;
    const selectedTemplateLabel = useMemo(
      () =>
        formatSelectedTemplateLabel({
          hasDailyTemplateOptions,
          selectedTemplateId: dailySettings.selectedTemplateId,
          templateOptions,
        }),
      [dailySettings.selectedTemplateId, hasDailyTemplateOptions, templateOptions],
    );
    const shouldShowFolderOptions =
      isFolderFieldActive &&
      (filteredFolderOptions.length > 0 || Boolean(dailySettings.folder.trim()));

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      setIsLoadingSettings(true);
      setDailyErrorMessage('');
      setDailyStatusMessage('');

      fetchDailyNoteSettings({
        userId: auth.user.id,
      })
        .then((loadedDailySettings) => {
          if (cancelled) {
            return;
          }

          const nextSettings = {
            folder: loadedDailySettings.folder,
            selectedTemplateId: loadedDailySettings.selectedTemplateId,
          };

          setDailySettings(nextSettings);
          setSavedDailySettings(nextSettings);
          setFolderOptions(loadedDailySettings.folderOptions);
          setTemplateOptions(loadedDailySettings.options);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setDailyErrorMessage(
            error.message ?? 'Unable to load daily note settings right now.',
          );
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setIsLoadingSettings(false);
        });

      return () => {
        cancelled = true;
      };
    }, [auth.user?.id]);

    function updateFolderValue(nextFolderValue) {
      setDailySettings((currentSettings) => ({
        ...currentSettings,
        folder: nextFolderValue,
      }));
      setDailyErrorMessage('');
      setDailyStatusMessage('');
    }

    function closeBulkFolderModal() {
      if (isApplyingBulkFolderUpdate) {
        return;
      }

      setPendingBulkFolderValue(null);
    }

    async function handleDailySettingsSubmit(event) {
      event.preventDefault();

      if (!auth.user?.id) {
        setDailyErrorMessage('Your session is missing a user id.');
        return;
      }

      setIsSavingSettings(true);
      setDailyErrorMessage('');
      setDailyStatusMessage('');

      try {
        const savedSettings = await saveDailyNoteSettings({
          dailyNoteFolder: dailySettings.folder,
          dailyTemplateId: dailySettings.selectedTemplateId,
          userId: auth.user.id,
        });
        const didFolderChange =
          savedDailySettings.folder !== savedSettings.folder;
        const nextSettings = {
          folder: savedSettings.folder,
          selectedTemplateId: savedSettings.selectedTemplateId,
        };

        setDailySettings(nextSettings);
        setSavedDailySettings(nextSettings);
        setFolderOptions((currentFolderOptions) => {
          if (
            !savedSettings.folder ||
            currentFolderOptions.includes(savedSettings.folder)
          ) {
            return currentFolderOptions;
          }

          return [...currentFolderOptions, savedSettings.folder].sort((leftValue, rightValue) =>
            leftValue.localeCompare(rightValue, undefined, {
              sensitivity: 'base',
            }),
          );
        });
        setDailyStatusMessage('Daily note settings saved.');

        if (didFolderChange) {
          setPendingBulkFolderValue(savedSettings.folder);
        }
      } catch (error) {
        setDailyErrorMessage(
          error.message ?? 'Unable to save your daily note settings right now.',
        );
      } finally {
        setIsSavingSettings(false);
      }
    }

    async function handleBulkFolderUpdate() {
      if (!auth.user?.id || pendingBulkFolderValue === null) {
        return;
      }

      setIsApplyingBulkFolderUpdate(true);
      setDailyErrorMessage('');
      setDailyStatusMessage('');

      try {
        const result = await bulkUpdateDailyNoteFolders({
          dailyNoteFolder: pendingBulkFolderValue,
          userId: auth.user.id,
        });

        setDailyStatusMessage(formatBulkUpdateStatusMessage(result));
        setPendingBulkFolderValue(null);
      } catch (error) {
        setDailyErrorMessage(
          error.message ?? 'Unable to update existing daily notes right now.',
        );
      } finally {
        setIsApplyingBulkFolderUpdate(false);
      }
    }

    return (
      <section className={styles.settingsScreen}>
        <header className={styles.settingsScreen__header}>
          <p className={styles.settingsScreen__eyebrow}>Settings</p>
          <h1 className={styles.settingsScreen__title}>Daily notes</h1>
        </header>

        <form
          className={styles.settingsScreen__form}
          onSubmit={(event) => {
            void handleDailySettingsSubmit(event);
          }}
        >
          <section className={styles.settingsScreen__panel}>
            <label className={styles.settingsScreen__settingLabel}>
              <span className={styles.settingsScreen__settingTitle}>
                Date format
              </span>
              <span className={styles.settingsScreen__settingCopy}>
                Choose how daily note names will work in the future.
              </span>
              <input
                className={styles.settingsScreen__textInput}
                disabled
                readOnly
                type="text"
                value={datePreview}
              />
            </label>

            <label className={styles.settingsScreen__settingLabel}>
              <span className={styles.settingsScreen__settingTitle}>
                New file location
              </span>
              <span className={styles.settingsScreen__settingCopy}>
                New daily notes will be placed here.
              </span>
              <div className={styles.settingsScreen__combobox}>
                <input
                  className={styles.settingsScreen__textInput}
                  disabled={isLoadingSettings || isSavingSettings}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setIsFolderFieldActive(false);
                    }, 100);
                  }}
                  onChange={(event) => {
                    updateFolderValue(event.target.value);
                  }}
                  onFocus={() => {
                    setIsFolderFieldActive(true);
                  }}
                  placeholder="No folder"
                  type="text"
                  value={dailySettings.folder}
                />

                {shouldShowFolderOptions ? (
                  <div
                    className={styles.settingsScreen__optionList}
                    role="listbox"
                  >
                    <button
                      className={styles.settingsScreen__optionButton}
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onClick={() => {
                        updateFolderValue('');
                        setIsFolderFieldActive(false);
                      }}
                      type="button"
                    >
                      No folder
                    </button>

                    {filteredFolderOptions.map((folderOption) => (
                      <button
                        className={styles.settingsScreen__optionButton}
                        key={folderOption}
                        onMouseDown={(event) => {
                          event.preventDefault();
                        }}
                        onClick={() => {
                          updateFolderValue(folderOption);
                          setIsFolderFieldActive(false);
                        }}
                        type="button"
                      >
                        {folderOption}
                      </button>
                    ))}

                    {dailySettings.folder.trim() && !hasExactFolderOptionMatch ? (
                      <button
                        className={styles.settingsScreen__optionButton}
                        onMouseDown={(event) => {
                          event.preventDefault();
                        }}
                        onClick={() => {
                          updateFolderValue(dailySettings.folder.trim());
                          setIsFolderFieldActive(false);
                        }}
                        type="button"
                      >
                        {`Create "${dailySettings.folder.trim()}"`}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </label>

            <label className={styles.settingsScreen__settingLabel}>
              <span className={styles.settingsScreen__settingTitle}>
                Template file location
              </span>
              <span className={styles.settingsScreen__settingCopy}>
                Choose the file to use as a template.
              </span>
              <select
                className={styles.settingsScreen__select}
                disabled={
                  isLoadingSettings ||
                  isSavingSettings ||
                  !hasDailyTemplateOptions
                }
                onChange={(event) => {
                  setDailySettings((currentSettings) => ({
                    ...currentSettings,
                    selectedTemplateId: event.target.value,
                  }));
                  setDailyErrorMessage('');
                  setDailyStatusMessage('');
                }}
                value={dailySettings.selectedTemplateId}
              >
                {hasDailyTemplateOptions ? (
                  <option value="">Choose a daily template</option>
                ) : (
                  <option value="">No daily templates available</option>
                )}
                {templateOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <button
            className={styles.settingsScreen__actionButton}
            disabled={isLoadingSettings || isSavingSettings || !isDailySettingsDirty}
            type="submit"
          >
            {isSavingSettings ? 'Saving...' : 'Save'}
          </button>
        </form>

        <p className={styles.settingsScreen__copy}>
          {isLoadingSettings
            ? 'Loading daily note settings...'
            : `Current template: ${selectedTemplateLabel}`}
        </p>

        {!isLoadingSettings && !dailySettings.selectedTemplateId ? (
          <p
            className={`${styles.settingsScreen__message} ${styles['settingsScreen__message--status']}`}
            role="status"
          >
            No default daily template is selected yet. Today&apos;s note will not
            create until you choose one here.
          </p>
        ) : null}

        {!isLoadingSettings && !hasDailyTemplateOptions ? (
          <p
            className={`${styles.settingsScreen__message} ${styles['settingsScreen__message--status']}`}
            role="status"
          >
            No daily templates are available yet. Create one in Settings &gt;
            Templates and add <code> subtype: daily</code> when you want it to
            appear here.
          </p>
        ) : null}

        {dailyErrorMessage ? (
          <p
            className={`${styles.settingsScreen__message} ${styles['settingsScreen__message--error']}`}
            role="alert"
          >
            {dailyErrorMessage}
          </p>
        ) : null}

        {dailyStatusMessage ? (
          <p
            className={`${styles.settingsScreen__message} ${styles['settingsScreen__message--status']}`}
            role="status"
          >
            {dailyStatusMessage}
          </p>
        ) : null}

        {pendingBulkFolderValue !== null ? (
          createElement(
            AppDialog,
            {
              ariaLabel: 'Close daily note folder update dialog',
              onClose: closeBulkFolderModal,
              panelClassName: styles.settingsScreen__dialog,
              role: 'alertdialog',
            },
            <>
              <header className={styles.settingsScreen__dialogHeader}>
                <h2 className={styles.settingsScreen__dialogTitle}>
                  Update existing daily notes?
                </h2>
              </header>

              <p className={styles.settingsScreen__copy}>
                {pendingBulkFolderValue
                  ? `Apply "${pendingBulkFolderValue}" to your existing active daily notes too?`
                  : 'Remove the folder from your existing active daily notes too?'}
              </p>

              <div className={styles.settingsScreen__dialogActions}>
                <button
                  className={styles.settingsScreen__secondaryButton}
                  disabled={isApplyingBulkFolderUpdate}
                  onClick={closeBulkFolderModal}
                  type="button"
                >
                  Not now
                </button>
                <button
                  className={styles.settingsScreen__actionButton}
                  disabled={isApplyingBulkFolderUpdate}
                  onClick={() => {
                    void handleBulkFolderUpdate();
                  }}
                  type="button"
                >
                  {isApplyingBulkFolderUpdate ? 'Updating...' : 'Update existing'}
                </button>
              </div>
            </>,
          )
        ) : null}
      </section>
    );
  },
});
