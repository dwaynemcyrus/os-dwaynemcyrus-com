import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import styles from './SettingsRoute.module.css';
import { settingsRoute } from './settings';

const SETTINGS_ROWS = [
  {
    id: 'daily-note',
    label: 'Daily Note',
    meta: 'Choose the template used by Today’s Note.',
    to: '/settings/daily-note',
  },
  {
    id: 'templates',
    label: 'Templates',
    meta: 'Create, edit, and delete reusable templates.',
    to: '/settings/templates',
  },
  {
    id: 'keyboard-shortcuts',
    label: 'Keyboard Shortcuts',
    meta: 'Review the current shortcut reference.',
    to: '/settings/keyboard-shortcuts',
  },
  {
    id: 'slash-commands',
    label: 'Slash Commands',
    meta: 'See the current command sheet actions.',
    to: '/settings/slash-commands',
  },
  {
    id: 'trash',
    label: 'Trash',
    meta: 'Restore or permanently delete trashed items.',
    to: '/settings/trash',
  },
];

export const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  component: function SettingsIndexRoute() {
    const auth = useAuth();
    const navigate = settingsIndexRoute.useNavigate();
    const [accountErrorMessage, setAccountErrorMessage] = useState('');
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function handleSignOut() {
      setAccountErrorMessage('');
      setIsSigningOut(true);

      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          setAccountErrorMessage(error.message);
          return;
        }

        await navigate({
          replace: true,
          search: {
            redirect: '/',
          },
          to: '/auth/signin',
        });
      } catch (error) {
        setAccountErrorMessage(error.message ?? 'Unable to sign out right now.');
      } finally {
        setIsSigningOut(false);
      }
    }

    return (
      <section className={styles.settingsScreen}>
        <header className={styles.settingsScreen__header}>
          <p className={styles.settingsScreen__eyebrow}>Support</p>
          <h1 className={styles.settingsScreen__title}>Settings</h1>
        </header>

        <ul className={styles.settingsScreen__list}>
          {SETTINGS_ROWS.map((row) => (
            <li key={row.id}>
              <button
                className={styles.settingsScreen__rowButton}
                onClick={() => {
                  void navigate({
                    to: row.to,
                  });
                }}
                type="button"
              >
                <span className={styles.settingsScreen__rowContent}>
                  <span className={styles.settingsScreen__rowLabel}>
                    {row.label}
                  </span>
                  <span className={styles.settingsScreen__rowMeta}>
                    {row.meta}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={styles.settingsScreen__rowArrow}
                >
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section className={styles.settingsScreen__section}>
          <p className={styles.settingsScreen__eyebrow}>Account</p>
          <p className={styles.settingsScreen__sectionTitle}>
            {auth.user?.email ?? 'Email unavailable'}
          </p>
          <p className={styles.settingsScreen__copy}>
            Sign in, recovery, and session state are tied to this address.
          </p>

          {accountErrorMessage ? (
            <p
              className={`${styles.settingsScreen__message} ${styles['settingsScreen__message--error']}`}
              role="alert"
            >
              {accountErrorMessage}
            </p>
          ) : null}

          <div>
            <button
              className={styles.settingsScreen__secondaryButton}
              disabled={isSigningOut}
              onClick={() => {
                void handleSignOut();
              }}
              type="button"
            >
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </section>
      </section>
    );
  },
});
