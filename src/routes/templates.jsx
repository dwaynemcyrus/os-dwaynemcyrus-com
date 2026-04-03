import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';

export const templatesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
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
