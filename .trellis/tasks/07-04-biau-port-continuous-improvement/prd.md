# BIAU Port continuous improvement master plan

## Goal

建立一个长期主任务，用来主动寻找当前项目与关联项目里需要完善的地方，并持续拆分、排序和推进可解决问题。主任务本身不直接承载所有实现细节，而是作为“巡检 + 发现 + 编排 + 收口”层，把公开助手、项目展示、可靠性观察、ERP/Legal/Pet/AI 日报等独立可验证工作纳入同一条持续改进主线。

## User Value

- 用户休息或离开时，Codex 仍能围绕项目目标持续寻找可推进的任务，而不是只停在当前一个子问题上。
- Codex 会主动从主站和关联项目中找缺口：页面体验、数据不一致、演示不可达、状态缺失、内容质量、测试缺口、部署风险和文档漂移。
- 必须人工参与的事项被记录下来，等用户回来统一处理。
- 每个子任务都有明确范围、验收标准和回滚点，避免长时间工作后上下文漂移。
- 优先推进可以自动完成、可验证、低风险的改动；涉及密钥、云平台、模型验证、生产发布和账号权限的事项必须进入人工队列。

## Current Task Tree

- `07-04-public-assistant-kg-lite`
  - 当前标题：Public assistant frontier RAG / agentic knowledge upgrade
  - 角色：公开助手前沿 RAG / Agentic Hybrid RAG 主线子任务
- `07-03-cross-project-release-readiness-round-3`
  - 角色：跨项目部署、可靠性、演示入口和发布收尾的既有父任务
  - 已包含子任务：
    - `07-03-erp-production-registration-live-verify`
    - `07-03-legal-rag-demo-access-qa-closure`
    - `07-03-pet-apk-public-release-closure`
    - `07-03-cross-project-scheduled-reliability-observability`
    - `07-03-ai-daily-content-pipeline-phase-1`

## Workstream Scope

### W1. Public Assistant

- Immediate answer quality cleanup.
- Agentic Hybrid RAG planning and staged implementation.
- RAG Orchestrator contract and future storage/runtime selection.
- No live model/provider liveness checks unless the user explicitly approves a real task prompt.

### W2. Project Showcase

- Continue improving project detail pages, homepage cards, links, screenshots, and status routing.
- Keep project pages visitor-readable and technical-case oriented.
- Align BIAU Port / 泊岸 brand across related public demo sites.

### W3. Reliability And Observability

- Improve status pages, detail routes, synthetic checks, generated status JSON, and deployment monitoring.
- Prefer non-secret public checks and deterministic local mocks.
- Record any live endpoint, credential, or production monitoring setup as manual action.

### W4. Cross-Project Release Readiness

- ERP registration and demo access.
- Legal RAG demo access and legal QA / contract review checks.
- Pet APK public release gate.
- Xunqiu / Playlab / other public routes and downloadable artifacts.

### W5. Content And Blog System

- AI Daily pipeline.
- Blog content quality, curation, and assistant knowledge integration.
- Resource sharing / knowledge accumulation / project notes architecture.

### W6. Task Discovery

- Continuously inspect current code, docs, Trellis tasks, status data, generated outputs, and known gaps.
- Include both current repo and related project surfaces already represented in this repo: Legal RAG, ERP, Pet, Xunqiu, Playlab/Game, AI Daily, status monitoring, and public assistant.
- Create child tasks only when the work has an independently verifiable deliverable.
- Record candidate tasks without overloading active implementation scope.

### W7. Cross-Project Gap Closure

- Treat related projects as part of the improvement surface when they affect BIAU Port public presentation or demo readiness.
- Look for gaps such as:
  - public route or external link mismatch;
  - homepage/project card/detail page content drift;
  - demo access blocked without explanation;
  - status page lacking a detail route or check evidence;
  - public assistant knowledge missing project facts;
  - screenshots, APK gates, release notes, or brand alignment missing;
  - blog/project/status/assistant data disagreeing with each other.
- If the source project itself must change, create or record a child task with its repository path and validation expectations.

## Requirements

### R1. Parent Task Role

- This parent task tracks strategy, discovery, prioritization, and integration across child tasks.
- It must not become a catch-all implementation bucket.
- New work should become a child task when it has separate files, validation, deployment steps, or manual gates.

### R2. Prioritization

Use this priority order while the user is away:

1. Fix high-impact public UX regressions that can be validated locally.
2. Improve deterministic project data, assistant knowledge, status routing, and generated artifacts.
3. Add tests/smoke checks around already-implemented behavior.
4. Prepare infrastructure contracts and mocks before requiring real cloud credentials.
5. Defer anything requiring secrets, production console actions, live model validation, account creation, paid service selection, or manual upload.

### R3. Manual Action Tracking

- All user-required actions must be recorded in `manual-actions.md`.
- Manual actions must include:
  - what the user needs to do;
  - why Codex cannot safely do it;
  - required inputs or choices;
  - which task depends on it;
  - whether Codex can continue other work meanwhile.

### R4. Safety

- Do not commit real API keys, tokens, passwords, database URLs, private endpoints, private model relay URLs, signing paths, certificates, or raw production credentials.
- Do not perform live model/provider liveness checks.
- If live model validation is necessary, ask user approval first and use a real task prompt, not ping/test.
- Do not make destructive Git changes or revert user work.

### R5. Progress Loop

For each long-running cycle:

1. Inspect active tasks and repo status.
2. Run a discovery sweep across current project surfaces and linked project surfaces.
3. Select the highest-value unblocked child task or create/update a child task for a newly found gap.
4. If the child is planning-only, finish PRD/design/implement and ask for start approval unless the user has already authorized implementation.
5. If in progress, implement, validate, record spec learnings, commit, and push when appropriate.
6. Add newly discovered work to the task tree or candidate backlog.
7. Update `manual-actions.md`.

### R6. Discovery Sweep Sources

Discovery sweeps should inspect:

- Main site data and routes: `src/data/portfolio.ts`, `src/data/statusTargets.ts`, `src/data/assistant.ts`, blog curation/content, sitemap and status outputs.
- Public UI surfaces: homepage cards, project details, public assistant widget, blog pages, status list/detail pages, static showcase links.
- Validation scripts: smoke tests, UI checks, synthetic checks, sitemap/blog/assistant generation.
- Related local repositories when relevant and accessible:
  - `D:\workspace4Codex\xunqiu`
  - `D:\workspace4Codex\xunqiu-backend-modern`
  - `D:\workspace4Cursor\erp`
  - `D:\workspace4Cursor\game`
  - `D:\workspace4Cursor\legal-rag`
  - `D:\workspace4Cursor\pet`
- Existing Trellis task tree and `manual-actions.md`.

## Acceptance Criteria

- [ ] Parent task has `prd.md`, `design.md`, `implement.md`, and `manual-actions.md`.
- [ ] Existing public assistant frontier RAG task is linked as a child.
- [ ] Existing cross-project release readiness parent task is linked as a child.
- [ ] Manual actions are recorded in one clear queue.
- [ ] The parent task describes how Codex should keep working while the user is away.
- [ ] The parent task describes how Codex should actively discover gaps in the current project and related projects.
- [ ] The parent task identifies what must wait for human action.
- [ ] `git diff --check` passes for planning artifacts.

## Out Of Scope

- This parent task does not itself deploy production services, create cloud resources, rotate keys, upload APKs, or validate real model channels.
- This parent task does not replace child task artifacts.
- This parent task does not authorize implementation of child tasks until those tasks are started through Trellis or the user explicitly instructs direct implementation.

## Open Questions

None. The user explicitly requested a long-running main task that manages continuing subtask discovery and records manual items for later handling.
