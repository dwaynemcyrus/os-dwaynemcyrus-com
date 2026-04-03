const DEFAULT_REDIRECT_TARGET = '/';

export function sanitizeRedirectTarget(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return DEFAULT_REDIRECT_TARGET;
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_REDIRECT_TARGET;
  }

  return value;
}
