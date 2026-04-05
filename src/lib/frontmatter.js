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
  'publish',
  'bookmark',
  'for_sale',
  'sold',
  'exhibited',
]);

const TIMESTAMPTZ_FIELDS = new Set([
  'date_created',
  'date_modified',
  'date_published',
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
  publish: false,
  resources: [],
  sold: false,
  stack: [],
  tags: [],
  total_comments: 0,
  total_responses: 0,
  total_sent: 0,
  workbench: false,
};

const AUTHORED_FRONTMATTER_STORAGE_KEY = '__personal_os_authored_frontmatter';

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
  'filename',
  'status',
  'access',
  'area',
  'workbench',
  'resources',
  'dependencies',
  'blocked',
  'slug',
  'publish',
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
  'date_start',
  'date_end',
  'date_published',
  'date_created',
  'date_modified',
  'date_trashed',
  'tags',
];

const KNOWN_FRONTMATTER_FIELDS = new Set(FRONTMATTER_FIELD_ORDER);
const PRESERVED_WHEN_OMITTED_FIELDS = new Set([
  'cuid',
  'date_created',
  'date_trashed',
]);
const SYSTEM_MANAGED_FRONTMATTER_FIELDS = new Set([
  'cuid',
  'date_trashed',
]);

function hasOwnValue(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function createFrontmatterFieldError(key, message) {
  return new Error(`Frontmatter "${key}" ${message}`);
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

function stripStorageMarker(frontmatter) {
  if (!isObjectLike(frontmatter)) {
    return {};
  }

  const nextFrontmatter = { ...frontmatter };
  delete nextFrontmatter[AUTHORED_FRONTMATTER_STORAGE_KEY];
  return nextFrontmatter;
}

export function createStoredAuthoredFrontmatter(frontmatter = {}) {
  return {
    [AUTHORED_FRONTMATTER_STORAGE_KEY]: true,
    ...stripStorageMarker(frontmatter),
  };
}

function buildStoredAuthoredFrontmatter({
  existingItem,
  parsedFrontmatter,
}) {
  const storedFrontmatter = createStoredAuthoredFrontmatter();

  Object.entries(parsedFrontmatter).forEach(([key, value]) => {
    if (key === 'filename') {
      const normalizedFilename = normalizeFilenameValue(value);

      if (normalizedFilename == null) {
        return;
      }

      storedFrontmatter[key] = normalizedFilename;
      return;
    }

    if (existingItem.is_template === true) {
      storedFrontmatter[key] = value;
      return;
    }

    if (!SYSTEM_MANAGED_FRONTMATTER_FIELDS.has(key)) {
      storedFrontmatter[key] = value;
      return;
    }

    if (key === 'cuid') {
      storedFrontmatter[key] = existingItem.cuid;
      return;
    }

    storedFrontmatter[key] = existingItem.date_trashed;
  });

  return storedFrontmatter;
}

function readStoredAuthoredFrontmatter(frontmatter) {
  if (
    !isObjectLike(frontmatter) ||
    frontmatter[AUTHORED_FRONTMATTER_STORAGE_KEY] !== true
  ) {
    return null;
  }

  return stripStorageMarker(frontmatter);
}

function normalizeMarkdownText(value) {
  return String(value ?? '').replaceAll('\r\n', '\n');
}

function splitMarkdownDocument(
  rawMarkdown,
  { allowIncompleteFrontmatter = false } = {},
) {
  const normalizedRawMarkdown = normalizeMarkdownText(rawMarkdown);

  if (!normalizedRawMarkdown.startsWith('---\n')) {
    return {
      body: normalizedRawMarkdown,
      bodyStartIndex: 0,
      frontmatterText: '',
      hasFrontmatter: false,
      normalizedRawMarkdown,
    };
  }

  const frontmatterEndIndex = normalizedRawMarkdown.indexOf('\n---\n', 4);

  if (frontmatterEndIndex === -1) {
    if (allowIncompleteFrontmatter) {
      return {
        body: '',
        bodyStartIndex: normalizedRawMarkdown.length,
        frontmatterText: normalizedRawMarkdown.slice(4),
        hasFrontmatter: true,
        isFrontmatterIncomplete: true,
        normalizedRawMarkdown,
      };
    }

    throw new Error('The frontmatter block must end with a closing --- line.');
  }

  const afterFrontmatterIndex = frontmatterEndIndex + 5;
  const bodyStartIndex = normalizedRawMarkdown.startsWith('\n', afterFrontmatterIndex)
    ? afterFrontmatterIndex + 1
    : afterFrontmatterIndex;

  return {
    body: normalizedRawMarkdown.slice(bodyStartIndex),
    bodyStartIndex,
    frontmatterText: normalizedRawMarkdown.slice(4, frontmatterEndIndex),
    hasFrontmatter: true,
    isFrontmatterIncomplete: false,
    normalizedRawMarkdown,
  };
}

function normalizeArrayValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (entry == null) {
          return '';
        }

        if (Array.isArray(entry) || isObjectLike(entry)) {
          throw new Error('array entries must be plain values.');
        }

        return String(entry).trim();
      })
      .filter(Boolean);
  }

  if (value == null || value === '') {
    return [];
  }

  throw new Error('must be a YAML list.');
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

  throw new Error('must be true or false.');
}

function normalizeIntegerValue(value) {
  if (value == null || value === '') {
    return null;
  }

  if (
    typeof value !== 'number' &&
    (typeof value !== 'string' || !/^-?\d+$/.test(value.trim()))
  ) {
    throw new Error('must be an integer.');
  }

  const parsedValue = Number.parseInt(String(value), 10);

  if (Number.isNaN(parsedValue)) {
    throw new Error('must be an integer.');
  }

  return parsedValue;
}

function normalizeNumberValue(value) {
  if (value == null || value === '') {
    return null;
  }

  if (
    typeof value !== 'number' &&
    (typeof value !== 'string' ||
      !/^-?(?:\d+|\d+\.\d+|\.\d+)$/.test(value.trim()))
  ) {
    throw new Error('must be a number.');
  }

  const parsedValue = Number.parseFloat(String(value));

  if (Number.isNaN(parsedValue)) {
    throw new Error('must be a number.');
  }

  return parsedValue;
}

function normalizeScalarStringValue(value) {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || isObjectLike(value)) {
    throw new Error('must be a plain scalar value.');
  }

  return String(value);
}

function normalizeTimestampValue(value) {
  if (value == null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('must be a valid date or datetime.');
    }

    return value.toISOString();
  }

  if (Array.isArray(value) || isObjectLike(value)) {
    throw new Error('must be a plain scalar value.');
  }

  const normalizedInput = String(value).trim();

  if (!normalizedInput) {
    return null;
  }

  const plainDateMatch = normalizedInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (plainDateMatch) {
    const [, yearValue, monthValue, dayValue] = plainDateMatch;
    const normalizedDate = new Date(
      Number.parseInt(yearValue, 10),
      Number.parseInt(monthValue, 10) - 1,
      Number.parseInt(dayValue, 10),
      0,
      0,
      0,
      0,
    );

    if (Number.isNaN(normalizedDate.getTime())) {
      throw new Error('must be a valid date or datetime.');
    }

    return normalizedDate.toISOString();
  }

  const parsedDate = new Date(normalizedInput);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('must be a valid date or datetime.');
  }

  return parsedDate.toISOString();
}

export function normalizeFilenameValue(value) {
  const normalizedInput = String(value ?? '').trim();

  if (!normalizedInput) {
    return null;
  }

  if (normalizedInput.includes('{{') || normalizedInput.includes('}}')) {
    throw new Error('cannot use template tokens.');
  }

  const safeFilename = normalizedInput
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!safeFilename) {
    throw new Error('must include letters or numbers.');
  }

  return safeFilename;
}

function hasExistingScalarValue(value) {
  if (value == null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  return true;
}

function mergeTagValues(currentTags, templateTags) {
  const mergedTags = [];
  const seenTags = new Set();

  [...normalizeArrayValue(currentTags), ...normalizeArrayValue(templateTags)].forEach(
    (tag) => {
      const normalizedTag = tag.trim();
      const dedupeKey = normalizedTag.toLowerCase();

      if (!normalizedTag || seenTags.has(dedupeKey)) {
        return;
      }

      seenTags.add(dedupeKey);
      mergedTags.push(normalizedTag);
    },
  );

  return mergedTags;
}

function normalizeFrontmatterValue(key, value) {
  try {
    if (key === 'filename') {
      return normalizeFilenameValue(value);
    }

    if (TIMESTAMPTZ_FIELDS.has(key)) {
      return normalizeTimestampValue(value);
    }

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
  } catch (error) {
    throw createFrontmatterFieldError(
      key,
      error.message ?? 'has an invalid value.',
    );
  }
}

function parseFrontmatterText(
  frontmatterText,
  { allowInvalidDraft = false } = {},
) {
  const document = parseDocument(frontmatterText);

  if (document.errors.length > 0) {
    if (allowInvalidDraft) {
      return {};
    }

    throw new Error(document.errors[0].message);
  }

  const parsedFrontmatter = document.toJS();

  if (parsedFrontmatter == null) {
    return {};
  }

  if (!isObjectLike(parsedFrontmatter)) {
    if (allowInvalidDraft) {
      return {};
    }

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

  if (key === 'filename') {
    return false;
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
  const storedFrontmatter = stripStorageMarker(item.frontmatter);

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
    .filter(
      (key) =>
        key !== AUTHORED_FRONTMATTER_STORAGE_KEY &&
        !KNOWN_FRONTMATTER_FIELDS.has(key),
    )
    .forEach((key) => {
      orderedFrontmatter[key] = frontmatter[key];
    });

  return orderedFrontmatter;
}

function serializeFrontmatter(frontmatter) {
  const orderedFrontmatter = buildOrderedFrontmatterObject(frontmatter);

  if (Object.keys(orderedFrontmatter).length === 0) {
    return '';
  }

  return stringify(orderedFrontmatter, {
    lineWidth: 0,
  })
    .replace(/^([A-Za-z0-9_]+): null$/gm, '$1:')
    .replace(
      /^([A-Za-z0-9_]+): (\d{4}-\d{2}-\d{2})T00:00:00\.000Z$/gm,
      '$1: $2',
    )
    .trimEnd();
}

function buildRawMarkdownDocumentParts({
  body,
  frontmatter,
}) {
  const normalizedBody = normalizeMarkdownText(body ?? '').replace(/^\n+/, '');
  const serializedFrontmatter = serializeFrontmatter(frontmatter);

  if (!serializedFrontmatter) {
    return {
      bodyStartIndex: 0,
      rawMarkdown: normalizedBody,
    };
  }

  const documentPrefix = `---\n${serializedFrontmatter}\n---${
    normalizedBody ? '\n\n' : '\n'
  }`;

  return {
    bodyStartIndex: documentPrefix.length,
    rawMarkdown: `${documentPrefix}${normalizedBody}`,
  };
}

function buildPersistedFieldValue(key, parsedFrontmatter, existingItem, modifiedAt) {
  if (key === 'cuid') {
    return existingItem.cuid;
  }

  if (key === 'date_trashed') {
    return existingItem.date_trashed;
  }

  if (hasOwnValue(parsedFrontmatter, key)) {
    return normalizeFrontmatterValue(key, parsedFrontmatter[key]);
  }

  if (PRESERVED_WHEN_OMITTED_FIELDS.has(key)) {
    return existingItem[key];
  }

  if (hasOwnValue(FRONTMATTER_DEFAULTS, key)) {
    return cloneDefaultValue(FRONTMATTER_DEFAULTS[key]);
  }

  if (key === 'date_created') {
    return existingItem.date_created;
  }

  if (key === 'date_modified') {
    return modifiedAt;
  }

  if (key === 'date_published') {
    if (existingItem.date_published != null) {
      return existingItem.date_published;
    }

    const effectivePublishValue = hasOwnValue(parsedFrontmatter, 'publish')
      ? normalizeFrontmatterValue('publish', parsedFrontmatter.publish)
      : existingItem.publish;
    const effectiveDateModifiedValue = hasOwnValue(parsedFrontmatter, 'date_modified')
      ? normalizeFrontmatterValue(
          'date_modified',
          parsedFrontmatter.date_modified,
        )
      : modifiedAt;

    return effectivePublishValue ? effectiveDateModifiedValue : null;
  }

  return null;
}

export function buildEditorMarkdownDocument(item) {
  const legacyDocument = splitMarkdownDocument(item.content ?? '');

  if (legacyDocument.hasFrontmatter) {
    return legacyDocument.normalizedRawMarkdown;
  }

  const authoredFrontmatter = readStoredAuthoredFrontmatter(item.frontmatter);

  return buildRawMarkdownDocumentParts({
    body: item.content ?? '',
    frontmatter: authoredFrontmatter ?? buildStoredFrontmatter(item),
  }).rawMarkdown;
}

export function replaceEditorFrontmatterField({
  key,
  rawMarkdown,
  value,
}) {
  const { body, frontmatter } = parseEditorMarkdownDocument(rawMarkdown);
  const nextFrontmatter = {
    ...frontmatter,
    [key]: value,
  };

  return buildRawMarkdownDocumentParts({
    body,
    frontmatter: nextFrontmatter,
  }).rawMarkdown;
}

export function mergeTemplateIntoEditorDocument({
  currentRawMarkdown,
  selectionEnd,
  selectionStart,
  templateRawMarkdown,
}) {
  const currentDocument = splitMarkdownDocument(currentRawMarkdown);
  const templateDocument = splitMarkdownDocument(templateRawMarkdown);
  const currentFrontmatter = currentDocument.hasFrontmatter
    ? parseFrontmatterText(currentDocument.frontmatterText)
    : {};
  const templateFrontmatter = templateDocument.hasFrontmatter
    ? parseFrontmatterText(templateDocument.frontmatterText)
    : {};
  const currentBody = currentDocument.body;
  const templateBody = templateDocument.body;
  const nextFrontmatter = {
    ...currentFrontmatter,
    ...templateFrontmatter,
  };

  if (hasOwnValue(currentFrontmatter, 'cuid')) {
    nextFrontmatter.cuid = currentFrontmatter.cuid;
  } else {
    delete nextFrontmatter.cuid;
  }

  if (hasExistingScalarValue(currentFrontmatter.title)) {
    nextFrontmatter.title = currentFrontmatter.title;
  }

  if (hasExistingScalarValue(currentFrontmatter.subtitle)) {
    nextFrontmatter.subtitle = currentFrontmatter.subtitle;
  }

  if (hasOwnValue(currentFrontmatter, 'date_created')) {
    nextFrontmatter.date_created = currentFrontmatter.date_created;
  } else {
    delete nextFrontmatter.date_created;
  }

  if (hasOwnValue(currentFrontmatter, 'date_modified')) {
    nextFrontmatter.date_modified = currentFrontmatter.date_modified;
  } else {
    delete nextFrontmatter.date_modified;
  }

  if (
    hasOwnValue(currentFrontmatter, 'tags') ||
    hasOwnValue(templateFrontmatter, 'tags')
  ) {
    nextFrontmatter.tags = mergeTagValues(
      currentFrontmatter.tags,
      templateFrontmatter.tags,
    );
  } else {
    delete nextFrontmatter.tags;
  }
  const clampedSelectionStart = Math.max(
    0,
    Math.min(selectionStart - currentDocument.bodyStartIndex, currentBody.length),
  );
  const clampedSelectionEnd = Math.max(
    clampedSelectionStart,
    Math.min(selectionEnd - currentDocument.bodyStartIndex, currentBody.length),
  );
  const nextBody = `${currentBody.slice(0, clampedSelectionStart)}${templateBody}${currentBody.slice(clampedSelectionEnd)}`;
  const nextDocument = buildRawMarkdownDocumentParts({
    body: nextBody,
    frontmatter: nextFrontmatter,
  });
  const nextSelectionAnchor =
    nextDocument.bodyStartIndex + clampedSelectionStart + templateBody.length;

  return {
    rawMarkdown: nextDocument.rawMarkdown,
    selectionAnchor: nextSelectionAnchor,
  };
}

export function parseEditorMarkdownDocument(
  rawMarkdown,
  { allowIncompleteFrontmatter = false } = {},
) {
  const splitDocument = splitMarkdownDocument(rawMarkdown, {
    allowIncompleteFrontmatter,
  });

  return {
    body: splitDocument.body,
    bodyStartIndex: splitDocument.bodyStartIndex,
    frontmatter:
      splitDocument.hasFrontmatter && !splitDocument.isFrontmatterIncomplete
      ? parseFrontmatterText(splitDocument.frontmatterText, {
          allowInvalidDraft: allowIncompleteFrontmatter,
        })
        : {},
    frontmatterText: splitDocument.frontmatterText,
    isFrontmatterIncomplete: splitDocument.isFrontmatterIncomplete === true,
    normalizedRawMarkdown: splitDocument.normalizedRawMarkdown,
  };
}

export function buildItemUpdatePayloadFromFrontmatter({
  existingItem,
  modifiedAt,
  parsedFrontmatter,
}) {
  const updatePayload = {
    frontmatter: buildStoredAuthoredFrontmatter({
      existingItem,
      parsedFrontmatter,
    }),
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
