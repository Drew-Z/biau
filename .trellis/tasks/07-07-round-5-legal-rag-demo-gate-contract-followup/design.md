# Legal RAG Demo Gate Contract Followup Design

## Direction

Legal RAG status has three separate signals:

- public entry / API health;
- protected workflow checks that need demo credentials;
- future observability/quality panels.

The synthetic report may confirm API health without proving protected workflows. The status contract should enforce that distinction.

## Candidate Improvement

Add a `legal-rag-synthetic.json` contract check to `status:contract`:

- validate `demoAccessStatus` and `demoAccessSummary`;
- require `hasCredentials` to be boolean;
- prevent protected checks from being `online` when credentials are absent or access is credential-required;
- allow `legal-rag-health` to remain independently online.

## Safety

No live model call, no credentialed protected request, no raw backend errors, and no demo password in repo.
