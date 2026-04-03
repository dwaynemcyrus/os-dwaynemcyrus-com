import { parseDocument, stringify } from 'yaml';

const ARRAY_FIELDS = new Set([
  'resources',
  'dependencies',
  'chains',
  'stack',
  'modules',
  'be_and_feel',
  'frequency',
  'tags',
]);

const BOOLEAN_FIELDS = new Set([
  'workbench',
  'blocked',
  'published',
  'bookmark',
  'for_sale',
  'sold',
  'exhibited',
]);

const INTEGER_FIELDS = new Set([
  'rating',
  'series_position',
  'year',
  'attendees',
  'episode',
  'season',
  'chapter_count',
  'issue',
  'total_sent',
  'total_comments',
  'total_responses',
]);

const NUMBER_FIELDS = new Set([
  'deal_value',
  'price',
  'lag_target',
  'lag_actual',
  'score_overall',
  'target',
  'month_revenue_chf',
  'month_expenses_chf',
  'month_profit_chf',
]);

const FRONTMATTER_DEFAULTS = {
  access: 'private',
  attendees: 0,
  be_and_feel: [],
  blocked: false,
  bookmark: false,
  chains: [],
  chapter_count: 0,
  currency: 'CHF',
  currency_primary: 'CHF',
  currency_secondary: 'USD',
  dependencies: [],
  exhibited: false,
  for_sale: false,
  frequency: [],
  lag_actual: 0,
  modules: [],
  month_expenses_chf: 0,
  month_profit_chf: 0,
  month_revenue_chf: 0,
  published: false,
  resources: [],
  sold: false,
  stack: [],
  tags: [],
  total_comments: 0,
  total_responses: 0,
  total_sent: 0,
  workbench: false,
};

const UNIVERSAL_FRONTMATTER_FIELDS = [
  'cuid',
  'type',
  'subtype',
  'title',
  'status',
  'access',
  'area',
  'workbench',
  'date_created',
  'date_modified',
  'date_trashed',
  'tags',
];

const FRONTMATTER_FIELD_ORDER = [
  'cuid',
  'type',
  'subtype',
  'title',
  'status',
  'access',
  'area',
  'workbench',
  'resources',
  'dependencies',
  'blocked',
  'slug',
  'published',
  'tier',
  'growth',
  'rating',
  'series',
  'series_position',
  'format',
  'medium',
  'genre',
  'platform',
  'collection',
  'source',
  'chains',
  'manuscript',
  'project',
  'principle',
  'course',
  'asset_type',
  'contact_type',
  'contact_status',
  'contacted_last',
  'next_follow_up',
  'deal_status',
  'deal_value',
  'institution',
  'instructor',
  'url',
  'isbn',
  'bookmark',
  'repo',
  'stack',
  'modules',
  'be_and_feel',
  'for_sale',
  'price',
  'currency',
  'sold',
  'exhibited',
  'dimensions',
  'year',
  'outcome',
  'problem',
  'solution',
  'delivery',
  'lag_measure',
  'lag_target',
  'lag_unit',
  'lag_actual',
  'score_overall',
  'week',
  'month',
  'theme',
  'date_delivered',
  'recording_link',
  'attendees',
  'duration_target',
  'episode',
  'season',
  'cover_link',
  'cover_alt_text',
  'certificate_link',
  'unit',
  'target',
  'frequency',
  'total_sent',
  'total_comments',
  'total_responses',
  'currency_primary',
  'currency_secondary',
  'month_revenue_chf',
  'month_expenses_chf',
  'month_profit_chf',
  'date_field',
  'mood',
  'chapter_count',
  'issue',
  'author',
  'subtitle',
  'description',
  'start_date',
  'end_date',
  'date_created',
  'date_modified',
  'date_trashed',
  'tags',
];

const KNOWN_FRONTMATTER_FIELDS = new Set(FRONTMATTER_FIELD_ORDER);

function hasOwnValue(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function cloneDefaultValue(value) {
  if (Array.isArray(value)) {
    return [...value];
  }

  return value;
}

function isObjectLike(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeMarkdownText(value) {
  return String(value ?? '').replaceAll('\r\n', '\n');
}

function splitMarkdownDocument(rawMarkdown) {
  const normalizedRawMarkdown = normalizeMarkdownText(rawMarkdown);

  if (!normalizedRawMarkdown.startsWith('---\n')) {
    return {
      body: normalizedRawMarkdown,
      frontmatterText: '',
      hasFrontmatter: false,
      normalizedRawMarkdown,
    };
  }

  const frontmatterEndIndex = normalizedRawMarkdown.indexOf('\n---\n', 4);

  if (frontmatterEndIndex === -1) {
    throw new Error('The frontmatter block must end with a closing --- line.');
  }

  return {
    body: normalizedRawMarkdown.slice(frontmatterEndIndex + 5).replace(/^\n/, ''),
    frontmatterText: normalizedRawMarkdown.slice(4, frontmatterEndIndex),
    hasFrontmatter: true,
    normalizedRawMarkdown,
  };
}

function normalizeArrayValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (entry == null ? '' : String(entry).trim()))
      .filter(Boolean);
  }

  if (value == null || value === '') {
    return [];
  }

  return [String(value).trim()].filter(Boolean);
}

function normalizeBooleanValue(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }
  }

  return Boolean(value);
}

function normalizeIntegerValue(value) {
  if (value == null || value === '') {
    return null;
  }

  const parsedValue = Number.parseInt(String(value), 10);

  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function normalizeNumberValue(value) {
  if (value == null || value === '') {
    return null;
  }

  const parsedValue = Number.parseFloat(String(value));

  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function normalizeScalarStringValue(value) {
  if (value == null || value === '') {
    return null;
  }

  return String(value);
}

function normalizeFrontmatterValue(key, value) {
  if (ARRAY_FIELDS.has(key)) {
    return normalizeArrayValue(value);
  }

  if (BOOLEAN_FIELDS.has(key)) {
    return normalizeBooleanValue(value);
  }

  if (INTEGER_FIELDS.has(key)) {
    return normalizeIntegerValue(value);
  }

  if (NUMBER_FIELDS.has(key)) {
    return normalizeNumberValue(value);
  }

  return normalizeScalarStringValue(value);
}

function parseFrontmatterText(frontmatterText) {
  const document = parseDocument(frontmatterText);

  if (document.errors.length > 0) {
    throw new Error(document.errors[0].message);
  }

  const parsedFrontmatter = document.toJS();

  if (parsedFrontmatter == null) {
    return {};
  }

  if (!isObjectLike(parsedFrontmatter)) {
    throw new Error('The YAML frontmatter must parse to an object.');
  }

  return parsedFrontmatter;
}

function shouldIncludeKnownField(key, item, storedFrontmatter) {
  if (UNIVERSAL_FRONTMATTER_FIELDS.includes(key)) {
    return true;
  }

  if (hasOwnValue(storedFrontmatter, key)) {
    return true;
  }

  const itemValue = item[key];

  if (ARRAY_FIELDS.has(key)) {
    return Array.isArray(itemValue) && itemValue.length > 0;
  }

  if (BOOLEAN_FIELDS.has(key)) {
    return itemValue === true;
  }

  return itemValue != null && itemValue !== '';
}

function buildStoredFrontmatter(item) {
  const storedFrontmatter = isObjectLike(item.frontmatter)
    ? { ...item.frontmatter }
    : {};

  FRONTMATTER_FIELD_ORDER.forEach((key) => {
    if (!shouldIncludeKnownField(key, item, storedFrontmatter)) {
      return;
    }

    storedFrontmatter[key] = normalizeFrontmatterValue(key, item[key]);
  });

  if (!hasOwnValue(storedFrontmatter, 'access')) {
    storedFrontmatter.access = FRONTMATTER_DEFAULTS.access;
  }

  if (!hasOwnValue(storedFrontmatter, 'workbench')) {
    storedFrontmatter.workbench = FRONTMATTER_DEFAULTS.workbench;
  }

  if (!hasOwnValue(storedFrontmatter, 'tags')) {
    storedFrontmatter.tags = cloneDefaultValue(FRONTMATTER_DEFAULTS.tags);
  }

  return storedFrontmatter;
}

function buildOrderedFrontmatterObject(frontmatter) {
  const orderedFrontmatter = {};

  FRONTMATTER_FIELD_ORDER.forEach((key) => {
    if (hasOwnValue(frontmatter, key)) {
      orderedFrontmatter[key] = frontmatter[key];
    }
  });

  Object.keys(frontmatter)
    .filter((key) => !KNOWN_FRONTMATTER_FIELDS.has(key))
    .forEach((key) => {
      orderedFrontmatter[key] = frontmatter[key];
    });

  return orderedFrontmatter;
}

function serializeFrontmatter(frontmatter) {
  return stringify(buildOrderedFrontmatterObject(frontmatter), {
    lineWidth: 0,
  })
    .replace(/^([A-Za-z0-9_]+): null$/gm, '$1:')
    .trimEnd();
}

function buildPersistedFieldValue(key, parsedFrontmatter, existingItem, modifiedAt) {
  if (key === 'cuid') {
    return existingItem.cuid;
  }

  if (key === 'date_created') {
    return existingItem.date_created;
  }

  if (key === 'date_modified') {
    return modifiedAt;
  }

  if (key === 'date_trashed') {
    return existingItem.date_trashed;
  }

  if (hasOwnValue(parsedFrontmatter, key)) {
    return normalizeFrontmatterValue(key, parsedFrontmatter[key]);
  }

  if (hasOwnValue(FRONTMATTER_DEFAULTS, key)) {
    return cloneDefaultValue(FRONTMATTER_DEFAULTS[key]);
  }

  return null;
}

export function buildEditorMarkdownDocument(item) {
  const legacyDocument = splitMarkdownDocument(item.content ?? '');

  if (legacyDocument.hasFrontmatter) {
    return legacyDocument.normalizedRawMarkdown;
  }

  const serializedFrontmatter = serializeFrontmatter(buildStoredFrontmatter(item));
  const normalizedBody = normalizeMarkdownText(item.content ?? '').replace(/^\n+/, '');

  return `---\n${serializedFrontmatter}\n---${normalizedBody ? `\n\n${normalizedBody}` : '\n'}`;
}

export function parseEditorMarkdownDocument(rawMarkdown) {
  const splitDocument = splitMarkdownDocument(rawMarkdown);

  if (!splitDocument.hasFrontmatter) {
    throw new Error('Editor saves require a YAML frontmatter block.');
  }

  return {
    body: splitDocument.body,
    frontmatter: parseFrontmatterText(splitDocument.frontmatterText),
    normalizedRawMarkdown: splitDocument.normalizedRawMarkdown,
  };
}

export function buildItemUpdatePayloadFromFrontmatter({
  existingItem,
  modifiedAt,
  parsedFrontmatter,
}) {
  const unknownFrontmatter = {};

  Object.entries(parsedFrontmatter).forEach(([key, value]) => {
    if (!KNOWN_FRONTMATTER_FIELDS.has(key)) {
      unknownFrontmatter[key] = value;
    }
  });

  const updatePayload = {
    frontmatter: unknownFrontmatter,
  };

  FRONTMATTER_FIELD_ORDER.forEach((key) => {
    updatePayload[key] = buildPersistedFieldValue(
      key,
      parsedFrontmatter,
      existingItem,
      modifiedAt,
    );
  });

  return updatePayload;
}
