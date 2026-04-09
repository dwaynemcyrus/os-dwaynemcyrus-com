import { useEffect, useRef } from 'react';
import styles from './FabButton.module.css';

const LONG_PRESS_DURATION_MS = 450;

export function FabButton({
  isSheetOpen,
  onClose,
  onOpen,
  onOpenContext,
}) {
  const longPressTimeoutRef = useRef(null);
  const triggeredAlternateActionRef = useRef(false);

  function clearLongPressTimeout() {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }

  function handlePointerDown() {
    triggeredAlternateActionRef.current = false;
    clearLongPressTimeout();

    longPressTimeoutRef.current = window.setTimeout(() => {
      if (isSheetOpen) {
        onClose();
        return;
      }

      triggeredAlternateActionRef.current = true;
      onOpenContext();
    }, LONG_PRESS_DURATION_MS);
  }

  function handlePointerUp() {
    clearLongPressTimeout();
  }

  function handlePointerCancel() {
    clearLongPressTimeout();
  }

  function handlePointerLeave() {
    clearLongPressTimeout();
  }

  function handleClick() {
    if (triggeredAlternateActionRef.current) {
      triggeredAlternateActionRef.current = false;
      return;
    }

    if (isSheetOpen) {
      onClose();
      return;
    }

    onOpen();
  }

  function handleContextMenu(event) {
    event.preventDefault();
    clearLongPressTimeout();

    if (isSheetOpen) {
      onClose();
      return;
    }

    triggeredAlternateActionRef.current = true;
    onOpenContext();
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
      aria-label={
        isSheetOpen
          ? 'Close active sheet'
          : 'Tap to capture. Hold for the command palette.'
      }
      className={styles.fabButton}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      title={isSheetOpen ? 'Close active sheet' : 'Tap to capture. Hold for palette.'}
      type="button"
    >
      <span aria-hidden="true" className={styles.fabButton__icon} />
    </button>
  );
}
