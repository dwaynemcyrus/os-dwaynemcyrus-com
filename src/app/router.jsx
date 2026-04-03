import { createRouter } from '@tanstack/react-router';
import { forgotPasswordRoute } from '../routes/auth/forgot';
import { resetPasswordRoute } from '../routes/auth/reset';
import { signInRoute } from '../routes/auth/signin';
import { signUpRoute } from '../routes/auth/signup';
import { rootRoute } from '../routes/__root';
import { inboxRoute } from '../routes/inbox';
import { indexRoute } from '../routes/index';
import { itemEditorRoute } from '../routes/items.$id';
import { itemsRoute } from '../routes/items';
import { settingsRoute } from '../routes/settings';
import { templatesRoute } from '../routes/templates';
import { trashRoute } from '../routes/trash';

const routeTree = rootRoute.addChildren([
  indexRoute,
  inboxRoute,
  itemsRoute,
  itemEditorRoute,
  templatesRoute,
  settingsRoute,
  trashRoute,
  signInRoute,
  signUpRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
]);

export const router = createRouter({
  routeTree,
  context: {
    auth: {
      session: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
    },
  },
});
