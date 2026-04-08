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

function writeItemHistory(itemId, userId, content, changeType, frontmatter) {
  supabase
    .from('item_history')
    .insert({
      item_id: itemId,
      user_id: userId,
      content: content ?? '',
      change_type: changeType,
      frontmatter: frontmatter ?? null,
    })
    .then(() => {})
    .catch(() => {});
}

// GTD decision tree — each step is one question with a set of options.
// option.next   → advance to that step
// option.action → terminal: execute an action and process the capture
// option.soon   → disabled, shown with SOON badge, no navigation
const STEP_TREE = {
  actionable: {
    question: 'Is this actionable?',
    subtitle: 'Do you need to do something about this?',
    back: 'review',
    options: [
      {
        id: 'no',
        label: 'No — not actionable',
        description: 'Trash it, file it away, or save for someday.',
        next: 'not-actionable',
      },
      {
        id: 'yes',
        label: 'Yes — I need to act on this',
        description: 'Do it now, delegate it, or defer it to your task list.',
        next: 'actionable-yes',
      },
    ],
  },
  'not-actionable': {
    question: 'What do you want to do with it?',
    subtitle: null,
    back: 'actionable',
    options: [
      {
        id: 'trash',
        label: 'Trash',
        description: 'Remove it completely.',
        action: 'delete',
      },
      {
        id: 'someday',
        label: 'Someday / Maybe',
        description: 'Not now, but worth keeping.',
        soon: true,
      },
      {
        id: 'reference',
        label: 'Reference',
        description: 'Save it to read, watch, or look back on.',
        next: 'reference',
      },
    ],
  },
  reference: {
    question: 'What kind of reference?',
    subtitle: null,
    back: 'not-actionable',
    options: [
      {
        id: 'source',
        label: 'Source',
        description: 'Something to read, watch, or listen to.',
        action: 'source',
        primary: true,
      },
      {
        id: 'note',
        label: 'Note',
        description: 'An idea, piece of writing, or reference note.',
        soon: true,
      },
    ],
  },
  'actionable-yes': {
    question: "What's the next action?",
    subtitle: null,
    back: 'actionable',
    options: [
      {
        id: 'do-now',
        label: 'Do it now',
        description: 'It takes less than two minutes.',
        soon: true,
      },
      {
        id: 'delegate',
        label: 'Delegate',
        description: 'Assign it to someone else.',
        soon: true,
      },
      {
        id: 'defer',
        label: 'Defer',
        description: 'Add it to your task list.',
        soon: true,
      },
    ],
  },
};

const FIRST_STEP = 'review';

export const wizardCaptureRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/wizard/capture',
  component: function WizardCaptureRoute() {
    const auth = useAuth();
    const navigate = wizardCaptureRoute.useNavigate();
    const [captures, setCaptures] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [step, setStep] = useState(FIRST_STEP);
    const [titleDraft, setTitleDraft] = useState('');
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
          setStep(FIRST_STEP);
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
      const capture = captures[currentIndex];
      if (!capture) {
        setTitleDraft('');
        return;
      }
      setTitleDraft(capture.title || capture.content?.slice(0, 80) || '');
    }, [captures, currentIndex]);

    useEffect(() => {
      if (!actionMessage) return;
      const t = window.setTimeout(() => setActionMessage(''), 2500);
      return () => window.clearTimeout(t);
    }, [actionMessage]);

    function advanceToNext() {
      setCaptures((prev) => {
        const next = prev.filter((_, i) => i !== currentIndex);
        setCurrentIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
        return next;
      });
      setStep(FIRST_STEP);
      setErrorMessage('');
    }

    function handleStepBack() {
      const currentStep = STEP_TREE[step];
      if (currentStep?.back) {
        setStep(currentStep.back);
        setErrorMessage('');
      }
    }

    async function handleKeep() {
      if (!auth.user?.id) return;

      const capture = captures[currentIndex];
      if (!capture) return;

      setIsProcessing(true);
      setErrorMessage('');

      try {
        const title = titleDraft.trim() || capture.content?.slice(0, 80) || '';

        if (title !== (capture.title || '')) {
          const { error } = await supabase
            .from('items')
            .update({ title })
            .eq('id', capture.id)
            .eq('user_id', auth.user.id);
          if (error) throw error;
        }

        writeItemHistory(capture.id, auth.user.id, capture.content, 'updated', { title });

        setStep('actionable');
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to keep capture.');
      } finally {
        setIsProcessing(false);
      }
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

        writeItemHistory(capture.id, auth.user.id, capture.content, 'updated', {
          processed_as: 'source',
        });

        window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
        advanceToNext();
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

        writeItemHistory(capture.id, auth.user.id, capture.content, 'trashed', null);

        setActionMessage('Deleted.');
        window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
        advanceToNext();
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to delete capture.');
      } finally {
        setIsProcessing(false);
      }
    }

    function handleOption(option) {
      if (option.soon) return;
      if (option.next) {
        setStep(option.next);
        return;
      }
      if (option.action === 'source') void handleSaveAsSource();
      if (option.action === 'delete') void handleDelete();
    }

    const currentCapture = captures[currentIndex];
    const total = captures.length;
    const position = total > 0 ? currentIndex + 1 : 0;
    const isDone = !isLoading && total === 0;
    const currentStep = STEP_TREE[step];

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
          <button
            className={styles.wizardCaptureRoute__stopButton}
            onClick={() => void navigate({ to: '/' })}
            type="button"
          >
            Stop
          </button>
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
                      setStep(FIRST_STEP);
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

            {step === 'review' ? (
              <section className={styles.wizardCaptureRoute__step}>
                <header className={styles.wizardCaptureRoute__stepHeader}>
                  <h2 className={styles.wizardCaptureRoute__stepQuestion}>
                    Set a title
                  </h2>
                  <p className={styles.wizardCaptureRoute__stepSubtitle}>
                    Give this capture a short, clear title before processing it.
                  </p>
                </header>

                <div className={styles.wizardCaptureRoute__titleField}>
                  <label
                    className={styles.wizardCaptureRoute__titleLabel}
                    htmlFor="wizard-title"
                  >
                    Title
                  </label>
                  <input
                    className={styles.wizardCaptureRoute__titleInput}
                    disabled={isProcessing}
                    id="wizard-title"
                    onChange={(e) => setTitleDraft(e.target.value)}
                    type="text"
                    value={titleDraft}
                  />
                </div>

                <ul className={styles.wizardCaptureRoute__optionList}>
                  <li>
                    <button
                      className={`${styles.wizardCaptureRoute__option} ${styles['wizardCaptureRoute__option--primary']}`}
                      disabled={isProcessing}
                      onClick={() => void handleKeep()}
                      type="button"
                    >
                      <span className={styles.wizardCaptureRoute__optionLabel}>
                        Keep
                      </span>
                      <span className={styles.wizardCaptureRoute__optionDesc}>
                        Save the title and continue processing.
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      className={`${styles.wizardCaptureRoute__option} ${styles['wizardCaptureRoute__option--danger']}`}
                      disabled={isProcessing}
                      onClick={() => void handleDelete()}
                      type="button"
                    >
                      <span className={styles.wizardCaptureRoute__optionLabel}>
                        Delete
                      </span>
                      <span className={styles.wizardCaptureRoute__optionDesc}>
                        Remove it completely.
                      </span>
                    </button>
                  </li>
                </ul>
              </section>
            ) : (
              <section className={styles.wizardCaptureRoute__step}>
                <header className={styles.wizardCaptureRoute__stepHeader}>
                  {currentStep?.back ? (
                    <button
                      className={styles.wizardCaptureRoute__backButton}
                      onClick={handleStepBack}
                      type="button"
                    >
                      ← Back
                    </button>
                  ) : null}
                  <h2 className={styles.wizardCaptureRoute__stepQuestion}>
                    {currentStep?.question}
                  </h2>
                  {currentStep?.subtitle ? (
                    <p className={styles.wizardCaptureRoute__stepSubtitle}>
                      {currentStep.subtitle}
                    </p>
                  ) : null}
                </header>

                <ul className={styles.wizardCaptureRoute__optionList}>
                  {currentStep?.options.map((option) => (
                    <li key={option.id}>
                      <button
                        className={`${styles.wizardCaptureRoute__option} ${
                          option.primary ? styles['wizardCaptureRoute__option--primary'] : ''
                        } ${
                          option.action === 'delete' ? styles['wizardCaptureRoute__option--danger'] : ''
                        } ${
                          option.soon ? styles['wizardCaptureRoute__option--soon'] : ''
                        }`}
                        disabled={isProcessing || Boolean(option.soon)}
                        onClick={() => handleOption(option)}
                        type="button"
                      >
                        <span className={styles.wizardCaptureRoute__optionLabel}>
                          {option.label}
                          {option.soon ? (
                            <span className={styles.wizardCaptureRoute__soonBadge}>
                              SOON
                            </span>
                          ) : null}
                        </span>
                        <span className={styles.wizardCaptureRoute__optionDesc}>
                          {option.description}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : null}
      </div>
    );
  },
});
