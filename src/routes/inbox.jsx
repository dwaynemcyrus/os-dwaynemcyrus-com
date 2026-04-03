import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';

export const inboxRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
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
