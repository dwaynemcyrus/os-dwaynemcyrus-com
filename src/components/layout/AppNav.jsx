import { useEffect, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth';
import { fetchInboxCount } from '../../lib/items';
import styles from './AppNav.module.css';

const INBOX_COUNT_REFRESH_EVENT = 'personal-os:inbox-count-refresh';

const PRIMARY_NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    meta: 'Daily note',
    to: '/',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    meta: 'Process',
    to: '/inbox',
  },
  {
    id: 'items',
    label: 'Items',
    meta: 'Library',
    to: '/items',
  },
  {
    id: 'templates',
    label: 'Templates',
    meta: 'Patterns',
    to: '/templates',
  },
  {
    id: 'settings',
    label: 'Settings',
    meta: 'Account',
    to: '/settings',
  },
];

const MOBILE_LEFT_NAV_ITEMS = PRIMARY_NAV_ITEMS.slice(0, 2);
const MOBILE_RIGHT_NAV_ITEMS = PRIMARY_NAV_ITEMS.slice(2);

function isItemActive(pathname, item) {
  if (item.to === '/') {
    return pathname === '/';
  }

  if (item.to === '/items') {
    return pathname === '/items' || pathname.startsWith('/items/');
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function AppNav({ children }) {
  const auth = useAuth();
  const [inboxCount, setInboxCount] = useState(0);
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    if (!auth.user?.id) {
      setInboxCount(0);
      return undefined;
    }

    let cancelled = false;

    async function loadInboxCount() {
      try {
        const nextInboxCount = await fetchInboxCount(auth.user.id);

        if (cancelled) {
          return;
        }

        setInboxCount(nextInboxCount);
      } catch {
        if (cancelled) {
          return;
        }

        setInboxCount(0);
      }
    }

    function handleInboxCountRefresh() {
      void loadInboxCount();
    }

    void loadInboxCount();
    window.addEventListener(INBOX_COUNT_REFRESH_EVENT, handleInboxCountRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener(
        INBOX_COUNT_REFRESH_EVENT,
        handleInboxCountRefresh,
      );
    };
  }, [auth.user?.id, pathname]);

  function renderNavButton(item, variant) {
    const isActive = isItemActive(pathname, item);
    const showsInboxBadge = item.id === 'inbox' && inboxCount > 0;
    const buttonClassName = [
      styles.appNav__button,
      variant === 'tab' ? styles['appNav__button--tab'] : '',
      isActive ? styles['appNav__button--active'] : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        aria-current={isActive ? 'page' : undefined}
        className={buttonClassName}
        key={`${variant}-${item.id}`}
        onClick={() => {
          void navigate({
            to: item.to,
          });
        }}
        type="button"
      >
        <span className={styles.appNav__headingRow}>
          <span className={styles.appNav__label}>{item.label}</span>
          {showsInboxBadge ? (
            <span
              aria-label={`${inboxCount} unprocessed inbox items`}
              className={styles.appNav__badge}
            >
              {inboxCount > 99 ? '99+' : inboxCount}
            </span>
          ) : null}
        </span>
        <span className={styles.appNav__meta}>{item.meta}</span>
      </button>
    );
  }

  return (
    <div className={styles.appShell}>
      <aside className={styles.appNav__sidebar}>
        <div className={styles.appNav__brand}>
          <p className={styles.appNav__eyebrow}>Personal OS</p>
          <h1 className={styles.appNav__title}>Navigate the system.</h1>
          <p className={styles.appNav__description}>
            Move between capture, review, writing, and settings without leaving
            the fixed app shell.
          </p>
        </div>

        <nav aria-label="Primary" className={styles.appNav__list}>
          {PRIMARY_NAV_ITEMS.map((item) => renderNavButton(item, 'sidebar'))}
        </nav>
      </aside>

      <main className={styles.appShell__main}>
        <div className={styles.appShell__scrollRegion}>{children}</div>
      </main>

      <nav aria-label="Primary" className={styles.appNav__tabBar}>
        <div className={styles.appNav__tabBarInner}>
          <div className={styles.appNav__tabGroup}>
            {MOBILE_LEFT_NAV_ITEMS.map((item) => renderNavButton(item, 'tab'))}
          </div>

          <div aria-hidden="true" className={styles.appNav__tabGap} />

          <div className={styles.appNav__tabGroup}>
            {MOBILE_RIGHT_NAV_ITEMS.map((item) => renderNavButton(item, 'tab'))}
          </div>
        </div>
      </nav>
    </div>
  );
}
