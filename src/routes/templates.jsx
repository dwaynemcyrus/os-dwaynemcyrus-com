import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import {
  createBlankTemplate,
  fetchManagedTemplates,
  trashTemplate,
} from '../lib/items';
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
  if (templateItem.title?.trim()) {
    return templateItem.title.trim();
  }

  if (templateItem.subtype?.trim()) {
    return formatSubtypeLabel(templateItem.subtype);
  }

  return 'Untitled template';
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

export const templatesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'templates',
  component: function TemplatesRoute() {
    const auth = useAuth();
    const navigate = templatesRoute.useNavigate();
    const [templateItems, setTemplateItems] = useState([]);
    const [createErrorMessage, setCreateErrorMessage] = useState('');
    const [deleteConfirmationValue, setDeleteConfirmationValue] = useState('');
    const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
    const [deleteStatusMessage, setDeleteStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState(null);
    const templateGroups = useMemo(
      () => groupTemplatesByType(templateItems),
      [templateItems],
    );
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

      fetchManagedTemplates(auth.user.id)
        .then((templates) => {
          if (cancelled) {
            return;
          }

          setTemplateItems(templates);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setErrorMessage(
            error.message ?? 'Unable to load templates right now.',
          );
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
      <section className={`${sheetStyles.settingsScreen} ${styles.templatesRoute}`}>
        <header className={sheetStyles.settingsScreen__header}>
          <p className={sheetStyles.settingsScreen__eyebrow}>Settings</p>
          <h1 className={sheetStyles.settingsScreen__title}>Templates</h1>
          <p className={sheetStyles.settingsScreen__copy}>
            {isLoading ? 'Loading templates...' : templateCountLabel}
          </p>
        </header>

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
          <div className={styles.templatesRoute__dialogOverlay} role="presentation">
            <button
              aria-label="Close delete template dialog"
              className={styles.templatesRoute__dialogDismiss}
              onClick={closeDeleteDialog}
              type="button"
            />

            <section
              aria-modal="true"
              className={styles.templatesRoute__dialog}
              role="alertdialog"
            >
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
            </section>
          </div>
        ) : null}
      </section>
    );
  },
});
