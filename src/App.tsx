import { useEffect, useMemo, useState } from 'react'
import { Button, Space, Tag, Typography } from '@douyinfe/semi-ui-19'
import { IconApps, IconArticle, IconBriefcase, IconExternalOpen, IconHome } from '@douyinfe/semi-icons'
import { categoryLabels, projects, statusLabels, type Project } from './data/portfolio'
import './App.css'

const { Title, Text, Paragraph } = Typography

type ViewKey = 'home' | 'projects' | 'projectDetail' | 'gameDetail' | 'cases' | 'caseDetail' | 'blog' | 'blogDetail'
type NavViewKey = Exclude<ViewKey, 'projectDetail' | 'gameDetail' | 'caseDetail' | 'blogDetail'>
type ProjectGroupKey = 'ai' | 'fullstack' | 'games'
type SiteTheme = 'light' | 'dark'
type SiteLanguage = 'zh' | 'en'

const navItems: Array<{ key: NavViewKey; label: Record<SiteLanguage, string>; icon: React.ReactNode }> = [
  { key: 'home', label: { zh: '首页', en: 'Home' }, icon: <IconHome /> },
  { key: 'projects', label: { zh: '项目', en: 'Projects' }, icon: <IconApps /> },
  { key: 'cases', label: { zh: '案例', en: 'Cases' }, icon: <IconBriefcase /> },
  { key: 'blog', label: { zh: '博客', en: 'Blog' }, icon: <IconArticle /> },
]

const routeByView: Record<NavViewKey, string> = {
  home: '/',
  projects: '/projects',
  cases: '/cases',
  blog: '/blogs',
}

const viewByRoute = new Map<string, ViewKey>([
  ...Object.entries(routeByView).map(([view, route]) => [route, view as ViewKey] as const),
  ['/resources', 'cases'],
])

function getViewFromPath(pathname: string): ViewKey {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (/^\/projects\/[^/]+$/.test(normalizedPath)) return 'projectDetail'
  if (/^\/games\/[^/]+$/.test(normalizedPath)) return 'gameDetail'
  if (/^\/cases\/[^/]+$/.test(normalizedPath)) return 'caseDetail'
  if (/^\/blogs\/[^/]+$/.test(normalizedPath)) return 'blogDetail'
  return viewByRoute.get(normalizedPath) ?? 'home'
}

const gameRouteByProjectId: Record<string, string> = {
  'game-first-tetris': 'first-tetris',
  'game-next-spacewar': 'next-spacewar',
  intespace: 'intespace',
  'raiden-prototype': 'raiden',
  'space-war': 'space-war',
}

function getGameSlugByProjectId(projectId: string): string | null {
  return gameRouteByProjectId[projectId] ?? null
}

function getGameProjectIdFromPath(pathname: string): string | null {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const match = normalizedPath.match(/^\/games\/([^/]+)$/)
  if (!match) return null
  return Object.entries(gameRouteByProjectId).find(([, slug]) => slug === match[1])?.[0] ?? null
}

function getProjectIdFromPath(pathname: string): string | null {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const match = normalizedPath.match(/^\/projects\/([^/]+)$/)
  return match?.[1] ?? null
}

function getCaseIdFromPath(pathname: string): string | null {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const match = normalizedPath.match(/^\/cases\/([^/]+)$/)
  return match?.[1] ?? null
}

function getBlogSlugFromPath(pathname: string): string | null {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const match = normalizedPath.match(/^\/blogs\/([^/]+)$/)
  return match?.[1] ?? null
}

const heroSlides = [
  {
    id: 'legal-rag',
    title: 'Legal RAG',
    subtitle: '法律智能机器人与合同审查',
    description: '文档导入、RAG 问答、引用溯源和合同风险审查的全栈 MVP。',
    image: '/images/projects/showcase/legal-rag-reviewed.png',
  },
  {
    id: 'pet-workspace',
    title: 'Pet Workspace',
    subtitle: 'AI 宠物生成与审核管线',
    description: '围绕生成、审核、人审发布和 App API 契约组织的 AI 项目工作区。',
    image: '/images/projects/showcase/fantasy-pet-flow.png',
  },
  {
    id: 'ozon-erp',
    title: 'Ozon 电商 ERP',
    subtitle: '全栈业务系统',
    description: '管理后台、Node API、Prisma、Worker 和浏览器采集插件组合成的业务系统。',
    image: '/images/projects/showcase/erp-cover.svg',
  },
]

const projectGroups: Array<{ key: ProjectGroupKey; title: string; description: string; projectIds: string[] }> = [
  { key: 'ai', title: 'AI 应用', description: 'RAG、Agent、生成审核、人审闭环相关项目。', projectIds: ['legal-rag', 'pet-workspace'] },
  { key: 'fullstack', title: '全栈开发', description: '管理后台、API、数据库、队列、移动端和博客系统。', projectIds: ['ozon-erp', 'blog-semi', 'biau-playlab', 'xunqiu'] },
  { key: 'games', title: '游戏项目', description: 'Godot Web 导出、试玩入口和互动体验项目。', projectIds: ['game-first-tetris', 'game-next-spacewar', 'intespace', 'raiden-prototype', 'space-war'] },
]

function getGroupKeyByProjectId(projectId: string): ProjectGroupKey {
  return projectGroups.find((group) => group.projectIds.includes(projectId))?.key ?? 'ai'
}

const homeCaseProjectIds = ['legal-rag', 'pet-workspace', 'ozon-erp', 'blog-semi', 'game-first-tetris', 'xunqiu']

type BlogPost = {
  slug: string
  title: string
  tag: string
  detail: string
  date: string
  readTime: string
  sections: Array<{ title: string; body: string }>
  takeaways: string[]
}

const blogPosts: BlogPost[] = [
  {
    slug: 'legal-rag-review',
    title: 'Legal RAG 项目复盘',
    tag: 'AI 应用',
    detail: '复盘合同审查 RAG 从文档导入、条款切分、检索问答到风险审查的展示链路。',
    date: '2026-06-11',
    readTime: '10 min',
    sections: [
      { title: '为什么选择合同审查场景', body: '法律合同审查天然适合展示检索增强生成的价值：文本长、条款多、风险点分散，并且回答必须能追溯到来源。这个项目没有把 AI 能力停留在聊天框里，而是把文档导入、条款切分、语义检索、引用溯源和风险审查串成一条可演示的业务流程。' },
      { title: '端到端链路设计', body: 'MVP 阶段先用 Vue 工作台承载知识库、问答和审查三条路径，Express API 负责导入、chunk 查询、RAG 问答和审查接口，共享类型用于稳定前后端契约。这样项目页可以讲清楚功能边界，案例页可以讲清楚业务价值，博客则沉淀完整复盘。' },
      { title: '检索与引用溯源', body: '项目先使用 Mock Embedding 和内存向量库跑通主链路，重点验证 chunk 数据结构、召回阈值、轻量重排和 citations 返回格式。回答结果必须带引用，引用要能回到原文条款，访问者才能理解这个系统如何降低“只给结论却无法核验”的风险。' },
      { title: '风险审查与人审边界', body: '合同审查输出不只是自然语言总结，而是结构化的风险等级、问题说明、修改建议和人工复核标记。这个设计让 AI 更像业务工作台的一环：模型负责初步识别和整理，人负责最终判断，关键节点保留可审计的复核入口。' },
      { title: '展示讲述重点', body: '对外展示时重点讲“可解释闭环”：文档如何进入知识库、条款如何被切分、问题如何召回上下文、回答如何带引用、风险审查如何回到原文。后续真正产品化时，再替换真实 embedding、pgvector、PDF/DOCX parser 和队列系统。' },
    ],
    takeaways: ['先跑通可解释闭环，再替换生产级模型和存储。', 'RAG 项目的核心展示点是引用、阈值、召回质量和人工复核。', '博客文章负责沉淀项目复盘，项目页负责讲工程实现，案例页负责讲业务价值。'],
  },
  {
    slug: 'ozon-erp-architecture',
    title: 'Ozon ERP 架构整理',
    tag: '全栈开发',
    detail: '整理后台、API、Worker、插件和数据库的边界。',
    date: '2026-06-12',
    readTime: '9 min',
    sections: [
      { title: '系统边界', body: 'ERP 项目的价值在于把后台操作、API 服务、数据库模型、异步任务和浏览器插件组织成一条可追踪链路。它不是单纯的管理页面，而是把商品、订单、采集、审批、导入草稿和任务执行放进统一的运营工作台。' },
      { title: '多端协作结构', body: '前端负责高频操作和状态展示，API 负责权限、校验和数据契约，Worker 承接同步与采集类长任务，浏览器插件补齐平台侧采集能力。展示时可以把这四层拆开讲，让访问者看到每一层的职责和协作方式。' },
      { title: '数据与任务链路', body: '数据库模型用于沉淀店铺、商品、订单、导入草稿、审批动作和审计记录；队列把耗时任务从主请求链路中拆出去。这样既能解释后台为什么能保持响应，也能说明后续接入更多平台或更大数据量时的扩展路径。' },
      { title: '安全写入与审计', body: '项目中最适合公开展示的工程亮点，是写操作开关、Pending Action、审批动作和审计日志。对外介绍时不需要暴露真实店铺身份或连接细节，只需要展示“如何避免误写生产数据”和“如何追踪每一次关键操作”。' },
      { title: '展示资料沉淀', body: '项目页负责列出技术栈、模块和架构；案例页负责讲运营痛点、方案和结果；博客复盘则适合解释为什么要引入队列、插件和审计，以及这些设计如何支撑小团队的日常运营。' },
    ],
    takeaways: ['业务系统要讲清楚模块边界和数据流。', '真实写入必须有开关、审批和审计。', '插件、Worker、API 和数据库的协作是工程亮点。'],
  },
  {
    slug: 'pet-workspace-pipeline',
    title: 'Pet Workspace 生成管线复盘',
    tag: 'AI 应用',
    detail: '复盘 AI 宠物从生成任务、QA Gate、人审发布到 App API 契约的工程化链路。',
    date: '2026-06-14',
    readTime: '11 min',
    sections: [
      { title: '从单次生成到可控管线', body: '生成类项目最容易停留在“输入提示词、拿到一张图”的阶段，但真正进入应用后，重点会变成任务状态、产物结构、质量检查、人审决策和发布记录。Pet Workspace 的价值就在于把生成结果纳入可追踪流程，让每一次生成都能解释现在走到哪一步、为什么被退回、什么时候可以进入 App。' },
      { title: '工作区边界拆分', body: '项目不是单仓库展示，而是把 App-facing 工作区、服务端生成管线和 Android 验证工程分开组织。gamer 承接社区 API、审核后台、共享包和集成测试；fantasy-pet-rule 承接 Worker 编排、QA Gate、任务包和 App API 契约；移动端工程负责验证浮窗、权限、前台服务和本地消费体验。' },
      { title: 'QA Gate 与人审发布', body: 'AI 生成输出不能直接发布到应用，需要先经过自动检查，再进入人工视觉复核。这里的 QA Gate 不是为了替代人工判断，而是把明显不合格、结构缺失或流程异常的结果提前挡住，让人审只处理真正值得看的候选。最终发布记录则负责证明资产从生成到上架经过了可审计路径。' },
      { title: 'App API 契约的意义', body: 'App 侧不应该理解生成管线内部细节，只需要拿到稳定的响应结构、资源索引和状态字段。通过契约把生成服务和移动端解耦，后续更换模型、调整 Worker、增加审核阶段或迁移存储，都不会直接破坏 App 展示层。' },
      { title: '公开展示取舍', body: '对外展示时不需要暴露真实云端地址、任务 JSON、模型配置或候选素材来源，只需要讲清楚“任务如何创建、质量如何判断、人工如何接管、结果如何进入 App”。这样既能展示 AI 工程化能力，也能把敏感实现边界留在私有环境中。' },
    ],
    takeaways: ['AI 生成项目要证明的是流程可控，而不只是生成效果。', 'QA Gate、人审和发布记录共同构成资产进入 App 的安全边界。', 'App API 契约可以把生成管线和移动端体验解耦。'],
  },
  {
    slug: 'xunqiu-android64-rebuild',
    title: '寻球 64 位客户端重构复盘',
    tag: '移动端',
    detail: '复盘历史移动业务系统接手、接口复用、64 位兼容和阶段验收的整理路径。',
    date: '2026-06-15',
    readTime: '10 min',
    sections: [
      { title: '历史项目接手的第一步', body: '这类项目的难点通常不是“缺一个页面”，而是旧客户端、服务端、后台资料、发布包和第三方 SDK 交织在一起。接手时先要建立项目地图：哪些模块还能复用，哪些能力只能作为参照，哪些配置不能公开，哪些功能需要用新客户端重新承接。' },
      { title: '为什么选择新建 64 位客户端', body: '旧 Android 工程被多个 32 位 native 依赖和历史 SDK 绑定，继续硬改容易陷入二进制缺失、运行时加载失败和兼容性连锁问题。更稳的路线是新建 64 位兼容客户端，第一版不引入旧 native 包，只复用服务端接口和必要 Web 页面，把核心登录、动态、社区、赛事、商品和个人中心逐步接回来。' },
      { title: '接口复用与页面恢复', body: '新客户端的核心不是一次性复刻全部旧功能，而是先封装登录态、请求客户端、返回模型和公共 UI 工具，再按业务优先级恢复页面。这样旧接口仍然可以作为业务能力来源，但公开展示时只讲协议复用和模块边界，不暴露真实服务地址、访问凭据或部署细节。' },
      { title: '验收证据怎么沉淀', body: '历史系统重构需要证明每一步都能复现：项目清单说明接手范围，重构计划说明技术路线，阶段构建说明可运行状态，模拟器和真机检查说明移动端行为。比起只放最终截图，这些过程证据更能说明迁移不是临时拼接，而是可控推进。' },
      { title: '公开展示取舍', body: '这个案例适合展示历史系统整理能力、移动端兼容策略和阶段验收方法，不适合公开私有服务信息、访问凭据、签名材料、发布校验信息或完整接口清单。站点内容只保留抽象后的模块地图、重构思路和脱敏运行证据。' },
    ],
    takeaways: ['历史项目接手先建地图，再谈重构。', '64 位迁移可以通过新客户端绕开旧 native 依赖阻塞。', '阶段验收文档比单张截图更能证明重构路径可靠。'],
  },
  {
    slug: 'game-showcase-standard',
    title: '游戏项目展示规范',
    tag: '游戏项目',
    detail: '统一试玩入口、封面图、操作说明和导出流程。',
    date: '2026-06-13',
    readTime: '8 min',
    sections: [
      { title: '为什么需要展示规范', body: '游戏项目如果只放源码，访问者很难理解玩法循环。展示页需要明确项目定位、玩法目标、操作方式、版本状态、截图证据和试玩入口，让一个原型也能被当作完整体验来理解。' },
      { title: '项目详情与试玩入口分层', body: '站点里的项目详情负责讲技术实现、工程结构和导出方式；游戏展示页负责讲玩法、系统、操作和可玩状态。两者保持分层，可以避免详情页堆太多素材，也方便后续替换 Web 试玩包。' },
      { title: '截图与证据组织', body: '每个游戏至少需要封面图、核心玩法截图、结果页或关卡截图，以及版本说明。对外展示时，截图不只是装饰，而是证明项目已经具备可运行路径、可交互反馈和明确完成状态的证据。' },
      { title: 'Godot Web 导出节奏', body: '展示系统先保留独立游戏路由和静态说明，再逐步接入 Godot Web 导出包、加载状态、操作提示和版本记录。这样即使某个试玩包暂时未上线，页面也能完整说明当前阶段和后续接入计划。' },
      { title: '下一步迭代方向', body: '后续可以把五个游戏统一成“封面、玩法、系统、操作、试玩、版本记录”的内容模型，再按项目成熟度展示不同状态：原型验证、展示构建、可试玩版本和发布版本。' },
    ],
    takeaways: ['每个游戏要有独立入口和清晰状态。', '试玩包和项目说明保持解耦。', '截图、版本记录和操作说明能让原型更像产品。'],
  },
]

type CaseStudy = {
  id: string
  projectId: string
  title: string
  eyebrow: string
  status: string
  summary: string
  outcome: string
  challenge: string
  solution: string
  results: string[]
  evidence: string[]
  architecture: Array<{ title: string; detail: string }>
  talkingPoints: string[]
}

const caseStudies: CaseStudy[] = [
  {
    id: 'legal-rag',
    projectId: 'legal-rag',
    title: '法律智能机器人与合同审查 RAG 应用',
    eyebrow: 'AI 应用 / 合同审查',
    status: '重点案例',
    summary: '把合同导入、条款切分、语义检索、引用溯源和风险审查串成一个可演示的 RAG MVP。',
    outcome: '可解释的合同审查闭环',
    challenge: '法律场景不能只给模型结论，需要让回答和审查结果能追溯到原文条款，同时保证没有真实模型 key 和数据库时也能稳定演示。',
    solution: '项目采用 Vue 3 工作台 + Express API + shared types 的 monorepo 结构，抽象 embedding provider 和 vector store，用 Mock Embedding 与内存向量库跑通导入、检索、问答、审查和 citations。',
    results: ['文档 SHA-256 去重，避免重复入库影响检索质量', 'section-aware chunk 保留条款来源和 chunk index', 'RAG 问答返回 answer + citations，支持人工复核', '合同审查输出风险等级、问题说明、修改建议和是否需要人工复核'],
    evidence: ['知识库导入页面', '引用溯源问答页面', '合同风险审查工作台'],
    architecture: [
      { title: 'Vue 工作台', detail: '知识库、智能问答、合同审查三条演示流程。' },
      { title: 'Express API', detail: '暴露文档导入、chunk 查询、RAG 问答和合同审查接口。' },
      { title: 'RAG 管线', detail: '清洗、切分、embedding、召回、阈值过滤、轻量 rerank、引用返回。' },
      { title: '可替换边界', detail: 'Mock provider 与 MemoryVectorStore 后续可替换 OpenAI embeddings、pgvector、PDF/DOCX parser 和 BullMQ。' },
    ],
    talkingPoints: ['项目重点是把 AI 能力落到可解释业务流程，而不是简单聊天。', 'MVP 用 mock embedding 保证本地可演示，同时保留生产替换边界。', '引用溯源和结构化 schema 是降低法律场景幻觉风险的关键。'],
  },
  {
    id: 'ozon-erp',
    projectId: 'ozon-erp',
    title: 'Ozon 电商 ERP 业务系统',
    eyebrow: '全栈开发 / 电商运营',
    status: '整理中',
    summary: '围绕店铺授权、商品同步、采集铺货、审批动作、任务队列和审计日志组织的后台系统。',
    outcome: '多端协作的电商运营后台',
    challenge: '电商运营链路横跨后台、API、数据库、任务队列和浏览器插件；真实写入还需要安全开关、审批记录和可回滚的交付流程。',
    solution: '项目采用 Vue 管理后台、Express API、Prisma/PostgreSQL、Redis/BullMQ Worker、WXT/MV3 插件和 shared types，写操作通过 PendingAction 与审计日志沉淀可追踪链路。',
    results: ['后台覆盖商品、订单、店铺、工具和设置等模块', '插件支持采集商品并进入草稿/铺货流程', '同步和写入任务可在直写与队列模式之间切换', '交付文档覆盖本地 Docker、数据库迁移和容器云部署'],
    evidence: ['管理后台视图目录', 'Prisma 数据模型', 'Chrome MV3 插件入口', '部署与交付文档'],
    architecture: [
      { title: '管理后台', detail: 'Vue/Vite 承载商品、订单、店铺、审批中心和工具页面。' },
      { title: '服务端 API', detail: 'Express + Prisma 处理业务校验、数据持久化和 Ozon API 适配。' },
      { title: '异步任务', detail: 'Redis/BullMQ Worker 用于同步、采集、导入导出等长流程。' },
      { title: '浏览器插件', detail: 'WXT/MV3 插件承接采集铺货与平台侧辅助能力。' },
    ],
    talkingPoints: ['这个项目适合展示全栈业务系统的模块拆分和交付能力。', '真实写入默认需要显式开关，适合讲安全边界和操作审计。', '插件、Worker、API、后台之间的协作是核心工程亮点。'],
  },
  {
    id: 'pet-workspace',
    projectId: 'pet-workspace',
    title: 'Pet Workspace AI 生成与审核管线',
    eyebrow: 'AI 应用 / 生成管线',
    status: '补充中',
    summary: '围绕 AI 宠物生成、Worker 编排、QA Gate、人审发布、Android 联调和 App API 契约组织的项目工作区。',
    outcome: 'AI 生成资产进入 App 的工程闭环',
    challenge: '生成类项目容易停留在单次出图，真正落到应用里需要任务状态、素材验证、人工审核、发布记录和移动端消费协议。',
    solution: '工作区按 app-facing 的 gamer 与服务端 fantasy-pet-rule 分边界，生成管线负责 worker orchestration、server-side QA gates 和 public app API contract，Android 侧验证桌宠/社区集成。',
    results: ['生成任务、审核、发布拆成可追踪阶段', '服务端工具覆盖任务包、审核决策、运行摘要和资产校验', 'Android 桌宠实验验证悬浮窗、前台服务和本地证明链', '本地容器替代环境用于稳定联调社区 API'],
    evidence: ['fantasy-pet-rule 工具链', 'gamer app-facing 集成目录', 'Android 浮窗宠物 MVP', '生成产物与审核截图'],
    architecture: [
      { title: 'App 边界', detail: 'gamer 承载社区 API、管理审核 UI、App shared packages 和集成测试。' },
      { title: '生成服务', detail: 'fantasy-pet-rule 承载 worker 编排、生成管线和服务端 QA gates。' },
      { title: '审核发布', detail: '生成结果经过质量检查、人审决策和发布记录后再进入 App 展示。' },
      { title: '移动端验证', detail: 'Android 浮窗宠物和社区 API 用于验证 App 侧消费体验。' },
    ],
    talkingPoints: ['项目亮点是 AI 生成工程化，而不是单次素材生成。', '通过 QA Gate 和人审发布，把不稳定生成结果变成可控流程。', 'App API 契约让生成服务与移动端解耦。'],
  },
  {
    id: 'xunqiu',
    projectId: 'xunqiu',
    title: '寻球移动端业务系统重构案例',
    eyebrow: '移动端 / 历史系统接手',
    status: '补充中',
    summary: '围绕历史多端业务系统，梳理服务端接口复用、Android 64 位新客户端、动态/短视频/赛事日程等模块恢复和阶段验收。',
    outcome: '历史移动业务系统的可接手重构路径',
    challenge: '历史项目同时包含旧移动端、服务端接口、后台资料和发布包记录，接手时需要在不暴露私有配置和真实数据的前提下，说明如何拆模块、复用接口、完成 64 位兼容并沉淀验收证据。',
    solution: '以新 64 位 Android 客户端作为主线，保留旧工程作为功能参照，把登录态、接口请求、页面模块、短视频体验和发布验证拆成阶段任务；服务端只作为接口复用边界公开说明，不展示私有配置。',
    results: ['新客户端不引入旧 32 位 native 依赖，聚焦 64 位兼容骨架', '按首页、动态、社区、日程、赛事、商品、个人和短视频等模块拆分恢复', '封装登录态、接口请求、后台任务和公共 UI 工具，降低历史接口接入成本', '通过阶段构建、模拟器/真机检查和脱敏文档沉淀接手验收证据'],
    evidence: ['64 位客户端模块地图', '服务端接口复用边界', '阶段迁移流程图', '验收链路图'],
    architecture: [
      { title: '新 64 位客户端', detail: '以轻量入口和原生页面模块承接登录、动态、视频、赛事、日程、商品和个人中心。' },
      { title: '接口复用层', detail: '通过接口封装与登录态模型隔离旧服务端能力，公开展示只讲协议复用，不暴露服务地址或登录凭据。' },
      { title: '历史系统边界', detail: '旧移动端、Java 服务端和后台/H5 作为业务范围参照，重构时按模块分阶段接回。' },
      { title: '验收链路', detail: '通过构建检查、模拟器/真机验证、发布清单和问题记录证明迁移过程可复现。' },
    ],
    talkingPoints: ['这个案例适合展示历史项目接手、梳理和分阶段重构能力。', '讲述重点不是炫功能数量，而是如何在旧接口和新客户端之间建立安全边界。', '64 位兼容、模块恢复和验收证据能体现移动端工程交付经验。'],
  },
  {
    id: 'godot-showcase',
    projectId: 'game-first-tetris',
    title: 'Godot Web 游戏展示体系',
    eyebrow: '游戏项目 / 互动体验',
    status: '补充中',
    summary: '把 Tetris、Spacewar、InteSpace、Raiden Prototype、Space War 等 Godot 项目整理成可试玩、可说明、可回归的展示体系。',
    outcome: '多款互动项目的统一展示规范',
    challenge: '游戏项目如果只放源码很难被快速理解，需要让访问者看到玩法循环、操作方式、版本阶段、截图证据和 Web 试玩入口。',
    solution: '项目统一按 Godot 工程、场景、脚本、文档、导出预设和验证日志组织，页面侧按玩法类型拆成可浏览的项目详情，并保留外部试玩跳转。',
    results: ['Tetris 已具备经典模式、Rogue 原型、触屏桥接和多尺寸回归', 'Spacewar 展示版包含主菜单、设置、Help、暂停、结果页和会话总结', 'Raiden Prototype 形成双关垂直切片、Boss、章节过场和公开演示准备文档', 'Space War 保留复古横向射击、Sector/Boss、程序化音效和发布文档'],
    evidence: ['Godot project.godot 与 export_presets', 'scenes/scripts/assets 目录结构', 'README 与阶段文档', '验证日志与发布包目录'],
    architecture: [
      { title: 'Godot 工程', detail: '每个游戏保留 project.godot、scenes、scripts、assets 和 docs。' },
      { title: '玩法闭环', detail: '围绕主菜单、战斗/操作、暂停、结算、重开和帮助入口组织体验。' },
      { title: 'Web 展示', detail: '通过 Web 导出或站点跳转，把游戏作为可体验项目而非静态说明。' },
      { title: '回归验证', detail: '使用固定尺寸、headless、自检脚本或人工回归记录沉淀质量。' },
    ],
    talkingPoints: ['游戏项目更适合讲“从原型到可展示版本”的过程。', 'Godot 项目结构、导出预设和回归日志能体现工程化习惯。', '案例页讲统一展示规范，项目详情页分别讲每个游戏的玩法和实现。'],
  },
]

function getCaseStudyForProject(projectId: string) {
  return caseStudies.find((caseStudy) => caseStudy.projectId === projectId)
}

function App() {
  const [activeView, setActiveView] = useState<ViewKey>(() => getViewFromPath(window.location.pathname))
  const [selectedId, setSelectedId] = useState(() => getProjectIdFromPath(window.location.pathname) ?? getGameProjectIdFromPath(window.location.pathname) ?? projects[0].id)
  const [selectedCaseId, setSelectedCaseId] = useState(() => getCaseIdFromPath(window.location.pathname) ?? caseStudies[0].id)
  const [selectedBlogSlug, setSelectedBlogSlug] = useState(() => getBlogSlugFromPath(window.location.pathname) ?? blogPosts[0].slug)
  const [siteTheme, setSiteTheme] = useState<SiteTheme>('light')
  const [siteLanguage, setSiteLanguage] = useState<SiteLanguage>('zh')

  const selectedProject = projects.find((project) => project.id === selectedId) ?? projects[0]
  const selectedCase = caseStudies.find((caseStudy) => caseStudy.id === selectedCaseId) ?? caseStudies[0]
  const selectedBlogPost = blogPosts.find((post) => post.slug === selectedBlogSlug) ?? blogPosts[0]

  useEffect(() => {
    const handlePopState = () => {
      const nextProjectId = getProjectIdFromPath(window.location.pathname)
      const nextGameProjectId = getGameProjectIdFromPath(window.location.pathname)
      const nextCaseId = getCaseIdFromPath(window.location.pathname)
      const nextBlogSlug = getBlogSlugFromPath(window.location.pathname)
      if (nextProjectId) setSelectedId(nextProjectId)
      if (nextGameProjectId) setSelectedId(nextGameProjectId)
      if (nextCaseId) setSelectedCaseId(nextCaseId)
      if (nextBlogSlug) setSelectedBlogSlug(nextBlogSlug)
      setActiveView(getViewFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (view: NavViewKey) => {
    const nextPath = routeByView[view]
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
    setActiveView(view)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openProject = (project: Project) => {
    setSelectedId(project.id)
    navigate('projects')
  }

  const openProjectDetail = (project: Project) => {
    const nextPath = `/projects/${project.id}`
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
    setSelectedId(project.id)
    setActiveView('projectDetail')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openGameDetail = (project: Project) => {
    const gameSlug = getGameSlugByProjectId(project.id)
    if (!gameSlug) return
    const nextPath = `/games/${gameSlug}`
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
    setSelectedId(project.id)
    setActiveView('gameDetail')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openCaseDetail = (caseStudy: CaseStudy) => {
    const nextPath = `/cases/${caseStudy.id}`
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
    setSelectedCaseId(caseStudy.id)
    setActiveView('caseDetail')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openBlogPost = (post: BlogPost) => {
    const nextPath = `/blogs/${post.slug}`
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
    setSelectedBlogSlug(post.slug)
    setActiveView('blogDetail')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`site-shell site-theme-${siteTheme} ${(activeView === 'blog' || activeView === 'blogDetail') ? 'is-blog-page' : ''}`}>
      <header className="site-header">
        <button className="brand" type="button" onClick={() => navigate('home')} aria-label="返回首页">
          <span>BL</span>
          <strong>Biau Labs</strong>
        </button>

        <nav className="site-nav" aria-label="主导航">
          {navItems.map((item) => (
            <button key={item.key} className={(activeView === item.key || (activeView === 'caseDetail' && item.key === 'cases') || ((activeView === 'projectDetail' || activeView === 'gameDetail') && item.key === 'projects') || (activeView === 'blogDetail' && item.key === 'blog')) ? 'is-active' : ''} type="button" onClick={() => navigate(item.key)}>
              {item.icon}
              {item.label[siteLanguage]}
            </button>
          ))}
        </nav>

        <div className="site-header-actions">
          <LanguageToggle language={siteLanguage} onChange={setSiteLanguage} />
          <ThemeToggle theme={siteTheme} onChange={setSiteTheme} />
        </div>
      </header>

      <main className="site-main">
        {activeView === 'home' ? <HomeView onOpenCase={openCaseDetail} onOpenProject={openProject} /> : null}
        {activeView === 'projects' ? <ProjectsView onOpenCase={openCaseDetail} onOpenGameDetail={openGameDetail} onOpenProjectDetail={openProjectDetail} selectedProject={selectedProject} onSelectProject={setSelectedId} /> : null}
        {activeView === 'projectDetail' ? <ProjectFullDetailView onBack={() => navigate('projects')} onOpenCase={openCaseDetail} onOpenGameDetail={openGameDetail} project={selectedProject} /> : null}
        {activeView === 'gameDetail' ? <GameShowcaseView onBack={() => navigate('projects')} onOpenProjectDetail={openProjectDetail} project={selectedProject} /> : null}
        {activeView === 'cases' ? <CasesView onOpenCase={openCaseDetail} onOpenProjectDetail={openProjectDetail} /> : null}
        {activeView === 'caseDetail' ? <CaseDetailView caseStudy={selectedCase} onBack={() => navigate('cases')} onOpenProject={(project) => openProjectDetail(project)} /> : null}
        {activeView === 'blog' ? <BlogView onOpenPost={openBlogPost} theme={siteTheme} /> : null}
        {activeView === 'blogDetail' ? <BlogArticleView onBack={() => navigate('blog')} post={selectedBlogPost} theme={siteTheme} /> : null}
      </main>

      <footer className="site-footer">
        <span>Biau Labs</span>
        <span>React + Semi Design 博客系统</span>
        <span>© 2026</span>
      </footer>
    </div>
  )
}

function ThemeToggle({ onChange, theme }: { onChange: (theme: SiteTheme) => void; theme: SiteTheme }) {
  const isDark = theme === 'dark'

  return (
    <div className="site-theme-toggle" role="group" aria-label="全站主题切换">
      <button className={!isDark ? 'is-active' : ''} type="button" onClick={() => onChange('light')}>浅色</button>
      <button className={isDark ? 'is-active' : ''} type="button" onClick={() => onChange('dark')}>暗色</button>
    </div>
  )
}

function LanguageToggle({ language, onChange }: { language: SiteLanguage; onChange: (language: SiteLanguage) => void }) {
  return (
    <div className="site-theme-toggle site-language-toggle" role="group" aria-label="全站语言切换">
      <button className={language === 'zh' ? 'is-active' : ''} type="button" onClick={() => onChange('zh')}>中文</button>
      <button className={language === 'en' ? 'is-active' : ''} type="button" disabled title="英文版内容整理中">EN</button>
    </div>
  )
}

function HomeView({ onOpenCase, onOpenProject }: { onOpenCase: (caseStudy: CaseStudy) => void; onOpenProject: (project: Project) => void }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [activeHomeGroup, setActiveHomeGroup] = useState<ProjectGroupKey>('ai')
  const slide = heroSlides[activeSlide]
  const slideProject = projects.find((project) => project.id === slide.id) ?? projects[0]
  const activeGroup = projectGroups.find((group) => group.key === activeHomeGroup) ?? projectGroups[0]
  const activeProjects = activeGroup.projectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is Project => Boolean(project))
  const caseProjects = homeCaseProjectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is Project => Boolean(project))

  return (
    <div className="home-page">
      <section className="semi-hero-carousel">
        <div className="hero-copy">
          <Text type="tertiary">AI applications, full-stack systems and playable web projects</Text>
          <Title className="hero-title-lines" heading={1}><span>真实项目</span><span>展示系统</span></Title>
          <Paragraph>
            参考 Semi Design 的首页节奏，用更大的首屏、更明确的项目运行图和更清晰的分类，把已有项目组织成可展示、可学习、可部署的博客系统。
          </Paragraph>
          <Space wrap>
            <Button theme="solid" type="primary" icon={<IconApps />} onClick={() => onOpenProject(slideProject)}>
              查看当前项目
            </Button>
            <Button onClick={() => setActiveSlide((activeSlide + 1) % heroSlides.length)}>下一张</Button>
          </Space>
          <div className="tech-row" aria-label="技术栈">
            <span>React</span>
            <span>Vite</span>
            <span>Semi</span>
            <span>Astro</span>
            <span>Godot</span>
          </div>
        </div>

        <div className="hero-carousel-stage" aria-label="项目运行图轮播">
          <div className="carousel-window">
            <img src={slide.image} alt={slide.title} />
            <div className="carousel-caption">
              <Text type="tertiary">{slide.subtitle}</Text>
              <strong>{slide.title}</strong>
              <span>{slide.description}</span>
            </div>
          </div>
          <div className="carousel-dots" role="tablist" aria-label="选择项目运行图">
            {heroSlides.map((item, index) => (
              <button key={item.id} className={activeSlide === index ? 'is-active' : ''} type="button" onClick={() => setActiveSlide(index)}>
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="home-project-showcase">
        <div className="home-section-title is-centered">
          <Text type="tertiary">项目分类</Text>
          <Title heading={2}>三类项目方向</Title>
          <Paragraph>用标签切换把项目能力组织成 AI 应用、全栈开发和游戏项目三条主线，先给方向，再进入具体案例。</Paragraph>
        </div>

        <div className="home-category-tabs" role="tablist" aria-label="首页项目分类">
          {projectGroups.map((group) => (
            <button key={group.key} className={activeHomeGroup === group.key ? 'is-active' : ''} type="button" onClick={() => setActiveHomeGroup(group.key)}>
              <strong>{group.title}</strong>
              <span>{group.description}</span>
            </button>
          ))}
        </div>

        <div className="home-project-panel">
          <div className="panel-window-bar" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="home-panel-layout">
            <aside className="home-panel-sidebar">
              <Text type="tertiary">当前方向</Text>
              <Title heading={3}>{activeGroup.title}</Title>
              <Paragraph>{activeGroup.description}</Paragraph>
              <div className="panel-metrics">
                <div>
                  <strong>{activeProjects.length}</strong>
                  <span>项目数量</span>
                </div>
                <div>
                  <strong>{activeGroup.key === 'ai' ? 'RAG' : activeGroup.key === 'fullstack' ? 'API' : 'Web'}</strong>
                  <span>核心关键词</span>
                </div>
              </div>
            </aside>

            <div className="home-panel-main">
              <div className="panel-section-head">
                <div>
                  <Text type="tertiary">精选项目</Text>
                  <Title heading={3}>{activeGroup.title}项目清单</Title>
                </div>
                <Button theme="solid" type="primary" onClick={() => onOpenProject(activeProjects[0] ?? projects[0])}>进入项目页</Button>
              </div>

              <div className="home-project-grid">
                {activeProjects.map((project) => (
                  <HomeProjectCard key={project.id} project={project} onOpen={() => onOpenProject(project)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-case-matrix-section">
        <div className="home-section-title is-centered">
          <Text type="tertiary">案例总览</Text>
          <Title heading={2}>案例矩阵</Title>
          <Paragraph>把重点项目压缩成可浏览的案例入口，每个案例保留真实项目名、方向标签、技术栈和跳转动作。</Paragraph>
        </div>

        <div className="case-matrix-grid">
          {caseProjects.map((project, index) => (
            <article key={project.id} className={index === 0 ? 'case-matrix-card is-featured' : 'case-matrix-card'}>
              <span className="section-pill">{categoryLabels[project.category]}</span>
              <Title heading={3}>{project.title}</Title>
              <Paragraph>{project.summary}</Paragraph>
              <div className="case-matrix-meta">
                {project.stack.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
              </div>
              <Button theme="light" type="primary" onClick={() => {
                const projectCase = getCaseStudyForProject(project.id)
                if (projectCase) onOpenCase(projectCase)
                else onOpenProject(project)
              }}>查看案例</Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function ProjectsView({ onOpenCase, onOpenGameDetail, onOpenProjectDetail, onSelectProject, selectedProject }: { onOpenCase: (caseStudy: CaseStudy) => void; onOpenGameDetail: (project: Project) => void; onOpenProjectDetail: (project: Project) => void; onSelectProject: (id: string) => void; selectedProject: Project }) {
  const [activeGroup, setActiveGroup] = useState<ProjectGroupKey>(() => getGroupKeyByProjectId(selectedProject.id))
  const currentGroup = projectGroups.find((group) => group.key === activeGroup) ?? projectGroups[0]
  const groupedProjects = useMemo(
    () => currentGroup.projectIds.map((id) => projects.find((project) => project.id === id)).filter((project): project is Project => Boolean(project)),
    [currentGroup],
  )

  const detailProject = groupedProjects.find((project) => project.id === selectedProject.id) ?? groupedProjects[0] ?? selectedProject

  return (
    <div className="project-page">
      <section className="project-hero">
        <Text type="tertiary">项目总览</Text>
        <Title heading={1}>项目系统</Title>
        <Paragraph>按 AI 应用、全栈开发和游戏项目三条能力线组织项目，让访问者第一屏就能看到主体展示、项目截图、技术栈和可跳转入口。</Paragraph>
      </section>

      <section className="project-stage">
        <div className="project-stage-head">
          <div>
            <span className="section-pill">项目分类</span>
            <Title heading={2}>{currentGroup.title}展示台</Title>
            <Paragraph>{currentGroup.description}</Paragraph>
          </div>

          <div className="project-tab-strip" role="tablist" aria-label="项目分类">
            {projectGroups.map((group) => (
              <button key={group.key} className={activeGroup === group.key ? 'is-active' : ''} type="button" onClick={() => { setActiveGroup(group.key); onSelectProject(group.projectIds[0]) }}>
                <strong>{group.title}</strong>
                <span>{group.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="project-stage-main">
          <div className="project-stage-preview">
            <div className="project-stage-frame">
              <div className="panel-window-bar" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="project-stage-screen">
                {detailProject.image ? <img src={detailProject.image} alt={detailProject.title} loading="lazy" /> : <span>{categoryLabels[detailProject.category]}</span>}
              </div>
              <div className="project-preview-caption">
                <div>
                  <Text type="tertiary">当前选择</Text>
                  <strong>{detailProject.title}</strong>
                </div>
                <Tag color={detailProject.status === 'main' ? 'red' : detailProject.status === 'live' ? 'green' : detailProject.status === 'pending' ? 'grey' : 'orange'}>{statusLabels[detailProject.status]}</Tag>
              </div>
            </div>
          </div>

          <ProjectDetail project={detailProject} onOpenCase={onOpenCase} onOpenGameDetail={() => onOpenGameDetail(detailProject)} onOpenProjectDetail={() => onOpenProjectDetail(detailProject)} />
        </div>

        <div className="project-thumb-strip" aria-label={`${currentGroup.title}项目列表`}>
          {groupedProjects.map((project) => {
            const projectCase = getCaseStudyForProject(project.id)

            return (
              <article
                key={project.id}
                className={detailProject.id === project.id ? 'project-thumb-card is-active' : 'project-thumb-card'}
                role="button"
                tabIndex={0}
                onClick={() => onSelectProject(project.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectProject(project.id)
                }}
              >
                {detailProject.id === project.id ? <b className="project-selected-badge">当前选择</b> : null}
                <span>{categoryLabels[project.category]}</span>
                <strong>{project.title}</strong>
                <em>{project.summary}</em>
                <Space wrap>
                  <Button size="small" theme="light" type="primary" onClick={(event) => { event.stopPropagation(); onSelectProject(project.id) }}>列表预览</Button>
                  <Button size="small" theme="solid" type="primary" onClick={(event) => { event.stopPropagation(); onOpenProjectDetail(project) }}>技术详情页</Button>
                  {projectCase ? <Button size="small" onClick={(event) => { event.stopPropagation(); onOpenCase(projectCase) }}>业务案例</Button> : null}
                </Space>
              </article>
            )
          })}
        </div>

        <ProjectNarrative project={detailProject} onOpenCase={() => {
          const projectCase = getCaseStudyForProject(detailProject.id)
          if (projectCase) onOpenCase(projectCase)
        }} onOpenGameDetail={() => onOpenGameDetail(detailProject)} onOpenProjectDetail={() => onOpenProjectDetail(detailProject)} />
      </section>
    </div>
  )
}

function getTagColor(label: string) {
  if (label.includes('AI')) return 'cyan'
  if (label.includes('全栈')) return 'blue'
  if (label.includes('游戏')) return 'purple'
  return 'grey'
}

function CasesView({ onOpenCase, onOpenProjectDetail }: { onOpenCase: (caseStudy: CaseStudy) => void; onOpenProjectDetail: (project: Project) => void }) {
  const featuredCase = caseStudies[0]
  const featuredProject = projects.find((entry) => entry.id === featuredCase.projectId) ?? projects[0]
  const secondaryCases = caseStudies.slice(1)

  return (
    <div className="resource-page">
      <section className="resource-hero">
        <Text type="tertiary">案例总览</Text>
        <Title heading={1}>案例中心</Title>
        <Paragraph>参考成熟官网的客户案例结构，案例页只讲业务场景、解决方案、交付结果和证据材料；工程细节统一跳转到独立项目详情页。</Paragraph>
      </section>

      <section className="case-matrix-board">
        <div className="case-board-head">
          <div>
            <span className="section-pill">案例库</span>
            <Title heading={2}>按落地故事组织案例</Title>
            <Paragraph>每个案例都遵循“问题、方案、结果”的结构：先讲为什么做，再讲怎么交付，最后给截图、架构和展示讲解入口。</Paragraph>
          </div>
          <div className="case-board-stats" aria-label="案例统计">
            <span>场景</span>
            <span>方案</span>
            <span>结果</span>
            <span>证据</span>
          </div>
        </div>

        <div className="case-showcase-layout">
          <article className="case-featured-card">
            <div className="case-featured-media">
              {featuredProject.image ? <img src={featuredProject.image} alt={featuredCase.title} loading="lazy" /> : <span>{categoryLabels[featuredProject.category]}</span>}
            </div>
            <div className="case-featured-body">
              <div className="case-card-tags">
                <Tag color={getTagColor(featuredCase.eyebrow)}>{featuredCase.eyebrow}</Tag>
                <Tag color="green">{featuredCase.status}</Tag>
              </div>
              <Title heading={3}>{featuredCase.title}</Title>
              <Paragraph>{featuredCase.summary}</Paragraph>
              <div className="case-outcome-box">
                <Text type="tertiary">案例成果</Text>
                <strong>{featuredCase.outcome}</strong>
              </div>
              <Space wrap>
                <Button theme="solid" type="primary" onClick={() => onOpenCase(featuredCase)}>打开业务案例详情</Button>
                <Button onClick={() => onOpenProjectDetail(featuredProject)}>打开项目技术详情</Button>
              </Space>
            </div>
          </article>

          <aside className="case-guide-card">
            <span className="section-pill">案例内容</span>
            <Title heading={3}>案例页推荐放什么</Title>
            <div>
              <strong>场景</strong>
              <p>为什么要做这个项目，解决谁的什么问题。</p>
            </div>
            <div>
              <strong>证据</strong>
              <p>运行截图、关键流程、输入输出和真实页面。</p>
            </div>
            <div>
              <strong>讲法</strong>
              <p>对外展示时如何讲业务价值、技术取舍和后续扩展。</p>
            </div>
          </aside>
        </div>

        <div className="case-secondary-grid">
          {secondaryCases.map((caseStudy) => {
            const project = projects.find((entry) => entry.id === caseStudy.projectId) ?? projects[0]

            return (
              <article key={caseStudy.id} className="case-secondary-card">
                <div>
                  <Tag color={getTagColor(caseStudy.eyebrow)}>{caseStudy.eyebrow}</Tag>
                  <Tag color={caseStudy.status === '整理中' ? 'blue' : caseStudy.status === '补充中' ? 'orange' : 'grey'}>{caseStudy.status}</Tag>
                </div>
                <Title heading={4}>{caseStudy.title}</Title>
                <Paragraph>{caseStudy.summary}</Paragraph>
                <span>{caseStudy.outcome}</span>
                <Space wrap>
                  <Button theme="solid" type="primary" onClick={() => onOpenCase(caseStudy)}>打开业务案例详情</Button>
                  <Button theme="light" type="primary" onClick={() => onOpenProjectDetail(project)}>打开技术详情页</Button>
                </Space>
              </article>
            )
          })}
        </div>

        <div className="case-route-strip">
          <div>
            <strong>01</strong>
            <span>补运行截图和核心流程</span>
          </div>
          <div>
            <strong>02</strong>
            <span>补架构图、技术栈和数据流</span>
          </div>
          <div>
            <strong>03</strong>
            <span>沉淀博客复盘和演示入口</span>
          </div>
        </div>
      </section>
    </div>
  )
}

function ProjectNarrative({ onOpenCase, onOpenGameDetail, onOpenProjectDetail, project }: { onOpenCase: () => void; onOpenGameDetail: () => void; onOpenProjectDetail: () => void; project: Project }) {
  const isLegalRag = project.id === 'legal-rag'
  const projectCase = getCaseStudyForProject(project.id)
  const gameSlug = getGameSlugByProjectId(project.id)
  const narrative = isLegalRag
    ? {
        title: '项目完整介绍',
        paragraphs: [
          '这个项目是一个面向合同审查的 RAG 全栈 MVP。项目页保留摘要和展示入口，完整技术栈、实现方式、功能模块和工程拆解放到独立项目详情页。',
          '案例页则进一步讲清楚业务场景、截图证据和展示讲解口径，避免和项目详情页重复。',
        ],
        outcome: '完整闭环：文档导入 + RAG 问答 + 合同审查 + citations',
      }
    : {
        title: '项目完整介绍',
        paragraphs: [
          `${project.title} 当前用于展示 ${project.role} 方向的工程能力。项目页这里保留摘要和入口，完整技术栈、实现方式和功能模块放到独立项目详情页。`,
          '如果项目需要对外讲述，再在案例页补充业务场景、运行截图、架构图和复盘内容。',
        ],
        outcome: project.highlights.join(' / '),
      }

  return (
    <section className="project-narrative-panel">
      <div>
        <span className="section-pill">项目简述</span>
        <Title heading={3}>{narrative.title}</Title>
      </div>
      <div className="project-narrative-content">
        {narrative.paragraphs.map((item) => <Paragraph key={item}>{item}</Paragraph>)}
      </div>
      <div className="project-narrative-footer">
        <div>
          <Text type="tertiary">核心成果</Text>
          <strong>{narrative.outcome}</strong>
        </div>
        <Space wrap>
          <Button theme="solid" type="primary" onClick={onOpenProjectDetail}>打开技术详情页</Button>
          {projectCase ? <Button onClick={onOpenCase}>打开业务案例</Button> : null}
          {gameSlug ? <Button onClick={onOpenGameDetail}>打开试玩展示</Button> : null}
        </Space>
      </div>
    </section>
  )
}

type ProjectDetailContent = {
  subtitle: string
  overview: string
  modules: Array<{ title: string; detail: string }>
  implementation: string[]
  evidence?: Array<{ title: string; detail: string }>
  nextSteps: string[]
}

function getProjectStructure(project: Project): Array<{ title: string; detail: string }> {
  const structures: Record<string, Array<{ title: string; detail: string }>> = {
    'legal-rag': [
      { title: 'apps/web', detail: 'Vue 3 + Vite 前端工作台，承载合同导入、知识库、RAG 问答和合同审查结果展示。' },
      { title: 'apps/api', detail: 'Express + TypeScript API，负责导入、去重、切分、检索、重排、问答和审查接口。' },
      { title: 'packages/shared', detail: '沉淀前后端共享类型，减少 answer、citation、risk item 等结构漂移。' },
      { title: '可替换层', detail: 'Mock Embedding、内存向量库、规则审查器都保留替换真实模型、pgvector 和队列的边界。' },
    ],
    'ozon-erp': [
      { title: 'apps/web', detail: 'Vue 管理后台，覆盖商品、订单、店铺、工具、设置、审批中心、任务中心和导入草稿。' },
      { title: 'apps/api', detail: 'Express 服务端与 Prisma 数据模型，组织平台适配、利润计算、鉴权、审计和审批动作。' },
      { title: 'apps/extension', detail: 'WXT/MV3 浏览器插件，承接平台页面采集、铺货入口和版本检查。' },
      { title: 'worker / prisma', detail: 'BullMQ/Redis 处理长任务，Prisma schema 管理核心业务表和迁移边界。' },
    ],
    'pet-workspace': [
      { title: 'gamer', detail: 'App-facing 工作区，包含社区 API、审核后台、宠物生成服务、共享包和 App 集成测试。' },
      { title: 'fantasy-pet-rule', detail: '生成规则与 Worker 管线，管理任务包、QA Gate、审核决策、产物索引和公开 API 契约。' },
      { title: 'Android 验证工程', detail: '验证悬浮窗、前台服务、权限恢复、本地证明、事件链和移动端消费体验。' },
      { title: '本地联调环境', detail: '用 Docker 环境代理不稳定云端依赖，把 App、服务端、审核和生成流程串起来。' },
    ],
    xunqiu: [
      { title: '旧 Android / 新 64 位 Android', detail: '保留旧工程作为功能参照，新工程聚焦 64 位兼容、页面迁移和现代构建链路。' },
      { title: 'Java 服务端', detail: 'Maven WAR + Spring MVC/Security + MySQL/Redis，提供 App API、后台管理和 H5 入口。' },
      { title: '多端资料', detail: '包含 iOS、发布包、阶段验收和迁移文档，适合展示历史项目接手与整理能力。' },
      { title: '发布验收', detail: '按 APK、视频流、上传链路、真机/模拟器检查整理交付证据，线上只展示脱敏结论。' },
    ],
    'game-first-tetris': [
      { title: 'scenes/game', detail: 'Godot 游戏主场景，承载网格、方块、消行、得分、暂停和游戏结束流程。' },
      { title: 'scripts/game', detail: '拆分方块规则、输入动作、Rogue 强化、局间承接和核心状态。' },
      { title: 'scripts/ui', detail: '负责主菜单、Help、Rogue 选择、触屏按钮和响应式界面。' },
      { title: 'docs / 回归脚本', detail: '记录阶段说明、触屏适配、多尺寸截图回归和人工验证结论。' },
    ],
    'game-next-spacewar': [
      { title: 'player / bullet', detail: '玩家移动、射击、命中反馈和基础战斗输入。' },
      { title: 'enemy_target / obstacle', detail: '敌人目标、障碍物和短局压力来源。' },
      { title: 'main_menu / run_result', detail: '主菜单、设置、帮助、暂停返回、结果页和 session summary。' },
      { title: 'showcase 文档', detail: '记录展示版本、首次按键提示、发布资料准备和后续 Web 导出计划。' },
    ],
    intespace: [
      { title: 'weapon_tree / upgrade panel', detail: '武器树路线构筑和局内升级选择，是 Roguelite 系统的核心。' },
      { title: 'survival_mode / boss_trial', detail: '承载自动射击、生存压力、Boss 试炼和章节推进。' },
      { title: 'game_session / audio_director', detail: '管理运行状态、结算数据、音频节奏和跨场景信息。' },
      { title: 'docs devlog', detail: '从系统方向、武器冻结审计到集成试玩准备都有阶段记录。' },
    ],
    'raiden-prototype': [
      { title: 'scenes/ui', detail: 'MainMenu、ResultsScreen、ChapterBriefing、ChapterEnding、ChapterOutro 等展示页面。' },
      { title: 'scripts/game', detail: '关卡数据、Boss 相位、风暴环境、星空、特效和 SFX/BGM。' },
      { title: 'scripts/entities', detail: '玩家、敌机、掉落物、子弹和战斗实体职责拆分。' },
      { title: 'tools / docs', detail: '保留 headless/autoplay 验证、公开演示检查清单和公开展示准备资料。' },
    ],
    'space-war': [
      { title: 'scenes/game / ui / entities', detail: '拆分主菜单、战斗场景、结果页、玩家、敌人、Boss 和道具。' },
      { title: 'stage_schedule / stage_catalog', detail: '管理 Sector、敌人波次、Boss 节奏和关卡推进。' },
      { title: 'run_balance / game_session', detail: '处理运行参数、结算、高分和重开流程。' },
      { title: 'release docs', detail: '包含最终总结、发布清单、分发指南、试玩报告和媒体截图。' },
    ],
    'biau-playlab': [
      { title: 'src/content', detail: 'Astro Content Collections 管理文章、开发日志、游戏介绍和项目内容。' },
      { title: 'src/pages', detail: '生成文章、项目、游戏、标签、RSS、sitemap 和基础 SEO 页面。' },
      { title: 'tools', detail: '保留内容审计、展示图生成、试玩视频渲染和共享字体同步脚本。' },
      { title: 'deploy / docs', detail: '整理 Cloudflare Pages、R2 试玩包上传和大文件管理说明。' },
    ],
    'blog-semi': [
      { title: 'src/App.tsx', detail: '当前主站的路由状态、首页、项目、案例、博客和四类详情页入口。' },
      { title: 'src/data/portfolio.ts', detail: '公开项目数据源，统一驱动分类、卡片、详情、案例和跳转关系。' },
      { title: 'src/App.css', detail: 'Semi 组件之外的官网视觉系统、浅暗主题、详情页字体和响应式布局。' },
      { title: 'Cloudflare Pages', detail: 'Vite 静态构建，主分支推送后自动部署到绑定域名。' },
    ],
  }

  return structures[project.id] ?? project.highlights.map((item) => ({
    title: item,
    detail: `围绕“${item}”继续补充目录、模块边界和可公开证据。`,
  }))
}

function getProjectDetailContent(project: Project): ProjectDetailContent {
  if (project.id === 'legal-rag') {
    return {
      subtitle: 'RAG 合同审查全栈 MVP',
      overview: '项目围绕法律合同审查建立完整业务闭环：前端承载知识库、问答和审查工作台，后端负责文档导入、去重、清洗、条款级切分、向量召回、重排和引用溯源，让 AI 输出能被业务人员解释、复核和沉淀。',
      modules: [
        { title: '知识库导入', detail: '导入合同文本后计算 SHA-256 指纹去重，清洗正文并保留来源、标题、章节和 chunk 元数据。' },
        { title: '条款级切分', detail: '按章节和语义边界切分长合同，避免简单固定长度截断破坏付款、交付、违约和争议解决条款。' },
        { title: 'RAG 问答', detail: '对问题做轻量改写，召回候选片段，经过阈值过滤和重排后生成答案，并把 citations 绑定到来源片段。' },
        { title: '合同风险审查', detail: '用确定性规则覆盖付款、交付、违约责任、知识产权和争议管辖等风险项，输出风险等级、建议和引用。' },
      ],
      implementation: [
        '采用 apps/web、apps/api、packages/shared 的 monorepo 结构，前端 Vue 3 + Vite，后端 Express + TypeScript，共享请求和响应类型。',
        'MVP 阶段使用可复现的 MockEmbeddingProvider 与内存向量库，保证本地演示稳定，也保留替换真实 Embedding 和 pgvector 的接口。',
        '检索链路拆成 import、chunk、embed、retrieve、rerank、answer 多个阶段，方便定位召回不足、引用缺失或答案漂移问题。',
        '合同审查输出保持结构化 JSON 和 Markdown 两种形态，页面可以直接渲染风险清单，后续也能扩展为报告导出。',
      ],
      evidence: [
        { title: '合同审查工作台', detail: '公开截图展示风险等级、问题说明、修改建议和引用来源，说明审查结果不是孤立结论。' },
        { title: '知识库与切片记录', detail: '导入流程保留文档指纹、章节信息和 chunk 元数据，可解释每一次问答命中的上下文。' },
        { title: 'RAG API 契约', detail: 'answer、citations、risk item 等结构通过 shared types 固化，便于前后端同步演示和后续替换真实模型。' },
        { title: '可替换实现边界', detail: 'Mock Embedding 与内存向量库用于稳定演示，生产化时可切换真实 embedding、pgvector 和队列导入。' },
      ],
      nextSteps: ['接入真实 Embedding 与 pgvector', '增加 PDF/DOCX 解析', '导出合同审查报告', '补充权限、审计和队列化导入'],
    }
  }

  if (project.id === 'ozon-erp') {
    return {
      subtitle: '电商 ERP 全栈业务系统',
      overview: '项目面向小团队电商运营场景，组合 Vue 管理后台、Express API、Prisma/PostgreSQL、Redis/BullMQ Worker、WXT/MV3 浏览器插件和 shared types，覆盖店铺、商品、订单、采集铺货、导入草稿、审批动作、任务队列和审计日志。',
      modules: [
        { title: '管理后台', detail: 'apps/web 承载商品、订单、店铺、导入草稿、选品规则、工具、设置、审批中心和任务中心。' },
        { title: 'API 与数据模型', detail: 'apps/api 使用 Express + Prisma 组织业务接口、数据库模型、平台 API 适配、利润计算和鉴权逻辑。' },
        { title: 'Worker 与队列', detail: 'Redis/BullMQ 承接商品同步、订单同步、导入导出、采集处理和失败重试，避免长流程阻塞请求。' },
        { title: '浏览器插件', detail: 'apps/extension 使用 WXT/MV3 承接平台侧采集、铺货入口、版本检查和与后台的动作协同。' },
      ],
      implementation: [
        '使用 monorepo 组织 web、api、extension、shared，前后端共享类型和利润/平台字段计算逻辑。',
        '真实写入通过环境开关控制，高风险动作进入 PendingAction，异步任务进入 JobQueue，并通过审计日志沉淀可追踪链路。',
        '文档覆盖数据库备份迁移、容器环境部署、插件版本发布、Ozon 字段对齐、佣金覆盖和接手检查清单。',
        '公开展示只保留业务模块、工程结构和脱敏流程，不展示真实店铺凭证、数据库连接、访问口令、私有服务地址或生产端口。',
      ],
      evidence: [
        { title: '后台模块地图', detail: '商品、订单、店铺、导入草稿、审批中心和任务中心能够共同说明运营后台的完整边界。' },
        { title: 'Prisma 数据模型', detail: '以店铺、商品、订单、审批动作、审计日志和任务队列等模型展示业务数据组织方式。' },
        { title: '插件与 Worker 协作', detail: 'WXT/MV3 插件负责采集入口，BullMQ/Redis Worker 承接同步与长任务，形成多端协同证据。' },
        { title: '交付文档', detail: '部署、迁移、备份、插件发布和接手清单可证明项目不只是页面演示，而是可交付系统。' },
      ],
      nextSteps: ['补充脱敏后台截图', '整理 Prisma ER 图', '沉淀插件采集链路案例', '补充队列失败重试和审计说明'],
    }
  }

  if (project.id === 'pet-workspace') {
    return {
      subtitle: 'AI 宠物生成与审核管线',
      overview: 'Pet Workspace 不是单个仓库，而是 AI 宠物相关项目工作区：gamer 负责 App-facing 能力、社区 API 和审核后台，fantasy-pet-rule 负责生成管线、Worker 编排、QA Gate、任务包和公开 API 契约，Android 与本地云环境负责联调验证。',
      modules: [
        { title: 'App-facing 工作区', detail: 'gamer 承载社区 API、管理审核 UI、宠物生成服务、共享包和 App 集成测试。' },
        { title: '生成服务管线', detail: 'fantasy-pet-rule 组织生成任务、Worker 编排、服务端 QA gates、任务包、审核决策和产物索引。' },
        { title: 'Android 验证', detail: 'floating-pet-android 验证悬浮窗权限、前台服务、位置恢复、本地证明和事件哈希链。' },
        { title: '联调环境', detail: '本地 Docker 环境用于替代不稳定云端依赖，代理生成 API，并验证 App、服务端和审核流联动。' },
      ],
      implementation: [
        '用任务状态和产物 manifest 管理生成过程，避免一次性出图流程无法追踪。',
        '通过 QA Gate、人审决策和发布记录，把生成资产进入 App 的路径拆成可审计阶段。',
        'Android 端验证悬浮窗、通知、前台服务、权限恢复和真实设备/模拟器验收流程。',
        '线上展示只保留工程结构和流程，不暴露云端 API、任务 JSON、模型缓存或候选素材中的敏感信息。',
      ],
      evidence: [
        { title: 'pipeline-v2 契约', detail: '生成任务、阶段状态、产物索引和 App API 通过契约说明串联，便于解释生成资产如何进入应用。' },
        { title: 'QA Gate 与人审记录', detail: '服务端质量检查、人审决策和发布记录把不可控生成结果拆成可复核流程。' },
        { title: 'Android 联调验证', detail: '悬浮窗、前台服务、权限恢复和本地证明链用于证明移动端消费体验可以落地。' },
        { title: '工作区边界', detail: 'gamer、fantasy-pet-rule、floating-pet-android 分别承担 App-facing、生成管线和移动验证职责。' },
      ],
      nextSteps: ['补充审核后台截图', '整理生成任务状态图', '补充 App API 契约说明', '增加典型生成案例复盘'],
    }
  }

  if (project.id === 'xunqiu') {
    return {
      subtitle: '移动端业务系统整理与 64 位重构',
      overview: 'Xunqiu 是一个多端历史项目集合，包含旧 Android、新 64 位 Android、iOS、Java Spring 服务端、后台/H5、发布包和迁移文档。当前展示重点放在 64 位 Android 新客户端、服务端接口复用、移动端业务模块梳理和发布验收流程。',
      modules: [
        { title: 'Android 64 位客户端', detail: '新客户端复用既有服务端接口，逐步替换旧 32 位工程，并拆分为 MainActivity 与多个原生页面模块。' },
        { title: '移动端功能模块', detail: '覆盖登录注册、球队、比赛、场地、视频、支付、商城、转会市场、约战、话题、投票和聊天等业务。' },
        { title: 'Java 服务端', detail: '历史服务端为 Maven WAR + Spring MVC/Security + MySQL/Redis，包含 App API、后台管理、H5 页面和第三方服务接入。' },
        { title: '发布验收', detail: 'docs 中沉淀 Android 打包、阶段 APK、真机/模拟器验证、视频流和上传链路检查。' },
      ],
      implementation: [
        '新 Android 客户端采用更现代的 Gradle/JDK/SDK 构建链路，重点解决 64 位兼容和旧模块迁移。',
        '页面层按 screen/Home、Tweet、Community、Schedule、Championship、Goods、Profile、Video 等模块组织。',
        '接口层封装 ApiClient、AuthSession、LoginResult 等基础能力，逐步把历史功能恢复为可维护页面。',
        '线上展示只保留技术结构和功能范围，不公开私有服务信息、数据库配置、访问凭据、签名材料或发布校验信息。',
      ],
      evidence: [
        { title: '64 位客户端模块地图', detail: '新客户端按首页、动态、社区、赛程、赛事、商品、个人中心和视频模块拆分，适合说明迁移范围。' },
        { title: '接口复用边界', detail: '登录态、ApiClient 和结果模型把旧服务端能力封装成可控调用层，公开展示不暴露真实地址。' },
        { title: '迁移与验收文档', detail: '项目清单、64 位重构计划、阶段构建和验证记录共同证明接手过程可复现。' },
        { title: '发布风险控制', detail: '展示侧只描述构建链路、页面恢复和验收方式，隐藏访问凭据、签名材料、发布校验信息等敏感内容。' },
      ],
      nextSteps: ['补充脱敏移动端截图', '整理服务端接口地图', '梳理 32 位到 64 位迁移故事', '沉淀发布验收案例'],
    }
  }

  if (project.id === 'game-first-tetris') {
    return {
      subtitle: 'Godot 4 Tetris 可试玩原型',
      overview: '项目基于 Godot 4，保留经典俄罗斯方块主线和 Rogue 原型实验线，已经形成主菜单、经典模式、Rogue 三选一、局间承接、暂停、Help、响应式布局、触屏输入桥接和截图回归检查。',
      modules: [
        { title: '经典模式', detail: '标准俄罗斯方块主循环，包含移动、旋转、软降、硬降、Hold、消行、得分和重开。' },
        { title: 'Rogue 原型', detail: '开局和局内固定触发三选一强化，并保留最小局间带入。' },
        { title: '触屏输入', detail: 'TouchInputBridge 与 TouchControls 将触屏按钮映射到动作层，区分瞬时动作和持续状态。' },
        { title: '多端回归', detail: '固定检查 360x640、393x852、412x915、960x640、1024x768、1280x720 等尺寸。' },
      ],
      implementation: [
        '输入层先按动作类型拆分，再由键盘或触屏来源统一驱动游戏行为。',
        '紧凑布局下触屏控件会隐藏/释放阻断状态，避免暂停、Help、Rogue 选择和游戏结束时残留输入。',
        '文档中保留分支阶段、截图回归结论和人工回归摘要，方便说明迭代过程。',
        '公开展示只描述玩法和验证流程，不公开本地绝对工具路径或临时验证产物。',
      ],
      evidence: [
        { title: '经典模式闭环', detail: 'README 已记录移动、旋转、硬降、Hold、消行、得分、暂停和重开等核心流程，适合证明基础玩法稳定。' },
        { title: 'Rogue 原型节点', detail: '开局与局内三选一强化、最小局间带入和出生保护说明项目不只是复刻规则，也保留了系统实验线。' },
        { title: '触屏输入桥接', detail: 'TouchInputBridge 与 TouchControls 把触屏按钮映射到动作层，保留键盘和触屏来源统一驱动的工程边界。' },
        { title: '多尺寸回归清单', detail: '固定检查 360x640、393x852、412x915、960x640、1024x768、1280x720 等尺寸，用于说明移动端适配状态。' },
      ],
      nextSteps: ['补充 Web 试玩封面', '整理触屏控件演进记录', '统一游戏项目详情页截图', '补充发布导出说明'],
    }
  }

  if (project.id === 'raiden-prototype') {
    return {
      subtitle: 'Godot 4 纵版射击展示候选版',
      overview: 'Raiden Prototype 是短局街机纵版射击垂直切片，用来验证双关章节、火力成长、资源决策、Boss 收束、章节过场、双语界面、headless/autoplay 验证和公开演示准备流程。',
      modules: [
        { title: '双关章节', detail: 'Chapter Run 串联 Stage 01、结果页、ChapterBriefing、Stage 02、ChapterEnding 和 ChapterOutro。' },
        { title: '战斗系统', detail: '包含玩家移动、自动射击、受伤、死亡、敌群编排、掉落升级和炸弹清屏。' },
        { title: 'Boss 与环境', detail: '第二关接入风暴十字封线、Boss 相位切换、overdrive 和最后安全窗口提示。' },
        { title: '发布准备', detail: 'tools 中保留展示验证、公开演示就绪检查、试玩包和公开演示候选资料夹准备脚本。' },
      ],
      implementation: [
        'Godot scenes/ui 与 scenes/game 分离菜单、结果页、章节过场和战斗场景。',
        'scripts/autoload 管理全局运行状态、章节状态和结算数据。',
        'scripts/entities 与 scripts/game 拆分玩家、敌人、掉落、关卡数据、Boss、特效和环境互动。',
        '通过 headless autoplay 与章节验证命令沉淀稳定展示候选版质量。',
      ],
      evidence: [
        { title: 'RC-0.4 展示基线', detail: 'README 将当前版本定位为稳定展示候选版，推荐入口为 Chapter Run，适合对外说明当前可玩范围。' },
        { title: '双关章节链路', detail: 'Stage 01、ChapterBriefing、Stage 02、ChapterEnding、ChapterOutro 形成完整章节体验，不只是单关演示。' },
        { title: 'Boss 与风暴机关', detail: '第二关 Boss 相位、overdrive、风暴十字封线和最后安全窗口构成可讲述的关底高潮。' },
        { title: '展示验证工具', detail: 'tools 中保留展示验证、演示就绪检查、试玩资料包等脚本和清单，用于说明发布准备度。' },
      ],
      nextSteps: ['补充公开演示截图', '整理试玩反馈表入口', '补素材授权清单摘要', '补外部试玩说明'],
    }
  }

  if (project.id === 'game-next-spacewar') {
    return {
      subtitle: 'Godot 4.6 太空射击展示构建',
      overview: 'game-next-spacewar 是 Spacewar 系列的下一版展示工程，重点不是单个战斗场景，而是把主菜单、设置、About/Help、首次按键提示、暂停返回、结果页、session summary 和 showcase build 标记组织成一条更完整的试玩路径。',
      modules: [
        { title: '首屏与菜单', detail: 'Main Menu、Settings、About、Help 和首次按键提示共同构成试玩前的信息入口。' },
        { title: '战斗体验', detail: '围绕玩家移动、射击、敌人目标、障碍物、命中反馈和单局压力构成核心循环。' },
        { title: '结果复盘', detail: '独立结果页展示 session summary，让每次试玩都有明确的完成、失败和返回路径。' },
        { title: '展示版本', detail: 'README、阶段说明和 showcase build id 用于说明当前版本状态，便于后续接入 Web 包。' },
      ],
      implementation: [
        'Godot 4.6.1 工程按 player、bullet、enemy_target、obstacle、main_menu、run_result 等脚本拆分核心职责。',
        '页面状态从菜单、帮助、暂停、战斗到结果页形成闭环，减少玩家进入试玩后的迷失感。',
        '当前阶段偏向 M14 评审与发布资料准备，重点把展示说明、版本标记和可复盘路径补齐。',
        '线上展示不复制本地日志全文，只沉淀可公开的玩法、结构和验证结论。',
      ],
      evidence: [
        { title: '完整展示外壳', detail: '主菜单、设置、About、Help、首次按键提示和暂停返回共同证明项目已从战斗原型走向展示构建。' },
        { title: '结果页与会话总结', detail: '独立结果页和 session summary 让每次试玩都有明确完成状态、失败反馈和复盘路径。' },
        { title: 'Godot 工程边界', detail: 'player、bullet、enemy_target、obstacle、main_menu、run_result 等脚本拆分，便于说明核心职责。' },
        { title: '发布准备文档', detail: 'README、roadmap、task-board 和 test-checklist 共同支撑“展示版收口”的公开讲解口径。' },
      ],
      nextSteps: ['补充主菜单和结果页截图', '接入 Web 试玩包', '整理首次试玩操作说明', '沉淀 Spacewar 系列演进复盘'],
    }
  }

  if (project.id === 'intespace') {
    return {
      subtitle: '竖屏自动射击 Roguelite 系统收口',
      overview: 'intespace 是 Godot 竖屏自动射击 Roguelite，定位上用武器树承担路线构筑，用移动端优先的战斗节奏承接局内升级和局外成长。项目当前的重点是把首页、战斗、升级、结算、成长、下一局串成稳定闭环。',
      modules: [
        { title: '武器树系统', detail: 'weapon_tree 与升级面板负责局内路线选择，当前 v1 结构已冻结，适合展示系统设计和迭代收口。' },
        { title: '战斗模式', detail: 'survival_mode、boss_trial、chapter_one 等脚本承载自动射击、生存压力、Boss 和章节推进。' },
        { title: '局外成长', detail: '主菜单、meta progression、HUD 和 codex 负责把单局结果带回成长层，形成下一局动机。' },
        { title: '多端路线', detail: '项目方向是移动端优先，再接 Web 试玩版和 Windows 版本，文档中保留大量阶段日志和集成试玩准备。' },
      ],
      implementation: [
        'Godot 工程将 game_session、audio_director 等全局状态与战斗脚本、UI 脚本分层，便于持续扩展玩法模式。',
        '系统文档从方向路线图、武器冻结审计到集成试玩准备都有记录，适合讲清楚从原型到可测版本的过程。',
        '玩法上强调“局内构筑 + 局外成长”，比单纯射击演示更适合作为游戏系统设计案例。',
        '公开展示只抽取玩法结构、模块职责和验证结论，不暴露本地构建产物、工具路径或中间素材。',
      ],
      evidence: [
        { title: '武器系统冻结审计', detail: 'docs 中的 weapon v1 定义、冻结清单和审计文档用于证明武器树结构已经进入可评审状态。' },
        { title: '完整 Session 主线', detail: '首页、战斗、升级、结算、成长、下一局被明确作为当前收口主线，支撑 Roguelite 闭环展示。' },
        { title: '移动端优先定位', detail: 'README 说明首发优先手机，其次 Web 试玩版和 Windows 版，页面展示可围绕竖屏体验组织。' },
        { title: '统一试玩准备', detail: '当前阶段导航和 integrated playtest preparation 文档说明项目正在从系统堆叠转向完整流程验证。' },
      ],
      nextSteps: ['补充武器树可视化', '接入 Web 试玩版', '整理移动端操作说明', '沉淀集成试玩反馈'],
    }
  }

  if (project.id === 'space-war') {
    return {
      subtitle: '复古横向太空射击完整发布版',
      overview: 'space-war 是 Godot 4.6 复古横向射击项目，参考 Space Impact 式短局压力，已经形成主菜单、横向自动推进、敌人波次、Sector/Boss、道具、受伤死亡、暂停、结果页、高分和基础音效的完整可发布闭环。',
      modules: [
        { title: '战斗闭环', detail: '玩家移动、射击、敌人、碰撞、受伤、死亡、重开和结果页构成完整单局。' },
        { title: '关卡推进', detail: '两个 Sector、四类敌人、三类 powerup 和两个差异化 Boss 组织短局节奏。' },
        { title: '复古表现', detail: '低色 LCD 质感、程序化 SFX 和基础音乐强化复古掌机式即时反馈。' },
        { title: '发布材料', detail: 'docs 保留发布清单、分发指南、最终总结、试玩报告和媒体截图，说明项目已从原型走到可展示版本。' },
      ],
      implementation: [
        'Godot 工程按 scenes/game、scenes/ui、scenes/entities 和 scripts/game 拆分菜单、战斗、实体、调度与结算。',
        'stage_schedule、stage_catalog、run_balance 和 game_session 共同管理关卡节奏、敌人配置、运行数据和高分。',
        'Windows 导出和发布文档已经验证，后续接入本站时更像“完整小游戏展示”，不是纯概念原型。',
        '公开展示只保留玩法结构、导出状态和可分享截图，不暴露本地发布目录或构建脚本细节。',
      ],
      evidence: [
        { title: '完整发布版本', detail: '项目文档将当前状态定义为完整可玩、可展示、可维护，并保留 v1.1.1 发布说明与维护 backlog。' },
        { title: '关卡与 Boss 闭环', detail: 'Sector、敌人波次、最终 Boss、暂停、结算和高分记录共同证明项目已经具备完整单局体验。' },
        { title: '测试与试玩资料', detail: 'docs 中的测试计划、试玩报告、最终 runbook 和 release checklist 可作为可公开的质量证据。' },
        { title: '发布与分发材料', detail: 'distribution guide、release notes、final summary 和 postmortem 说明项目已经完成从开发到发布的收口。' },
      ],
      nextSteps: ['接入 Web 试玩入口', '补充发布截图矩阵', '整理 Sector/Boss 设计说明', '沉淀复古射击复盘文章'],
    }
  }

  if (project.id === 'biau-playlab') {
    return {
      subtitle: 'Astro 内容站与游戏展示旧系统',
      overview: 'Biau Playlab 是旧版 Astro 静态内容站，承担文章、开发日志、游戏页面、项目页、RSS、sitemap、SEO 元信息和 Godot Web 展示入口的组织工作。它现在更适合作为内容资产来源和迁移参考，而不是继续承载主站演进。',
      modules: [
        { title: '内容集合', detail: '使用 Astro Content Collections 管理文章、游戏介绍、开发日志和项目内容，便于生成详情页、标签页和 RSS。' },
        { title: '游戏展示', detail: 'games 内容目录沉淀 first-tetris、next-spacewar、intespace、raiden、space-war 的试玩说明、截图和嵌入入口。' },
        { title: '站点基础设施', detail: 'BaseLayout、Nav、ArticleCard、GameCard、ContentToc 等组件负责 SEO、导航、文章阅读和内容目录。' },
        { title: '部署与资产', detail: 'Cloudflare Pages 文档、R2 试玩包上传说明和内容审计脚本，用于降低静态站发布和大文件管理风险。' },
      ],
      implementation: [
        'Astro 适合文章与静态内容生成，旧站保留了内容分类、文章路由、游戏路由、sitemap、robots 和 RSS 等基础能力。',
        'Godot Web 包从站点仓库中拆出，改为独立准备上传目录，避免大体积构建产物影响 Pages 构建。',
        '工具脚本覆盖站点内容审计、项目展示图生成、试玩视频渲染和共享字体同步，形成迁移当前 React 站的素材来源。',
        '公开说明中只保留内容架构和部署策略，不展示本地路径字段、真实仓库敏感设置或临时 output 产物。',
      ],
      nextSteps: ['迁移可复用文章内容', '提炼游戏页面素材', '归档旧站部署说明', '把内容审计脚本改造成当前站检查工具'],
    }
  }

  if (project.id === 'blog-semi') {
    return {
      subtitle: 'React + Semi 动态展示系统',
      overview: 'Biau Blog 是当前主站，基于 React、Vite、TypeScript 和 Semi Design 重写，用首页、项目、案例、博客和详情路由把 AI 应用、全栈系统、游戏项目和学习内容拆成更正式的产品展示结构，并通过 GitHub 到 Cloudflare Pages 自动更新。',
      modules: [
        { title: '信息架构', detail: '导航拆分首页、项目、案例和博客，避免旧版所有内容挤在单页，项目与案例拥有独立详情 URL。' },
        { title: '项目系统', detail: 'projects 数据驱动分类、卡片、项目详情、游戏展示页和案例跳转，便于持续补充内容。' },
        { title: '视觉系统', detail: 'Semi 组件提供基础交互，定制 CSS 负责官网化首屏、宽版心、浅暗主题、矩阵卡片和详情页节奏。' },
        { title: '发布链路', detail: 'Vite 构建产物发布到 Cloudflare Pages，main 分支推送后自动构建并更新绑定域名。' },
      ],
      implementation: [
        '当前实现以 src/App.tsx 组织路由状态、项目/案例/游戏/博客详情视图，src/data/portfolio.ts 管理公开项目数据。',
        '详情页统一项目详情、案例详情、试玩展示、博客文章四类页面模型，按钮按项目、案例和游戏关系互相跳转。',
        '样式层用全局样式变量控制背景、版心、字号、卡片和暗色主题，后续可以继续拆组件而不改变页面结构。',
        '公开站点只保存脱敏后的项目描述、截图和部署说明，不把本地路径、访问凭据、密钥、真实服务配置写入前端数据。',
      ],
      nextSteps: ['拆分 App.tsx 为页面组件', '补充内容搜索和标签过滤', '接入更多博客文章', '增加部署状态和版本记录'],
    }
  }

  if (project.category === 'ai') {
    return {
      subtitle: project.role,
      overview: `${project.title} 是面向 AI 应用工程化的项目，用来展示从任务流、生成或审核管线、人工复核到前端展示的完整链路。详情页重点说明功能模块、数据流和后续可产品化的边界。`,
      modules: [
        { title: '任务入口', detail: '将用户输入、素材、规则或业务参数组织成可追踪任务，保证后续步骤有稳定上下文。' },
        { title: '生成与处理管线', detail: '围绕队列、状态机、生成任务和质量检查组织核心流程，降低单点失败对演示的影响。' },
        { title: '审核闭环', detail: '沉淀自动审核、人审发布和结果回写机制，让 AI 输出能进入可控的业务流程。' },
        { title: '应用展示层', detail: '通过工作台或 App-facing API 展示最终结果，并保留后续接入真实模型服务的接口边界。' },
      ],
      implementation: [
        `核心技术栈围绕 ${project.stack.join('、')} 组织，优先保证任务流和展示链路稳定。`,
        '将生成、审核、发布拆成独立阶段，便于定位失败节点，也方便对外展示时讲清楚工程取舍。',
        '使用结构化数据描述任务状态、审核结果和前端展示字段，避免页面与模型输出强耦合。',
        '后续可替换真实模型、增加队列持久化、补充权限和审计能力。',
      ],
      nextSteps: ['补充真实运行截图', '整理任务状态流转图', '接入真实模型或服务端队列', '沉淀一篇 AI 工程化复盘'],
    }
  }

  if (project.category === 'business') {
    return {
      subtitle: project.role,
      overview: `${project.title} 是业务系统方向的完整项目，适合展示管理后台、API 服务、数据库模型、异步任务和浏览器插件等多端协作能力。详情页会把业务模块和工程实现拆开讲清楚。`,
      modules: [
        { title: '管理后台', detail: '承载商品、订单、审批、日志等高频业务操作，优先保证信息密度和操作效率。' },
        { title: '服务端 API', detail: '统一处理业务校验、数据读写、权限边界和前端交互契约。' },
        { title: '数据与任务', detail: '用数据库模型和异步任务承接同步、采集、导入导出等长流程。' },
        { title: '扩展端能力', detail: '通过浏览器插件或 Worker 补齐平台侧采集、铺货、同步等能力。' },
      ],
      implementation: [
        `使用 ${project.stack.join('、')} 搭建前后端和任务处理链路。`,
        '后台页面按业务域拆分，API 按资源和动作组织，降低模块之间的耦合。',
        '通过 Prisma、队列或 Worker 把同步和采集类任务从主请求链路中拆出去。',
        '用审计日志和审批中心沉淀业务可追踪性，方便后续变成正式交付说明。',
      ],
      nextSteps: ['补充数据库 ER 图', '补关键后台页面截图', '整理部署拓扑', '补充测试与异常处理说明'],
    }
  }

  if (project.category === 'interactive') {
    return {
      subtitle: project.role,
      overview: `${project.title} 是 Web 互动和游戏展示项目，重点展示玩法原型、Web 导出、试玩入口和视觉包装。详情页用于说明核心玩法、交互反馈和上线展示方式。`,
      modules: [
        { title: '玩法循环', detail: '明确玩家输入、目标、反馈和失败条件，让项目具备可试玩的最小闭环。' },
        { title: '关卡与节奏', detail: '通过敌人、速度、得分或阶段变化制造推进感，避免只是静态演示。' },
        { title: 'Web 试玩入口', detail: '将 Godot 或 Web 构建结果接入站点展示，保证访问者能快速进入体验。' },
        { title: '展示包装', detail: '补充封面、操作说明、截图和项目说明，让游戏项目能被正式介绍。' },
      ],
      implementation: [
        `核心栈为 ${project.stack.join('、')}，重点处理 Web 导出、资源加载和浏览器运行体验。`,
        '玩法逻辑按输入、状态、碰撞、得分和重开流程拆分，方便快速迭代。',
        '展示站点负责承载项目封面、说明和跳转入口，游戏本体保持独立工程边界。',
        '后续可补充移动端适配、音效、关卡数据和试玩埋点。',
      ],
      nextSteps: ['统一游戏封面和截图', '补操作说明', '整理 Web 导出流程', '增加试玩数据和版本记录'],
    }
  }

  if (project.category === 'platform') {
    return {
      subtitle: project.role,
      overview: `${project.title} 是站点和内容平台方向的项目，负责承载项目展示、案例沉淀、博客内容和部署入口。详情页重点说明信息架构、路由组织、内容数据和发布流程。`,
      modules: [
        { title: '信息架构', detail: '把首页、项目、案例、博客拆成不同职责，减少所有内容挤在单页的问题。' },
        { title: '项目数据', detail: '用结构化项目数据驱动卡片、分类、详情页和案例跳转。' },
        { title: '视觉系统', detail: '结合 Semi 组件和定制样式，形成更接近正式官网的展示质感。' },
        { title: '部署发布', detail: '通过静态构建和 Cloudflare Pages 自动发布，降低后续维护成本。' },
      ],
      implementation: [
        `使用 ${project.stack.join('、')} 组织页面、路由、主题和组件样式。`,
        '路由层区分项目详情页和案例详情页，保证不同内容有独立 URL。',
        '视觉层使用大版心、浅暗主题、矩阵卡片和项目截图，提升官网式展示感。',
        '部署层保持 GitHub 推送自动触发 Cloudflare Pages 构建。',
      ],
      nextSteps: ['补充更多博客文章', '增加项目详情图文内容', '接入搜索或标签过滤', '沉淀更新日志'],
    }
  }

  return {
    subtitle: project.role,
    overview: `${project.title} 用于展示 ${project.role} 方向的工程能力。详情页用于集中说明技术栈、功能模块、实现方式和后续补齐计划。`,
    modules: project.highlights.map((item) => ({ title: item, detail: `围绕“${item}”整理对应功能边界、页面入口和工程实现。` })),
    implementation: [
      `技术栈包含 ${project.stack.join('、')}，后续会按实际工程继续补充细节。`,
      '先保留项目定位、功能边界和展示入口，再逐步补齐截图、架构图和部署说明。',
      '项目详情页负责讲工程实现，案例页负责讲业务场景和对外表达。',
      '后续根据项目成熟度继续补充真实数据、异常处理和测试说明。',
    ],
    nextSteps: ['补充真实运行截图', '整理架构图和数据流', '补充部署说明', '沉淀项目复盘文章'],
  }
}

function ProjectFullDetailView({ onBack, onOpenCase, onOpenGameDetail, project }: { onBack: () => void; onOpenCase: (caseStudy: CaseStudy) => void; onOpenGameDetail: (project: Project) => void; project: Project }) {
  const projectCase = getCaseStudyForProject(project.id)
  const gameSlug = getGameSlugByProjectId(project.id)
  const detail = getProjectDetailContent(project)
  const structure = getProjectStructure(project)
  const evidence = detail.evidence ?? project.highlights.slice(0, 4).map((item) => ({
    title: item,
    detail: `围绕“${item}”继续补充可公开截图、文档记录或运行材料，所有展示内容都会先做脱敏处理。`,
  }))

  return (
    <div className="project-detail-page">
      <section className="project-detail-hero">
        <div className="project-detail-copy">
          <Text type="tertiary">独立项目详情页</Text>
          <Title heading={1}>{project.title}</Title>
          <div className="detail-route-badge">
            <span>独立技术详情页</span>
            <strong>/projects/{project.id}</strong>
          </div>
          <Paragraph>{detail.overview}</Paragraph>
          <Space wrap>
            <Button theme="solid" type="primary" onClick={onBack}>返回项目列表</Button>
            {projectCase ? <Button onClick={() => onOpenCase(projectCase)}>打开业务案例</Button> : null}
            {gameSlug ? <Button onClick={() => onOpenGameDetail(project)}>打开试玩展示</Button> : null}
          </Space>
        </div>
        <div className="project-detail-media">
          <div className="panel-window-bar" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          {project.image ? <img src={project.image} alt={project.title} /> : <span>{categoryLabels[project.category]}</span>}
        </div>
      </section>

      <section className="project-detail-summary">
        <div>
          <Text type="tertiary">项目定位</Text>
          <strong>{detail.subtitle}</strong>
        </div>
        <div>
          <Text type="tertiary">技术栈</Text>
          <strong>{project.stack.join(' / ')}</strong>
        </div>
        <div>
          <Text type="tertiary">交付范围</Text>
          <strong>{project.role}</strong>
        </div>
      </section>

      <section className="project-detail-section project-structure-section">
        <div className="project-detail-section-head">
          <span className="section-pill">技术架构</span>
          <Title heading={2}>技术架构</Title>
          <Paragraph>这一部分按照工程目录、模块职责和替换边界拆解，帮助区分“项目列表摘要”和“详情页技术说明”。</Paragraph>
        </div>
        <div className="project-structure-grid">
          {structure.map((item, index) => (
            <article key={item.title}>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
              <div>
                <Title heading={3}>{item.title}</Title>
                <Paragraph>{item.detail}</Paragraph>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="project-detail-section">
        <div className="project-detail-section-head">
          <span className="section-pill">功能拆解</span>
          <Title heading={2}>功能模块</Title>
        </div>
        <div className="project-module-grid">
          {detail.modules.map((item) => (
            <article key={item.title}>
              <Title heading={3}>{item.title}</Title>
              <Paragraph>{item.detail}</Paragraph>
            </article>
          ))}
        </div>
      </section>

      <section className="project-detail-section project-implementation-section">
        <div className="project-detail-section-head">
          <span className="section-pill">工程实现</span>
          <Title heading={2}>实现方式</Title>
        </div>
        <div className="project-implementation-list">
          {detail.implementation.map((item) => <p key={item}>{item}</p>)}
        </div>
      </section>

      <section className="project-detail-section">
        <div className="project-detail-section-head">
          <span className="section-pill">展示证据</span>
          <Title heading={2}>展示证据</Title>
        </div>
        <div className="project-evidence-grid">
          {evidence.map((item, index) => (
            <article key={item.title}>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
              <div>
                <Title heading={3}>{item.title}</Title>
                <Paragraph>{item.detail}</Paragraph>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="project-detail-section">
        <div className="project-detail-section-head">
          <span className="section-pill">扩展计划</span>
          <Title heading={2}>后续扩展</Title>
        </div>
        <div className="project-roadmap-grid">
          {detail.nextSteps.map((item, index) => (
            <div key={item}>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

type GameShowcaseContent = {
  tagline: string
  stage: string
  gameplay: string[]
  systems: Array<{ title: string; detail: string }>
  integration: string[]
}

function getGameShowcaseContent(project: Project): GameShowcaseContent {
  const gameContent: Record<string, GameShowcaseContent> = {
    'game-first-tetris': {
      tagline: '经典方块规则 + Rogue 原型验证，适合作为游戏项目的入门展示。',
      stage: '已具备 Web 展示入口，后续补齐试玩包和移动端触控说明。',
      gameplay: ['方块生成、移动、旋转、下落与消行', '分数、等级、速度递增和失败重开', 'Rogue 原型用于验证局外成长与随机增益', '触屏桥接和多尺寸回归用于移动端适配'],
      systems: [
        { title: '核心规则', detail: '围绕网格状态、碰撞检测、行消除和结算流程实现稳定闭环。' },
        { title: '输入适配', detail: '保留键盘与触控两种输入方向，便于后续移动端展示。' },
        { title: '回归验证', detail: '通过固定尺寸检查和运行记录沉淀可复现的展示质量。' },
      ],
      integration: ['补充 Web 构建包', '增加试玩按钮', '整理操作说明', '记录版本变化'],
    },
    'game-next-spacewar': {
      tagline: 'Spacewar 系列的展示构建，重点把主菜单、帮助、暂停、结果页和单局复盘接成一条完整试玩路径。',
      stage: '当前处于 M14 评审与发布资料准备阶段，适合作为下一版 Spacewar 展示页，后续接入 Web 导出文件。',
      gameplay: ['飞船移动、射击、规避和命中反馈', '敌人目标、障碍物和短局压力组织战斗节奏', '主菜单、设置、About、Help、首次按键提示和暂停返回', '结果页与 session summary 让试玩过程可复盘'],
      systems: [
        { title: '战斗循环', detail: 'player、bullet、enemy_target 和 obstacle 共同承担输入、发射、命中、规避和结算。' },
        { title: '页面状态', detail: '菜单、帮助、暂停、失败和结果页让项目从“能玩”推进到“能展示”。' },
        { title: '展示包装', detail: 'showcase build 标记、README 和阶段说明用于讲清楚当前版本的可演示范围。' },
      ],
      integration: ['接入 Web 导出目录', '补充主菜单和结果页截图', '加入试玩前加载状态', '整理关卡节奏说明'],
    },
    intespace: {
      tagline: '竖屏自动射击 Roguelite，围绕武器树、局内升级和局外成长收口完整运行链路。',
      stage: '武器系统 v1 已进入结构冻结阶段，当前重点是“首页 -> 战斗 -> 升级 -> 结算 -> 成长 -> 下一局”的集成试玩。',
      gameplay: ['竖屏移动、自动射击、生存压力和 Boss 试炼', '武器树路线构筑与局内升级选择', '结果页、局外成长和下一局动机构成 Roguelite 闭环', '移动端优先，再扩展 Web 试玩版与 Windows 展示版本'],
      systems: [
        { title: '武器树', detail: 'weapon_tree 和升级面板承载路线构筑，是项目区别于普通射击演示的核心。' },
        { title: '运行模式', detail: 'survival_mode、boss_trial 和 chapter_one 负责生存、Boss 与章节节奏。' },
        { title: '成长闭环', detail: 'game_session、HUD、主菜单和 meta progression 把单局结果带回局外成长。' },
      ],
      integration: ['补充武器树截图', '整理核心运行链路', '接入 Web 试玩包', '沉淀集成试玩复盘'],
    },
    'raiden-prototype': {
      tagline: '短局街机纵版射击垂直切片，适合展示关卡、Boss 和火力成长。',
      stage: '已经具备公开演示准备口径，后续把试玩包接入本站。',
      gameplay: ['双关章节与章节过场', '火力成长、资源决策和敌机压迫', 'Boss 收束形成阶段目标', '短局体验便于线上演示和展示讲解'],
      systems: [
        { title: '章节结构', detail: 'Chapter Run 将推进、过场、Boss 和结算组织成可讲述流程。' },
        { title: '火力成长', detail: '通过局内资源和火力变化提升单局反馈密度。' },
        { title: '公开演示准备', detail: '页面侧预留试玩、截图和版本说明入口，便于逐步公开。' },
      ],
      integration: ['接入公开演示', '补 Boss 截图', '整理操作说明', '增加版本状态'],
    },
    'space-war': {
      tagline: '复古横向太空射击完整版本，保留 Sector/Boss、道具、结果页、高分和独立发布文档。',
      stage: '已形成可玩、可导出、可说明的发布质量小项目，后续重点是把 Web 试玩入口接入本站。',
      gameplay: ['横向自动推进、移动、射击和敌人压迫', '两个 Sector、四类敌人、三类道具和两个差异化 Boss', '受伤、死亡、暂停、结果页和高分构成完整闭环', '低色 LCD 氛围与程序化音效形成复古识别度'],
      systems: [
        { title: '战斗系统', detail: 'scenes/entities 与 scripts/game 拆分玩家、敌人、碰撞、调度和结算职责。' },
        { title: '阶段推进', detail: 'stage_schedule、stage_catalog 和 run_balance 管理敌人波次、Sector 和 Boss 节奏。' },
        { title: '发布材料', detail: '最终总结、发布清单、分发指南和试玩报告说明项目已经完成可展示闭环。' },
      ],
      integration: ['接入 Web 包', '整理发布日志', '增加试玩入口', '统一游戏封面'],
    },
  }

  return gameContent[project.id] ?? {
    tagline: `${project.title} 是一个互动体验项目，后续会补齐试玩入口、截图和版本记录。`,
    stage: '展示页已准备好，等待接入 Web 构建产物。',
    gameplay: project.highlights,
    systems: project.highlights.map((item) => ({ title: item, detail: `围绕“${item}”整理玩法说明、交互反馈和实现记录。` })),
    integration: ['补充截图', '接入试玩包', '完善操作说明', '沉淀复盘文章'],
  }
}

function GameShowcaseView({ onBack, onOpenProjectDetail, project }: { onBack: () => void; onOpenProjectDetail: (project: Project) => void; project: Project }) {
  const content = getGameShowcaseContent(project)

  return (
    <div className="game-showcase-page">
      <section className="game-showcase-hero">
        <div className="game-showcase-copy">
          <Text type="tertiary">独立试玩展示页</Text>
          <Title heading={1}>{project.title}</Title>
          <div className="detail-route-badge">
            <span>独立游戏展示页</span>
            <strong>/games/{getGameSlugByProjectId(project.id) ?? project.id}</strong>
          </div>
          <Paragraph>{content.tagline}</Paragraph>
          <Space wrap>
            <Button theme="solid" type="primary" onClick={() => onOpenProjectDetail(project)}>打开项目技术详情</Button>
            <Button onClick={onBack}>返回项目列表</Button>
          </Space>
        </div>
        <div className="game-showcase-stage">
          <div className="panel-window-bar" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          {project.image ? <img src={project.image} alt={project.title} /> : <span>{project.title}</span>}
          <div>
            <strong>展示状态</strong>
            <p>{content.stage}</p>
          </div>
        </div>
      </section>

      <section className="game-showcase-section">
        <div className="project-detail-section-head">
          <span className="section-pill">玩法拆解</span>
          <Title heading={2}>玩法体验</Title>
        </div>
        <div className="gameplay-list">
          {content.gameplay.map((item, index) => (
            <article key={item}>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="game-showcase-section">
        <div className="project-detail-section-head">
          <span className="section-pill">系统实现</span>
          <Title heading={2}>实现重点</Title>
        </div>
        <div className="game-system-grid">
          {content.systems.map((item) => (
            <article key={item.title}>
              <Title heading={3}>{item.title}</Title>
              <Paragraph>{item.detail}</Paragraph>
            </article>
          ))}
        </div>
      </section>

      <section className="game-showcase-section game-integration-section">
        <div className="project-detail-section-head">
          <span className="section-pill">接入计划</span>
          <Title heading={2}>试玩接入计划</Title>
        </div>
        <div className="project-roadmap-grid">
          {content.integration.map((item, index) => (
            <div key={item}>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function getCaseEvidenceDetail(caseId: string, evidence: string): string {
  const details: Record<string, Record<string, string>> = {
    'legal-rag': {
      '知识库导入页面': '展示合同文本如何进入知识库、如何保留来源与条款切片，证明问答上下文可追踪。',
      '引用溯源问答页面': '展示回答和 citations 同屏返回，方便业务人员从结论回到原文片段复核。',
      '合同风险审查工作台': '展示风险等级、问题说明、修改建议和人工复核标记，支撑可解释合同审查闭环。',
    },
    'ozon-erp': {
      '管理后台视图目录': '用于说明商品、订单、店铺、审批中心和任务中心等运营模块已经按职责拆分。',
      'Prisma 数据模型': '用于展示核心业务对象、审批动作、审计日志和任务队列的关系，已去除连接信息。',
      'Chrome MV3 插件入口': '证明平台侧采集和后台铺货不是孤立页面，而是通过插件与 API 串联。',
      '部署与交付文档': '覆盖迁移、备份、容器部署和交接检查，说明系统具备交付和接手资料。',
    },
    'pet-workspace': {
      'fantasy-pet-rule 工具链': '展示生成任务、Worker 编排、QA Gate、审核决策和产物索引的服务端管线。',
      'gamer app-facing 集成目录': '说明社区 API、审核后台、共享包和 App 集成测试在应用侧的职责边界。',
      'Android 浮窗宠物 MVP': '用于证明生成资产最终进入移动端消费场景，而不是只停留在服务端流程。',
      '生成产物与审核截图': '只保留脱敏后的流程证据，避免暴露真实任务 JSON、云端地址或候选素材来源。',
    },
    xunqiu: {
      '64 位客户端模块地图': '展示新客户端按首页、动态、社区、赛程、商品、个人中心和视频等模块恢复。',
      '服务端接口复用边界': '说明旧服务能力通过封装层接入新客户端，公开内容不包含真实服务地址和凭据。',
      '阶段迁移流程图': '用于说明从历史项目盘点、风险隔离、新客户端骨架到阶段验收的迁移路径。',
      '验收链路图': '用于证明构建检查、设备烟测、模块行为、专项路径和公开证据之间有可复现闭环。',
    },
    'godot-showcase': {
      'Godot project.godot 与 export_presets': '用于说明每个游戏都保留独立工程入口、导出预设和可迁移的运行边界。',
      'scenes/scripts/assets 目录结构': '通过场景、脚本和资源目录展示玩法、UI、实体和表现层的职责拆分。',
      'README 与阶段文档': 'README、roadmap、task-board、release notes 和试玩文档共同支撑项目阶段说明。',
      '验证日志与发布包目录': '只展示脱敏后的验证结论和发布材料类型，不公开本地构建路径、临时日志全文或分发包细节。',
    },
  }

  return details[caseId]?.[evidence] ?? '该证据来自项目目录中的公开文档、源码结构或运行材料，线上展示已脱敏处理。'
}

function CaseDetailView({ caseStudy, onBack, onOpenProject }: { caseStudy: CaseStudy; onBack: () => void; onOpenProject: (project: Project) => void }) {
  const project = projects.find((entry) => entry.id === caseStudy.projectId) ?? projects[0]
  const caseStats = [
    { label: '案例类型', value: caseStudy.eyebrow.split('/')[0].trim(), detail: caseStudy.status },
    { label: '交付成果', value: caseStudy.results.length.toString(), detail: caseStudy.outcome },
    { label: '证据材料', value: caseStudy.evidence.length.toString(), detail: '截图 / 文档 / 目录结构' },
  ]
  const workflow = caseStudy.results.map((item) => item.split('，')[0]).slice(0, 5)
  const caseImagesById: Record<string, Array<{ title: string; image: string; detail: string }>> = {
    'legal-rag': [
      { title: '合同审查工作台', image: '/images/projects/showcase/legal-rag-reviewed.png', detail: '按风险类型展示付款条款、交付标准、解除条款等审查结果。' },
      { title: '知识库导入', image: '/images/projects/showcase/legal-rag-knowledge.png', detail: '沉淀合同文本、条款切片和可追踪的知识库材料。' },
      { title: '引用溯源问答', image: '/images/projects/showcase/legal-rag-qa.png', detail: '回答法律问题时给出来源片段，便于解释和复核。' },
    ],
    'ozon-erp': [
      { title: 'ERP 运营总览', image: '/images/projects/showcase/erp-cover.svg', detail: '概括管理后台、API、数据库、Worker 和浏览器插件组成的全栈业务系统。' },
      { title: '运营链路', image: '/images/projects/showcase/ozon-erp-workflow.svg', detail: '展示后台操作、插件采集、API 校验、Worker 队列、安全写入和 Ozon 适配边界。' },
      { title: '数据与审批模型', image: '/images/projects/showcase/ozon-erp-data-model.svg', detail: '展示店铺、商品、订单、采集草稿、PendingAction、审计日志和任务队列的关系。' },
    ],
    'pet-workspace': [
      { title: '生成管线边界', image: '/images/projects/showcase/fantasy-pet-flow.png', detail: '展示 App 侧、生成规则服务、Worker、质量门禁和人工审核之间的职责边界。' },
      { title: '生成产物样例', image: '/images/projects/showcase/fantasy-pet-artifact.png', detail: '展示候选产物进入审核前的公开形态，保留结果观感，不暴露真实任务包或模型配置。' },
      { title: 'App API 契约', image: '/images/projects/showcase/fantasy-pet-api-contract.svg', detail: '展示创建任务、状态查询、候选索引、人审发布和打包下载的 app-safe 数据流。' },
    ],
    xunqiu: [
      { title: '64 位客户端模块地图', image: '/images/projects/showcase/xunqiu-module-map.svg', detail: '展示新客户端页面模块、公共能力和接口复用层的关系，不暴露真实服务地址。' },
      { title: '迁移流程', image: '/images/projects/showcase/xunqiu-migration-flow.svg', detail: '展示从旧工程参照到新 64 位客户端、分阶段模块恢复和公开验收资料的迁移路径。' },
      { title: '验收链路', image: '/images/projects/showcase/xunqiu-verification-chain.svg', detail: '展示构建、模拟器/真机、模块行为和发布清单组成的可复现验收闭环。' },
    ],
    'godot-showcase': [
      { title: '复古射击主菜单', image: '/images/projects/showcase/space-war-menu.png', detail: '展示 Space War 的项目入口、操作提示和复古低色视觉基调。' },
      { title: '单局玩法画面', image: '/images/projects/showcase/space-war-gameplay.png', detail: '展示横向推进、HUD、Sector 目标和即时操作反馈。' },
      { title: '结算与重开路径', image: '/images/projects/showcase/space-war-result.png', detail: '展示任务完成、得分、高分记录、重开和返回主菜单的完整闭环。' },
    ],
  }
  const caseImages = caseImagesById[caseStudy.id] ?? []

  return (
    <div className="case-detail-page">
      <section className="case-detail-hero">
        <div className="case-detail-copy">
          <Text type="tertiary">{caseStudy.eyebrow}</Text>
          <Title heading={1}>{caseStudy.title}</Title>
          <div className="detail-route-badge">
            <span>独立案例详情页</span>
            <strong>/cases/{caseStudy.id}</strong>
          </div>
          <Paragraph>{caseStudy.summary}</Paragraph>
          <Space wrap>
            <Button theme="solid" type="primary" onClick={() => onOpenProject(project)}>打开项目技术详情</Button>
            <Button onClick={onBack}>返回案例列表</Button>
          </Space>
        </div>

        <div className="case-detail-hero-panel">
          <div className="panel-window-bar" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          {project.image ? <img src={project.image} alt={caseStudy.title} /> : <span>{categoryLabels[project.category]}</span>}
        </div>
      </section>

      <section className="case-detail-stats" aria-label="案例关键指标">
        {caseStats.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
            <em>{item.detail}</em>
          </div>
        ))}
      </section>

      <section className="case-detail-section case-problem-section">
        <div>
          <span className="section-pill">问题与方案</span>
          <Title heading={2}>为什么这个案例值得展示</Title>
        </div>
        <div className="case-problem-grid">
          <article>
            <strong>业务问题</strong>
            <p>{caseStudy.challenge}</p>
          </article>
          <article>
            <strong>解决方式</strong>
            <p>{caseStudy.solution}</p>
          </article>
          <article>
            <strong>交付结果</strong>
            <p>{caseStudy.outcome}：{caseStudy.results.join('；')}。</p>
          </article>
        </div>
      </section>

      <section className="case-detail-section">
        <div className="case-section-head">
          <span className="section-pill">案例路径</span>
          <Title heading={2}>案例路径</Title>
        </div>
        <div className="case-workflow">
          {workflow.map((item, index) => (
            <div key={item}>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="case-detail-section case-architecture-section">
        <div className="case-section-head">
          <span className="section-pill">实现结构</span>
          <Title heading={2}>实现结构</Title>
        </div>
        <div className="case-architecture-grid">
          {caseStudy.architecture.map((item) => (
            <article key={item.title}>
              <Title heading={3}>{item.title}</Title>
              <Paragraph>{item.detail}</Paragraph>
            </article>
          ))}
        </div>
      </section>

      <section className="case-detail-section">
        <div className="case-section-head">
          <span className="section-pill">证据材料</span>
          <Title heading={2}>证据材料</Title>
        </div>
        <div className="case-image-grid">
          {caseImages.length > 0 ? caseImages.map((item) => (
            <article key={item.title}>
              <img src={item.image} alt={item.title} loading="lazy" />
              <div>
                <Title heading={3}>{item.title}</Title>
                <Paragraph>{item.detail}</Paragraph>
              </div>
            </article>
          )) : caseStudy.evidence.map((item, index) => (
            <article key={item} className="case-evidence-note">
              <div>
                <strong>{String(index + 1).padStart(2, '0')}</strong>
                <Title heading={3}>{item}</Title>
                <Paragraph>{getCaseEvidenceDetail(caseStudy.id, item)}</Paragraph>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="case-detail-section case-talking-section">
        <div>
          <span className="section-pill">讲解口径</span>
          <Title heading={2}>展示讲解口径</Title>
        </div>
        <div className="case-talking-list">
          {caseStudy.talkingPoints.map((item) => <p key={item}>{item}</p>)}
        </div>
      </section>
    </div>
  )
}

function BlogView({ onOpenPost, theme }: { onOpenPost: (post: BlogPost) => void; theme: SiteTheme }) {
  const featuredPost = blogPosts[0]
  return (
    <div className={`blog-view blog-view-${theme}`}>
      <section className="blog-hero">
        <Text type="tertiary">博客总览</Text>
        <Title heading={1}>博客系统</Title>
        <Paragraph>参考成熟技术博客的精选文章和最新文章结构，用统一的浅色/暗色风格记录项目复盘、工程学习和展示资料。</Paragraph>
      </section>

      <section className="blog-magazine">
        <div className="blog-magazine-head">
          <div>
            <span className="section-pill">精选与最新</span>
            <Title heading={2}>项目复盘与学习记录</Title>
          </div>
          <div className="blog-topic-pills" aria-label="博客栏目">
            <span>项目复盘</span>
            <span>AI 应用学习</span>
            <span>全栈工程记录</span>
            <span>展示资料</span>
          </div>
        </div>

        <article className="blog-featured-layout">
          <div className="blog-featured-main">
            <Text type="tertiary">示例博客 / 2026-06-11</Text>
            <Title heading={2}>从项目目录到博客系统：一次展示层重构记录</Title>
            <Paragraph>这次重构的核心不是把页面做得更满，而是把真实项目按照访问者能理解的方式重新组织。首页负责建立第一印象，项目页负责说明能力边界，案例页沉淀展示材料，博客页则记录持续学习和项目复盘。</Paragraph>
            <Button theme="solid" type="primary" onClick={() => onOpenPost(featuredPost)}>阅读示例文章</Button>
          </div>
          <aside className="blog-featured-aside">
            <Text type="tertiary">文章目录</Text>
            <strong>展示系统</strong>
            <span>项目目录</span>
            <span>案例矩阵</span>
            <span>学习记录</span>
          </aside>
        </article>

        <div className="blog-latest-head">
          <Title heading={3}>最新记录</Title>
          <Text type="tertiary">后续可以继续把项目更新、设计取舍和展示材料追加到这里。</Text>
        </div>

        <div className="blog-latest-grid">
          {blogPosts.map((post) => (
            <article key={post.title} className="blog-latest-card">
              <Text type="tertiary">{post.date}</Text>
              <Tag color={post.tag === 'AI 应用' ? 'cyan' : post.tag === '全栈开发' ? 'blue' : 'grey'}>{post.tag}</Tag>
              <Title heading={4}>{post.title}</Title>
              <Paragraph>{post.detail}</Paragraph>
              <Button theme="borderless" type="primary" onClick={() => onOpenPost(post)}>阅读全文</Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function BlogArticleView({ onBack, post, theme }: { onBack: () => void; post: BlogPost; theme: SiteTheme }) {
  return (
    <article className={`blog-article-page blog-view-${theme}`}>
      <header className="blog-article-hero">
        <Text type="tertiary">{post.tag} / {post.date} / {post.readTime}</Text>
        <Title heading={1}>{post.title}</Title>
        <Paragraph>{post.detail}</Paragraph>
        <Button theme="solid" type="primary" onClick={onBack}>返回博客</Button>
      </header>

      <div className="blog-article-layout">
        <aside className="blog-article-index">
          <Text type="tertiary">文章目录</Text>
          {post.sections.map((section) => <span key={section.title}>{section.title}</span>)}
        </aside>

        <main className="blog-article-content">
          {post.sections.map((section) => (
            <section key={section.title}>
              <Title heading={2}>{section.title}</Title>
              <Paragraph>{section.body}</Paragraph>
            </section>
          ))}

          <section className="blog-article-takeaways">
            <Title heading={2}>复盘结论</Title>
            {post.takeaways.map((item, index) => (
              <div key={item}>
                <strong>{String(index + 1).padStart(2, '0')}</strong>
                <span>{item}</span>
              </div>
            ))}
          </section>
        </main>
      </div>
    </article>
  )
}

function HomeProjectCard({ onOpen, project }: { onOpen: () => void; project: Project }) {
  return (
    <article className="home-project-card">
      <div className="home-project-cover">
        {project.image ? <img src={project.image} alt={project.title} loading="lazy" /> : <span>{categoryLabels[project.category]}</span>}
      </div>
      <div className="home-project-body">
        <Tag color={project.category === 'ai' ? 'cyan' : project.category === 'business' ? 'blue' : 'grey'}>{categoryLabels[project.category]}</Tag>
        <Title heading={4}>{project.title}</Title>
        <Paragraph>{project.summary}</Paragraph>
        <div className="home-project-stack">
          {project.stack.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
        </div>
        <Button theme="light" type="primary" onClick={onOpen}>查看项目</Button>
      </div>
    </article>
  )
}

function ProjectDetail({ onOpenCase, onOpenGameDetail, onOpenProjectDetail, project }: { onOpenCase: (caseStudy: CaseStudy) => void; onOpenGameDetail: () => void; onOpenProjectDetail: () => void; project: Project }) {
  const projectCase = getCaseStudyForProject(project.id)
  const gameSlug = getGameSlugByProjectId(project.id)

  return (
    <aside className="project-stage-detail">
      <Space wrap>
        <Tag color="blue">{categoryLabels[project.category]}</Tag>
        <Tag color={project.status === 'main' ? 'red' : project.status === 'live' ? 'green' : project.status === 'pending' ? 'grey' : 'orange'}>{statusLabels[project.status]}</Tag>
      </Space>
      <Title heading={2}>{project.title}</Title>
      <Paragraph>{project.summary}</Paragraph>

      <div className="meta-grid">
        <div><Text type="tertiary">交付范围</Text><strong>{project.role}</strong></div>
        <div><Text type="tertiary">工程材料</Text><strong>源码、文档、截图和构建记录已脱敏整理</strong></div>
      </div>

      <div className="stack-list">{project.stack.map((item) => <span key={item}>{item}</span>)}</div>
      <ul className="highlight-list">{project.highlights.map((item) => <li key={item}>{item}</li>)}</ul>

      <Space wrap>
        <Button theme="solid" type="primary" onClick={onOpenProjectDetail}>打开技术详情页</Button>
        {projectCase ? <Button theme="light" type="primary" onClick={() => onOpenCase(projectCase)}>打开业务案例</Button> : null}
        {gameSlug ? <Button theme="light" type="primary" onClick={onOpenGameDetail}>打开试玩展示</Button> : null}
        {project.links.map((link) => (
          <Button key={`${project.id}-${link.label}`} icon={link.type === 'external' ? <IconExternalOpen /> : <IconBriefcase />} onClick={() => {
            if (link.href.startsWith('/games/')) {
              onOpenGameDetail()
              return
            }
            if (link.type === 'external') window.open(link.href, '_blank', 'noopener,noreferrer')
          }}>
            {link.label}
          </Button>
        ))}
      </Space>
    </aside>
  )
}

export default App
