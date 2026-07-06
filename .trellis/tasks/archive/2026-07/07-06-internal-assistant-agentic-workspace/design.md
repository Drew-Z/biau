# Internal Assistant Agentic Workspace Design

## Evidence-Based Direction

The target product shape is an internal **Agentic Workspace**, not a patched RAG pipeline. After the second research pass, the implementation architecture should be named more precisely:

> **Agentic Workflow Runtime for the Internal Workspace**.

This matters because "Agentic Workspace" is mostly a product/experience phrase: a persistent place where humans and AI agents share context, tools, memory and artifacts. The technical contract must be more concrete: typed tools, stateful run loop, policy guardrails, memory, traceable execution and retrieval as one callable tool.

Current research and production guidance point to the same direction:

- Agentic RAG survey: modern RAG moves from static retrieval toward planning, tool use, reflection, memory and adaptive control.
- Anthropic effective agents: begin with composable patterns, distinguish workflows from agents, and add autonomy only where flexibility matters.
- OpenAI Agents SDK TypeScript: modern agent runtimes expose agents, sandbox agents, tools, handoffs, guardrails, sessions, human-in-the-loop and tracing.
- LangGraph: stateful agent orchestration focuses on durable execution, persistence, memory, human-in-the-loop, replay/fork and iterative workflows.
- LangGraph self-reflective RAG: retrieval quality needs loops such as grading, query rewrite and retry; a graph/state-machine mental model is useful.
- Microsoft GraphRAG/LazyGraphRAG: graph retrieval is a valuable tool for relational/global questions, but cost and update behavior argue against making graph storage the only answer path.
- Google Cloud agentic patterns: single-agent, coordinator, ReAct, review/critique, HITL and custom-logic patterns should be selected by workload; predictable tasks can remain deterministic workflows inside the Agent surface.

The design conclusion: **Workspace product surface, Agentic Workflow Runtime underneath; tools first-class, RAG as one tool.** The repo owns the tool contracts and trace safety. Frameworks can inspire shape, but the core runtime remains provider-agnostic TypeScript so Mimo / GLM / DeepSeek / future OpenAI-compatible relays can share the same member-channel routing.

This explicitly rejects two extremes:

- Not enough: naive vector top-k RAG or keyword intent routing as the main architecture.
- Too much too early: a swarm/multi-agent framework or mandatory graph database before the internal assistant has typed tools, traces, guardrails and evaluation.

## Current Architecture To Replace

Current internal chat flow:

```text
/chat/internal
  -> read member/session
  -> planAssistantAnswer(question, internal)
  -> optionally retrieveAssistantContext()
  -> generateAnswer()
  -> persist answer/meta/usage
```

This is predictable, but too workflow-like. It forces the code to pre-classify writing/planning/site QA and makes every new capability another branch. The final shape should be:

```text
/chat/internal
  -> read member/session
  -> Agentic Workflow Runtime
       -> build run state
       -> model or mock planner selects tools
       -> execute typed tools under policy
       -> reflect/check sufficiency and safety
       -> compose final answer
       -> return safe trace/meta
  -> persist answer/meta/usage
```

## Runtime Modules

Proposed backend ownership:

- `server/src/agentTypes.ts`
  - tool ids, permission classes, run state, trace events, safe meta types.
- `server/src/agentTools.ts`
  - typed tool registry and tool implementations.
- `server/src/agentOrchestrator.ts`
  - stateful run loop, planner call, deterministic mock planner, tool execution, guardrail orchestration, final composer.
- `server/src/agentGuardrails.ts`
  - output/trace sanitization, sensitive-pattern checks, citation sufficiency checks, permission enforcement.
- `server/src/model.ts`
  - stays responsible for OpenAI-compatible model channel calls; may expose a planner/generator helper but not own tool policy.
- `server/src/app.ts`
  - keeps route/auth/session/persistence boundary and calls the orchestrator.
- `src/data/assistant.ts`
  - normalizes Agent meta from `unknown`.
- `src/pages/AssistantPage.tsx`
  - renders tool trace and answer inspector.

## Agent Run Contract

Input:

```ts
interface InternalAgentRunInput {
  member: SafeMemberContext
  sessionId: string
  question: string
  locale: 'zh-CN'
  modelChannelId?: string | null
}
```

Output:

```ts
interface InternalAgentRunResult {
  answer: string
  citations: Citation[]
  meta: {
    mode: 'model' | 'fallback'
    model: string
    provider?: string
    modelChannel?: AssistantModelChannelSummary
    citationCount: number
    agent: {
      mode: 'agentic-workspace'
      planner: 'model' | 'mock' | 'fallback'
      status: 'completed' | 'guarded' | 'degraded' | 'failed'
    }
    tools: AgentToolTrace[]
    retrieval?: AssistantRetrievalMeta
    guardrails: AgentGuardrailSummary
    reason?: ChatFallbackReason | 'tool_error' | 'policy_blocked'
  }
}
```

Safe trace rule: tool trace may contain ids, labels, status, durations, counts, citation ids and coarse error class. It must never include raw request bodies, provider URLs, keys, document bodies, member tokens, admin tokens, database URLs or stack traces.

## Tool Registry

Minimum registry:

| Tool | Permission | Purpose |
| --- | --- | --- |
| `rag.retrieve` | `read` | Retrieve scoped public/internal evidence via existing `retrieveAssistantContext()` and RAG Orchestrator fallback. |
| `status.query` | `read` | Read sanitized status/synthetic/manual-gate summaries from existing public status data. |
| `project.lookup` | `read` | Read sanitized project facts, links, stack, roadmap and detail content from `src/data/portfolio.ts` projections. |
| `knowledge.search` | `read` | Search internal knowledge docs and generated public knowledge summaries without exposing raw private sync diagnostics. |
| `studio.draft` | `draft-write` | Create/plan Studio draft records for blog, AI Daily, project detail, resource or status copy. No public publish. |
| `memory.search` | `read` | Read current member/session summaries only. No cross-member access. |
| `memory.write` | `draft-write` | Store low-sensitive session summary or preference notes if schema support is added. |
| `answer.direct` | `read` | Direct model answer when no external tool is needed. |

Future tools can be added only through the registry with permission class, safe schema, validation and smoke coverage.

## Planner Strategy

Final architecture uses model-driven planning when configured, but preserves deterministic tests and deterministic tool workflows for predictable work:

1. Build a compact tool menu with descriptions and permission rules.
2. Ask the member-assigned model channel for a structured plan.
3. Validate the structured plan against the tool registry and policy.
4. If planner unavailable or invalid, use a deterministic mock planner for local fallback.
5. Execute tools under a step/timeout budget.
6. Run critic/sufficiency checks and, when useful, one bounded rewrite/retrieve loop.
7. Run guardrails and trace sanitization.
8. Compose final answer through model if available, otherwise conservative fallback.

This is not a traditional intent router. The deterministic planner exists for tests and outage fallback; production behavior is Agent tool selection.

## Framework Position

The first implementation should not add a hard dependency on LangGraph, OpenAI Agents SDK or another agent framework. It should implement the repository-owned runtime in TypeScript and keep adapter points open.

Reasoning:

- The repo already has custom OpenAI-compatible member model channels; a framework that assumes one provider path could break this.
- The server has clear route/service-mode boundaries (`public`, `internal`, `rag`, `studio`) that should remain application-owned.
- The required runtime is small enough for a typed local contract: plan, validate, execute tools, reflect/check, compose, sanitize, persist.
- Official framework docs are still useful as acceptance criteria: sessions/checkpoints, tools, handoffs, guardrails, tracing, human review and memory must appear in our design.

Future adapters are allowed when they add concrete value:

- LangGraph adapter for durable, replayable, long-running state graphs.
- OpenAI Agents SDK adapter for sandbox agents, handoffs or tracing when provider compatibility is proven.
- MCP/A2A-compatible tool server boundary if internal tools become shared across services.
- GraphRAG/Neo4j/FalkorDB tool when multi-hop project/entity questions prove current retrieval insufficient.

## Guardrails

Guardrails run before and after tool calls:

- Tool permission enforcement.
- Sensitive output detection for keys, tokens, DB URLs, provider endpoints and private prompts.
- Scope enforcement: public tool cannot return internal citations; member memory cannot cross member/session boundary.
- Draft-write gate: Agent may create draft/plans but cannot publish, deploy or mutate admin settings from normal chat.
- Citation sufficiency: factual project/status/legal claims need citations or uncertainty.
- Trace sanitizer: raw tool payloads are reduced to low-sensitive summaries.

## Persistence

The first implementation can store Agent meta in existing `ChatMessage.meta` JSON and `UsageLog` low-sensitive fields. A new `AgentRun` table is optional only if trace length or queryability becomes a concrete need. If added later, it must store safe summaries only.

## UI

`/assistant` should become a real internal Agent workspace:

- main answer remains conversational;
- right inspector shows:
  - Agent status;
  - model channel;
  - tools used;
  - RAG/citation sufficiency;
  - guardrail/fallback;
  - latest citations;
- no raw JSON trace by default;
- draft-write actions show clear “draft created / needs review” state.

## Compatibility

- Existing member tokens, sessions, messages and model channels remain valid.
- Existing public assistant route can continue using conservative RAG flow until a separate public-agent task updates it.
- Service modes must keep their existing boundaries:
  - public: no internal/admin/studio write tools;
  - internal: internal chat/admin/studio API tools behind auth;
  - rag: retrieval/sync routes only;
  - studio: Studio API only.

## Latest-Technology Verification

This design matches current frontier patterns because it includes:

- tool-calling agent/workflow runtime as the orchestrator;
- retrieval as an optional tool rather than mandatory preprocessing;
- self-reflective/corrective loop through guardrails and sufficiency checks;
- graph/vector/hybrid retrieval as tools/layers rather than a monolithic storage decision;
- memory and state as explicit tool contracts;
- trace/eval/observability as part of the output contract;
- human approval gates for risky writes.
- extension slots for handoffs/subagents, MCP-style tools and future GraphRAG without making those dependencies gates for the first implementation.

It intentionally rejects:

- naive vector top-k RAG as the main architecture;
- hard-coded keyword intent routing as the long-term decision layer;
- graph database first without real deep traversal need;
- autonomous publish/deploy/admin mutations from normal chat.

## Rollback

If Agent planning fails, `/chat/internal` should return a degraded Agent meta and use safe direct/fallback answer behavior. It should not expose raw planner errors or break session persistence.
