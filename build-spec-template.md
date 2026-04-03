# build-spec-template
# build-spec.md — Project-Specific Configuration
# Version: 1.0
# Scope: This project only. Edit freely.
# Template: Replace all [PLACEHOLDER] values before use.
# Location: docs/agents/build-spec.md

# Project Identity
* **Project name:** [PROJECT_NAME]
* **Description:** [One sentence — what this product does]
* **Type:** [PWA | Web app | Marketing site | API | Other]
* **Status:** [Active build | Maintenance | MVP]

⠀
# Stack
### Frontend
* **Framework:** [e.g. Next.js 15 | Astro | SvelteKit]
* **Language:** [TypeScript | JavaScript]
* **Styling:** [CSS Modules | Vanilla CSS | Sass]
* **UI library:** [Radix UI | None | Other]
* **Animation:** [framer-motion | None | Other]
* **Forms:** [react-hook-form | None | Other]

⠀Backend / Data
* **Database:** [Supabase | PlanetScale | None]
* **Local/offline DB:** [RxDB | None | Other]
* **Auth:** [Supabase Auth | NextAuth | None]
* **Storage:** [Supabase Storage | S3 | None]

⠀Infrastructure
* **Deployment:** [Vercel | Netlify | Fly.io | Other]
* **CI/CD:** [GitHub Actions | None | Other]
* **Email:** [MailerLite | Resend | None]
* **Payments:** [Stripe | Payrexx | None]

⠀Package manager
* **Detected from lockfile:** [npm | yarn | pnpm | bun]

⠀
# File Structure
### [PASTE OR DESCRIBE YOUR PROJECT FILE STRUCTURE HERE]

### Example:
### src/
### ├── app/              # Routes
### ├── components/
### │   ├── ui/           # Primitive wrappers
### │   ├── layout/       # Navigation, shells
### │   └── shared/       # Cross-feature
### ├── features/         # Domain logic
### ├── lib/              # Core utilities
### ├── hooks/            # Global hooks
### └── styles/           # Variables, reset, utils

# Forbidden (this project)
List anything not already in AGENTS.md that must not be introduced:
* [e.g. No Tailwind]
* [e.g. No shadcn/ui]
* [e.g. No client-side analytics without approval]
* [Add or remove as needed]

⠀
# Core Product Rules (this project)
Define the non-negotiable product behaviors for this project:
* **Primary viewport:** [e.g. iPhone 15 Pro, 393px | Desktop 1280px | Both]
* **Touch targets:** [e.g. 44px minimum | N/A]
* **Offline support:** [Required | Not required]
* **Data source of truth:** [e.g. RxDB local | Supabase direct | Other]
* **UI pattern:** [e.g. Optimistic updates | Server-confirmed | Other]
* **Haptic feedback:** [Required | Not required]
* **Accessibility standard:** [WCAG AA | Basic | Not specified]
* **Sync strategy:** [e.g. Last-write-wins on updated_at | Not applicable]

⠀
# Performance Budgets
* **Initial JS bundle:** [e.g. <200KB gzipped | Not specified]
* **Per-route chunk:** [e.g. <50KB | Not specified]
* **Target TTI (mobile):** [e.g. <3s on 3G | Not specified]
* **Dynamic import threshold:** [e.g. >50KB components | Not specified]

⠀
# Design Constraints
* **Design system / tokens:** [e.g. src/styles/variables.css | Figma file URL | None]
* **Breakpoints:**
  * Default (mobile): [e.g. 393px]
  * Tablet: [e.g. 744px]
  * Desktop: [e.g. 1024px]
* **Font stack:** [e.g. Specified in variables.css | Not yet defined]
* **Color palette:** [e.g. Specified in variables.css | Not yet defined]

⠀
# Database Schema Reference
List all active tables and their purpose. Agents must not add to this list without disclosure and approval (per AGENTS.md database change rules).
| **Table** | **Purpose** | **Notes** |
|:-:|:-:|:-:|
| [table_name] | [what it stores] | [any constraints or notes] |

# Navigation and Routing
Describe the app's navigation model so agents can place new pages correctly:
* **Router:** [Next.js App Router | Pages Router | React Router | Other]
* **Top-level routes:** [e.g. /strategy, /execution, /thoughts]
* **Navigation pattern:** [e.g. Slide menu + FAB | Top nav | Sidebar]
* **Auth-gated routes:** [e.g. All routes under /app/ | None]

⠀
# Environment and Tooling
* **Node version:** [e.g. 20.x]
* **Typecheck command:** [e.g. npx tsc --noEmit]
* **Lint command:** [e.g. npx eslint src/]
* **Test command:** [e.g. npx vitest | None]
* **Build command:** [e.g. npm run build]
* **Dev command:** [e.g. npm run dev]
* **Local dev URL:** [e.g. http://localhost:3000]

⠀
# Active Sub-Docs
Check the boxes for sub-docs in use on this project:
* [ ] docs/agents/architecture.md
* [ ] docs/agents/frontend.md
* [ ] docs/agents/planner.md
* [ ] [Other: _______________]

⠀
# Known Limitations / Technical Debt
Document anything agents should be aware of before touching the codebase:
* [e.g. Auth not yet implemented — RLS policies are open]
* [e.g. RxDB schema at version 0 — migrations untested]
* [e.g. No test suite yet — add tests as you go]

⠀
# Changelog
| **Date** | **Change** | **Author** |
|:-:|:-:|:-:|
| [YYYY-MM-DD] | Initial build-spec created | [Name] |
