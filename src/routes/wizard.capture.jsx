import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { useAppChrome } from '../lib/app-chrome';
import { fetchUnprocessedInboxItems, ITEMS_REFRESH_EVENT } from '../lib/items';
import { normalizeFilenameValue } from '../lib/frontmatter';
import {
  enrichSourceWithMetadata,
  isLikelyUrl,
  normalizeUrl,
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
  status: null,
  url: '',
  author: '',
  area: null,
  workbench: false,
  dateEnd: null,
  frequency: [],
  unit: '',
  target: '',
  project: null,
  newProjectName: '',
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
        next: 'journal-type',
      },
      {
        id: 'track',
        label: 'Something to track over time',
        description: 'A contact, goal, outreach log.',
        next: 'log-type',
      },
      {
        id: 'reference',
        label: 'Reference material',
        description: 'A note, idea, quote, principle, guide.',
        next: 'reference-type',
      },
      {
        id: 'someday',
        label: 'Someday / Maybe',
        description: 'I might want to do this one day.',
        next: 'someday-confirm',
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
  'journal-type': {
    question: 'What kind of journal entry is this?',
    subtitle: null,
    options: [
      {
        id: 'istikarah',
        label: 'Istikarah',
        description: 'A conversation with Allah SWT.',
        select: { type: 'journal', subtype: 'istikarah' },
        next: 'area-assign',
      },
      {
        id: 'dream',
        label: 'Dream',
        description: 'A dream I want to record.',
        select: { type: 'journal', subtype: 'dream' },
        next: 'area-assign',
      },
      {
        id: 'scratch',
        label: 'Scratch',
        description: 'A thought I need to hold somewhere.',
        select: { type: 'journal', subtype: 'scratch' },
        next: 'area-assign',
      },
    ],
  },
  'log-type': {
    question: 'What are you tracking?',
    subtitle: null,
    options: [
      {
        id: 'contact',
        label: 'Contact',
        description: 'A person in my network.',
        select: { type: 'log', subtype: 'contact' },
        next: 'area-assign',
      },
      {
        id: 'goal',
        label: 'Goal',
        description: 'A 12 week year goal.',
        select: { type: 'log', subtype: 'goal' },
        next: 'area-assign',
      },
      {
        id: 'outreach',
        label: 'Outreach',
        description: 'Daily outreach activity.',
        select: { type: 'log', subtype: 'outreach' },
        next: 'area-assign',
      },
    ],
  },
  'reference-type': {
    question: 'What kind of reference is this?',
    subtitle: null,
    options: [
      {
        id: 'slip',
        label: 'Slip',
        description: 'An atomic idea to connect with others.',
        select: { type: 'reference', subtype: 'slip' },
        next: 'area-assign',
      },
      {
        id: 'quote',
        label: 'Quote',
        description: "Someone else's words worth keeping.",
        select: { type: 'reference', subtype: 'quote' },
        next: 'area-assign',
      },
      {
        id: 'principle',
        label: 'Principle',
        description: 'A rule I live by.',
        select: { type: 'reference', subtype: 'principle' },
        next: 'area-assign',
      },
      {
        id: 'directive',
        label: 'Directive',
        description: 'How a principle applies in real life.',
        select: { type: 'reference', subtype: 'directive' },
        next: 'area-assign',
      },
      {
        id: 'guide',
        label: 'Guide',
        description: 'Instructions I will return to.',
        select: { type: 'reference', subtype: 'guide' },
        next: 'area-assign',
      },
      {
        id: 'identity',
        label: 'Identity',
        description: 'Something about who I am.',
        select: { type: 'reference', subtype: 'identity' },
        next: 'area-assign',
      },
      {
        id: 'asset',
        label: 'Asset',
        description: 'A reusable business document.',
        select: { type: 'reference', subtype: 'asset' },
        next: 'area-assign',
      },
      {
        id: 'software',
        label: 'Software',
        description: 'A software product reference.',
        select: { type: 'reference', subtype: 'software' },
        next: 'area-assign',
      },
      {
        id: 'offer',
        label: 'Offer',
        description: 'A coaching or business offer.',
        select: { type: 'reference', subtype: 'offer' },
        next: 'area-assign',
      },
      {
        id: 'literature',
        label: 'Literature',
        description: 'Notes on a source I consumed.',
        select: { type: 'reference', subtype: 'literature' },
        next: 'area-assign',
      },
    ],
  },
  'someday-confirm': {
    question: 'Save to Someday?',
    subtitle: 'You can review this during your weekly review.',
    options: [
      {
        id: 'confirm',
        label: 'Confirm — Save to Someday',
        description: '',
        select: { type: 'action', subtype: 'task', status: 'someday' },
        next: 'area-assign',
        primary: true,
      },
    ],
  },
  'actionable-yes': {
    question: 'Will this take less than 2 minutes?',
    subtitle: null,
    options: [
      {
        id: 'yes',
        label: 'Yes — I can do it right now',
        description: '',
        next: 'do-now',
      },
      {
        id: 'no',
        label: 'No — it will take longer',
        description: '',
        next: 'action-type',
      },
    ],
  },
  'action-type': {
    question: 'What kind of action is this?',
    subtitle: null,
    options: [
      {
        id: 'habit',
        label: 'A recurring habit or behavior',
        description: 'Something I want to do regularly.',
        select: { type: 'action', subtype: 'habit', status: 'open' },
        next: 'habit-setup',
      },
      {
        id: 'review',
        label: 'A scheduled review',
        description: 'A weekly, monthly, or yearly review.',
        select: { type: 'action', status: 'open' },
        next: 'review-type',
      },
      {
        id: 'creation',
        label: 'Writing or creation',
        description: 'An essay, framework, story, artwork, script.',
        select: { type: 'action', status: 'open' },
        next: 'creation-type',
      },
      {
        id: 'task',
        label: 'A single task',
        description: 'One clear action to complete.',
        select: { type: 'action', subtype: 'task', status: 'open' },
        next: 'task-when',
      },
      {
        id: 'project-task',
        label: 'Part of a larger project',
        description: 'Multiple steps needed to reach the outcome.',
        select: { type: 'action', subtype: 'task', status: 'open' },
        next: 'project-picker',
      },
    ],
  },
  'review-type': {
    question: 'What kind of review?',
    subtitle: null,
    options: [
      {
        id: 'weekly',
        label: 'Weekly review',
        description: '',
        select: { type: 'action', subtype: 'review-weekly', status: 'open' },
        next: 'area-assign',
      },
      {
        id: 'monthly',
        label: 'Monthly review',
        description: '',
        select: { type: 'action', subtype: 'review-monthly', status: 'open' },
        next: 'area-assign',
      },
      {
        id: 'yearly',
        label: 'Yearly review',
        description: '',
        select: { type: 'action', subtype: 'review-yearly', status: 'open' },
        next: 'area-assign',
      },
      {
        id: 'life-area',
        label: 'Life area review',
        description: '',
        select: { type: 'action', subtype: 'review-area', status: 'open' },
        next: 'area-assign',
      },
    ],
  },
  'creation-type': {
    question: 'What kind of creation?',
    subtitle: null,
    options: [
      { id: 'essay', label: 'Essay', description: '', select: { type: 'action', subtype: 'essay', status: 'open' }, next: 'area-assign' },
      { id: 'framework', label: 'Framework', description: '', select: { type: 'action', subtype: 'framework', status: 'open' }, next: 'area-assign' },
      { id: 'lesson', label: 'Lesson', description: '', select: { type: 'action', subtype: 'lesson', status: 'open' }, next: 'area-assign' },
      { id: 'manuscript', label: 'Manuscript', description: '', select: { type: 'action', subtype: 'manuscript', status: 'open' }, next: 'area-assign' },
      { id: 'comic', label: 'Comic', description: '', select: { type: 'action', subtype: 'comic', status: 'open' }, next: 'area-assign' },
      { id: 'poem', label: 'Poem', description: '', select: { type: 'action', subtype: 'poem', status: 'open' }, next: 'area-assign' },
      { id: 'story', label: 'Story', description: '', select: { type: 'action', subtype: 'story', status: 'open' }, next: 'area-assign' },
      { id: 'artwork', label: 'Artwork', description: '', select: { type: 'action', subtype: 'artwork', status: 'open' }, next: 'area-assign' },
      { id: 'case-study', label: 'Case study', description: '', select: { type: 'action', subtype: 'case-study', status: 'open' }, next: 'area-assign' },
      { id: 'workshop', label: 'Workshop', description: '', select: { type: 'action', subtype: 'workshop', status: 'open' }, next: 'area-assign' },
      { id: 'script', label: 'Script', description: '', select: { type: 'action', subtype: 'script', status: 'open' }, next: 'area-assign' },
    ],
  },
  'task-when': {
    question: 'When does this need to happen?',
    subtitle: null,
    options: [
      {
        id: 'today',
        label: 'Today',
        description: '',
        select: { status: 'open', dateEnd: 'TODAY' },
        next: 'area-assign',
      },
      {
        id: 'specific-date',
        label: 'Specific date',
        description: '',
        next: 'task-date',
      },
      {
        id: 'anytime',
        label: 'Anytime — no deadline',
        description: '',
        select: { status: 'open', dateEnd: null },
        next: 'area-assign',
      },
      {
        id: 'someday',
        label: 'Someday',
        description: '',
        select: { status: 'someday', dateEnd: null },
        next: 'area-assign',
      },
    ],
  },
};

const FIRST_STEP = 'review';

export const wizardCaptureRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/wizard/capture',
  validateSearch: (search) => ({
    itemId: typeof search.itemId === 'string' ? search.itemId : undefined,
  }),
  component: function WizardCaptureRoute() {
    const auth = useAuth();
    const navigate = wizardCaptureRoute.useNavigate();
    const search = wizardCaptureRoute.useSearch();
    const [captures, setCaptures] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [step, setStep] = useState(FIRST_STEP);
    const [stepHistory, setStepHistory] = useState([]);
    const [titleDraft, setTitleDraft] = useState('');
    const [urlDraft, setUrlDraft] = useState('');
    const [authorDraft, setAuthorDraft] = useState('');
    const [selections, setSelections] = useState(EMPTY_SELECTIONS);
    const [areaItems, setAreaItems] = useState([]);
    const [projectItems, setProjectItems] = useState([]);
    const [projectSearch, setProjectSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingAreas, setIsLoadingAreas] = useState(false);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
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
          const startIndex = search.itemId
            ? Math.max(0, data.findIndex((c) => c.id === search.itemId))
            : 0;
          setCurrentIndex(startIndex);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Load project items when entering project-picker step
    useEffect(() => {
      if (step !== 'project-picker' || !auth.user?.id) return;

      let cancelled = false;
      setIsLoadingProjects(true);
      setProjectSearch('');

      supabase
        .from('items')
        .select('id,title,filename')
        .eq('user_id', auth.user.id)
        .eq('type', 'action')
        .eq('subtype', 'project')
        .is('date_trashed', null)
        .order('title', { ascending: true })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (!error) setProjectItems(data ?? []);
          setIsLoadingProjects(false);
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
      setProjectSearch('');
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

    async function handleMarkDone() {
      if (!auth.user?.id) return;

      const capture = captures[currentIndex];
      if (!capture) return;

      setIsProcessing(true);

      try {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('items')
          .update({ status: 'done', date_trashed: now, date_modified: now })
          .eq('id', capture.id)
          .eq('user_id', auth.user.id);

        if (error) throw error;

        writeItemHistory(capture.id, auth.user.id, capture.content, 'updated', {
          status: 'done',
        });

        setActionMessage('Done.');
        window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
        advanceToNext();
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to mark as done.');
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
          status: selections.status ?? 'backlog',
          workbench: selections.workbench,
          date_modified: now,
        };

        if (selections.medium) updatePayload.source_type = selections.medium;

        const urlTrimmed = selections.url?.trim() || '';
        const normalizedUrlValue = urlTrimmed ? normalizeUrl(urlTrimmed) : null;

        // Dedup check for sources with a URL
        if (
          selections.type === 'reference' &&
          selections.subtype === 'source' &&
          normalizedUrlValue
        ) {
          const { data: existing } = await supabase
            .from('items')
            .select('id,status')
            .eq('user_id', auth.user.id)
            .eq('normalized_url', normalizedUrlValue)
            .neq('id', capture.id)
            .is('date_trashed', null)
            .maybeSingle();

          if (existing) {
            if (existing.status === 'archived') {
              await supabase
                .from('items')
                .update({ status: 'backlog', date_modified: now })
                .eq('id', existing.id)
                .eq('user_id', auth.user.id);
            }
            await supabase
              .from('items')
              .update({ date_trashed: now })
              .eq('id', capture.id)
              .eq('user_id', auth.user.id);

            setActionMessage(
              existing.status === 'archived'
                ? 'Already archived — moved back to Sources inbox.'
                : 'Already in Sources.',
            );
            window.dispatchEvent(new Event(ITEMS_REFRESH_EVENT));
            advanceToNext();
            return;
          }
        }

        if (urlTrimmed) {
          updatePayload.url = urlTrimmed;
          if (normalizedUrlValue) updatePayload.normalized_url = normalizedUrlValue;
        }

        if (selections.author?.trim()) updatePayload.author = selections.author.trim();

        if (selections.area) {
          updatePayload.area = `[[${selections.area.title}]]`;
        }

        if (selections.dateEnd) updatePayload.date_end = selections.dateEnd;

        if (selections.frequency?.length) updatePayload.frequency = selections.frequency;
        if (selections.unit?.trim()) updatePayload.unit = selections.unit.trim();
        const parsedTarget = parseFloat(selections.target);
        if (!Number.isNaN(parsedTarget)) updatePayload.target = parsedTarget;

        // Resolve project wikilink
        let projectTitle = null;
        if (selections.project) {
          projectTitle = selections.project.title;
        } else if (selections.newProjectName?.trim()) {
          const projectName = selections.newProjectName.trim();
          const { data: newProject, error: projectError } = await supabase
            .from('items')
            .insert({
              user_id: auth.user.id,
              type: 'action',
              subtype: 'project',
              title: projectName,
              status: 'active',
              date_created: now,
              date_modified: now,
            })
            .select('id,title')
            .single();
          if (!projectError && newProject) projectTitle = newProject.title;
        }
        if (projectTitle) updatePayload.project = `[[${projectTitle}]]`;

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
        const resolved = { ...option.select };
        if (resolved.dateEnd === 'TODAY') {
          resolved.dateEnd = new Date().toISOString().split('T')[0];
        }
        setSelections((prev) => ({ ...prev, ...resolved }));
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

      // ── Do it now (2-minute rule) ────────────────────────────────────
      if (step === 'do-now') {
        return (
          <section className={styles.wizardCaptureRoute__step}>
            <header className={styles.wizardCaptureRoute__stepHeader}>
              {stepHistory.length > 0 ? (
                <button className={styles.wizardCaptureRoute__backButton} onClick={goBack} type="button">
                  ← Back
                </button>
              ) : null}
              <h2 className={styles.wizardCaptureRoute__stepQuestion}>Go do it now.</h2>
              <p className={styles.wizardCaptureRoute__stepSubtitle}>
                Come back when you are done and mark it complete.
              </p>
            </header>
            <ul className={styles.wizardCaptureRoute__optionList}>
              <li>
                <button
                  className={`${styles.wizardCaptureRoute__option} ${styles['wizardCaptureRoute__option--primary']}`}
                  disabled={isProcessing}
                  onClick={() => void handleMarkDone()}
                  type="button"
                >
                  <span className={styles.wizardCaptureRoute__optionLabel}>Mark as Done</span>
                </button>
              </li>
              <li>
                <button
                  className={styles.wizardCaptureRoute__option}
                  disabled={isProcessing}
                  onClick={() => advanceStep('action-type')}
                  type="button"
                >
                  <span className={styles.wizardCaptureRoute__optionLabel}>
                    Actually it takes longer →
                  </span>
                </button>
              </li>
            </ul>
          </section>
        );
      }

      // ── Habit setup ──────────────────────────────────────────────────
      if (step === 'habit-setup') {
        const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const UNITS = ['minutes', 'reps', 'pages', 'km', 'times', 'other'];
        const isSpecificDays = selections.frequency.length > 0
          && !selections.frequency.includes('daily')
          && !selections.frequency.includes('weekly');

        return (
          <section className={styles.wizardCaptureRoute__step}>
            <header className={styles.wizardCaptureRoute__stepHeader}>
              {stepHistory.length > 0 ? (
                <button className={styles.wizardCaptureRoute__backButton} onClick={goBack} type="button">
                  ← Back
                </button>
              ) : null}
              <h2 className={styles.wizardCaptureRoute__stepQuestion}>How often?</h2>
            </header>

            <div className={styles.wizardCaptureRoute__habitSection}>
              <p className={styles.wizardCaptureRoute__titleLabel}>Frequency</p>
              <div className={styles.wizardCaptureRoute__habitFreq}>
                {[
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'specific', label: 'Specific days' },
                ].map((f) => {
                  const active = f.id === 'daily'
                    ? selections.frequency.includes('daily')
                    : f.id === 'weekly'
                      ? selections.frequency.includes('weekly')
                      : isSpecificDays;
                  return (
                    <button
                      key={f.id}
                      className={`${styles.wizardCaptureRoute__habitFreqBtn} ${active ? styles['wizardCaptureRoute__habitFreqBtn--active'] : ''}`}
                      onClick={() => {
                        if (f.id === 'daily') setSelections((p) => ({ ...p, frequency: ['daily'] }));
                        else if (f.id === 'weekly') setSelections((p) => ({ ...p, frequency: ['weekly'] }));
                        else setSelections((p) => ({ ...p, frequency: [] }));
                      }}
                      type="button"
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {isSpecificDays || (!selections.frequency.includes('daily') && !selections.frequency.includes('weekly') && selections.frequency.length === 0) ? (
                <div className={styles.wizardCaptureRoute__habitDays}>
                  {DAYS.map((day) => {
                    const key = day.toLowerCase();
                    const active = selections.frequency.includes(key);
                    return (
                      <button
                        key={day}
                        className={`${styles.wizardCaptureRoute__habitDayBtn} ${active ? styles['wizardCaptureRoute__habitDayBtn--active'] : ''}`}
                        onClick={() => {
                          setSelections((p) => ({
                            ...p,
                            frequency: active
                              ? p.frequency.filter((d) => d !== key)
                              : [...p.frequency.filter((d) => d !== 'daily' && d !== 'weekly'), key],
                          }));
                        }}
                        type="button"
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className={styles.wizardCaptureRoute__habitSection}>
              <div className={styles.wizardCaptureRoute__habitRow}>
                <div className={styles.wizardCaptureRoute__titleField}>
                  <label className={styles.wizardCaptureRoute__titleLabel} htmlFor="habit-target">
                    Target
                  </label>
                  <input
                    className={styles.wizardCaptureRoute__titleInput}
                    id="habit-target"
                    inputMode="numeric"
                    onChange={(e) => setSelections((p) => ({ ...p, target: e.target.value }))}
                    placeholder="0"
                    type="number"
                    value={selections.target}
                  />
                </div>
                <div className={styles.wizardCaptureRoute__titleField}>
                  <label className={styles.wizardCaptureRoute__titleLabel} htmlFor="habit-unit">
                    Unit
                  </label>
                  <select
                    className={styles.wizardCaptureRoute__titleInput}
                    id="habit-unit"
                    onChange={(e) => setSelections((p) => ({ ...p, unit: e.target.value }))}
                    value={selections.unit}
                  >
                    <option value="">—</option>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button
              className={styles.wizardCaptureRoute__nextButton}
              disabled={isProcessing || selections.frequency.length === 0}
              onClick={() => advanceStep('area-assign')}
              type="button"
            >
              Next →
            </button>
          </section>
        );
      }

      // ── Task specific date ───────────────────────────────────────────
      if (step === 'task-date') {
        return (
          <section className={styles.wizardCaptureRoute__step}>
            <header className={styles.wizardCaptureRoute__stepHeader}>
              {stepHistory.length > 0 ? (
                <button className={styles.wizardCaptureRoute__backButton} onClick={goBack} type="button">
                  ← Back
                </button>
              ) : null}
              <h2 className={styles.wizardCaptureRoute__stepQuestion}>When?</h2>
            </header>
            <div className={styles.wizardCaptureRoute__titleField}>
              <label className={styles.wizardCaptureRoute__titleLabel} htmlFor="task-date-input">
                Date
              </label>
              <input
                className={styles.wizardCaptureRoute__titleInput}
                id="task-date-input"
                onChange={(e) => setSelections((p) => ({ ...p, dateEnd: e.target.value || null }))}
                type="date"
                value={selections.dateEnd ?? ''}
              />
            </div>
            <button
              className={styles.wizardCaptureRoute__nextButton}
              disabled={!selections.dateEnd}
              onClick={() => advanceStep('area-assign')}
              type="button"
            >
              Next →
            </button>
          </section>
        );
      }

      // ── Project picker ───────────────────────────────────────────────
      if (step === 'project-picker') {
        const lowerSearch = projectSearch.toLowerCase();
        const filteredProjects = lowerSearch
          ? projectItems.filter((p) =>
              (p.title || p.filename || '').toLowerCase().includes(lowerSearch),
            )
          : projectItems;
        const hasExactMatch = projectItems.some(
          (p) => (p.title || '').toLowerCase() === lowerSearch,
        );

        return (
          <section className={styles.wizardCaptureRoute__step}>
            <header className={styles.wizardCaptureRoute__stepHeader}>
              {stepHistory.length > 0 ? (
                <button className={styles.wizardCaptureRoute__backButton} onClick={goBack} type="button">
                  ← Back
                </button>
              ) : null}
              <h2 className={styles.wizardCaptureRoute__stepQuestion}>
                Which project does this belong to?
              </h2>
            </header>

            <div className={styles.wizardCaptureRoute__titleField}>
              <label className={styles.wizardCaptureRoute__titleLabel} htmlFor="project-search">
                Search or create
              </label>
              <input
                autoFocus
                className={styles.wizardCaptureRoute__titleInput}
                id="project-search"
                onChange={(e) => {
                  setProjectSearch(e.target.value);
                  setSelections((p) => ({ ...p, project: null, newProjectName: '' }));
                }}
                placeholder="Project name…"
                type="text"
                value={projectSearch}
              />
            </div>

            {isLoadingProjects ? (
              <div className={styles.wizardCaptureRoute__skeleton} style={{ blockSize: '3rem' }} />
            ) : (
              <ul className={styles.wizardCaptureRoute__optionList}>
                {filteredProjects.map((proj) => (
                  <li key={proj.id}>
                    <button
                      className={`${styles.wizardCaptureRoute__option} ${
                        selections.project?.id === proj.id
                          ? styles['wizardCaptureRoute__option--primary']
                          : ''
                      }`}
                      disabled={isProcessing}
                      onClick={() => {
                        setSelections((p) => ({ ...p, project: proj, newProjectName: '' }));
                        advanceStep('task-when');
                      }}
                      type="button"
                    >
                      <span className={styles.wizardCaptureRoute__optionLabel}>
                        {proj.title || proj.filename || 'Untitled project'}
                      </span>
                    </button>
                  </li>
                ))}

                {projectSearch.trim() && !hasExactMatch ? (
                  <li>
                    <button
                      className={styles.wizardCaptureRoute__option}
                      disabled={isProcessing}
                      onClick={() => {
                        setSelections((p) => ({
                          ...p,
                          newProjectName: projectSearch.trim(),
                          project: null,
                        }));
                        advanceStep('task-when');
                      }}
                      type="button"
                    >
                      <span className={styles.wizardCaptureRoute__optionLabel}>
                        + Create "{projectSearch.trim()}"
                      </span>
                    </button>
                  </li>
                ) : null}

                <li>
                  <button
                    className={styles.wizardCaptureRoute__option}
                    disabled={isProcessing}
                    onClick={() => {
                      setSelections((p) => ({ ...p, project: null, newProjectName: '' }));
                      advanceStep('task-when');
                    }}
                    type="button"
                  >
                    <span className={styles.wizardCaptureRoute__optionLabel}>
                      Skip — no project
                    </span>
                  </button>
                </li>
              </ul>
            )}
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
