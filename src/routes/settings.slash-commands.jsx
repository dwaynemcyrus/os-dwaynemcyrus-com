import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { fetchCommandTemplates } from '../lib/items';
import { formatSlashCommandMeta } from '../lib/settings-reference';
import { getSlashCommands } from '../lib/templates';
import styles from './SettingsRoute.module.css';
import { settingsRoute } from './settings';

export const settingsSlashCommandsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'slash-commands',
  component: function SettingsSlashCommandsRoute() {
    const auth = useAuth();
    const [commandTemplates, setCommandTemplates] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const slashCommands = useMemo(
      () => getSlashCommands(commandTemplates, ''),
      [commandTemplates],
    );

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      setIsLoading(true);
      setErrorMessage('');

      fetchCommandTemplates(auth.user.id)
        .then((templates) => {
          if (cancelled) {
            return;
          }

          setCommandTemplates(templates);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setErrorMessage(
            error.message ?? 'Unable to load slash command reference right now.',
          );
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [auth.user?.id]);

    return (
      <section className={styles.settingsScreen}>
        <header className={styles.settingsScreen__header}>
          <p className={styles.settingsScreen__eyebrow}>Settings</p>
          <h1 className={styles.settingsScreen__title}>Slash Commands</h1>
          <p className={styles.settingsScreen__description}>
            Available when you type <code>/</code> in the command sheet.
          </p>
        </header>

        {errorMessage ? (
          <p
            className={`${styles.settingsScreen__message} ${styles['settingsScreen__message--error']}`}
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <div className={styles.settingsScreen__cardList}>
            {[0, 1, 2].map((skeletonRow) => (
              <div className={styles.settingsScreen__cardItem} key={skeletonRow} />
            ))}
          </div>
        ) : (
          <ul className={styles.settingsScreen__cardList}>
            {slashCommands.map((slashCommand) => (
              <li key={slashCommand.command}>
                <div className={styles.settingsScreen__cardItem}>
                  <span className={styles.settingsScreen__cardTitle}>
                    {slashCommand.command}
                  </span>
                  <span className={styles.settingsScreen__cardMeta}>
                    {formatSlashCommandMeta(slashCommand)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  },
});
