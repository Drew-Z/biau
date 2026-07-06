# Pet APK Showcase Gate Followup Design

## Direction

Pet public readiness should be explicit about the difference between:

- showcase page reachable;
- screenshots and current work visible;
- debug/stage artifact detected;
- formal signed release approved.

The public site may show current work and release requirements, but a real download requires an approved release artifact.

## Candidate Improvements

- Strengthen `pet:synthetic` or `status:contract` so a debug-only gate cannot become an approved download.
- Improve main-site status/manual-gate wording for Pet APK release requirements.
- Add a release checklist or static assertion that future download links remain gated until approved.

## Safety

No direct APK URL, no signing key, no private artifact path, no R2/private bucket URL, and no claim of release approval unless explicitly approved.
