export const SLASH_COMMAND_SUBTYPES = [
  'daily',
  'istikarah',
  'dream',
  'scratch',
  'devlog',
  'essay',
  'framework',
  'lesson',
  'manuscript',
  'chapter',
  'comic',
  'poem',
  'story',
  'artwork',
  'case_study',
  'workshop',
  'script',
  'slip',
  'identity',
  'principle',
  'directive',
  'source',
  'literature',
  'quote',
  'guide',
  'offer',
  'asset',
  'software',
  'course',
  'module',
  'habit',
  'goal',
  'finance',
  'contact',
  'outreach',
  'weekly',
  'monthly',
  'yearly',
  'area',
  'task',
  'project',
];

function normalizeSlashQuery(query) {
  return query.trim().replace(/^\//, '').trim().toLowerCase();
}

function parseNewSlashQuery(query) {
  const normalizedQuery = normalizeSlashQuery(query);

  if (!normalizedQuery.startsWith('new')) {
    return {
      isNewCommand: false,
      title: '',
      subtypeQuery: '',
    };
  }

  const remainder = normalizedQuery.slice(3).trim();

  if (!remainder) {
    return {
      isNewCommand: true,
      title: '',
      subtypeQuery: '',
    };
  }

  const [subtypeQuery = '', ...titleParts] = remainder.split(/\s+/);

  return {
    isNewCommand: true,
    title: titleParts.join(' ').trim(),
    subtypeQuery,
  };
}

function normalizeTemplateLabel(value) {
  return String(value ?? '').trim();
}

function compareTemplateItems(leftItem, rightItem) {
  const typeComparison = normalizeTemplateLabel(leftItem.type).localeCompare(
    normalizeTemplateLabel(rightItem.type),
  );

  if (typeComparison !== 0) {
    return typeComparison;
  }

  const subtypeComparison = normalizeTemplateLabel(
    leftItem.subtype,
  ).localeCompare(normalizeTemplateLabel(rightItem.subtype));

  if (subtypeComparison !== 0) {
    return subtypeComparison;
  }

  const ownershipComparison =
    Number(Boolean(rightItem.user_id)) - Number(Boolean(leftItem.user_id));

  if (ownershipComparison !== 0) {
    return ownershipComparison;
  }

  const titleComparison = normalizeTemplateLabel(leftItem.title).localeCompare(
    normalizeTemplateLabel(rightItem.title),
  );

  if (titleComparison !== 0) {
    return titleComparison;
  }

  return normalizeTemplateLabel(rightItem.date_modified).localeCompare(
    normalizeTemplateLabel(leftItem.date_modified),
  );
}

export function formatSubtypeLabel(subtype) {
  return normalizeTemplateLabel(subtype).replaceAll('_', ' ');
}

export function sortTemplates(templateItems) {
  return [...templateItems].sort(compareTemplateItems);
}

export function groupTemplatesByType(templateItems) {
  const templateGroups = [];
  const groupsByType = new Map();

  sortTemplates(templateItems).forEach((templateItem) => {
    const groupType = normalizeTemplateLabel(templateItem.type) || 'misc';
    let group = groupsByType.get(groupType);

    if (!group) {
      group = {
        items: [],
        type: groupType,
      };
      groupsByType.set(groupType, group);
      templateGroups.push(group);
    }

    group.items.push(templateItem);
  });

  return templateGroups;
}

export function formatTemplateGroupLabel(type) {
  const normalizedType = normalizeTemplateLabel(type);

  if (!normalizedType || normalizedType === 'misc') {
    return 'Misc.';
  }

  return normalizedType;
}

export function getSlashCommands(templateItems, query) {
  const { isNewCommand, subtypeQuery, title } = parseNewSlashQuery(query);

  if (!isNewCommand) {
    return [];
  }

  const templateBySubtype = new Map();

  templateItems.forEach((item) => {
    const normalizedSubtype = normalizeTemplateLabel(item.subtype);

    if (!normalizedSubtype || templateBySubtype.has(normalizedSubtype)) {
      return;
    }

    templateBySubtype.set(normalizedSubtype, item);
  });

  return [...templateBySubtype.entries()]
    .filter(([subtype]) => !subtypeQuery || subtype.includes(subtypeQuery))
    .map(([subtype, template]) => ({
      command: `/new ${subtype}`,
      subtype,
      template,
      title,
    }));
}
