import { useNavigate, useRouterState } from '@tanstack/react-router';
import { getBackNavigation } from '../../lib/navigation';
import styles from './AppNav.module.css';

export function AppNav({ children }) {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const backNavigation = getBackNavigation(pathname);
  const screenClassName = [
    styles.appShell__screen,
    backNavigation ? styles['appShell__screen--withBack'] : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.appShell}>
      <main className={styles.appShell__main}>
        <div className={screenClassName}>
          {backNavigation ? (
            <div className={styles.appShell__chrome}>
              <button
                aria-label={`Back to ${backNavigation.label}`}
                className={styles.appShell__backButton}
                onClick={() => {
                  void navigate({
                    to: backNavigation.to,
                  });
                }}
                type="button"
              >
                <span aria-hidden="true" className={styles.appShell__backIcon}>
                  ‹
                </span>
                <span className={styles.appShell__backLabel}>Back</span>
              </button>
            </div>
          ) : null}

          {children}
        </div>
      </main>
    </div>
  );
}
