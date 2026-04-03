# Changelog

All notable changes to Personal OS will be documented in this file.

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
