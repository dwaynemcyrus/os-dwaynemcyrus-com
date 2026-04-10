import { useEffect } from 'react';
import styles from './Toast.module.css';

export function Toast({ message, onDismiss }) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(id);
  }, [message, onDismiss]);

  return (
    <div className={styles.toast} role="alert">
      <span className={styles.toast__message}>{message}</span>
      <button
        aria-label="Dismiss"
        className={styles.toast__dismiss}
        onClick={onDismiss}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
