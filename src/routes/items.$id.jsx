import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';

export const itemEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/items/$id',
  component: function ItemEditorRoute() {
    return (
      <section>
        <h1>Item Editor</h1>
        <p>Raw markdown editing for an item will render here.</p>
      </section>
    );
  },
});
