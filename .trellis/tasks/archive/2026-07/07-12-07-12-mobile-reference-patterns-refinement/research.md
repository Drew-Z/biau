# Reference Findings

Saved reference: `D:\workspace4Cursor\resourses\沐星埠.html` and companion runtime/styles.

Patterns adopted:

- Persistent mobile icon-and-label tabbar for stable primary destinations.
- `env(safe-area-inset-bottom)` and at least 44px touch targets.
- Explicit mobile simplification instead of retaining every desktop interaction.
- Reduced visual intensity and no mandatory motion for primary navigation.

Patterns intentionally not adopted:

- GSAP-heavy global boot/runtime orchestration.
- Background audio and canvas-dependent navigation feedback.
- Client-side HTML document replacement.
- Horizontal gesture-driven primary navigation.