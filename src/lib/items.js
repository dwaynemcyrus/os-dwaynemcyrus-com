import { createCuid } from './cuid';
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

function isCuidConflictError(error) {
  return error?.code === '23505' && error?.message?.includes('cuid');
}

export function getCapturePreview(rawValue) {
  return formatCapturePayload(rawValue);
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
