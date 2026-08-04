# Public assistant provider cutover and edit resend recovery

## Goal

Remove the unavailable Mimo primary channel from production configuration and let unchanged question edits resend as a new branch without model liveness probes.

## Requirements

- Production must no longer select or identify the unavailable Mimo channel.
- Promote the already configured Responses-compatible Grok channel without probing any model.
- Keep one bounded same-provider fallback model for model-specific failures.
- Opening the assistant and health checks must remain model-call free.
- The question editor must allow an unchanged prompt to be submitted again as a deliberate new branch.
- The edit action must distinguish unchanged resend copy from changed-question copy.
- Empty edits and submissions while another assistant action is active remain disabled.

## Acceptance Criteria

- [ ] Render configuration contains no Mimo model/provider reference and keeps a complete primary plus fallback chain.
- [ ] The deployed public service health endpoint remains redacted and returns HTTP 200 without a model request.
- [ ] An unchanged edit exposes an enabled `重新发送` command.
- [ ] A changed edit exposes an enabled `发送修改` command.
- [ ] Deterministic public assistant checks, server build, lint, production build, and diff checks pass.

## Notes

- Production configuration cutover is performed through the Render API with secret values kept server-side.
- No live generation request is part of validation; the user's failed ancient-poem request is the real incident evidence.
