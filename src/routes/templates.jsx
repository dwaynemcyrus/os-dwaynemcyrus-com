import { createElement, useEffect, useMemo, useState } from 'react';
import { Outlet, createRoute, useRouterState } from '@tanstack/react-router';
import { AppDialog } from '../components/ui/AppDialog';
import { useAuth } from '../lib/auth';
import {
  createBlankTemplate,
  fetchManagedTemplates,
  trashTemplate,
} from '../lib/items';
import {
  DEFAULT_TEMPLATE_DATE_FORMAT,
  DEFAULT_TEMPLATE_FOLDER,
  DEFAULT_TEMPLATE_TIME_FORMAT,
  fetchTemplateSettings,
  saveTemplateSettings,
} from '../lib/settings';
import { formatFilenameForDisplay } from '../lib/filenames';
import {
  formatTemplateGroupLabel,
  formatSubtypeLabel,
  groupTemplatesByType,
} from '../lib/templates';
import sheetStyles from './SettingsRoute.module.css';
import styles from './TemplatesRoute.module.css';
import { settingsRoute } from './settings';

function formatTemplateDate(value) {
  if (!value) {
    return 'No saved date';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatTemplateMeta(templateItem) {
  const metaParts = [];

  if (templateItem.subtype) {
    metaParts.push(formatSubtypeLabel(templateItem.subtype));
  }

  metaParts.push(
    formatTemplateDate(templateItem.date_modified ?? templateItem.date_created),
  );

  return metaParts.join(' · ');
}

function formatTemplateTitle(templateItem) {
  return formatFilenameForDisplay(
    templateItem.filename,
    templateItem.title?.trim() ||
      (templateItem.subtype?.trim()
        ? formatSubtypeLabel(templateItem.subtype)
        : 'Untitled template'),
  );
}

function formatTemplatePreview(templateItem) {
  if (templateItem.content?.trim()) {
    return templateItem.content.trim().split('\n')[0];
  }

  return 'Open in the editor to review this template.';
}

function getTemplateDeleteConfirmationValue(templateItem) {
  if (templateItem.subtype?.trim()) {
    return templateItem.subtype.trim();
  }

  return formatTemplateTitle(templateItem);
}

function getSheetMessageClassName(kind) {
  return [
    sheetStyles.settingsScreen__message,
    kind === 'error'
      ? sheetStyles['settingsScreen__message--error']
      : sheetStyles['settingsScreen__message--status'],
  ].join(' ');
}

function formatTemplateSyntaxPreview(formatValue, date) {
  const replacements = [
    ['YYYY', String(date.getFullYear())],
    ['MM', String(date.getMonth() + 1).padStart(2, '0')],
    ['DD', String(date.getDate()).padStart(2, '0')],
    ['HH', String(date.getHours()).padStart(2, '0')],
    ['mm', String(date.getMinutes()).padStart(2, '0')],
    ['ss', String(date.getSeconds()).padStart(2, '0')],
  ];

  return replacements.reduce(
    (currentValue, [token, replacement]) =>
      currentValue.replaceAll(token, replacement),
    formatValue,
  );
}

const DEFAULT_TEMPLATE_SETTINGS = {
  dateFormat: DEFAULT_TEMPLATE_DATE_FORMAT,
  folder: DEFAULT_TEMPLATE_FOLDER,
  timeFormat: DEFAULT_TEMPLATE_TIME_FORMAT,
};

export const templatesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'templates',
  component: function TemplatesRoute() {
    const auth = useAuth();
    const navigate = templatesRoute.useNavigate();
    const isEditorRouteOpen = useRouterState({
      select: (state) => {
        const { pathname } = state.location;

        return (
          pathname.startsWith('/settings/templates/') &&
          pathname !== '/settings/templates'
        );
      },
    });
    const [templateItems, setTemplateItems] = useState([]);
    const [createErrorMessage, setCreateErrorMessage] = useState('');
    const [deleteConfirmationValue, setDeleteConfirmationValue] = useState('');
    const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
    const [deleteStatusMessage, setDeleteStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState(null);
    const [savedTemplateSettings, setSavedTemplateSettings] = useState(
      DEFAULT_TEMPLATE_SETTINGS,
    );
    const [settingsErrorMessage, setSettingsErrorMessage] = useState('');
    const [settingsStatusMessage, setSettingsStatusMessage] = useState('');
    const [templateSettings, setTemplateSettings] = useState(
      DEFAULT_TEMPLATE_SETTINGS,
    );
    const templateGroups = useMemo(
      () => groupTemplatesByType(templateItems),
      [templateItems],
    );
    const isTemplateSettingsDirty =
      templateSettings.folder !== savedTemplateSettings.folder ||
      templateSettings.dateFormat !== savedTemplateSettings.dateFormat ||
      templateSettings.timeFormat !== savedTemplateSettings.timeFormat;
    const templateCountLabel = useMemo(() => {
      if (templateItems.length === 1) {
        return '1 template';
      }

      return `${templateItems.length} templates`;
    }, [templateItems.length]);

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      setIsLoading(true);
      setErrorMessage('');
      setSettingsErrorMessage('');
      setSettingsStatusMessage('');

      Promise.allSettled([
        fetchManagedTemplates(auth.user.id),
        fetchTemplateSettings({
          userId: auth.user.id,
        }),
      ])
        .then(([templatesResult, templateSettingsResult]) => {
          if (cancelled) {
            return;
          }

          if (templatesResult.status === 'fulfilled') {
            setTemplateItems(templatesResult.value);
          } else {
            setErrorMessage(
              templatesResult.reason?.message ??
                'Unable to load templates right now.',
            );
          }

          if (templateSettingsResult.status === 'fulfilled') {
            setTemplateSettings(templateSettingsResult.value);
            setSavedTemplateSettings(templateSettingsResult.value);
          } else {
            setTemplateSettings(DEFAULT_TEMPLATE_SETTINGS);
            setSavedTemplateSettings(DEFAULT_TEMPLATE_SETTINGS);
            setSettingsErrorMessage(
              templateSettingsResult.reason?.message ??
                'Unable to load template settings right now.',
            );
          }
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

    const datePreview = useMemo(
      () =>
        formatTemplateSyntaxPreview(templateSettings.dateFormat, new Date()),
      [templateSettings.dateFormat],
    );
    const timePreview = useMemo(
      () =>
        formatTemplateSyntaxPreview(templateSettings.timeFormat, new Date()),
      [templateSettings.timeFormat],
    );

    async function handleTemplateSettingsSubmit(event) {
      event.preventDefault();

      if (!auth.user?.id) {
        setSettingsErrorMessage('Your session is missing a user id.');
        return;
      }

      setIsSavingSettings(true);
      setSettingsErrorMessage('');
      setSettingsStatusMessage('');

      try {
        const savedSettings = await saveTemplateSettings({
          dateFormat: templateSettings.dateFormat,
          folder: templateSettings.folder,
          timeFormat: templateSettings.timeFormat,
          userId: auth.user.id,
        });

        setTemplateSettings(savedSettings);
        setSavedTemplateSettings(savedSettings);
        setSettingsStatusMessage('Template settings saved.');
      } catch (error) {
        setSettingsErrorMessage(
          error.message ?? 'Unable to save template settings right now.',
        );
      } finally {
        setIsSavingSettings(false);
      }
    }

    async function openTemplate(templateId) {
      await navigate({
        params: {
          id: templateId,
        },
        to: '/settings/templates/$id',
      });
    }

    async function handleCreateTemplate(event) {
      event.preventDefault();

      if (!auth.user?.id) {
        setCreateErrorMessage('Your session is missing a user id.');
        return;
      }

      setIsCreating(true);
      setCreateErrorMessage('');

      try {
        const createdTemplate = await createBlankTemplate({
          userId: auth.user.id,
        });

        setTemplateItems((currentItems) => [createdTemplate, ...currentItems]);
        await navigate({
          params: {
            id: createdTemplate.id,
          },
          to: '/settings/templates/$id',
        });
      } catch (error) {
        setCreateErrorMessage(
          error.message ?? 'Unable to create a template right now.',
        );
      } finally {
        setIsCreating(false);
      }
    }

    function openDeleteDialog(templateItem) {
      setPendingDeleteTemplate(templateItem);
      setDeleteConfirmationValue('');
      setDeleteErrorMessage('');
      setDeleteStatusMessage('');
    }

    function closeDeleteDialog() {
      if (isDeleting) {
        return;
      }

      setPendingDeleteTemplate(null);
      setDeleteConfirmationValue('');
      setDeleteErrorMessage('');
    }

    async function handleDeleteTemplate(event) {
      event.preventDefault();

      if (!auth.user?.id || !pendingDeleteTemplate) {
        setDeleteErrorMessage('Select a user template before deleting it.');
        return;
      }

      if (
        deleteConfirmationValue !==
        getTemplateDeleteConfirmationValue(pendingDeleteTemplate)
      ) {
        setDeleteErrorMessage(
          'Type the exact confirmation text to delete this template.',
        );
        return;
      }

      setIsDeleting(true);
      setDeleteErrorMessage('');
      setDeleteStatusMessage('');

      try {
        const deletedTemplate = await trashTemplate({
          templateId: pendingDeleteTemplate.id,
          userId: auth.user.id,
        });

        setTemplateItems((currentItems) =>
          currentItems.filter((item) => item.id !== deletedTemplate.id),
        );
        setDeleteStatusMessage('Template moved to trash.');
        setPendingDeleteTemplate(null);
        setDeleteConfirmationValue('');
      } catch (error) {
        if (error.item?.id) {
          setTemplateItems((currentItems) =>
            currentItems.filter((item) => item.id !== error.item.id),
          );
          setDeleteStatusMessage(
            'Template moved to trash, but the history snapshot failed.',
          );
          setPendingDeleteTemplate(null);
          setDeleteConfirmationValue('');
        } else {
          setDeleteErrorMessage(
            error.message ?? 'Unable to delete that template right now.',
          );
        }
      } finally {
        setIsDeleting(false);
      }
    }

    const deleteDialogTitle = pendingDeleteTemplate
      ? getTemplateDeleteConfirmationValue(pendingDeleteTemplate)
      : '';

    return (
      <>
        <section
          aria-hidden={isEditorRouteOpen}
          className={`${sheetStyles.settingsScreen} ${styles.templatesRoute}`}
        >
        <header className={sheetStyles.settingsScreen__header}>
          <p className={sheetStyles.settingsScreen__eyebrow}>Settings</p>
          <h1 className={sheetStyles.settingsScreen__title}>Templates</h1>
          <p className={sheetStyles.settingsScreen__copy}>
            {isLoading ? 'Loading templates...' : templateCountLabel}
          </p>
        </header>

        <section className={styles.templatesRoute__settingsPanel}>
          <header className={sheetStyles.settingsScreen__header}>
            <h2 className={sheetStyles.settingsScreen__sectionTitle}>
              Template Settings
            </h2>
          </header>

          <form
            className={styles.templatesRoute__settingsForm}
            onSubmit={(event) => {
              void handleTemplateSettingsSubmit(event);
            }}
          >
            <section className={styles.templatesRoute__settingBlock}>
              <label className={styles.templatesRoute__settingLabel}>
                <span className={styles.templatesRoute__settingTitle}>
                  Template folder location
                </span>
                <span className={styles.templatesRoute__settingCopy}>
                  Files in this folder will be available as templates.
                </span>
                <input
                  className={styles.templatesRoute__settingInput}
                  disabled={isLoading || isSavingSettings}
                  onChange={(event) => {
                    setTemplateSettings((currentSettings) => ({
                      ...currentSettings,
                      folder: event.target.value,
                    }));
                    setSettingsErrorMessage('');
                    setSettingsStatusMessage('');
                  }}
                  placeholder="No folder"
                  type="text"
                  value={templateSettings.folder}
                />
              </label>
            </section>

            <section className={styles.templatesRoute__settingBlock}>
              <label className={styles.templatesRoute__settingLabel}>
                <span className={styles.templatesRoute__settingTitle}>
                  Date format
                </span>
                <span className={styles.templatesRoute__settingCopy}>
                  <code>{'{{date}}'}</code> in the template file will be replaced
                  with this value.
                </span>
                <span className={styles.templatesRoute__settingCopy}>
                  You can also use <code>{'{{date:YYYY-MM-DD}}'}</code> to
                  override the format once.
                </span>
                <span className={styles.templatesRoute__settingCopy}>
                  For more syntax, refer to{' '}
                  <span className={styles.templatesRoute__settingReference}>
                    format reference
                  </span>
                  .
                </span>
                <span className={styles.templatesRoute__settingCopy}>
                  Your current syntax looks like this:{' '}
                  <span className={styles.templatesRoute__settingPreview}>
                    {datePreview}
                  </span>
                </span>
                <input
                  className={styles.templatesRoute__settingInput}
                  disabled={isLoading || isSavingSettings}
                  onChange={(event) => {
                    setTemplateSettings((currentSettings) => ({
                      ...currentSettings,
                      dateFormat: event.target.value,
                    }));
                    setSettingsErrorMessage('');
                    setSettingsStatusMessage('');
                  }}
                  type="text"
                  value={templateSettings.dateFormat}
                />
              </label>
            </section>

            <section className={styles.templatesRoute__settingBlock}>
              <label className={styles.templatesRoute__settingLabel}>
                <span className={styles.templatesRoute__settingTitle}>
                  Time format
                </span>
                <span className={styles.templatesRoute__settingCopy}>
                  <code>{'{{time}}'}</code> in the template file will be replaced
                  with this value.
                </span>
                <span className={styles.templatesRoute__settingCopy}>
                  You can also use <code>{'{{time:HH:mm}}'}</code> to override
                  the format once.
                </span>
                <span className={styles.templatesRoute__settingCopy}>
                  For more syntax, refer to{' '}
                  <span className={styles.templatesRoute__settingReference}>
                    format reference
                  </span>
                  .
                </span>
                <span className={styles.templatesRoute__settingCopy}>
                  Your current syntax looks like this:{' '}
                  <span className={styles.templatesRoute__settingPreview}>
                    {timePreview}
                  </span>
                </span>
                <input
                  className={styles.templatesRoute__settingInput}
                  disabled={isLoading || isSavingSettings}
                  onChange={(event) => {
                    setTemplateSettings((currentSettings) => ({
                      ...currentSettings,
                      timeFormat: event.target.value,
                    }));
                    setSettingsErrorMessage('');
                    setSettingsStatusMessage('');
                  }}
                  type="text"
                  value={templateSettings.timeFormat}
                />
              </label>
            </section>

            <button
              className={`${sheetStyles.settingsScreen__actionButton} ${styles.templatesRoute__settingsButton}`}
              disabled={isLoading || isSavingSettings || !isTemplateSettingsDirty}
              type="submit"
            >
              {isSavingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </form>

          {settingsErrorMessage ? (
            <p className={getSheetMessageClassName('error')} role="alert">
              {settingsErrorMessage}
            </p>
          ) : null}

          {settingsStatusMessage ? (
            <p className={getSheetMessageClassName('status')} role="status">
              {settingsStatusMessage}
            </p>
          ) : null}
        </section>

        <section className={styles.templatesRoute__createSection}>
          <div className={sheetStyles.settingsScreen__section}>
            <h2 className={sheetStyles.settingsScreen__sectionTitle}>
              New Template
            </h2>
            <p className={sheetStyles.settingsScreen__copy}>
              Start blank. Add frontmatter only when it serves the template.
            </p>
          </div>

          <form
            className={styles.templatesRoute__createForm}
            onSubmit={(event) => {
              void handleCreateTemplate(event);
            }}
          >
            <p className={sheetStyles.settingsScreen__copy}>
              Add <code>type:</code> and <code>subtype:</code> only when a
              template should appear in a specific flow.
            </p>

            <button
              className={`${sheetStyles.settingsScreen__actionButton} ${styles.templatesRoute__createButton}`}
              disabled={isLoading || isCreating}
              type="submit"
            >
              {isCreating ? 'Creating...' : 'Create Empty Template'}
            </button>
          </form>

          {createErrorMessage ? (
            <p className={getSheetMessageClassName('error')} role="alert">
              {createErrorMessage}
            </p>
          ) : null}
        </section>

        {deleteStatusMessage ? (
          <p className={getSheetMessageClassName('status')} role="status">
            {deleteStatusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className={getSheetMessageClassName('error')} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <section aria-hidden="true" className={styles.templatesRoute__loadingList}>
            {['loading-type-1', 'loading-type-2'].map((loadingKey) => (
              <div className={styles.templatesRoute__loadingGroup} key={loadingKey}>
                <div className={styles.templatesRoute__loadingLabel} />
                {[`${loadingKey}-row-1`, `${loadingKey}-row-2`].map((rowKey) => (
                  <div className={styles.templatesRoute__loadingRow} key={rowKey} />
                ))}
              </div>
            ))}
          </section>
        ) : null}

        {!isLoading && !errorMessage && templateGroups.length === 0 ? (
          <section className={styles.templatesRoute__emptyState}>
            <h2 className={sheetStyles.settingsScreen__sectionTitle}>
              No templates yet
            </h2>
            <p className={sheetStyles.settingsScreen__copy}>
              Create your first blank template, then add only the frontmatter
              you actually want to keep.
            </p>
          </section>
        ) : null}

        {!isLoading && !errorMessage && templateGroups.length > 0 ? (
          <div className={styles.templatesRoute__groups}>
            {templateGroups.map((templateGroup) => (
              <section className={styles.templatesRoute__group} key={templateGroup.type}>
                <header className={styles.templatesRoute__groupHeader}>
                  <h2 className={styles.templatesRoute__groupTitle}>
                    {formatTemplateGroupLabel(templateGroup.type)}
                  </h2>
                  <p className={styles.templatesRoute__groupCount}>
                    {templateGroup.items.length === 1
                      ? '1 template'
                      : `${templateGroup.items.length} templates`}
                  </p>
                </header>

                <ul className={styles.templatesRoute__itemList}>
                  {templateGroup.items.map((templateItem) => (
                    <li key={templateItem.id}>
                      <article className={styles.templatesRoute__item}>
                        <button
                          className={styles.templatesRoute__itemButton}
                          onClick={() => {
                            void openTemplate(templateItem.id);
                          }}
                          type="button"
                        >
                          <span className={styles.templatesRoute__itemTitle}>
                            {formatTemplateTitle(templateItem)}
                          </span>
                          <span className={styles.templatesRoute__itemMeta}>
                            {formatTemplateMeta(templateItem)}
                          </span>
                          <span className={styles.templatesRoute__itemPreview}>
                            {formatTemplatePreview(templateItem)}
                          </span>
                        </button>

                        <div className={styles.templatesRoute__itemActions}>
                          <button
                            className={styles.templatesRoute__deleteButton}
                            onClick={() => {
                              openDeleteDialog(templateItem);
                            }}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : null}

          {pendingDeleteTemplate ? (
            createElement(
              AppDialog,
              {
                ariaLabel: 'Close delete template dialog',
                onClose: closeDeleteDialog,
                panelClassName: styles.templatesRoute__dialog,
                role: 'alertdialog',
              },
              <>
                <header className={sheetStyles.settingsScreen__header}>
                  <p className={sheetStyles.settingsScreen__eyebrow}>Templates</p>
                  <h2 className={sheetStyles.settingsScreen__sectionTitle}>
                    Delete Template
                  </h2>
                  <p className={sheetStyles.settingsScreen__copy}>
                    Type the exact text <strong>{deleteDialogTitle}</strong> to
                    move this template to trash.
                  </p>
                </header>

                <form
                  className={sheetStyles.settingsScreen__form}
                  onSubmit={(event) => {
                    void handleDeleteTemplate(event);
                  }}
                >
                  <label className={sheetStyles.settingsScreen__label}>
                    <span>Confirm text</span>
                    <input
                      autoFocus
                      className={styles.templatesRoute__dialogInput}
                      onChange={(event) => {
                        setDeleteConfirmationValue(event.target.value);
                        setDeleteErrorMessage('');
                      }}
                      type="text"
                      value={deleteConfirmationValue}
                    />
                  </label>

                  {deleteErrorMessage ? (
                    <p className={getSheetMessageClassName('error')} role="alert">
                      {deleteErrorMessage}
                    </p>
                  ) : null}

                  <div className={styles.templatesRoute__dialogActions}>
                    <button
                      className={sheetStyles.settingsScreen__secondaryButton}
                      onClick={closeDeleteDialog}
                      type="button"
                    >
                      Cancel
                    </button>

                    <button
                      className={`${sheetStyles.settingsScreen__actionButton} ${styles.templatesRoute__dangerButton}`}
                      disabled={
                        isDeleting || deleteConfirmationValue !== deleteDialogTitle
                      }
                      type="submit"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Template'}
                    </button>
                  </div>
                </form>
              </>,
            )
          ) : null}
        </section>

        {isEditorRouteOpen ? (
          <div className={styles.templatesRoute__editorLayer}>
            <div className={styles.templatesRoute__editorSheet}>
              {createElement(Outlet)}
            </div>
          </div>
        ) : null}
      </>
    );
  },
});
