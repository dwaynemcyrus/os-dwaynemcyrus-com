import { supabase } from './supabase';

const SOURCE_FIELDS = [
  'id',
  'title',
  'subtitle',
  'type',
  'subtype',
  'status',
  'url',
  'isbn',
  'author',
  'medium',
  'source_type',
  'site_name',
  'favicon_url',
  'cover_link',
  'cover_alt_text',
  'description',
  'normalized_url',
  'archived_at',
  'tags',
  'date_created',
  'date_modified',
  'date_trashed',
].join(',');

const FILTER_STATUS = {
  inbox: 'backlog',
  reading: 'active',
  archive: 'archived',
};

export const SOURCE_FILTER_LABELS = {
  inbox: 'Inbox',
  reading: 'Reading',
  archive: 'Archive',
};

export const SOURCE_TYPE_LABELS = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  post: 'Post',
  book: 'Book',
  other: 'Other',
};

const SOURCE_TYPE_DOMAINS = [
  { type: 'video', domains: ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv'] },
  {
    type: 'podcast',
    domains: ['podcasts.apple.com', 'open.spotify.com', 'overcast.fm', 'pocketcasts.com'],
  },
  { type: 'post', domains: ['x.com', 'twitter.com', 'threads.net', 'bsky.app'] },
];

export function detectSourceType(url) {
  if (!url) return 'other';

  let hostname;

  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'article';
  }

  for (const { type, domains } of SOURCE_TYPE_DOMAINS) {
    if (domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return type;
    }
  }

  return 'article';
}

export function normalizeUrl(rawUrl) {
  if (!rawUrl) return null;

  let parsed;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  parsed.hash = '';

  const TRACKING_PARAMS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'dclid', 'mc_cid', 'mc_eid', 'igshid', 'ref', 'ref_src',
  ]);

  const params = [...parsed.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.has(key) && !key.startsWith('utm_'))
    .sort(([a], [b]) => a.localeCompare(b));

  parsed.search = '';

  for (const [key, value] of params) {
    parsed.searchParams.append(key, value);
  }

  return parsed.toString().toLowerCase().replace(/\/$/, '');
}

export function isLikelyUrl(text) {
  const trimmed = text.trim();
  return /^https?:\/\//i.test(trimmed) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed);
}

export async function fetchSourcesIndex({ filter, userId }) {
  const status = FILTER_STATUS[filter];

  if (!status) {
    throw new Error(`Unknown source filter: ${filter}`);
  }

  const { data, error } = await supabase
    .from('items')
    .select(SOURCE_FIELDS)
    .eq('user_id', userId)
    .eq('type', 'reference')
    .eq('subtype', 'source')
    .eq('status', status)
    .eq('is_template', false)
    .is('date_trashed', null)
    .order('date_modified', { ascending: false, nullsFirst: false })
    .order('date_created', { ascending: false, nullsFirst: false });

  if (error) throw error;

  return data ?? [];
}

export async function fetchSourceById(id, userId) {
  const { data, error } = await supabase
    .from('items')
    .select(`${SOURCE_FIELDS},content,frontmatter`)
    .eq('id', id)
    .eq('user_id', userId)
    .eq('type', 'reference')
    .eq('subtype', 'source')
    .is('date_trashed', null)
    .single();

  if (error) throw error;

  return data;
}

export async function fetchSourceCounts(userId) {
  const baseQuery = () =>
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'reference')
      .eq('subtype', 'source')
      .eq('is_template', false)
      .is('date_trashed', null);

  const [
    { count: backlogCount, error: backlogError },
    { count: activeCount, error: activeError },
  ] = await Promise.all([
    baseQuery().eq('status', 'backlog'),
    baseQuery().eq('status', 'active'),
  ]);

  if (backlogError) throw backlogError;
  if (activeError) throw activeError;

  return {
    sources_backlog: backlogCount ?? 0,
    sources_active: activeCount ?? 0,
    sources: (backlogCount ?? 0) + (activeCount ?? 0),
  };
}

export async function updateSourceStatus(id, userId, status) {
  const updates = { status, date_modified: new Date().toISOString() };

  if (status === 'archived') {
    const { data: existing } = await supabase
      .from('items')
      .select('archived_at')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing?.archived_at) {
      updates.archived_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select(SOURCE_FIELDS)
    .single();

  if (error) throw error;

  return data;
}

export async function trashSource(id, userId) {
  const { error } = await supabase
    .from('items')
    .update({ date_trashed: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

async function findExistingSourceByUrl(normalizedUrl, userId) {
  const { data } = await supabase
    .from('items')
    .select('id,status,archived_at')
    .eq('user_id', userId)
    .eq('normalized_url', normalizedUrl)
    .is('date_trashed', null)
    .maybeSingle();

  return data ?? null;
}

export async function createSourceFromCapture({ captureId, rawText, userId }) {
  const trimmed = rawText.trim();
  const normalizedUrl = normalizeUrl(trimmed);
  const isUrl = Boolean(normalizedUrl);

  if (isUrl) {
    const existing = await findExistingSourceByUrl(normalizedUrl, userId);

    if (existing) {
      if (existing.status === 'archived') {
        await supabase
          .from('items')
          .update({ status: 'backlog', date_modified: new Date().toISOString() })
          .eq('id', existing.id)
          .eq('user_id', userId);

        if (captureId) {
          await supabase
            .from('items')
            .update({ date_trashed: new Date().toISOString() })
            .eq('id', captureId)
            .eq('user_id', userId);
        }

        return { sourceId: existing.id, duplicate: 'archived' };
      }

      if (captureId) {
        await supabase
          .from('items')
          .update({ date_trashed: new Date().toISOString() })
          .eq('id', captureId)
          .eq('user_id', userId);
      }

      return { sourceId: existing.id, duplicate: 'existing' };
    }
  }

  const sourceType = isUrl ? detectSourceType(trimmed) : 'book';

  const payload = {
    user_id: userId,
    type: 'reference',
    subtype: 'source',
    status: 'backlog',
    title: isUrl ? trimmed : trimmed,
    url: isUrl ? trimmed : null,
    normalized_url: normalizedUrl,
    source_type: sourceType,
    is_template: false,
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('items')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;

  if (captureId) {
    await supabase
      .from('items')
      .update({ date_trashed: new Date().toISOString() })
      .eq('id', captureId)
      .eq('user_id', userId);
  }

  return { sourceId: data.id, duplicate: null };
}

export async function enrichSourceWithMetadata(sourceId, userId, url) {
  let metadata = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch('/api/fetch-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      metadata = await response.json();
    }
  } catch {
    // metadata fetch failure is non-fatal — source already saved
  }

  if (!metadata) return null;

  const updates = {
    date_modified: new Date().toISOString(),
  };

  if (metadata.title) updates.title = metadata.title;
  if (metadata.description) updates.description = metadata.description;
  if (metadata.site_name) updates.site_name = metadata.site_name;
  if (metadata.favicon_url) updates.favicon_url = metadata.favicon_url;
  if (metadata.cover_link) updates.cover_link = metadata.cover_link;
  if (metadata.source_type) updates.source_type = metadata.source_type;

  const { error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', sourceId)
    .eq('user_id', userId);

  if (error) throw error;

  return metadata;
}
