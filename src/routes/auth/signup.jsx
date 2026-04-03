import { Link, createRoute, redirect } from '@tanstack/react-router';
import { createElement, useState } from 'react';
import { AuthForm } from '../../components/auth/AuthForm';
import { sanitizeRedirectTarget } from '../../lib/redirect';
import { supabase } from '../../lib/supabase';
import { rootRoute } from '../__root';

export const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/signup',
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
  component: function SignUpRoute() {
    const navigate = signUpRoute.useNavigate();
    const search = signUpRoute.useSearch();
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    async function handleSubmit({ email, password }) {
      setErrorMessage('');
      setStatusMessage('');
      setIsSubmitting(true);

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        if (data.session) {
          await navigate({
            to: search.redirect,
          });
          return;
        }

        setStatusMessage('Check your email to confirm your account.');
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to create your account right now.');
      } finally {
        setIsSubmitting(false);
      }
    }

    return createElement(AuthForm, {
      description:
        'Create an account to start capturing and organizing your work.',
      errorMessage,
      footer: createElement(
        'p',
        null,
        'Already have an account? ',
        createElement(
          Link,
          {
            search: { redirect: search.redirect },
            to: '/auth/signin',
          },
          'Sign in',
        ),
        '.',
      ),
      isSubmitting,
      onSubmit: handleSubmit,
      pendingLabel: 'Creating account...',
      passwordAutoComplete: 'new-password',
      statusMessage,
      submitLabel: 'Create Account',
      title: 'Sign Up',
    });
  },
});
