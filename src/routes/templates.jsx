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
import { authenticatedRoute } from './_authenticated';

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

export const templatesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/templates',
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
        return '1 template available';
      }

      return `${templateItems.length} templates available`;
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
        to: '/items/$id',
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
          to: '/items/$id',
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

    return (
      <section
        style={{
          display: 'grid',
          gap: '1rem',
          maxWidth: '64rem',
        }}
      >
        <header
          style={{
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <h1 style={{ margin: 0 }}>Templates</h1>
          <p style={{ margin: 0 }}>
            Browse your templates by type. Open any template in the existing
            editor surface to review or refine it.
          </p>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.95rem',
              margin: 0,
            }}
          >
            {isLoading ? 'Loading templates...' : templateCountLabel}
          </p>
        </header>

        <section
          style={{
            display: 'grid',
            gap: '1rem',
          }}
        >
          <header
            style={{
              display: 'grid',
              gap: '0.45rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.05rem',
                margin: 0,
              }}
            >
              Create a New Template
            </h2>
            <p style={{ margin: 0 }}>
              Start with a blank template. Add frontmatter only when you want
              it, and keep templates without a type or subtype under Misc.
            </p>
          </header>

          <form
            onSubmit={(event) => {
              void handleCreateTemplate(event);
            }}
            style={{
              display: 'grid',
              gap: '1rem',
            }}
          >
            <p
              style={{
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              Add <code>type:</code> and <code>subtype:</code> in frontmatter
              only when you want a template to drive slash commands, inbox
              processing, or the daily-note picker.
            </p>

            <button
              disabled={
                isLoading || isCreating
              }
              style={{
                background:
                  isLoading || isCreating
                    ? 'transparent'
                    : 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-card)',
                color:
                  isLoading || isCreating
                    ? 'var(--color-text-secondary)'
                    : 'var(--color-text-primary)',
                cursor:
                  isLoading || isCreating
                    ? 'not-allowed'
                    : 'pointer',
                font: 'inherit',
                fontWeight: 700,
                minHeight: '3rem',
                padding: '0 1.25rem',
              }}
              type="submit"
            >
              {isCreating ? 'Creating...' : 'Create Empty Template'}
            </button>
          </form>

          {createErrorMessage ? (
          <p
            role="alert"
            style={{
              color: 'var(--color-danger)',
              margin: 0,
            }}
          >
            {createErrorMessage}
            </p>
          ) : null}
        </section>

        {deleteStatusMessage ? (
          <p
            style={{
              color: 'var(--color-text-secondary)',
              margin: 0,
            }}
          >
            {deleteStatusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p
            role="alert"
            style={{
              color: 'var(--color-danger)',
              margin: 0,
            }}
          >
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <section
            aria-hidden="true"
            style={{
              display: 'grid',
              gap: '1rem',
            }}
          >
            {['loading-type-1', 'loading-type-2'].map((loadingKey) => (
              <div
                key={loadingKey}
                style={{
                  border: '1px solid var(--color-border-subtle)',
                  display: 'grid',
                  gap: '0.75rem',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    background: 'var(--color-bg-surface)',
                    blockSize: '1rem',
                    inlineSize: '9rem',
                  }}
                />
                {[`${loadingKey}-row-1`, `${loadingKey}-row-2`].map((rowKey) => (
                  <div
                    key={rowKey}
                    style={{
                      background: 'var(--color-bg-surface)',
                      blockSize: '4.5rem',
                    }}
                  />
                ))}
              </div>
            ))}
          </section>
        ) : null}

        {!isLoading && !errorMessage && templateGroups.length === 0 ? (
          <section
            style={{
              display: 'grid',
              gap: '0.75rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.1rem',
                margin: 0,
              }}
            >
              No templates yet
            </h2>
            <p style={{ margin: 0 }}>
              Create your first blank template, then add only the frontmatter
              you actually want to keep.
            </p>
          </section>
        ) : null}

        {!isLoading && !errorMessage && templateGroups.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gap: '1rem',
            }}
          >
            {templateGroups.map((templateGroup) => (
              <section
                key={templateGroup.type}
                style={{
                  display: 'grid',
                  gap: '0.875rem',
                }}
              >
                <header
                  style={{
                    alignItems: 'baseline',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    justifyContent: 'space-between',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '1.05rem',
                      margin: 0,
                      textTransform: 'capitalize',
                    }}
                  >
                    {formatTemplateGroupLabel(templateGroup.type)}
                  </h2>
                  <span
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.92rem',
                    }}
                  >
                    {templateGroup.items.length === 1
                      ? '1 template'
                      : `${templateGroup.items.length} templates`}
                  </span>
                </header>

                <div
                  style={{
                    display: 'grid',
                    gap: '0.75rem',
                  }}
                >
                  {templateGroup.items.map((templateItem) => (
                    <div
                      key={templateItem.id}
                      style={{
                        border: '1px solid var(--color-border-subtle)',
                        display: 'grid',
                        gap: '0.45rem',
                        padding: '1rem',
                      }}
                    >
                      <button
                        onClick={() => {
                          void openTemplate(templateItem.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'grid',
                          gap: '0.75rem',
                          padding: 0,
                          textAlign: 'left',
                        }}
                        type="button"
                      >
                        <strong
                          style={{
                            fontSize: '1rem',
                          }}
                        >
                          {formatTemplateTitle(templateItem)}
                        </strong>
                        <span
                          style={{
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.92rem',
                          }}
                        >
                          {formatTemplateMeta(templateItem)}
                        </span>
                        <span
                          style={{
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {formatTemplatePreview(templateItem)}
                        </span>
                      </button>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'end',
                        }}
                      >
                        <button
                          onClick={() => {
                            openDeleteDialog(templateItem);
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--color-border-card)',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            font: 'inherit',
                            fontWeight: 700,
                            minHeight: '2.5rem',
                            padding: '0 0.9rem',
                          }}
                          type="button"
                        >
                          Delete Template
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {pendingDeleteTemplate ? (
          <div
            role="presentation"
            style={{
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.38)',
              display: 'flex',
              inset: 0,
              justifyContent: 'center',
              padding: '1.5rem',
              position: 'fixed',
              zIndex: 30,
            }}
          >
            <section
              aria-modal="true"
              role="alertdialog"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-card)',
                display: 'grid',
                gap: '1rem',
                inlineSize: 'min(32rem, 100%)',
                padding: '1.5rem',
              }}
            >
              <header
                style={{
                  display: 'grid',
                  gap: '0.45rem',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.1rem',
                    margin: 0,
                  }}
                >
                  Delete Template
                </h2>
                <p style={{ margin: 0 }}>
                  Type the exact text{' '}
                  <strong>
                    {getTemplateDeleteConfirmationValue(pendingDeleteTemplate)}
                  </strong>{' '}
                  to move this template to trash. This check is case-sensitive.
                </p>
              </header>

              <form
                onSubmit={(event) => {
                  void handleDeleteTemplate(event);
                }}
                style={{
                  display: 'grid',
                  gap: '1rem',
                }}
              >
                <label
                  style={{
                    display: 'grid',
                    gap: '0.45rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 700,
                    }}
                  >
                    Confirm text
                  </span>
                  <input
                    autoFocus
                    onChange={(event) => {
                      setDeleteConfirmationValue(event.target.value);
                      setDeleteErrorMessage('');
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--color-border-card)',
                      minHeight: '3rem',
                      padding: '0 0.9rem',
                    }}
                    type="text"
                    value={deleteConfirmationValue}
                  />
                </label>

                {deleteErrorMessage ? (
                  <p
                    role="alert"
                    style={{
                      color: 'var(--color-danger)',
                      margin: 0,
                    }}
                  >
                    {deleteErrorMessage}
                  </p>
                ) : null}

                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'end',
                  }}
                >
                  <button
                    onClick={closeDeleteDialog}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--color-border-card)',
                      color: 'inherit',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      font: 'inherit',
                      fontWeight: 700,
                      minHeight: '3rem',
                      padding: '0 1.1rem',
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={
                      isDeleting ||
                      deleteConfirmationValue !==
                        getTemplateDeleteConfirmationValue(pendingDeleteTemplate)
                    }
                    style={{
                      background:
                        isDeleting ||
                        deleteConfirmationValue !==
                          getTemplateDeleteConfirmationValue(
                            pendingDeleteTemplate,
                          )
                          ? 'transparent'
                          : 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border-card)',
                      color:
                        isDeleting ||
                        deleteConfirmationValue !==
                          getTemplateDeleteConfirmationValue(
                            pendingDeleteTemplate,
                          )
                          ? 'var(--color-text-secondary)'
                          : 'var(--color-danger)',
                      cursor:
                        isDeleting ||
                        deleteConfirmationValue !==
                          getTemplateDeleteConfirmationValue(
                            pendingDeleteTemplate,
                          )
                          ? 'not-allowed'
                          : 'pointer',
                      font: 'inherit',
                      fontWeight: 700,
                      minHeight: '3rem',
                      padding: '0 1.1rem',
                    }}
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
