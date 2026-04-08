import { createCuid } from './cuid';
import {
  buildEditorMarkdownDocument,
  buildEditorMarkdownDocumentFromParts,
  buildItemUpdatePayloadFromFrontmatter,
  createStoredAuthoredFrontmatter,
  normalizeFilenameValue,
  parseEditorMarkdownDocument,
  replaceEditorFrontmatterField,
} from './frontmatter';
import {
  buildTitleFromFilename,
  getItemDisplayLabel,
} from './filenames';
import {
  DEFAULT_TEMPLATE_DATE_FORMAT,
  DEFAULT_TEMPLATE_TIME_FORMAT,
  fetchResolvedDailyNotePreferences,
  fetchTemplateSettings,
} from './settings';
import { supabase } from './supabase';
import { buildBacklinkGroups, resolveDocumentWikilinks } from './wikilinks';

const RECENT_ITEMS_LIMIT = 8;
const SEARCH_ITEMS_LIMIT = 8;
const TAG_ITEM_POOL_LIMIT = 200;
const TAG_SUGGESTIONS_LIMIT = 10;
export const HOME_WORKBENCH_LIMIT = 12;
const ITEMS_ROUTE_LIMIT = 200;
const MAX_CUID_RETRIES = 20;
export const ITEMS_REFRESH_EVENT = 'personal-os:items-refresh';
const TEMPLATE_DATE_TOKEN_PATTERN = /\{\{date(?::([^}]*))?\}\}/g;
const TEMPLATE_TIME_TOKEN_PATTERN = /\{\{time(?::([^}]*))?\}\}/g;
const TEMPLATE_TITLE_TOKEN_PATTERN = /\{\{title\}\}/g;
const TEMPLATE_FORMAT_TOKEN_PATTERN = /YYYY|YY|MM|DD|HH|mm|ss|M|D|H|m|s/g;
const LEGACY_CUID_TEMPLATE_TOKEN = '{{date:YYYYMMDD}}{{time:HHmmss}}';
const TEMPLATE_VARIABLE_PATTERN = /\{\{[^}]+\}\}/;
const MISSING_DAILY_TEMPLATE_ERROR_MESSAGE =
  'No daily template has been selected yet.';
const pendingDailyNoteRequests = new Map();

function escapeIlikePattern(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function normalizeFilenameSearchValue(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildFilenameAwareSearchFilter(query, { includeContent = false } = {}) {
  const trimmedQuery = String(query ?? '').trim();
  const escapedTextQuery = escapeIlikePattern(trimmedQuery);
  const normalizedFilenameQuery = normalizeFilenameSearchValue(trimmedQuery);
  const clauses = [];

  if (escapedTextQuery) {
    clauses.push(`title.ilike.%${escapedTextQuery}%`);

    if (includeContent) {
      clauses.push(`content.ilike.%${escapedTextQuery}%`);
    }
  }

  if (normalizedFilenameQuery) {
    clauses.push(
      `filename.ilike.%${escapeIlikePattern(normalizedFilenameQuery)}%`,
    );
  }

  return clauses.join(',');
}

function normalizeCaptureInput(value) {
  return value.replaceAll('\r\n', '\n').trim();
}

function formatCapturePayload(rawValue) {
  const normalizedValue = normalizeCaptureInput(rawValue);

  if (!normalizedValue) {
    return null;
  }

  const [firstLine = '', ...remainingLines] = normalizedValue.split('\n');
  const normalizedFirstLine = firstLine.trim();
  const rawFilenameValue = normalizedFirstLine.slice(0, 280).trim();
  const filename = normalizeFilenameValue(rawFilenameValue);
  const title = buildTitleFromFilename(filename, rawFilenameValue);
  const overflow = normalizedFirstLine.slice(280).trim();
  const remainingContent = remainingLines.join('\n').trim();
  const contentParts = [overflow, remainingContent].filter(Boolean);

  return {
    content: contentParts.join('\n\n'),
    filename,
    title,
  };
}

function buildCommandItemFieldsQuery() {
  return 'id,cuid,type,subtype,title,filename,content,date_created,date_modified,is_template';
}

function buildInboxItemFieldsQuery() {
  return 'id,cuid,type,subtype,title,filename,content,status,date_created,date_modified';
}

function buildEditorItemFieldsQuery() {
  return '*';
}

function buildEditorAutocompleteItemFieldsQuery() {
  return 'id,cuid,title,filename,content,date_created,date_modified';
}

function buildWikilinkTargetFieldsQuery() {
  return 'id,title,filename,type,subtype';
}

function buildManagedTemplateFieldsQuery() {
  return 'id,cuid,type,subtype,title,filename,folder,content,date_created,date_modified,date_trashed,is_template,user_id';
}

function buildTrashItemFieldsQuery() {
  return 'id,cuid,type,subtype,title,filename,content,status,workbench,date_created,date_modified,date_trashed';
}

function buildDailyNoteFieldsQuery() {
  return 'id,cuid,type,subtype,title,status,date_created,date_modified,date_field';
}

function buildHomeWorkbenchFieldsQuery() {
  return 'id,cuid,type,subtype,title,filename,content,workbench,date_created,date_modified';
}

function buildItemsIndexFieldsQuery() {
  return 'id,cuid,type,subtype,title,filename,content,status,workbench,date_created,date_modified';
}

function buildNotesItemsFieldsQuery() {
  return 'id,cuid,type,subtype,title,filename,content,date_created,date_modified,todos_open,todos_done,is_pinned';
}

function isCuidConflictError(error) {
  return error?.code === '23505' && error?.message?.includes('cuid');
}

function isMissingSingleRowError(error) {
  return error?.code === 'PGRST116' || error?.status === 406;
}

function formatDatePart(value) {
  return String(value).padStart(2, '0');
}

function formatLocalDateParts(date) {
  const year = date.getFullYear();
  const month = formatDatePart(date.getMonth() + 1);
  const day = formatDatePart(date.getDate());
  const hours = formatDatePart(date.getHours());
  const minutes = formatDatePart(date.getMinutes());
  const seconds = formatDatePart(date.getSeconds());
  const dateField = `${year}-${month}-${day}`;

  return {
    dateField,
    localDateTime: `${dateField}T${hours}:${minutes}:${seconds}`,
  };
}

function sanitizeTemplateFields(templateItem) {
  const templateFields = { ...templateItem };

  delete templateFields.id;
  delete templateFields.user_id;
  delete templateFields.cuid;
  delete templateFields.is_template;
  delete templateFields.created_at;
  delete templateFields.updated_at;

  return templateFields;
}

function deriveFilenameFromTitle(title) {
  const normalizedTitle = String(title ?? '').trim();

  if (!normalizedTitle || TEMPLATE_VARIABLE_PATTERN.test(normalizedTitle)) {
    return null;
  }

  return normalizeFilenameValue(normalizedTitle);
}

function resolveNextFilename({
  parsedFrontmatter,
  title,
}) {
  if (Object.prototype.hasOwnProperty.call(parsedFrontmatter, 'filename')) {
    const explicitFilename = normalizeFilenameValue(parsedFrontmatter.filename);

    if (explicitFilename) {
      return explicitFilename;
    }
  }

  return deriveFilenameFromTitle(title);
}

async function ensureFilenameIsUnique({
  excludeItemId,
  filename,
  userId,
}) {
  if (!filename) {
    return;
  }

  let request = supabase
    .from('items')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', userId)
    .eq('filename', filename)
    .is('date_trashed', null);

  if (excludeItemId) {
    request = request.neq('id', excludeItemId);
  }

  const { count, error } = await request;

  if (error) {
    throw error;
  }

  if ((count ?? 0) > 0) {
    throw new Error(`Another item already uses the filename "${filename}".`);
  }
}

function buildClonedTemplatePayload({
  collisionIndex,
  isTemplate,
  templateItem,
  timestamp,
  userId,
}) {
  const templateFields = sanitizeTemplateFields(templateItem);

  return {
    ...templateFields,
    cuid: createCuid(new Date(timestamp), collisionIndex),
    date_created: timestamp,
    date_modified: timestamp,
    date_trashed: null,
    is_template: isTemplate,
    user_id: userId,
  };
}

function buildBlankTemplatePayload({
  collisionIndex,
  createdAt,
  folder,
  userId,
}) {
  const timestamp = createdAt.toISOString();

  return {
    content: '',
    cuid: createCuid(createdAt, collisionIndex),
    date_created: timestamp,
    date_modified: timestamp,
    date_trashed: null,
    folder: folder || null,
    frontmatter: createStoredAuthoredFrontmatter(),
    is_template: true,
    user_id: userId,
  };
}

function buildTrashedItemHistorySnapshot(item, trashedAt) {
  const snapshotWithUpdatedDate = replaceEditorFrontmatterField({
    key: 'date_modified',
    rawMarkdown: buildEditorMarkdownDocument(item),
    value: trashedAt,
  });

  return replaceEditorFrontmatterField({
    key: 'date_trashed',
    rawMarkdown: snapshotWithUpdatedDate,
    value: trashedAt,
  });
}

function buildRestoredItemHistorySnapshot(item, restoredAt) {
  const restoredItem = {
    ...item,
    date_modified: restoredAt,
    date_trashed: null,
  };

  return buildEditorMarkdownDocument(restoredItem);
}

function buildTemplateFormatTokenValues(date) {
  return {
    D: String(date.getDate()),
    DD: formatDatePart(date.getDate()),
    H: String(date.getHours()),
    HH: formatDatePart(date.getHours()),
    M: String(date.getMonth() + 1),
    MM: formatDatePart(date.getMonth() + 1),
    YY: String(date.getFullYear()).slice(-2),
    YYYY: String(date.getFullYear()),
    m: String(date.getMinutes()),
    mm: formatDatePart(date.getMinutes()),
    s: String(date.getSeconds()),
    ss: formatDatePart(date.getSeconds()),
  };
}

function normalizeTemplateFormatValue(value, fallbackValue) {
  const normalizedValue = String(value ?? '').trim();

  return normalizedValue || fallbackValue;
}

function formatTemplateVariableValue(date, format, fallbackValue) {
  const normalizedFormat = normalizeTemplateFormatValue(format, fallbackValue);
  const tokenValues = buildTemplateFormatTokenValues(date);

  return normalizedFormat.replace(
    TEMPLATE_FORMAT_TOKEN_PATTERN,
    (token) => tokenValues[token] ?? token,
  );
}

function normalizeTemplateTitleValue(value) {
  return String(value ?? '').trim();
}

function applyTemplateTokens(text, { cuid, normalizedTitle, createdAt, dateFormat, timeFormat }) {
  return text
    .replaceAll(LEGACY_CUID_TEMPLATE_TOKEN, cuid)
    .replaceAll(TEMPLATE_TITLE_TOKEN_PATTERN, normalizedTitle)
    .replace(
      TEMPLATE_DATE_TOKEN_PATTERN,
      (_match, overrideFormat) =>
        formatTemplateVariableValue(createdAt, overrideFormat, dateFormat),
    )
    .replace(
      TEMPLATE_TIME_TOKEN_PATTERN,
      (_match, overrideFormat) =>
        formatTemplateVariableValue(createdAt, overrideFormat, timeFormat),
    );
}

function materializeTemplateRawMarkdown({
  createdAt,
  cuid,
  rawMarkdown,
  templateSettings,
  titleValue,
}) {
  const dateFormat = normalizeTemplateFormatValue(
    templateSettings?.dateFormat,
    DEFAULT_TEMPLATE_DATE_FORMAT,
  );
  const timeFormat = normalizeTemplateFormatValue(
    templateSettings?.timeFormat,
    DEFAULT_TEMPLATE_TIME_FORMAT,
  );
  const tokenContext = {
    cuid,
    normalizedTitle: normalizeTemplateTitleValue(titleValue),
    createdAt,
    dateFormat,
    timeFormat,
  };

  const { body, frontmatter } = parseEditorMarkdownDocument(String(rawMarkdown ?? ''));

  const materializedFrontmatter = Object.fromEntries(
    Object.entries(frontmatter).map(([key, value]) => [
      key,
      typeof value === 'string' ? applyTemplateTokens(value, tokenContext) : value,
    ]),
  );

  const materializedBody = applyTemplateTokens(body, tokenContext);

  return buildEditorMarkdownDocumentFromParts({
    body: materializedBody,
    frontmatter: materializedFrontmatter,
  });
}

function buildMaterializedTemplateUpdatePayload({
  baseItem,
  createdAt,
  fallbackTitle,
  templateItem,
  templateSettings,
  titleValue,
}) {
  const modifiedAt = createdAt.toISOString();
  const materializedRawMarkdown = materializeTemplateRawMarkdown({
    createdAt,
    cuid: baseItem.cuid,
    rawMarkdown: buildEditorMarkdownDocument(templateItem),
    templateSettings,
    titleValue,
  });
  const { body, frontmatter } = parseEditorMarkdownDocument(materializedRawMarkdown);
  const frontmatterPayload = buildItemUpdatePayloadFromFrontmatter({
    existingItem: baseItem,
    modifiedAt,
    parsedFrontmatter: frontmatter,
  });
  const resolvedTitle =
    normalizeTemplateTitleValue(frontmatterPayload.title) ||
    normalizeTemplateTitleValue(fallbackTitle) ||
    null;

  return {
    ...frontmatterPayload,
    content: body,
    date_modified: modifiedAt,
    filename: resolveNextFilename({
      parsedFrontmatter: frontmatter,
      title: resolvedTitle,
    }),
    title: resolvedTitle,
  };
}

async function fetchDailyNoteForDate({ dateField, userId }) {
  const { data, error } = await supabase
    .from('items')
    .select(buildDailyNoteFieldsQuery())
    .eq('user_id', userId)
    .eq('is_template', false)
    .eq('type', 'journal')
    .eq('subtype', 'daily')
    .eq('date_field', dateField)
    .is('date_trashed', null)
    .order('date_created', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function repairMissingDailyNoteDateField({ dateField, userId }) {
  const { data: candidateItems, error: candidateError } = await supabase
    .from('items')
    .select('id')
    .eq('user_id', userId)
    .eq('is_template', false)
    .eq('type', 'journal')
    .eq('subtype', 'daily')
    .eq('filename', dateField)
    .is('date_field', null)
    .is('date_trashed', null)
    .order('date_created', { ascending: false, nullsFirst: false })
    .limit(2);

  if (candidateError) {
    throw candidateError;
  }

  if (!candidateItems?.length) {
    return null;
  }

  if (candidateItems.length > 1) {
    throw new Error(
      'Multiple saved daily notes are missing their date field for this day.',
    );
  }

  const { data: repairedItem, error: repairError } = await supabase
    .from('items')
    .update({
      date_field: dateField,
    })
    .eq('id', candidateItems[0].id)
    .eq('user_id', userId)
    .eq('is_template', false)
    .eq('type', 'journal')
    .eq('subtype', 'daily')
    .eq('filename', dateField)
    .is('date_field', null)
    .is('date_trashed', null)
    .select(buildDailyNoteFieldsQuery())
    .single();

  if (repairError) {
    throw repairError;
  }

  return repairedItem;
}

async function createDailyNoteForDate({
  date,
  dailyNoteFolder,
  templateId,
  userId,
}) {
  const [
    { data: templateItem, error: templateError },
    templateSettings,
  ] = await Promise.all([
    supabase
      .from('items')
      .select('*')
      .eq('id', templateId)
      .eq('is_template', true)
      .eq('subtype', 'daily')
      .eq('user_id', userId)
      .is('date_trashed', null)
      .single(),
    fetchTemplateSettings({ userId }),
  ]);

  if (templateError) {
    if (isMissingSingleRowError(templateError)) {
      throw new Error(MISSING_DAILY_TEMPLATE_ERROR_MESSAGE);
    }

    throw templateError;
  }

  const timestamp = date.toISOString();
  const { dateField } = formatLocalDateParts(date);

  for (let collisionIndex = 0; collisionIndex <= MAX_CUID_RETRIES; collisionIndex += 1) {
    const baseItem = {
      ...buildClonedTemplatePayload({
        collisionIndex,
        isTemplate: false,
        templateItem,
        timestamp,
        userId,
      }),
      date_field: dateField,
      folder: dailyNoteFolder || null,
    };
    const materializedTemplatePayload = buildMaterializedTemplateUpdatePayload({
      baseItem,
      createdAt: date,
      fallbackTitle: dateField,
      templateItem,
      templateSettings,
      titleValue: dateField,
    });

    await ensureFilenameIsUnique({
      filename: dateField,
      userId,
    });

    const { data, error } = await supabase
      .from('items')
      .insert({
        ...baseItem,
        ...materializedTemplatePayload,
        date_field: dateField,
        filename: dateField,
        folder: dailyNoteFolder || null,
        title: dateField,
      })
      .select(buildDailyNoteFieldsQuery())
      .single();

    if (!error) {
      return data;
    }

    if (!isCuidConflictError(error) || collisionIndex === MAX_CUID_RETRIES) {
      throw error;
    }
  }

  throw new Error('Unable to create today\'s daily note right now.');
}

export function getCapturePreview(rawValue) {
  return formatCapturePayload(rawValue);
}

export async function fetchWikilinkSuggestions({
  excludeItemId,
  query,
  userId,
}) {
  const trimmedQuery = query.trim();
  let request = supabase
    .from('items')
    .select(buildEditorAutocompleteItemFieldsQuery())
    .eq('user_id', userId)
    .eq('is_template', false)
    .is('date_trashed', null);

  if (excludeItemId) {
    request = request.neq('id', excludeItemId);
  }

  if (trimmedQuery) {
    request = request.or(buildFilenameAwareSearchFilter(trimmedQuery));
  }

  const { data, error } = await request
    .order('date_modified', { ascending: false, nullsFirst: false })
    .order('date_created', { ascending: false, nullsFirst: false })
    .limit(SEARCH_ITEMS_LIMIT);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((item) => ({
      id: item.id,
      label: getItemDisplayLabel(item),
    }))
    .filter((item) => item.label);
}

export async function fetchWikilinkTargets(userId) {
  const { data, error } = await supabase
    .from('items')
    .select(buildWikilinkTargetFieldsQuery())
    .eq('user_id', userId)
    .eq('is_template', false)
    .is('date_trashed', null);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchResolvedEditorWikilinks({
  rawMarkdown,
  userId,
}) {
  const resolvedLinks = resolveDocumentWikilinks({
    rawMarkdown,
    targetItems: [],
  });

  if (resolvedLinks.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('items')
    .select(buildWikilinkTargetFieldsQuery())
    .eq('user_id', userId)
    .eq('is_template', false)
    .is('date_trashed', null);

  if (error) {
    throw error;
  }

  return resolveDocumentWikilinks({
    rawMarkdown,
    targetItems: data ?? [],
  });
}

export async function fetchItemBacklinkGroups({
  currentLabel,
  itemId,
  userId,
}) {
  if (!String(currentLabel ?? '').trim()) {
    return [];
  }

  const { data, error } = await supabase
    .from('items')
    .select(buildEditorItemFieldsQuery())
    .eq('user_id', userId)
    .eq('is_template', false)
    .is('date_trashed', null)
    .neq('id', itemId)
    .order('date_modified', { ascending: false, nullsFirst: false })
    .order('date_created', { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return buildBacklinkGroups({
    candidateItems: data ?? [],
    currentTitle: currentLabel,
  });
}

export async function fetchTagSuggestions({ query, userId }) {
  const normalizedQuery = query.trim().toLowerCase();
  const { data, error } = await supabase
    .from('items')
    .select('tags')
    .eq('user_id', userId)
    .is('date_trashed', null)
    .order('date_modified', { ascending: false, nullsFirst: false })
    .limit(TAG_ITEM_POOL_LIMIT);

  if (error) {
    throw error;
  }

  const suggestions = [];
  const seenTags = new Set();

  (data ?? []).forEach((item) => {
    const tags = Array.isArray(item.tags) ? item.tags : [];

    tags.forEach((tag) => {
      const normalizedTag = String(tag ?? '').trim();
      const normalizedTagKey = normalizedTag.toLowerCase();

      if (!normalizedTag) {
        return;
      }

      if (
        normalizedQuery &&
        !normalizedTagKey.startsWith(normalizedQuery)
      ) {
        return;
      }

      if (seenTags.has(normalizedTagKey)) {
        return;
      }

      seenTags.add(normalizedTagKey);
      suggestions.push(normalizedTag);
    });
  });

  return suggestions.slice(0, TAG_SUGGESTIONS_LIMIT);
}

export async function fetchEditorItem({ itemId, userId }) {
  const { data, error } = await supabase
    .from('items')
    .select(buildEditorItemFieldsQuery())
    .eq('id', itemId)
    .eq('user_id', userId)
    .is('date_trashed', null)
    .single();

  if (error) {
    throw error;
  }

  return {
    item: data,
    rawMarkdown: buildEditorMarkdownDocument(data),
  };
}

export async function fetchRecentCommandItems(userId) {
  const { data, error } = await supabase
    .from('items')
    .select(buildCommandItemFieldsQuery())
    .eq('user_id', userId)
    .eq('is_template', false)
    .is('date_trashed', null)
    .order('date_modified', { ascending: false, nullsFirst: false })
    .order('date_created', { ascending: false, nullsFirst: false })
    .limit(RECENT_ITEMS_LIMIT);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchCommandTemplates(userId) {
  const { data, error } = await supabase
    .from('items')
    .select(buildEditorItemFieldsQuery())
    .eq('user_id', userId)
    .eq('is_template', true)
    .is('date_trashed', null)
    .order('type', { ascending: true })
    .order('subtype', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchManagedTemplates(userId) {
  const { data, error } = await supabase
    .from('items')
    .select(buildManagedTemplateFieldsQuery())
    .eq('user_id', userId)
    .eq('is_template', true)
    .is('date_trashed', null)
    .order('type', { ascending: true })
    .order('subtype', { ascending: true })
    .order('title', { ascending: true })
    .order('date_modified', { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchTrashedItems(userId) {
  const { data, error } = await supabase
    .from('items')
    .select(buildTrashItemFieldsQuery())
    .eq('user_id', userId)
    .not('date_trashed', 'is', null)
    .order('date_trashed', { ascending: false, nullsFirst: false })
    .order('date_modified', { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchHomeSummary(userId) {
  const { dateField } = formatLocalDateParts(new Date());
  const [
    inboxCount,
    { data: workbenchItems, error: workbenchError },
    existingDailyNote,
  ] = await Promise.all([
    fetchInboxCount(userId),
    supabase
      .from('items')
      .select(buildHomeWorkbenchFieldsQuery())
      .eq('user_id', userId)
      .eq('is_template', false)
      .eq('workbench', true)
      .is('date_trashed', null)
      .order('date_modified', { ascending: false, nullsFirst: false })
      .order('date_created', { ascending: false, nullsFirst: false })
      .limit(HOME_WORKBENCH_LIMIT),
    fetchDailyNoteForDate({
      dateField,
      userId,
    }),
  ]);

  if (workbenchError) {
    throw workbenchError;
  }

  return {
    hasTodayDailyNote: Boolean(existingDailyNote?.id),
    inboxCount,
    workbenchItems: workbenchItems ?? [],
  };
}

export async function fetchInboxCount(userId) {
  const { count, error } = await supabase
    .from('items')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', userId)
    .eq('is_template', false)
    .eq('type', 'inbox')
    .eq('status', 'unprocessed')
    .is('date_trashed', null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function fetchItemsFilters(userId) {
  const { data, error } = await supabase
    .from('items')
    .select('type,subtype')
    .eq('user_id', userId)
    .eq('is_template', false)
    .is('date_trashed', null)
    .order('type', { ascending: true })
    .order('subtype', { ascending: true });

  if (error) {
    throw error;
  }

  const typeOptions = [];
  const subtypeOptions = [];
  const seenTypes = new Set();
  const seenSubtypes = new Set();

  (data ?? []).forEach((item) => {
    const normalizedType = String(item.type ?? '').trim();
    const normalizedSubtype = String(item.subtype ?? '').trim();
    const subtypeKey = `${normalizedType}::${normalizedSubtype}`;

    if (normalizedType && !seenTypes.has(normalizedType)) {
      seenTypes.add(normalizedType);
      typeOptions.push(normalizedType);
    }

    if (
      normalizedType &&
      normalizedSubtype &&
      !seenSubtypes.has(subtypeKey)
    ) {
      seenSubtypes.add(subtypeKey);
      subtypeOptions.push({
        subtype: normalizedSubtype,
        type: normalizedType,
      });
    }
  });

  return {
    subtypeOptions,
    typeOptions,
  };
}

export async function fetchItemsIndex({
  query,
  sort,
  subtype,
  type,
  userId,
}) {
  const trimmedQuery = query.trim();
  let request = supabase
    .from('items')
    .select(buildItemsIndexFieldsQuery())
    .eq('user_id', userId)
    .eq('is_template', false)
    .is('date_trashed', null);

  if (type) {
    request = request.eq('type', type);
  }

  if (subtype) {
    request = request.eq('subtype', subtype);
  }

  if (trimmedQuery) {
    request = request.or(
      buildFilenameAwareSearchFilter(trimmedQuery, {
        includeContent: true,
      }),
    );
  }

  if (sort === 'date_created') {
    request = request
      .order('date_created', { ascending: false, nullsFirst: false })
      .order('date_modified', { ascending: false, nullsFirst: false });
  } else if (sort === 'title') {
    request = request
      .order('title', { ascending: true, nullsFirst: false })
      .order('date_modified', { ascending: false, nullsFirst: false });
  } else {
    request = request
      .order('date_modified', { ascending: false, nullsFirst: false })
      .order('date_created', { ascending: false, nullsFirst: false });
  }

  const { data, error } = await request.limit(ITEMS_ROUTE_LIMIT);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchNotesIndex({ filter, userId }) {
  let request = supabase
    .from('items')
    .select(buildNotesItemsFieldsQuery())
    .eq('user_id', userId)
    .eq('is_template', false)
    .is('date_trashed', null)
    .neq('type', 'action')
    .neq('type', 'inbox');

  if (filter === 'todo') {
    request = request.gt('todos_open', 0);
  } else if (filter === 'today') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    request = request.gte('date_modified', todayStart.toISOString());
  } else if (filter === 'pinned') {
    request = request.eq('is_pinned', true);
  }

  const { data, error } = await request
    .order('date_modified', { ascending: false, nullsFirst: false })
    .order('date_created', { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchContextSheetCounts(userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const baseQuery = () =>
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_template', false)
      .is('date_trashed', null)
      .neq('type', 'action')
      .neq('type', 'inbox');

  const sourceBase = () =>
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'reference')
      .eq('subtype', 'source')
      .eq('is_template', false)
      .is('date_trashed', null);

  const [
    { count: notesCount, error: notesError },
    { count: todoCount, error: todoError },
    { count: todayCount, error: todayError },
    { count: pinnedCount, error: pinnedError },
    { count: trashCount, error: trashError },
    { count: sourcesBacklogCount, error: sourcesBacklogError },
    { count: sourcesActiveCount, error: sourcesActiveError },
  ] = await Promise.all([
    baseQuery(),
    baseQuery().gt('todos_open', 0),
    baseQuery().gte('date_modified', todayStart.toISOString()),
    baseQuery().eq('is_pinned', true),
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_template', false)
      .not('date_trashed', 'is', null),
    sourceBase().eq('status', 'backlog'),
    sourceBase().eq('status', 'active'),
  ]);

  if (notesError) throw notesError;
  if (todoError) throw todoError;
  if (todayError) throw todayError;
  if (pinnedError) throw pinnedError;
  if (trashError) throw trashError;
  if (sourcesBacklogError) throw sourcesBacklogError;
  if (sourcesActiveError) throw sourcesActiveError;

  return {
    notes: notesCount ?? 0,
    todo: todoCount ?? 0,
    today: todayCount ?? 0,
    pinned: pinnedCount ?? 0,
    trash: trashCount ?? 0,
    sources_backlog: sourcesBacklogCount ?? 0,
    sources_active: sourcesActiveCount ?? 0,
    sources: (sourcesBacklogCount ?? 0) + (sourcesActiveCount ?? 0),
  };
}

export async function fetchUnprocessedInboxItems(userId) {
  const { data, error } = await supabase
    .from('items')
    .select(buildInboxItemFieldsQuery())
    .eq('user_id', userId)
    .eq('type', 'inbox')
    .eq('status', 'unprocessed')
    .is('date_trashed', null)
    .order('date_created', { ascending: true, nullsFirst: false })
    .order('date_modified', { ascending: true, nullsFirst: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function searchCommandItemsByTitle(userId, query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const { data, error } = await supabase
    .from('items')
    .select(buildCommandItemFieldsQuery())
    .eq('user_id', userId)
    .eq('is_template', false)
    .is('date_trashed', null)
    .or(buildFilenameAwareSearchFilter(trimmedQuery))
    .order('date_modified', { ascending: false, nullsFirst: false })
    .limit(SEARCH_ITEMS_LIMIT);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createInboxItemFromCapture({ rawValue, userId }) {
  const capturePayload = formatCapturePayload(rawValue);

  if (!capturePayload) {
    throw new Error('Cannot capture an empty value.');
  }

  const createdAt = new Date();
  const timestamp = createdAt.toISOString();
  const itemPayload = {
    content: capturePayload.content,
    date_created: timestamp,
    date_modified: timestamp,
    status: 'unprocessed',
    title: capturePayload.title,
    type: 'inbox',
    user_id: userId,
  };

  for (let collisionIndex = 0; collisionIndex <= MAX_CUID_RETRIES; collisionIndex += 1) {
    const { data, error } = await supabase
    .from('items')
    .insert({
      ...itemPayload,
      cuid: createCuid(createdAt, collisionIndex),
      filename: capturePayload.filename,
    })
    .select(buildCommandItemFieldsQuery())
    .single();

    if (!error) {
      return data;
    }

    if (!isCuidConflictError(error) || collisionIndex === MAX_CUID_RETRIES) {
      throw error;
    }
  }

  throw new Error('Unable to create a unique timestamp id right now.');
}

export async function createItemFromTemplate({
  templateId,
  title = '',
  userId,
}) {
  const [
    { data: templateItem, error: templateError },
    templateSettings,
  ] = await Promise.all([
    supabase
      .from('items')
      .select('*')
      .eq('id', templateId)
      .eq('is_template', true)
      .eq('user_id', userId)
      .is('date_trashed', null)
      .single(),
    fetchTemplateSettings({ userId }),
  ]);

  if (templateError) {
    throw templateError;
  }

  const createdAt = new Date();
  const timestamp = createdAt.toISOString();

  for (let collisionIndex = 0; collisionIndex <= MAX_CUID_RETRIES; collisionIndex += 1) {
    const baseItem = buildClonedTemplatePayload({
      collisionIndex,
      isTemplate: false,
      templateItem,
      timestamp,
      userId,
    });
    const materializedTemplatePayload = buildMaterializedTemplateUpdatePayload({
      baseItem,
      createdAt,
      fallbackTitle: title,
      templateItem,
      templateSettings,
      titleValue: title,
    });

    if (!materializedTemplatePayload.filename) {
      throw new Error(
        'Add a title or filename with letters or numbers before creating this item.',
      );
    }

    await ensureFilenameIsUnique({
      filename: materializedTemplatePayload.filename,
      userId,
    });

    const { data, error } = await supabase
      .from('items')
      .insert({
        ...baseItem,
        ...materializedTemplatePayload,
      })
      .select(buildCommandItemFieldsQuery())
      .single();

    if (!error) {
      return data;
    }

    if (!isCuidConflictError(error) || collisionIndex === MAX_CUID_RETRIES) {
      throw error;
    }
  }

  throw new Error('Unable to create a unique timestamp id right now.');
}

export async function buildMaterializedTemplateMarkdown({
  templateItem,
  titleValue = '',
  userId,
}) {
  const createdAt = new Date();
  const templateSettings = await fetchTemplateSettings({ userId });

  return materializeTemplateRawMarkdown({
    createdAt,
    cuid: createCuid(createdAt),
    rawMarkdown: buildEditorMarkdownDocument(templateItem),
    templateSettings,
    titleValue,
  });
}

export async function createBlankTemplate({ userId }) {
  const createdAt = new Date();
  const templateSettings = await fetchTemplateSettings({ userId });

  for (let collisionIndex = 0; collisionIndex <= MAX_CUID_RETRIES; collisionIndex += 1) {
    const { data, error } = await supabase
      .from('items')
      .insert(buildBlankTemplatePayload({
        collisionIndex,
        createdAt,
        folder: templateSettings.folder,
        userId,
      }))
      .select(buildManagedTemplateFieldsQuery())
      .single();

    if (!error) {
      return data;
    }

    if (!isCuidConflictError(error) || collisionIndex === MAX_CUID_RETRIES) {
      throw error;
    }
  }

  throw new Error('Unable to create a unique timestamp id right now.');
}

export async function processInboxItem({
  filenameInput,
  itemId,
  templateId,
  userId,
}) {
  const [
    { data: inboxItem, error: inboxError },
    { data: templateItem, error: templateError },
    templateSettings,
  ] = await Promise.all([
      supabase
        .from('items')
        .select(buildInboxItemFieldsQuery())
        .eq('id', itemId)
        .eq('user_id', userId)
        .eq('type', 'inbox')
        .eq('status', 'unprocessed')
        .is('date_trashed', null)
        .single(),
      supabase
        .from('items')
        .select('*')
        .eq('id', templateId)
        .eq('is_template', true)
        .eq('user_id', userId)
        .is('date_trashed', null)
        .single(),
      fetchTemplateSettings({ userId }),
    ]);

  if (inboxError) {
    throw inboxError;
  }

  if (templateError) {
    throw templateError;
  }

  const fallbackFilenameInput =
    buildTitleFromFilename(inboxItem.filename, inboxItem.title) || null;
  const effectiveFilenameInput =
    String(filenameInput ?? '').trim() || fallbackFilenameInput || '';
  const normalizedFilename = normalizeFilenameValue(effectiveFilenameInput);
  const normalizedTitle =
    buildTitleFromFilename(normalizedFilename, effectiveFilenameInput) ||
    fallbackFilenameInput ||
    null;
  const createdAt = new Date();
  const timestamp = createdAt.toISOString();
  const templateFields = sanitizeTemplateFields(templateItem);
  const baseItem = {
    ...inboxItem,
    ...templateFields,
    filename: normalizedFilename,
    content: inboxItem.content,
    date_modified: timestamp,
    date_trashed: null,
    is_template: false,
    status: 'backlog',
    title: normalizedTitle,
    user_id: userId,
  };
  const materializedTemplatePayload = buildMaterializedTemplateUpdatePayload({
    baseItem,
    createdAt,
    fallbackTitle: normalizedTitle,
    templateItem,
    templateSettings,
    titleValue: normalizedTitle,
  });

  if (!materializedTemplatePayload.filename) {
    throw new Error(
      'Add a title or filename with letters or numbers before processing this item.',
    );
  }

  await ensureFilenameIsUnique({
    excludeItemId: itemId,
    filename: materializedTemplatePayload.filename,
    userId,
  });

  const { data, error } = await supabase
    .from('items')
    .update({
      ...baseItem,
      ...materializedTemplatePayload,
      content: inboxItem.content,
      date_modified: timestamp,
      date_trashed: null,
      is_template: false,
      status: 'backlog',
      title: materializedTemplatePayload.title,
      user_id: userId,
    })
    .eq('id', itemId)
    .eq('user_id', userId)
    .eq('type', 'inbox')
    .eq('status', 'unprocessed')
    .select(buildInboxItemFieldsQuery())
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveEditorItem({
  filenameOverride,
  itemId,
  rawMarkdown,
  userId,
}) {
  const { data: existingItem, error: existingItemError } = await supabase
    .from('items')
    .select(buildEditorItemFieldsQuery())
    .eq('id', itemId)
    .eq('user_id', userId)
    .is('date_trashed', null)
    .single();

  if (existingItemError) {
    throw existingItemError;
  }

  const { body, frontmatter } = parseEditorMarkdownDocument(rawMarkdown);
  const modifiedAt = new Date().toISOString();
  const frontmatterPayload = buildItemUpdatePayloadFromFrontmatter({
    existingItem,
    modifiedAt,
    parsedFrontmatter: frontmatter,
  });
  const normalizedFilenameOverride = normalizeFilenameValue(filenameOverride);
  const hasDraftFilename = Object.prototype.hasOwnProperty.call(
    frontmatter,
    'filename',
  );
  const nextFilename = normalizedFilenameOverride
    ?? (hasDraftFilename
      ? resolveNextFilename({
        parsedFrontmatter: frontmatter,
        title: String(frontmatterPayload.title ?? '').trim() || null,
      })
      : existingItem.filename)
    ?? resolveNextFilename({
      parsedFrontmatter: frontmatter,
      title: String(frontmatterPayload.title ?? '').trim() || null,
    });
  const nextTitle =
    String(frontmatterPayload.title ?? '').trim() ||
    buildTitleFromFilename(nextFilename) ||
    null;

  if (existingItem.is_template !== true && !nextFilename) {
    throw new Error(
      'Add a title or filename with letters or numbers before saving.',
    );
  }

  await ensureFilenameIsUnique({
    excludeItemId: itemId,
    filename: nextFilename,
    userId,
  });

  const todos_open = (body.match(/^- \[ \] /gm) ?? []).length;
  const todos_done = (body.match(/^- \[x\] /gim) ?? []).length;

  const updatePayload = {
    ...frontmatterPayload,
    content: body,
    filename: nextFilename,
    date_modified: modifiedAt,
    title: nextTitle,
    todos_open,
    todos_done,
  };
  const savedSnapshot = buildEditorMarkdownDocument({
    ...existingItem,
    ...updatePayload,
  });
  const { data: savedItem, error: updateError } = await supabase
    .from('items')
    .update(updatePayload)
    .eq('id', itemId)
    .eq('user_id', userId)
    .is('date_trashed', null)
    .select(buildEditorItemFieldsQuery())
    .single();

  if (updateError) {
    throw updateError;
  }

  const { error: historyError } = await supabase.from('item_history').insert({
    change_type: 'updated',
    content: savedSnapshot,
    item_id: itemId,
  });

  if (historyError) {
    const error = new Error('Item saved, but the history snapshot failed.');
    error.cause = historyError;
    error.item = savedItem;
    error.rawMarkdown = savedSnapshot;
    throw error;
  }

  return {
    item: savedItem,
    rawMarkdown: savedSnapshot,
  };
}

export async function toggleItemPin({ itemId, userId }) {
  const { data: existingItem, error: existingItemError } = await supabase
    .from('items')
    .select('id,is_pinned,is_template')
    .eq('id', itemId)
    .eq('user_id', userId)
    .is('date_trashed', null)
    .single();

  if (existingItemError) {
    throw existingItemError;
  }

  if (existingItem.is_template === true) {
    throw new Error('Templates cannot be pinned.');
  }

  const updatedAt = new Date().toISOString();
  const { data: pinnedItem, error: updateError } = await supabase
    .from('items')
    .update({
      date_modified: updatedAt,
      is_pinned: !existingItem.is_pinned,
    })
    .eq('id', itemId)
    .eq('user_id', userId)
    .is('date_trashed', null)
    .select(buildEditorItemFieldsQuery())
    .single();

  if (updateError) {
    throw updateError;
  }

  return pinnedItem;
}

export async function trashTemplate({ templateId, userId }) {
  const { data: existingTemplate, error: existingTemplateError } = await supabase
    .from('items')
    .select(buildEditorItemFieldsQuery())
    .eq('id', templateId)
    .eq('user_id', userId)
    .eq('is_template', true)
    .is('date_trashed', null)
    .single();

  if (existingTemplateError) {
    throw existingTemplateError;
  }

  const trashedAt = new Date().toISOString();
  const { data: trashedTemplate, error: trashedTemplateError } = await supabase
    .from('items')
    .update({
      date_modified: trashedAt,
      date_trashed: trashedAt,
    })
    .eq('id', templateId)
    .eq('user_id', userId)
    .eq('is_template', true)
    .is('date_trashed', null)
    .select(buildManagedTemplateFieldsQuery())
    .single();

  if (trashedTemplateError) {
    throw trashedTemplateError;
  }

  const { error: historyError } = await supabase.from('item_history').insert({
    change_type: 'trashed',
    content: buildTrashedItemHistorySnapshot(existingTemplate, trashedAt),
    item_id: templateId,
  });

  if (historyError) {
    const error = new Error('Template deleted, but the history snapshot failed.');
    error.cause = historyError;
    error.item = trashedTemplate;
    throw error;
  }

  return trashedTemplate;
}

export async function restoreTrashedItem({ itemId, userId }) {
  const { data: existingItem, error: existingItemError } = await supabase
    .from('items')
    .select(buildEditorItemFieldsQuery())
    .eq('id', itemId)
    .eq('user_id', userId)
    .not('date_trashed', 'is', null)
    .single();

  if (existingItemError) {
    throw existingItemError;
  }

  const restoredAt = new Date().toISOString();
  const { data: restoredItem, error: restoredItemError } = await supabase
    .from('items')
    .update({
      date_modified: restoredAt,
      date_trashed: null,
    })
    .eq('id', itemId)
    .eq('user_id', userId)
    .not('date_trashed', 'is', null)
    .select(buildTrashItemFieldsQuery())
    .single();

  if (restoredItemError) {
    throw restoredItemError;
  }

  const { error: historyError } = await supabase.from('item_history').insert({
    change_type: 'restored',
    content: buildRestoredItemHistorySnapshot(existingItem, restoredAt),
    item_id: itemId,
  });

  if (historyError) {
    const error = new Error('Item restored, but the history snapshot failed.');
    error.cause = historyError;
    error.item = restoredItem;
    throw error;
  }

  return restoredItem;
}

export async function permanentlyDeleteTrashedItem({ itemId, userId }) {
  const { data: deletedItem, error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId)
    .not('date_trashed', 'is', null)
    .select(buildTrashItemFieldsQuery())
    .single();

  if (error) {
    throw error;
  }

  return deletedItem;
}

export async function openOrCreateDailyNote({
  date = new Date(),
  userId,
}) {
  const { dateField } = formatLocalDateParts(date);
  const requestKey = `${userId}:${dateField}`;

  if (pendingDailyNoteRequests.has(requestKey)) {
    return pendingDailyNoteRequests.get(requestKey);
  }

  const pendingRequest = (async () => {
    const existingDailyNote = await fetchDailyNoteForDate({
      dateField,
      userId,
    });

    if (existingDailyNote) {
      return {
        item: existingDailyNote,
        wasCreated: false,
      };
    }

    const repairedDailyNote = await repairMissingDailyNoteDateField({
      dateField,
      userId,
    });

    if (repairedDailyNote) {
      return {
        item: repairedDailyNote,
        wasCreated: false,
      };
    }

    const { dailyNoteFolder, dailyTemplateId } =
      await fetchResolvedDailyNotePreferences({ userId });
    const createdDailyNote = await createDailyNoteForDate({
      date,
      dailyNoteFolder,
      templateId: dailyTemplateId,
      userId,
    });

    return {
      item: createdDailyNote,
      wasCreated: true,
    };
  })().finally(() => {
    pendingDailyNoteRequests.delete(requestKey);
  });

  pendingDailyNoteRequests.set(requestKey, pendingRequest);

  return pendingRequest;
}
