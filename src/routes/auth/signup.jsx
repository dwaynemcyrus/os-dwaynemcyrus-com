import { createRoute, redirect } from '@tanstack/react-router';
import { sanitizeRedirectTarget } from '../../lib/redirect';
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
    return (
      <section>
        <h1>Sign Up</h1>
        <p>Account creation will render here.</p>
      </section>
    );
  },
});
