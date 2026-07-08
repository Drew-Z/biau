import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "pet-workspace-pipeline",
  "title": "AI 桌宠工程：社区 App、生成管线与 APK 发布门禁",
  "tag": "AI 应用",
  "column": "project-notes",
  "detail": "AI 桌宠项目不能只展示生成效果，还要说明 Android App、Community API、人审发布、pet.zip 契约和 APK gate 如何协同。本文复盘 Pet Workspace 当前可展示的工程边界。",
  "date": "2026-06-14",
  "readTime": "14 min",
  "series": "项目案例",
  "knowledgePoints": [
    "WIP 工程展示",
    "Community API",
    "Android 社区 App",
    "人审发布",
    "pet.zip 契约",
    "APK 发布门禁"
  ],
  "scenarios": [
    "AI 桌宠社区",
    "移动端资产发布",
    "生成任务人审",
    "App 安全网关",
    "APK 公开下载审核"
  ],
  "practiceChecklist": [
    "先区分 App、Community API、Admin Review、Pet Generator 和生成规则服务的职责",
    "让 Android App 只接触公开 App API，不直连生成 Worker 或内部命令面",
    "用 pet.zip manifest、ownership claim 和 score report 约束资源包结构",
    "把机器 QA 当作拦截器和证据，不替代人工视觉审核",
    "公开 APK 前必须具备 release 构建、签名、SHA-256、扫描/回归、版本说明和人工批准",
    "公开文章只记录低敏测试结果，不暴露 token、部署主机、Worker 命令或私有生成配置"
  ],
  "sections": [
    {
      "title": "项目定位：这是 WIP，不是已经完全上线的平台",
      "body": "Pet Workspace 当前适合展示“AI 桌宠产品如何被工程化”，而不是包装成已经完整生产运营的公共平台。它包含 Android 桌宠社区 App、Community API、Admin Review 原型、Pet Generator 适配层、共享 contracts、pet package/runtime 包，以及相邻生成规则服务提供的生成任务、Worker 编排和 QA gate。公开表达的重点是模块边界、当前证据和后续发布门禁。"
    },
    {
      "title": "业务链路：从生成候选到社区发布",
      "body": "用户侧关心的是能否看到桌宠、提交生成任务、追踪候选、进入社区审核和最终下载资源包。工程侧要把这条链路拆开：生成任务只产生候选和证据，机器 QA 先过滤结构和流程问题，人工审核决定是否接受，Community API 再把通过的桌宠写入 feed、approved pets、wallet 和 submission 状态。这样桌宠资产不会因为一次生成成功就直接进入 App。"
    },
    {
      "title": "App 边界：客户端只面对 Community API",
      "body": "Android App 的职责是桌宠 shell、社区首页、候选画廊、导入草稿、提交审核和状态刷新。它不应该知道生成 Worker、内部文件路径、Agent 指令或私有运维端点。Community API 扮演 App 网关：公开 health、SLA、worker readiness、app-api-contract、feed、community-home、approved pets、submissions、import drafts 和 package descriptor 等接口；如需代理生成规则服务，也只代理公开 app lifecycle 路由。"
    },
    {
      "title": "资源包契约：pet.zip 不是随便打一个压缩包",
      "body": "桌宠进入社区前需要稳定的 package contract。pet package spec 会校验 manifest、ownership claim、score report、资源路径、动作表、预览图、导出包和奖励建议。路径必须是包内相对路径，不能把本地文件系统路径、server run path 或本地文件 URL 带给 App。这个契约让 Android、Community API、Admin Review 和生成服务围绕同一份资源语言协作。"
    },
    {
      "title": "人审与质量门禁：自动化负责筛选，人负责发布",
      "body": "AI 生成资产的风险不只是“好不好看”，还包括透明背景、动作覆盖、身份一致性、预览证据、授权声明、包结构和下载路径安全。机器 QA 可以检查这些结构和流程项，帮助发现明显不合格候选；但最终能否进入社区、是否给予奖励、是否开放 package，需要人工视觉审核和审核记录。公开文章不能把机器 QA 写成最终质量担保。"
    },
    {
      "title": "当前展示：App 展示页在线，APK 仍关闭下载",
      "body": "主站已经有 /pet-app-showcase/ 静态展示页，用 Android 模拟器截图展示桌宠模式、孵化桌宠、社区和个人页，并对齐 BIAU Port / 泊岸标题与 favicon。最近一次 Pet synthetic 显示展示页和 4 张截图可访问；APK gate 仍是 debug-only，只发现 app-debug.apk，没有 release APK/AAB 候选。因此当前页面只能说明工作进展和发布清单，不能放公开 APK 下载链接。"
    },
    {
      "title": "测试证据：多模块测试支撑，但不替代生产验收",
      "body": "Pet/Gamer 工作区已有 Node workspace 测试覆盖 apps、packages、services 和 tools；Community API 测试覆盖 health、鉴权、Feed、approved pets、import drafts、admin review、wallet、check-in、SLA、rate limit、metrics、logging、PostgreSQL/migrations 等边界；Android 侧也有 debug unit test 和 debug APK 构建证据。这些说明工程结构可验证，但它们不等于正式 APK 发布、生产账号体系和长期 SLA 已完成。"
    },
    {
      "title": "证据边界：本文依据哪些公开材料",
      "body": "本文依据的是公开站和低敏工程材料：src/data/portfolio.ts 中的 Pet 项目详情，src/data/statusTargets.ts 的 Pet 可靠性检查定义，scripts/check-pet-showcase-synthetic.mjs 的展示页与 APK gate 检查契约，public/status/pet-gamer-synthetic.json 的低敏摘要，以及 gamer 仓库 README、docs/agents/domain.md、docs/api/community-api.md、package.json 和 packages/pet-package-spec 的公开契约。文章不记录真实 token、私有部署主机、数据库连接、签名材料、Worker 命令或模型配置。"
    },
    {
      "title": "案例价值：把 AI 生成项目讲成工程系统",
      "body": "这个项目的展示价值在于说明 AI 生成应用如何从“生成一张图”走向“App 可消费、社区可审核、资源可追踪、发布可回滚”的工程系统。访客能看到移动端体验和模块边界，维护者能继续围绕 Community API、Admin Review、package contract、发布 gate 和观测指标推进，而不会把 WIP 写成完全体。"
    },
    {
      "title": "后续优化方向：先补 release gate，再谈公开下载",
      "body": "后续优先补四类能力：第一，准备正式 release APK/AAB、签名、SHA-256、扫描/回归证据、版本说明和回滚说明；第二，完善生产鉴权、租户隔离、下载权限、审核权限和生成任务限流；第三，强化 Worker 池化、队列位置、失败恢复、运行面板和长期 SLA；第四，继续补 Android 真机/模拟器 E2E、桌宠交互、候选画廊和质量回归报告。只有这些 gate 到位后，项目页才适合开放公开下载或把更多检查标成 online。"
    }
  ],
  "takeaways": [
    "AI 桌宠项目的核心不是单次生成，而是 App、API、审核、资源包和发布 gate 的协作。",
    "Android App 应只消费公开安全的 Community API，不直连生成 Worker 或内部运维面。",
    "pet.zip 契约和人审记录让生成资产进入社区前可校验、可追踪、可回滚。",
    "debug APK 只能作为内部验证证据，公开下载必须等 release 包、签名、校验和回归证据。"
  ]
}

export default post
