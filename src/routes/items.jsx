import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';

export const itemsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
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
