# Public assistant frontier RAG / agentic knowledge implementation plan

## Current Phase

Planning. Do not start implementation until the user reviews the PRD/design and
approves `task.py start`.

## Human Decision Gates

1. Confirm main architecture: done.
   - Decision: Agentic Hybrid RAG
   - Components: hybrid retrieval, reranker, lightweight entity/relation
     expansion, citation/self-check, optional future Neo4j
2. Confirm external runtime direction:
   - Recommended first build target: RAG Orchestrator API with provider-agnostic
     storage adapters.
   - Storage can start mocked/local, then choose Supabase / Render Postgres /
     Neo4j / Cloudflare after contract is stable.
3. Confirm secrets/deployment setup:
   - No real keys, connection strings, private endpoints, or deployment URLs are
     committed.
   - Any live provider validation requires explicit user approval and a real
     task prompt, not a liveness ping.

## Execution Plan

### 1. Immediate Answer Quality Baseline

- Update public assistant prompt/fallback style so model answers read like a
  product guide, not a search report.
- Remove prompt instructions that encourage raw path/source-title prose in the
  answer body.
- Keep citation cards as the primary visible source UI.
- Apply consistently to:
  - `functions/_shared/assistant.ts`
  - `server/src/model.ts`
  - `src/components/PublicAssistantWidget.tsx` if formatting changes are needed

Validation:

```powershell
npm.cmd run cf-assistant:smoke
npm.cmd run server:smoke
npm.cmd run lint
npm.cmd run build
```

### 2. Public Knowledge Export V2

- Add a deterministic export module for:
  - `public_documents`
  - `knowledge_chunks`
  - `entities`
  - `relations`
  - static fallback bundle
- Source data from:
  - `src/data/portfolio.ts`
  - `src/data/statusTargets.ts`
  - `src/data/blogCuration.ts`
  - `src/data/blogShared.ts`
  - `src/data/assistant.ts`
- Keep the current `server/data/public-knowledge.json` contract intact while
  adding a new generated graph/knowledge artifact.

Validation:

```powershell
npm.cmd run assistant:index
npm.cmd run lint
npm.cmd run build
```

### 3. Local Agentic Hybrid Retrieval

- Add local retrieval functions that simulate the future orchestrator path:
  - intent routing
  - query term extraction
  - metadata filters
  - entity/relation expansion
  - deterministic rerank fallback
  - evidence sufficiency result
- Use this locally in browser fallback and/or API fallback so behavior improves
  before external infrastructure is ready.
- Return the existing `citations` shape.

Validation:

```powershell
npx.cmd tsx <targeted retrieval assertion script>
npm.cmd run cf-assistant:smoke
npm.cmd run server:smoke
npm.cmd run lint
npm.cmd run build
```

### 4. RAG Orchestrator HTTP Contract

- Add server-only config shape:
  - `ASSISTANT_RAG_API_BASE_URL`
  - `ASSISTANT_RAG_API_KEY`
  - `ASSISTANT_RAG_TIMEOUT_MS`
- Add an adapter that calls external RAG API only from server/Function code.
- Add strict timeout and fallback to local retrieval.
- Do not expose RAG API details to browser bundle.
- Mock this adapter in tests; do not call live model/provider channels during
  ordinary verification.

Validation:

```powershell
npm.cmd run cf-assistant:smoke
npm.cmd run server:smoke
npm.cmd run server:build
npm.cmd run lint
npm.cmd run build
```

### 5. Orchestrator Scaffold

- Decide whether the orchestrator lives:
  - in this repo under a separate directory, or
  - in a separate repository.
- Recommended: separate directory first if tightly coupled to exported site
  data; separate repository only after deployment boundaries stabilize.
- Implement provider-agnostic interfaces:
  - document store
  - vector store
  - keyword search
  - entity graph
  - reranker
  - generator
  - evaluator/checker
- Start with deterministic/mock adapters so contract tests can run without
  model/provider liveness checks.

Validation:

```powershell
npm.cmd run lint
npm.cmd run build
<orchestrator test command once scaffolded>
```

### 6. Storage / Retrieval Backend Selection

Compare options after the local/export/orchestrator contract exists:

- Supabase Postgres + pgvector:
  - best for vector + metadata + hybrid SQL retrieval
  - weaker for deep graph traversal
- Render Postgres + pgvector:
  - keeps orchestrator and vector DB near each other
  - less managed AI tooling than Supabase
- Neo4j / Neo4j Aura:
  - best for explicit graph traversal and Cypher
  - heavier operationally
- Cloudflare Vectorize / AI Search:
  - good platform alignment with Pages
  - weaker for custom graph/rerank/orchestrator logic

Decision rule:

- Choose Supabase or Render Postgres if vector + metadata + lightweight
  relations solve the target questions.
- Choose Neo4j only if deep graph traversal is required by real answer cases.
- Choose Cloudflare-native only if operational consolidation matters more than
  custom orchestration flexibility.

### 7. Observability And Review

- Add low-sensitive diagnostics:
  - retrieval mode
  - citation count
  - fallback reason
  - timeout class
  - no provider URLs or keys
- Add status page integration later only after the RAG API has a real deployed
  health endpoint and the user approves how to check it.

## Rollback Points

- Prompt-only style changes can be reverted independently.
- Knowledge export V2 must not replace the existing `public-knowledge.json`
  until smoke tests pass.
- External RAG API adapter must be optional and disabled by default.
- Orchestrator scaffold must not block the static site build.

## Required Final Checks

Run before commit:

```powershell
npm.cmd run assistant:index
npm.cmd run cf-assistant:smoke
npm.cmd run server:smoke
npm.cmd run server:build
npm.cmd run lint
npm.cmd run build
git diff --check
```

Run a sensitive scan on changed files for:

- API keys
- bearer tokens
- passwords
- database URLs
- private endpoints
- model relay URLs
- raw prompt secrets

## Non-Negotiable Safety Rule

Do not perform live model/provider liveness checks. If live validation becomes
necessary, ask the user first and use a real user-approved task prompt instead
of a ping/test prompt.
