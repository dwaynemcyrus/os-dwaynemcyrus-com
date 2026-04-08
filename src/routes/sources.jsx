import { useEffect } from 'react';
import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';

export const sourcesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/sources',
  component: function SourcesRoute() {
    const navigate = sourcesRoute.useNavigate();

    useEffect(() => {
      void navigate({ to: '/sources/$filter', params: { filter: 'inbox' }, replace: true });
    }, [navigate]);

    return null;
  },
});
