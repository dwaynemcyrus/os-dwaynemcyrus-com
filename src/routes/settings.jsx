import { createElement, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { AuthStatus } from '../components/auth/AuthStatus';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { authenticatedRoute } from './_authenticated';

export const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
  component: function SettingsRoute() {
    const auth = useAuth();
    const navigate = settingsRoute.useNavigate();
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSignOut() {
      setErrorMessage('');
      setIsSubmitting(true);

      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        await navigate({
          replace: true,
          search: {
            redirect: '/',
          },
          to: '/auth/signin',
        });
      } catch (error) {
        setErrorMessage(error.message ?? 'Unable to sign out right now.');
      } finally {
        setIsSubmitting(false);
      }
    }

    return createElement(AuthStatus, {
      email: auth.user?.email ?? 'Email unavailable',
      errorMessage,
      isSubmitting,
      onSignOut: handleSignOut,
    });
  },
});
