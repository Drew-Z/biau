# Implement

1. Extend `Navigation` route metadata and render the mobile bottom-tab navigation.
2. Add mobile-only safe-area, active-state, content-clearance, and floating-assistant CSS contracts.
3. Update UI checks for five routes, nested active states, 44px targets, collision, bounds, footer clearance, and desktop inverse visibility.
4. Capture representative mobile screenshots and compare layout at 320px, 390px, and 430px.
5. Run lint, build, performance, UI, Trellis, and diff checks.
6. Update frontend navigation/quality specs, record acceptance evidence, commit, archive, and push.

## Rollback

Remove the mobile tabbar markup and related mobile CSS variables/rules; the existing desktop navigation and route structure remain unchanged.