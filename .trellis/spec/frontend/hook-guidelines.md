# Frontend Hook Guidelines

## Current Pattern

Custom hooks live in `src/hooks/` and use the `use*.ts` naming convention. The
main appearance reference is `src/hooks/useSiteTheme.ts`, which owns one typed
site-theme selection, synchronous root/storage projection, and an optional
reduced-motion-aware View Transition.

## Hook Responsibilities

Use hooks for reusable stateful behavior that is needed outside a single
component. Keep pure helpers inside the hook module when they only support that
hook, as `isSiteTheme`, `readStoredSiteTheme`, and `applySiteTheme` do for the
site-theme contract.

Browser-only APIs must be guarded when initial state can run outside the browser. `readStoredMode()` checks `typeof window === 'undefined'` before reading `localStorage`.

## Effects

Separate effects by responsibility:

- Persistence effect: write a validated user choice to storage.
- DOM synchronization effect: use `useLayoutEffect` when visual attributes
  must be applied before paint.

Always return cleanup functions for timers or subscriptions. Appearance has no
system-color timer: `useSiteTheme` accepts only `morning`, `nature`, or
`stellar` and uses the shared `applySiteTheme` helper for every DOM write.

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

When a visual owner depends on a theme profile, update the renderer
and its diagnostic DOM attributes from the same effect boundary. A theme
change must not leave a stale canvas profile or a second render loop behind.
Keep the owner effect mounted across theme changes: capture the prop only
as an initial fallback, observe `data-site-theme` and
`data-site-theme-version`, and update the
existing renderer in place. Re-running the owner effect for every theme resets
diagnostic versions and creates a transient cleanup/setup window, so UI checks
must assert that every visual profile version advances after a real switch.

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

### Convention: Reading Navigation Lifecycle

The catalog/detail hooks in `useReadingNavigation.ts` own only reading navigation.
Keep canonical query state in the existing discovery helpers. Use a bounded
in-memory record keyed by Router history entry, stable DOM content IDs, and a
typed opaque reference in navigation state. Do not create a global scrolling
service or persist a visitor's reading history for this interaction.

Detail readiness and navigation identity are separate effect dependencies: a
new article can render a loading state before its body arrives. Install the
user-interaction cancellation listener at navigation entry, then position only
when content is ready. A cancelled load or route cleanup must not steal a later
control's focus. Keep the direct-detail-return decision across effect replay for
the same location key, but clear it for unrelated navigation.

Catalog positioning uses layout offsets rather than transformed entrance rects.
A `fadeUp` starting at 16px still has its delay under reduced motion, so measuring
the first painted rect can leave a permanent 16px restoration error. Focus with
`preventScroll`, explicitly position the document, and ensure the target fits
between the actual fixed navigation bounds. Headers may use `tabIndex={-1}` for
programmatic navigation without changing the normal Tab sequence.

History and fragment restoration must also wait for current detail eager images
to finish loading or fail when those images can change earlier document height.
Use owned load/error listeners and one cancellable frame, skip lazy images, and
keep fresh-title focus immediate. User interaction cancels the pending automatic
restore and starts recording the visitor's actual position. A delayed local hero
fixture verifies the final position after image completion, not just before it.
