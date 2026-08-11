# Main site audit and hardening implementation plan

## Execution Order

### 1. Public truth alignment

- [ ] 读取当前 RAG 运行时、生产规范和已完成 Operator 退役记录，建立一份允许出现 `Qdrant` 的上下文清单。
- [ ] 更新 `src/data/statusTargets.ts`、`src/data/portfolio.ts`、`src/data/assistant.ts` 的当前生产事实和人工队列。
- [ ] 同步 `README.md`、`README.zh-CN.md`、`docs/deployment.md`、`docs/project-notes/public-assistant.md` 与 `.trellis/spec/backend/public-research-assistant.md`。
- [ ] 更新或扩展部署/状态 contract，阻止生产说明再次回退到 Qdrant 或未完成 Operator 退役。
- [ ] 运行生成器并审查 `server/data/public-knowledge*.json`、`public/status/site-status.json` 差异。
- [ ] 确认不触碰用户已有 `public/status/blog-semi-synthetic.json` 改动。

Validation:

```powershell
npm.cmd run assistant:index
npm.cmd run assistant:kg-check
npm.cmd run site:status
npm.cmd run status:contract
npm.cmd run docs:deployment-check
npm.cmd run docs:manual-gates-check
npm.cmd run docs:project-notes-check
npm.cmd run lint
npm.cmd run build
git diff --check
```

### 2. CSS performance hardening

- [ ] 按 selector 引用、route ownership 和 cascade 依赖标记 `src/index.css` 与 `src/styles/flow-pages.css` 的共享/路由专属/废弃规则。
- [ ] 先删除已经被 scoped 新规则完整覆盖的旧样式和 `App.css` 重复规则。
- [ ] 将 Studio、AI Daily、详情/状态、公开助手等明确属于 lazy route/component 的 CSS 移入对应模块 import。
- [ ] 扩展性能报告，使入口与路由 CSS chunk 均可见，并保留原预算。
- [ ] 在每个拆分批次后运行 build、performance 和 targeted smoke；完成后运行全量 UI 回归。

Validation:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run performance:check
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

### 3. Verification diagnostics

- [ ] 为 UI 检查定义命名检查组、进度/耗时输出和可独立执行的 smoke 参数或脚本。
- [ ] 保持现有完整覆盖；确认 smoke 不调用外部 API，full 仍覆盖 17 条路由及关键 320/390/430px 视口。
- [ ] 为 public-link fetch 错误增加低敏、跨平台的固定类别映射和 fixture contract。
- [ ] 验证默认运行不写状态；验证显式写入只包含低敏摘要。
- [ ] 更新 package scripts 与相关 frontend/project-showcase spec。

Validation:

```powershell
npm.cmd run check:ui:smoke
npm.cmd run check:ui
npm.cmd run public-links:check
npm.cmd run status:contract
npm.cmd run lint
npm.cmd run build
git diff --check
```

## Final Parent Gate

```powershell
npm.cmd run verify
git status --short
git diff --check
```

`verify` 不得触发真实模型、搜索、embedding 或生产同步。若外部链接仍失败，最终报告按错误类别和项目所有者记录，不把失败伪装成通过，也不阻塞本地可验证的主站交付。

## Rollback Points

- 事实同步：typed source 与 generated projection 同一提交；若生成器暴露遗漏，撤回该组源数据与投影而不是手改 JSON。
- CSS：按路由所有权小批提交；单个路由回归失败时仅恢复对应 CSS import/selector 移动。
- 验证脚本：保留原 `check:ui` 全量入口语义；新 smoke 或 reporter 可独立回退，不影响生产运行时。

## Pre-Start Review

- [ ] 用户确认按三个子任务顺序实施。
- [ ] 父任务和三个子任务均无占位内容或未解决阻塞问题。
- [ ] `task.py start` 只在规划审阅通过后执行；inline 模式不需要填充 JSONL manifest。
