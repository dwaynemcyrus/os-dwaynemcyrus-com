import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import {
  fetchCommandTemplates,
  fetchUnprocessedInboxItems,
  processInboxItem,
} from '../lib/items';
import { getSlashCommands } from '../lib/templates';
import { useAuth } from '../lib/auth';
import { authenticatedRoute } from './_authenticated';

function formatInboxDate(value) {
  if (!value) {
    return 'No capture date';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatInboxPreview(item) {
  if (item.content?.trim()) {
    return item.content.trim();
  }

  if (item.title?.trim()) {
    return item.title.trim();
  }

  return 'No captured content yet.';
}

function formatTemplateMeta(templateItem) {
  const metaParts = [];

  if (templateItem.type) {
    metaParts.push(templateItem.type);
  }

  if (templateItem.subtype) {
    metaParts.push(templateItem.subtype.replaceAll('_', ' '));
  }

  return metaParts.join(' · ');
}

export const inboxRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/inbox',
  validateSearch: (search) => ({
    itemId: typeof search.itemId === 'string' ? search.itemId : undefined,
  }),
  component: function InboxRoute() {
    const auth = useAuth();
    const navigate = inboxRoute.useNavigate();
    const search = inboxRoute.useSearch();
    const [inboxItems, setInboxItems] = useState([]);
    const [templateItems, setTemplateItems] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [processorErrorMessage, setProcessorErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [processorTitle, setProcessorTitle] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const inboxCountLabel = useMemo(() => {
      if (inboxItems.length === 1) {
        return '1 unprocessed item';
      }

      return `${inboxItems.length} unprocessed items`;
    }, [inboxItems.length]);
    const templateOptions = useMemo(
      () =>
        getSlashCommands(templateItems, '')
          .filter((slashCommand) => slashCommand.template)
          .map((slashCommand) => ({
            command: slashCommand.command,
            meta: formatTemplateMeta(slashCommand.template),
            template: slashCommand.template,
          })),
      [templateItems],
    );
    const selectedInboxItem =
      inboxItems.find((item) => item.id === search.itemId) ?? null;
    const selectedInboxItemMissing =
      Boolean(search.itemId) && !selectedInboxItem && !isLoading;

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      setIsLoading(true);
      setErrorMessage('');

      Promise.all([
        fetchUnprocessedInboxItems(auth.user.id),
        fetchCommandTemplates(),
      ])
        .then(([items, templates]) => {
          if (cancelled) {
            return;
          }

          setInboxItems(items);
          setTemplateItems(templates);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setErrorMessage(
            error.message ?? 'Unable to load your inbox right now.',
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
      setProcessorTitle(selectedInboxItem?.title ?? '');
      setSelectedTemplateId('');
      setProcessorErrorMessage('');
    }, [selectedInboxItem?.id, selectedInboxItem?.title]);

    function openProcessor(itemId) {
      void navigate({
        search: {
          itemId,
        },
        to: '/inbox',
      });
    }

    function closeProcessor() {
      void navigate({
        search: {},
        to: '/inbox',
      });
    }

    async function handleProcessSubmit(event) {
      event.preventDefault();

      if (!auth.user?.id || !selectedInboxItem) {
        setProcessorErrorMessage('Select an inbox item to process first.');
        return;
      }

      if (!selectedTemplateId) {
        setProcessorErrorMessage('Choose a target type before processing.');
        return;
      }

      setIsSaving(true);
      setProcessorErrorMessage('');

      try {
        const processedItem = await processInboxItem({
          itemId: selectedInboxItem.id,
          templateId: selectedTemplateId,
          title: processorTitle,
          userId: auth.user.id,
        });

        setInboxItems((currentItems) =>
          currentItems.filter((item) => item.id !== selectedInboxItem.id),
        );

        await navigate({
          params: {
            id: processedItem.id,
          },
          to: '/items/$id',
        });
      } catch (error) {
        setProcessorErrorMessage(
          error.message ?? 'Unable to process that inbox item right now.',
        );
      } finally {
        setIsSaving(false);
      }
    }

    return (
      <section
        style={{
          display: 'grid',
          gap: '1rem',
          maxWidth: '56rem',
        }}
      >
        <header
          style={{
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <h1 style={{ margin: 0 }}>Inbox</h1>
          <p style={{ margin: 0 }}>
            Review captured items before assigning a real type and moving them
            into backlog.
          </p>
          <p
            style={{
              color: '#52606d',
              fontSize: '0.95rem',
              margin: 0,
            }}
          >
            {isLoading ? 'Loading inbox...' : inboxCountLabel}
          </p>
        </header>

        {selectedInboxItem ? (
          <section
            style={{
              background: 'rgba(255, 255, 255, 0.82)',
              border: '1px solid rgba(82, 96, 109, 0.12)',
              borderRadius: '1rem',
              display: 'grid',
              gap: '1rem',
              padding: '1.25rem',
            }}
          >
            <header
              style={{
                alignItems: 'start',
                display: 'flex',
                gap: '1rem',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    margin: 0,
                  }}
                >
                  Process Inbox Item
                </h2>
                <p
                  style={{
                    color: '#52606d',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  Review the captured title and content, then choose the target
                  subtype that should own this item.
                </p>
              </div>

              <button
                onClick={closeProcessor}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(82, 96, 109, 0.18)',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontWeight: 600,
                  minHeight: '2.75rem',
                  padding: '0 1rem',
                }}
                type="button"
              >
                Close
              </button>
            </header>

            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gap: '0.25rem',
                }}
              >
                <span
                  style={{
                    color: '#7c6754',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Captured Title
                </span>
                <p style={{ margin: 0 }}>
                  {selectedInboxItem.title || 'Untitled inbox item'}
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '0.25rem',
                }}
              >
                <span
                  style={{
                    color: '#7c6754',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Captured Content
                </span>
                <p
                  style={{
                    color: '#52606d',
                    lineHeight: 1.6,
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {formatInboxPreview(selectedInboxItem)}
                </p>
              </div>
            </div>

            {processorErrorMessage ? (
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
                {processorErrorMessage}
              </p>
            ) : null}

            <form
              onSubmit={(event) => {
                void handleProcessSubmit(event);
              }}
              style={{
                display: 'grid',
                gap: '1rem',
              }}
            >
              <label
                style={{
                  display: 'grid',
                  gap: '0.5rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                  }}
                >
                  Title
                </span>
                <input
                  onChange={(event) => {
                    setProcessorTitle(event.target.value);
                  }}
                  placeholder="Refine the captured title"
                  style={{
                    background: 'rgba(255, 255, 255, 0.96)',
                    border: '1px solid rgba(82, 96, 109, 0.24)',
                    borderRadius: '0.875rem',
                    color: 'inherit',
                    font: 'inherit',
                    minHeight: '3rem',
                    padding: '0 1rem',
                  }}
                  type="text"
                  value={processorTitle}
                />
              </label>

              <label
                style={{
                  display: 'grid',
                  gap: '0.5rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                  }}
                >
                  Target Type
                </span>
                <select
                  onChange={(event) => {
                    setSelectedTemplateId(event.target.value);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.96)',
                    border: '1px solid rgba(82, 96, 109, 0.24)',
                    borderRadius: '0.875rem',
                    color: 'inherit',
                    font: 'inherit',
                    minHeight: '3rem',
                    padding: '0 1rem',
                  }}
                  value={selectedTemplateId}
                >
                  <option value="">Choose a subtype</option>
                  {templateOptions.map((templateOption) => (
                    <option
                      key={templateOption.template.id}
                      value={templateOption.template.id}
                    >
                      {templateOption.command} · {templateOption.meta}
                    </option>
                  ))}
                </select>
              </label>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <button
                  disabled={isSaving}
                  style={{
                    background:
                      'linear-gradient(135deg, #2f6f51 0%, #25543d 100%)',
                    border: 'none',
                    borderRadius: '0.875rem',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontWeight: 700,
                    minHeight: '3rem',
                    padding: '0 1.25rem',
                  }}
                  type="submit"
                >
                  {isSaving ? 'Processing...' : 'Process to Backlog'}
                </button>

                <button
                  onClick={closeProcessor}
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(82, 96, 109, 0.18)',
                    borderRadius: '0.875rem',
                    color: 'inherit',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontWeight: 600,
                    minHeight: '3rem',
                    padding: '0 1.25rem',
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        ) : selectedInboxItemMissing ? (
          <section
            style={{
              background: 'rgba(255, 255, 255, 0.76)',
              border: '1px solid rgba(82, 96, 109, 0.1)',
              borderRadius: '1rem',
              padding: '1.25rem',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                margin: '0 0 0.5rem',
              }}
            >
              Selected Item Unavailable
            </h2>
            <p
              style={{
                color: '#52606d',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              That capture is no longer waiting in the inbox. Choose another
              item from the list below.
            </p>
          </section>
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
          <div
            aria-hidden="true"
            style={{
              display: 'grid',
              gap: '0.875rem',
            }}
          >
            {['inbox-skeleton-1', 'inbox-skeleton-2', 'inbox-skeleton-3'].map(
              (rowId) => (
                <div
                  key={rowId}
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(220, 211, 200, 0.5) 0%, rgba(245, 241, 236, 0.9) 50%, rgba(220, 211, 200, 0.5) 100%)',
                    backgroundSize: '200% 100%',
                    borderRadius: '1rem',
                    height: '6rem',
                  }}
                />
              ),
            )}
          </div>
        ) : inboxItems.length > 0 ? (
          <ul
            style={{
              display: 'grid',
              gap: '0.875rem',
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {inboxItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    openProcessor(item.id);
                  }}
                  style={{
                    background:
                      search.itemId === item.id
                        ? 'rgba(255, 250, 243, 0.98)'
                        : 'rgba(255, 255, 255, 0.82)',
                    border: '1px solid rgba(82, 96, 109, 0.12)',
                    borderRadius: '1rem',
                    color: 'inherit',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: '0.5rem',
                    padding: '1rem',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  type="button"
                >
                  <span
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                    }}
                  >
                    {item.title || 'Untitled inbox item'}
                  </span>
                  <span
                    style={{
                      color: '#52606d',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {formatInboxPreview(item)}
                  </span>
                  <span
                    style={{
                      color: '#7c6754',
                      fontSize: '0.9rem',
                    }}
                  >
                    Captured {formatInboxDate(item.date_created ?? item.date_modified)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <section
            style={{
              background: 'rgba(255, 255, 255, 0.76)',
              border: '1px solid rgba(82, 96, 109, 0.1)',
              borderRadius: '1rem',
              padding: '1.25rem',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                margin: '0 0 0.5rem',
              }}
            >
              Inbox Clear
            </h2>
            <p
              style={{
                color: '#52606d',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              No unprocessed captures are waiting right now. Use the command
              sheet to capture something new.
            </p>
          </section>
        )}
      </section>
    );
  },
});
