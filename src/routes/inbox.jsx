import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import {
  fetchCommandTemplates,
  fetchUnprocessedInboxItems,
  processInboxItem,
} from '../lib/items';
import { useAuth } from '../lib/auth';
import {
  buildTitleFromFilename,
  getItemDisplayLabel,
} from '../lib/filenames';
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

  return getItemDisplayLabel(item, 'No captured content yet.');
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
    const [processorFilename, setProcessorFilename] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const inboxCountLabel = useMemo(() => {
      if (inboxItems.length === 1) {
        return '1 unprocessed item';
      }

      return `${inboxItems.length} unprocessed items`;
    }, [inboxItems.length]);
    const templateOptions = useMemo(
      () =>
        templateItems
          .filter((templateItem) => templateItem.subtype?.trim())
          .map((templateItem) => ({
            command: templateItem.subtype.trim(),
            meta: formatTemplateMeta(templateItem),
            template: templateItem,
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
        fetchCommandTemplates(auth.user.id),
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
      setProcessorFilename(
        buildTitleFromFilename(
          selectedInboxItem?.filename,
          selectedInboxItem?.title ?? '',
        ),
      );
      setSelectedTemplateId('');
      setProcessorErrorMessage('');
    }, [selectedInboxItem?.filename, selectedInboxItem?.id, selectedInboxItem?.title]);

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
        setProcessorErrorMessage(
          templateOptions.length === 0
            ? 'Create a user template with a matching subtype before processing inbox items.'
            : 'Choose a target type before processing.',
        );
        return;
      }

      setIsSaving(true);
      setProcessorErrorMessage('');

      try {
        const processedItem = await processInboxItem({
          filenameInput: processorFilename,
          itemId: selectedInboxItem.id,
          templateId: selectedTemplateId,
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
              color: 'var(--color-text-secondary)',
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
              display: 'grid',
              gap: '1rem',
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
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  Review the captured filename and content, then choose the target
                  subtype that should own this item.
                </p>
              </div>

              <button
                onClick={closeProcessor}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border-card)',
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
                    color: 'var(--color-text-muted)',
                    fontSize: '0.9rem',
                  }}
                >
                  Captured Filename
                </span>
                <p style={{ margin: 0 }}>
                  {getItemDisplayLabel(selectedInboxItem, 'Untitled inbox item')}
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
                    color: 'var(--color-text-muted)',
                    fontSize: '0.9rem',
                  }}
                >
                  Captured Content
                </span>
                <p
                  style={{
                    color: 'var(--color-text-secondary)',
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
                  color: 'var(--color-danger)',
                  margin: 0,
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
                  Filename
                </span>
                <input
                  onChange={(event) => {
                    setProcessorFilename(event.target.value);
                  }}
                  placeholder="Refine the filename"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-border-card)',
                    minHeight: '3rem',
                    padding: '0 1rem',
                  }}
                  type="text"
                  value={processorFilename}
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
                {templateOptions.length === 0 ? (
                  <p
                    style={{
                      color: 'var(--color-text-secondary)',
                      margin: 0,
                    }}
                  >
                    No user templates are available yet. Create one with the
                    subtype you want before processing inbox items.
                  </p>
                ) : null}
                <select
                  disabled={templateOptions.length === 0}
                  onChange={(event) => {
                    setSelectedTemplateId(event.target.value);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-border-card)',
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
                  disabled={isSaving || templateOptions.length === 0}
                  style={{
                    background:
                      isSaving || templateOptions.length === 0
                        ? 'transparent'
                        : 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border-card)',
                    color:
                      isSaving || templateOptions.length === 0
                        ? 'var(--color-text-secondary)'
                        : 'var(--color-text-primary)',
                    cursor:
                      isSaving || templateOptions.length === 0
                        ? 'not-allowed'
                        : 'pointer',
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
                    background: 'transparent',
                    border: '1px solid var(--color-border-card)',
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
            style={{}}
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
                color: 'var(--color-text-secondary)',
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
              color: 'var(--color-danger)',
              margin: 0,
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
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border-subtle)',
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
                        ? 'var(--color-bg-surface)'
                        : 'transparent',
                    border:
                      search.itemId === item.id
                        ? '1px solid var(--color-border-card)'
                        : '1px solid var(--color-border-subtle)',
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
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {formatInboxPreview(item)}
                  </span>
                  <span
                    style={{
                      color: 'var(--color-text-muted)',
                      fontSize: '0.88rem',
                    }}
                  >
                    Captured {formatInboxDate(item.date_created ?? item.date_modified)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <section>
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
                color: 'var(--color-text-secondary)',
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
