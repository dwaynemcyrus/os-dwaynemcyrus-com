import { createElement } from 'react';
import { createRoute } from '@tanstack/react-router';
import { ItemEditorScreen } from '../components/editor/ItemEditorScreen';
import { templatesRoute } from './templates';

export const settingsTemplateEditorRoute = createRoute({
  getParentRoute: () => templatesRoute,
  path: '$id',
  component: function SettingsTemplateEditorRoute() {
    const { id } = settingsTemplateEditorRoute.useParams();

    return createElement(ItemEditorScreen, {
      editorKind: 'template',
      itemId: id,
    });
  },
});
