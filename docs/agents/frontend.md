# Frontend Agent — @frontend
# Location: docs/agents/frontend.md
# Scope: UI components, styling, gestures, navigation, accessibility.
# Read order: AGENTS.md → build-spec.md → this file.

---

## Role Scope

Handle all tasks involving:
- UI components (create, edit, refactor)
- Styling and layout
- Navigation patterns and routing
- Gestures and animation
- Accessibility and focus management
- Loading states and skeleton screens

Do not handle schema changes, sync logic, or database queries directly.
If a UI task requires new data, coordinate via @planner and route data
work to @architecture first.

---

## Component Structure

Every component gets its own folder:

```
ComponentName/
├── ComponentName.tsx
├── ComponentName.module.css
└── index.ts
```

- Max 200 lines per component file. Split if larger.
- index.ts re-exports the component as a named export only.
- No barrel files that re-export entire directories.

---

## Styling Rules

### CSS Modules + BEM

All styles use CSS Modules. Follow BEM naming strictly:

```css
/* Block */
.card { }

/* Element */
.card__title { }
.card__body { }

/* Modifier */
.card--featured { }
.card--disabled { }
```

### CSS variables

Always use variables for spacing, color, radius, z-index, and transitions.
Variables are defined in the location specified in build-spec.md.
Never use hard-coded values for these properties.

```css
.card {
  padding: var(--space-3);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  transition: all var(--transition-normal);
}
```

### Z-index scale

Use only declared z-index variables. Never use raw numbers.
Declare the scale in build-spec.md or the project's variables file.

---

## Mobile-First

Default viewport and touch target requirements are defined in build-spec.md.

Always write styles for the smallest declared viewport first, then scale up
with min-width media queries. Never write desktop-first styles.

Safe area insets must be applied to any element that reaches screen edges:

```css
padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
```

---

## Accessibility (mandatory)

- Touch targets: minimum size defined in build-spec.md
- All interactive elements without visible text must have an `aria-label`
- All interactive elements must have a visible `:focus-visible` state
- Never remove outline without replacing it

```css
.button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## Loading States

Always use skeleton screens. Never use spinners as the primary loading state.

```tsx
// Bad
{isLoading && <Spinner />}

// Good
{isLoading ? <ComponentNameSkeleton /> : <ComponentName />}
```

Skeletons must match the layout of the component they replace.

---

## Optimistic UI Pattern

Update local state immediately on user action. Never block UI on a network
response. Sync happens in the background.

```tsx
const handleAction = async () => {
  // 1. Haptic feedback (if required — see build-spec.md)
  // 2. Update local state immediately
  // 3. Sync handled automatically in background
  // 4. No loading spinner, no await on sync
};
```

---

## Gestures and Animation

Animation library is declared in build-spec.md. Use only what is declared.
Do not introduce a new animation dependency without approval.

### Swipe pattern (if framer-motion is declared)

```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(_, { offset }) => {
    if (offset.x > 100) handleSwipe();
  }}
/>
```

---

## Dynamic Imports

Use dynamic imports for any component exceeding the chunk budget defined
in build-spec.md.

```tsx
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  ssr: false,
  loading: () => <HeavyComponentSkeleton />
});
```

---

## Forms

Form library is declared in build-spec.md. Use only what is declared.

Never use HTML `<form>` submit behavior without explicit handling.
Always validate on the client before any data layer interaction.

---

## Navigation Patterns

Navigation structure is defined in build-spec.md. Before adding any new
route or navigation element:
- Confirm the route exists in the router
- Confirm the navigation entry point (menu, tab, FAB, etc.)
- Do not invent new navigation patterns without approval

---

## Verification Gates (this role)

After any frontend chunk:
- Run typecheck or build
- Visually verify at the primary viewport defined in build-spec.md
- Confirm touch targets meet the minimum defined in build-spec.md
- Confirm all interactive elements have ARIA labels and focus states

After any chunk touching navigation:
- Confirm all declared routes resolve correctly

On failure: stop, report exact error, wait for direction.

---

## Handoff to @architecture

If a UI task reveals a missing data field, collection, or query:
- Stop
- Document what data is needed (field names, types, relationships)
- Route to @architecture via the handoff block defined in AGENTS.md
- Do not fabricate local state as a substitute for missing data