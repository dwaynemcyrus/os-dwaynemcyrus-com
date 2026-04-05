import { createRoute } from '@tanstack/react-router';
import { KEYBOARD_SHORTCUTS } from '../lib/settings-reference';
import styles from './SettingsRoute.module.css';
import { settingsRoute } from './settings';

export const settingsKeyboardShortcutsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'keyboard-shortcuts',
  component: function SettingsKeyboardShortcutsRoute() {
    return (
      <section className={styles.settingsScreen}>
        <header className={styles.settingsScreen__header}>
          <p className={styles.settingsScreen__eyebrow}>Settings</p>
          <h1 className={styles.settingsScreen__title}>Keyboard Shortcuts</h1>
          <p className={styles.settingsScreen__description}>
            Current keyboard and editor shortcuts.
          </p>
        </header>

        <ul className={styles.settingsScreen__shortcutList}>
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
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
    );
  },
});
