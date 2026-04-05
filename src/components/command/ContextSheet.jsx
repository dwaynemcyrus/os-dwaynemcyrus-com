import { useEffect, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  getContextSheetTabForPath,
  getContextSheetTabs,
  isContextShortcutActive,
} from '../../lib/navigation';
import styles from './ContextSheet.module.css';

export function ContextSheet({ isOpen, onClose }) {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [activeTabId, setActiveTabId] = useState(
    getContextSheetTabForPath(pathname),
  );
  const tabs = getContextSheetTabs();
  const activeTab =
    tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTabId(getContextSheetTabForPath(pathname));
  }, [isOpen, pathname]);

  async function handleOpenShortcut(shortcutTo) {
    onClose();

    await navigate({
      to: shortcutTo,
    });
  }

  if (!isOpen || !activeTab) {
    return null;
  }

  return (
    <div
      className={styles.contextSheet}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-label="Context navigation"
        aria-modal="true"
        className={styles.contextSheet__panel}
        role="dialog"
      >
        <header className={styles.contextSheet__header}>
          <div className={styles.contextSheet__headerCopy}>
            <p className={styles.contextSheet__eyebrow}>Context</p>
            <h2 className={styles.contextSheet__title}>Jump Between Views</h2>
          </div>

          <button
            aria-label="Close context sheet"
            className={styles.contextSheet__close}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>

        <div
          aria-label="Context groups"
          className={styles.contextSheet__tabs}
          role="tablist"
        >
          {tabs.map((tab) => (
            <button
              aria-selected={tab.id === activeTab.id}
              className={`${styles.contextSheet__tabButton} ${
                tab.id === activeTab.id
                  ? styles['contextSheet__tabButton--active']
                  : ''
              }`}
              key={tab.id}
              onClick={() => {
                setActiveTabId(tab.id);
              }}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.contextSheet__body}>
          <ul className={styles.contextSheet__shortcutList}>
            {activeTab.shortcuts.map((shortcut) => (
              <li className={styles.contextSheet__shortcutItem} key={shortcut.id}>
                <button
                  aria-current={
                    isContextShortcutActive(pathname, shortcut.to)
                      ? 'page'
                      : undefined
                  }
                  className={`${styles.contextSheet__shortcutButton} ${
                    isContextShortcutActive(pathname, shortcut.to)
                      ? styles['contextSheet__shortcutButton--active']
                      : ''
                  }`}
                  onClick={() => {
                    void handleOpenShortcut(shortcut.to);
                  }}
                  type="button"
                >
                  <span className={styles.contextSheet__shortcutLabel}>
                    {shortcut.label}
                  </span>
                  <span className={styles.contextSheet__shortcutMeta}>
                    {shortcut.meta}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
