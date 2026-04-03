import { useEffect, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import {
  fetchDailyTemplateSettings,
  saveDailyTemplatePreference,
} from '../lib/settings';
import { supabase } from '../lib/supabase';
import { authenticatedRoute } from './_authenticated';

export const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
  component: function SettingsRoute() {
    const auth = useAuth();
    const navigate = settingsRoute.useNavigate();
    const [accountErrorMessage, setAccountErrorMessage] = useState('');
    const [dailyErrorMessage, setDailyErrorMessage] = useState('');
    const [dailyStatusMessage, setDailyStatusMessage] = useState('');
    const [initialTemplateId, setInitialTemplateId] = useState('');
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
        'No daily template available',
      [selectedTemplateId, templateOptions],
    );

    useEffect(() => {
      if (!auth.user?.id) {
        return;
      }

      let cancelled = false;

      setIsLoadingSettings(true);
      setDailyErrorMessage('');
      setDailyStatusMessage('');

      fetchDailyTemplateSettings({
        userId: auth.user.id,
      })
        .then((settingsState) => {
          if (cancelled) {
            return;
          }

          setTemplateOptions(settingsState.options);
          setSelectedTemplateId(settingsState.selectedTemplateId);
          setInitialTemplateId(settingsState.selectedTemplateId);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setDailyErrorMessage(
            error.message ?? 'Unable to load daily note settings right now.',
          );
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
            Configure your daily-note default and manage your signed-in account.
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
                {hasDailyTemplateOptions ? null : (
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
