# AI Daily Studio editorial workspace implementation

## Ordered Work

- [x] Add authenticated APIs and optimistic write contracts.
  - [x] Add authenticated, bounded read-only workspace projection.
  - [x] Add optimistic write contracts for Flash editor actions.
- [x] Add navigation and Runs/Sources views.
- [x] Add Candidates/Events evidence and override workflows.
  - [x] Add read-only Candidates/Events evidence projection and view.
  - [x] Add include/exclude/reorder, merge/split, request-evidence, and override writes.
- [x] Add Flash Review approval, correction, supersession, and withdrawal.
  - [x] Add read-only Flash revision/action projection and deterministic transition fixture check.
  - [x] Add authenticated optimistic write routes and editor controls.
- [x] Add Edition quality-review, revision correction, revalidation, manual draft, and assisted draft flows.
  - [x] Add read-only Edition draft/review/generated-revision projection and navigation.
  - [x] Add correction, revalidation, manual draft, and assisted draft writes.
- [x] Add desktop/mobile fixtures, loading/empty/error states, and overflow assertions.
- [x] Add route, policy, and integration smoke tests.
  - [x] Add workspace decoder/domain checks and local UI route assertions, including Edition correction/revalidation/apply/discard mutations.
  - [x] Add authenticated route/database integration coverage against a disposable local PostgreSQL `_test` database.

## Completion Gate

Every user-visible action maps to one shared domain transition and a deterministic fixture. The authenticated route/database gate passed against a disposable local PostgreSQL `_test` database; no production or shared database was used as a substitute.
