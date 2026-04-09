import { createRoute } from '@tanstack/react-router';
import { KEYBOARD_SHORTCUTS } from '../lib/settings-reference';
import styles from './SettingsRoute.module.css';
import { authenticatedRoute } from './_authenticated';

function groupShortcuts(shortcuts) {
  const groups = new Map();

  shortcuts.forEach((shortcut) => {
    const group = shortcut.group ?? 'General';

    if (!groups.has(group)) {
      groups.set(group, []);
    }

    groups.get(group).push(shortcut);
  });

  return [...groups.entries()];
}

export const settingsKeyboardShortcutsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings/keyboard-shortcuts',
  component: function SettingsKeyboardShortcutsRoute() {
    const groups = groupShortcuts(KEYBOARD_SHORTCUTS);

    return (
      <section className={styles.settingsScreen}>
        <header className={styles.settingsScreen__header}>
          <p className={styles.settingsScreen__eyebrow}>Settings</p>
          <h1 className={styles.settingsScreen__title}>Keyboard Shortcuts</h1>
          <p className={styles.settingsScreen__description}>
            Current keyboard and editor shortcuts.
          </p>
        </header>

        {groups.map(([groupName, shortcuts]) => (
          <section className={styles.settingsScreen__section} key={groupName}>
            <h2 className={styles.settingsScreen__sectionTitle}>{groupName}</h2>
            <ul className={styles.settingsScreen__shortcutList}>
              {shortcuts.map((shortcut) => (
                <li
                  className={styles.settingsScreen__shortcutRow}
                  key={shortcut.keys}
                >
                  <span className={styles.settingsScreen__shortcutKeys}>
                    {shortcut.keys}
                  </span>
                  <span className={styles.settingsScreen__shortcutDescription}>
                    {shortcut.description}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    );
  },
});
