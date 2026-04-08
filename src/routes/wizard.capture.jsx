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
        label: 'View All Captures',
        onSelect() {
          setIsListOpen((v) => !v);
        },
      },
    ], []);

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

    function advance() {
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
          setActionMessage('This source was already archived. Moved it back to inbox.');
        } else if (duplicate === 'existing') {
          setActionMessage('This source is already saved.');
        } else {
          setActionMessage('Saved as source.');

          if (isLikelyUrl(rawText)) {
            enrichSourceWithMetadata(sourceId, auth.user.id, rawText.trim()).catch(() => {});
          }
        }

        window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
        advance();
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to save as source right now.');
      } finally {
        setIsProcessing(false);
      }
    }

    async function handleSkip() {
      setActionMessage('Skipped.');
      advance();
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
        advance();
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to delete capture.');
      } finally {
        setIsProcessing(false);
      }
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
            <p className={styles.wizardCaptureRoute__doneTitle}>All caught up.</p>
            <p className={styles.wizardCaptureRoute__doneSubtitle}>
              No captures left to review.
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
        ) : null}

        {!isListOpen ? (
          <div className={styles.wizardCaptureRoute__actions}>
            <button
              className={`${styles.wizardCaptureRoute__action} ${styles['wizardCaptureRoute__action--primary']}`}
              disabled={isProcessing}
              onClick={() => void handleSaveAsSource()}
              type="button"
            >
              {isProcessing ? 'Saving...' : 'Save as Source'}
            </button>
            <button
              className={styles.wizardCaptureRoute__action}
              disabled={isProcessing}
              onClick={() => void handleSkip()}
              type="button"
            >
              Skip
            </button>
            <button
              className={`${styles.wizardCaptureRoute__action} ${styles['wizardCaptureRoute__action--danger']}`}
              disabled={isProcessing}
              onClick={() => void handleDelete()}
              type="button"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    );
  },
});
