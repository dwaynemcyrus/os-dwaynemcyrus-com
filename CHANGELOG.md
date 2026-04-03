# Changelog

All notable changes to Personal OS will be documented in this file.

## [0.4.0] - 2026-04-03

Recommended release: `v0.4.0`

### Added
- Global command-sheet shell with a persistent floating action button on authenticated screens.
- Recent items, template browsing, live title search, quick capture, and rapid logging in the command sheet.
- Slash-command creation from seeded system templates and a thin insert-template flow on the item route.
- Real inbox list and inline inbox processor for reviewing captures before moving them into backlog.

### Changed
- The app now runs inside a viewport-bounded shell with inner scrolling instead of page-level scrolling.
- The command sheet stays within the app shell and uses an internal scroll region when content grows.
- New runtime items now use timestamp-based `cuid` values with collision suffixes when needed.

### Fixed
- Removed the redundant `processed` field from the schema, seed data, runtime logic, and spec docs.
- Inbox processing now relies on `status` only and moves completed captures to `backlog`.

### Notes
- This milestone completes the command sheet and inbox phases of the build sequence.
- The item editor phase is next in the planned build order.

## [0.3.0] - 2026-04-03

Recommended release: `v0.3.0`

### Added
- Supabase-backed authentication flows for sign in, sign up, forgot password, reset password, and sign out.
- Route protection for all non-authenticated application routes with redirect-back handling.
- Shared auth UI components for account access and account status screens.
- Settings account section showing the signed-in email address.

### Changed
- Auth state now tracks the current session and latest auth event so recovery and redirect flows can respond to session changes.
- Password recovery emails now target the in-app reset route and preserve the originally requested destination when available.

### Notes
- This milestone completes the authentication phase of the build sequence.
- Core app workflows after authentication remain ahead in the build order.

## [0.2.0] - 2026-04-03

Recommended release: `v0.2.0`

### Added
- Initial Supabase schema migration for `items`, `item_history`, `habit_logs`, and `finance_entries`.
- Row level security policies for user-scoped data and readable system templates.
- System template seed SQL covering all canonical template records defined in the schema reference.
- Supabase CLI project config for migrations and seeding.

### Changed
- Applied the database schema and template seed to the linked Supabase project.

### Fixed
- Qualified trigram operator classes in the migration so the remote Postgres deployment can create the search indexes.
- Preserved schema defaults during seeding so blank frontmatter values no longer insert invalid `null` values into non-null columns.

### Notes
- This milestone completes the first data-layer foundation of the app.
- Authentication and application workflows remain ahead in the build sequence.

## [0.1.0] - 2026-04-03

Recommended release: `v0.1.0`

### Added
- Initial Vite + React application scaffold.
- TanStack Query provider shell and TanStack Router setup.
- Route stubs for home, inbox, items, item editor, templates, settings, trash, and auth screens.
- Shared Supabase client module and `.env.example`.
- Repo hygiene files for linting and ignored generated artifacts.
- Execution plan for the phased build sequence.

### Changed
- Removed the obsolete `build-spec-template.md` file from the repository history after the new document-driven setup was established.

### Notes
- This is the first tagged milestone for the project.
- The app currently covers Phase 1 scaffold work only. Database schema, template seeding, authentication, and feature implementation remain ahead.
