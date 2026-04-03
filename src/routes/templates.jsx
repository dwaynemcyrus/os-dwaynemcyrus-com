import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { fetchManagedTemplates } from '../lib/items';
import {
  formatSubtypeLabel,
  groupTemplatesByType,
  isSystemTemplate,
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
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
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

    async function openTemplate(templateId) {
      await navigate({
        params: {
          id: templateId,
        },
        to: '/items/$id',
      });
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
              yet. Template creation lands in the next chunk.
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
                    <button
                      key={templateItem.id}
                      onClick={() => {
                        void openTemplate(templateItem.id);
                      }}
                      style={{
                        background: 'rgba(248, 250, 252, 0.92)',
                        border: '1px solid rgba(82, 96, 109, 0.14)',
                        borderRadius: '0.875rem',
                        color: 'inherit',
                        cursor: 'pointer',
                        display: 'grid',
                        gap: '0.45rem',
                        padding: '1rem',
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
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </section>
    );
  },
});
