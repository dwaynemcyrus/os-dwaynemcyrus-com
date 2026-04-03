import { createRouter } from '@tanstack/react-router';
import { rootRoute } from '../routes/__root';
import { inboxRoute } from '../routes/inbox';
import { indexRoute } from '../routes/index';
import { itemEditorRoute } from '../routes/items.$id';
import { itemsRoute } from '../routes/items';
import { templatesRoute } from '../routes/templates';

const routeTree = rootRoute.addChildren([
  indexRoute,
  inboxRoute,
  itemsRoute,
  itemEditorRoute,
  templatesRoute,
]);

export const router = createRouter({
  routeTree,
});
