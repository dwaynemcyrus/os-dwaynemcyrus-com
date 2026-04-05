import { useEffect } from 'react';
import styles from './AppDialog.module.css';

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

export function AppDialog({
  ariaLabel,
  children,
  onClose,
  panelClassName,
  role = 'dialog',
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className={styles.appDialog} role="presentation">
      <button
        aria-label={ariaLabel}
        className={styles.appDialog__backdrop}
        onClick={onClose}
        type="button"
      />
      <div
        aria-modal="true"
        className={joinClassNames(styles.appDialog__panel, panelClassName)}
        role={role}
      >
        {children}
      </div>
    </div>
  );
}
