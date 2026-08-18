# 泊岸产品可用性、项目准入与统一 IP 审计

## Goal

把 BIAU Port / 泊岸从“功能和案例已经很多的展示站”推进为公开承诺与真实能力一致的产品站：为公开助手和 AI 日报建立产品级验收门槛，治理现有项目的不可用入口，建立新项目准入流程，并落地统一但不机械同名的中英文 IP 体系。

## User Value

- 访客能可靠使用公开助手，并理解回答来源、降级状态和恢复动作。
- AI 日报只有在真实来源、审核与发布链路通过后才对外宣称可用。
- 项目案例、截图和技术复盘可以长期保留，但不可用入口不会继续误导访客。
- 新项目可以先以预告进入站点，达到公开条件后再开放直接体验。
- 每个产品拥有独立、可辨识的名字，同时明确归属于泊岸产品家族。

## Background And Confirmed Facts

### Repository evidence

- 本仓库是 React、Vite、TypeScript 主站，同时包含公开助手前端、公开助手/Studio 服务端、AI Daily Studio 与公开 Feed 相关实现。
- 公开助手已有 `answered | partial | uncertain | degraded | blocked` 回答状态、citation、session/history/branch/feedback/cancel 契约及移动端回归入口；当前证据以离线、fixture 和 smoke 为主，不能单独证明生产模型、API 冷启动和真实会话体验。证据：`src/utils/publicAssistantApi.ts:1-18,68-149,442-577`、`src/components/PublicAssistantWidget.tsx:2046-2095,2201-2248`。
- AI Daily 公开页已有 fresh/stale/empty/loading/404/410/network 状态，API 有 ETag、payload 校验和 citation coverage；真实生产版次仍依赖 approval bundle、Render Secret File/hash、短时生成 flag、Studio 审核与 Publish Export。证据：`src/pages/AiDailyPublicPage.tsx:104-152`、`src/pages/AiDailyPublicDetailPage.tsx:78-88,145-148`、`docs/studio-ai-daily-production-readiness.md:40-44,114-127`。
- AI Daily 未配置 provider 时 fail closed，Cron 默认不启用；fixture/contract 通过不等于真实 Edition 已公开。证据：`docs/ai-daily-pipeline.md:309,320-324`。
- 现有 `Project.status` 表达的是 `main | live | mvp | ongoing` 展示成熟度；`ReliabilityStatus` 表达 `online | degraded | offline | unchecked | planned` 可靠性。`login-gated` 当前属于访问预期而不是可靠性状态。证据：`src/data/portfolio.ts:1-3,51-67`、`src/data/statusTargets.ts:4-9,11-21`。
- 状态目标由 `heroContent.projects` 中带 `externalLink` 的项目自动投影，新项目若只写入局部数据不会自然获得状态目标。证据：`src/data/statusTargets.ts:102-119`。
- 项目公开名称、外链、状态和品牌信息分散在 `index.html`、`src/data/hero.ts`、`src/data/portfolio.ts`、`src/data/statusTargets.ts` 与 `src/data/siteLinks.ts`，当前没有统一的 naming registry、availability contract 或冲突检查。
- 画帆 / BIAU Canvas 已确认存在对应的 Cloudflare Pages 部署项目；账号级 Dashboard 地址不进入公开仓库。公开 URL、本地/源码边界、隐私说明、状态目标、截图、助手知识与 synthetic 证据仍未完成，因此只能作为 planned 项目进入规划。

### Confirmed product decisions

1. 公开助手与 AI 日报都必须通过真实业务闭环，才能标记为产品级可用。
2. 验收不能通过模型、搜索、embedding 或 provider 测活代替；真实模型调用只允许发生在用户批准的真实业务请求中。
3. 旧项目离线、不可用或未验证时保留项目卡、详情、截图和技术复盘，关闭直接外链 CTA，改为状态说明或“查看当前状态”。
4. 只有内容失真、涉及隐私、完全没有展示价值或用户明确要求时，才隐藏公开案例。
5. 新项目采用 `planned` 与 `online` 两级公开准入；planned 可以预告，但不能展示直接体验承诺。
6. 产品使用“中文短意象名 + 英文功能品牌名”，通过共享语义、信息架构和 `by BIAU Port / 泊岸` 归属形成统一 IP。
7. 第一版命名基线已经确认；英文名若在商标、域名或搜索辨识检查中发生冲突，只替换受影响的英文名，不推翻中文体系。
8. 第一阶段不修改仓库目录、package ID、数据库名、Render/Cloudflare 服务名、API 路由或稳定 URL。
9. 2026-08-18 用户进一步批准主站视觉融合：保留现有产品架构、内容、路由和 CTA 契约，恢复仓库内既有 BIAU Port SVG 标志，并将浅色/深色模式与 `dusk | garden | stellar` 港湾场景整理成可持久化、可验证的外观系统；不复制参考站的外部资源、调试面板或重型 3D 启动实现。

## Scope

### R1. 公开助手产品级审计与收口

- 以访客任务检查首屏、输入、发送、等待/流式状态、编辑重发、重试、新建会话、历史会话、分支、全屏、引用、取消和移动端布局。
- 对 API 冷启动、模型不可用、网络中断、无知识命中和降级回答提供真实、可恢复、不会误称模型在线的反馈。
- 建立产品级验收矩阵，区分自动化合同证据与必须人工批准的真实业务请求证据。
- 至少一次经批准的真实业务请求必须完成模型回答、引用核验、会话持久化、失败恢复和移动端观察，才能将公开助手标记为产品级可用。

### R2. AI Daily 产品级审计与收口

- 检查来源发现、时效、去重、证据、排序、生成、人工审核、Publish Export、部署、公开 Feed、详情页、空状态和错误恢复闭环。
- 分别定义公开访客与 Studio 编辑者可见的状态、下一步动作和失败反馈。
- 至少一期真实 Edition 必须完成真实来源采集、生成、人工审核、Publish Export、部署和公开 Feed 验收，才能将 AI Daily 标记为产品级可用。
- Cron 与自动发布不属于产品级验收前置条件，通过一期后仍可保持关闭。

### R3. 项目可用性与 CTA 治理

- 将“内容成熟度”“可靠性状态”“访问边界”拆开表达，避免把 login-gated 当作 online，或把 MVP 当作离线。
- 审计 Hero、项目卡、项目详情、截图 source link、博客正文、状态页和助手知识中的产品体验入口，不能只关闭某一处按钮；独立可用的文档、源码和历史证据链接不随产品入口一起关闭。
- `online` 可显示直接体验 CTA；`degraded` 可保留 CTA 但必须紧邻提示；`planned | unchecked | offline` 禁止直接外链 CTA，只显示案例详情、状态说明或状态页入口。
- `login-gated` 是访问边界：只有入口经过验证且页面清楚说明登录/邀请条件时，才能显示“打开受控入口”，不能描述成公开试用。
- 对现有项目形成带证据、owner、状态、CTA 结论和后续动作的审计清单。

### R4. 新项目两级准入

- `planned`：至少有产品名、定位、所属栏目、详情占位、owner 和公开边界；可以预告，但没有直接外链 CTA、online 徽标或可用性承诺。
- `online`：必须有公开站点、title/favicon、移动端与核心流程验收、隐私/存储/限额/删除策略、项目证据、状态目标、助手知识、synthetic 与 owner。
- 画帆 / BIAU Canvas 本轮以 `planned` 工具条目接入；在 URL、功能边界、隐私政策、截图与验收证据齐备前不能升级为 online。

### R5. 统一产品/IP 命名

- 建立单一、类型安全的产品身份注册表，公开页面从注册表读取中文名、英文名、描述、副标题、归属与兼容别名。
- 公共显示名称和稳定技术标识分离；第一阶段不改已有 slug、URL、API、服务与数据库标识。
- 公开产品命名基线：

| Product | 中文名 | English name |
| --- | --- | --- |
| Master site | 泊岸 | BIAU Port |
| Public assistant | 知航 | BIAU Beacon |
| AI Daily | 潮讯 | TideBrief |
| Image hosting | 画帆 | BIAU Canvas |
| Legal RAG | 律航 | LexBeacon |
| Chatus | 泊语 | HarborTalk |
| Pet | 帆灵 | SailSprite |
| ERP | 商舱 | OpsDeck |
| Xunqiu | 寻球 | BallTrail |
| Learning product | 锚学 | Anchor Learning |
| Enterprise document agent | 文航 | DocBeacon |
| Game portfolio | 游湾 | BIAU Playlab |

- `learn/anchor` 是锚学公开实现；`learn/duoduo-original` 只作参考，禁止进入主站项目、状态目标、公开助手知识或独立 IP；`learn/aicoding-cookbook` 是内部开发/内容支持，不作为公开产品。
- Xunqiu legacy 与 modern backend 归于同一产品，只用 Legacy/Next 技术标签。
- Playlab 六个小游戏保留现名，只统一展示样式与泊岸归属。
- 迁移公开名称前执行当前英文商标、域名与搜索辨识冲突调查，并建立一致性检查，防止页面、状态、README 与助手知识漂移。

### R6. 主站外观与参考站能力融合

- 保留 React/Vite、四项公共导航、项目注册表、发布 CTA、状态页、博客和公开助手架构，不照搬参考站单页 DOM 或项目内容。
- 浅色、深色和自动模式负责整体对比度；`dusk | garden | stellar` 负责港湾场景。每个场景必须在浅色和深色下拥有可读的语义令牌，共六种组合。
- 首页头部显示仓库内现有 `BiauPortMark`，不能用伪元素文字替代或把真实 SVG 设为透明。浏览器 favicon 与页面标志保持同一视觉来源。
- Logo 使用独立语义按钮循环场景；品牌文字仍是首页链接。两者不得形成嵌套交互元素，并提供当前/下一场景的键盘与辅助技术反馈。
- 在 React 挂载前恢复持久化外观，避免错误主题闪烁；自动模式跟随系统色彩偏好并响应运行时变化。
- 背景继续复用现有 Flow renderer、CSS fallback、性能预算和 reduced-motion 契约，不引入参考站的外链字体、Canvas 3D Logo、GSAP boot 或全局 click 路由。

## Product-level Acceptance

### Public assistant

- [x] 桌面与手机视口均能完成新建会话、发送、等待、回答、引用展开、编辑重发、重试、历史恢复和全屏退出。
- [x] API 冷启动和网络失败有阶段性状态、合理等待与可执行恢复动作，不会迅速伪装成低质量回答。
- [x] 模型不可用、RAG 无命中和全网搜索不可用分别使用准确状态，不泄漏 provider、endpoint、token 或内部诊断。
- [x] session、message、branch 与 citation 在刷新后保持一致；失败重试不会重复消息或污染历史。
- [x] 至少一次经批准的真实业务请求完成模型回答、引用、持久化、失败恢复和移动端人工观察，并留下低敏验收记录。

### AI Daily

- [x] Studio 编辑者能区分发现、证据不足、生成、待审、驳回、可发布、已发布和失败状态，并知道下一步操作。
- [x] 公开 Feed 与详情页能处理 loading、fresh、stale、empty、404、410 和 network error，并提供符合状态的恢复动作。
- [x] 真实来源保留标题、URL、发布时间/抓取时间和引用证据；去重、时效和排序结果可审核。
- [ ] 至少一期真实 Edition 完成来源采集、生成、人工审核、Publish Export、部署和公开 Feed/详情页桌面及手机验收。
- [x] Cron 保持关闭时，页面和文档不会宣称“每日自动发布”。

### Project and naming system

- [x] 所有公开项目获得独立的 maturity、availability、access、owner 与 CTA 结论，状态含义不混用。
- [x] 不可用/未验证入口在 Hero、项目详情、视觉 source link、正文和助手知识中的直接 CTA 均被关闭，但案例内容继续可读。
- [x] 画帆 / BIAU Canvas 以 planned 工具条目出现，不展示虚构 URL、截图、在线徽标或直接体验按钮。
- [x] 已确认名称从单一注册表投影到公开页面、metadata、状态标签与助手知识；稳定技术标识保持不变。
- [x] reference-only/internal 目录不会进入公开项目目录或知识索引。
- [x] lint、build、相关 contract/check、UI smoke 和静态链接检查通过，且不覆盖用户已有状态快照。
- [x] 首页六种外观组合在 320、390、430 和桌面视口下保持可读、无溢出，真实 Logo 可见，场景/明暗偏好在刷新后保持，自动模式响应系统浅深色变化。

当前验收边界（2026-08-19）：知航与项目/命名/外观验收已经闭合；本任务唯一未闭合的产品级验收项是潮讯完成一期真实 Edition 的审核、Publish Export、部署与公开页面验收。潮讯按当前决定继续暂缓，本次状态同步不触发任何模型请求。画帆升级为 `online` 属于未来准入事项，不影响本轮 `planned + case-only` 验收结论。

## Manual Gates

- 批准并执行公开助手真实业务验收；真实模型调用不能由自动测活代替。
- 在 Studio 审核并批准至少一期真实 AI Daily Edition，再确认 Publish Export 与公开 Feed。
- 提供画帆 / BIAU Canvas 的公开源码/维护边界、生产域名、隐私/存储/删除规则和可公开截图后，才能申请 online；Cloudflare Dashboard 管理地址不作为公开入口。
- 对英文产品名的商标/域名冲突结论作最终确认。
- 未来图标与视觉识别方案单独审批。

## Out Of Scope

- 不对模型、搜索、embedding 或 provider 执行主动测活；项目自有公开页面的 L0/链接检查只能用于入口审计，不能触发模型或付费业务能力。
- 不在本任务中开启 AI Daily Cron 或无人工审核自动发布。
- 不公开真实 token、账号、数据库 URL、模型渠道、后台地址或生产诊断。
- 不修改关联仓库主体、仓库目录、package ID、服务名、数据库名、API 路由或稳定 URL。
- 不复制或生成新的第三方视觉资产；本轮只恢复并统一使用仓库中已存在的 `BiauPortMark` / `favicon.svg` 视觉来源。
- 不把 `duoduo-original`、`aicoding-cookbook`、后端代际或 Playlab 小游戏提升为独立产品 IP。

## Open Decisions

无。需求可以进入设计与实施计划审阅。
