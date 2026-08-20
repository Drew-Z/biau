# Frontend Hook Guidelines

## Current Pattern

Custom hooks live in `src/hooks/` and use the `use*.ts` naming convention. The main reference is `src/hooks/useTheme.ts`, which owns theme mode persistence, derived theme resolution, scheduled auto-mode refresh, and root DOM class synchronization.

## Hook Responsibilities

Use hooks for reusable stateful behavior that is needed outside a single component. Keep pure helpers inside the hook module when they only support that hook, as `isDaytime`, `resolveTheme`, and `readStoredMode` do for `useTheme`.

Browser-only APIs must be guarded when initial state can run outside the browser. `readStoredMode()` checks `typeof window === 'undefined'` before reading `localStorage`.

## Effects

Separate effects by responsibility:

- Persistence effect: write user choice to storage.
- Timer effect: start and clean up intervals only when the selected mode needs them.
- DOM synchronization effect: use `useLayoutEffect` when visual classes must be applied before paint.

Always return cleanup functions for timers or subscriptions. `useTheme` clears the auto-mode interval with `window.clearInterval`.

## Data Fetching

There is no frontend server-state library such as React Query or SWR in the current codebase. For now, keep simple fetch logic local to the page/component that owns the interaction, and promote to a hook only after the same pattern is reused.

## Avoid

- Do not put large app-wide stores in hooks by default; this project currently uses local React state and route composition.
- Do not read `localStorage`, `window`, or `document` during module initialization.
- Do not combine unrelated effects into one large effect; it makes cleanup and dependency review harder.

### Convention: Visual Runtime Owner Cleanup

Canvas, `requestAnimationFrame`, pointer/scroll/visibility listeners, media-query
listeners, resize observers, timers, and GSAP timelines must be owned by the
component or hook that creates them. Register each resource inside an effect
that has a matching cleanup, and make the cleanup idempotent for React Strict
Mode replays and SPA route transitions.

When a visual owner depends on a theme or scene profile, update the renderer
and its diagnostic DOM attributes from the same effect boundary. A scene
change must not leave a stale canvas profile or a second render loop behind.

```tsx
useEffect(() => {
  const owner = new VisualOwner(canvas, profile)
  owner.start()
  return () => owner.destroy()
}, [profile])
```

Reduced-motion, hidden-document, and low-power paths may pause or settle the
owner, but they must preserve a nonblank fallback and release listeners/RAF
handles when the component unmounts.
