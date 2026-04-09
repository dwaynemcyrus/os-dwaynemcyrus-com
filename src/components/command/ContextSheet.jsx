import { useEffect, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth';
import { fetchContextSheetCounts, ITEMS_REFRESH_EVENT } from '../../lib/items';
import {
  getContextSheetTabForPath,
  getContextSheetTabs,
  isContextShortcutActive,
} from '../../lib/navigation';
import styles from './ContextSheet.module.css';

export function ContextSheet({ isOpen, onClose }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [activeTabId, setActiveTabId] = useState(
    getContextSheetTabForPath(pathname),
  );
  const [counts, setCounts] = useState({});
  const [expandedRowIds, setExpandedRowIds] = useState(new Set());
  const tabs = getContextSheetTabs();
  const activeTab =
    tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTabId(getContextSheetTabForPath(pathname));
    setExpandedRowIds(new Set());
  }, [isOpen, pathname]);

  useEffect(() => {
    if (!isOpen || activeTab?.id !== 'knowledge' || !auth.user?.id) {
      return;
    }

    let cancelled = false;

    function loadCounts() {
      fetchContextSheetCounts(auth.user.id)
        .then((nextCounts) => {
          if (!cancelled) {
            setCounts(nextCounts);
          }
        })
        .catch(() => {});
    }

    loadCounts();
    window.addEventListener(ITEMS_REFRESH_EVENT, loadCounts);

    return () => {
      cancelled = true;
      window.removeEventListener(ITEMS_REFRESH_EVENT, loadCounts);
    };
  }, [isOpen, activeTab?.id, auth.user?.id]);

  async function handleNavigate(to) {
    onClose();
    await navigate({ to });
  }

  function toggleExpanded(rowId) {
    setExpandedRowIds((current) => {
      const next = new Set(current);

      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }

      return next;
    });
  }

  function renderRow(row, isSubRow = false) {
    if (row.kind === 'link') {
      const count = row.countKey != null ? (counts[row.countKey] ?? null) : null;
      const isActive = isContextShortcutActive(pathname, row.to);
      const isExpanded = expandedRowIds.has(row.id);

      if (row.expandable) {
        return (
          <li
            className={isSubRow ? styles.contextSheet__subItem : styles.contextSheet__item}
            key={row.id}
          >
            <div
              className={`${styles.contextSheet__splitRow} ${isActive ? styles['contextSheet__splitRow--active'] : ''}`}
            >
              <button
                aria-current={isActive ? 'page' : undefined}
                className={styles.contextSheet__rowNav}
                onClick={() => {
                  void handleNavigate(row.to);
                }}
                type="button"
              >
                {row.label}
              </button>
              <span className={styles.contextSheet__rowTrail}>
                {count !== null && (
                  <span className={styles.contextSheet__rowCount}>{count}</span>
                )}
                <button
                  aria-label={isExpanded ? `Collapse ${row.label}` : `Expand ${row.label}`}
                  className={`${styles.contextSheet__chevronButton} ${isExpanded ? styles['contextSheet__chevronButton--expanded'] : ''}`}
                  onClick={() => toggleExpanded(row.id)}
                  type="button"
                >
                  ›
                </button>
              </span>
            </div>

            {isExpanded && row.subRows ? (
              <ul className={styles.contextSheet__subList}>
                {row.subRows.map((subRow) => renderRow(subRow, true))}
              </ul>
            ) : null}
          </li>
        );
      }

      return (
        <li
          className={isSubRow ? styles.contextSheet__subItem : styles.contextSheet__item}
          key={row.id}
        >
          <button
            aria-current={isActive ? 'page' : undefined}
            className={`${styles.contextSheet__rowButton} ${isActive ? styles['contextSheet__rowButton--active'] : ''} ${isSubRow ? styles['contextSheet__rowButton--sub'] : ''}`}
            onClick={() => {
              void handleNavigate(row.to);
            }}
            type="button"
          >
            <span className={styles.contextSheet__rowLabel}>{row.label}</span>
            <span className={styles.contextSheet__rowTrail}>
              {count !== null && (
                <span className={styles.contextSheet__rowCount}>{count}</span>
              )}
              <span className={styles.contextSheet__rowChevron}>›</span>
            </span>
          </button>
        </li>
      );
    }

    if (row.kind === 'soon') {
      return (
        <li
          className={isSubRow ? styles.contextSheet__subItem : styles.contextSheet__item}
          key={row.id}
        >
          <div
            className={`${styles.contextSheet__rowStatic} ${isSubRow ? styles['contextSheet__rowStatic--sub'] : ''}`}
          >
            <span className={styles.contextSheet__rowLabel}>{row.label}</span>
            <span className={styles.contextSheet__soonBadge}>SOON</span>
          </div>
        </li>
      );
    }

    return null;
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

        <div className={styles.contextSheet__body}>
          <ul className={styles.contextSheet__rowList}>
            {activeTab.rows.map((row) => renderRow(row))}
          </ul>
        </div>

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
      </section>
    </div>
  );
}
