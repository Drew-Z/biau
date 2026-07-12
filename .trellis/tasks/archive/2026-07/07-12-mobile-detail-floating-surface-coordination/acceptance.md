# Acceptance: Mobile Detail Floating Surface Coordination

## Result

- Public assistant now measures real mobile overlap with the detail reading guide and moves only by the required distance plus an 8px gap.
- Animated intermediate frames are normalized through the actual transform matrix, preventing offset amplification.
- Mobile opening either high-occupancy surface closes the other; desktop and no-collision routes retain their previous behavior.
- Collision state resets after the guide sticks to the top, on non-detail routes, while the assistant is open, and when the guide unmounts.

## Evidence

- Initial project-detail offsets at 320/390/430px are 33px, 50px, and 19px; each leaves an 8-9px visual gap and zero intersection.
- Scrolling the 390px project detail to the sticky-guide state resets the offset to 0.
- The 390px blog detail no-collision case reports offset 0.
- Bidirectional mobile open-state exclusion passed at all three widths with assistant health mocked locally.
- Final 390px screenshot shows the assistant trigger above, not on top of, the reading guide.
- `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run performance:check`, and `npm.cmd run check:ui` passed.
- `git diff --check` and Trellis validation passed.

## Safety

UI checks intercept `/health` and return a local fallback payload. No real model channel, provider endpoint, key, or production prompt was tested.