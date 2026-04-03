import { Link, createRoute, redirect } from '@tanstack/react-router';
import { createElement, useId, useState } from 'react';
import styles from '../../components/auth/AuthForm.module.css';
import { sanitizeRedirectTarget } from '../../lib/redirect';
import { supabase } from '../../lib/supabase';
import { rootRoute } from '../__root';

function isValidEmail(value) {
  return typeof value === 'string' && value.includes('@');
}

function buildPasswordResetRedirectUrl(redirectTarget) {
  const url = new URL('/auth/reset', window.location.origin);
  const sanitizedRedirect = sanitizeRedirectTarget(redirectTarget);

  if (sanitizedRedirect !== '/') {
    url.searchParams.set('redirect', sanitizedRedirect);
  }

  return url.toString();
}

export const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/forgot',
  validateSearch: (search) => ({
    redirect: sanitizeRedirectTarget(search.redirect),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isLoading) {
      return;
    }

    if (context.auth.isAuthenticated) {
      throw redirect({
        to: search.redirect,
      });
    }
  },
  component: function ForgotPasswordRoute() {
    const search = forgotPasswordRoute.useSearch();
    const emailId = useId();
    const [email, setEmail] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    async function handleSubmit(event) {
      event.preventDefault();

      const nextEmail = email.trim();

      if (!nextEmail) {
        setErrorMessage('Email is required.');
        return;
      }

      if (!isValidEmail(nextEmail)) {
        setErrorMessage('Enter a valid email address.');
        return;
      }

      setErrorMessage('');
      setStatusMessage('');
      setIsSubmitting(true);

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(nextEmail, {
          redirectTo: buildPasswordResetRedirectUrl(search.redirect),
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setStatusMessage('Check your email for a reset link.');
      } catch (error) {
        setErrorMessage(
          error.message ?? 'Unable to send a reset email right now.',
        );
      } finally {
        setIsSubmitting(false);
      }
    }

    return (
      <main className={styles.authForm}>
        <section className={styles.authForm__card}>
          <header className={styles.authForm__header}>
            <p className={styles.authForm__eyebrow}>Personal OS</p>
            <h1 className={styles.authForm__title}>Forgot Password</h1>
            <p className={styles.authForm__description}>
              Enter your email and we&apos;ll send you a password reset link.
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
            <label className={styles.authForm__field} htmlFor={emailId}>
              <span className={styles.authForm__label}>Email</span>
              <input
                autoComplete="email"
                className={styles.authForm__input}
                id={emailId}
                name="email"
                onChange={(event) => {
                  setEmail(event.target.value);

                  if (errorMessage) {
                    setErrorMessage('');
                  }
                }}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </label>

            <button
              className={styles.authForm__submit}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Sending reset link...' : 'Send Reset Link'}
            </button>
          </form>

          <footer className={styles.authForm__footer}>
            <p>
              Remembered it?{' '}
              {createElement(
                Link,
                {
                  search: { redirect: search.redirect },
                  to: '/auth/signin',
                },
                'Sign in',
              )}
              .
            </p>
            <p>
              Need an account?{' '}
              {createElement(
                Link,
                {
                  search: { redirect: search.redirect },
                  to: '/auth/signup',
                },
                'Sign up',
              )}
              .
            </p>
          </footer>
        </section>
      </main>
    );
  },
});
