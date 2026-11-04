# B1 事实核验与实施记录

初次事实核验：2026-09-16；本地实施与续核：2026-09-24；页面回归及收口：2026-09-25（Asia/Shanghai）。用户审阅规划后同意推进，并补充“不能仅依靠文档来判定项目状态”。各段明确区分历史观察与本轮实际执行。

## 2026-09-16 已执行的源项目核验

| 对象 | 实际检查 | 结果与边界 |
| --- | --- | --- |
| Anchor 公开 APK | 只读 GitHub Release API：`repos/Drew-Z/anchor/releases/tags/v1.0.0` | 公开、非 draft、非 prerelease；2026-09-15 发布；APK 26,404,187 bytes，API digest 为 `3371870ee2691f0aa3496e2e6fb1153a6c028b840bfef33c924dbea8cf96d475`，与本地实际文件一致。不能再笼统写“没有公开 APK”。 |
| Anchor 当前 readiness | 使用现有 Dart runtime/package config 直接执行 `tool/private_alpha_readiness.dart --evidence build/validation/private-alpha-readiness.json --format json` | CLI 退出 2、HOLD。6 个阻塞码见下；没有模型调用、设备操作或证据写入。CLI 输出只包含状态与阻塞码。 |
| Pet release | 读取实际 APK/AAB、重新计算 SHA-256、校验 ZIP CRC 与 manifest 结构，并读取相邻 `output-metadata.json` | APK/AAB 都是有效 Android 归档；metadata 为 release，版本 0.1.0 / code 1。未验签、未安装、未验收完整生成或批准分发。 |
| Pet 构建边界 | 当前 `apps/android-community/app/build.gradle:12`、`:23`、`:39`、`:60` | 代码实际通过环境注入 release 签名，并将演示令牌配置写入 BuildConfig；因此不能仅根据文件名或 release variant 推断其适合公开分发。未读取或输出凭据值。 |
| Roleplay 原始本地启动 | 在源目录外执行只读探针，阻止外部请求/写入，不修改源码 | 原样导入失败：源码依赖部署环境的绝对 `node-fetch` 路径，本机不存在。此结果保留为本地可复现性限制，不将替换依赖后的结果当成原样启动成功。 |

2026-09-16 readiness 的实际阻塞码（2026-09-24 重跑一致）：

- `automated_gate_evidence_stale`
- `android_build_bytes_mismatch`
- `android_build_sha256_mismatch`
- `release_day_acceptance_primary_stale`
- `release_day_acceptance_fallback_stale`
- `physical_device_evidence_stale`

源 `CURRENT_STATE.md:20` 的 GO、源 AGENTS 的旧阻塞列表及发布计划只列 2 个问题，都不能替代这次实际运行。公开发布事实和验收证据状态是两个维度；主站不修改源项目的判定或发布物。

## 帆灵文章勘误的证据包

- writing mode：`Codex-only scaffold/review`；model channel：`none`。
- 栏目/读者：既有 `project-notes` 文章，面向理解 App、生成、人审与发布关系的工程读者。
- 范围：仅给既有 debug-only 观测加日期，并补 2026-09-16 release 归档核验及仍未验收的边界；不改文章可见性、原发布日期、标题、标签或发布新文章。
- 已读证据：现有项目数据、状态 synthetic、APK/AAB 和 output metadata、当前 Gradle 构建逻辑、release 操作说明。
- 可公开事实：本地已有 release APK/AAB；构建存在不代表签名/产品流程/公开分发完成。
- 禁止内容：任何凭据值、签名材料、私有接口、设备数据、完整生成提示词和内部产物路径。
- 重叠控制：文章保留工程过程解释；稳定的当前能力和完整状态放在项目详情。

## 2026-09-24 源项目续核

- 帆灵：重新计算 APK/AAB 大小与 SHA-256，均与上表一致。9 月 16 日的 CRC/归档结构核验保留其原日期；本轮没有验签、安装、完整生成流程或分发批准。
- 锚学：从现有 Flutter SDK 定位 Dart runtime，直接运行 `private_alpha_readiness.dart`，使用现有 package config 与 evidence；退出 2、HOLD，6 个阻塞码不变。只输出状态、退出码与阻塞码，未调用模型、设备或写证据。本轮未重跑公开 Release API，其发布日是 9 月 15 日，API 观察日是 9 月 16 日。
- 锚学实现：读取 `lib/services/agent/learning_agent_runtime.dart:200` 的恢复前 readiness/用户决策检查、`:324` 的结束会话分支；`lib/features/agent/agent_home_screen.dart:629` 的决策界面；`lib/features/agent/programming_exercise_screen.dart:193` 的来源完整性、确认核验与正式作答状态。仅证明实现存在，未把历史测试或代码阅读写成运行通过。
- 收口时源版本：Pet `bd22174b9f2763283a612b332d2e9ea0259c754e`（工作树干净）；Anchor `54b8e013f46b3c2c698932fd51d13bc46656dd55`（3 项既有未提交路径，未操作）；Roleplay 检查目录无可用 Git HEAD，沿用实际源码与 9 月 15 日入口观察。

## 实施结果

| 差异 | 处理与边界 |
| --- | --- |
| F01 sitemap 遗漏 | 从源生成 42 个 URL，补齐 `/projects/roleplay-demo` 和 `/status/roleplay-demo`。新增只读 `sitemap:check`，接入 `verify` 与 Site Quality CI。旧 XML 的两个缺失路由已先复现失败。 |
| F02 技术栈 | Roleplay 改为原生 HTML/CSS/JavaScript + Node.js；不再使用 React-like 表述。 |
| F03 health 语义 | 项目、入口证据、状态摘要和助手上下文限定为配置/角色数量等低敏响应，注明 2026-09-15，不推断模型质量或长期健康。 |
| F04 正文截图 | 绑定已有真实角色库截图及 WebP；新增原生架构 SVG，渲染检查后移除拥挤的箭头标签。收紧截图缺图检查，保留合法文字结构块。 |
| F05 debug-only 过时 | 详情、展示页、状态说明、助手和门禁使用 release 归档事实；文章保留 7 月 9 日历史观察并追加有日期勘误。原发布日期 `2026-06-14`、标题、标签、可见性不变。公开下载仍关闭，未核验不表述为源项目未完成。 |
| F06 APK 与 readiness 冲突 | 分开记录 9 月 15 日公开发布、9 月 16 日 API/摘要观察、9 月 24 日 HOLD 重跑；补恢复、结束会话和来源核验的源码事实，保留 Web Demo 入口。 |

`assistant:index` 生成 32 docs / 67 chunks / 177 entities / 254 relations；两份知识 JSON 与 sitemap 均通过现有生成器更新，未手改生成内容。新增长摘要仅在帆灵展示页 `code` 上使用 `overflow-wrap: anywhere`。

`public/status/*` 保持原样：状态页 `mergeSiteStatusPayload` 用当前源码覆盖 summary/gates/nextActions，但 checks 仍保留历史 snapshot evidence。帆灵当前说明已明确 debug-only 的历史日期；快照刷新属于后续获准发布步骤，不把未刷新快照伪装为本轮结果。

## 验证结果（2026-09-24 至 25）

| 检查 | 实际结果 |
| --- | --- |
| `project-registry:check` | 通过：13 身份、10 发布记录；9 CTA cases、41 link sets。 |
| `project-details:check` | 通过：16 项目；Roleplay 9 sections / 4 visuals，正文有截图和架构图。 |
| 截图负例 | 旧 checker 在内存中删掉 Roleplay screenshot.image 仍退出 0；修复后 `undefined`、空串、空白串均退出 1，错误为 `screenshot is missing an image`。没有修改工作树 fixture。 |
| `sitemap:check` | 通过：42 URL，16 project / 9 status / 11 blog，另有 6 个静态路由。旧 XML 缺两个 Roleplay 路由时确实失败。 |
| `projects:discovery-check` / `public-links:projection-check` | 通过：6 groups、46 visible targets。未执行公网巡检或生产变更。 |
| `status:contract` / `docs:manual-gates-check` | 通过：9 reliability projects、8 targets、36 checks；保留原合同要求的 `Flutter Private Alpha` 与 `正式 release` 术语。 |
| `assistant:kg-check` | 通过：32 docs / 67 chunks / 177 entities / 254 relations、26 路由建议案例。 |
| `blog:check` / `blog:project-notes-check` / `blog:knowledge-check` | 通过；帆灵 11 sections / 2,681 section chars。没有调用模型或重发文章。 |
| `lint` / `build` / `git diff --check` | 均通过；构建生成本地 dist。 |
| 完整 `check:ui` | 46 groups、0 failed，17 routes × 2 个基础 viewport，另含主题/语言/导航/助手矩阵；总计 2,476,481 ms。助手专项与阅读链接检查使用 fixture，报告 modelCalls=0。 |
| `check:ui:smoke` | 正确设置 `UI_CHECK_BASE=http://127.0.0.1:4179` 后 7 routes × 3 viewports、21 groups 全通过。首次漏设 base 导致 5174 connection refused；更正调用参数后通过，未为此改代码。 |
| B1 定向页面检查 | 7 条 SPA 路由 × 4 宽度（1440/320/390/430）× 3 主题 × 2 语言，共 168 个 reduced-motion 配置；另 4 个帆灵静态展示页宽度、6 个项目 normal-motion 配置，共 178 配置。图片 decode/alt、日期与边界文案、Demo/下载门禁、Tab 焦点与横向溢出均已核对。无外部请求、无模型请求。 |
| Roleplay CTA 复核 | 第一版临时脚本误要求 online 项目总有状态按钮，产生 26 个断言失败。按现有公共入口合同修正为在线展示角色库入口，26 配置重跑通过；另外在内存中验证 zh/en 的 `unchecked` fallback 都指向 `/status/roleplay-demo`。未为满足错误断言修改产品。 |
| 帆灵 local synthetic | `--base http://127.0.0.1:4179 --strict` 返回 online，4/4 图片通过；指定实际 Android outputs，只读检查，未传 `--write-status`。 |
| 视觉复核 | 已实际查看 1600×900 架构 SVG 渲染、390px 锚学质量区和帆灵长摘要区；长摘要可换行。三主题/语言仅适用于主站 SPA，帆灵独立展示页仍为自身静态中文样式。 |

浏览器预览由工具管理的 Vite 进程运行，仅绑定 loopback 4179 并启用 `--strictPort`（PID 27900）。后台 `Start-Process` 方案被自动审批拒绝，改为前台可追踪进程成功。页面检查使用本地网络守卫；B1 定向检查对 `/api/health` 使用 fixture，其他 API 请求直接阻止。没有 `/v1/sync/public`、真实模型、生产数据库、Feed/Cron 或部署行为。

## 工作区、恢复点与交付边界

- 正式改动：三个项目的数据/状态说明、帆灵勘误与展示页、公开审计/门禁、截图和 sitemap 检查、对应 CI/verify 入口、知识与 sitemap 生成物、规范与本任务记录。`portfolio.ts` 与本批基线按项目分段比较，只有 Roleplay、Pet、Anchor 三段改变。
- 既有 Roleplay identity/hero/interface/siteLinks 和 checker 接入保留；既有状态快照、未知目录 ` .trellis/`、`undefined/`、`public/biau-port-icon.svg`、旧任务和历史 worktree 均未清理。
- 恢复组：`D:/Agent/codex/backups/tasks/20260924T122253.742Z-project-portfolio-refresh-b1/manifest.json`。已有未提交文件保留校验过的实体基线；干净受跟踪检查脚本/规范使用完整 HEAD 作为恢复点。task.json 的备份在既有 start 操作之后创建，不宣称覆盖激活前字节。
- 9 个 `public/status/*` 文件及 2 个主题样式共 11 个受保护文件在收口前 SHA-256 均与本轮续作基线一致。
- 基础 HEAD 与本地远端跟踪引用 `origin/main` 均为 `747174b6d1957c2e23fb375da8fd2a09015e120f`；本轮未 fetch，不把它说成最新公网分支或部署状态。
- 当前仅 B1 完成。根据 PRD 的本地交付约束，不提交、不推送、不部署，不调用会自动提交的任务归档/日志步骤；B2—B4、生产状态同步及后续发布继续待办。
- 收尾：核对本轮启动命令后停止 PID 27900，4179 无监听；删除本轮系统临时目录中的 10 个脚本/JSON/渲染截图及空目录，摘要已写入本记录。未删除历史文件、既有构建缓存或未知目录；恢复组继续保留。
