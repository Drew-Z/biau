# Implement: ERP auth entry polish

## Checklist

1. [x] Read current ERP auth files:
   - `apps/web/src/views/LoginView.vue`
   - `apps/web/src/stores/auth.ts`
   - `apps/api/src/routes/auth.ts`
   - `apps/api/src/lib/runtime.ts`
2. [x] Update `LoginView.vue`:
   - add confirmation password state and validation;
   - improve registration-disabled and Owner setup messaging;
   - polish layout, background, feature cues, and responsive behavior;
   - keep `from=biau-port` bridge.
3. [x] Run focused checks from `D:/workspace4Cursor/erp`:
   - `npm run build --workspace @erp/web`
   - `npm run test --workspace @erp/api`
   - optionally `npm run build --workspace @erp/api` if API files change.
4. [x] Scan staged changes for secrets and private endpoints.
5. [x] Commit and push the ERP repository if validation passes.
6. [x] Return to `blog-semi` Trellis task notes with validation and commit details.

## Result

- ERP repo: `D:/workspace4Cursor/erp`
- Branch: `codex/ozon-plugin-parity`
- Commit: `2774f3d feat(auth): polish login and registration entry`
- Push: `origin/codex/ozon-plugin-parity`

## Validation

- Passed: `npm run build --workspace @erp/web`
- Passed: `npm run test --workspace @erp/api` (`17` files, `148` tests)
- Passed: `git diff --check` (only Git line-ending warning for CRLF checkout)
- Sensitive scan: no API keys, private keys, secret tokens, or private endpoint patterns found in the diff.
- Note: `npm run lint --workspace @erp/web` is unavailable because `@erp/web` has no `lint` script.

## Rollback

Revert the `LoginView.vue` changes only. No database/schema/API rollback should
be required because the task must not change those contracts.
