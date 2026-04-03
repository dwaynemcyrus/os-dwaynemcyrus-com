import { useEffect, useRef } from 'react';
import styles from './FabButton.module.css';

const LONG_PRESS_DURATION_MS = 450;

export function FabButton({ isSheetOpen, onOpen, onOpenDirectCreate }) {
  const longPressTimeoutRef = useRef(null);
  const triggeredAlternateActionRef = useRef(false);

  function clearLongPressTimeout() {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }

  function handlePointerDown(event) {
    if (event.pointerType !== 'touch') {
      return;
    }

    triggeredAlternateActionRef.current = false;
    clearLongPressTimeout();

    longPressTimeoutRef.current = window.setTimeout(() => {
      triggeredAlternateActionRef.current = true;
      onOpenDirectCreate();
    }, LONG_PRESS_DURATION_MS);
  }

  function handlePointerUp() {
    clearLongPressTimeout();
  }

  function handlePointerCancel() {
    clearLongPressTimeout();
  }

  function handleClick() {
    if (triggeredAlternateActionRef.current) {
      triggeredAlternateActionRef.current = false;
      return;
    }

    onOpen();
  }

  function handleContextMenu(event) {
    event.preventDefault();
    clearLongPressTimeout();
    triggeredAlternateActionRef.current = true;
    onOpenDirectCreate();
  }

  useEffect(() => {
    return () => {
      clearLongPressTimeout();
    };
  }, []);

  return (
    <button
      aria-expanded={isSheetOpen}
      aria-haspopup="dialog"
      aria-label="Open command sheet"
      className={styles.fabButton}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      type="button"
    >
      <span aria-hidden="true" className={styles.fabButton__icon}>
        +
      </span>
      <span className={styles.fabButton__hint}>Command sheet</span>
    </button>
  );
}
