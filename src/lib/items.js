import { createCuid } from './cuid';
import {
  buildEditorMarkdownDocument,
  buildItemUpdatePayloadFromFrontmatter,
  parseEditorMarkdownDocument,
  replaceEditorFrontmatterField,
} from './frontmatter';
import { fetchResolvedDailyTemplateId } from './settings';
import { supabase } from './supabase';

const RECENT_ITEMS_LIMIT = 8;
const SEARCH_ITEMS_LIMIT = 8;
const TAG_ITEM_POOL_LIMIT = 200;
const TAG_SUGGESTIONS_LIMIT = 10;
const MAX_CUID_RETRIES = 20;
const pendingDailyNoteRequests = new Map();

function escapeIlikePattern(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
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
  const title = normalizedFirstLine.slice(0, 280).trim();
  const overflow = normalizedFirstLine.slice(280).trim();
  const remainingContent = remainingLines.join('\n').trim();
  const contentParts = [overflow, remainingContent].filter(Boolean);

  return {
    content: contentParts.join('\n\n'),
    title,
  };
}

function buildCommandItemFieldsQuery() {
  return 'id,cuid,type,subtype,title,content,date_created,date_modified,is_template';
}

function buildInboxItemFieldsQuery() {
  return 'id,cuid,type,subtype,title,content,status,date_created,date_modified';
}

function buildEditorItemFieldsQuery() {
  return '*';
}

function buildEditorAutocompleteItemFieldsQuery() {
  return 'id,cuid,title,content,date_created,date_modified';
}

function buildManagedTemplateFieldsQuery() {
  return 'id,cuid,type,subtype,title,content,date_created,date_modified,date_trashed,is_template,user_id';
}

function buildDailyNoteFieldsQuery() {
  return 'id,cuid,type,subtype,title,status,date_created,date_modified,date_field';
}

function isCuidConflictError(error) {
  return error?.code === '23505' && error?.message?.includes('cuid');
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

function materializeDailyTemplateContent({
  content,
  cuid,
  localDateField,
  localDateTime,
}) {
  return String(content ?? '')
    .replaceAll('{{date:YYYYMMDD}}{{time:HHmmss}}', cuid)
    .replaceAll('{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}', localDateTime)
    .replaceAll('{{date:YYYY-MM-DD}}', localDateField);
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

async function createDailyNoteForDate({
  date,
  templateId,
  userId,
}) {
  const { data: templateItem, error: templateError } = await supabase
    .from('items')
    .select('*')
    .eq('id', templateId)
    .eq('is_template', true)
    .eq('subtype', 'daily')
    .is('date_trashed', null)
    .single();

  if (templateError) {
    throw templateError;
  }

  const timestamp = date.toISOString();
  const { dateField, localDateTime } = formatLocalDateParts(date);

  for (let collisionIndex = 0; collisionIndex <= MAX_CUID_RETRIES; collisionIndex += 1) {
    const cuid = createCuid(date, collisionIndex);
    const templateFields = sanitizeTemplateFields(templateItem);
    const { data, error } = await supabase
      .from('items')
      .insert({
        ...templateFields,
        cuid,
        date_created: timestamp,
        date_field: dateField,
        date_modified: timestamp,
        date_trashed: null,
        is_template: false,
        title: dateField,
        user_id: userId,
        content: materializeDailyTemplateContent({
          content: templateItem.content,
          cuid,
          localDateField: dateField,
          localDateTime,
        }),
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
    request = request.ilike('title', `%${escapeIlikePattern(trimmedQuery)}%`);
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
      label:
        item.title?.trim() || item.content?.split('\n')[0]?.trim() || item.cuid,
    }))
    .filter((item) => item.label);
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
    .is('date_trashed', null)
    .or(`user_id.eq.${userId},and(is_template.eq.true,user_id.is.null)`)
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

export async function fetchCommandTemplates() {
  const { data, error } = await supabase
    .from('items')
    .select(buildCommandItemFieldsQuery())
    .eq('is_template', true)
    .is('date_trashed', null)
    .order('type', { ascending: true })
    .order('subtype', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchManagedTemplates() {
  const { data, error } = await supabase
    .from('items')
    .select(buildManagedTemplateFieldsQuery())
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

export async function fetchUnprocessedInboxItems(userId) {
  const { data, error } = await supabase
    .from('items')
    .select(buildInboxItemFieldsQuery())
    .eq('user_id', userId)
    .eq('type', 'inbox')
    .eq('status', 'unprocessed')
    .is('date_trashed', null)
    .order('date_created', { ascending: false, nullsFirst: false })
    .order('date_modified', { ascending: false, nullsFirst: false });

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
    .ilike('title', `%${escapeIlikePattern(trimmedQuery)}%`)
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

export async function createItemFromTemplate({ templateId, userId }) {
  const { data: templateItem, error: templateError } = await supabase
    .from('items')
    .select('*')
    .eq('id', templateId)
    .eq('is_template', true)
    .single();

  if (templateError) {
    throw templateError;
  }

  const timestamp = new Date().toISOString();

  for (let collisionIndex = 0; collisionIndex <= MAX_CUID_RETRIES; collisionIndex += 1) {
    const { data, error } = await supabase
      .from('items')
      .insert(
        buildClonedTemplatePayload({
          collisionIndex,
          isTemplate: false,
          templateItem,
          timestamp,
          userId,
        }),
      )
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

export async function createUserTemplateFromSubtype({ subtype, userId }) {
  const normalizedSubtype = subtype?.trim();

  if (!normalizedSubtype) {
    throw new Error('A template subtype is required.');
  }

  const { data: seededTemplate, error: seededTemplateError } = await supabase
    .from('items')
    .select('*')
    .eq('is_template', true)
    .eq('subtype', normalizedSubtype)
    .is('user_id', null)
    .is('date_trashed', null)
    .single();

  if (seededTemplateError) {
    throw seededTemplateError;
  }

  const timestamp = new Date().toISOString();

  for (let collisionIndex = 0; collisionIndex <= MAX_CUID_RETRIES; collisionIndex += 1) {
    const { data, error } = await supabase
      .from('items')
      .insert(
        buildClonedTemplatePayload({
          collisionIndex,
          isTemplate: true,
          templateItem: seededTemplate,
          timestamp,
          userId,
        }),
      )
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
  itemId,
  templateId,
  title,
  userId,
}) {
  const [{ data: inboxItem, error: inboxError }, { data: templateItem, error: templateError }] =
    await Promise.all([
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
        .single(),
    ]);

  if (inboxError) {
    throw inboxError;
  }

  if (templateError) {
    throw templateError;
  }

  const normalizedTitle = title?.trim() || inboxItem.title || null;
  const timestamp = new Date().toISOString();
  const templateFields = sanitizeTemplateFields(templateItem);
  const { data, error } = await supabase
    .from('items')
    .update({
      ...templateFields,
      content: inboxItem.content,
      date_modified: timestamp,
      date_trashed: null,
      is_template: false,
      status: 'backlog',
      title: normalizedTitle,
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
  const updatePayload = {
    ...buildItemUpdatePayloadFromFrontmatter({
      existingItem,
      modifiedAt,
      parsedFrontmatter: frontmatter,
    }),
    content: body,
    date_modified: modifiedAt,
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

    const templateId = await fetchResolvedDailyTemplateId({ userId });
    const createdDailyNote = await createDailyNoteForDate({
      date,
      templateId,
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
