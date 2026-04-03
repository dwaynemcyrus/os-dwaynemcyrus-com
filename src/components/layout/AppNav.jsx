import { useNavigate, useRouterState } from '@tanstack/react-router';
import styles from './AppNav.module.css';

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
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  function renderNavButton(item, variant) {
    const isActive = isItemActive(pathname, item);
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
        <span className={styles.appNav__label}>{item.label}</span>
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
