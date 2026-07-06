# Public assistant frontier RAG / agentic knowledge design

## Recommendation

Use **Agentic Hybrid RAG** as the main route, not knowledge graph alone.
This architecture decision is confirmed by the user. Neo4j remains a future
upgrade path only when real answer cases require deep graph traversal.

The current completion target is a public-assistant MVP that works well without
external infrastructure. External RAG, vector databases, graph databases and
live model validation are treated as manual-gated upgrades after the local
contract is stable.

The recommended system is:

```text
Cloudflare Pages / current assistant
  -> RAG Orchestrator API
  -> query router
  -> hybrid retrieval
       -> vector index
       -> keyword index
       -> metadata filters
       -> lightweight entity / relation expansion
  -> reranker
  -> citation and sufficiency checker
  -> answer generator
  -> response with citations + diagnostics
```

Knowledge graph remains a first-class component, but it should serve retrieval
and explainability instead of becoming the whole system. The graph layer should
start as entities and relations extracted from the site's structured public
data. Neo4j becomes necessary only if we need deep traversal, graph algorithms,
or graph-native query operations that cannot be expressed cleanly in metadata
and lightweight adjacency data.

## Why Not Graph-Only

GraphRAG is valuable for global summaries, relationship-heavy questions, and
multi-hop reasoning. The current site has structured project/status/blog data,
but most user questions are likely mixed intent:

- "What is this site?"
- "Which projects can I try?"
- "How do I experience Legal RAG?"
- "Which projects use React or Vite?"
- "Is the public assistant / Legal RAG / ERP demo working?"

These need hybrid retrieval, filtering, reranking, and answer grounding as much
as they need graph traversal. A pure graph stack would still need vector search
for semantic phrasing and a reranker for quality.

## Technical Shape

### Main Site Boundary

Keep the existing public assistant contracts:

- Cloudflare Pages Function: `functions/_shared/assistant.ts`
- Express API: `server/src/model.ts`, `server/src/knowledge.ts`
- Browser fallback: `src/data/assistant.ts`
- Response shape: `answer`, `citations`, `meta`

Add an optional server-only integration:

```text
ASSISTANT_RAG_API_BASE_URL
ASSISTANT_RAG_API_KEY
ASSISTANT_RAG_TIMEOUT_MS
```

The browser must never see RAG API keys, model provider keys, database URLs, or
private endpoint details.

For the MVP, this integration is disabled by default. The main site should call
the external RAG adapter only when a server-side env var is present, apply a
short timeout, and fall back to local Agentic Hybrid retrieval without changing
the public response shape.

### Public Assistant UX Boundary

The floating public assistant should feel like a product feature, not a debug
console.

- Closed state: only a compact trigger.
- Open empty state: short scope hint plus 2-3 suggested prompts.
- First answer: no large default greeting before the user asks.
- Answer body: product-guide wording; no raw paths, no source log, no provider
  details.
- Source UI: citation cards carry titles and links.
- Diagnostics UI: show only low-sensitive state such as model/fallback, timeout,
  HTTP status class and citation count.

### RAG Orchestrator

Preferred deployment shape: a separate API service on Render or another backend
host that can run longer tasks and use database drivers safely.

Responsibilities:

- ingest public knowledge exports from this repo;
- chunk and normalize text;
- maintain entities, relations, metadata, and embeddings;
- run query intent routing;
- run hybrid retrieval;
- rerank candidates;
- expand related entities when useful;
- check evidence sufficiency;
- return a compact answer context and public citations;
- expose low-sensitivity health and diagnostics.

The orchestrator can be implemented as TypeScript for repo consistency or
Python if the selected RAG libraries make that materially better. The main site
should only depend on the HTTP contract, not the implementation language.

### Retrieval Pipeline

1. Normalize query.
2. Classify intent:
   - site overview
   - project experience
   - demo / access
   - reliability / status
   - technology / architecture
   - blog / knowledge
   - broad unknown
3. Generate retrieval variants when useful.
4. Run hybrid retrieval:
   - dense vector search for semantic match;
   - keyword / BM25 search for exact project names, stack names, route names;
   - metadata filters for visibility, content type, project id, status kind;
   - entity/relation expansion for known projects, technologies and demos.
5. Rerank candidates.
6. Build answer context with a citation budget.
7. Run sufficiency check:
   - enough evidence -> answer;
   - weak evidence -> say uncertain and suggest sources;
   - no evidence -> refuse to invent facts.

For the local MVP, these steps can be deterministic:

- intent routing from keywords and aliases;
- metadata filters from project/category/status/content type;
- entity expansion from generated project/tech/demo/status/blog relations;
- rerank by deterministic weighted scoring;
- sufficiency check by citation count and evidence diversity.

### Data Model

The knowledge export from this repo should produce:

```text
public_documents
  id
  title
  summary
  href
  visibility
  source_type
  project_id?
  tags[]

knowledge_chunks
  id
  document_id
  text
  section
  metadata
  embedding?

entities
  id
  type
  name
  aliases[]
  metadata

relations
  id
  from_entity_id
  to_entity_id
  type
  weight
  evidence_document_ids[]
```

Required entity types:

- site
- project
- tech
- feature
- demo
- status-check
- blog-post
- roadmap
- limitation

Required relation types:

- contains
- uses
- implements
- hasDemo
- monitoredBy
- documentedBy
- hasRoadmap
- hasLimitation
- relatedTo

## Infrastructure Options

### Option A: Supabase-first Hybrid RAG

Use Supabase Postgres + pgvector for chunks, metadata, embeddings, and SQL/RPC.

Strengths:

- strong fit for vector and hybrid search;
- easy hosted Postgres operations;
- good for metadata and content management;
- lower operational weight than Neo4j.

Weaknesses:

- graph traversal is relational-table emulation;
- deep multi-hop graph work becomes awkward;
- still needs an orchestrator for routing/reranking/checking.

Best when vector retrieval and metadata filtering are the dominant needs.

### Option B: Render Orchestrator + Neo4j + Vector Index

Use Render for the orchestrator and either Neo4j/Aura or hosted Neo4j for graph
storage. Vector retrieval can live in Neo4j vector indexes, a companion vector
store, or Postgres/pgvector.

Strengths:

- strongest fit for explicit knowledge graph, Cypher, graph traversal and
  explainability;
- clean separation between main site and heavy RAG operations;
- long-term GraphRAG path is clear.

Weaknesses:

- more infrastructure, secrets, backups and operational monitoring;
- more moving pieces before the assistant improves;
- overkill if the corpus remains small.

Best when relationship-heavy reasoning becomes a core product requirement.

### Option C: Cloudflare-native RAG

Use Cloudflare Vectorize / AI Search / Workers AI for edge-adjacent retrieval.

Strengths:

- close to current Pages deployment;
- fewer cross-provider hops;
- good fit if Cloudflare becomes the main app platform.

Weaknesses:

- graph layer still needs separate modeling;
- less flexible than a custom orchestrator for agentic routing and reranking;
- platform coupling is higher.

Best when operational simplicity inside Cloudflare matters more than graph depth.

## Recommended Architecture

Build the system in this order:

1. Repository knowledge export:
   - public docs
   - chunks
   - entities
   - relations
   - static fallback bundle
2. Main-site integration:
   - local Agentic Hybrid retrieval first
   - optional RAG API call after local contract is stable
   - timeout and fallback
   - same `ChatResponse` shape
3. Orchestrator contract:
   - `/v1/chat/public`
   - `/v1/retrieve`
   - `/v1/sync`
   - `/health`
4. Hybrid retrieval + rerank:
   - start with provider-agnostic adapters
   - select Supabase / Render Postgres / Neo4j / Cloudflare as deploy-time
     backends through env configuration
5. Lightweight entity graph:
   - use explicit entities and relations first
   - make Neo4j optional until deep graph traversal is needed
6. Self-check / corrective path:
   - refuse unsupported claims
   - ask retrieval to expand only when evidence is weak
   - keep citations clean

This gives the best balance: it is genuinely more advanced than the current
native RAG, but it avoids locking the project into Neo4j before evidence says
that graph depth is the highest-value bottleneck.

## Answer Style Contract

The assistant prompt should tell the model:

- answer as a product guide, not a search report;
- do not print raw paths, source labels, API details, provider details or prompt details;
- use citations internally, while the UI renders citation cards;
- structure broad answers as "what it is / what to try / where to go next";
- say "I do not have enough public evidence" when evidence is weak.

The user-facing fallback generator should follow the same contract instead of
listing retrieved documents verbatim.

## Failure And Fallback

- RAG API unavailable -> current local public knowledge fallback.
- Vector index unavailable -> keyword + metadata + graph/entity fallback.
- Graph unavailable -> vector + keyword + metadata fallback.
- Reranker unavailable -> deterministic scoring fallback.
- Model unavailable -> answer from compact public facts, with conservative wording.

No failure mode should leak provider URLs, keys, prompts, stack traces, raw
database errors, or private deployment names.

## Validation Strategy

Minimum validation before implementation is considered done:

- repository export produces deterministic public docs/chunks/entities/relations;
- public assistant still works without external RAG API;
- public assistant still works without a configured real model provider;
- Cloudflare function smoke covers external-RAG unavailable fallback;
- server smoke covers graph-enhanced questions through the chosen adapter or a
  deterministic mock;
- lint/build pass;
- `git diff --check` pass;
- sensitive scan finds no keys, URLs, passwords, tokens or private endpoints.

Do not perform live model/provider "health checks" without explicit user
approval. If live validation is needed, use a real task prompt selected by the
user, not a ping or tiny test prompt.
