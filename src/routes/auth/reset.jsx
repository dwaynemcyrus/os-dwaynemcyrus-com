import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../__root';

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/reset',
  component: function ResetPasswordRoute() {
    return (
      <section>
        <h1>Reset Password</h1>
        <p>New password confirmation flow will render here.</p>
      </section>
    );
  },
});
