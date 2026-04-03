import { createElement } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { router } from './router';

export function App() {
  const auth = useAuth();

  return createElement(RouterProvider, {
    router,
    context: {
      auth,
    },
  });
}
