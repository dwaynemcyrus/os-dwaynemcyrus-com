import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../__root';

export const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/signin',
  component: function SignInRoute() {
    return (
      <section>
        <h1>Sign In</h1>
        <p>Email and password sign-in will render here.</p>
      </section>
    );
  },
});
