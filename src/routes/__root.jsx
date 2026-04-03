import { createElement } from 'react';
import { Outlet, createRootRoute } from '@tanstack/react-router';

export const rootRoute = createRootRoute({
  component: function RootLayout() {
    return createElement('main', null, createElement(Outlet));
  },
});
