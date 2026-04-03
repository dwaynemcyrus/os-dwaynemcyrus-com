import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';

export const itemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/items',
  component: function ItemsRoute() {
    return (
      <section>
        <h1>Items</h1>
        <p>All items, filters, and search will render here.</p>
      </section>
    );
  },
});
