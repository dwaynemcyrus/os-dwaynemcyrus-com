import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../lib/auth';

const queryClient = new QueryClient();

export function AppProviders({ children }) {
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(AuthProvider, null, children),
  );
}
