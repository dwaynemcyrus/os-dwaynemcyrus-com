import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
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
