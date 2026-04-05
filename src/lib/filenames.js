function capitalizeWord(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatFilenameForDisplay(value, fallbackValue = '') {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    return fallbackValue;
  }

  return normalizedValue
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => capitalizeWord(part))
    .join(' ');
}
