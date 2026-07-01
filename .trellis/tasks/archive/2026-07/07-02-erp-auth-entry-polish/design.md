# Design: ERP auth entry polish

## Approach

Keep the implementation front-end focused. The API and store already provide
the required register/login/Owner setup behavior, so the work should improve
the entry UX while preserving the existing auth contracts.

## UI Behavior

- Keep `LoginView.vue` as the single route component for `/login` and
  `/register`.
- Add `confirmPassword` to the local form state. Validate it only for
  registration and first Owner setup.
- Keep `/register` available only when registration is enabled and setup is not
  needed. If registration is disabled, show a clear locked-registration notice
  and route the switch back to login.
- Owner setup should be visually distinct from normal registration because it
  creates the first privileged account.
- The `from=biau-port` bridge continues to link back to the main project page.

## Visual Direction

- Build a quiet SaaS login surface: dense enough for work, polished enough for a
  product entry.
- Use existing Ant Design Vue form controls and lucide icons already present in
  the app.
- Avoid fake metrics, fake customer logos, or claims about production
  registration availability.
- Use CSS-only background treatment; do not add new image dependencies.

## Compatibility

- Do not change `useAuthStore` persistence shape or token broadcast behavior.
- Do not change API route payloads.
- Do not change `ERP_REGISTRATION_ENABLED` semantics.
