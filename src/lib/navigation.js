const CONTEXT_SHEET_TABS = [
  {
    id: 'strategy',
    label: 'Strategy',
    shortcuts: [
      {
        id: 'now',
        label: 'Now',
        meta: 'Today, focus, and workbench',
        to: '/',
      },
    ],
  },
  {
    id: 'execution',
    label: 'Execution',
    shortcuts: [
      {
        id: 'inbox',
        label: 'Inbox',
        meta: 'Unprocessed captures',
        to: '/inbox',
      },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    shortcuts: [
      {
        id: 'library',
        label: 'Library',
        meta: 'Saved items and notes',
        to: '/items',
      },
    ],
  },
];

const BACK_NAVIGATION_RULES = [
  {
    label: 'Now',
    matches: (pathname) => pathname === '/inbox' || pathname === '/items',
    to: '/',
  },
  {
    label: 'Library',
    matches: (pathname) => pathname.startsWith('/items/'),
    to: '/items',
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
      pathname === '/settings/slash-commands' ||
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

function matchesShortcutPath(pathname, shortcutTo) {
  if (shortcutTo === '/') {
    return pathname === '/';
  }

  return pathname === shortcutTo || pathname.startsWith(`${shortcutTo}/`);
}

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

export function getContextSheetTabForPath(pathname) {
  const matchingTab = CONTEXT_SHEET_TABS.find((tab) =>
    tab.shortcuts.some((shortcut) => matchesShortcutPath(pathname, shortcut.to)),
  );

  return matchingTab?.id ?? CONTEXT_SHEET_TABS[0].id;
}

export function getContextSheetTabs() {
  return CONTEXT_SHEET_TABS;
}

export function isContextShortcutActive(pathname, shortcutTo) {
  return matchesShortcutPath(pathname, shortcutTo);
}
