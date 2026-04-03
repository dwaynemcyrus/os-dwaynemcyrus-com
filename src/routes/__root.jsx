import { createElement } from 'react';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import styles from './RootLayout.module.css';

export const rootRoute = createRootRoute({
  component: function RootLayout() {
    return createElement(
      'div',
      { className: styles.rootLayout },
      createElement(
        'div',
        { className: styles.rootLayout__viewport },
        createElement(Outlet),
      ),
    );
  },
});
