import { createElement } from 'react';
import { createRoute } from '@tanstack/react-router';
import { ItemEditorScreen } from '../components/editor/ItemEditorScreen';
import { authenticatedRoute } from './_authenticated';

export const itemEditorRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/items/$id',
  component: function ItemEditorRoute() {
    const { id } = itemEditorRoute.useParams();

    return createElement(ItemEditorScreen, {
      itemId: id,
    });
  },
});
