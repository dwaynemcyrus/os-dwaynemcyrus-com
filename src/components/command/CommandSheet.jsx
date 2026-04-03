import { createElement, useEffect, useId, useRef, useState } from 'react';
import { FabButton } from './FabButton';
import styles from './CommandSheet.module.css';

const DIRECT_CREATE_HINTS = [
  'Direct item creation will land here next.',
  'Touch hold opens this mode on mobile.',
  'Secondary click opens this mode on desktop.',
];

function getSheetCopy(mode) {
  if (mode === 'direct-create') {
    return {
      description:
        'Choose what to create directly from the floating action button.',
      placeholder: 'Type a subtype or slash command',
      title: 'Direct Create',
    };
  }

  return {
    description:
      'Capture a note, search titles, or jump into a template from one place.',
    placeholder: 'Capture, search, or type / for commands',
    title: 'Command Sheet',
  };
}

export function CommandSheet({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('search');
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const titleId = useId();
  const inputId = useId();
  const descriptionId = useId();

  function openSearchMode() {
    setMode('search');
    setIsOpen(true);
  }

  function openDirectCreateMode() {
    setMode('direct-create');
    setIsOpen(true);
  }

  function closeSheet() {
    setIsOpen(false);
    setMode('search');
    setQuery('');
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeSheet();
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    inputRef.current?.focus();
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeSheet();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  const sheetCopy = getSheetCopy(mode);

  return (
    <div className={styles.commandSheetShell}>
      <div className={styles.commandSheetShell__content}>{children}</div>

      {createElement(FabButton, {
        isSheetOpen: isOpen,
        onOpen: openSearchMode,
        onOpenDirectCreate: openDirectCreateMode,
      })}

      {isOpen ? (
        <div
          className={styles.commandSheet}
          onClick={handleBackdropClick}
          role="presentation"
        >
          <section
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className={styles.commandSheet__panel}
            role="dialog"
          >
            <header className={styles.commandSheet__header}>
              <div>
                <p className={styles.commandSheet__eyebrow}>Personal OS</p>
                <h2 className={styles.commandSheet__title} id={titleId}>
                  {sheetCopy.title}
                </h2>
              </div>

              <button
                aria-label="Close command sheet"
                className={styles.commandSheet__close}
                onClick={closeSheet}
                type="button"
              >
                Close
              </button>
            </header>

            <p className={styles.commandSheet__description} id={descriptionId}>
              {sheetCopy.description}
            </p>

            <label className={styles.commandSheet__field} htmlFor={inputId}>
              <span className={styles.commandSheet__label}>Input</span>
              <input
                className={styles.commandSheet__input}
                id={inputId}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                placeholder={sheetCopy.placeholder}
                ref={inputRef}
                type="text"
                value={query}
              />
            </label>

            {mode === 'direct-create' ? (
              <section className={styles.commandSheet__section}>
                <h3 className={styles.commandSheet__sectionTitle}>
                  Direct Create
                </h3>
                <ul className={styles.commandSheet__hintList}>
                  {DIRECT_CREATE_HINTS.map((hint) => (
                    <li className={styles.commandSheet__hintItem} key={hint}>
                      {hint}
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <>
                <section className={styles.commandSheet__section}>
                  <h3 className={styles.commandSheet__sectionTitle}>Recent</h3>
                  <p className={styles.commandSheet__emptyState}>
                    Recent items will appear here in the next chunk.
                  </p>
                </section>

                <section className={styles.commandSheet__section}>
                  <h3 className={styles.commandSheet__sectionTitle}>
                    Templates
                  </h3>
                  <p className={styles.commandSheet__emptyState}>
                    Template shortcuts will appear here in the next chunk.
                  </p>
                </section>
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
