const SCREEN_CHROME_RULES = [
  {
    metaText: 'Knowledge',
    matches: (pathname) => pathname === '/knowledge',
  },
  {
    metaText: 'Strategy',
    matches: (pathname) => pathname === '/strategy',
  },
  {
    metaText: 'Areas',
    matches: (pathname) => pathname === '/strategy/areas',
  },
  {
    metaText: 'Execution',
    matches: (pathname) => pathname === '/execution',
  },
  {
    metaText: 'Today',
    matches: (pathname) => pathname === '/execution/today',
  },
  {
    metaText: 'Upcoming',
    matches: (pathname) => pathname === '/execution/upcoming',
  },
  {
    metaText: 'Backlog',
    matches: (pathname) => pathname === '/execution/backlog',
  },
  {
    metaText: 'Someday',
    matches: (pathname) => pathname === '/execution/someday',
  },
  {
    metaText: 'Logbook',
    matches: (pathname) => pathname === '/execution/logbook',
  },
  {
    metaText: 'Inbox',
    matches: (pathname) => pathname === '/inbox',
  },
  {
    metaText: 'Library',
    matches: (pathname) => pathname === '/items',
  },
  {
    metaText: 'Notes',
    matches: (pathname) => pathname === '/notes',
  },
  {
    metaText: 'Todo',
    matches: (pathname) => pathname === '/notes/todo',
  },
  {
    metaText: 'Today',
    matches: (pathname) => pathname === '/notes/today',
  },
  {
    metaText: 'Pinned',
    matches: (pathname) => pathname === '/notes/pinned',
  },
  {
    metaText: 'Sources',
    matches: (pathname) => pathname === '/sources/inbox',
  },
  {
    metaText: 'Reading',
    matches: (pathname) => pathname === '/sources/reading',
  },
  {
    metaText: 'Archive',
    matches: (pathname) => pathname === '/sources/archive',
  },
  {
    metaText: 'Capture Review',
    matches: (pathname) => pathname === '/wizard/capture',
  },
  {
    metaText: 'Settings',
    matches: (pathname) => pathname === '/settings',
  },
  {
    metaText: 'Daily Note',
    matches: (pathname) => pathname === '/settings/daily-note',
  },
  {
    metaText: 'Keyboard Shortcuts',
    matches: (pathname) => pathname === '/settings/keyboard-shortcuts',
  },
  {
    metaText: 'Templates',
    matches: (pathname) => pathname === '/settings/templates',
  },
  {
    metaText: 'Trash',
    matches: (pathname) => pathname === '/settings/trash',
  },
];

const BACK_NAVIGATION_RULES = [
  {
    label: 'Now',
    matches: (pathname) =>
      pathname === '/knowledge' ||
      pathname === '/strategy' ||
      pathname === '/execution',
    to: '/',
  },
  {
    label: 'Execution',
    matches: (pathname) =>
      pathname === '/execution/today' ||
      pathname === '/execution/upcoming' ||
      pathname === '/execution/backlog' ||
      pathname === '/execution/someday' ||
      pathname === '/execution/logbook',
    to: '/execution',
  },
  {
    label: 'Execution',
    matches: (pathname) =>
      pathname.startsWith('/execution/') &&
      pathname !== '/execution/today' &&
      pathname !== '/execution/upcoming' &&
      pathname !== '/execution/backlog' &&
      pathname !== '/execution/someday' &&
      pathname !== '/execution/logbook',
    to: '/execution/today',
  },
  {
    label: 'Strategy',
    matches: (pathname) => pathname === '/strategy/areas',
    to: '/strategy',
  },
  {
    label: 'Knowledge',
    matches: (pathname) =>
      pathname === '/notes',
    to: '/knowledge',
  },
  {
    label: 'Execution',
    matches: (pathname) => pathname === '/inbox',
    to: '/execution',
  },
  {
    label: 'Now',
    matches: (pathname) => pathname === '/items',
    to: '/',
  },
  {
    label: 'Notes',
    matches: (pathname) =>
      pathname === '/notes/todo' ||
      pathname === '/notes/today' ||
      pathname === '/notes/pinned',
    to: '/notes',
  },
  {
    label: 'Library',
    matches: (pathname) => pathname.startsWith('/items/'),
    to: '/items',
  },
  {
    label: 'Knowledge',
    matches: (pathname) => pathname === '/sources/inbox',
    to: '/knowledge',
  },
  {
    label: 'Sources',
    matches: (pathname) =>
      pathname === '/sources/reading' ||
      pathname === '/sources/archive',
    to: '/sources/inbox',
  },
  {
    label: 'Sources',
    matches: (pathname) =>
      pathname.startsWith('/sources/') &&
      pathname !== '/sources/inbox' &&
      pathname !== '/sources/reading' &&
      pathname !== '/sources/archive',
    to: '/sources/inbox',
  },
  {
    label: 'Now',
    matches: (pathname) => pathname === '/wizard/capture',
    to: '/',
  },
  {
    label: 'Now',
    matches: (pathname) => pathname === '/settings',
    to: '/',
  },
  {
    label: 'Settings',
    matches: (pathname) =>
      pathname === '/settings/daily-note' ||
      pathname === '/settings/keyboard-shortcuts' ||
      pathname === '/settings/templates' ||
      pathname === '/settings/trash',
    to: '/settings',
  },
  {
    label: 'Templates',
    matches: (pathname) => pathname.startsWith('/settings/templates/'),
    to: '/settings/templates',
  },
];

export function getBackNavigation(pathname) {
  const matchingRule = BACK_NAVIGATION_RULES.find((rule) =>
    rule.matches(pathname),
  );

  if (!matchingRule) {
    return null;
  }

  return {
    label: matchingRule.label,
    to: matchingRule.to,
  };
}

export function getScreenChromeDefaults(pathname) {
  const matchingRule = SCREEN_CHROME_RULES.find((rule) =>
    rule.matches(pathname),
  );

  if (!matchingRule) {
    return {
      metaText: '',
    };
  }

  return {
    metaText: matchingRule.metaText,
  };
}

export function isWritingEditorPath(pathname) {
  return (
    pathname.startsWith('/items/') ||
    pathname.startsWith('/settings/templates/')
  );
}

export function isSourceViewerPath(pathname) {
  return pathname.startsWith('/sources/') && pathname.split('/').length === 3;
}

export function isTemplateEditorPath(pathname) {
  return pathname.startsWith('/settings/templates/');
}
