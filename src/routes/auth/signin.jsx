import { Link, createRoute, redirect } from '@tanstack/react-router';
import { Fragment, createElement, useState } from 'react';
import { AuthForm } from '../../components/auth/AuthForm';
import { sanitizeRedirectTarget } from '../../lib/redirect';
import { supabase } from '../../lib/supabase';
import { rootRoute } from '../__root';

export const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/signin',
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
  component: function SignInRoute() {
    const navigate = signInRoute.useNavigate();
    const search = signInRoute.useSearch();
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit({ email, password }) {
      setErrorMessage('');
      setIsSubmitting(true);

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        await navigate({
          to: search.redirect,
        });
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to sign in right now.');
      } finally {
        setIsSubmitting(false);
      }
    }

    return createElement(AuthForm, {
      description: 'Sign in to your markdown-first workspace.',
      errorMessage,
      footer: createElement(
        Fragment,
        null,
        createElement(
          'p',
          null,
          'Need an account? ',
          createElement(
            Link,
            {
              search: { redirect: search.redirect },
              to: '/auth/signup',
            },
            'Sign up',
          ),
          '.',
        ),
        createElement(
          'p',
          null,
          createElement(
            Link,
            {
              search: { redirect: search.redirect },
              to: '/auth/forgot',
            },
            'Forgot your password?',
          ),
        ),
      ),
      isSubmitting,
      onSubmit: handleSubmit,
      pendingLabel: 'Signing in...',
      submitLabel: 'Sign In',
      title: 'Sign In',
    });
  },
});
