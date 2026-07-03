# 跨项目部署与可靠性收尾第三轮

## Goal

把上一轮已经完成的代码侧优化推进到“线上可访问、功能可验证、风险边界清楚”的收尾状态。

这一轮不是继续堆展示文案，而是把以下问题拆成可独立验收的子任务：

- 公开助手是否真正接入服务端模型，并在未配置或失败时安全回退。
- ERP 生产注册是否在线上可用，且新账号权限安全。
- Legal RAG 是否有可公开演示入口，问答和合同审查链路是否可观测。
- Pet APK 是否满足公开下载条件，展示页是否只暴露真实可发布产物。
- 主站、ERP、Legal RAG、Xunqiu、Pet、Playlab 等项目是否能被定时可靠性检查覆盖。
- AI 日报是否能作为独立内容流水线一期，而不是混在项目展示优化里。

用户价值：访客看到的不只是“项目介绍”，而是能实际进入演示、注册试用、查看状态，并理解哪些能力已上线、哪些能力仍受 gate 控制。

## Requirements

- 父任务只承载任务地图、统一边界和跨子任务验收；实际实现必须由 child task 独立完成、验证、提交、推送和归档。
- 所有线上配置必须保持密钥安全：
  - 不提交真实 API key、账号密码、数据库连接、签名文件路径或平台后台私有 URL。
  - Legal RAG 如需公开演示凭据，只能使用可回收的 demo 账号，禁止公开真实管理员密码。
  - 公开助手模型 key 只能写入 Cloudflare Pages / Render / 本地私有环境变量。
- 任何“线上可用”结论都必须有证据：
  - 本地静态检查只能证明代码和文档准备好。
  - 真实线上功能必须通过 public URL、health endpoint、synthetic script、截图或平台部署状态确认。
- 当前已知人工 gate：
  - Cloudflare Pages / Render / HidenCloud 等部署平台是否已经构建最新提交。
  - 公开助手 `ASSISTANT_MODEL_*` 环境变量是否已在服务端平台配置。
  - ERP 生产环境是否没有把 `ERP_REGISTRATION_ENABLED` 设为关闭值。
  - Legal RAG demo 账号是否创建、权限是否可回收、是否允许公开到页面/文章。
  - Pet release APK / AAB 是否完成签名、校验、基础回归和人工批准。
  - Cloudflare Analytics、Search Console、Umami/Plausible、Prometheus/Grafana/ARMS 等平台是否由用户启用或授权。
- 当前已知代码事实：
  - `blog-semi` 主仓库在 `main`，工作区 clean，并已同步 `origin/main`。
  - ERP 代码侧已经支持生产普通自助注册默认开放；新注册账号默认 `operator`。
  - 公开助手已有同域 Cloudflare Pages Functions 接入点 `/api/health` 和 `/api/chat/public`，也保留独立 assistant server 路线。
  - Pet 展示页已经接入主站，APK 下载仍保持发布门禁。
  - 状态页和部分 synthetic 检查已有基础，但真实定时运行和平台告警尚未闭环。
  - AI 日报已有栏目和模板基础，但没有自动抓取、生成、审核和发布流水线。

## Acceptance Criteria

- [ ] 所有 child task 都有清晰 PRD，说明目标、人工 gate、验收证据和不做事项。
- [ ] 每个完成的 child task 都必须记录验证命令、线上检查证据或明确的人工 gate 阻塞原因。
- [ ] 公开助手、ERP 注册、Legal RAG demo、Pet APK 和可靠性观测至少各有一个独立 child task。
- [ ] 主站公开内容不得声称未上线、未部署、未审核或未签名的能力已经可用。
- [ ] 新增或更新的部署/监控文档必须区分“代码已准备好”和“平台已启用”。
- [ ] 本轮父任务完成时，长期 backlog 和下一轮候选事项必须沉淀在 `prd.md`、相关 docs 或 `.trellis/spec/` 中。

## Notes

- 推荐执行顺序：
  1. 公开助手 GLM 部署验证与产品化收口。
  2. ERP 生产注册线上验证与主站同步。
  3. Legal RAG 演示访问与问答监控收口。
  4. 跨项目可靠性定时观测与状态页闭环。
  5. Pet APK 公开发布门禁与展示页下载收口。
  6. AI 日报内容流水线一期。

- 本父任务不直接进入实现态；实现态应落在具体 child task 上。
