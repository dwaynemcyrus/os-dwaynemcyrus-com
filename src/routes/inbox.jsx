import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';

export const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inbox',
  component: function InboxRoute() {
    return (
      <section>
        <h1>Inbox</h1>
        <p>Unprocessed inbox items will render here.</p>
      </section>
    );
  },
});
