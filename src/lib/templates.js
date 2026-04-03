const SLASH_COMMAND_SUBTYPES = [
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

export function getSlashCommands(templateItems, query) {
  const normalizedQuery = normalizeSlashQuery(query);
  const templateBySubtype = new Map(
    templateItems.map((item) => [item.subtype, item]),
  );

  return SLASH_COMMAND_SUBTYPES.filter((subtype) => {
    if (!normalizedQuery) {
      return true;
    }

    return subtype.includes(normalizedQuery);
  }).map((subtype) => ({
    command: `/${subtype}`,
    subtype,
    template: templateBySubtype.get(subtype) ?? null,
  }));
}
