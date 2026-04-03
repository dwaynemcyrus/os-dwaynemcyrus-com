import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';

export const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/templates',
  component: function TemplatesRoute() {
    return (
      <section>
        <h1>Templates</h1>
        <p>System and user templates will render here.</p>
      </section>
    );
  },
});
