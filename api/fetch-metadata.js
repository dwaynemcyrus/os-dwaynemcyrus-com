import { createClient } from '@supabase/supabase-js';

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 500 * 1024; // 500KB

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^localhost$/i,
  /^0\.0\.0\.0$/,
];

function isPrivateHost(hostname) {
  return PRIVATE_RANGES.some((re) => re.test(hostname));
}

function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 1000);
}

function extractMeta(html) {
  const getMeta = (property) => {
    const match =
      html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'));
    return match ? match[1] : '';
  };

  const getMetaName = (name) => {
    const match =
      html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'));
    return match ? match[1] : '';
  };

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1] : '';

  const ogTitle = getMeta('og:title');
  const ogDescription = getMeta('og:description');
  const ogImage = getMeta('og:image');
  const ogSiteName = getMeta('og:site_name');
  const ogType = getMeta('og:type');
  const metaDescription = getMetaName('description');

  return {
    title: ogTitle || pageTitle,
    description: ogDescription || metaDescription,
    og_image: ogImage,
    site_name: ogSiteName,
    og_type: ogType,
  };
}

function detectSourceTypeFromMeta(siteName, ogType, hostname) {
  const site = (siteName || '').toLowerCase();
  const type = (ogType || '').toLowerCase();
  const host = (hostname || '').toLowerCase().replace(/^www\./, '');

  const videoHosts = ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv'];
  const podcastHosts = ['podcasts.apple.com', 'open.spotify.com', 'overcast.fm', 'pocketcasts.com'];
  const postHosts = ['x.com', 'twitter.com', 'threads.net', 'bsky.app'];

  if (videoHosts.some((h) => host === h || host.endsWith(`.${h}`))) return 'video';
  if (podcastHosts.some((h) => host === h || host.endsWith(`.${h}`))) return 'podcast';
  if (postHosts.some((h) => host === h || host.endsWith(`.${h}`))) return 'post';
  if (type === 'video.other' || type === 'video.movie' || type === 'video.episode') return 'video';

  return 'article';
}

function extractFaviconUrl(html, baseUrl) {
  const match =
    html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i);

  if (!match) {
    try {
      const parsed = new URL(baseUrl);
      return `${parsed.origin}/favicon.ico`;
    } catch {
      return '';
    }
  }

  try {
    return new URL(match[1], baseUrl).toString();
  } catch {
    return match[1];
  }
}

function resolveAbsoluteUrl(value, baseUrl) {
  if (!value) return '';
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace(/^Bearer\s+/, '');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { url } = req.body ?? {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  let parsed;

  try {
    parsed = new URL(url.trim());
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return res.status(400).json({ error: 'URL scheme not allowed' });
  }

  if (isPrivateHost(parsed.hostname)) {
    return res.status(400).json({ error: 'Private network URLs are not allowed' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    let finalUrl = url.trim();
    let redirectCount = 0;

    try {
      response = await fetch(finalUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PersonalOS/1.0; +metadata-fetch)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'manual',
      });

      while (
        (response.status === 301 || response.status === 302 ||
          response.status === 303 || response.status === 307 || response.status === 308) &&
        redirectCount < MAX_REDIRECTS
      ) {
        const location = response.headers.get('location');
        if (!location) break;

        const nextUrl = new URL(location, finalUrl).toString();
        const nextParsed = new URL(nextUrl);

        if (!ALLOWED_SCHEMES.has(nextParsed.protocol) || isPrivateHost(nextParsed.hostname)) {
          break;
        }

        finalUrl = nextUrl;
        redirectCount++;
        response = await fetch(finalUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PersonalOS/1.0; +metadata-fetch)',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'manual',
        });
      }
    } finally {
      clearTimeout(timeoutId);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return res.status(422).json({ error: 'URL did not return HTML content' });
    }

    // Read with size limit
    const reader = response.body.getReader();
    const chunks = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) break;
      chunks.push(value);
    }

    const html = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.byteLength + chunk.byteLength);
        merged.set(acc);
        merged.set(chunk, acc.byteLength);
        return merged;
      }, new Uint8Array(0)),
    );

    const meta = extractMeta(html);
    const hostname = new URL(finalUrl).hostname;
    const sourceType = detectSourceTypeFromMeta(meta.site_name, meta.og_type, hostname);
    const faviconUrl = extractFaviconUrl(html, finalUrl);
    const ogImageAbsolute = resolveAbsoluteUrl(meta.og_image, finalUrl);

    return res.status(200).json({
      title: sanitizeString(meta.title),
      description: sanitizeString(meta.description),
      site_name: sanitizeString(meta.site_name),
      favicon_url: sanitizeString(faviconUrl),
      cover_link: sanitizeString(ogImageAbsolute),
      source_type: sourceType,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(408).json({ error: 'Request timed out' });
    }

    return res.status(502).json({ error: 'Unable to fetch URL metadata' });
  }
}
