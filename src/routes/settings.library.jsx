import { useEffect } from 'react';
import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';

export const settingsLibraryRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings/library',
  component: function SettingsLibraryRoute() {
    const navigate = settingsLibraryRoute.useNavigate();

    useEffect(() => {
      void navigate({ to: '/items', replace: true });
    }, [navigate]);

    return null;
  },
});
