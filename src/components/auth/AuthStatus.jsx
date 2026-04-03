import styles from './AuthStatus.module.css';

export function AuthStatus({
  email,
  errorMessage,
  isSubmitting,
  onSignOut,
}) {
  return (
    <main className={styles.authStatus}>
      <section className={styles.authStatus__card}>
        <header className={styles.authStatus__header}>
          <p className={styles.authStatus__eyebrow}>Settings</p>
          <h1 className={styles.authStatus__title}>Account</h1>
          <p className={styles.authStatus__description}>
            Your Personal OS account is currently signed in with Supabase Auth.
          </p>
        </header>

        <section className={styles.authStatus__section}>
          <p className={styles.authStatus__label}>Email</p>
          <p className={styles.authStatus__email}>{email}</p>
          <p className={styles.authStatus__copy}>
            This is the address used for sign-in and password recovery.
          </p>
        </section>

        {errorMessage ? (
          <p
            className={`${styles.authStatus__message} ${styles['authStatus__message--error']}`}
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className={styles.authStatus__actions}>
          <button
            className={styles.authStatus__button}
            disabled={isSubmitting}
            onClick={onSignOut}
            type="button"
          >
            {isSubmitting ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </section>
    </main>
  );
}
