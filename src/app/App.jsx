import { createElement, useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { router } from './router';

export function App() {
  const auth = useAuth();

  useEffect(() => {
    void router.invalidate();
  }, [auth.isAuthenticated, auth.isLoading]);

  return createElement(RouterProvider, {
    router,
    context: {
      auth,
    },
  });
}
