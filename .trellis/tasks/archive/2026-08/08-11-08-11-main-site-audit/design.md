# Main site audit and hardening design

## Architecture And Boundaries

本任务不引入新运行时服务。改动沿现有四层数据流收口：

```text
runtime contracts / completed operations
  -> typed public sources (portfolio, statusTargets, assistant copy)
  -> generated projections (assistant knowledge, site-status)
  -> public docs and regression gates
```

三个子任务彼此可独立提交，但执行顺序固定为：公开事实一致性 -> CSS 性能 -> 验证诊断。原因是后两个子任务需要以已经校正的路由、文案和生成投影作为最终回归基线。

## 1. Public Truth Alignment

### Source Of Truth

- 运行时：`server/src/env.ts`、`server/src/ragOrchestrator.ts`、`server/src/ragPostgresStore.ts`。
- 当前生产规范：`.trellis/spec/backend/quality-guidelines.md` 与 `docs/manual-gates.md` 中已完成的退役记录。
- Qdrant 模块继续保留为显式 `RAG_STORE_PROVIDER=qdrant` 的可选适配器，不删除代码，也不把它写成默认生产路径。

### Projection Flow

1. 更新 `src/data/statusTargets.ts` 和 `src/data/portfolio.ts` 的当前事实。
2. 同步 `src/data/assistant.ts` 中人工队列摘要，删除已完成的 Operator 待办。
3. 更新中英文 README、部署文档、公开助手规范和项目技术档案中的生产拓扑描述。
4. 运行 `assistant:index` 与 `site:status` 重新生成 `server/data/public-knowledge*.json` 和 `public/status/site-status.json`。
5. 用现有 contract checks 验证源数据、生成数据和文档没有再次漂移。

### Compatibility

- 保留 `ragQdrantStore.ts`、Qdrant 环境变量和本地测试/回滚路径。
- 不更改公开 API payload、数据库 schema、Render 服务边界或用户会话。

## 2. CSS Performance Hardening

### Current Shape

- `src/index.css` 全局导入所有样式。
- `src/styles/flow-pages.css` 约 223 KB，混合首页、项目、博客、详情、状态、Studio、AI Daily 与助手样式。
- Vite 因根入口导入形成一个约 247.5 KB 的入口 CSS 文件，即使部分路由组件已经 lazy-load，路由专属 CSS 仍在首屏下载。

### Target Shape

- `src/index.css` 只保留 reset、共享 token、共享导航/背景/首页和所有公开路由确实共用的基础样式。
- 将边界清楚的路由样式拆到对应页面或 lazy route 入口，例如 Studio、AI Daily detail/status detail、公开助手 widget；由组件 import 让 Vite 生成关联 CSS chunk。
- 删除被 scoped 新规则完整覆盖的旧 `.navigation`、旧卡片、重复 `.app` 等规则前，先用源码引用和 UI 回归证明它们不再承担行为。
- 不引入 CSS-in-JS、Tailwind 或新的 UI 框架。

### Performance Contract

- 保留 `scripts/check-build-performance.mjs` 的 245 KB 上限，并新增相对基线要求或等效静态断言，确保入口 CSS 至少降低 10%。
- 性能脚本同时报告入口 CSS、入口 JavaScript和新增路由 CSS chunk，避免仅把膨胀藏到单个动态 chunk。

### Rollback

- 每次拆分一个样式所有权边界并运行 build + targeted UI smoke；出现 route FOUC、主题错误或溢出时，回退该次 import/selector 移动，不影响其他切片。

## 3. Verification Diagnostics

### UI Check

- 从现有 `scripts/check-ui.mjs` 抽取命名检查组和共享浏览器生命周期。
- 提供 `check:ui:smoke`：核心公开路由、320/390px 溢出、导航、详情阅读、背景非空和公开助手基本 shell。
- `check:ui` 保持发布前完整矩阵；每组开始和结束输出低噪声进度与耗时。
- fixture 仍为本地确定性数据，不访问模型、搜索、embedding 或生产 API。

### Public Link Check

- 在 `scripts/check-public-links.ts` 中从 `Error`/`cause` 安全提取 allowlist 错误类别，例如 `dns`、`tls`、`timeout`、`connection`、`http_status`、`unknown_network`。
- 控制台可以显示 URL 供本地维护者定位；写入公开状态 JSON 时继续只保留数量、类别和时间，不保存 URL 或底层证书细节。
- HTTP 403、404、5xx 继续失败；不能为了让门禁绿色而降级成 warning。

### Environment Distinction

- 一次本机网络失败不能自动改写项目静态状态为 offline。
- 只有显式 `--write-status` 或对应环境开关才写公开快照。
- 报告必须说明“检查器环境失败”和“远端返回 HTTP 状态”的区别，供后续人工在 Cloudflare/Render 或另一网络复核。

## Risks

- CSS 选择器跨路由共享，机械拆分可能导致 FOUC 或主题遗漏；通过小批移动和完整 UI 回归控制。
- README、规范和生成知识存在多份投影，漏改会继续产生矛盾；通过固定 grep/contract 断言和生成器校验控制。
- Node/undici 在不同平台暴露的 `cause.code` 不完全一致；错误分类必须有稳定 fallback，不能依赖完整错误字符串。
- 全量 UI 套件耗时较长；拆分时不能减少已有覆盖，只能新增快速入口和进度。
