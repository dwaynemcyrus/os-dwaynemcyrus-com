import {
  createElement,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { AppChromeContext } from '../../lib/app-chrome';
import {
  getBackNavigation,
  getScreenChromeDefaults,
  isWritingEditorPath,
} from '../../lib/navigation';
import styles from './AppNav.module.css';

export function AppNav({ children }) {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [screenChrome, setScreenChrome] = useState(null);
  const backNavigation = getBackNavigation(pathname);
  const defaultChrome = getScreenChromeDefaults(pathname);
  const isWritingEditor = isWritingEditorPath(pathname);
  const resolvedChrome = useMemo(() => ({
    infoActions: [],
    infoText: '',
    metaText: '',
    moreActions: [],
    ...defaultChrome,
    ...(screenChrome ?? {}),
  }), [defaultChrome, screenChrome]);
  const hasInfoButton =
    Boolean(resolvedChrome.infoText?.trim()) ||
    resolvedChrome.infoActions.length > 0;
  const hasMoreButton = resolvedChrome.moreActions.length > 0;
  const screenClassName = [
    styles.appShell__screen,
    isWritingEditor ? styles['appShell__screen--writing'] : '',
    isWritingEditor ? styles['appShell__screen--chromeOverlay'] : '',
  ]
    .filter(Boolean)
    .join(' ');
  const metaStripeClassName = [
    styles.appShell__metaStripe,
    resolvedChrome.onMetaActivate ? styles['appShell__metaStripe--button'] : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    setIsInfoOpen(false);
    setIsMoreOpen(false);
  }, [pathname]);

  return (
    <div className={styles.appShell}>
      <div className={styles.appShell__chrome}>
          {(isInfoOpen || isMoreOpen) ? (
            <button
              aria-label="Close top menu"
              className={styles.appShell__overlayDismiss}
              onClick={() => {
                setIsInfoOpen(false);
                setIsMoreOpen(false);
              }}
              type="button"
            />
          ) : null}

          <div className={styles.appShell__chromeBar}>
            <div className={styles.appShell__chromePrimary}>
              {backNavigation ? (
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
                </button>
              ) : null}

              {resolvedChrome.metaText ? (
                resolvedChrome.onMetaActivate
                  ? (
                    <button
                      aria-label={resolvedChrome.metaAriaLabel ?? resolvedChrome.metaText}
                      className={metaStripeClassName}
                      onClick={() => {
                        resolvedChrome.onMetaActivate();
                      }}
                      type="button"
                    >
                      <span className={styles.appShell__metaText}>
                        {resolvedChrome.metaText}
                      </span>
                    </button>
                    )
                  : (
                    <div className={metaStripeClassName}>
                      <span className={styles.appShell__metaText}>
                        {resolvedChrome.metaText}
                      </span>
                    </div>
                    )
              ) : null}
            </div>

            <div className={styles.appShell__chromeActions}>
              {hasInfoButton ? (
                <div className={styles.appShell__chromeAction}>
                  <button
                    aria-expanded={isInfoOpen}
                    aria-haspopup="menu"
                    aria-label="Info"
                    className={styles.appShell__iconButton}
                    onClick={() => {
                      setIsMoreOpen(false);
                      setIsInfoOpen((currentValue) => !currentValue);
                    }}
                    type="button"
                  >
                    i
                  </button>

                  {isInfoOpen ? (
                    <div className={styles.appShell__menu} role="menu">
                      {resolvedChrome.infoText?.trim() ? (
                        <p className={styles.appShell__menuInfo} role="presentation">
                          {resolvedChrome.infoText}
                        </p>
                      ) : null}

                      {resolvedChrome.infoActions.map((action) => (
                        <button
                          key={action.id}
                          className={styles.appShell__menuButton}
                          disabled={action.disabled}
                          onClick={() => {
                            setIsInfoOpen(false);
                            action.onSelect();
                          }}
                          role="menuitem"
                          type="button"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {hasMoreButton ? (
                <div className={styles.appShell__chromeAction}>
                  <button
                    aria-expanded={isMoreOpen}
                    aria-haspopup="menu"
                    aria-label="More"
                    className={styles.appShell__iconButton}
                    onClick={() => {
                      setIsInfoOpen(false);
                      setIsMoreOpen((currentValue) => !currentValue);
                    }}
                    type="button"
                  >
                    <span aria-hidden="true" className={styles.appShell__moreDots}>
                      <span className={styles.appShell__moreDot} />
                      <span className={styles.appShell__moreDot} />
                      <span className={styles.appShell__moreDot} />
                    </span>
                  </button>

                  {isMoreOpen ? (
                    <div className={styles.appShell__menu} role="menu">
                      {resolvedChrome.moreActions.map((action) => (
                        <button
                          key={action.id}
                          className={styles.appShell__menuButton}
                          disabled={action.disabled}
                          onClick={() => {
                            setIsMoreOpen(false);
                            action.onSelect();
                          }}
                          role="menuitem"
                          type="button"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
      </div>

      <main className={screenClassName}>
        {createElement(AppChromeContext.Provider, { value: setScreenChrome }, children)}
      </main>
    </div>
  );
}
