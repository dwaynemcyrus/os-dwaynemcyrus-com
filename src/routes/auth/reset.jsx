import { Link, createRoute } from '@tanstack/react-router';
import { createElement, useId, useState } from 'react';
import styles from '../../components/auth/AuthForm.module.css';
import { useAuth } from '../../lib/auth';
import { sanitizeRedirectTarget } from '../../lib/redirect';
import { supabase } from '../../lib/supabase';
import { rootRoute } from '../__root';

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/reset',
  validateSearch: (search) => ({
    redirect: sanitizeRedirectTarget(search.redirect),
  }),
  component: function ResetPasswordRoute() {
    const auth = useAuth();
    const navigate = resetPasswordRoute.useNavigate();
    const search = resetPasswordRoute.useSearch();
    const passwordId = useId();
    const confirmPasswordId = useId();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    async function handleSubmit(event) {
      event.preventDefault();

      if (!password) {
        setErrorMessage('A new password is required.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords must match.');
        return;
      }

      if (!auth.session) {
        setErrorMessage('This reset link is invalid or expired.');
        return;
      }

      setErrorMessage('');
      setStatusMessage('');
      setIsSubmitting(true);

      try {
        const { error } = await supabase.auth.updateUser({
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setStatusMessage('Password updated. Redirecting...');
        await navigate({
          replace: true,
          to: search.redirect,
        });
      } catch (error) {
        setErrorMessage(
          error.message ?? 'Unable to update your password right now.',
        );
      } finally {
        setIsSubmitting(false);
      }
    }

    if (auth.isLoading) {
      return (
        <main className={styles.authForm}>
          <section className={styles.authForm__card}>
            <header className={styles.authForm__header}>
              <p className={styles.authForm__eyebrow}>Personal OS</p>
              <h1 className={styles.authForm__title}>Reset Password</h1>
              <p className={styles.authForm__description}>
                Checking your recovery session.
              </p>
            </header>
          </section>
        </main>
      );
    }

    if (!auth.session) {
      return (
        <main className={styles.authForm}>
          <section className={styles.authForm__card}>
            <header className={styles.authForm__header}>
              <p className={styles.authForm__eyebrow}>Personal OS</p>
              <h1 className={styles.authForm__title}>Reset Password</h1>
              <p className={styles.authForm__description}>
                This reset link is invalid, expired, or missing.
              </p>
            </header>

            <p
              className={`${styles.authForm__message} ${styles['authForm__message--error']}`}
              role="alert"
            >
              Request a fresh password reset email to continue.
            </p>

            <footer className={styles.authForm__footer}>
              <p>
                {createElement(
                  Link,
                  {
                    search: { redirect: search.redirect },
                    to: '/auth/forgot',
                  },
                  'Send another reset email',
                )}
              </p>
              <p>
                {createElement(
                  Link,
                  {
                    search: { redirect: search.redirect },
                    to: '/auth/signin',
                  },
                  'Back to sign in',
                )}
              </p>
            </footer>
          </section>
        </main>
      );
    }

    return (
      <main className={styles.authForm}>
        <section className={styles.authForm__card}>
          <header className={styles.authForm__header}>
            <p className={styles.authForm__eyebrow}>Personal OS</p>
            <h1 className={styles.authForm__title}>Reset Password</h1>
            <p className={styles.authForm__description}>
              {auth.lastEvent === 'PASSWORD_RECOVERY'
                ? 'Recovery link verified. Set a new password below.'
                : 'Set a new password for your account.'}
            </p>
          </header>

          {errorMessage ? (
            <p
              className={`${styles.authForm__message} ${styles['authForm__message--error']}`}
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}

          {statusMessage ? (
            <p
              className={`${styles.authForm__message} ${styles['authForm__message--success']}`}
              role="status"
            >
              {statusMessage}
            </p>
          ) : null}

          <form className={styles.authForm__form} onSubmit={handleSubmit}>
            <label className={styles.authForm__field} htmlFor={passwordId}>
              <span className={styles.authForm__label}>New Password</span>
              <input
                autoComplete="new-password"
                className={styles.authForm__input}
                id={passwordId}
                name="password"
                onChange={(event) => {
                  setPassword(event.target.value);

                  if (errorMessage) {
                    setErrorMessage('');
                  }
                }}
                placeholder="Enter a new password"
                type="password"
                value={password}
              />
            </label>

            <label
              className={styles.authForm__field}
              htmlFor={confirmPasswordId}
            >
              <span className={styles.authForm__label}>Confirm Password</span>
              <input
                autoComplete="new-password"
                className={styles.authForm__input}
                id={confirmPasswordId}
                name="confirmPassword"
                onChange={(event) => {
                  setConfirmPassword(event.target.value);

                  if (errorMessage) {
                    setErrorMessage('');
                  }
                }}
                placeholder="Confirm your new password"
                type="password"
                value={confirmPassword}
              />
            </label>

            <button
              className={styles.authForm__submit}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Updating password...' : 'Update Password'}
            </button>
          </form>

          <footer className={styles.authForm__footer}>
            <p>
              {createElement(
                Link,
                {
                  search: { redirect: search.redirect },
                  to: '/auth/signin',
                },
                'Back to sign in',
              )}
            </p>
          </footer>
        </section>
      </main>
    );
  },
});
