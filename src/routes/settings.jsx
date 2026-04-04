import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import { fetchCommandTemplates } from '../lib/items';
import {
  fetchDailyTemplateSettings,
  saveDailyTemplatePreference,
} from '../lib/settings';
import { supabase } from '../lib/supabase';
import { getSlashCommands } from '../lib/templates';
import { authenticatedRoute } from './_authenticated';

const KEYBOARD_SHORTCUTS = [
  {
    description:
      'Switch the command-sheet query into slash-command matching.',
    keys: '/',
  },
  {
    description: 'Capture the current command-sheet input to inbox.',
    keys: 'Enter',
  },
  {
    description: 'Insert a newline in the command-sheet input.',
    keys: 'Shift + Enter',
  },
  {
    description:
      'Close the command sheet. If unsaved input is present, it captures first.',
    keys: 'Escape',
  },
  {
    description: 'Save the current editor draft explicitly.',
    keys: 'Cmd/Ctrl + S',
  },
  {
    description: 'Trigger wikilink autocomplete in the editor.',
    keys: '[[',
  },
  {
    description: 'Trigger tag autocomplete in the editor.',
    keys: '#',
  },
];

function formatSlashCommandMeta(slashCommand) {
  if (!slashCommand.template) {
    return 'Create a matching template first';
  }

  const metaParts = [];

  if (slashCommand.template.type) {
    metaParts.push(slashCommand.template.type);
  }

  if (slashCommand.template.subtype) {
    metaParts.push(slashCommand.template.subtype.replaceAll('_', ' '));
  }

  return metaParts.join(' · ');
}

export const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
  component: function SettingsRoute() {
    const auth = useAuth();
    const navigate = settingsRoute.useNavigate();
    const [accountErrorMessage, setAccountErrorMessage] = useState('');
    const [commandTemplates, setCommandTemplates] = useState([]);
    const [dailyErrorMessage, setDailyErrorMessage] = useState('');
    const [dailyStatusMessage, setDailyStatusMessage] = useState('');
    const [initialTemplateId, setInitialTemplateId] = useState('');
    const [referenceErrorMessage, setReferenceErrorMessage] = useState('');
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [templateOptions, setTemplateOptions] = useState([]);
    const hasDailyTemplateOptions = templateOptions.length > 0;
    const isDailyTemplateDirty = selectedTemplateId !== initialTemplateId;
    const selectedTemplateLabel = useMemo(
      () =>
        templateOptions.find((option) => option.id === selectedTemplateId)?.label ??
        (hasDailyTemplateOptions
          ? 'No daily template selected'
          : 'No daily template available'),
      [hasDailyTemplateOptions, selectedTemplateId, templateOptions],
    );
    const slashCommands = useMemo(
      () => getSlashCommands(commandTemplates, ''),
      [commandTemplates],
    );

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      setIsLoadingSettings(true);
      setDailyErrorMessage('');
      setDailyStatusMessage('');
      setReferenceErrorMessage('');

      Promise.allSettled([
        fetchDailyTemplateSettings({
          userId: auth.user.id,
        }),
        fetchCommandTemplates(auth.user.id),
      ])
        .then(([dailySettingsResult, commandTemplatesResult]) => {
          if (cancelled) {
            return;
          }

          if (dailySettingsResult.status === 'fulfilled') {
            setTemplateOptions(dailySettingsResult.value.options);
            setSelectedTemplateId(dailySettingsResult.value.selectedTemplateId);
            setInitialTemplateId(dailySettingsResult.value.selectedTemplateId);
          } else {
            setDailyErrorMessage(
              dailySettingsResult.reason?.message ??
                'Unable to load daily note settings right now.',
            );
          }

          if (commandTemplatesResult.status === 'fulfilled') {
            setCommandTemplates(commandTemplatesResult.value);
          } else {
            setReferenceErrorMessage(
              commandTemplatesResult.reason?.message ??
                'Unable to load slash command reference right now.',
            );
          }
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setIsLoadingSettings(false);
        });

      return () => {
        cancelled = true;
      };
    }, [auth.user?.id]);

    async function handleDailyTemplateSubmit(event) {
      event.preventDefault();

      if (!auth.user?.id) {
        setDailyErrorMessage('Your session is missing a user id.');
        return;
      }

      if (!selectedTemplateId) {
        setDailyErrorMessage('Choose a daily template before saving.');
        return;
      }

      setIsSavingTemplate(true);
      setDailyErrorMessage('');
      setDailyStatusMessage('');

      try {
        const savedTemplateId = await saveDailyTemplatePreference({
          dailyTemplateId: selectedTemplateId,
          userId: auth.user.id,
        });

        setInitialTemplateId(savedTemplateId);
        setSelectedTemplateId(savedTemplateId);
        setDailyStatusMessage('Daily note template saved.');
      } catch (error) {
        setDailyErrorMessage(
          error.message ?? 'Unable to save your daily template right now.',
        );
      } finally {
        setIsSavingTemplate(false);
      }
    }

    async function handleSignOut() {
      setAccountErrorMessage('');
      setIsSigningOut(true);

      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          setAccountErrorMessage(error.message);
          return;
        }

        await navigate({
          replace: true,
          search: {
            redirect: '/',
          },
          to: '/auth/signin',
        });
      } catch (error) {
        setAccountErrorMessage(error.message ?? 'Unable to sign out right now.');
      } finally {
        setIsSigningOut(false);
      }
    }

    return (
      <section
        style={{
          display: 'grid',
          gap: '1rem',
          maxWidth: '48rem',
        }}
      >
        <header
          style={{
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <h1 style={{ margin: 0 }}>Settings</h1>
          <p style={{ margin: 0 }}>
            Configure your daily-note default, review active shortcuts and slash
            commands, and manage your account surfaces.
          </p>
        </header>

        <section
          style={{
            display: 'grid',
            gap: '1rem',
          }}
        >
          <header
            style={{
              display: 'grid',
              gap: '0.45rem',
            }}
          >
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.9rem',
                margin: 0,
              }}
            >
              Daily Note
            </p>
            <h2
              style={{
                fontSize: '1.5rem',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Default Daily Template
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Today&apos;s note will open an existing daily entry for your local
              calendar date, or create one from this selected user template.
            </p>
          </header>

          <form
            onSubmit={(event) => {
              void handleDailyTemplateSubmit(event);
            }}
            style={{
              alignItems: 'end',
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
            }}
          >
            <label
              style={{
                display: 'grid',
                gap: '0.45rem',
              }}
            >
              <span
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.9rem',
                  margin: 0,
                }}
              >
                Template
              </span>
              <select
                disabled={
                  isLoadingSettings ||
                  isSavingTemplate ||
                  !hasDailyTemplateOptions
                }
                onChange={(event) => {
                  setSelectedTemplateId(event.target.value);
                  setDailyErrorMessage('');
                  setDailyStatusMessage('');
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border-card)',
                  minHeight: '3rem',
                  padding: '0 0.9rem',
                }}
                value={selectedTemplateId}
              >
                {hasDailyTemplateOptions ? (
                  <option value="">Choose a daily template</option>
                ) : (
                  <option value="">No daily templates available</option>
                )}
                {templateOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              disabled={
                isLoadingSettings ||
                isSavingTemplate ||
                !hasDailyTemplateOptions ||
                !isDailyTemplateDirty
              }
              style={{
                background:
                  isLoadingSettings ||
                  isSavingTemplate ||
                  !hasDailyTemplateOptions ||
                  !isDailyTemplateDirty
                    ? 'transparent'
                    : 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-card)',
                color:
                  isLoadingSettings ||
                  isSavingTemplate ||
                  !hasDailyTemplateOptions ||
                  !isDailyTemplateDirty
                    ? 'var(--color-text-secondary)'
                    : 'var(--color-text-primary)',
                cursor:
                  isLoadingSettings ||
                  isSavingTemplate ||
                  !hasDailyTemplateOptions ||
                  !isDailyTemplateDirty
                    ? 'not-allowed'
                    : 'pointer',
                font: 'inherit',
                fontWeight: 700,
                minHeight: '3rem',
                minWidth: '10rem',
                padding: '0 1.25rem',
              }}
              type="submit"
            >
              {isSavingTemplate ? 'Saving...' : 'Save Template'}
            </button>
          </form>

          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.95rem',
              margin: 0,
            }}
          >
            {isLoadingSettings
              ? 'Loading daily note settings...'
              : `Current selection: ${selectedTemplateLabel}`}
          </p>

          {!isLoadingSettings && hasDailyTemplateOptions && !selectedTemplateId ? (
            <p
              role="status"
              style={{
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              No default daily template is selected yet. Today&apos;s note will not
              create until you choose one here.
            </p>
          ) : null}

          {!isLoadingSettings && !hasDailyTemplateOptions ? (
            <p
              role="status"
              style={{
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              No daily templates are available yet. Create a template and add
              <code> subtype: daily</code> when you want it to appear here.
            </p>
          ) : null}

          {dailyErrorMessage ? (
            <p
              role="alert"
              style={{
                color: 'var(--color-danger)',
                margin: 0,
              }}
            >
              {dailyErrorMessage}
            </p>
          ) : null}

          {dailyStatusMessage ? (
          <p
            style={{
              color: 'var(--color-text-secondary)',
              margin: 0,
            }}
          >
            {dailyStatusMessage}
            </p>
          ) : null}
        </section>

        <section
          style={{
            display: 'grid',
            gap: '1rem',
          }}
        >
          <header
            style={{
              display: 'grid',
              gap: '0.45rem',
            }}
          >
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.9rem',
                margin: 0,
              }}
            >
              Reference
            </p>
            <h2
              style={{
                fontSize: '1.5rem',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Keyboard Shortcuts
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              These are the active keyboard and editor shortcuts available in
              the current build.
            </p>
          </header>

          <ul
            style={{
              display: 'grid',
              gap: '0.75rem',
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {KEYBOARD_SHORTCUTS.map((shortcut) => (
              <li
                key={shortcut.keys}
                style={{
                  alignItems: 'start',
                  border: '1px solid var(--color-border-subtle)',
                  display: 'grid',
                  gap: '0.75rem',
                  gridTemplateColumns: 'minmax(0, 8rem) minmax(0, 1fr)',
                  padding: '1rem',
                }}
              >
                <span
                  style={{
                    color: 'var(--color-text-primary)',
                    display: 'inline-flex',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    justifyContent: 'center',
                    minHeight: '2.5rem',
                    padding: '0.65rem 0',
                  }}
                >
                  {shortcut.keys}
                </span>
                <span
                  style={{
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.55,
                  }}
                >
                  {shortcut.description}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          style={{
            display: 'grid',
            gap: '1rem',
          }}
        >
          <header
            style={{
              display: 'grid',
              gap: '0.45rem',
            }}
          >
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.9rem',
                margin: 0,
              }}
            >
              Reference
            </p>
            <h2
              style={{
                fontSize: '1.5rem',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Slash Commands
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Type <code>/</code> in the command sheet to filter these commands,
              then press <code>Enter</code> to create from the first match.
            </p>
          </header>

          {referenceErrorMessage ? (
            <p
              role="alert"
              style={{
                color: 'var(--color-danger)',
                margin: 0,
              }}
            >
              {referenceErrorMessage}
            </p>
          ) : null}

          {isLoadingSettings ? (
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              {[0, 1, 2].map((skeletonRow) => (
                <div
                  key={skeletonRow}
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border-subtle)',
                    minHeight: '4rem',
                  }}
                />
              ))}
            </div>
          ) : (
            <ul
              style={{
                display: 'grid',
                gap: '0.75rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              {slashCommands.map((slashCommand) => (
                <li key={slashCommand.command}>
                  <div
                    style={{
                      border: '1px solid var(--color-border-subtle)',
                      display: 'grid',
                      gap: '0.4rem',
                      minHeight: '100%',
                      padding: '1rem',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--color-text-primary)',
                        fontSize: '1rem',
                        fontWeight: 700,
                      }}
                    >
                      {slashCommand.command}
                    </span>
                    <span
                      style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.88rem',
                      }}
                    >
                      {formatSlashCommandMeta(slashCommand)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          style={{
            display: 'grid',
            gap: '1rem',
          }}
        >
          <header
            style={{
              display: 'grid',
              gap: '0.45rem',
            }}
          >
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.9rem',
                margin: 0,
              }}
            >
              Workspace
            </p>
            <h2
              style={{
                fontSize: '1.5rem',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Trash
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Trashed items stay out of all active views. Open trash from here
              when you need restore and deletion controls in the next phase.
            </p>
          </header>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <button
              onClick={() => {
                void navigate({
                  to: '/trash',
                });
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border-card)',
                cursor: 'pointer',
                font: 'inherit',
                fontWeight: 700,
                minHeight: '3rem',
                minWidth: '10rem',
                padding: '0 1rem',
              }}
              type="button"
            >
              Open Trash
            </button>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gap: '1rem',
          }}
        >
          <header
            style={{
              display: 'grid',
              gap: '0.45rem',
            }}
          >
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.9rem',
                margin: 0,
              }}
            >
              Account
            </p>
            <h2
              style={{
                fontSize: '1.5rem',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Supabase Session
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Your Personal OS account is currently signed in with this email
              address.
            </p>
          </header>

          <section
            style={{
              display: 'grid',
              gap: '0.5rem',
            }}
          >
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.9rem',
                margin: 0,
              }}
            >
              Email
            </p>
            <p
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                margin: 0,
                overflowWrap: 'anywhere',
              }}
            >
              {auth.user?.email ?? 'Email unavailable'}
            </p>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              This address is used for sign-in and password recovery.
            </p>
          </section>

          {accountErrorMessage ? (
            <p
              role="alert"
              style={{
                color: 'var(--color-danger)',
                margin: 0,
              }}
            >
              {accountErrorMessage}
            </p>
          ) : null}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
            }}
          >
            <button
              disabled={isSigningOut}
              onClick={() => {
                void handleSignOut();
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border-card)',
                color: isSigningOut
                  ? 'var(--color-text-secondary)'
                  : 'var(--color-danger)',
                cursor: isSigningOut ? 'wait' : 'pointer',
                font: 'inherit',
                fontWeight: 700,
                minHeight: '3rem',
                minWidth: '10rem',
                padding: '0 1rem',
              }}
              type="button"
            >
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </section>
      </section>
    );
  },
});
