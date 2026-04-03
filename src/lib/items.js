import { createCuid } from './cuid';
import {
  buildEditorMarkdownDocument,
  buildItemUpdatePayloadFromFrontmatter,
  parseEditorMarkdownDocument,
} from './frontmatter';
import { supabase } from './supabase';

const RECENT_ITEMS_LIMIT = 8;
const SEARCH_ITEMS_LIMIT = 8;
const MAX_CUID_RETRIES = 20;

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

function isCuidConflictError(error) {
  return error?.code === '23505' && error?.message?.includes('cuid');
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

function buildCreatedItemPayload(templateItem, userId, timestamp, collisionIndex) {
  const templateFields = sanitizeTemplateFields(templateItem);

  return {
    ...templateFields,
    cuid: createCuid(new Date(timestamp), collisionIndex),
    date_created: timestamp,
    date_modified: timestamp,
    date_trashed: null,
    is_template: false,
    user_id: userId,
  };
}

export function getCapturePreview(rawValue) {
  return formatCapturePayload(rawValue);
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
      .insert(buildCreatedItemPayload(templateItem, userId, timestamp, collisionIndex))
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
