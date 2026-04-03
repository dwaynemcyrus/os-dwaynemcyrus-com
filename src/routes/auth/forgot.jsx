import { createRoute, redirect } from '@tanstack/react-router';
import { sanitizeRedirectTarget } from '../../lib/redirect';
import { rootRoute } from '../__root';

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
    return (
      <section>
        <h1>Forgot Password</h1>
        <p>Password reset request flow will render here.</p>
      </section>
    );
  },
});
