# Internal Assistant Agentic Workspace Polish Design

## Direction

The final internal assistant shape is an Agentic Workspace:

- member-token protected internal assistant;
- admin-only member/model-channel/knowledge management;
- typed safe tools with draft-write boundaries;
- persisted session history;
- sanitized answer diagnostics;
- optional external RAG behind scoped server-side boundaries.

This child task should not redesign the whole assistant. It should inspect the current state and choose one small improvement that makes the final shape safer or easier to operate.

## Candidate Improvements

- Improve `/assistant/admin` status or empty states for model channels, knowledge sync, members, or invites.
- Strengthen frontend normalizers for Agent/tool diagnostics.
- Add or extend a local smoke check around route isolation or safe metadata.
- Improve docs or env examples only if they close a real operational gap.
- Add a UI cue that clearly distinguishes local fallback, model answer, RAG retrieval, and Agent/tool action results.

## Safety Boundaries

- No browser-side secrets.
- No live model tests.
- No raw provider diagnostics.
- No direct vector/database access from frontend.
- No production credentials in task files.
