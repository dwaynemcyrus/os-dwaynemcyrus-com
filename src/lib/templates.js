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
