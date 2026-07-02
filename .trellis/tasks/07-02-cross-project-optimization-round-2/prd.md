# 跨项目产品展示与内容体系持续优化

## Goal

把 BIAU Port 及其相关项目从“有实现但展示分散”推进到“访客能看懂、点得通、信得过、可演示”的长期状态。每一轮先基于当前仓库证据巡检，再选择低风险、高收益的小步优化执行；需要人工审核的事项只记录为 gate，不阻塞其他可自动推进的工作。

本父任务只承载长期规则、任务地图和跨子任务验收；实际实现由 child tasks 独立完成、验证、提交、推送和归档。

## Requirements

- 默认优先级为产品展示与访客体验，而不是自动生成大量文章：
  - 60% 产品/展示体验。
  - 25% 工程质量/文档同步。
  - 15% 博客/内容草稿。
- 每个子任务必须独立可验证，优先修复访客马上能感知的问题：
  - 主站首页、项目页、项目详情页、助手知识、站点地图和公开链接。
  - 项目页事实与 `erp`、`legal-rag`、`xunqiu-backend-modern`、`xunqiu-showcase-site`、`pet/gamer`、`game/blog` 和主要游戏仓库保持一致。
  - 静态展示页、下载页、demo 入口、截图和后续优化方向必须如实表达当前边界。
- 所有内容必须证据优先，不从过时 README 单点推断项目状态；优先读取当前代码、脚本、测试、部署文档、数据文件和近期提交。
- 不写入真实账号、密钥、生产数据库连接串、私有后台地址、签名文件路径或未确认可公开的部署细节。
- 模型与图片生成仅用于草稿或辅助，不自动发布；不并发打同一个中转，不显示 API key，不做无意义测活。
- 提交后按仓库策略推送：
  - `blog-semi/main` 可以在成功提交后默认 `git push origin main`。
  - 其他仓库推送当前工作分支；不安装自动 push hook。

## Child Task Map

- `07-02-blog-semi-showcase-loop-audit`: 主站项目展示闭环审计与修复，优先处理卡片/按钮/详情页/外链行为一致性。
- `07-02-project-evidence-refresh-sync`: 项目案例证据刷新与主站同步，按项目仓库证据更新项目详情和助手知识。
- `07-02-pet-app-showcase-followup`: Pet App 展示页继续优化，补截图、发布清单、APK gate 和主站链接。
- `07-02-knowledge-blog-evidence-pack`: 知识积累博客草稿证据包，先产出 review-only 草稿和证据，不发布。
- `07-02-07-02-playlab-game-detail-enrichment`: Playlab 六个 Godot 游戏项目详情补强，让主站详情页解释玩法、实现、验证、边界和后续方向。
- `07-02-erp-auth-entry-experience`: ERP 登录/注册入口审计与自助注册 gate 加固，保守解析 `ERP_REGISTRATION_ENABLED` 并补充测试/文档。
- `07-02-chunk-strategy-draft-evidence-review`: RAG chunk strategy 草稿证据刷新，移除模型占位，补当前 Legal RAG splitter/citation 证据。
- `07-02-rag-overview-draft-evidence-review`: RAG overview 草稿证据刷新，补 evidence-first 结构、模型策略、发布 gate 和配图决策，不进入公开发布。
- `07-02-07-02-home-card-keyboard-action-fix`: 首页 IN PORT 项目卡键盘行为修复，让外链按钮键盘激活只打开外链，不误触发详情页跳转，并补 UI 回归检查。
- `07-02-projects-card-keyboard-action-fix`: 项目集卡片键盘控制修复，让卡片主体只响应自身焦点，内部详情按钮具备可访问名称，并为隐藏外链保留事件边界。
- `07-02-project-detail-internal-link-routing`: 项目详情页内部链接 SPA 导航优化，让站内项目/博客链接使用 React Router `Link`，外部链接继续保持新窗口安全属性，并补 UI 回归检查。
- `07-02-xunqiu-showcase-entry-sync`: 寻球主站展示入口补齐，让项目详情页直接暴露产品展示页、技术文档、阶段 APK、后端仓库和迁移复盘，并同步助手知识与 sitemap。
- `07-02-legal-rag-public-demo-path`: Legal RAG 公开演示路径补强，把登录保护、公开数据集、RAG citation/diagnostics、合同审查和质量面板的推荐观看顺序同步到主站和助手知识。
- `07-02-erp-registration-docs-consistency`: ERP 注册开关文档一致性修复，把 HidenCloud 手动部署记录和交接说明同步到当前 runtime/test/README 行为，避免误导接手人以为生产普通注册默认开放。
- `07-02-blog-model-live-doctor-task-check`: 博客模型 live doctor 语义修复，把空洞 OK 测活改为需批准的小型博客诊断任务，并同步 skill usage、草稿工作流和 backend spec。
- `07-02-site-traffic-monitoring-mvp`: 站点访问与运行监察 MVP，补充访问人数查看说明、线上健康检查脚本、默认关闭的事件统计适配层和隐私/人工配置 gate。
- `07-02-observability-strategy-phase-2`: 可观测性二期选型与路线图，拆清访问分析与工程可观测性，补默认关闭的 assistant API Prometheus `/metrics` 预留端点和 backend observability spec。
- `07-02-project-detail-related-recommendations`: 项目详情相关推荐质量优化，把同类/相关项目从单一 category 截取改为基于 category、公开博客关联、技术栈和展示状态的稳定评分。
- `07-02-07-02-project-detail-related-ui-check`: 项目详情相关推荐 UI 回归检查，把 `ozon-erp` 和 `xunqiu` 的相关项目区纳入 Playwright 检查，覆盖标题、数量、自链接和卡片跳转。
- `07-02-07-02-project-detail-image-original-link`: 项目详情主图原图查看入口，为长截图和移动端截图增加可访问的“打开原图”链接，并补 UI 回归检查。
- `07-02-07-02-blog-model-env-file-alias-cleanup`: 博客模型工具 `--env-file` 别名清理，拒绝易被 Node/wrapper 抢占的参数并提示改用 `--local-env`。
- `07-02-07-02-observability-tooling-decision-matrix`: 可观测性工具决策矩阵与落地清单，补 Cloudflare / Search Console / Umami / Plausible / Prometheus / Grafana / ARMS / OpenTelemetry / Sentry / Faro / Langfuse 的分层关系、推荐路线、人工 gate 和离线文档检查。
- `07-02-biau-port-logo-intro-animation`: 泊岸品牌图标与入场动画优化，融合 `b + 港湾 / 数字端口 + 暖灯` 的 SVG 标识，替换导航 logo、首页首次入场动画和 favicon，并收紧移动端导航布局。
- `07-02-07-02-biau-port-logo-intro-animation`: 泊岸 Logo 入场归位动画精修，让首页首访动画根据真实导航栏 `.nav-logo` 坐标与尺寸收束到现有站点图标，并补 UI 回归检查。
- `07-02-07-02-projects-mobile-card-actions`: 项目集移动端卡片操作区恢复，让 `/projects` 手机视口保留紧凑的详情按钮和外部项目入口，并补 UI 回归检查。
- `07-02-07-02-project-detail-hero-quick-links`: 项目详情首屏快速链接，让详情页标题区直接复用现有项目链接，改善移动端首屏找不到演示、文档、源码和相关文章入口的问题。
- `07-02-07-02-project-detail-link-type-affordance`: 项目详情链接类型识别，让详情页链接徽标基于现有 `ProjectLink.type` 区分外部入口和站内入口，并补 UI 回归检查。
- `07-02-07-02-project-detail-mobile-image-framing`: 项目详情移动端长图预览优化，限制竖向长截图预览高度，让“打开原图”入口保持首屏可见，并补 UI 回归检查。
- `07-02-erp-overview-first-run-guidance`: ERP 登录后概览页首次引导，展示当前账号/角色、生产注册 gate 提醒和店铺配置、插件下载、商品同步、上架记录推荐路径。
- `07-02-erp-login-visual-registration-locked-ui`: ERP 登录页视觉与注册关闭态优化，强化受控工作台入口、店铺/插件/后台链路和注册关闭时的下一步说明。
- `07-02-erp-login-experience-main-site-sync`: ERP 登录体验主站同步，把最新登录页受控入口、注册关闭态、bootstrap 兜底和概览首次引导更新到 Ozon ERP 项目详情与助手知识。
- `07-02-pet-app-showcase-main-site-entry`: Pet App 静态展示页接入主站，整理 Pet 原仓库分页脏文件、展示页部署说明和本地 debug APK 产物记录；公开 APK 下载仍保持 gate。
- `07-02-legal-rag-demo-access-monitoring`: Legal RAG 公开 demo 访问说明与问答功能监察，准备可公开 demo 凭据/入口说明，监控法律问答、citation 和质量面板路径；不得把真实后台管理员密码写入文章。
- `07-02-erp-production-registration-enable`: ERP 生产真实注册开启，用户已明确批准开启生产注册；实现前仍需检查鉴权、默认角色、滥用防护、部署环境变量和最小回归。
- `07-02-public-assistant-model-productization`: 公开 AI 助手接入真实模型并产品化，提供服务端模型配置点、公开知识 RAG 边界、失败兜底、限流/成本/脱敏日志和更正式的助手交互体验。

## Human Review Gates

- 是否开启 ERP 生产自助注册。状态：2026-07-02 用户已明确批准开启真实生产注册，后续 child task 可以进入实现。
- 是否发布真实 Pet APK。
- 是否部署任何项目到线上。
- 是否删除旧博客。
- 是否把草稿发布到公开博客。
- 是否公开任何仍含“待核验”的内容。
- 是否使用图片生成作为正式公开资产。
- 是否启用 Cloudflare Web Analytics、Search Console / Webmaster 或 Umami / Plausible 的真实站点配置。
- 是否把 `site:monitor` 接入 CI、定时器、告警平台或发布流水线。
- 是否开启生产 `METRICS_ENABLED`、Sentry DSN、ARMS、托管 Prometheus/Grafana 或任何真实 scrape/告警配置。
- 是否接入 Langfuse、Helicone、Phoenix 或任何真实 LLM trace / prompt / cost 平台。

## Acceptance Criteria

- [x] 至少一个 child task 完成实现、验证、提交、推送并归档。
- [x] 每个已完成 child task 都记录验证命令和人工审核 gate。
- [x] `blog-semi` 的公开展示、助手知识、站点地图和博客检查在相关子任务中保持同步。
- [x] 长期 backlog 中的后续候选清晰记录，未做事项不能被描述为已完成。
- [x] 不提交敏感信息、未确认公开下载链接或未经审核发布的博客内容。

## Current Round Summary

- 已完成 31 个 child task：主站展示闭环、blog-semi 案例刷新、Pet 展示页 gate、Embedding 知识草稿证据包、Playlab 游戏详情补强、ERP 自助注册 gate 加固、Chunk strategy 草稿证据刷新、RAG overview 草稿证据刷新、首页项目卡键盘外链行为修复、项目集卡片键盘控制修复、项目详情内部链接 SPA 导航优化、寻球展示入口补齐、Legal RAG 公开演示路径补强、ERP 注册开关文档一致性修复、博客模型 live doctor 语义修复、站点访问与运行监察 MVP、可观测性二期选型与 metrics 预留、项目详情相关推荐质量优化、项目详情相关推荐 UI 回归检查、项目详情主图原图查看入口、博客模型工具 `--env-file` 别名清理、可观测性工具决策矩阵与落地清单、泊岸品牌图标与入场动画优化、泊岸 Logo 入场归位动画精修、项目集移动端卡片操作区恢复、项目详情首屏快速链接、项目详情链接类型识别、项目详情移动端长图预览优化、ERP 登录后概览首次引导、ERP 登录页视觉与注册关闭态优化、ERP 登录体验主站同步。
- 本轮已覆盖产品/展示体验、项目证据同步、草稿内容治理、跨项目链接安全边界、生产注册误配置防护、RAG 知识草稿去占位、首页导航可访问性回归、项目集卡片键盘可达性、项目详情站内导航体验、寻球静态展示入口一致性、Legal RAG 公开演示叙事、ERP 交接/部署文档事实一致性、博客模型配置工具安全语义、站点运行/访问数据观测入口、后端工程可观测性默认关闭指标边界、详情页后续跳转推荐质量、相关项目区域 UI 防回归、详情主图原图可检查性、博客模型 CLI 参数歧义清理、可观测性工具分层决策、泊岸品牌动效识别、泊岸开屏动画真实导航落点归位、项目集移动端外链入口可见性、项目详情首屏操作入口可见性、项目详情链接类型识别、移动端长截图 framing、ERP 登录后首屏引导、ERP 登录页受控入口表达和 ERP 主站项目事实同步。
- 父任务不归档，继续作为长期自动优化队列；后续仍按“低风险、高收益、可验证、遇 gate 切下一个”的规则推进。

## Next Candidate Queue

- `erp` 登录/注册体验：概览页已补当前账号/角色、生产注册 gate 提醒和推荐路径；登录页已补受控入口状态、工作链路背景、注册关闭态下一步说明和 bootstrap 失败时不默认开放注册的前端兜底。后续若继续 ERP，应优先做真实角色权限提示或登录后细分工作台入口，生产自助注册仍是人工 gate。
- `blog-semi` ERP 展示同步：Ozon ERP 项目详情和公开助手知识已同步最新登录页与概览页体验；后续如果 ERP 继续变动，应优先检查 `src/data/portfolio.ts` 与 `assistant:index` 是否需要再次刷新。
- `blog-semi` 项目详情体验：首页与项目集卡片的鼠标/键盘行为、项目详情站内链接 SPA 导航、详情页相关推荐、相关推荐 UI 回归、主图原图入口、项目集移动端外链入口、项目详情首屏快速链接、链接类型识别和移动端长图 framing 已补检查；后续可继续检查移动端信息密度和项目详情首屏布局。
- `blog-semi` 品牌与动效后续：泊岸 `b` 标识、favicon、首页首次入场动画和真实导航 Logo 归位落点已完成并纳入 UI 回归；后续可在真实设备上微调 logo 细节、暗/亮主题对比、动画节奏或增加正式品牌使用规范。
- `xunqiu` 展示链路：主站已补齐产品展示页、技术文档和阶段 APK 入口；后续若继续 xunqiu，应先确认实时后端健康检查 URL 是否可公开，或转向展示站自身 UI/文档优化。
- `legal-rag` 公开演示叙事：主站已补推荐演示路径、拒答/引用/质量面板解释；后续可继续检查真实截图是否需要更新、登录后引导是否足够清楚，或做工作台 UI 小优化。
- `legal-rag` demo 访问与监控：用户希望访客能进入后台展示。后续应创建/确认可公开 demo 凭据或安全访问说明，并补法律问答功能监控；禁止把真实管理员密码、生产后台密码或不可回收凭据写入文章。
- `erp` 真实生产注册：用户已批准开启真实生产注册。下一步应创建独立 child task，在 ERP 仓库检查当前注册开关、用户模型、默认角色、验证码/限流/审计/邀请策略、部署环境变量和登录注册 UI，然后实现并同步主站说明。
- `blog-semi` 公开 AI 助手产品化：用户希望公开助手接入真实 AI 模型，并向正式产品方向优化。后续应先找当前 `/chat/public` 接入点，使用服务端 env 配置模型渠道，不在前端暴露 key；补公开知识 RAG、限流、错误兜底、日志脱敏、成本边界和 UI 产品化体验。
- 博客草稿后续：`chunk-strategy-public`、`embedding-vector-search-public`、`rag-overview-public` 已完成证据刷新；接下来只在人工确认后进入模型辅助润色、发布候选或旧文删除。
- 博客模型工具后续：live doctor 已改为需批准的小型博客诊断任务，`--env-file` 别名也已拒绝并提示 `--local-env`；后续可继续补更细的非交互式回归脚本或把模型设置向导文档同步到独立 skill 仓库。
- 站点与工程可观测性后续：首版 `site:monitor`、访问数据查看文档、no-op analytics adapter、可观测性策略文档、assistant API 默认关闭 `/metrics` 和可观测性工具决策矩阵已落地；后续人工 gate 是启用 Cloudflare Web Analytics / Search Console / Plausible 或 Umami / Sentry / Grafana Faro / ARMS / Prometheus/Grafana / Langfuse 等真实平台，自动候选是把同样的低敏 `/metrics` 模式推广到 ERP、Legal RAG、Xunqiu 后端或 Pet Community API。

## Notes

- 如果某个子任务遇到 blocker，记录 blocker、证据和下一步建议后切换到下一个可执行优化。
- 父任务保持 `planning` 或长期跟踪状态；启动实现时优先启动具体 child task。
