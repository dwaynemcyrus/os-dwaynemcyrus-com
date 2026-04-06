function capitalizeWord(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeTextValue(value) {
  return String(value ?? '').trim();
}

export function formatFilenameForDisplay(value, fallbackValue = '') {
  const normalizedValue = normalizeTextValue(value);

  if (!normalizedValue) {
    return normalizeTextValue(fallbackValue);
  }

  return normalizedValue
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => capitalizeWord(part))
    .join(' ');
}

export function buildTitleFromFilename(filename, fallbackValue = '') {
  return formatFilenameForDisplay(filename, fallbackValue);
}

export function titleOverridesFilename({ filename, title }) {
  const normalizedTitle = normalizeTextValue(title);

  if (!normalizedTitle) {
    return false;
  }

  const derivedTitle = formatFilenameForDisplay(filename);

  if (!derivedTitle) {
    return true;
  }

  return normalizedTitle !== derivedTitle;
}

function getContentFirstLine(content) {
  const normalizedContent = normalizeTextValue(content);

  if (!normalizedContent) {
    return '';
  }

  return normalizeTextValue(normalizedContent.split('\n')[0]);
}

export function getItemDisplayLabel(item, fallbackValue = '') {
  const normalizedTitle = normalizeTextValue(item?.title);
  const derivedTitle = formatFilenameForDisplay(item?.filename);

  if (normalizedTitle && (!derivedTitle || normalizedTitle !== derivedTitle)) {
    return normalizedTitle;
  }

  if (derivedTitle) {
    return derivedTitle;
  }

  if (normalizedTitle) {
    return normalizedTitle;
  }

  const contentFirstLine = getContentFirstLine(item?.content);

  if (contentFirstLine) {
    return contentFirstLine;
  }

  return normalizeTextValue(fallbackValue) || normalizeTextValue(item?.cuid);
}
