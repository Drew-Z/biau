# Main site audit and hardening

## Goal

收口 BIAU Port 主站当前能够由仓库证据复现的质量问题，使公开内容、生产架构说明、首屏性能和发布前验证重新一致、可维护、可诊断；不重复改造已经通过回归的移动端布局、背景动画或公开助手交互。

## User Value

- 访客看到的项目、状态和助手知识不再描述已经退役的架构或待办。
- 主站继续保留现有视觉和交互效果，同时恢复明确的首屏性能余量。
- 维护者能快速区分页面回归、外部服务故障和本机网络/TLS 故障，不再只得到长时间无输出的全量检查或笼统的 `fetch failed`。

## Confirmed Facts

1. `npm.cmd run lint` 和 `npm.cmd run build` 于 2026-08-11 通过；生产构建的入口 JavaScript 为 376,640 bytes，低于现有 430,000 bytes 预算。
2. `npm.cmd run check:ui` 覆盖 17 条路由和 desktop/mobile 两类视口并通过，但耗时 341.4 秒；第一次执行因 180 秒命令上限中断，执行期间没有路由级进度输出。
3. `npm.cmd run performance:check` 失败：入口 CSS 为 247,506 bytes，超过 `scripts/check-build-performance.mjs:25` 定义的 245,000 bytes 预算。`src/styles/flow-pages.css` 单文件约 223 KB，`src/index.css` 仍混有旧导航、卡片和页面通用规则。
4. `npm.cmd run blog:check`、`project-details:check`、`status:contract`、`analytics:check`、`assistant:kg-check` 和 `docs:deployment-check` 均通过。
5. `npm.cmd run public-links:check` 检查 43 条公开链接，仅 4 条通过；ERP 入口明确返回 HTTP 403，其余 38 条为未分类的 `fetch failed`。这些结果不能在缺少错误原因时全部归为站点代码故障，也不能被白名单忽略。
6. 当前生产存储合同是 Supabase pgvector：`server/src/ragPostgresStore.ts:38-43` 仅在 `RAG_STORE_PROVIDER=supabase` 且存在服务端数据库 URL 时启用，`.trellis/spec/backend/quality-guidelines.md:88` 也明确 4096 维 pgvector 精确余弦检索是生产形态。
7. 多个公开投影仍描述旧 Qdrant/Operator 现状：
   - `src/data/statusTargets.ts:170-176` 把 RAG health 写成 `store=qdrant` 且标记在线；
   - `src/data/portfolio.ts:1286-1291` 仍把 Qdrant alias 写成当前存储，并称旧 Operator 尚待退役；
   - `README.md:78-107`、`README.zh-CN.md:25-40`、`docs/deployment.md:9-29` 与 `.trellis/spec/backend/public-research-assistant.md:27-32` 仍以 Qdrant 为生产路径；
   - `public/status/site-status.json:190-195` 是上述旧状态的生成投影。
8. `public/status/blog-semi-synthetic.json` 当前有用户生成的未提交改动，记录 2026-08-11 的外部请求失败。本任务不得覆盖或回滚该文件，除非用户另行批准重新生成。

## Requirements

### R1. 公开事实与运行合同一致

- 以当前服务端运行合同和已完成退役记录为事实源，统一 README、部署文档、项目详情、状态源数据、助手知识源和相关 Trellis 规范。
- Qdrant 只能描述为保留的可选/回滚适配器，不能再描述为当前生产存储或已验证在线的生产事实。
- 已完成的 Operator/internal-RAG 退役不得继续出现在“待处理人工任务”或“当前边界”中。
- 重新生成并校验由上述 typed data 驱动的公开知识和状态投影。

### R2. 恢复首屏 CSS 性能余量

- 不提高现有 245,000 bytes 预算来通过检查。
- 清理已被新设计系统替代的重复规则，并将明确属于懒加载路由的样式移出入口 CSS；保留主题、背景动画、首页、项目、博客、状态、AI Daily、Studio 和公开助手行为。
- 入口 CSS 至少比 247,506 bytes 基线降低 10%，为后续迭代留下余量。
- 路由样式拆分后仍需对所有公开路由和 Studio 路由执行桌面/移动端回归，不能把溢出或闪烁转移到动态 CSS chunk。

### R3. 验证流程可诊断

- 将 UI 检查拆出可快速执行的核心 smoke 与完整回归入口，同时保留一个发布前全量命令。
- 全量 UI 检查输出当前阶段/路由/视口进度，失败时能定位到检查组，而不是长时间静默。
- 外链检查保留 HTTP 失败为失败，但把 DNS、TLS/证书、连接、超时、HTTP 状态和未知网络错误归为固定低敏类别。
- 状态写入仍须显式 opt-in；本地审计默认不得覆盖生产状态快照。

### R4. 安全与边界

- 不执行模型测活、真实 completion、生产同步、部署或数据库操作。
- 不写入或回显 token、数据库 URL、模型 endpoint、Qdrant/Supabase key 或真实账号。
- 不修改关联项目主体；外链指向的 ERP、Legal RAG、Pet、Xunqiu、Playlab 或 Chatus 问题只记录低敏证据和人工/独立项目待办。
- 保留 `public/status/blog-semi-synthetic.json` 的现有用户改动。

## Deliverables

1. `08-11-main-site-public-truth`：公开架构事实、状态源、助手知识和生成投影一致性。
2. `08-11-main-site-css-performance`：入口 CSS 预算与路由样式所有权收口。
3. `08-11-main-site-verification-diagnostics`：UI 回归分层、进度输出和外链错误分类。

## Acceptance Criteria

- [ ] 三个子任务分别通过自己的验收，并在父任务中留下结果摘要。
- [ ] `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run performance:check` 和 `npm.cmd run check:ui` 全部通过。
- [ ] 入口 CSS 不超过基线的 90%（222,755 bytes），且不通过提高预算实现。
- [ ] `npm.cmd run assistant:index` 后 `assistant:kg-check` 通过，公开知识不再把 Qdrant/旧 Operator 描述为当前生产事实。
- [ ] `npm.cmd run site:status` 后 `status:contract` 与 `docs:deployment-check` 通过，生成状态与 Supabase pgvector 生产合同一致。
- [ ] `npm.cmd run public-links:check` 对每个失败输出稳定的低敏错误类别；HTTP 403 仍保持失败。
- [ ] 核心 UI smoke 可独立执行并输出进度；全量 UI 回归仍覆盖现有 17 条路由及 320/390/430px 关键移动宽度。
- [ ] `git diff --check` 通过，且差异不包含 `public/status/blog-semi-synthetic.json` 的覆盖或回滚。

## Out Of Scope

- 重新设计已经通过回归的页面视觉、移动导航、首页手势、背景动画或公开助手产品功能。
- 删除 Qdrant 适配器、迁移生产数据库、变更 Render/Cloudflare/Supabase 配置。
- 修复关联项目的生产 403、域名、证书或可用性；这些问题需要在对应项目或平台边界中处理。
- 模型、搜索、embedding 或 reranker 的真实调用验收。
