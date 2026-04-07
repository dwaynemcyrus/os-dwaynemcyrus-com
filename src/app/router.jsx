import { createRouter } from '@tanstack/react-router';
import { forgotPasswordRoute } from '../routes/auth/forgot';
import { resetPasswordRoute } from '../routes/auth/reset';
import { signInRoute } from '../routes/auth/signin';
import { signUpRoute } from '../routes/auth/signup';
import { rootRoute } from '../routes/__root';
import { authenticatedRoute } from '../routes/_authenticated';
import { inboxRoute } from '../routes/inbox';
import { indexRoute } from '../routes/index';
import { itemEditorRoute } from '../routes/items.$id';
import { itemsRoute } from '../routes/items';
import { notesRoute } from '../routes/notes';
import { notesFilterRoute } from '../routes/notes.$filter';
import { settingsDailyNoteRoute } from '../routes/settings.daily-note';
import { settingsIndexRoute } from '../routes/settings.index';
import { settingsKeyboardShortcutsRoute } from '../routes/settings.keyboard-shortcuts';
import { settingsSlashCommandsRoute } from '../routes/settings.slash-commands';
import { settingsTemplateEditorRoute } from '../routes/settings.templates.$id';
import { templatesRoute } from '../routes/templates';
import { trashRoute } from '../routes/trash';

const protectedRouteTree = authenticatedRoute.addChildren([
  indexRoute,
  inboxRoute,
  itemsRoute,
  itemEditorRoute,
  notesRoute,
  notesFilterRoute,
  settingsIndexRoute,
  settingsDailyNoteRoute,
  settingsKeyboardShortcutsRoute,
  settingsSlashCommandsRoute,
  templatesRoute,
  settingsTemplateEditorRoute,
  trashRoute,
]);

const routeTree = rootRoute.addChildren([
  protectedRouteTree,
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
      lastEvent: null,
    },
  },
});
