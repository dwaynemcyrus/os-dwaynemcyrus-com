import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';

export const trashRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/trash',
  component: function TrashRoute() {
    return (
      <section>
        <h1>Trash</h1>
        <p>Trashed items, restore actions, and permanent delete will render here.</p>
      </section>
    );
  },
});
