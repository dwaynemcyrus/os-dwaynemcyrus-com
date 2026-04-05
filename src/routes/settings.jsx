import { createElement } from 'react';
import { Outlet, createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';

export const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
  component: function SettingsLayout() {
    return createElement(Outlet);
  },
});
