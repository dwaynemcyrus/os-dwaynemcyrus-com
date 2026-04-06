import {
  buildEditorMarkdownDocument,
  parseEditorMarkdownDocument,
} from './frontmatter';
import { getItemDisplayLabel } from './filenames';

const WIKILINK_GROUP_BODY = 'Mentions';
const WIKILINK_PATTERN = /\[\[([^\]\n]+?)\]\]/g;

function normalizeWikilinkLabel(value) {
  return String(value ?? '').trim().toLowerCase();
}

function cloneWikilinkPattern() {
  return new RegExp(WIKILINK_PATTERN.source, WIKILINK_PATTERN.flags);
}

function createWikilinkMatch({
  end,
  label,
  raw,
  section,
  start,
}) {
  return {
    end,
    label,
    normalizedLabel: normalizeWikilinkLabel(label),
    raw,
    section,
    start,
  };
}

function extractWikilinksFromText(text, { offset = 0, section }) {
  const matches = [];
  const normalizedText = String(text ?? '');
  const pattern = cloneWikilinkPattern();
  let match = pattern.exec(normalizedText);

  while (match) {
    const raw = match[0];
    const label = match[1].trim();

    if (label) {
      matches.push(
        createWikilinkMatch({
          end: offset + match.index + raw.length,
          label,
          raw,
          section,
          start: offset + match.index,
        }),
      );
    }

    match = pattern.exec(normalizedText);
  }

  return matches;
}

function collectFrontmatterLinks(value, key, collectedLinks) {
  if (typeof value === 'string') {
    extractWikilinksFromText(value, {
      section: 'frontmatter',
    }).forEach((match) => {
      collectedLinks.push({
        group: key,
        label: match.label,
        normalizedLabel: match.normalizedLabel,
        raw: match.raw,
      });
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      collectFrontmatterLinks(entry, key, collectedLinks);
    });
    return;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => {
      collectFrontmatterLinks(entry, key, collectedLinks);
    });
  }
}

function buildTargetsByNormalizedTitle(targetItems) {
  const targetsByNormalizedTitle = new Map();

  targetItems.forEach((item) => {
    const resolvedLabel = getItemDisplayLabel(item, item.cuid);
    const normalizedTitle = normalizeWikilinkLabel(resolvedLabel);

    if (!normalizedTitle) {
      return;
    }

    const currentTargets = targetsByNormalizedTitle.get(normalizedTitle) ?? [];
    currentTargets.push({
      id: item.id,
      subtype: item.subtype ?? null,
      title: getItemDisplayLabel(item, item.cuid),
      type: item.type ?? null,
    });
    targetsByNormalizedTitle.set(normalizedTitle, currentTargets);
  });

  return targetsByNormalizedTitle;
}

export function buildWikilinkTargetIndex(targetItems) {
  return buildTargetsByNormalizedTitle(targetItems);
}

export function resolveWikilinkLabel({
  label,
  targetIndex,
}) {
  const matchingTargets = targetIndex.get(normalizeWikilinkLabel(label)) ?? [];

  if (matchingTargets.length === 1) {
    return {
      state: 'resolved',
      target: matchingTargets[0],
      targets: matchingTargets,
    };
  }

  if (matchingTargets.length > 1) {
    return {
      state: 'ambiguous',
      target: null,
      targets: matchingTargets,
    };
  }

  return {
    state: 'unresolved',
    target: null,
    targets: [],
  };
}

export function extractDocumentWikilinks(rawMarkdown) {
  const {
    body,
    bodyStartIndex,
    frontmatter,
    frontmatterText,
    normalizedRawMarkdown,
  } = parseEditorMarkdownDocument(rawMarkdown);
  const frontmatterLinks = extractWikilinksFromText(frontmatterText, {
    offset: 4,
    section: 'frontmatter',
  });
  const bodyLinks = extractWikilinksFromText(body, {
    offset: bodyStartIndex,
    section: 'body',
  });
  const frontmatterLinksByProperty = {};

  Object.entries(frontmatter).forEach(([key, value]) => {
    const collectedLinks = [];
    collectFrontmatterLinks(value, key, collectedLinks);

    if (collectedLinks.length > 0) {
      frontmatterLinksByProperty[key] = collectedLinks;
    }
  });

  return {
    allLinks: [...frontmatterLinks, ...bodyLinks],
    bodyLinks,
    frontmatterLinks,
    frontmatterLinksByProperty,
    normalizedRawMarkdown,
  };
}

export function resolveDocumentWikilinks({
  rawMarkdown,
  targetItems,
}) {
  const { allLinks } = extractDocumentWikilinks(rawMarkdown);
  const targetsByNormalizedTitle = buildTargetsByNormalizedTitle(targetItems);

  return allLinks.map((link) => {
    const resolution = resolveWikilinkLabel({
      label: link.label,
      targetIndex: targetsByNormalizedTitle,
    });

    if (resolution.state === 'resolved') {
      return {
        ...link,
        state: resolution.state,
        target: resolution.target,
      };
    }

    return {
      ...link,
      state: resolution.state,
      target: null,
      targets: resolution.targets,
    };
  });
}

export function buildBacklinkGroups({
  candidateItems,
  currentTitle,
}) {
  const normalizedCurrentTitle = normalizeWikilinkLabel(currentTitle);

  if (!normalizedCurrentTitle) {
    return [];
  }

  const groupedBacklinks = new Map();

  candidateItems.forEach((item) => {
    const rawMarkdown = buildEditorMarkdownDocument(item);
    const { bodyLinks, frontmatterLinksByProperty } = extractDocumentWikilinks(
      rawMarkdown,
    );

    if (
      bodyLinks.some((link) => link.normalizedLabel === normalizedCurrentTitle)
    ) {
      const mentionsGroup = groupedBacklinks.get(WIKILINK_GROUP_BODY) ?? [];
      mentionsGroup.push({
        itemId: item.id,
        subtype: item.subtype ?? null,
        title: getItemDisplayLabel(item, item.cuid),
        type: item.type ?? null,
      });
      groupedBacklinks.set(WIKILINK_GROUP_BODY, mentionsGroup);
    }

    Object.entries(frontmatterLinksByProperty).forEach(([propertyName, links]) => {
      if (!links.some((link) => link.normalizedLabel === normalizedCurrentTitle)) {
        return;
      }

      const propertyGroup = groupedBacklinks.get(propertyName) ?? [];
      propertyGroup.push({
        itemId: item.id,
        subtype: item.subtype ?? null,
        title: getItemDisplayLabel(item, item.cuid),
        type: item.type ?? null,
      });
      groupedBacklinks.set(propertyName, propertyGroup);
    });
  });

  return [...groupedBacklinks.entries()].map(([group, items]) => ({
    group,
    items,
  }));
}
