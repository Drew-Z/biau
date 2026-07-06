# Project Detail Visual Evidence Followup Design

## Direction

Project detail pages should behave like visitor-readable technical case studies:

- body sections include screenshots, diagrams, flowcharts, or architecture visuals;
- visual captions explain evidence and limitations;
- source evidence is explicit when a visual is a real screenshot or external project page;
- placeholders or diagrams are labeled as such and do not imply unverified product state.

## Candidate Improvements

- Harden `scripts/check-project-detail-evidence.ts` to validate visual captions, source URLs, and asset existence more strictly.
- Add a small metadata rule for visual images: real screenshots should include a `sourceUrl` or an explicit public-safe caption; diagrams should use a diagram/workflow type.
- Improve one project with weak visual evidence if the audit identifies a clear gap.

## Safety

Do not introduce fake screenshots, sensitive backend URLs, local paths, account data, or private dashboards. Public project pages must remain safe to publish.

