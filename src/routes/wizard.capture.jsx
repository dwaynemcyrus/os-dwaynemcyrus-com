import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { useAppChrome } from '../lib/app-chrome';
import { fetchUnprocessedInboxItems, ITEMS_REFRESH_EVENT } from '../lib/items';
import {
  createSourceFromCapture,
  enrichSourceWithMetadata,
  isLikelyUrl,
} from '../lib/sources';
import { supabase } from '../lib/supabase';
import { authenticatedRoute } from './_authenticated';
import styles from './WizardCaptureRoute.module.css';

function formatCaptureDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

const ACTIONS = [
  {
    id: 'source',
    label: 'Save as Source',
    description: 'Reference material to read, watch, or listen to later.',
    available: true,
    primary: true,
  },
  {
    id: 'task',
    label: 'Add to Tasks',
    description: 'Something you need to do.',
    available: false,
  },
  {
    id: 'note',
    label: 'Save as Note',
    description: 'An idea, thought, or piece of reference writing.',
    available: false,
  },
  {
    id: 'someday',
    label: 'Someday / Maybe',
    description: 'Not now, but worth keeping.',
    available: false,
  },
  {
    id: 'delete',
    label: 'Delete',
    description: 'Remove from inbox. This cannot be undone.',
    available: true,
    danger: true,
  },
];

export const wizardCaptureRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/wizard/capture',
  component: function WizardCaptureRoute() {
    const auth = useAuth();
    const navigate = wizardCaptureRoute.useNavigate();
    const [captures, setCaptures] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [isListOpen, setIsListOpen] = useState(false);

    const moreActions = useMemo(() => [
      {
        id: 'list',
        label: isListOpen ? 'Hide Capture List' : 'View All Captures',
        onSelect() {
          setIsListOpen((v) => !v);
        },
      },
    ], [isListOpen]);

    useAppChrome(
      useMemo(() => ({
        metaText: 'Capture Review',
        moreActions,
      }), [moreActions]),
    );

    useEffect(() => {
      if (!auth.user?.id) return;

      let cancelled = false;

      setIsLoading(true);
      setErrorMessage('');

      fetchUnprocessedInboxItems(auth.user.id)
        .then((data) => {
          if (cancelled) return;
          setCaptures(data);
          setCurrentIndex(0);
        })
        .catch((error) => {
          if (cancelled) return;
          setErrorMessage(error.message ?? 'Unable to load captures right now.');
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [auth.user?.id]);

    useEffect(() => {
      if (!actionMessage) return;
      const t = window.setTimeout(() => setActionMessage(''), 2500);
      return () => window.clearTimeout(t);
    }, [actionMessage]);

    function removeCurrentCapture() {
      setCaptures((prev) => {
        const next = prev.filter((_, i) => i !== currentIndex);
        setCurrentIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
        return next;
      });
    }

    async function handleSaveAsSource() {
      if (!auth.user?.id) return;

      const capture = captures[currentIndex];
      if (!capture) return;

      setIsProcessing(true);
      setErrorMessage('');

      try {
        const rawText = capture.content ?? capture.title ?? '';
        const { sourceId, duplicate } = await createSourceFromCapture({
          captureId: capture.id,
          rawText,
          userId: auth.user.id,
        });

        if (duplicate === 'archived') {
          setActionMessage('Already archived — moved back to Sources inbox.');
        } else if (duplicate === 'existing') {
          setActionMessage('Already in Sources.');
        } else {
          setActionMessage('Saved as source.');

          if (isLikelyUrl(rawText)) {
            enrichSourceWithMetadata(sourceId, auth.user.id, rawText.trim()).catch(() => {});
          }
        }

        window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
        removeCurrentCapture();
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to save as source right now.');
      } finally {
        setIsProcessing(false);
      }
    }

    async function handleDelete() {
      if (!auth.user?.id) return;

      const capture = captures[currentIndex];
      if (!capture) return;

      setIsProcessing(true);

      try {
        const { error } = await supabase
          .from('items')
          .update({ date_trashed: new Date().toISOString() })
          .eq('id', capture.id)
          .eq('user_id', auth.user.id);

        if (error) throw error;

        setActionMessage('Deleted.');
        window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
        removeCurrentCapture();
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to delete capture.');
      } finally {
        setIsProcessing(false);
      }
    }

    function handleAction(actionId) {
      if (actionId === 'source') return handleSaveAsSource();
      if (actionId === 'delete') return handleDelete();
    }

    const currentCapture = captures[currentIndex];
    const total = captures.length;
    const position = total > 0 ? currentIndex + 1 : 0;
    const isDone = !isLoading && total === 0;

    if (isLoading) {
      return (
        <div className={styles.wizardCaptureRoute}>
          <div className={styles.wizardCaptureRoute__skeleton} />
        </div>
      );
    }

    if (isDone) {
      return (
        <div className={styles.wizardCaptureRoute}>
          <div className={styles.wizardCaptureRoute__done}>
            <p className={styles.wizardCaptureRoute__doneTitle}>Inbox zero.</p>
            <p className={styles.wizardCaptureRoute__doneSubtitle}>
              All captures have been processed.
            </p>
            <button
              className={styles.wizardCaptureRoute__doneButton}
              onClick={() => void navigate({ to: '/' })}
              type="button"
            >
              Back to Now
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.wizardCaptureRoute}>
        <header className={styles.wizardCaptureRoute__header}>
          <p className={styles.wizardCaptureRoute__progress}>
            {position} of {total}
          </p>
        </header>

        {actionMessage ? (
          <p className={styles.wizardCaptureRoute__actionMessage} role="status">
            {actionMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className={styles.wizardCaptureRoute__error} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isListOpen ? (
          <section className={styles.wizardCaptureRoute__list}>
            <h2 className={styles.wizardCaptureRoute__listTitle}>
              All Captures ({total})
            </h2>
            <ul className={styles.wizardCaptureRoute__listItems}>
              {captures.map((capture, index) => (
                <li key={capture.id}>
                  <button
                    className={`${styles.wizardCaptureRoute__listItem} ${
                      index === currentIndex
                        ? styles['wizardCaptureRoute__listItem--active']
                        : ''
                    }`}
                    onClick={() => {
                      setCurrentIndex(index);
                      setIsListOpen(false);
                    }}
                    type="button"
                  >
                    <span className={styles.wizardCaptureRoute__listItemText}>
                      {capture.content ?? capture.title ?? 'Empty capture'}
                    </span>
                    <span className={styles.wizardCaptureRoute__listItemDate}>
                      {formatCaptureDate(capture.date_created)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {currentCapture && !isListOpen ? (
          <>
            <div className={styles.wizardCaptureRoute__card}>
              <p className={styles.wizardCaptureRoute__captureText}>
                {currentCapture.content ?? currentCapture.title ?? 'Empty capture'}
              </p>
              {currentCapture.date_created ? (
                <p className={styles.wizardCaptureRoute__captureDate}>
                  Captured {formatCaptureDate(currentCapture.date_created)}
                </p>
              ) : null}
            </div>

            <section className={styles.wizardCaptureRoute__actions}>
              <h2 className={styles.wizardCaptureRoute__actionsTitle}>
                What is this?
              </h2>
              <ul className={styles.wizardCaptureRoute__actionList}>
                {ACTIONS.map((action) => (
                  <li key={action.id}>
                    <button
                      className={`${styles.wizardCaptureRoute__action} ${
                        action.primary ? styles['wizardCaptureRoute__action--primary'] : ''
                      } ${
                        action.danger ? styles['wizardCaptureRoute__action--danger'] : ''
                      } ${
                        !action.available ? styles['wizardCaptureRoute__action--soon'] : ''
                      }`}
                      disabled={isProcessing || !action.available}
                      onClick={() => {
                        if (action.available) void handleAction(action.id);
                      }}
                      type="button"
                    >
                      <span className={styles.wizardCaptureRoute__actionLabel}>
                        {action.label}
                        {!action.available ? (
                          <span className={styles.wizardCaptureRoute__soonBadge}>
                            SOON
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.wizardCaptureRoute__actionDesc}>
                        {action.description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    );
  },
});
