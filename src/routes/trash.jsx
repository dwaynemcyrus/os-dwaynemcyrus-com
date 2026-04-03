import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './_authenticated';

export const trashRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/trash',
  component: function TrashRoute() {
    const navigate = trashRoute.useNavigate();

    return (
      <section
        style={{
          display: 'grid',
          gap: '1rem',
          maxWidth: '42rem',
        }}
      >
        <header
          style={{
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <h1 style={{ margin: 0 }}>Trash</h1>
          <p style={{ margin: 0 }}>
            Trashed items stay hidden from active views. Restore and permanent
            delete controls land here in the next build phase.
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
          <p
            style={{
              color: '#52606d',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Use settings to reach trash for now. This route is intentionally in
            place before restore and delete behavior is added.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
            }}
          >
            <button
              onClick={() => {
                void navigate({
                  to: '/settings',
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
              Back to Settings
            </button>
          </div>
        </section>
      </section>
    );
  },
});
