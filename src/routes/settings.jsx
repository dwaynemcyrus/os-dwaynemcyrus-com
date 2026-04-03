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
    return 'Template unavailable';
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
        fetchCommandTemplates(),
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
            background: 'rgba(255, 252, 247, 0.94)',
            border: '1px solid rgba(104, 85, 63, 0.14)',
            borderRadius: '1rem',
            boxShadow: '0 24px 60px rgba(84, 61, 37, 0.08)',
            display: 'grid',
            gap: '1rem',
            padding: '1.5rem',
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
                color: '#7c6754',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                margin: 0,
                textTransform: 'uppercase',
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
                color: '#52606d',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Today&apos;s note will open an existing daily entry for your local
              calendar date, or create one from this selected daily template.
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
                  color: '#7c6754',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  margin: 0,
                  textTransform: 'uppercase',
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
                  background: 'rgba(255, 255, 255, 0.92)',
                  border: '1px solid rgba(82, 96, 109, 0.18)',
                  borderRadius: '0.875rem',
                  color: 'inherit',
                  font: 'inherit',
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
                    ? 'rgba(82, 96, 109, 0.18)'
                    : 'linear-gradient(135deg, #2f6f51 0%, #25543d 100%)',
                border: 'none',
                borderRadius: '0.875rem',
                color:
                  isLoadingSettings ||
                  isSavingTemplate ||
                  !hasDailyTemplateOptions ||
                  !isDailyTemplateDirty
                    ? '#52606d'
                    : '#f8fafc',
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
              color: '#52606d',
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
                background: 'rgba(191, 131, 45, 0.12)',
                borderRadius: '0.875rem',
                color: '#7c4a03',
                margin: 0,
                padding: '0.85rem 1rem',
              }}
            >
              No default daily template is selected yet. Today&apos;s note will not
              create until you choose one here.
            </p>
          ) : null}

          {dailyErrorMessage ? (
            <p
              role="alert"
              style={{
                background: 'rgba(186, 73, 73, 0.1)',
                borderRadius: '0.875rem',
                color: '#8f2d2d',
                margin: 0,
                padding: '0.85rem 1rem',
              }}
            >
              {dailyErrorMessage}
            </p>
          ) : null}

          {dailyStatusMessage ? (
            <p
              style={{
                background: 'rgba(47, 111, 81, 0.12)',
                borderRadius: '0.875rem',
                color: '#25543d',
                margin: 0,
                padding: '0.85rem 1rem',
              }}
            >
              {dailyStatusMessage}
            </p>
          ) : null}
        </section>

        <section
          style={{
            background: 'rgba(255, 252, 247, 0.94)',
            border: '1px solid rgba(104, 85, 63, 0.14)',
            borderRadius: '1rem',
            boxShadow: '0 24px 60px rgba(84, 61, 37, 0.08)',
            display: 'grid',
            gap: '1rem',
            padding: '1.5rem',
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
                color: '#7c6754',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                margin: 0,
                textTransform: 'uppercase',
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
                color: '#52606d',
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
                  background: 'rgba(255, 255, 255, 0.72)',
                  border: '1px solid rgba(82, 96, 109, 0.12)',
                  borderRadius: '0.875rem',
                  display: 'grid',
                  gap: '0.75rem',
                  gridTemplateColumns: 'minmax(0, 8rem) minmax(0, 1fr)',
                  padding: '1rem',
                }}
              >
                <span
                  style={{
                    background: 'rgba(47, 111, 81, 0.12)',
                    borderRadius: '0.75rem',
                    color: '#24563d',
                    display: 'inline-flex',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    justifyContent: 'center',
                    minHeight: '2.5rem',
                    padding: '0.65rem 0.8rem',
                  }}
                >
                  {shortcut.keys}
                </span>
                <span
                  style={{
                    color: '#243b53',
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
            background: 'rgba(255, 252, 247, 0.94)',
            border: '1px solid rgba(104, 85, 63, 0.14)',
            borderRadius: '1rem',
            boxShadow: '0 24px 60px rgba(84, 61, 37, 0.08)',
            display: 'grid',
            gap: '1rem',
            padding: '1.5rem',
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
                color: '#7c6754',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                margin: 0,
                textTransform: 'uppercase',
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
                color: '#52606d',
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
                background: 'rgba(186, 73, 73, 0.1)',
                borderRadius: '0.875rem',
                color: '#8f2d2d',
                margin: 0,
                padding: '0.85rem 1rem',
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
                    background: 'rgba(240, 231, 218, 0.88)',
                    borderRadius: '1rem',
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
                      background: 'rgba(255, 255, 255, 0.72)',
                      border: '1px solid rgba(82, 96, 109, 0.12)',
                      borderRadius: '0.875rem',
                      display: 'grid',
                      gap: '0.4rem',
                      minHeight: '100%',
                      padding: '1rem',
                    }}
                  >
                    <span
                      style={{
                        color: '#243b53',
                        fontSize: '1rem',
                        fontWeight: 700,
                      }}
                    >
                      {slashCommand.command}
                    </span>
                    <span
                      style={{
                        color: '#7c6754',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
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
            background: 'rgba(255, 252, 247, 0.94)',
            border: '1px solid rgba(104, 85, 63, 0.14)',
            borderRadius: '1rem',
            boxShadow: '0 24px 60px rgba(84, 61, 37, 0.08)',
            display: 'grid',
            gap: '1rem',
            padding: '1.5rem',
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
                color: '#7c6754',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                margin: 0,
                textTransform: 'uppercase',
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
                color: '#52606d',
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
                background: 'rgba(255, 255, 255, 0.82)',
                border: '1px solid rgba(82, 96, 109, 0.18)',
                borderRadius: '0.875rem',
                color: '#243b53',
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
            background: 'rgba(255, 252, 247, 0.94)',
            border: '1px solid rgba(104, 85, 63, 0.14)',
            borderRadius: '1rem',
            boxShadow: '0 24px 60px rgba(84, 61, 37, 0.08)',
            display: 'grid',
            gap: '1rem',
            padding: '1.5rem',
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
                color: '#7c6754',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                margin: 0,
                textTransform: 'uppercase',
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
                color: '#52606d',
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
              background: 'rgba(255, 255, 255, 0.72)',
              border: '1px solid rgba(82, 96, 109, 0.12)',
              borderRadius: '0.875rem',
              display: 'grid',
              gap: '0.5rem',
              padding: '1rem',
            }}
          >
            <p
              style={{
                color: '#7c6754',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                margin: 0,
                textTransform: 'uppercase',
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
                color: '#52606d',
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
                background: 'rgba(186, 73, 73, 0.1)',
                borderRadius: '0.875rem',
                color: '#8f2d2d',
                margin: 0,
                padding: '0.85rem 1rem',
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
                background: 'linear-gradient(135deg, #8f2d2d 0%, #6d1f1f 100%)',
                border: 'none',
                borderRadius: '0.875rem',
                color: '#f8fafc',
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
