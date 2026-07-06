# Research Notes: Internal Assistant Agentic Architecture Review

## Evidence Directories

```text
C:\tmp\smart-search-evidence\20260706-agentic-rag-frontier
C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review
```

## Commands Used

Initial research:

```powershell
smart-search search "2026 latest RAG architecture agentic RAG retrieval agents tool calling self reflection GraphRAG memory" --validation balanced --extra-sources 2 --timeout 180 --format json --output "C:\tmp\smart-search-evidence\20260706-agentic-rag-frontier\01-broad-search.json"
smart-search fetch "https://arxiv.org/html/2501.09136v4" --format markdown --output "C:\tmp\smart-search-evidence\20260706-agentic-rag-frontier\02-agentic-rag-survey.md"
smart-search fetch "https://www.langchain.com/blog/agentic-rag-with-langgraph" --format markdown --output "C:\tmp\smart-search-evidence\20260706-agentic-rag-frontier\03-langgraph-agentic-rag.md"
smart-search fetch "https://www.anthropic.com/research/building-effective-agents" --format markdown --output "C:\tmp\smart-search-evidence\20260706-agentic-rag-frontier\04-anthropic-effective-agents.md"
smart-search fetch "https://www.microsoft.com/en-us/research/project/graphrag/" --format markdown --output "C:\tmp\smart-search-evidence\20260706-agentic-rag-frontier\05-microsoft-graphrag.md"
smart-search search "GraphRAG LazyGraphRAG Microsoft 2025 2026 retrieval architecture" --validation balanced --extra-sources 1 --timeout 180 --format json --output "C:\tmp\smart-search-evidence\20260706-agentic-rag-frontier\08-graphrag-search.json"
smart-search fetch "https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/" --format markdown --output "C:\tmp\smart-search-evidence\20260706-agentic-rag-frontier\09-lazygraphrag.md"
smart-search fetch "https://developers.openai.com/api/docs/guides/agents" --format markdown --output "C:\tmp\smart-search-evidence\20260706-agentic-rag-frontier\10-openai-agents.md"
```

Second review triggered by the question "是不是应该再调研一下？":

```powershell
smart-search deep "内部知识助手最终架构：2026 年应该采用 Agentic Workspace、Agentic RAG、LangGraph 状态图、OpenAI Agents SDK、Anthropic agent patterns、GraphRAG/Memory-first 还是传统 RAG Orchestrator？请比较最新工程路线、取舍和落地建议" --format json --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\00-deep-plan.json"
smart-search search "2026 internal knowledge assistant architecture agentic RAG agent workflow LangGraph OpenAI Agents SDK Anthropic effective agents GraphRAG memory" --validation balanced --extra-sources 2 --timeout 240 --format json --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\01-search-agent-architecture.json"
smart-search context7-library "LangGraph JavaScript state graph agents memory checkpoint" "agentic workflow internal assistant architecture" --format json --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\02-context7-langgraph-library.json"
smart-search context7-docs "/websites/langchain_oss_javascript_langgraph" "stateful agents durable execution human in the loop memory checkpoint tool calling" --format json --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\03-context7-langgraph-docs.json"
smart-search context7-docs "/openai/openai-agents-js" "agents handoffs guardrails tracing sessions tool calling TypeScript" --format json --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\04-context7-openai-agents-js-docs.json"
smart-search fetch "https://openai.github.io/openai-agents-js/" --format markdown --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\05-fetch-openai-agents-js.md"
smart-search fetch "https://docs.langchain.com/oss/javascript/langgraph/overview" --format markdown --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\06-fetch-langgraph-overview.md"
smart-search fetch "https://www.anthropic.com/research/building-effective-agents" --format markdown --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\07-fetch-anthropic-effective-agents.md"
smart-search zhipu-search "2026 内部知识助手 Agentic RAG LangGraph GraphRAG 智能体 工作流 架构" --count 5 --format json --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\08-zhipu-agentic-rag-cn.json"
smart-search search "2026 内部知识助手 架构 Agentic RAG LangGraph GraphRAG 工作流 智能体 记忆" --validation balanced --extra-sources 1 --timeout 240 --format json --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\09-search-cn-agentic-rag.json"
smart-search fetch "https://docs.langchain.com/oss/python/langgraph/agentic-rag" --format markdown --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\10-fetch-langgraph-agentic-rag.md"
smart-search fetch "https://docs.langchain.com/oss/javascript/langgraph/persistence" --format markdown --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\11-fetch-langgraph-persistence.md"
smart-search fetch "https://microsoft.github.io/graphrag/" --format markdown --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\12-fetch-microsoft-graphrag-docs.md"
smart-search search '"Agentic Workspace" AI agents architecture workspace assistant' --validation balanced --extra-sources 2 --timeout 180 --format json --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\13-search-agentic-workspace-term.json"
smart-search fetch "https://docs.cloud.google.com/architecture/choose-agentic-ai-architecture-components" --format markdown --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\14-fetch-google-agentic-components.md"
smart-search fetch "https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system" --format markdown --output "C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review\15-fetch-google-agent-design-patterns.md"
```

## Caveats

- No `smart-search doctor`, `diagnose`, model ping, tiny prompt, or provider liveness test was run.
- `smart-search zhipu-search` failed because `ZHIPU_API_KEY` is not configured. This was recorded as evidence gap only; no setup or key prompt was triggered.
- `smart-search search` outputs are treated as discovery and synthesis, not as claim-level evidence. Architecture conclusions below rely on fetched official docs, fetched survey/blog evidence, and repository inspection.
- The `"Agentic Workspace"` term appears more product/experience oriented than strict architecture terminology. It is useful as the internal assistant product shape, but not precise enough as the implementation contract.

## Source Findings

- The Agentic RAG survey (`https://arxiv.org/html/2501.09136v4`) supports the trend from static retrieve-then-generate into planning, tool use, reflection, memory, control loops, and multi-agent variants.
- Anthropic's "Building effective agents" (`https://www.anthropic.com/research/building-effective-agents`) distinguishes workflows from agents. Workflows use predefined code paths; agents dynamically direct tool usage and process. It recommends simple composable patterns first, explicit tool interfaces, transparent planning, and thorough tool testing.
- OpenAI Agents SDK TypeScript (`https://openai.github.io/openai-agents-js/`) provides a production-style package with a small set of primitives: agents, sandbox agents, agents as tools/handoffs, guardrails, function tools, MCP tool calling, sessions, human-in-the-loop, and tracing. It is useful evidence for what a modern agent runtime exposes.
- LangGraph overview (`https://docs.langchain.com/oss/javascript/langgraph/overview`) frames LangGraph as a low-level orchestration runtime for long-running, stateful agents, with durable execution, streaming, human-in-the-loop, persistence, and memory.
- LangGraph Agentic RAG guide (`https://docs.langchain.com/oss/python/langgraph/agentic-rag`) shows a retrieval agent where the model decides whether to call a retriever tool, then grades documents, rewrites queries, and loops before final answer generation.
- LangGraph persistence docs (`https://docs.langchain.com/oss/javascript/langgraph/persistence`) separate checkpointers for short-term thread state from stores for long-term cross-thread memory.
- Microsoft GraphRAG docs (`https://microsoft.github.io/graphrag/`) describe GraphRAG as structured, hierarchical RAG that extracts entities/relationships, clusters communities, creates summaries, and supports global/local/DRIFT/basic query modes. It addresses baseline RAG failures on "connect the dots" and holistic questions, but it is a retrieval layer rather than the whole assistant architecture.
- Google Cloud's agentic architecture components (`https://docs.cloud.google.com/architecture/choose-agentic-ai-architecture-components`) emphasize selecting model runtime, agent runtime, memory, observability, security, MCP/A2A-style tool communication, and persistent storage according to workload.
- Google Cloud's design-pattern guide (`https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system`) gives a practical taxonomy: single-agent, sequential, parallel, loop, review/critique, iterative refinement, coordinator, hierarchical decomposition, swarm, ReAct, human-in-the-loop, and custom logic. It also states that predictable tasks may be better served by non-agentic or workflow designs.

## Repository Findings

- `package.json` currently has no LangGraph, LangChain, OpenAI Agents SDK, or agent framework dependency. The repo is already TypeScript/Express/Prisma/Semi, with OpenAI-compatible model-channel support and a separate RAG service boundary.
- `server/src/app.ts:340` currently handles `POST /chat/internal`.
- `server/src/app.ts:386` uses `planAssistantAnswer()` before optionally calling `retrieveAssistantContext()`.
- `server/src/model.ts:226` defines the hard-coded planner to replace.
- `server/src/model.ts:398` already supports `modelChannelId`, so the Agent planner/generator should reuse existing member-channel routing.
- `server/src/ragClient.ts:28` already offers scoped retrieval and orchestrator fallback.
- `server/src/app.ts:640` through `server/src/app.ts:754` already expose internal knowledge document/sync boundaries.
- `server/src/app.ts:38` and `server/src/app.ts:46` mount Studio routes, giving a natural draft-write tool boundary.
- `src/pages/AssistantPage.tsx` already has an internal assistant surface and can become the Agent inspector/workspace instead of a separate page.

## Synthesis

The previous direction is broadly right, but the wording should be corrected:

- Product shape: **Internal Agentic Workspace**.
- Technical architecture: **Agentic stateful workflow with typed tools, policy guardrails, memory, traceable runs, and retrieval as one tool**.
- RAG is not obsolete. Naive vector-only RAG is too weak as the central architecture; hybrid/vector/GraphRAG should be tool/layer choices inside the Agent.
- GraphRAG should be planned as a retrieval capability for relational/global questions, not as the initial universal storage mandate. Microsoft's own modes include basic search alongside graph search.
- LangGraph is strong evidence for state graph, persistence, human-in-the-loop, replay/fork, and iterative retrieval loops. It does not force this repo to adopt LangGraph immediately, especially because the current backend is lightweight TypeScript and provider/channel routing is already custom.
- OpenAI Agents SDK is strong evidence for modern primitives: agent loop, handoffs, tools, guardrails, sessions, tracing, and sandbox agents. It should inform the contract. A hard dependency should be considered only if it can remain compatible with the existing OpenAI-compatible relay/member-channel model.
- Anthropic and Google both caution against unnecessary autonomous complexity. Final-shape implementation should therefore use an Agent run loop where open-ended requests are agentic, while known tasks still execute as deterministic tools/workflows under the same trace.

## Recommended Decision

Keep the task, but rename the architectural conclusion internally:

> 内部助手最终形态 = Agentic Workspace product surface backed by an Agentic Workflow Runtime.

Implementation should keep these final-shape commitments:

- `POST /chat/internal` enters an orchestrator/run-loop, not the old hard-coded keyword router.
- The orchestrator owns typed tools, policy classes, trace events, memory access, guardrail summaries, and citation sufficiency.
- A state-graph mental model is required even if implemented first as local TypeScript modules. Each run should have explicit nodes/steps such as plan, tool selection, tool execution, critique/sufficiency, compose, trace sanitize, and persist.
- The first production implementation should be single-supervisor Agent plus typed tools, with sub-agent/handoff slots in the contract. This follows Google/Anthropic guidance and avoids prematurely building a costly swarm.
- Add optional future adapter points for LangGraph/OpenAI Agents SDK/MCP-compatible tools, but do not bind the first implementation to one vendor framework.
- Treat GraphRAG/Neo4j as a future retrieval tool for multi-hop relationship questions. Do not make it a gate before the internal assistant can become agentic.
