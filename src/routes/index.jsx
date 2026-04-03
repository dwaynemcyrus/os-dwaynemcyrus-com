import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function HomeRoute() {
    return (
      <section>
        <h1>Personal OS</h1>
        <p>
          Home route scaffolded. Daily note, inbox count, and workbench come
          next.
        </p>
      </section>
    );
  },
});
