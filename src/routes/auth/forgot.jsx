import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../__root';

export const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/forgot',
  component: function ForgotPasswordRoute() {
    return (
      <section>
        <h1>Forgot Password</h1>
        <p>Password reset request flow will render here.</p>
      </section>
    );
  },
});
