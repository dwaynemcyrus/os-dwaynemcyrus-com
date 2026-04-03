import { createElement } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';

export function App() {
  return createElement(RouterProvider, { router });
}
