import { createRoute, redirect } from '@tanstack/react-router';
import { sanitizeRedirectTarget } from '../../lib/redirect';
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
    return (
      <section>
        <h1>Sign In</h1>
        <p>Email and password sign-in will render here.</p>
      </section>
    );
  },
});
