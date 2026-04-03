import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';

export const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
  component: function SettingsRoute() {
    return (
      <section>
        <h1>Settings</h1>
        <p>Account settings, shortcuts, and references will render here.</p>
      </section>
    );
  },
});
