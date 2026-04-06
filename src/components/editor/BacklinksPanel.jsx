import styles from './BacklinksPanel.module.css';

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

function formatGroupLabel(group) {
  if (group === 'Mentions') {
    return group;
  }

  return group.replaceAll('_', ' ');
}

function formatItemMeta(item) {
  const metaParts = [];

  if (item.type) {
    metaParts.push(item.type);
  }

  if (item.subtype) {
    metaParts.push(item.subtype.replaceAll('_', ' '));
  }

  return metaParts.join(' · ');
}

export function BacklinksPanel({
  backlinkGroups,
  errorMessage,
  isLoading,
  isDialog = false,
  isReadOnlyTemplate = false,
  onOpenItem,
  savedLabel,
}) {
  const sortedGroups = [...backlinkGroups].sort((leftGroup, rightGroup) => {
    if (leftGroup.group === 'Mentions') {
      return 1;
    }

    if (rightGroup.group === 'Mentions') {
      return -1;
    }

    return leftGroup.group.localeCompare(rightGroup.group);
  });

  return (
    <section
      className={joinClassNames(
        styles.backlinksPanel,
        isDialog ? styles['backlinksPanel--dialog'] : '',
      )}
    >
      <header className={styles.backlinksPanel__header}>
        <p className={styles.backlinksPanel__eyebrow}>Backlinks</p>
        <h2 className={styles.backlinksPanel__title}>Saved Mentions</h2>
        <p className={styles.backlinksPanel__description}>
          Backlinks are computed from the last saved label and document state.
        </p>
      </header>

      {errorMessage ? (
        <p className={styles.backlinksPanel__error} role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <div className={styles.backlinksPanel__skeletonList}>
          {[0, 1].map((rowId) => (
            <div className={styles.backlinksPanel__skeletonRow} key={rowId} />
          ))}
        </div>
      ) : isReadOnlyTemplate ? (
        <p className={styles.backlinksPanel__emptyState}>
          Backlinks are only computed for user-owned saved items.
        </p>
      ) : !savedLabel?.trim() ? (
        <p className={styles.backlinksPanel__emptyState}>
          Save a filename or title on this item before backlinks can be computed.
        </p>
      ) : sortedGroups.length > 0 ? (
        <div className={styles.backlinksPanel__groups}>
          {sortedGroups.map((group) => (
            <section className={styles.backlinksPanel__group} key={group.group}>
              <h3 className={styles.backlinksPanel__groupTitle}>
                {formatGroupLabel(group.group)}
              </h3>

              <ul className={styles.backlinksPanel__list}>
                {group.items.map((item) => (
                  <li key={`${group.group}-${item.itemId}`}>
                    <button
                      className={styles.backlinksPanel__itemButton}
                      onClick={() => {
                        void onOpenItem(item.itemId);
                      }}
                      type="button"
                    >
                      <span className={styles.backlinksPanel__itemTitle}>
                        {item.title}
                      </span>
                      <span className={styles.backlinksPanel__itemMeta}>
                        {formatItemMeta(item)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className={styles.backlinksPanel__emptyState}>
          No saved items link to this label yet.
        </p>
      )}
    </section>
  );
}
