import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../__root';

export const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/signup',
  component: function SignUpRoute() {
    return (
      <section>
        <h1>Sign Up</h1>
        <p>Account creation will render here.</p>
      </section>
    );
  },
});
