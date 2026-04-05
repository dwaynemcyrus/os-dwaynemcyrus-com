import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import {
  fetchDailyTemplateSettings,
  saveDailyTemplatePreference,
} from '../lib/settings';
import styles from './SettingsRoute.module.css';
import { settingsRoute } from './settings';

export const settingsDailyNoteRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'daily-note',
  component: function SettingsDailyNoteRoute() {
    const auth = useAuth();
    const [dailyErrorMessage, setDailyErrorMessage] = useState('');
    const [dailyStatusMessage, setDailyStatusMessage] = useState('');
    const [initialTemplateId, setInitialTemplateId] = useState('');
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [templateOptions, setTemplateOptions] = useState([]);
    const hasDailyTemplateOptions = templateOptions.length > 0;
    const isDailyTemplateDirty = selectedTemplateId !== initialTemplateId;
    const selectedTemplateLabel = useMemo(
      () =>
        templateOptions.find((option) => option.id === selectedTemplateId)?.label ??
        (hasDailyTemplateOptions
          ? 'No daily template selected'
          : 'No daily template available'),
      [hasDailyTemplateOptions, selectedTemplateId, templateOptions],
    );

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      setIsLoadingSettings(true);
      setDailyErrorMessage('');
      setDailyStatusMessage('');

      fetchDailyTemplateSettings({
        userId: auth.user.id,
      })
        .then((dailySettings) => {
          if (cancelled) {
            return;
          }

          setTemplateOptions(dailySettings.options);
          setSelectedTemplateId(dailySettings.selectedTemplateId);
          setInitialTemplateId(dailySettings.selectedTemplateId);
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

    async function handleDailyTemplateSubmit(event) {
      event.preventDefault();

      if (!auth.user?.id) {
        setDailyErrorMessage('Your session is missing a user id.');
        return;
      }

      if (!selectedTemplateId) {
        setDailyErrorMessage('Choose a daily template before saving.');
        return;
      }

      setIsSavingTemplate(true);
      setDailyErrorMessage('');
      setDailyStatusMessage('');

      try {
        const savedTemplateId = await saveDailyTemplatePreference({
          dailyTemplateId: selectedTemplateId,
          userId: auth.user.id,
        });

        setInitialTemplateId(savedTemplateId);
        setSelectedTemplateId(savedTemplateId);
        setDailyStatusMessage('Daily note template saved.');
      } catch (error) {
        setDailyErrorMessage(
          error.message ?? 'Unable to save your daily template right now.',
        );
      } finally {
        setIsSavingTemplate(false);
      }
    }

    return (
      <section className={styles.settingsScreen}>
        <header className={styles.settingsScreen__header}>
          <p className={styles.settingsScreen__eyebrow}>Settings</p>
          <h1 className={styles.settingsScreen__title}>Daily Note</h1>
          <p className={styles.settingsScreen__description}>
            Choose the template used when you open Today&apos;s Note.
          </p>
        </header>

        <form
          className={styles.settingsScreen__form}
          onSubmit={(event) => {
            void handleDailyTemplateSubmit(event);
          }}
        >
          <div className={styles.settingsScreen__formRow}>
            <label className={styles.settingsScreen__label}>
              <span>Template</span>
              <select
                className={styles.settingsScreen__select}
                disabled={
                  isLoadingSettings ||
                  isSavingTemplate ||
                  !hasDailyTemplateOptions
                }
                onChange={(event) => {
                  setSelectedTemplateId(event.target.value);
                  setDailyErrorMessage('');
                  setDailyStatusMessage('');
                }}
                value={selectedTemplateId}
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

            <button
              className={styles.settingsScreen__actionButton}
              disabled={
                isLoadingSettings ||
                isSavingTemplate ||
                !hasDailyTemplateOptions ||
                !isDailyTemplateDirty
              }
              type="submit"
            >
              {isSavingTemplate ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>

        <p className={styles.settingsScreen__copy}>
          {isLoadingSettings
            ? 'Loading daily note settings...'
            : `Current selection: ${selectedTemplateLabel}`}
        </p>

        {!isLoadingSettings && hasDailyTemplateOptions && !selectedTemplateId ? (
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
            No daily templates are available yet. Create one in Templates and add
            <code> subtype: daily</code> when you want it to appear here.
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
      </section>
    );
  },
});
