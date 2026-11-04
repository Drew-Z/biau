# B2 核验记录：泊语、律航、商舱、寻球

## 范围与时间

- 用户于 2026-09-25 同意 B2，2026-10-04 在新会话要求继续原会话 `01a0952f-555f-7c70-a491-ba1840e626a3`。本批复用既有任务，不开启 B3/B4。
- 源码核对日期：2026-10-04（Asia/Shanghai）；主站本地检查跨日，于 2026-10-05 收口。源码存在、测试定义、历史公开观察和本轮主站检查分别记录。
- 仅主站本地修改和验证：不自动提交/推送/部署，不改写 `public/status/*`，不登录生产、不调用模型、不写外部业务、不发布 APK。全部源项目只读。
- 主站基线：`747174b6d1957c2e23fb375da8fd2a09015e120f`，开始时 main 与本地 origin/main 相同，41 项既有未提交路径；未 fetch，不能据此确认线上部署版本。

## 源版本与代码锚点

以下 HEAD、日期、工作树数量于本轮重新读取。泊语有未提交内容，结论覆盖 HEAD 加工作树；其他 Git 源目录干净。Android 目录不在 Git 仓库内，不能虚构提交版本。

| 源 | 本地只读目录 | HEAD / 版本 | 提交日期 | 脏路径 |
| --- | --- | --- | --- | --- |
| 泊语 | `D:/workspace4Cursor/chatus` | `a7f414804558b02f8cce839cc57b1df92c65f789` + 工作树 | 2026-08-10 | 37 |
| 律航 | `D:/workspace4Cursor/legal-rag` | `fd34e11c9bebc3abad2cbdf2535ea2b3735b016d` | 2026-07-09 | 0 |
| 商舱 | `D:/workspace4Cursor/erp` | `e7179e004525d9da4c924d00e66e6a5d33092797` | 2026-07-21 | 0 |
| 寻球展示站 | `D:/workspace4Codex/xunqiu/xunqiu-showcase-site` | `d8d4ae625748e2fc7302222cd520a6ba10113ed7` | 2026-07-14 | 0 |
| 寻球后端 | `D:/workspace4Codex/xunqiu-backend-modern` | `94b8f18ba11f383a8e8bad191d8a503555f96bb1` | 2026-07-09 | 0 |
| 寻球 Android | `D:/workspace4Codex/xunqiu/xunqiu-android64` | 本地源码，`0.1.0 / code 1` | 不适用 | 非 Git 目录 |

关键取证文件的 SHA-256（2026-10-04 本地读取，不是 release 产物摘要）：

| 源文件（相对上述源目录） | SHA-256 |
| --- | --- |
| 泊语 `src/services/capability-registry.ts` | `f7f06546fdb750991e03ce55dcd587713eb7394a2f29384731dc55373f9db601` |
| 泊语 `src/worker.ts` | `ec17a2c67289f153921d807aee37334e17f4897a26c644372970c9747f3033ae` |
| 商舱 `apps/api/src/services/jobExecutor.ts` | `4a20ace9b4b8e18008f0d882b718988f51bcbcfe343eeb6ff59c472999a6c605` |
| 律航 `apps/api/src/review/review-service.ts` | `c6dab37f03b289a4ef9630fca2a8edaea370aea5061c4514e68d717fa6e4bdfe` |
| 寻球后端 `src/main/java/com/playlab/xunqiu/backend/service/FileStorageService.java` | `45f8c835ebb29a7cf55c426be55cf3a48150f29985f4c6231099c19befe318e1` |
| 寻球 Android `app/build.gradle` | `279e364ed67d95bdc3446726b159c81690a51a03f2fad4435b5af8960a49f856` |
| 寻球 Android `app/src/main/java/com/playlab/xunqiu64/net/ApiClient.java` | `528a594c6f54daecf09c5b3ccb8a251d2048bb2d8c9c8fe0775985ea151fce48` |

### 泊语：能力进入执行路径，不能从 UI 推断授权

- `src/services/capability-registry.ts:17` 的 `getPublicCapabilities` 同时过滤工具启用、成员 allowedTools 和执行器可用；Skill 的 toolIds 也裁剪到公开工具集合。
- 同文件 `:74` 的 `buildCapabilityToolDefinitions` 再次取 Skill 引用工具与成员授权的交集；`:102` 检查内置/MCP 执行器；`:107` 对 MCP write/destructive 强制 always 确认。
- `allowedSkills` 未定义时代表不按该集合限制，空数组才是空集（`:136`）；因此公开文案不宣称所有 Skill 默认拒绝。工具仍要求明确成员分配。
- `src/worker.ts:5341` 的 `validateAgentConversationSettings` 核对线路和 Skill；访客固定 manual + 空 Skill，成员支持 automatic/manual。`:5395` 的修复路径重新过滤撤销能力。
- `src/worker.ts:7328` 和 `:7342` 在实际 Agent 回合构造 Skill 与工具定义；`:9483` 执行工具确认。`src/agent/team-agent.ts:2543` 的 onChatMessage 先核对会话身份，`:2562` 使用持久化消息路径。这里不新增对完整流恢复效果的运行承诺。
- 既有截图是明确标记的视觉夹具，未生成虚假生产截图；本轮不执行成员/访客登录、源测试或模型请求。

### 律航：材料、引用、审查与质量分别有接线

- `apps/api/src/app.ts:92` 注册 `/api` 认证中间件；`:94` 质量报告、`:186` / `:220` 导入、`:305` RAG 问答、`:315` 合同审查路由。
- `apps/api/src/ingestion/ingestion-routes.ts:44` 的 import-text 入队/导入路径，与 `documents/ingestion-service.ts` 文档处理衔接；存在代码不表示本轮执行过导入。
- `apps/api/src/rag/rag-service.ts:85` 的 answerQuestion 合并向量与关键词候选，过滤/rerank 后判断可回答性，`:98` 从回答片段生成引用，`:106` 返回 diagnostics。
- `apps/api/src/review/review-service.ts:93` 的 reviewContractWithModel 先取规则风险，再合并模型解释，异常返回 fallback；`:146` 验证风险结构。引用与规则结果仍需人工复核。
- `apps/api/src/quality/quality-service.ts:99` 明确 mock 适合本地演示，不代表真实模型效果。
- `public/status/legal-rag-synthetic.json.checkedAt` 为 `2026-07-06T18:59:32.303Z`；历史 health 不是今天的登录/业务验收。本轮没有重跑源测试、seed、上传、认证或模型。

### 商舱：纠正写入默认值和 F07 日期

- `apps/api/src/routes/auth.ts:14` 的 bootstrap 仅在缺 Owner 时允许；`:38` 注册按是否已有 Owner 分配 owner/operator；`:108` 查询现有 Owner。`lib/auth.ts:46` 的 requireRole 保留 Owner 权限特例。
- `apps/api/src/services/jobExecutor.ts:170` 的 executeJob：`OZON_ADAPTER || "real"`；`:172` 的允许条件为 real 且 `OZON_ENABLE_REAL_WRITE !== "false"`。因此“必须显式开启才真实写入”错误。
- 该函数 `:174` 在非 real/显式关闭时抛错，并非 mock 成功模拟；`:178`—`:185` 检查店铺、凭据和目标后调用外部写入。排队或后台执行不能等同于只读/模拟。
- `public/status/erp-synthetic.json.checkedAt` 为 `2026-07-06T18:42:22.581Z`；8 月 18 日停机来自 `docs/project-publication-audit.md` 的有日期浏览器观察。两者均不被延长为当前结论。
- publication 仅更新 unavailableReason 的日期与待复核语义，保留 unchecked/login-gated/入口 URL；未访问线上或执行任何店铺写入。

### 寻球：三层分开，成功结构不代表成功业务

- 展示站 `index.html:847` 的 release 区明确 APK 未开放、禁用下载；这是静态源码事实，不是本轮线上资产核验。
- 后端 `api/AccountController.java:28` 的短信、第三方账号、注册等入口返回未接入提示；`:33` 社交注册为 stub。
- 后端 `api/FallbackController.java:20` 对未匹配旧接口返回 safeEmpty，不应计为完整业务通过。
- 后端 `service/FileStorageService.java:36` 调用上传后返回 StoredFile；`:43` 在 R2 必要配置缺失时直接 return，仍可能产生占位 URL。该 URL 不证明对象已存储或可播放。
- Android `app/build.gradle:33`—`:34` 确认版本；`net/ApiClient.java:29` 登录接线、`:647`—`:669` 视频 multipart 上传接线，均不等于本轮真机执行。
- `public/status/xunqiu-synthetic.json.checkedAt` 为 `2026-07-14T14:02:11.220Z`，apkGate 为历史 `stage-apk-found`。本轮不构建、验签、安装、上传，不开放下载。

## 修改与投影

- `src/data/portfolio.ts`：四项目新增有日期的源码范围；泊语补 Skill/工具/MCP 与访客边界；律航收紧当前部署承诺与演示指引；商舱纠正 real 默认值；寻球明确 stub/媒体占位。
- `src/data/hero.ts`：泊语、商舱、寻球摘要对齐，保留顺序、数量和链接；律航原摘要无需重复改写。
- `src/data/projectPublication.ts`：仅 ERP 旧停机说明加入 2026-08-18，所有入口政策字段不变。
- `src/data/statusTargets.ts`、两份审计/门禁文档同步。状态摘要、gates、nextActions 由现有 merge 覆盖，历史 checks 保留原快照。
- 从源码重新生成两份 `server/data/public-knowledge*.json`；路由未变化，sitemap 只读检查，无需重新生成。
- 复核关联文章：本批发现的错误“真实写入必须显式开启”不在 ERP 历史文章中；已有文章保留日期与范围，不作无依据重发。

## 本地主站验证

| 检查 | 本轮结果 |
| --- | --- |
| assistant:index | 32 documents、70 chunks、178 entities、255 relations |
| project-registry:check | 13 身份、10 publication；入口合同通过 |
| project-details:check | 16 项目通过，四项目原素材保持可用 |
| public-links:projection-check | 46 个可见目标投影通过；不是公网请求 |
| projects:discovery-check | 6 组通过 |
| assistant:kg-check | 通过，含 26 条路由建议 |
| status:contract | 9 项目、8 目标、36 checks 通过 |
| docs:manual-gates-check | 首次缺“生产注册策略”术语；补全 ERP 门禁后通过，未削弱 checker |
| sitemap:check | 42 URL，16 项目、9 状态、11 文章及静态路由通过 |
| lint | 通过 |
| build | 通过，TypeScript 与 Vite 构建完成 |
| check:ui:smoke | 21 组、7 路由 × 3 视口通过 |
| B2 定向 UI | 192 组通过：4 项目详情/状态 × 4 宽度 × 3 主题 × 2 语言；图片 decode、文本/页面无横向溢出、日期说明、键盘进入状态页和门禁文案通过；77 个本地 health fixture 请求、0 模型调用、0 页面/外网错误 |
| B2 入口补充检查 | 4 项目 quick links 与 visual source links 均未暴露被禁用的 externalHref |
| 截图复核 | 人工查看 8 张代表性截图：四项目各 320/nature/zh 与 1440/stellar/en，新增段落可读；素材与 authored 中文未被语言切换改写 |
| 完整 check:ui | 通过：46 组、0 失败、17 路由、2 个基础视口及各专项矩阵；2,597,820ms，约 43 分 18 秒。命令退出 0，真实模型调用为 0 |
| git diff --check | 通过；仅既有换行转换提示 |

## 恢复点与保护

- 复用 `D:/Agent/codex/backups/tasks/20260924T122253.742Z-project-portfolio-refresh-b1/manifest.json` 的 `B2-start` 阶段；原 13 项恢复登记及全部实体 SHA-256 已重新校验，规范补充前新增第 14 项阶段恢复点。
- 修改前再次确认八个业务/文档/生成文件与 B2 基线摘要一致；另记录本轮恢复时 1651 个工作区文件摘要，用于排除本批之外的增量。
- 临时文件继续使用已登记的 `C:/Users/zhang/AppData/Local/Temp/blog-semi-b2-85q3pjmm`；完成时逐项核对并清理。
- 最终摘要对照确认：13 个既有文件有本批预期修改，另新增本记录；其他已登记文件均保持原字节，9 个 `public/status/*`、sitemap、B1 专属文件与主题样式未改动。B1、其他任务、历史 worktrees、前导空格目录、`undefined/` 和 `public/biau-port-icon.svg` 全部保留。
- 运行前后结构化投影对照已确认：非 B2 的 project、hero、reliability 记录及所有数组顺序保持一致；全部 publication 字段仅 ERP unavailableReason 变化，availability/access/URL/verifiedAt 等均未变。
- `.trellis/spec/frontend/project-showcase-integration.md` 补执行分支、默认值与占位结果的取证合同和错误案例，避免再次把 queue 当成 mock 或 URL 当成上传证据。

## 交付状态

- B2 于 2026-10-05 本地验收完成，AC10—AC12 已满足；B3/B4 未开始，任务保持 `in_progress`，没有提交、推送、部署、归档或生产同步。
- 本轮 Vite preview（PID 29560，loopback 4179）已停止，并确认端口不再监听。
- 13 个本轮临时文件（8 张核验截图、2 份基线、定向脚本、结果 JSON、完整 UI 日志）在结果落档后清理，空临时目录一并移除；集中恢复组保留。
