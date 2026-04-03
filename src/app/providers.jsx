import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function AppProviders({ children }) {
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    children,
  );
}
