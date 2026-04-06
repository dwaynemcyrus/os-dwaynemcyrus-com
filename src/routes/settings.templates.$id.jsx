import { createElement } from 'react';
import { createRoute } from '@tanstack/react-router';
import { ItemEditorScreen } from '../components/editor/ItemEditorScreen';
import { authenticatedRoute } from './_authenticated';

export const settingsTemplateEditorRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings/templates/$id',
  component: function SettingsTemplateEditorRoute() {
    const { id } = settingsTemplateEditorRoute.useParams();

    return createElement(ItemEditorScreen, {
      editorKind: 'template',
      itemId: id,
    });
  },
});
