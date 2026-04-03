import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';

export const trashRoute = createRoute({
  getParentRoute: () => rootRoute,
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
