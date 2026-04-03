import { createElement } from 'react';
import { Outlet, createRoute, redirect } from '@tanstack/react-router';
import { CommandSheet } from '../components/command/CommandSheet';
import { useAuth } from '../lib/auth';
import { rootRoute } from './__root';

export const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  beforeLoad: ({ context, location }) => {
    if (context.auth.isLoading) {
      return;
    }

    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/auth/signin',
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: function AuthenticatedLayout() {
    const auth = useAuth();

    if (auth.isLoading) {
      return (
        <section>
          <h1>Loading</h1>
          <p>Checking your session.</p>
        </section>
      );
    }

    return createElement(CommandSheet, null, createElement(Outlet));
  },
});
