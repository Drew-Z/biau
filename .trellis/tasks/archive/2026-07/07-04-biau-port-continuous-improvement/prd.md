# BIAU Port continuous improvement master plan

## Goal

建立一个长期主任务，用来主动寻找当前项目与关联项目里需要完善的地方，并持续拆分、排序和推进可解决问题。主任务本身不直接承载所有实现细节，而是作为“巡检 + 发现 + 编排 + 收口”层，把公开助手、项目展示、可靠性观察、ERP/Legal/Pet/Xunqiu/Game/AI 日报等独立可验证工作纳入同一条持续改进主线。

这个长期任务不只修主站展示层。只要改动能反哺 BIAU Port 的公开展示、演示可用性、可靠性观察、构建质量或项目可信度，也可以进入关联项目主体做低风险、可验证的小步改进。

当前用户明确授权长期持续执行：当多个路线都合理时，Codex 按本任务内的默认推荐路线决策并继续推进，不再为了普通优先级、局部实现方式或低风险验证反复等待用户选择。只有涉及密钥、生产账号、云平台、付费资源、真实模型调用、APK/二进制公开、真实用户数据或不可逆部署设置时，才记录人工门禁并切换到其他未阻塞工作。

## User Value

- 用户休息或离开时，Codex 仍能围绕项目目标持续寻找可推进的任务，而不是只停在当前一个子问题上。
- Codex 会主动从主站和关联项目中找缺口：页面体验、数据不一致、演示不可达、状态缺失、内容质量、测试缺口、部署风险和文档漂移。
- Codex 可以在关联项目主体里修复直接影响公开展示、演示入口、构建验证或可靠性观测的问题，而不是只在主站写说明。
- 必须人工参与的事项被记录下来，等用户回来统一处理。
- 每个子任务都有明确范围、验收标准和回滚点，避免长时间工作后上下文漂移。
- 优先推进可以自动完成、可验证、低风险的改动；涉及密钥、云平台、模型验证、生产发布和账号权限的事项必须进入人工队列。

## Current Task Tree

- `07-04-public-assistant-kg-lite`
  - 当前标题：Public assistant frontier RAG / agentic knowledge upgrade
  - 角色：公开助手本地 Agentic Hybrid RAG MVP 子任务，已完成本地知识 V2、实体关系扩展和确定性 rerank 基线；后续外部 Orchestrator / Qdrant / Supabase / 生产模型属于后续子任务或人工门禁
- `07-04-public-assistant-rag-orchestrator-phase-2`
  - 当前标题：Public Assistant RAG Orchestrator Phase 2
  - 角色：公开助手二期子任务，目标是外部 RAG Orchestrator、向量检索、reranker、self-check 和质量评测集
- `07-03-cross-project-release-readiness-round-3`
  - 角色：跨项目部署、可靠性、演示入口和发布收尾的既有父任务
  - 已包含子任务：
    - `07-03-erp-production-registration-live-verify`
    - `07-03-legal-rag-demo-access-qa-closure`
    - `07-03-pet-apk-public-release-closure`
    - `07-03-cross-project-scheduled-reliability-observability`
    - `07-03-ai-daily-content-pipeline-phase-1`
- 当前会话临时收口项：
  - RAG 知识文章与 blog-content-pipeline 知识栏目规则已经完成改写和验证，下一步优先只提交相关文件并推送，避免和长期跨项目改动混在一起。

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
- Direct low-risk fixes in related project repositories when they are required to make the public demo, build, or status truth better.

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
- Related project source code may be improved directly when the change is small, reversible, locally verifiable, and tied to public presentation, demo usability, reliability checks, build quality, or project evidence.
- Look for gaps such as:
  - public route or external link mismatch;
  - homepage/project card/detail page content drift;
  - demo access blocked without explanation;
  - status page lacking a detail route or check evidence;
  - public assistant knowledge missing project facts;
  - screenshots, APK gates, release notes, or brand alignment missing;
  - blog/project/status/assistant data disagreeing with each other.
- If the source project itself must change, create or record a child task with its repository path and validation expectations.

### W8. Related Project Body Improvements

- `D:\workspace4Cursor\erp`: registration/login UI, registration visibility, role-safety copy, demo usability, local smoke/build verification.
- `D:\workspace4Cursor\legal-rag`: demo entry, login explanation, safe public demo credentials surface, QA/contract-review smoke paths, quality panel displayability.
- `D:\workspace4Cursor\pet`: App showcase evidence, APK release gate, build artifact checks, download page preparation, app/backend surfaces that support public demonstration.
- `D:\workspace4Codex\xunqiu` and `D:\workspace4Codex\xunqiu-backend-modern`: showcase site, APK/backend status, health/smoke checks, docs consistency, public download boundaries.
- `D:\workspace4Cursor\game`: Playlab links, playable resources, screenshots, title/favicon consistency, mobile hints, static build confidence.

## Requirements

### R1. Parent Task Role

- This parent task tracks strategy, discovery, prioritization, and integration across child tasks.
- It must not become a catch-all implementation bucket.
- New work should become a child task when it has separate files, validation, deployment steps, or manual gates.

### R2. Prioritization

Use this priority order while the user is away:

0. Current dirty-work closure: commit and push the already-verified RAG knowledge article / blog skill rule changes, staging only directly related files.
1. Legal RAG demo access, QA / contract-review usability, and login-gate explanation.
2. ERP registration, login-page experience, production registration visibility, and main-site sync.
3. Pet showcase, APK release gate, and app/backend evidence needed for public display.
4. Cross-project status pages, external links, synthetic checks, and reliability observation.
5. Public assistant answer quality, Agentic Hybrid RAG productionization groundwork, and project knowledge coverage.
6. AI Daily and blog content pipeline.
7. Xunqiu, Game/Playlab, and other related project showcase/build/entrypoint gaps.

Within each item, prefer fixes that are locally verifiable and do not require secrets, production console actions, live model validation, account creation, paid service selection, or manual upload.

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
- Do not treat unfinished or gated work as completed. Project pages and status pages must accurately say open, gated, planned, unchecked, degraded, or offline.

### R4a. Related Repository Rules

- Before editing a related repository, read that repository's local rules first: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, README, package scripts, build scripts, or equivalent project docs when present.
- Do not force `blog-semi` implementation style onto related repositories.
- Keep related repository changes tied to public demo readiness, presentation accuracy, build quality, reliability checks, or status evidence.
- Avoid broad refactors, technology-stack replacements, new cloud dependencies, or changes that need private secrets.

### R5. Progress Loop

For each long-running cycle:

1. Inspect active tasks and repo status.
2. Run a discovery sweep across current project surfaces and linked project surfaces.
3. Select the highest-value unblocked child task or create/update a child task for a newly found gap.
4. If the child is planning-only, finish PRD/design/implement. Because the user has authorized this long-running default route, Codex may start the next recommended child after planning artifacts are complete unless the child contains a manual gate or high-risk production change.
5. If in progress, implement, validate, record spec learnings, commit, and push when appropriate.
6. Add newly discovered work to the task tree or candidate backlog.
7. Update `manual-actions.md`.

When work occurs outside `blog-semi`, use that repository's own validation commands and commit policy. `blog-semi` can continue default push to `origin main`; other repositories require their own repository rules and clean safety state before push.

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
- [ ] The parent task records the default-decision policy: Codex follows recommended routes without waiting for routine choices, and only parks hard manual gates.
- [ ] The parent task describes how Codex should actively discover gaps in the current project and related projects.
- [ ] The parent task explicitly allows low-risk, locally verifiable improvements inside related project repositories when they support public presentation, demo readiness, reliability, or build confidence.
- [ ] The parent task identifies what must wait for human action.
- [ ] `git diff --check` passes for planning artifacts.

## Out Of Scope

- This parent task does not itself deploy production services, create cloud resources, rotate keys, upload APKs, or validate real model channels.
- This parent task does not replace child task artifacts.
- This parent task does not authorize implementation of child tasks until those tasks are started through Trellis or the user explicitly instructs direct implementation.
- This parent task does not authorize broad unrelated rewrites of ERP, Legal RAG, Pet, Xunqiu, Game, or Playlab. Related-repository changes must be tied to the cross-project improvement goal.

## Open Questions

None. The user explicitly requested a long-running main task that manages continuing subtask discovery and records manual items for later handling.
