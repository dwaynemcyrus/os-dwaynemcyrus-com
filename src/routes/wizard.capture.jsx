import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { useAppChrome } from '../lib/app-chrome';
import { fetchUnprocessedInboxItems, ITEMS_REFRESH_EVENT } from '../lib/items';
import { normalizeFilenameValue } from '../lib/frontmatter';
import {
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

const EMPTY_SELECTIONS = {
  type: null,
  subtype: null,
  medium: null,
  url: '',
  author: '',
  area: null,
  workbench: false,
};

// GTD decision tree — option-list steps only.
// Special steps (review, source-url, source-author, area-assign,
// workbench-toggle, confirm) are rendered inline.
//
// option.select → merge into selections state before advancing
// option.next   → advance to that step (pushes history)
// option.action → terminal: 'delete' | 'back'
// option.soon   → disabled, shown with SOON badge
const STEP_TREE = {
  actionable: {
    question: 'Is this actionable?',
    subtitle: 'Do you need to do something about this?',
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
    question: 'What is this?',
    subtitle: null,
    options: [
      {
        id: 'consume',
        label: 'Something to consume',
        description: 'Articles, books, videos, tweets, podcasts.',
        next: 'consume-type',
        primary: true,
      },
      {
        id: 'journal',
        label: 'A spiritual or personal journal entry',
        description: 'Istikarah, dream, scratch thought.',
        soon: true,
      },
      {
        id: 'track',
        label: 'Something to track over time',
        description: 'A contact, goal, outreach log.',
        soon: true,
      },
      {
        id: 'reference',
        label: 'Reference material',
        description: 'A note, idea, quote, principle, guide.',
        soon: true,
      },
      {
        id: 'someday',
        label: 'Someday / Maybe',
        description: 'I might want to do this one day.',
        soon: true,
      },
      {
        id: 'trash',
        label: 'Trash',
        description: "I don't need this.",
        next: 'trash-confirm',
      },
    ],
  },
  'consume-type': {
    question: 'What kind of source is this?',
    subtitle: null,
    options: [
      {
        id: 'article',
        label: 'Article',
        description: 'A written piece to read.',
        select: { type: 'reference', subtype: 'source', medium: 'article' },
        next: 'source-url',
        primary: true,
      },
      {
        id: 'video',
        label: 'Video',
        description: 'A video to watch.',
        select: { type: 'reference', subtype: 'source', medium: 'video' },
        next: 'source-url',
      },
      {
        id: 'podcast',
        label: 'Podcast',
        description: 'A podcast episode to listen to.',
        select: { type: 'reference', subtype: 'source', medium: 'podcast' },
        next: 'source-url',
      },
      {
        id: 'book',
        label: 'Book',
        description: 'A book to read.',
        select: { type: 'reference', subtype: 'source', medium: 'book' },
        next: 'source-url',
      },
      {
        id: 'post',
        label: 'Post',
        description: 'A social media post.',
        select: { type: 'reference', subtype: 'source', medium: 'post' },
        next: 'source-url',
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Another kind of content.',
        select: { type: 'reference', subtype: 'source', medium: 'other' },
        next: 'source-url',
      },
    ],
  },
  'trash-confirm': {
    question: 'Are you sure?',
    subtitle: 'This moves it to trash. You can restore it later.',
    options: [
      {
        id: 'confirm-trash',
        label: 'Yes — Move to Trash',
        description: '',
        action: 'delete',
      },
      {
        id: 'cancel',
        label: 'No — Go Back',
        description: '',
        action: 'back',
      },
    ],
  },
  'actionable-yes': {
    question: "What's the next action?",
    subtitle: null,
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
    const [stepHistory, setStepHistory] = useState([]);
    const [titleDraft, setTitleDraft] = useState('');
    const [urlDraft, setUrlDraft] = useState('');
    const [authorDraft, setAuthorDraft] = useState('');
    const [selections, setSelections] = useState(EMPTY_SELECTIONS);
    const [areaItems, setAreaItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingAreas, setIsLoadingAreas] = useState(false);
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
          setStepHistory([]);
          setSelections(EMPTY_SELECTIONS);
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

    // Sync title draft when capture changes
    useEffect(() => {
      const capture = captures[currentIndex];
      if (!capture) {
        setTitleDraft('');
        return;
      }
      setTitleDraft(capture.title || capture.content?.slice(0, 80) || '');
    }, [captures, currentIndex]);

    // Pre-fill URL draft from capture content when entering source-url step
    useEffect(() => {
      if (step !== 'source-url') return;
      const capture = captures[currentIndex];
      if (!capture) return;
      const rawText = (capture.content ?? '').trim();
      setUrlDraft(isLikelyUrl(rawText) ? rawText : (selections.url || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    // Load area items when entering area-assign step
    useEffect(() => {
      if (step !== 'area-assign' || !auth.user?.id) return;

      let cancelled = false;
      setIsLoadingAreas(true);

      supabase
        .from('items')
        .select('id,title,filename')
        .eq('user_id', auth.user.id)
        .eq('type', 'review')
        .eq('subtype', 'area')
        .is('date_trashed', null)
        .order('title', { ascending: true })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (!error) setAreaItems(data ?? []);
          setIsLoadingAreas(false);
        });

      return () => { cancelled = true; };
    }, [step, auth.user?.id]);

    useEffect(() => {
      if (!actionMessage) return;
      const t = window.setTimeout(() => setActionMessage(''), 2500);
      return () => window.clearTimeout(t);
    }, [actionMessage]);

    function advanceStep(nextStep) {
      setStepHistory((prev) => [...prev, step]);
      setStep(nextStep);
      setErrorMessage('');
    }

    function goBack() {
      setStepHistory((prev) => {
        const next = [...prev];
        const prevStep = next.pop() ?? FIRST_STEP;
        setStep(prevStep);
        return next;
      });
      setErrorMessage('');
    }

    function advanceToNext() {
      setCaptures((prev) => {
        const next = prev.filter((_, i) => i !== currentIndex);
        setCurrentIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
        return next;
      });
      setStep(FIRST_STEP);
      setStepHistory([]);
      setSelections(EMPTY_SELECTIONS);
      setUrlDraft('');
      setAuthorDraft('');
      setErrorMessage('');
    }

    async function handleKeep() {
      if (!auth.user?.id) return;

      const capture = captures[currentIndex];
      if (!capture) return;

      setIsProcessing(true);
      setErrorMessage('');

      try {
        const title = titleDraft.trim() || capture.content?.slice(0, 80) || '';
        let filename = null;
        try { filename = normalizeFilenameValue(title); } catch { /* noop */ }

        const titleChanged = title !== (capture.title || '');
        const filenameChanged = filename && filename !== (capture.filename || '');

        if (titleChanged || filenameChanged) {
          const updatePayload = { title };
          if (filename) updatePayload.filename = filename;

          const { error } = await supabase
            .from('items')
            .update(updatePayload)
            .eq('id', capture.id)
            .eq('user_id', auth.user.id);
          if (error) throw error;
        }

        writeItemHistory(capture.id, auth.user.id, capture.content, 'updated', { title });

        advanceStep('actionable');
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to keep capture.');
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

    async function handleFinalSave() {
      if (!auth.user?.id) return;

      const capture = captures[currentIndex];
      if (!capture) return;

      setIsProcessing(true);
      setErrorMessage('');

      try {
        const now = new Date().toISOString();
        const updatePayload = {
          type: selections.type,
          subtype: selections.subtype,
          status: 'backlog',
          workbench: selections.workbench,
          date_modified: now,
        };

        if (selections.medium) updatePayload.source_type = selections.medium;

        const urlTrimmed = selections.url?.trim() || '';
        if (urlTrimmed) updatePayload.url = urlTrimmed;

        if (selections.author?.trim()) updatePayload.author = selections.author.trim();

        if (selections.area) {
          updatePayload.area = `[[${selections.area.title}]]`;
        }

        const { error } = await supabase
          .from('items')
          .update(updatePayload)
          .eq('id', capture.id)
          .eq('user_id', auth.user.id);

        if (error) throw error;

        if (urlTrimmed && isLikelyUrl(urlTrimmed)) {
          enrichSourceWithMetadata(capture.id, auth.user.id, urlTrimmed).catch(() => {});
        }

        writeItemHistory(capture.id, auth.user.id, capture.content, 'updated', {
          type: selections.type,
          subtype: selections.subtype,
          medium: selections.medium || null,
        });

        window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
        setStepHistory([]);
        setStep('confirm');
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to save.');
      } finally {
        setIsProcessing(false);
      }
    }

    function handleOption(option) {
      if (option.soon) return;
      if (option.select) {
        setSelections((prev) => ({ ...prev, ...option.select }));
      }
      if (option.action === 'back') { goBack(); return; }
      if (option.action === 'delete') { void handleDelete(); return; }
      if (option.next) {
        advanceStep(option.next);
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

    function renderStepSection() {
      // ── Review (Step 0) ──────────────────────────────────────────────
      if (step === 'review') {
        return (
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
                  <span className={styles.wizardCaptureRoute__optionLabel}>Keep</span>
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
                  <span className={styles.wizardCaptureRoute__optionLabel}>Delete</span>
                  <span className={styles.wizardCaptureRoute__optionDesc}>
                    Remove it completely.
                  </span>
                </button>
              </li>
            </ul>
          </section>
        );
      }

      // ── Source URL input ─────────────────────────────────────────────
      if (step === 'source-url') {
        return (
          <section className={styles.wizardCaptureRoute__step}>
            <header className={styles.wizardCaptureRoute__stepHeader}>
              {stepHistory.length > 0 ? (
                <button
                  className={styles.wizardCaptureRoute__backButton}
                  onClick={goBack}
                  type="button"
                >
                  ← Back
                </button>
              ) : null}
              <h2 className={styles.wizardCaptureRoute__stepQuestion}>
                URL or link?
              </h2>
              <p className={styles.wizardCaptureRoute__stepSubtitle}>
                Optional — paste a link if available.
              </p>
            </header>

            <div className={styles.wizardCaptureRoute__titleField}>
              <label
                className={styles.wizardCaptureRoute__titleLabel}
                htmlFor="wizard-url"
              >
                URL
              </label>
              <input
                className={styles.wizardCaptureRoute__titleInput}
                disabled={isProcessing}
                id="wizard-url"
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://"
                type="url"
                value={urlDraft}
              />
            </div>

            <div className={styles.wizardCaptureRoute__inputActions}>
              <button
                className={styles.wizardCaptureRoute__nextButton}
                disabled={isProcessing}
                onClick={() => {
                  setSelections((prev) => ({ ...prev, url: urlDraft.trim() }));
                  advanceStep('source-author');
                }}
                type="button"
              >
                Next →
              </button>
              <button
                className={styles.wizardCaptureRoute__skipButton}
                disabled={isProcessing}
                onClick={() => {
                  setSelections((prev) => ({ ...prev, url: '' }));
                  advanceStep('source-author');
                }}
                type="button"
              >
                Skip
              </button>
            </div>
          </section>
        );
      }

      // ── Source author input ──────────────────────────────────────────
      if (step === 'source-author') {
        return (
          <section className={styles.wizardCaptureRoute__step}>
            <header className={styles.wizardCaptureRoute__stepHeader}>
              {stepHistory.length > 0 ? (
                <button
                  className={styles.wizardCaptureRoute__backButton}
                  onClick={goBack}
                  type="button"
                >
                  ← Back
                </button>
              ) : null}
              <h2 className={styles.wizardCaptureRoute__stepQuestion}>
                Author?
              </h2>
              <p className={styles.wizardCaptureRoute__stepSubtitle}>
                Optional — who created this?
              </p>
            </header>

            <div className={styles.wizardCaptureRoute__titleField}>
              <label
                className={styles.wizardCaptureRoute__titleLabel}
                htmlFor="wizard-author"
              >
                Author
              </label>
              <input
                className={styles.wizardCaptureRoute__titleInput}
                disabled={isProcessing}
                id="wizard-author"
                onChange={(e) => setAuthorDraft(e.target.value)}
                placeholder="Name"
                type="text"
                value={authorDraft}
              />
            </div>

            <div className={styles.wizardCaptureRoute__inputActions}>
              <button
                className={styles.wizardCaptureRoute__nextButton}
                disabled={isProcessing}
                onClick={() => {
                  setSelections((prev) => ({ ...prev, author: authorDraft.trim() }));
                  advanceStep('area-assign');
                }}
                type="button"
              >
                Next →
              </button>
              <button
                className={styles.wizardCaptureRoute__skipButton}
                disabled={isProcessing}
                onClick={() => {
                  setSelections((prev) => ({ ...prev, author: '' }));
                  advanceStep('area-assign');
                }}
                type="button"
              >
                Skip
              </button>
            </div>
          </section>
        );
      }

      // ── Area assignment ──────────────────────────────────────────────
      if (step === 'area-assign') {
        return (
          <section className={styles.wizardCaptureRoute__step}>
            <header className={styles.wizardCaptureRoute__stepHeader}>
              {stepHistory.length > 0 ? (
                <button
                  className={styles.wizardCaptureRoute__backButton}
                  onClick={goBack}
                  type="button"
                >
                  ← Back
                </button>
              ) : null}
              <h2 className={styles.wizardCaptureRoute__stepQuestion}>
                Which area does this belong to?
              </h2>
            </header>

            {isLoadingAreas ? (
              <div className={styles.wizardCaptureRoute__skeleton} style={{ blockSize: '4rem' }} />
            ) : (
              <ul className={styles.wizardCaptureRoute__optionList}>
                <li>
                  <button
                    className={`${styles.wizardCaptureRoute__option} ${
                      selections.area === null ? styles['wizardCaptureRoute__option--primary'] : ''
                    }`}
                    disabled={isProcessing}
                    onClick={() => {
                      setSelections((prev) => ({ ...prev, area: null }));
                      advanceStep('workbench-toggle');
                    }}
                    type="button"
                  >
                    <span className={styles.wizardCaptureRoute__optionLabel}>
                      No specific area
                    </span>
                  </button>
                </li>
                {areaItems.map((area) => (
                  <li key={area.id}>
                    <button
                      className={`${styles.wizardCaptureRoute__option} ${
                        selections.area?.id === area.id
                          ? styles['wizardCaptureRoute__option--primary']
                          : ''
                      }`}
                      disabled={isProcessing}
                      onClick={() => {
                        setSelections((prev) => ({ ...prev, area }));
                        advanceStep('workbench-toggle');
                      }}
                      type="button"
                    >
                      <span className={styles.wizardCaptureRoute__optionLabel}>
                        {area.title || area.filename || 'Untitled area'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      }

      // ── Workbench toggle ─────────────────────────────────────────────
      if (step === 'workbench-toggle') {
        return (
          <section className={styles.wizardCaptureRoute__step}>
            <header className={styles.wizardCaptureRoute__stepHeader}>
              {stepHistory.length > 0 ? (
                <button
                  className={styles.wizardCaptureRoute__backButton}
                  onClick={goBack}
                  type="button"
                >
                  ← Back
                </button>
              ) : null}
              <h2 className={styles.wizardCaptureRoute__stepQuestion}>
                Add to workbench?
              </h2>
              <p className={styles.wizardCaptureRoute__stepSubtitle}>
                Workbench items appear on your home screen for active focus.
              </p>
            </header>

            <div className={styles.wizardCaptureRoute__workbenchRow}>
              <input
                checked={selections.workbench}
                className={styles.wizardCaptureRoute__workbenchCheck}
                id="wizard-workbench"
                onChange={(e) => {
                  setSelections((prev) => ({ ...prev, workbench: e.target.checked }));
                }}
                type="checkbox"
              />
              <label
                className={styles.wizardCaptureRoute__workbenchCheckLabel}
                htmlFor="wizard-workbench"
              >
                Yes — add to workbench
              </label>
            </div>

            <button
              className={styles.wizardCaptureRoute__nextButton}
              disabled={isProcessing}
              onClick={() => void handleFinalSave()}
              type="button"
            >
              Save and continue →
            </button>
          </section>
        );
      }

      // ── Confirmation screen ──────────────────────────────────────────
      if (step === 'confirm') {
        const subtypeLabel = selections.medium
          ? `${selections.medium.charAt(0).toUpperCase()}${selections.medium.slice(1)}`
          : selections.subtype ?? '';

        return (
          <section className={styles.wizardCaptureRoute__confirm}>
            <p className={styles.wizardCaptureRoute__confirmTitle}>✓ Saved</p>
            <dl className={styles.wizardCaptureRoute__confirmMeta}>
              {subtypeLabel ? (
                <div>
                  <dt>Type</dt>
                  <dd>{subtypeLabel}</dd>
                </div>
              ) : null}
              <div>
                <dt>Area</dt>
                <dd>{selections.area?.title ?? 'None'}</dd>
              </div>
              {selections.workbench ? (
                <div>
                  <dt>Workbench</dt>
                  <dd>Yes</dd>
                </div>
              ) : null}
            </dl>
            <div className={styles.wizardCaptureRoute__confirmActions}>
              <button
                className={styles.wizardCaptureRoute__nextButton}
                onClick={advanceToNext}
                type="button"
              >
                Next item →
              </button>
              <button
                className={styles.wizardCaptureRoute__skipButton}
                onClick={() => void navigate({ to: '/' })}
                type="button"
              >
                Stop processing
              </button>
            </div>
          </section>
        );
      }

      // ── STEP_TREE option-list steps ──────────────────────────────────
      const currentStep = STEP_TREE[step];

      return (
        <section className={styles.wizardCaptureRoute__step}>
          <header className={styles.wizardCaptureRoute__stepHeader}>
            {stepHistory.length > 0 ? (
              <button
                className={styles.wizardCaptureRoute__backButton}
                onClick={goBack}
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
                  {option.description ? (
                    <span className={styles.wizardCaptureRoute__optionDesc}>
                      {option.description}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
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
                      setStepHistory([]);
                      setSelections(EMPTY_SELECTIONS);
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
            {step !== 'confirm' ? (
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

            {renderStepSection()}
          </>
        ) : null}
      </div>
    );
  },
});
