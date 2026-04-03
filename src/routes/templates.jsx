import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import {
  createUserTemplateFromSubtype,
  fetchManagedTemplates,
  trashTemplate,
} from '../lib/items';
import {
  formatSubtypeLabel,
  groupTemplatesByType,
  getTemplateSubtypeOptions,
  isSystemTemplate,
  isUserTemplate,
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
    isSystemTemplate(templateItem) ? 'system template' : 'your template',
  );
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
    const [selectedSubtype, setSelectedSubtype] = useState('');
    const templateGroups = useMemo(
      () => groupTemplatesByType(templateItems),
      [templateItems],
    );
    const templateSubtypeOptions = useMemo(
      () => getTemplateSubtypeOptions(templateItems),
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

      fetchManagedTemplates()
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

    useEffect(() => {
      if (!templateSubtypeOptions.length) {
        setSelectedSubtype('');
        return;
      }

      setSelectedSubtype((currentSubtype) => {
        if (
          currentSubtype &&
          templateSubtypeOptions.some(
            (option) => option.subtype === currentSubtype,
          )
        ) {
          return currentSubtype;
        }

        return templateSubtypeOptions[0].subtype;
      });
    }, [templateSubtypeOptions]);

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

      if (!selectedSubtype) {
        setCreateErrorMessage('Choose a subtype before creating a template.');
        return;
      }

      setIsCreating(true);
      setCreateErrorMessage('');

      try {
        const createdTemplate = await createUserTemplateFromSubtype({
          subtype: selectedSubtype,
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

      if (!isUserTemplate(pendingDeleteTemplate)) {
        setDeleteErrorMessage('System templates cannot be deleted.');
        return;
      }

      if (deleteConfirmationValue !== pendingDeleteTemplate.subtype) {
        setDeleteErrorMessage('Type the exact subtype to confirm deletion.');
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
            Browse system templates and your own custom templates by type. Open
            any template in the existing editor surface to review or refine it.
          </p>
          <p
            style={{
              color: '#52606d',
              fontSize: '0.95rem',
              margin: 0,
            }}
          >
            {isLoading ? 'Loading templates...' : templateCountLabel}
          </p>
        </header>

        <section
          style={{
            background: 'rgba(255, 250, 243, 0.92)',
            border: '1px solid rgba(124, 103, 84, 0.16)',
            borderRadius: '1rem',
            display: 'grid',
            gap: '1rem',
            padding: '1.25rem',
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
              Start from any seeded subtype template, then refine it in the
              editor as your own reusable version.
            </p>
          </header>

          <form
            onSubmit={(event) => {
              void handleCreateTemplate(event);
            }}
            style={{
              alignItems: 'end',
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
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
                Template subtype
              </span>
              <select
                disabled={isLoading || isCreating || templateSubtypeOptions.length === 0}
                onChange={(event) => {
                  setSelectedSubtype(event.target.value);
                  setCreateErrorMessage('');
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.94)',
                  border: '1px solid rgba(82, 96, 109, 0.18)',
                  borderRadius: '0.875rem',
                  color: 'inherit',
                  font: 'inherit',
                  minHeight: '3rem',
                  padding: '0 0.9rem',
                }}
                value={selectedSubtype}
              >
                {templateSubtypeOptions.length === 0 ? (
                  <option value="">No seeded subtypes available</option>
                ) : null}
                {templateSubtypeOptions.map((option) => (
                  <option key={option.subtype} value={option.subtype}>
                    {option.type} · {option.subtypeLabel}
                  </option>
                ))}
              </select>
            </label>

            <button
              disabled={
                isLoading ||
                isCreating ||
                !selectedSubtype ||
                templateSubtypeOptions.length === 0
              }
              style={{
                background:
                  isLoading ||
                  isCreating ||
                  !selectedSubtype ||
                  templateSubtypeOptions.length === 0
                    ? 'rgba(82, 96, 109, 0.18)'
                    : 'linear-gradient(135deg, #2f6f51 0%, #25543d 100%)',
                border: 'none',
                borderRadius: '0.875rem',
                color:
                  isLoading ||
                  isCreating ||
                  !selectedSubtype ||
                  templateSubtypeOptions.length === 0
                    ? '#52606d'
                    : '#f8fafc',
                cursor:
                  isLoading ||
                  isCreating ||
                  !selectedSubtype ||
                  templateSubtypeOptions.length === 0
                    ? 'not-allowed'
                    : 'pointer',
                font: 'inherit',
                fontWeight: 700,
                minHeight: '3rem',
                minWidth: '11rem',
                padding: '0 1.25rem',
              }}
              type="submit"
            >
              {isCreating ? 'Creating...' : 'Create Template'}
            </button>
          </form>

          {createErrorMessage ? (
            <p
              role="alert"
              style={{
                background: 'rgba(186, 73, 73, 0.1)',
                borderRadius: '1rem',
                color: '#8f2d2d',
                margin: 0,
                padding: '1rem',
              }}
            >
              {createErrorMessage}
            </p>
          ) : null}
        </section>

        {deleteStatusMessage ? (
          <p
            style={{
              background: 'rgba(47, 111, 81, 0.12)',
              borderRadius: '1rem',
              color: '#25543d',
              margin: 0,
              padding: '1rem',
            }}
          >
            {deleteStatusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p
            role="alert"
            style={{
              background: 'rgba(186, 73, 73, 0.1)',
              borderRadius: '1rem',
              color: '#8f2d2d',
              margin: 0,
              padding: '1rem',
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
                  background: 'rgba(255, 255, 255, 0.82)',
                  border: '1px solid rgba(82, 96, 109, 0.12)',
                  borderRadius: '1rem',
                  display: 'grid',
                  gap: '0.75rem',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    background: 'rgba(82, 96, 109, 0.12)',
                    blockSize: '1rem',
                    borderRadius: '999px',
                    inlineSize: '9rem',
                  }}
                />
                {[`${loadingKey}-row-1`, `${loadingKey}-row-2`].map((rowKey) => (
                  <div
                    key={rowKey}
                    style={{
                      background: 'rgba(82, 96, 109, 0.08)',
                      blockSize: '4.5rem',
                      borderRadius: '0.875rem',
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
              background: 'rgba(255, 255, 255, 0.82)',
              border: '1px solid rgba(82, 96, 109, 0.12)',
              borderRadius: '1rem',
              display: 'grid',
              gap: '0.75rem',
              padding: '1.25rem',
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
              Seeded templates are missing or you do not have access to them
              yet.
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
                  background: 'rgba(255, 255, 255, 0.82)',
                  border: '1px solid rgba(82, 96, 109, 0.12)',
                  borderRadius: '1rem',
                  display: 'grid',
                  gap: '0.875rem',
                  padding: '1.25rem',
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
                    {templateGroup.type}
                  </h2>
                  <span
                    style={{
                      color: '#52606d',
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
                        background: 'rgba(248, 250, 252, 0.92)',
                        border: '1px solid rgba(82, 96, 109, 0.14)',
                        borderRadius: '0.875rem',
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
                        <div
                          style={{
                            alignItems: 'center',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                            justifyContent: 'space-between',
                          }}
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
                              background: isSystemTemplate(templateItem)
                                ? 'rgba(82, 96, 109, 0.12)'
                                : 'rgba(255, 250, 243, 0.98)',
                              borderRadius: '999px',
                              color: '#243b53',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              padding: '0.25rem 0.65rem',
                            }}
                          >
                            {isSystemTemplate(templateItem)
                              ? 'Read Only'
                              : 'Editable'}
                          </span>
                        </div>
                        <span
                          style={{
                            color: '#52606d',
                            fontSize: '0.92rem',
                          }}
                        >
                          {formatTemplateMeta(templateItem)}
                        </span>
                        <span
                          style={{
                            color: '#243b53',
                          }}
                        >
                          {formatTemplatePreview(templateItem)}
                        </span>
                      </button>
                      {isUserTemplate(templateItem) ? (
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
                              background: 'rgba(186, 73, 73, 0.1)',
                              border: '1px solid rgba(186, 73, 73, 0.18)',
                              borderRadius: '0.75rem',
                              color: '#8f2d2d',
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
                      ) : null}
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
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(82, 96, 109, 0.16)',
                borderRadius: '1.25rem',
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
                  Type the exact subtype <strong>{pendingDeleteTemplate.subtype}</strong>{' '}
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
                    Confirm subtype
                  </span>
                  <input
                    autoFocus
                    onChange={(event) => {
                      setDeleteConfirmationValue(event.target.value);
                      setDeleteErrorMessage('');
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.94)',
                      border: '1px solid rgba(82, 96, 109, 0.18)',
                      borderRadius: '0.875rem',
                      color: 'inherit',
                      font: 'inherit',
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
                      background: 'rgba(186, 73, 73, 0.1)',
                      borderRadius: '1rem',
                      color: '#8f2d2d',
                      margin: 0,
                      padding: '1rem',
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
                      background: 'rgba(255, 255, 255, 0.94)',
                      border: '1px solid rgba(82, 96, 109, 0.18)',
                      borderRadius: '0.875rem',
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
                      deleteConfirmationValue !== pendingDeleteTemplate.subtype
                    }
                    style={{
                      background:
                        isDeleting ||
                        deleteConfirmationValue !== pendingDeleteTemplate.subtype
                          ? 'rgba(82, 96, 109, 0.18)'
                          : 'linear-gradient(135deg, #8f2d2d 0%, #7b2323 100%)',
                      border: 'none',
                      borderRadius: '0.875rem',
                      color:
                        isDeleting ||
                        deleteConfirmationValue !== pendingDeleteTemplate.subtype
                          ? '#52606d'
                          : '#f8fafc',
                      cursor:
                        isDeleting ||
                        deleteConfirmationValue !== pendingDeleteTemplate.subtype
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
