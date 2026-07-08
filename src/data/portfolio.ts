export type ProjectCategory = 'ai' | 'business' | 'interactive' | 'mobile' | 'platform'
export type ProjectStatus = 'main' | 'live' | 'mvp' | 'ongoing'

import { OZON_ERP_ENTRY_URL } from './siteLinks'

export interface ProjectLink {
  label: string
  href: string
  type: 'internal' | 'external'
}

export type ProjectDetailContentKey =
  | 'overview'
  | 'workflow'
  | 'architecture'
  | 'quality'
  | 'limitations'
  | 'roadmap'

export type ProjectVisualBlockType =
  | 'screenshot'
  | 'architecture'
  | 'workflow'
  | 'data-flow'
  | 'status'
  | 'release'
  | 'diagram'

export interface ProjectVisualBlock {
  id: string
  type: ProjectVisualBlockType
  title: string
  description: string
  image?: string
  alt?: string
  caption?: string
  sourceLabel?: string
  sourceUrl?: string
}

export interface ProjectDetailSection {
  title: string
  body?: string
  items?: string[]
  links?: ProjectLink[]
  visual?: ProjectVisualBlock
}

export type ProjectDetailContent = Partial<Record<ProjectDetailContentKey, ProjectDetailSection[]>>

export interface Project {
  id: string
  title: string
  summary: string
  category: ProjectCategory
  status: ProjectStatus
  role: string
  image?: string
  stack: string[]
  highlights: string[]
  detailLink?: ProjectLink
  links: ProjectLink[]
  detailContent?: ProjectDetailContent
  assistantContext?: string[]
}

const GAME_SITE_URL = 'https://games.playlab.eu.cc'
const PLAY_SITE_URL = 'https://play.playlab.eu.cc'
const XUNQIU_SITE_URL = 'https://xunqiu.playlab.eu.cc'
const XUNQIU_DOCS_URL = `${XUNQIU_SITE_URL}/docs.html`
const XUNQIU_BACKEND_DOCS_URL = `${XUNQIU_SITE_URL}/docs/technical/validation-and-deploy.md`
const XUNQIU_STAGE_APK_URL = `${XUNQIU_SITE_URL}/downloads/latest-xunqiu64.apk`

function externalLink(label: string, href: string): ProjectLink {
  return { label, href, type: 'external' }
}

function internalLink(label: string, href: string): ProjectLink {
  return { label, href, type: 'internal' }
}

function gameSiteLink(slug: string): ProjectLink {
  return externalLink('游戏站详情', `${GAME_SITE_URL}/games/${slug}/`)
}

function gamePlayLink(slug: string): ProjectLink {
  return externalLink('Web 试玩', `${PLAY_SITE_URL}/${slug}/index.html`)
}

export const categoryLabels: Record<ProjectCategory, string> = {
  ai: 'AI 应用',
  business: '业务系统',
  interactive: '互动体验',
  mobile: '移动端',
  platform: '博客系统',
}

export const statusLabels: Record<ProjectStatus, string> = {
  main: '重点展示',
  live: '已有页面',
  mvp: 'MVP',
  ongoing: '建设中',
}

export const projectDetailGroupLabels: Record<ProjectDetailContentKey, string> = {
  overview: '案例概览',
  workflow: '工作台能力',
  architecture: '实现与架构',
  quality: '质量与验证',
  limitations: '当前边界',
  roadmap: '后续优化',
}

export const projects: Project[] = [
  {
    id: 'legal-rag',
    title: 'Legal RAG｜法律智能机器人与合同审查',
    summary: '已部署的法律文档 RAG 与合同风险审查工作台，覆盖公开安全数据集导入、引用溯源问答、合同审查、质量评测和诊断面板。',
    category: 'ai',
    status: 'main',
    role: '全栈 MVP / RAG 流程 / 合同审查工作台',
    image: '/images/projects/showcase/legal-rag-reviewed.png',
    stack: ['Vue 3', 'Express', 'TypeScript', 'PostgreSQL', 'pgvector', 'RAG'],
    highlights: ['公开安全数据集', 'Hybrid Retrieval', '引用与诊断', '规则优先合同审查'],
    links: [
      externalLink('在线工作台', 'https://legal-rag-web.onrender.com'),
      externalLink('API Health', 'https://legal-rag-api-9bki.onrender.com/api/health'),
      internalLink('项目复盘', '/blog/legal-rag-review'),
      internalLink('生产化路线', '/blog/legal-rag-production-upgrade-plan'),
    ],
    detailContent: {
      overview: [
        {
          title: '从“问答机器人”推进到可演示工作台',
          body:
            'Legal RAG 的重点不是把合同丢给模型后返回一段结论，而是把文档入库、检索、引用、诊断、合同风险项和质量评测组织成一个可操作的工作台。访客可以看到知识库、问答、审查结果和质量面板，理解 AI 结论来自哪些片段以及系统为什么选择回答或拒答。',
          visual: {
            id: 'legal-rag-knowledge-ui',
            type: 'screenshot',
            title: '知识库工作台截图',
            description: '用真实工作台截图说明项目不是单轮聊天框，而是包含知识库、问答和诊断面的法律 RAG 工作区。',
            image: '/images/projects/showcase/legal-rag-knowledge.png',
            alt: 'Legal RAG 知识库工作台界面截图',
            caption: '公开展示知识库、问答和诊断区的工作台截图，不包含真实账号、密钥或私有后台地址。',
            sourceLabel: '打开工作台',
            sourceUrl: 'https://legal-rag-web.onrender.com',
          },
        },
        {
          title: '公开演示只使用安全材料',
          body:
            '公开演示围绕已脱敏或公开安全的数据集展开，展示登录后的知识库初始化、RAG 问答、合同审查和质量报告。真实后台/admin 密码、模型密钥、数据库连接串和部署后台信息不会进入公开页面；如果开放访客登录，只能发布专门创建的低权限 demo 凭据。',
        },
        {
          title: 'Demo 访问边界',
          body:
            '线上工作台有登录门禁，这是为了保护模型网关、上传接口和 pgvector 数据库资源。如果登录页显示“公开演示凭据”，访客可以使用页面给出的低权限 demo 凭据试用；如果没有显示凭据，则该入口仍是受控演示，需要维护者在 API 侧配置低权限登录密码，并在 Web 侧配置 VITE_PUBLIC_DEMO_EMAIL / VITE_PUBLIC_DEMO_PASSWORD 后重新部署。真实后台密码不能写进项目页、文章或状态页。',
        },
        {
          title: '泊岸品牌入口已同步',
          body:
            '线上工作台的页面标题、favicon、登录面板和侧边栏已经同步为 BIAU Port / 泊岸。Legal RAG 仍保留自己的产品名和登录门禁，品牌统一只用于说明它属于泊岸项目展示体系，不改变凭据公开规则。',
        },
      ],
      workflow: [
        {
          title: '公开演示路径',
          items: [
            '先打开带登录门禁的线上工作台，说明登录保护用于隔离模型 key、上传接口和数据库资源；如果登录页显示公开演示凭据，再使用页面给出的专用 demo 账号登录。',
            '如果登录页只显示邮箱和密码输入框、没有“公开演示凭据”区域，说明 Web 静态站尚未配置公开 demo 密码；这时不能把真实后台密码写到公开页面里，只能由维护者配置可公开、低权限、可轮换的 demo 凭据。',
            '进入知识库页初始化公开安全数据集，观察导入任务、文档判重、chunk 和 pgvector 持久化链路。',
            '切到智能问答，提问技术服务合同验收风险，重点看 answer、citations、diagnostics 和 answer source，而不是只看生成文本是否流畅。',
            '切到合同审查，使用示例合同查看风险条款、风险等级、修改建议、引用和导出边界。',
            '最后打开质量面板，核对模型/向量库运行态、知识库规模、RAG citation/refusal 评测、合同审查召回、readiness checks、趋势和审计日志。',
          ],
          visual: {
            id: 'legal-rag-demo-flow',
            type: 'workflow',
            title: '公开演示流程',
            description: '从登录门禁、数据集初始化、引用问答到合同审查和质量面板的访客演示路径。',
            image: '/images/projects/showcase/legal-rag-flow.svg',
            alt: 'Legal RAG 公开演示流程图',
            caption: '流程图用于说明推荐演示顺序，不代表线上环境已公开低权限 demo 凭据。',
          },
        },
        {
          title: '知识库与问答链路',
          items: [
            '支持文本、TXT、PDF、DOCX 和公共数据集进入 ingestion job，再生成可追踪的 document 与 chunk。',
            '问答结果附带 citations 和 diagnostics，帮助用户检查命中文档、片段、召回路径和回答边界。',
            '项目空间、文档、导入任务、问答、质量报告、评测运行和审计日志在后端路由中分别建模。',
          ],
        },
        {
          title: '合同审查链路',
          items: [
            '合同审查优先由确定性规则召回付款、交付、违约责任、知识产权、争议解决和终止等风险。',
            '模型只在已召回风险上辅助改写解释和建议，输出必须通过 schema 校验；不可用或不合法时回退到规则结果。',
          ],
        },
      ],
      architecture: [
        {
          title: 'RAG pipeline',
          body:
            '导入内容会先清洗文本，再按项目作用域做 SHA-256 去重和章节感知切分；随后通过 embedding provider 写入 memory 或 PostgreSQL + pgvector。查询时先做 query rewrite，再结合向量召回和关键词召回，经过候选合并、过滤、rerank 与可回答性判断，最后生成 grounded answer 或拒答，并返回 citations 与 diagnostics。',
        },
        {
          title: '全栈与部署形态',
          body:
            '项目采用 workspace monorepo：Web 端是 Vue 3、Vite、TypeScript，API 端是 Node.js、Express、TypeScript，并通过 shared package 复用请求/响应类型。API Dockerfile 会构建 shared 与 API 输出、复制数据集并暴露服务端口，线上演示使用可替换的模型与向量存储适配器；配置用户、项目成员和项目空间授权则把公开 demo 从单用户样例推进到更接近团队试用的边界。',
        },
        {
          title: '适配器取舍',
          body:
            '本地或轻量演示可以使用 mock provider 与 memory vector store；需要持久化与线上演示时切换到 OpenAI-compatible provider、PostgreSQL 与 pgvector。这个边界让演示、开发和部署不被单一模型或向量库绑定。',
        },
      ],
      quality: [
        {
          title: '评测与质量面板',
          body:
            '仓库中保留 RAG 问答和合同审查的 eval fixtures，API 也提供 quality 与 evaluation 报告路由。页面中的质量面板用于展示检索命中、引用、结构化审查等维度，让调整 chunk、召回、rerank 或提示词时有可对比的基线。',
          visual: {
            id: 'legal-rag-quality-boundary',
            type: 'status',
            title: '质量报告边界',
            description: '用质量报告示意图区分公开可展示的评测信息和不能进入公开页面的私有配置。',
            image: '/images/projects/showcase/legal-rag-report-boundary.svg',
            alt: 'Legal RAG 质量报告与公开边界示意图',
            caption: '边界示意图只归纳公开可展示的信息类型，不包含真实模型、数据库或后台配置。',
          },
        },
        {
          title: '演示健康检查',
          items: [
            'Web e2e smoke 会检查 API health，并在启用认证时通过环境变量读取 demo email/password 登录，不把密码写进仓库。',
            'Smoke 会初始化或复用公开安全数据集，再执行一次 RAG 问答，断言 answer、citations、retrieved chunks 和 diagnostics 可用。',
            '失败信息会指向 health、auth、dataset seed、ingestion job、RAG query 或 Web 渲染中的具体环节，方便演示前排查。',
          ],
        },
        {
          title: '质量面板看什么',
          items: [
            '运行时状态展示模型提供商、向量库、embedding 模型、文档数和 chunk 数，帮助判断当前是本地 mock/memory 还是线上 pgvector 模式。',
            'RAG 评测区区分 citation 命中、可回答准确率和拒答准确率，能解释系统为什么在资料不足时不强答。',
            '合同审查评测展示标注风险命中和召回率，避免只凭一段模型解释判断审查质量。',
            'readiness checks、质量趋势和审计日志把一次演示从“能回答”推进到“能复盘、能比较、能审计”。',
          ],
        },
        {
          title: '可解释性优先',
          items: [
            '问答要求基于召回片段生成，引用不足时可以拒答或返回边界说明。',
            '合同审查的高风险项来自规则命中，模型增强只改变表达，不绕过风险识别和 schema 校验。',
            '审计与诊断信息帮助复盘一次回答从导入、检索到生成的关键步骤；项目空间变更、数据集导入、RAG 问答和合同审查等敏感动作都会留下可查询的 audit log。',
          ],
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            '公开页面只展示脱敏演示能力，不提供真实法律意见，也不公开内部凭据或运营后台细节。',
            '演示数据集覆盖的是可公开展示场景，真实业务还需要更完整的权限、数据治理、人工复核和合规流程。',
            '复杂扫描件、低质量 PDF、跨文档长链推理和专业法域覆盖仍适合作为后续增强方向。',
          ],
        },
      ],
      roadmap: [
        {
          title: '下一轮版本迭代方向',
          items: [
            '补充数据库用户、邀请和更细的项目空间权限，让公开演示和团队试用边界更清楚。',
            '扩展更多脱敏法律数据集，并把评测趋势沉淀成可长期比较的质量报告。',
            '加强 OCR、rerank 模型、CI 与镜像发布，让导入质量、召回排序和部署可复现性继续提升。',
          ],
        },
      ],
    },
    assistantContext: [
      'Legal RAG 是已部署的全栈法律文档 RAG 与合同审查工作台，前端使用 Vue 3/Vite/TypeScript，后端使用 Express/TypeScript，共享类型包连接 Web 与 API。',
      '系统支持公开安全数据集和文档导入，RAG pipeline 包含清洗、项目级 SHA-256 去重、章节感知 chunk、embedding、memory/pgvector 存储、query rewrite、向量+关键词混合召回、merge/filter/rerank、grounded answer 或 refusal、citations 与 diagnostics。',
      '合同审查采用规则优先策略，规则召回付款、交付、违约责任、知识产权、争议解决和终止等风险；模型只辅助改写已召回风险的解释和建议，并在 schema 校验失败时回退到规则结果。',
      '项目包含 RAG 与合同审查 eval fixtures、quality/evaluation 报告路由和质量面板，适合说明 AI 应用如何做引用溯源、可解释风险审查和质量评测。',
      'Legal RAG 后端还把配置用户、项目成员、项目空间授权、ingestion job 和 audit log 纳入数据模型，让公开演示能够解释“谁在什么项目空间里做了什么 AI 操作”。',
      'Legal RAG Web 工作台的标题、favicon、登录面板和侧边栏已对齐 BIAU Port / 泊岸品牌；公开试用凭据仍只能通过低权限、可轮换、可公开的 demo 配置展示。',
      '线上工作台入口是 https://legal-rag-web.onrender.com，有登录门禁，公开页面不会放真实后台/admin 密码；如果 Legal RAG 登录页显示公开演示凭据，访客可以使用页面给出的低权限 demo 凭据试用；如果没有显示凭据，则仍是受控演示入口。',
      'Legal RAG 公开自助试用需要维护者同时配置 API 侧登录校验密码和 Web 侧 VITE_PUBLIC_DEMO_EMAIL / VITE_PUBLIC_DEMO_PASSWORD；VITE_PUBLIC_DEMO_PASSWORD 会进入前端包，所以只能填写可公开、低权限、可轮换的 demo 密码。',
      '推荐公开演示顺序是：登录受保护工作台、初始化公开安全数据集、执行带 citation/diagnostics 的 RAG 问答、运行示例合同审查、查看质量面板的 runtime、citation/refusal 评测、审查召回、readiness checks、趋势和审计日志。',
      '后续优化方向包括更完整的用户/邀请权限、更多脱敏数据集、评测趋势、OCR、rerank 模型、CI 与镜像发布。',
    ],
  },
  {
    id: 'pet-workspace',
    title: 'AI 桌宠社区与生成管线',
    summary: '仍在推进中的 AI 桌宠工程工作区，围绕 Android 桌宠社区、Community API、生成服务、人审发布、质量门禁和 App 安全契约组织。',
    category: 'ai',
    status: 'main',
    role: 'Android App / Community API / 生成管线 / 质量门禁 / 人审发布',
    image: '/images/projects/showcase/fantasy-pet-flow.png',
    stack: ['Android', 'Node.js', 'FastAPI', 'PostgreSQL', 'Agent Worker', '质量门禁'],
    highlights: ['桌宠孵化', '社区审核', '不透明下载 ID', '人审发布'],
    links: [
      externalLink('App 展示页', '/pet-app-showcase/'),
      externalLink('展示页源码', 'https://github.com/Drew-Z/gamer/tree/cursor-windows-migration/pet-app-showcase-site'),
      internalLink('生成管线文章', '/blog/pet-workspace-pipeline'),
    ],
    detailContent: {
      overview: [
        {
          title: '一个还在打磨的 AI 桌宠产品工作区',
          body:
            '这个项目不是单一 Demo，而是把 Android 桌宠呈现、社区 Feed、桌宠生成、导入草稿、审核队列、奖励账本和生成质量门禁拆成多个协作模块。当前适合展示“项目正在如何被工程化”：哪些能力已经有代码和测试，哪些仍处在生产化补强阶段。',
        },
        {
          title: '公开页面只说明工程结构',
          body:
            '公开案例不会暴露真实部署主机、提供商地址、密钥、连接串、适配器配置或私有运维命令；它只说明 App、网关、生成服务、Worker、人审和质量证据之间的关系。',
        },
        {
          title: '新增 App 展示与下载状态页',
          body:
            '当前已经在主站补充 /pet-app-showcase/ 独立静态展示页，用真实 Android 模拟器截图呈现桌宠模式、孵化桌宠、社区和个人页。页面标题、favicon 和入口文案已接入 BIAU Port / 泊岸统一品牌；APK 区域明确标注待正式签名包，记录 debug 构建只用于内部验证，不提供占位下载链接，也不把 debug 包包装成公开发布包。',
          visual: {
            id: 'pet-android-app-showcase',
            type: 'screenshot',
            title: 'Android App 展示截图',
            description: '展示桌宠模式首页，让访客先看到当前 App 工作状态，再理解 APK 发布门禁。',
            image: '/images/projects/showcase/android-main.png',
            alt: 'Gamer Pet App 桌宠模式首页截图',
            caption: '真实模拟器截图用于展示当前 App 工作面；APK 下载仍受正式签名包和人工批准门禁约束。',
            sourceLabel: '打开 App 展示页',
            sourceUrl: '/pet-app-showcase/',
          },
        },
        {
          title: 'APK 发布门禁最新结论',
          body:
            '最近一次发布门禁审计只在 Pet 工作区找到 debug APK，没有找到满足公开条件的 release APK 或 AAB。因此主站和展示页继续保持 APK 下载关闭；后续必须补正式 release 构建、签名策略、校验摘要、版本说明、基础回归和人工确认后才能公开下载。',
        },
      ],
      workflow: [
        {
          title: 'App 与社区体验',
          items: [
            'Android 侧包含桌宠 shell、默认桌宠资产、桌面悬浮服务、生成 UI 状态、Community API 客户端和 pet.zip 导入请求构造。',
            '社区链路覆盖动态流、社区首页、已通过桌宠展架、资源包下载、签到、钱包、导入草稿、提交审核和审核结果回流。',
            'Admin Review 提供内部审核队列和审核决策界面，用来把候选桌宠从“可看”推进到“可发布”。',
            '静态展示页把当前 App 画面、下载门禁和后续发布条件整理给访客查看，避免只展示内部工程文档。',
          ],
        },
        {
          title: '生成与人审链路',
          items: [
            '用户提交文本描述后，App 只通过 Community API 进入生成网关，不直接触达生成内核、Agent、Worker 或文件系统。',
            '生成服务创建任务、准备可信 Worker 流程，由编排/生成/复核阶段产出候选、QA 证据和 App 安全状态。',
            '候选必须经过人工视觉审核；机器 QA、Agent 复核和回归记忆只作为修复压力与审计证据，不能替代人审 accept。',
            '包下载通过不透明 downloadId 暴露给 App，内部路径、Worker 命令、提示词包和运行配置不会出现在公开响应里。',
          ],
          visual: {
            id: 'pet-review-flow',
            type: 'workflow',
            title: '生成到人审发布流程',
            description: '从用户提交、生成候选、QA 证据、人审通过到不透明下载 ID 的发布链路。',
            image: '/images/projects/showcase/fantasy-pet-review-flow.svg',
            alt: 'AI 桌宠生成候选到人审发布的流程图',
            caption: '流程图说明生成到人审发布的工程链路，不暴露私有 Worker、提示词包或运行配置。',
          },
        },
      ],
      architecture: [
        {
          title: '分层边界',
          body:
            '工作区按职责拆分：Android App 负责桌宠呈现和用户交互；Community API 是 App 唯一后端入口；Admin Review 面向审核人员；Pet Generator 适配生成结果进入社区；生成规则服务负责服务端生成任务、Worker 编排、QA、学习记忆和包构建。这个边界让 App 保持轻量，也避免把高权限生成能力下放到客户端。',
          visual: {
            id: 'pet-api-contract',
            type: 'architecture',
            title: 'App 安全 API 边界',
            description: '说明 App、Community API、生成服务、审核台之间的职责边界，避免公开页面暗示客户端能直连生成内核。',
            image: '/images/projects/showcase/fantasy-pet-api-contract.svg',
            alt: 'AI 桌宠 App 安全 API 边界架构图',
            caption: '架构图强调客户端只能通过 Community API 访问后端能力，不代表公开环境已开放生成内核。',
          },
        },
        {
          title: 'Community API',
          body:
            'Community API 采用 Node workspace 组织，路由覆盖健康检查、SLA、Metrics、Feed、社区首页、已通过桌宠、资源包、钱包、签到、提交、导入草稿、包校验、审核队列和审核决策。存储层支持本地 JSON 快照和 PostgreSQL 迁移路径，便于先验证产品闭环，再继续推进持久化和运维能力。',
        },
        {
          title: '生成服务与质量门禁',
          body:
            '生成规则服务提供 App 安全 API、任务轮询、候选 artifact 索引、人工审核、包计划和 pet.zip 构建。内部 Worker 会按编排、生成、复核和 QA 阶段留下可审计证据，并把循环锚点、可见运动、透明背景、布局选择、动作稳定性和阶段门禁作为生成质量压力。',
        },
      ],
      quality: [
        {
          title: '测试与追踪证据',
          items: [
            'gamer workspace 有 Node 测试脚本覆盖 apps、packages、services 和 tools；Android 侧有生成 UI、API mapper、Repository、桌宠 shell、导入请求构造等单元测试。',
            'Community API 测试覆盖 health、鉴权、Feed、已通过桌宠、资源包、导入草稿、审核、签到、钱包、SLA、限流、结构化日志、指标和 PostgreSQL 迁移。',
            'private-ops preflight、smoke 和 target hooks audit 脚本把私有部署面、Community API、Admin Review 与 Worker gate 拆成可检查清单；公开案例只复述检查形态，不暴露私有 token 或部署地址。',
            '追踪矩阵把孵化室、桌宠呈现、社区展示、创作审核、奖励账本、安全边界、限流 SLA、生成质量和数据模型映射到测试用例。',
          ],
        },
        {
          title: '可观测与运行约束',
          items: [
            'Community API 已有结构化日志、敏感字段脱敏、Prometheus 指标、SLA 配置端点和限流策略设计。',
            '项目文档明确区分公开 App API、内部 Admin/Worker surface、服务器证明摘要和学习记忆，避免把过程完成误写成视觉质量通过。',
            '当前 Android 模拟器端到端和私有 live 部署验证仍依赖替代证据路线，适合在案例页中如实说明为后续生产化方向。',
          ],
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            '这是进行中的产品工程，不应描述为已经完全生产化的公共 AI 桌宠平台。',
            '公开 APK 还没有开放下载；展示页只说明当前 App 画面、debug 构建内部验证信号和发布门禁，不提供伪造或占位下载。',
            '当前本地只确认到 debug APK 产物；debug APK 不能作为公开下载包、应用商店发布物或长期版本承诺。',
            '真实生成 Worker、模型适配、私有运维、部署验证、租户权限和完整鉴权仍属于受控后台能力，不对公开访客开放。',
            '机器 QA 只能帮助发现透明背景、动作稳定性、循环锚点和布局问题，最终发布仍需要人类视觉审核。',
            'Android 真实设备/模拟器端到端、长期 SLA、队列守护、运维 Runbook 和监控告警仍需要继续补强。',
          ],
        },
      ],
      roadmap: [
        {
          title: '后续优化方向',
          items: [
            '把 PostgreSQL 持久化、迁移演练、备份恢复和数据治理补成稳定运行路径。',
            '完善认证、租户隔离、下载权限、审核权限和生成任务限流，减少演示态与真实使用之间的差距。',
            '把 Worker 池化、队列位置、动态 SLA、失败恢复和运行面板做成可运营能力。',
            '继续提升 Android 端桌宠交互、候选画廊、反馈备注、真实设备 E2E 和桌宠资源包体验。',
            '沉淀生成质量回归报告，让动作、透明背景、包结构和人审反馈可以跨版本对比。',
            '继续完善 App 展示页的版本说明、APK 校验摘要和更新日志；只有在签名、版本说明、回归和人工审核完成后再开放 APK 下载。',
          ],
        },
      ],
    },
    assistantContext: [
      'AI 桌宠项目是进行中的多模块工程工作区，核心包括 Android 桌宠社区 App、Node Community API、Admin Review、Pet Generator 适配层、FastAPI 风格生成规则服务、可信 Worker、QA 门禁和人工审核发布链路。',
      'Android 侧覆盖桌宠 shell、默认桌宠资产、桌面悬浮服务、生成 UI 状态、Community API client、pet.zip 导入请求构造和社区交互，不直接调用生成内核或 Agent。',
      'Community API 是 App 唯一后端入口，包含 health、SLA、metrics、feed、community-home、approved pets、package download descriptor、wallet、check-in、submissions、import drafts、bundle validation、admin review 和 fantasy-pet proxy 等能力。',
      '生成规则服务负责 app-safe job 创建、轮询、artifact 索引、不透明 downloadId、人工 review decision、package plan、pet.zip 构建、worker readiness 和内部 GA/Codex/QA 证据；机器证据不能替代人工视觉 accept。',
      '质量证据包括 Node workspace tests、Android 单元测试、Community API routes/server/store/rate-limit/metrics/SLA/logging/postgres 测试、pet package contract 测试、追踪矩阵、结构化日志、Prometheus metrics 和 SLA 文档。',
      '私有运维侧有 preflight、smoke 和 target hooks audit 脚本，用来检查 Community API、Admin Review、Worker gate 和受控部署面；公开助手只能说明这种验证形态，不能透露私有 token、部署地址或 Worker 命令。',
      '项目已在主站提供 /pet-app-showcase/ 静态 App 展示与下载状态页，使用 BIAU Port / 泊岸标题与 favicon，并用真实 Android 模拟器截图展示桌宠模式、孵化桌宠、社区和个人页；APK 区域明确标注待正式签名包，debug 构建只作为内部验证信号，不提供占位下载。',
      '最近一次 APK 发布门禁审计只找到 debug APK，没有 release APK/AAB 候选；公开下载继续关闭，后续需要正式构建、签名策略、校验摘要、版本说明、回归证据和人工确认。',
      '当前项目应被描述为 WIP：Android 模拟器 E2E、live 私有部署验证、生产鉴权、租户隔离、Worker daemon、队列运营、Runbook、长期 SLA 和可观测告警仍是后续优化方向。',
    ],
  },
  {
    id: 'ozon-erp',
    title: 'Ozon 电商 ERP',
    summary: '面向小团队 Ozon 店铺运营的业务系统案例，覆盖 Vue 管理后台、Express API、Prisma/PostgreSQL、队列任务和 Chrome MV3 采集插件。',
    category: 'business',
    status: 'main',
    role: '业务系统 / 管理后台 / API / 数据模型 / 浏览器插件',
    image: '/images/projects/showcase/erp-cover.svg',
    stack: ['Vue 3', 'Vite', 'Express', 'Prisma', 'PostgreSQL', 'Redis', 'BullMQ', 'WXT', 'Chrome MV3'],
    highlights: ['运营后台', '采集铺货', '受保护写入', '任务与审计闭环'],
    links: [
      externalLink('访问 ERP', OZON_ERP_ENTRY_URL),
      internalLink('架构文章', '/blog/ozon-erp-architecture'),
    ],
    detailContent: {
      overview: [
        {
          title: '从商品运营到可追踪的业务系统',
          body:
            'Ozon ERP 面向小团队的跨境店铺运营：店铺授权、商品同步、采集铺货、草稿编辑、定价利润、选品规则、导入历史和操作追踪被组织在一个可登录、可部署、可交接的工作区里。它不是单页展示或一次性脚本，而是把后台、API、数据库、插件和任务状态串成长期维护的业务链路。',
          visual: {
            id: 'ozon-erp-admin-runtime',
            type: 'screenshot',
            title: 'ERP 管理后台截图',
            description: '用真实后台运行截图展示这个项目的主要工作面，区别于只放一张抽象封面。',
            image: '/images/projects/showcase/ozon-erp-admin-runtime.png',
            alt: 'Ozon ERP 管理后台运行界面截图',
            caption: '截图只展示公开安全的演示界面，不包含真实店铺凭据或订单数据。',
            sourceLabel: '访问 ERP',
            sourceUrl: OZON_ERP_ENTRY_URL,
          },
        },
        {
          title: '公开主站只承担项目说明',
          body:
            'BIAU Port 保留项目案例、架构说明和外部入口；真正的 ERP 管理后台通过独立链接访问。这样访客能理解系统价值和工程边界，业务账号、店铺凭证、数据库、扩展密钥和运行环境配置仍留在 ERP 自己的安全边界内。',
        },
      ],
      workflow: [
        {
          title: '管理后台工作流',
          items: [
            'Vue/Vite 管理后台包含登录、注册、Owner 初始化、概览、店铺、商品、商品草稿、导入历史、工具、选品规则、商品编辑和设置等路由。',
            '店铺侧维护授权状态、区域、币种、商品上限和 Seller 会话；商品侧承接同步、价格、库存、类目、图片、评分和导入回读。',
            '采集商品进入采集箱或草稿后，可以继续编辑标题、描述、图片、规格、重量、品牌、价格、库存和 Ozon 上架字段，再提交受控写入。',
          ],
          visual: {
            id: 'ozon-erp-workflow',
            type: 'workflow',
            title: '运营工作流',
            description: '把店铺授权、插件采集、草稿编辑、受保护写入和审计追踪放在同一条可解释流程里。',
            image: '/images/projects/showcase/ozon-erp-workflow.svg',
            alt: 'Ozon ERP 店铺运营工作流图',
            caption: '流程图归纳运营动作与受保护写入边界，不包含真实店铺账号、扩展密钥或订单数据。',
          },
        },
        {
          title: '认证入口体验',
          items: [
            '登录/注册页已经整理成 BIAU Port / 泊岸统一品牌外壳，左侧主视觉显示泊岸归属和 Ozon ERP 产品名，并用“店铺授权、插件采集、后台回填”的链路说明 ERP 的真实工作方式。',
            '登录后工作台侧栏也使用泊岸统一图标和 BIAU Port / 泊岸归属说明，Ozon ERP 保留为业务系统产品名；访客从主站进入 ERP 时可以返回项目说明，也能区分登录、普通注册和首次 Owner 初始化。',
            '普通注册和 Owner 初始化增加确认密码校验，在请求 API 前拦截两次密码不一致的情况。',
            '代码侧已经支持生产普通自助注册默认开放；实际线上入口仍以 /api/auth/bootstrap 和状态页 synthetic 结果为准，如果状态页显示注册策略 degraded，应先确认线上部署是否包含最新注册提交，再检查 ERP_REGISTRATION_ENABLED 是否被显式关闭。',
            '已有 Owner 后，新注册账号默认是 operator，不自动获得 Owner 权限；首次 Owner 初始化仍只在系统没有管理员时开放。',
            '如果 bootstrap 状态请求失败，前端不会默认展示自助注册入口，而是回到更保守的受控登录状态。',
          ],
        },
        {
          title: '登录后首次引导',
          items: [
            '概览页已经补充当前账号和角色上下文，让 Owner / 管理者与协作者 / 操作员能在进入后台后看到不同职责说明。',
            'Owner 视角强调店铺凭据、插件发布、关键配置和普通注册权限边界；协作者视角强调使用已配置好的同步、上架记录和工具流程。',
            '首次进入建议直接指向已实现路径：店铺配置、插件下载、同步 Seller 商品和查看上架记录，不添加未落地入口。',
          ],
        },
        {
          title: '插件与 Seller 页面协同',
          items: [
            'Chrome MV3/WXT 插件负责 Ozon 商品页、Seller 页面和 ERP 后台之间的桥接，提供采集、Seller 上下文读取、跨标签页请求、下载图片和打开 ERP 路由等能力。',
            '插件请求会经过 ERP API 的认证或扩展密钥边界，不把浏览器侧采集动作直接变成不可追踪的外部平台写入。',
            '插件版本检查和下载包同步由脚本和 API 支撑，便于在后台提示升级并减少前后端协议错位。',
          ],
        },
      ],
      architecture: [
        {
          title: '工作区分层',
          body:
            '代码组织为 workspace：apps/web 承载 Vue 管理后台，apps/api 承载 Express API、Prisma 和任务执行，apps/extension 承载 WXT 浏览器插件，packages/shared 放共享类型和利润/Ozon 计算逻辑。这让前端展示、后端写入、插件采集和共享计算各自有清晰边界。',
        },
        {
          title: 'API 与数据模型',
          body:
            'Express 服务注册了 auth、shops、products、selection、settings、ozon、collect、market metrics、commission rates、api.chrome、exchange rates、watermark 和 uploads 等路由。Prisma 模型覆盖用户、店铺、Ozon 凭证、Seller 会话、仓库、同步状态、商品、采集商品、草稿、导入日志、待处理动作、市场指标、佣金映射、任务队列和审计日志。',
          visual: {
            id: 'ozon-erp-data-model',
            type: 'data-flow',
            title: '数据模型与写入边界',
            description: '展示用户、店铺、商品、草稿、任务和审计之间的关系，帮助访客理解业务系统不只是前端页面。',
            image: '/images/projects/showcase/ozon-erp-data-model.svg',
            alt: 'Ozon ERP 数据模型与业务写入边界图',
            caption: '数据模型图只展示公开安全的对象关系和写入边界，不公开数据库连接串或生产表数据。',
          },
        },
        {
          title: '受保护写入边界',
          body:
            '商品上架、调价、库存和归档等外部平台写入会先创建 PendingAction 与 JobQueue 记录，再根据配置选择队列/后台执行或显式 inline 执行。当前代码和测试表明，商品写入与一键铺货默认偏向队列或本地后台执行，避免页面或插件长时间等待外部平台任务完成。',
        },
        {
          title: '队列、Worker 与恢复',
          body:
            'Redis/BullMQ 是可选队列层：设置 Redis 队列后由独立 Worker 执行 ERP jobs；未启用 Redis 时，服务端仍会调度本地后台任务，并在启动时恢复未完成的商品写入任务。这个设计让单机部署和队列部署都能跑通，但也要求生产环境明确选择运行模式。',
        },
      ],
      quality: [
        {
          title: '测试与验收证据',
          items: [
            'API 和共享包使用 Vitest；测试覆盖受保护写入、队列/inline 行为、本地恢复、商品导入历史、Seller 回读、非重试错误、Ozon 同步容错、类目本地化、佣金可信度和插件接口映射。',
            '构建前会检查浏览器插件的 WXT manifest、popup、content script、共享发布元数据和下载包版本是否一致，减少“后台提示一个版本、插件实际又是另一个版本”的交付错位。',
            'smoke 脚本验证种子账号、店铺数量和导入日志数量等基础运行状态，交付清单要求跑依赖安装、测试、构建和 Docker 配置检查。',
            '上线检查报告验证 API health、真实 adapter 状态、插件版本一致性和 Seller 样本覆盖，同时把佣金覆盖不足标记为需要保守展示的风险。',
          ],
        },
        {
          title: '数据可信度策略',
          body:
            '佣金和市场指标不是简单凑字段展示：代码区分官方商品价格接口、人工确认映射、历史观测映射和未可信来源。未确认的佣金保留空值或占位，不为了页面完整度去猜测费率，这一点也体现在 api.chrome 的映射测试里。',
        },
        {
          title: '部署与交接边界',
          body:
            '项目有 Docker、本地恢复、独立服务器部署、数据库备份恢复、插件发布和交接清单等材料。公开页面只描述这种工程形态，不公开真实账号、连接串、扩展密钥、部署主机用户或运维后台细节。',
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            '真实 Ozon 写入必须由运行环境显式开启并配合正确凭证；测试、培训或演示环境应保持 mock 或关闭真实写入。',
            '队列模式需要 Worker 同步运行；如果只启动 API 而没有 Worker，部分任务会停留在队列或依赖本地恢复策略。',
            '佣金覆盖仍需要持续补齐可信来源；未确认类目不能为了好看而硬映射。',
            '浏览器插件依赖 Seller 页面结构、权限、Cookie 和跨标签页通信，外部页面变化会带来维护成本。',
            '已知依赖审计提示主要集中在插件开发工具链，生产路径暂不靠强制降级清零，需要跟随上游升级节奏处理。',
          ],
        },
      ],
      roadmap: [
        {
          title: '后续优化方向',
          items: [
            '加强运行模式可视化，把 mock/real、queue/inline、Worker 状态、最近恢复任务和外部写入开关放进更清晰的运维面板。',
            '继续补齐佣金可信映射和 Seller/Ozon 回读覆盖，建立更稳定的人工确认、来源追踪和回归报告流程。',
            '完善权限、审计查询、操作回滚、失败重试和导入历史诊断，让真实运营动作更容易追责和复盘。',
            '优化插件配置与发布链路，减少默认配置、扩展密钥和下载包版本管理对人工流程的依赖。',
            '逐步增强监控、备份演练、日志脱敏、依赖升级和部署自动化，把自用系统推进到更稳的生产运营形态。',
            '把私有部署脚本中的主机、账号和上传细节迁移到更标准的 CI/CD secret 管理里，公开案例页只保留部署形态和验证方法。',
          ],
        },
      ],
    },
    assistantContext: [
      'Ozon ERP 是面向小团队跨境店铺运营的业务系统，包含 Vue/Vite 管理后台、Express API、Prisma/PostgreSQL 数据模型、可选 Redis/BullMQ 队列、WXT/Chrome MV3 浏览器插件和共享计算包。',
      '管理后台覆盖登录、注册、Owner 初始化、概览、店铺、商品、商品草稿、导入历史、工具、选品规则、商品编辑和设置等工作流，重点解决店铺授权、商品同步、采集铺货、定价利润和运营追踪。',
      '认证入口已经补充确认密码校验、Owner 初始化提示、主站返回桥接、BIAU Port / 泊岸 favicon、登录页主品牌和登录后侧栏归属；Ozon ERP 保留为业务系统产品名。',
      '代码侧已经支持生产普通自助注册默认开放；线上是否正在开放以 /api/auth/bootstrap 与状态页 synthetic 结果为准，状态异常时应先复查部署提交与 ERP_REGISTRATION_ENABLED 开关。',
      'ERP 概览页已经补充登录后首次引导，展示当前账号/角色、Owner 与协作者职责说明，并说明已有 Owner 后新注册账号默认是 operator，不自动获得 Owner 权限。',
      'Express API 注册 auth、shops、products、selection、settings、ozon、collect、market metrics、commission rates、api.chrome、exchange rates、watermark 和 uploads 等路由。',
      'Prisma 模型覆盖用户、店铺、Ozon 凭证、Seller 会话、商品、采集商品、草稿、导入日志、PendingAction、JobQueue、AuditLog、市场指标和佣金映射等对象。',
      '外部平台写入通过 PendingAction 和 JobQueue 收口；当前代码和测试显示商品写入与一键铺货默认偏向队列或本地后台执行，只有显式配置 inline 才同步执行。',
      '浏览器插件负责 Ozon/Seller 页面采集、Seller 上下文读取、跨标签页请求、ERP 路由打开和图片下载，并通过认证或扩展密钥边界接入 ERP API。',
      '项目验证证据包括 API/shared Vitest、受保护写入测试、Ozon 同步容错测试、插件接口映射测试、插件版本发布检查、smoke 脚本、交接清单、上线检查、佣金覆盖报告和依赖审计记录。',
      '后续优化方向包括运行模式可视化、Worker/队列运维、佣金可信映射补齐、权限和审计增强、插件发布自动化、日志脱敏、备份演练和部署自动化。',
    ],
  },
  {
    id: 'biau-playlab',
    title: 'BIAU Playlab｜游戏作品集与系统设计内容站',
    summary: '基于 Astro 的独立游戏作品集与试玩平台，整合六个已部署 Godot Web 游戏、项目详情、截图/视频、开发日志和系统设计文章。',
    category: 'platform',
    status: 'live',
    role: 'Astro 作品集 / Godot Web 试玩 / 内容审计 / Cloudflare Pages',
    image: '/images/projects/showcase/space-war-web-showcase.png',
    stack: ['Astro 5', 'Content Collections', 'Godot Web', 'Cloudflare Pages', 'R2'],
    highlights: ['六个可试玩游戏', '项目详情页', '内容审计', '公开端点检查'],
    detailLink: externalLink('进入游戏站', `${GAME_SITE_URL}/`),
    links: [
      externalLink('游戏站', `${GAME_SITE_URL}/`),
      externalLink('源码仓库', 'https://github.com/ciallo-bill/blog'),
      internalLink('展示标准文章', '/blog/game-showcase-standard'),
    ],
    detailContent: {
      overview: [
        {
          title: '把游戏原型变成可访问的作品集平台',
          body:
            'BIAU Playlab 不是只放几张截图的列表页，而是把六个 Godot 项目整理成可访问、可试玩、可复盘的内容站。访客可以从游戏总览进入单个项目详情，再跳到独立 Web 试玩入口，看到玩法目标、机制贡献、截图/视频、里程碑、开发日志和后续计划；Spacewar II 已作为第六个公开 Web 试玩项目接入统一内容模型。',
          visual: {
            id: 'playlab-web-showcase',
            type: 'screenshot',
            title: '游戏站与 Web 试玩展示',
            description: '用 Playlab 实际试玩展示图替代主站截图，让访客第一眼看到这是游戏作品集平台。',
            image: '/images/projects/showcase/space-war-web-showcase.png',
            alt: 'BIAU Playlab 游戏站与 Space War Web 试玩展示截图',
            sourceLabel: '进入游戏站',
            sourceUrl: 'https://games.playlab.eu.cc',
            caption: '截图来自公开游戏站，用于证明 Playlab 已有可访问作品集入口和试玩链路。',
          },
        },
        {
          title: '游戏展示先于博客优化',
          body:
            '当前站点里游戏项目页和试玩入口已经形成完整展示链路，文章与博客归档仍有后续整理空间。主站项目页会优先把 Playlab 作为游戏作品集平台说明，不把博客内容质量包装成已经完全成型的内容产品。',
        },
        {
          title: '站点命名和图标对齐',
          body:
            '游戏站已统一为 BIAU Playlab 命名，并把 favicon 换成 BIAU Port / 泊岸图标；导航副标题和页脚也补充 BIAU Port / 泊岸归属。这样访客从主站、游戏站和试玩入口之间跳转时能识别它们属于同一展示体系，同时仍保留 Playlab 作为游戏作品集产品名。',
        },
      ],
      workflow: [
        {
          title: '访客路径',
          items: [
            '首页和游戏列表展示六个项目：俄罗斯方块、Next Spacewar、intespace、Raiden、space-war 和 Spacewar II。',
            '每个游戏详情页提供玩法摘要、当前状态、引擎、平台、截图/视频、Web 试玩、项目贡献、结果和下一步。',
            '独立试玩域名承载 Godot Web 导出，让案例页和可玩版本解耦，项目说明与实际体验可以互相跳转。',
            '试玩页需要提醒首次加载 Godot Web 运行时和项目资源可能偏慢，移动端输入、横竖屏缩放、HUD 可读性和浏览器性能仍要持续回归。',
          ],
          visual: {
            id: 'playlab-gameplay-evidence',
            type: 'screenshot',
            title: '真实游戏运行画面',
            description: '正文穿插游戏运行截图，说明项目页和试玩入口背后确实有可打开的游戏构建。',
            image: '/images/projects/showcase/raiden-stage-01-gameplay.png',
            alt: 'BIAU Playlab 中 Raiden 原型的真实运行截图',
            caption: '真实游戏运行截图用于展示可试玩构建，不代表所有游戏在所有设备上都有同等性能表现。',
            sourceLabel: '查看 Raiden 项目',
            sourceUrl: `${GAME_SITE_URL}/games/raiden/`,
          },
        },
        {
          title: '内容维护工作流',
          items: [
            'Astro content collections 约束 games、devlogs、published articles 和 article workbench 的 frontmatter 结构。',
            '游戏条目可以记录 challenge、mechanic、contribution、outcome、nextStep、milestones、screenshots、downloadLinks、repoUrl 和 devlogSlugs。',
            '开发日志和游戏项目通过 slug 关系互相引用，内容审计会检查引用关系、重复 ID、标签 slug 冲突和静态资源缺失。',
          ],
        },
      ],
      architecture: [
        {
          title: 'Astro 静态站架构',
          body:
            'Playlab 使用 Astro 5 生成静态内容站，游戏、开发日志和文章都通过 content collections 建模。页面层围绕游戏列表、游戏详情、文章归档、开发日志、RSS、sitemap 和 robots 输出，适合放在 Cloudflare Pages 这类静态部署环境中。',
        },
        {
          title: '试玩与展示分离',
          body:
            'Godot Web 包被放在独立试玩入口，内容站只负责说明、导航和嵌入/跳转。这种分离让游戏导出、R2/静态资产上传、页面内容更新和主站项目页引用可以分别迭代，也降低了单个游戏构建影响整个作品站的风险。',
          visual: {
            id: 'playlab-showcase-architecture',
            type: 'architecture',
            title: '展示站与试玩站分离',
            description: '用架构示意图表达 Astro 内容站、Godot Web 导出和独立试玩入口之间的分工。',
            image: '/images/projects/showcase/godot-next-spacewar-showcase.svg',
            alt: 'BIAU Playlab 展示站与 Godot Web 试玩架构示意图',
            caption: '架构示意图说明展示站和试玩站的分离关系，不是实时部署拓扑或监控截图。',
          },
        },
        {
          title: '自动化检查',
          body:
            '站点脚本覆盖内容审计、构建、构建产物链接审计、Cloudflare Pages 部署、试玩包导出检查、试玩资源上传和公开端点检查。构建产物审计还会检查站内链接、资源路径和关键 JSON-LD 结构化数据；公开端点检查会访问游戏站首页、六个游戏详情、文章/日志入口、RSS、sitemap、robots、六个 Web 试玩入口和主站项目页。',
        },
      ],
      quality: [
        {
          title: '内容与发布质量',
          items: [
            'content:audit 当前统计到 4 篇已发布文章、39 篇文章工作区草稿、6 个游戏项目和 5 篇开发日志，并检查静态资源引用和内容关系。',
            'verify 会串起内容审计、Astro build 和构建产物审计，减少断链、缺图和结构化数据问题。',
            'deploy:check 使用公开 URL 做端点可用性检查，覆盖内容站和试玩站的关键入口。',
            'RSS、sitemap、robots 和结构化数据不是装饰项，而是让游戏案例、开发日志和文章归档能被搜索引擎与外部阅读器稳定识别的内容基础设施。',
          ],
        },
        {
          title: '项目证据来自实际游戏工程',
          body:
            '六个游戏条目不是从 README 单点摘抄，而是结合内容站 frontmatter、Godot 项目结构、脚本目录、截图/视频资产、开发日志和发布检查来整理。这样主站案例页能说明“这些游戏如何被展示和部署”，而不是只复述一个过时说明文件。',
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            'Playlab 的游戏展示和试玩链路已经较完整，但博客/文章归档还需要继续筛选、重写和排版优化。',
            '每个游戏的系统深度不同：有的是完整展示构建，有的是持续迭代项目，主站不应把所有条目都写成同等成熟度。',
            'Godot Web 试玩仍受浏览器性能、移动端输入、加载体积、横竖屏缩放、HUD 可读性和静态资源缓存影响，需要长期实机回归。',
          ],
        },
      ],
      roadmap: [
        {
          title: '后续优化方向',
          items: [
            '重写博客与项目文档，让系统设计文章、开发日志和项目案例在叙事上更统一。',
            '为每个游戏补更清晰的版本记录、试玩反馈、移动端适配结论和性能说明。',
            '继续完善试玩包自动导出、资源上传、端点检查和失败告警，让游戏发布更接近一键化。',
            '把主站、Playlab 内容站和试玩站的项目信息进一步对齐，减少多站点重复维护。',
          ],
        },
      ],
    },
    assistantContext: [
      'BIAU Playlab 是已部署的 Astro 5 游戏作品集与试玩平台，整合六个 Godot Web 游戏、项目详情页、截图/视频、开发日志、系统设计文章和公开试玩入口。',
      '游戏站已统一使用 BIAU Playlab 命名，并把 favicon、导航副标题和页脚归属对齐到 BIAU Port / 泊岸，保留 Playlab 作为游戏作品集产品名。',
      '站点使用 Astro content collections 管理 games、devlogs、published articles 和 article workbench；games schema 包含 status、engine、platforms、screenshots、playableWeb、embedUrl、downloadLinks、repoUrl、challenge、mechanic、contribution、outcome、nextStep、milestones 和 devlogSlugs。',
      '六个游戏包括 Tetris、Next Spacewar、intespace、Raiden、space-war 和 Spacewar II；Spacewar II 已作为第六个公开 Web 试玩项目接入，并补齐菜单、战斗和结果页真实截图。',
      'Godot Web 试玩入口由独立试玩域名承载，首次加载可能较慢；移动端输入、横竖屏缩放、HUD 可读性和浏览器性能仍需要持续回归。',
      '最近内容审计统计到 4 篇已发布文章、39 篇文章工作区草稿、6 个游戏项目和 5 篇开发日志，静态资源引用和内容关系检查通过。',
      'Playlab 的质量链路包括 content:audit、Astro build、dist:audit、deploy:pages、deploy:play、play export/check/upload 和 deploy:check；dist:audit 会检查站内链接、资源路径和 JSON-LD，公开端点检查覆盖游戏站、六个游戏详情页、六个试玩入口、RSS、sitemap、robots 和主站项目页。',
      '当前 Playlab 应作为游戏作品集平台展示；博客和部分文章归档质量仍是后续优化方向，不应把它描述成已经完全成熟的内容产品。',
    ],
  },
  {
    id: 'blog-semi',
    title: 'React + Semi 博客系统｜当前主站',
    summary: '当前主站，用 React、Semi Design 和轻量助手后端组织首页、项目案例、知识文章、公开助手、SEO 数据和自动化验证。',
    category: 'platform',
    status: 'ongoing',
    role: 'React 主站 / Semi 组件体系 / 项目案例路由 / 内容治理 / 助手知识',
    image: '/images/projects/showcase/blog-semi-home-desktop.png',
    stack: ['React 19', 'Vite', 'TypeScript', 'Semi Design', 'Express', 'Prisma', 'PostgreSQL', 'Playwright'],
    highlights: ['多视图主站', '项目案例', '公开助手', '内容治理', 'UI 验证'],
    links: [
      internalLink('内容模型文章', '/blog/content-modeling-project-site'),
      internalLink('公开内容治理', '/blog/public-content-governance'),
      internalLink('静态站验证', '/blog/static-site-release-verification'),
      internalLink('构建手记', '/blog/blog-content-system-build-log'),
    ],
    detailContent: {
      overview: [
        {
          title: '从单页展示推进到项目案例中枢',
          body:
            'BIAU Port 当前承担的是公开主站和内容中枢：首页负责第一眼呈现项目方向，项目集把 AI 应用、业务系统、互动体验、移动端和平台建设分组，项目详情页用统一结构展示实现、架构、验证、边界和后续优化。它不是单纯博客列表，而是把多个已部署或进行中的项目收拢成可筛选、可讲解、可继续迭代的产品展示面。',
          visual: {
            id: 'blog-semi-home-ui',
            type: 'screenshot',
            title: '主站首页截图',
            description: '首页承担项目入口和品牌第一印象，正文截图能让案例页直接呈现当前主站状态。',
            image: '/images/projects/showcase/blog-semi-home-desktop.png',
            alt: 'BIAU Port 主站首页桌面端截图',
            sourceLabel: '回到首页',
            sourceUrl: '/',
            caption: '截图来自当前主站首页，用于说明 BIAU Port 的项目入口和品牌第一印象。',
          },
        },
        {
          title: '公开内容以安全事实为边界',
          body:
            '项目页、博客精选、公开助手知识和 sitemap 都从仓库内的公开数据生成或读取。站点可以解释项目能力、技术栈和验证链路，但不写入真实密钥、数据库连接串、私有后台地址、未公开下载包或内部部署凭据。',
        },
      ],
      workflow: [
        {
          title: '访客浏览闭环',
          items: [
            '首页 hero 项目卡片先进入主站项目详情，卡片按钮再打开外部 demo 或项目网站。',
            '项目集按 AI、全栈/平台/移动端和游戏项目分组，整卡与键盘 Enter/Space 都进入主站详情页。',
            '项目详情页统一展示核心亮点、技术栈、相关链接、案例分析、延展阅读和同类项目。',
            '博客页通过公开精选与栏目过滤展示知识积累、项目总结、资源分享、AI 日报和构建手记等内容边界。',
          ],
          visual: {
            id: 'blog-semi-projects-ui',
            type: 'workflow',
            title: '项目集浏览路径',
            description: '项目集截图说明访客可以按项目类型浏览，再进入具体案例页或外部演示入口。',
            image: '/images/projects/showcase/blog-semi-projects-desktop.png',
            alt: 'BIAU Port 项目集桌面端截图',
            caption: '项目集截图展示当前公开案例组织方式；具体线上状态仍以状态页和外部入口检查为准。',
          },
        },
        {
          title: '助手与内容联动',
          items: [
            '公开助手从 `src/data/portfolio.ts` 和公开博客 curation 生成本地知识，未配置后端时仍可回答站点公开内容。',
            '内部助手已从示例会话推进到成员工作台：支持邀请码兑换、成员身份校验、真实会话历史、会话归档、成员级模型渠道和回答诊断面板。',
            '隐藏管理页已扩展为内部运营后台，可管理邀请码、成员状态、模型渠道、内部知识文档、同步状态和低敏 usage 列表。',
            '项目详情和助手知识共用 `getProjectAssistantSummary` 与 `getProjectAssistantTags`，减少页面文案和助手答案互相漂移。',
          ],
        },
      ],
      architecture: [
        {
          title: '前端路由与数据组织',
          body:
            '前端使用 React 19、Vite、TypeScript 和 Semi Design。`App.tsx` 管理首页、项目集、项目详情、博客、博客详情、助手和管理页路由；项目、博客、助手建议和公开知识都放在 `src/data/`，页面组件只消费已整理好的 typed data。',
        },
        {
          title: '助手后端与公开知识生成',
          body:
            '仓库同时保留一个 Express/TypeScript 助手后端，配合 Prisma 与 PostgreSQL 支持 invite、member、chat session、message、usage log、内部知识文档和同步运行记录。公开助手方向已经推进到 Agentic Hybrid RAG groundwork；内部助手则使用成员隔离、scoped RAG、成员级模型渠道和 Qdrant internal collection 同步路径。`scripts/generate-assistant-knowledge.ts` 会把公开项目和精选博客生成到 `server/data/public-knowledge.json`，让前端 fallback 和后端知识源保持同一份公开事实。',
        },
        {
          title: '内容与 SEO 管线',
          body:
            '公开博客由 `blogCuration` 控制 visibility、role、priority 和 project relation；隐藏草稿不会进入公开列表、详情加载、助手知识或 sitemap。Studio 页面和规划脚本可以生成 project detail、status、resource 和 blog draft 的 review plan，但不会绕过 `portfolio.ts`、`statusTargets.ts` 或博客 curation 的 Git diff 审查。`scripts/generate-sitemap.mjs` 会从项目 id 和公开博客生成 sitemap，`SeoManager` 根据路由应用 canonical、description 和 Open Graph 信息。',
          visual: {
            id: 'blog-semi-blog-ui',
            type: 'status',
            title: '博客公开内容界面',
            description: '博客截图对应内容治理结果，提醒访客当前公开内容是筛选后的集合，不等于所有草稿都已发布。',
            image: '/images/projects/showcase/blog-semi-blogs-desktop.png',
            alt: 'BIAU Port 博客页桌面端截图',
            caption: '博客页截图展示筛选后的公开栏目，不代表内容草稿库中的所有文章已经发布。',
          },
        },
      ],
      quality: [
        {
          title: '自动化验证',
          items: [
            '`npm.cmd run assistant:index` 生成公开助手知识。',
            '`npm.cmd run sitemap:generate` 更新公开 sitemap。',
            '`npm.cmd run blog:check` 检查公开博客内容边界。',
            '`npm.cmd run lint` 和 `npm.cmd run build` 覆盖 ESLint、TypeScript 和 Vite 构建。',
            '`npm.cmd run check:ui` 通过 Playwright 检查主要路由、移动/桌面视口、SEO meta、键盘焦点、首页轮播和助手交互。',
            '`npm.cmd run verify` 串起助手知识、Prisma、server build/smoke、前端构建、博客检查、preview 和 UI 检查，适合作为大范围发布前门禁。',
          ],
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            '主站内容仍以静态 TypeScript 数据为主，不是多人 CMS；内容发布需要代码审查和构建验证。',
            '博客仍在持续筛选和重写，旧内容不会因为存在归档就自动公开。',
            '内部助手的产品骨架已具备成员、历史、管理后台和内部知识同步路径；真实生产使用仍依赖 Render 环境变量、数据库 migration、用户批准的内部 corpus 和真实模型任务验证。',
            '项目页只展示公开安全事实；部署凭据、账号、生产数据、私有后台和未确认下载包不会放进公开站点。',
          ],
        },
      ],
      roadmap: [
        {
          title: '后续优化方向',
          items: [
            '继续补齐各项目的案例页细节，让实现、架构、验证、边界和后续版本方向都能从仓库证据追溯。',
            '把博客内容生成流水线继续沉淀为 review-only 证据包、模型辅助草稿、人工审核和公开发布的稳定流程。',
            '增强公开助手对项目页、精选博客和资源内容的引用质量，并把内部助手逐步扩展到更真实的团队协作场景。',
            '完善图片、移动端布局、链接审计、UI 回归和部署记录，让主站更接近长期维护的产品展示系统。',
          ],
        },
      ],
    },
    assistantContext: [
      'BIAU Port 当前主站使用 React 19、Vite、TypeScript 和 Semi Design 构建，负责组织首页、项目集、项目详情、博客、公开助手、内部助手和隐藏管理页。',
      '项目数据、博客 curation、助手建议和公开知识都存放在 `src/data/`，项目详情页通过 `detailContent` 展示案例分析，公开助手通过 `assistantContext` 和精选博客生成可检索知识。',
      '仓库包含一个 Express/TypeScript 助手后端，配合 Prisma/PostgreSQL 支持 invite、member、chat session、message、usage log、内部知识文档和同步运行记录；前端未配置 API 时会使用公开知识 fallback。',
      '公开助手方向已经从本地知识 fallback 推进到 Agentic Hybrid RAG groundwork：server 侧包含 RAG Orchestrator、embedding client、PostgreSQL/pgvector store、Qdrant store 和 sync/smoke 脚本；内部助手已具备成员隔离、真实会话历史、成员级模型渠道、内部知识管理、Qdrant internal collection 同步路径和低敏回答诊断。',
      'Studio 和规划脚本可生成项目详情、状态页、资源和博客草稿的 review plan；真正公开仍要手动更新 typed data、运行检查并通过 Git diff 审查。',
      '内容治理规则要求隐藏草稿不进入公开列表、详情加载、助手知识或 sitemap；公开博客由 visibility、role、priority 和 project relation 控制。',
      '验证链路包括 assistant:index、sitemap:generate、blog:check、lint、build、check:ui 和 verify，其中 verify 会串起助手知识、Prisma、server build/smoke、前端构建、博客检查、preview 和 UI 检查。',
      '当前边界是静态数据驱动、人工审核发布、公开安全事实展示和生产配置 gate；内部助手真实生产质量仍需要用户维护 Render 环境变量、数据库 migration、内部 corpus 脱敏标准和真实业务任务验证。',
    ],
  },
  {
    id: 'game-first-tetris',
    title: '俄罗斯方块原型｜Tetris',
    summary: 'Godot 4 俄罗斯方块原型，包含经典计分、软降/硬降得分、combo、back-to-back、肉鸽三选一强化、触屏桥接、响应式布局和截图回归。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 引擎 / Web 试玩 / 触屏适配',
    image: '/images/projects/showcase/tetris-classic-desktop.png',
    stack: ['Godot 4', 'Web 导出', '游戏原型'],
    highlights: ['经典计分', '软硬降得分', 'combo/B2B', '触屏输入'],
    detailLink: gameSiteLink('first-tetris'),
    links: [gameSiteLink('first-tetris'), gamePlayLink('first-tetris')],
    detailContent: {
      overview: [
        {
          title: '从经典规则走向长期原型',
          body:
            'Game First Tetris 不是只验证“方块能下落和消行”，而是把经典模式、现代计分反馈、Rogue 实验线、多端布局和移动端触控放在同一个 Godot 项目里持续收口。当前阶段适合展示一个小型玩法原型如何逐步具备可讲解、可试玩、可继续迭代的产品雏形。',
          visual: {
            id: 'tetris-desktop-gameplay',
            type: 'screenshot',
            title: '桌面端经典模式截图',
            description: '用实际运行画面展示当前原型的主玩法，而不是只靠项目封面说明。',
            image: '/images/projects/showcase/tetris-classic-desktop.png',
            alt: '俄罗斯方块原型桌面端经典模式截图',
            caption: '真实游戏截图展示经典模式运行状态；移动端触控和窄屏体验仍按项目边界持续回归。',
            sourceLabel: '查看游戏详情',
            sourceUrl: `${GAME_SITE_URL}/games/first-tetris/`,
          },
        },
      ],
      workflow: [
        {
          title: '核心体验链路',
          items: [
            '经典模式承接消行、等级推进、软降/硬降得分、combo 和 back-to-back 提示，是项目最稳定的主线。',
            'Rogue 实验线通过三轮固定选择、最小强化和局间带入验证中程目标感，避免破坏经典玩法基础。',
            'Help、主菜单、HUD 和触屏控件都被纳入展示体验，让第一次打开的访客能理解规则与入口。',
          ],
          visual: {
            id: 'tetris-structure',
            type: 'workflow',
            title: '玩法与输入结构',
            description: '说明经典模式、Rogue 实验线、Help、HUD 和触屏桥接如何构成当前体验。',
            image: '/images/projects/showcase/godot-tetris-structure.svg',
            alt: '俄罗斯方块原型玩法循环与输入结构图',
            caption: '结构图用于解释玩法循环、模式入口和输入模块关系，不等同于真实运行截图。',
          },
        },
      ],
      architecture: [
        {
          title: 'Godot 4.6.1 与输入结构',
          body:
            '游戏站证据显示该项目使用 Godot 4.6.1，目录按 scenes、scripts、docs 和 artifacts 组织。输入层已经从键盘逻辑里拆出动作映射、瞬时动作、持续状态和触屏桥接入口，为后续移动端按钮或手势方案保留了可维护边界。',
        },
        {
          title: 'Web 试玩与多端展示',
          body:
            'Playlab 游戏站为它提供独立 Web 试玩入口，并保留主菜单、Rogue 游戏画面和 Help 面板截图。主站只引用公开试玩和游戏站详情，不承诺未验证的移动端正式包。',
        },
      ],
      quality: [
        {
          title: '多端回归证据',
          items: [
            '开发日志记录主菜单、经典模式、Rogue 模式和 Help 在 360 x 640、393 x 852、412 x 915、960 x 640、1024 x 768、1280 x 720 等尺寸下进入最低可用线。',
            '393 x 852 已可用，360 x 640 仍被描述为最低可运行线，因此主站不把触控体验写成完全完成。',
            '游戏站内容审计会检查 games 与 devlogs 的关系、公开资源引用和内容 id，避免展示页资源断链。',
          ],
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            'Rogue 强化仍是低侵入实验层，平衡和长期成长还需要继续验证。',
            '超窄移动尺寸和真实触屏手感仍是后续重点，不应写成彻底解决。',
            'Web 首次加载受 Godot 运行时和资源体积影响，试玩体验需要持续观察。',
          ],
        },
      ],
      roadmap: [
        {
          title: '后续优化方向',
          items: [
            '继续打磨 360 x 640 等高风险尺寸下的触屏可玩性和 HUD 阅读性。',
            '整理分支、里程碑和试玩记录，让经典主线与 Rogue 实验线的关系更清楚。',
            '补充更完整的录屏或试玩反馈，作为未来版本迭代依据。',
          ],
        },
      ],
    },
    assistantContext: [
      'Tetris 是 Godot 4 俄罗斯方块原型，包含经典计分、软降/硬降得分、combo、back-to-back、肉鸽三选一强化实验、触屏桥接、响应式 UI 和 Web 试玩。',
      'Playlab 游戏站证据显示 Tetris 使用 Godot 4.6.1，保留主菜单、Rogue 游戏画面和 Help 面板截图，并有 tetris-responsive-baseline 与 tetris-touch-controls 两篇开发日志说明多端适配和输入结构。',
      '项目重点是把经典规则、现代计分反馈、移动触控和可展示的 Web 构建组织在一起；后续方向包括移动端触控细节、Rogue 强化平衡、截图/试玩回归和长期迭代。',
    ],
  },
  {
    id: 'game-next-spacewar',
    title: '太空战机｜展示构建',
    summary: 'Godot 4.6 太空射击展示构建，补齐三波短任务、漂移/装甲目标、障碍压力、击破连击、波次奖励、主菜单、帮助、暂停、结果页和单局复盘。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 展示构建 / 战斗循环 / 单局复盘',
    image: '/images/projects/showcase/next-spacewar-menu.png',
    stack: ['Godot 4.6', '太空射击', 'Web 导出'],
    highlights: ['三波短任务', '击破连击', '波次奖励', '结果复盘'],
    detailLink: gameSiteLink('next-spacewar'),
    links: [gameSiteLink('next-spacewar'), gamePlayLink('next-spacewar')],
    detailContent: {
      overview: [
        {
          title: '从单关 MVP 收成展示构建',
          body:
            'Game Next Spacewar 的价值在于把一个基础 2D 太空射击闭环推进到可对外演示的 showcase build。它不只是战斗能跑，还补齐主菜单、设置、About/Help、暂停、三波短任务、结果页和会话总结，让访客第一次打开时能知道自己在玩什么、当前版本到了哪里。',
          visual: {
            id: 'next-spacewar-gameplay',
            type: 'screenshot',
            title: '短任务战斗截图',
            description: '真实战斗截图展示三波短任务、敌群与街机反馈，而不是只展示菜单。',
            image: '/images/projects/showcase/next-spacewar-gameplay.png',
            alt: 'Next Spacewar 太空射击战斗截图',
            caption: '真实战斗截图来自展示构建，用于说明短任务主循环已具备可试玩形态。',
            sourceLabel: '查看游戏详情',
            sourceUrl: `${GAME_SITE_URL}/games/next-spacewar/`,
          },
        },
      ],
      workflow: [
        {
          title: '短任务试玩流程',
          items: [
            '玩家从主菜单进入短任务，在三波战斗中面对漂移目标、装甲目标和障碍压力。',
            '击破计分、短窗口连击和波次清除奖励提供街机式反馈。',
            '单局结束后进入独立结果页，展示最终分数、击毁统计、最高连击和下一步操作。',
          ],
        },
      ],
      architecture: [
        {
          title: '展示版外壳',
          body:
            '项目以 Godot 4.6.1 组织 scenes、scripts、assets 和 docs，主菜单、战斗、设置、Help 与结果页各自承担入口、局内体验和收束反馈。Playlab 通过独立试玩域名承载 Web 导出，主站保留详情页和试玩跳转。',
          visual: {
            id: 'next-spacewar-showcase-structure',
            type: 'architecture',
            title: '展示构建结构',
            description: '说明 Godot 项目、展示页面和 Web 试玩入口如何共同组成公开展示版本。',
            image: '/images/projects/showcase/godot-next-spacewar-showcase.svg',
            alt: 'Next Spacewar 展示构建结构图',
            caption: '结构图归纳 Godot 构建、展示页面和试玩入口关系，不包含本地构建路径或发布密钥。',
          },
        },
      ],
      quality: [
        {
          title: '展示状态证据',
          items: [
            '游戏站有真实运行主菜单、战斗和结果页截图，证明它已经从裸关卡进入完整外层体验。',
            '开发日志将主菜单、设置、About/Help、暂停、结果页和 build 标识记录为展示版完成条件。',
            '当前阶段更偏 review、PR 和素材包装，不默认继续横向扩充关卡内容。',
          ],
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            '它是短任务 showcase build，不是长期内容型商业版本。',
            '关卡密度、敌人差异和反馈节奏仍有继续打磨空间。',
            'Web 试玩仍可能受首次加载、键鼠输入和浏览器性能影响。',
          ],
        },
      ],
      roadmap: [
        {
          title: '后续优化方向',
          items: [
            '补充轻量录屏，让短任务战斗节奏比静态截图更容易被理解。',
            '整理 PR/review 资料，把当前版本作为明确里程碑归档。',
            '如果后续继续推进，再评估是否扩展更丰富的关卡和内容层。',
          ],
        },
      ],
    },
    assistantContext: [
      'Next Spacewar 是 Godot 4.6 太空射击展示构建，核心是三波短任务、漂移目标、装甲目标、障碍压力、击破连击、波次奖励、主菜单、帮助、暂停、结果页和单局复盘。',
      'Playlab 游戏站为 Next Spacewar 提供主菜单、战斗和结果页真实截图以及 Web 试玩入口；开发日志把它定义为已经收成可展示的本地 build。',
      '项目定位偏 showcase，适合说明如何把一个短时长战斗循环收束成可试玩作品；后续方向包括关卡密度、敌人差异、反馈节奏和更细的移动/键鼠输入体验。',
    ],
  },
  {
    id: 'intespace',
    title: '竖屏肉鸽射击｜intespace',
    summary: '竖屏自动射击肉鸽游戏，围绕章节推进、生存挑战、Boss 试炼、武器树、局内升级、局外成长和集成试玩收口。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 引擎 / 肉鸽玩法 / 武器树 / 局外成长',
    image: '/images/projects/showcase/intespace-player-hub.png',
    stack: ['Godot', '肉鸽玩法', '武器树系统', '移动端优先'],
    highlights: ['章节推进', '生存挑战', 'Boss 试炼', '局外成长'],
    detailLink: gameSiteLink('intespace'),
    links: [gameSiteLink('intespace'), gamePlayLink('intespace')],
    detailContent: {
      overview: [
        {
          title: '统一试玩前的 Roguelite 收口',
          body:
            'intespace 是竖屏自动射击 Roguelite 项目，当前重点不是继续横向加系统，而是把章节推进、生存挑战、Boss 试炼、武器树、局内升级、局外成长和玩家主菜单收成一次完整 session。它适合展示系统原型如何走向可被访客理解的试玩入口。',
          visual: {
            id: 'intespace-player-hub',
            type: 'screenshot',
            title: '玩家中枢截图',
            description: '真实主界面截图展示章节、生存挑战和成长入口，说明它不是只有战斗场景的原型。',
            image: '/images/projects/showcase/intespace-player-hub.png',
            alt: 'intespace 玩家中枢界面截图',
            caption: '真实主界面截图展示当前玩家中枢，不把统一试玩前的版本包装成最终商业成品。',
            sourceLabel: '查看游戏详情',
            sourceUrl: `${GAME_SITE_URL}/games/intespace/`,
          },
        },
      ],
      workflow: [
        {
          title: '完整 session 链路',
          items: [
            '玩家从主菜单进入章节、生存或 Boss 试炼等战斗入口。',
            '局内通过自动射击、经验拾取、武器路线和升级面板形成战斗推进。',
            '结果页承接结算、成长动作、重开路径和返回主界面，让下一局循环成立。',
          ],
          visual: {
            id: 'intespace-session-loop',
            type: 'workflow',
            title: '完整 Session 循环',
            description: '从玩家中枢、章节战斗、局内升级到结果页和局外成长的试玩循环。',
            image: '/images/projects/showcase/godot-intespace-loop.svg',
            alt: 'intespace 竖屏肉鸽射击 session 循环图',
            caption: '循环图用于说明一次 session 的体验闭环，不是实时埋点或运营漏斗数据。',
          },
        },
      ],
      architecture: [
        {
          title: '手机优先的 Godot 原型',
          body:
            '游戏站记录该项目基于 Godot 4.6.1，按 docs、scenes 和 scripts 组织产品定义、阶段计划、战斗、HUD、升级面板、武器树和 UI 逻辑。Web 试玩作为当前展示入口，Windows 路径保留为后续发布方向。',
        },
      ],
      quality: [
        {
          title: '阶段证据',
          items: [
            '武器系统 v1 已冻结结构，后续重点转向路线可读性和平衡验证。',
            '玩家中枢、战斗 HUD 和结果总结截图已经补入游戏站，能说明它从系统工作台走向完整流程。',
            'Playlab 内容审计和构建链路负责确认游戏内容关系、静态资源和站点输出。',
          ],
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            '它仍处在统一试玩前的收口阶段，平衡、路线可读性和移动端触屏体验需要持续验证。',
            '首屏信息密度、HUD 可读性和局外成长节奏仍是后续打磨重点。',
            '不应把当前 Web 试玩写成最终完整版或商业发布版。',
          ],
        },
      ],
      roadmap: [
        {
          title: '后续优化方向',
          items: [
            '压缩主菜单和 HUD 的首屏信息密度，让第一次打开更像正式试玩入口。',
            '补齐统一试玩发布说明和轻量录屏。',
            '继续验证武器路线、局外成长节奏和手机触屏体验。',
          ],
        },
      ],
    },
    assistantContext: [
      'intespace 是竖屏自动射击肉鸽项目，包含章节推进、生存挑战、Boss 试炼、武器树、局内升级、局外成长、玩家 hub、结果总结和集成试玩入口。',
      'Playlab 游戏站记录 intespace 基于 Godot 4.6.1，武器系统 v1 已冻结结构，截图覆盖玩家中枢、战斗 HUD 和结果总结，当前处于统一试玩前完整流程收口。',
      '项目重点是把移动端竖屏射击、Roguelite 成长、武器路线和 Boss 压力组合成较完整的长期迭代样本；后续方向包括平衡、试玩反馈、UI 文案、移动端体验和内容节奏优化。',
    ],
  },
  {
    id: 'raiden-prototype',
    title: '纵版弹幕射击｜垂直切片',
    summary: 'Godot 纵版射击垂直切片，覆盖双关卡章节、火力成长、连锁击破奖励、首领相位、章节过场和试玩验证。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 引擎 / 纵版射击 / 原型验证',
    image: '/images/projects/showcase/raiden-main-menu.png',
    stack: ['Godot', '纵版射击', '原型验证'],
    highlights: ['双关卡章节', '连锁击破', '首领收束', '试玩验证'],
    detailLink: gameSiteLink('raiden'),
    links: [gameSiteLink('raiden'), gamePlayLink('raiden')],
    detailContent: {
      overview: [
        {
          title: '纵版街机射击的 Demo 候选',
          body:
            'Raiden Prototype 以纵版街机射击为核心，当前已推进到 RC-0.4 稳定展示候选。它的重点是把双关章节、火力成长、炸弹资源、连锁击破、Boss 段落、章节过场和结果反馈压缩成可试玩的垂直切片。',
          visual: {
            id: 'raiden-stage-gameplay',
            type: 'screenshot',
            title: 'Stage 01 战斗截图',
            description: '正文直接展示关卡运行画面，帮助访客理解“垂直切片”具体包含哪些战斗反馈。',
            image: '/images/projects/showcase/raiden-stage-01-gameplay.png',
            alt: 'Raiden Prototype Stage 01 战斗截图',
            caption: '真实关卡截图展示 RC 候选的战斗反馈；素材授权和正式资源替换仍按项目边界继续检查。',
            sourceLabel: '查看游戏详情',
            sourceUrl: `${GAME_SITE_URL}/games/raiden/`,
          },
        },
      ],
      workflow: [
        {
          title: 'Chapter Run 路线',
          items: [
            '推荐入口是 Chapter Run，先进入 Stage 01，再通过结果页和 ChapterBriefing 承接到 Stage 02。',
            '玩家通过自动持续射击、掉落升级、炸弹清屏和短窗口连锁击破维持街机节奏。',
            'Stage 02 的风暴机关、Boss overdrive 和终盘安全窗口形成当前版本的高潮段落。',
          ],
          visual: {
            id: 'raiden-vertical-slice',
            type: 'workflow',
            title: '章节垂直切片',
            description: '说明双关卡、火力成长、连锁击破、Boss 段落和结果反馈如何收成一个试玩路线。',
            image: '/images/projects/showcase/godot-raiden-vertical-slice.svg',
            alt: 'Raiden Prototype 章节垂直切片流程图',
            caption: '流程图解释垂直切片试玩路线，不代表正式商业关卡或完整发布承诺。',
          },
        },
      ],
      architecture: [
        {
          title: '开发目录与发布仓库分层',
          body:
            '游戏站记录根目录主要承担开发工作目录角色，实际同步到 GitHub 的发布仓库为 `.publish-final`。项目使用 Godot 4.6.1，scenes 与 scripts 覆盖主菜单、战斗、章节过场、HUD、结果页、敌人和 Boss 逻辑。',
        },
      ],
      quality: [
        {
          title: '公开 Demo 准备证据',
          items: [
            '游戏站提供主菜单、Stage 02 战斗和结果页真实截图，说明它已进入外部试玩和 Demo 包装阶段。',
            'Windows RC-0.4 预发布下载和 Web 试玩入口都已在游戏站记录。',
            '当前验证重点是外部人工试玩、首屏理解成本、资源授权和 Web 包加载体积。',
          ],
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            '它是稳定展示候选，不是商业成品。',
            '弹幕可读性、音效/手感、关卡内容、难度曲线和移动端适配仍需继续验证。',
            '素材授权和正式资源替换仍属于公开 Demo 发布前的检查项。',
          ],
        },
      ],
      roadmap: [
        {
          title: '后续优化方向',
          items: [
            '组织外部人工试玩，确认双关节奏和首屏理解成本。',
            '精简 Web 包资源，降低公开试玩首次加载压力。',
            '继续维护素材授权清单并替换更正式的视觉/音频资源。',
          ],
        },
      ],
    },
    assistantContext: [
      'Raiden prototype 是 Godot 纵版弹幕射击垂直切片，覆盖双关卡章节、火力成长、连锁击破奖励、首领相位、章节过场、结果页、公开 Demo 和 Web 试玩。',
      'Playlab 游戏站记录 Raiden Prototype 当前为 RC-0.4 稳定展示候选，推荐入口是 Chapter Run，并有 Windows 预发布下载、Web 试玩和真实运行截图。',
      '项目适合展示纵版射击的章节节奏、Boss 阶段和奖励反馈如何被压缩成可玩的垂直切片；后续方向包括弹幕可读性、音效/手感、关卡内容、难度曲线和移动端适配。',
    ],
  },
  {
    id: 'space-war',
    title: '复古横版射击｜space-war',
    summary: '复古横向太空射击完整版本，包含五个 Sector、连续击破奖励、首领战、道具、高分、结果页、程序化音效和发布文档。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 引擎 / 复古射击 / 发布版 / 展示入口',
    image: '/images/projects/showcase/space-war-gameplay.png',
    stack: ['Godot 4.6', '复古射击', 'Web 包计划'],
    highlights: ['五个 Sector', '连续击破', '高分结算', '发布文档'],
    detailLink: gameSiteLink('space-war'),
    links: [gameSiteLink('space-war'), gamePlayLink('space-war')],
    detailContent: {
      overview: [
        {
          title: '复古横版射击的完整展示版本',
          body:
            'Space War 围绕 Nokia 3310《Space Impact》初代体验做复刻取舍，重点不是把项目现代化扩张，而是守住横向自动卷轴、短局高压射击、连续击破奖励、关底 Boss 和低彩 LCD 气质，并把它收成完整可玩、可展示、可维护的版本。',
          visual: {
            id: 'space-war-gameplay',
            type: 'screenshot',
            title: '横版战斗截图',
            description: '真实战斗画面展示自动卷轴、敌群与低彩 LCD 风格，说明项目已经形成可玩版本。',
            image: '/images/projects/showcase/space-war-gameplay.png',
            alt: 'Space War 复古横版射击战斗截图',
            caption: '真实战斗截图展示复古横版射击完成度；Web 首次加载和移动输入仍需持续观察。',
            sourceLabel: '查看游戏详情',
            sourceUrl: `${GAME_SITE_URL}/games/space-war/`,
          },
        },
      ],
      workflow: [
        {
          title: '正式试玩流程',
          items: [
            '玩家从主菜单进入关卡，沿五个常规 Sector 横向推进。',
            '局内包含敌群、拾取强化、13 级武器成长、连续击破奖励和最终 Boss。',
            '暂停、结算、最高分记录和中英文设置让它具备完整发布版外壳。',
          ],
          visual: {
            id: 'space-war-result',
            type: 'status',
            title: '结算与发布证据',
            description: '结果页截图说明项目不只是关卡原型，而是包含菜单、战斗、结算和重开路径的完整流程。',
            image: '/images/projects/showcase/space-war-result.png',
            alt: 'Space War 结果结算页截图',
            caption: '结果页截图展示公开试玩的收束路径，不包含真实用户统计或运营数据。',
          },
        },
      ],
      architecture: [
        {
          title: '发布与展示整理',
          body:
            '项目基于 Godot 4.6.1，docs、scenes、scripts 和 release 分别承接设计/测试/发布说明、战斗与 UI 场景、数据和自动加载逻辑、正式分发包。游戏站保留 GitHub Release、Web 试玩和源码入口。',
          visual: {
            id: 'space-war-playable-loop',
            type: 'workflow',
            title: '公开试玩闭环图',
            description: '流程图说明从菜单、Web 试玩场景、战斗循环、结算到返回展示页的公开试玩路径。',
            image: '/images/projects/showcase/space-war-loop.svg',
            alt: 'Space War 公开试玩闭环流程图',
            caption: '流程图只说明公开试玩体验路径，不公开本地构建路径、统计数据、账号或部署密钥。',
          },
        },
      ],
      quality: [
        {
          title: '完成度证据',
          items: [
            '游戏站记录它已经形成 Windows 发布页、GitHub Release 和独立 Web 试玩入口。',
            '菜单、战斗和结算截图证明项目不只是战斗原型，而是可以按正常流程打开、试玩、结束和再次开始。',
            '发布后维护重点转向试玩反馈、兼容修复、Web 包体积和展示资料补齐。',
          ],
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            '复刻目标要求克制扩题，不默认继续加入大量现代射击系统。',
            '后期 Sector 难度曲线、移动端输入和 Web 首次加载体积仍值得长期观察。',
            '程序化音效和低彩视觉服务于复古表达，不应被包装成高规格商业美术完成度。',
          ],
        },
      ],
      roadmap: [
        {
          title: '后续优化方向',
          items: [
            '继续收集人工试玩反馈，确认后期 Sector 节奏和难度曲线。',
            '评估更轻量的 Web 包，减少首次加载体积。',
            '以修复、兼容和展示材料补齐为主维护，不默认继续横向扩系统。',
          ],
        },
      ],
    },
    assistantContext: [
      'space-war 是复古横版太空射击完整展示版本，受 Nokia 3310 Space Impact 风格启发，包含五个 Sector、敌机与道具、Boss、高分、连续击破奖励、结果页、程序化音效、Web/Windows 发布材料。',
      'Playlab 游戏站记录 Space War 已经进入完整可玩、可展示、可维护阶段，保留 Windows Release、Web 试玩、真实菜单/战斗/结算截图和 v1.1.1 发布说明。',
      '项目展示了从原型到发布版的收束：菜单、战斗、结算、截图素材、发布文档和公开试玩入口都已组织起来；后续方向包括平衡、移动端输入、音频层次、可观测试玩反馈和更多关卡变化。',
    ],
  },
  {
    id: 'spacewar-ii',
    title: '移动纵向射击｜Spacewar II',
    summary: 'Godot 4.6 纵向移动射击续作原型，围绕差异化敌群、Boss 阶段、多向弹幕、拾取升级、炸弹、短窗口连击、清关资源结算、紧凑 HUD 和结果页接入第六个 Web 试玩位。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 引擎 / 纵向射击 / Web 试玩 / 第六项目接入',
    image: '/images/projects/showcase/spacewar-ii-menu.png',
    stack: ['Godot 4.6', '移动射击', 'Web 导出'],
    highlights: ['差异化敌群', '短窗口连击', 'Boss 阶段', '结果结算'],
    detailLink: gameSiteLink('spacewar-ii'),
    links: [gameSiteLink('spacewar-ii'), gamePlayLink('spacewar-ii')],
    detailContent: {
      overview: [
        {
          title: '第六个 Web 试玩项目接入',
          body:
            'Spacewar II 是更偏移动端纵向射击的续作原型。本轮主站展示重点不是夸大成完整续作，而是说明它如何从本地 Godot 目录补进 Playlab 统一内容模型、试玩域名规则、导出脚本和主站外链，成为第六个可展示游戏项目。',
          visual: {
            id: 'spacewar-ii-menu',
            type: 'screenshot',
            title: '第六个试玩项目菜单',
            description: '菜单截图说明 Spacewar II 已进入统一展示入口，而不是仍停留在本地目录说明。',
            image: '/images/projects/showcase/spacewar-ii-menu.png',
            alt: 'Spacewar II 菜单截图',
            caption: '真实菜单截图展示第六个试玩项目接入状态；移动端缩放和 HUD 可读性仍是后续回归重点。',
            sourceLabel: '查看游戏详情',
            sourceUrl: `${GAME_SITE_URL}/games/spacewar-ii/`,
          },
        },
      ],
      workflow: [
        {
          title: '纵向短局体验',
          items: [
            '玩家从菜单进入战斗，通过自动射击、拾取升级和炸弹清场推进短局。',
            'scout、diver、sweeper、tank 等敌群提供基础差异，Boss 阶段升级和多向弹幕形成终盘压力。',
            '结果页收束分数、路线、击破数、升级数、最高连击、清关资源和重开路径。',
          ],
        },
      ],
      architecture: [
        {
          title: '统一内容模型与 Web 导出',
          body:
            '游戏站记录 Spacewar II 使用 `spacewar-ii` 作为统一 slug，纳入 Astro games 内容集合、Web 试玩 URL、导出脚本目标和主站外链。项目目录包含菜单、战斗、HUD、结果、升级和 smoke test 结构。',
          visual: {
            id: 'spacewar-ii-cover',
            type: 'architecture',
            title: '统一接入示意',
            description: '用展示封面说明它作为 Playlab 第六个游戏项目接入统一内容模型和试玩路径。',
            image: '/images/projects/showcase/spacewar-ii-cover.svg',
            alt: 'Spacewar II Playlab 展示封面图',
            caption: '展示封面用于说明 Spacewar II 已接入统一内容模型，不是额外的实时运行截图。',
          },
        },
      ],
      quality: [
        {
          title: '接入与浏览器检查',
          items: [
            '开发日志记录第六个游戏进入统一 Web 试玩接入位，后续重点是 Web 导出、浏览器 canvas 和 HUD 可读性。',
            '游戏站条目记录它已经通过本地 Web 导出和浏览器检查，并补入菜单、战斗、结果页真实运行截图。',
            '统一导出检查脚本覆盖六个 slug 的桌面和移动视口 canvas 渲染、布局、滚动和状态提示。',
          ],
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            '它是第六个接入的可试玩原型，仍需要继续观察移动端横竖屏缩放和 HUD 可读性。',
            '真实试玩短视频仍待补充，当前证据以截图、导出检查和浏览器检查为主。',
            '后续只应优先修复影响公开展示和试玩可信度的问题，不默认扩成大型内容项目。',
          ],
        },
      ],
      roadmap: [
        {
          title: '后续优化方向',
          items: [
            '补一段真实试玩短视频，增强展示证据链。',
            '继续检查移动端横竖屏缩放、HUD 遮挡和 Boss 可读性。',
            '把结果页、菜单和公开试玩路径作为后续小版本回归重点。',
          ],
        },
      ],
    },
    assistantContext: [
      'Spacewar II 是 Godot 4.6 纵向移动射击续作，作为第六个游戏接入 Playlab，包含差异化敌群、Boss 阶段、多向弹幕、拾取升级、炸弹、短窗口连击、资源结算、紧凑 HUD、结果页和 Web 试玩。',
      'Playlab 游戏站记录 Spacewar II 使用 spacewar-ii 统一 slug，已纳入游戏站内容模型、试玩域名和导出脚本，真实截图覆盖菜单、Boss 战斗和结果页。',
      '项目重点是把移动纵向射击的敌群、弹幕、拾取和结算节奏整理成可展示版本；后续方向包括移动端触控、Boss 可读性、关卡节奏、资源成长和发布素材继续打磨。',
    ],
  },
  {
    id: 'xunqiu',
    title: '寻球｜移动端与现代后端重建',
    summary: '足球社群移动端迁移案例：旧版 App 和旧后端保留历史链路，新 64 位 Android 客户端接入 Spring Boot 3、PostgreSQL、Render 与 R2 上传链路。',
    category: 'mobile',
    status: 'main',
    role: 'Android 64 位 / Spring Boot 3 / Render / R2',
    image: '/images/projects/showcase/xunqiu-android64-runtime.png',
    stack: ['Android 64', 'Java 17', 'Spring Boot 3', 'PostgreSQL', 'Flyway', 'Cloudflare R2', 'Render'],
    highlights: ['新旧链路分流', '旧接口兼容', '短视频上传播放', '测试矩阵与烟测'],
    links: [
      externalLink('产品展示页', `${XUNQIU_SITE_URL}/`),
      externalLink('技术文档', XUNQIU_DOCS_URL),
      externalLink('阶段 APK', XUNQIU_STAGE_APK_URL),
      externalLink('后端验证文档', XUNQIU_BACKEND_DOCS_URL),
      internalLink('迁移复盘文章', '/blog/xunqiu-android64-rebuild'),
    ],
    detailContent: {
      overview: [
        {
          title: '从旧足球社区 App 到可演示的新链路',
          body:
            '寻球围绕足球社群、球队管理、约赛日程、动态内容、短视频和球场信息展开。这个项目的核心不是简单升级一个 Android 包，而是把旧客户端、旧 Java WAR 后端、现代后端和 64 位新客户端拆开治理，让公开展示能说明产品路径、迁移边界和工程验证。',
          visual: {
            id: 'xunqiu-android-runtime',
            type: 'screenshot',
            title: '64 位 Android 客户端截图',
            description: '真实运行截图用于说明当前展示的重点是移动端迁移后的新客户端链路。',
            image: '/images/projects/showcase/xunqiu-android64-runtime.png',
            alt: '寻球 64 位 Android 客户端运行截图',
            caption: '真实运行截图来自公开展示页，用于说明 64 位客户端迁移结果；阶段 APK 不等同于应用商店发布承诺。',
            sourceLabel: '打开产品展示页',
            sourceUrl: 'https://xunqiu.playlab.eu.cc/',
          },
        },
        {
          title: '新旧并行降低迁移风险',
          body:
            '旧版客户端继续对应旧后端和历史接口，64 位新客户端通过配置化 Host 接入现代后端。这样可以保留旧包可回滚的安全边界，同时让新客户端独立验证登录、动态、球队、约赛、球场和短视频等核心体验。',
          visual: {
            id: 'xunqiu-migration-flow',
            type: 'workflow',
            title: '新旧链路分流',
            description: '说明旧客户端、旧后端、新 64 位客户端和现代后端如何并行，降低一次性迁移风险。',
            image: '/images/projects/showcase/xunqiu-migration-flow.svg',
            alt: '寻球新旧客户端与现代后端迁移流程图',
            caption: '迁移流程图归纳新旧链路分流策略，不公开旧后端 IP、测试账号或部署凭据。',
          },
        },
        {
          title: '展示站品牌入口对齐',
          body:
            '寻球静态展示站的首页、技术文档和 404 页已经补充 BIAU Port / 泊岸标题与统一 favicon，页脚也明确说明它归属于泊岸项目展示体系。寻球仍保留自己的产品名、文档入口和阶段 APK 边界。',
        },
      ],
      workflow: [
        {
          title: '移动端核心工作流',
          items: [
            '新客户端以单 Activity shell 承接登录、首次偏好、首页、社区、动态、短视频、日程、赛事、球场、球币和个人页等页面。',
            '动态链路支持列表、精选、详情、点赞、评论、文字动态和单图动态发布；发布完成后可以回到内容流或个人主页。',
            '球队和约赛链路覆盖我的球队、球队主页、成员、邀请码、临时队员、队费安全页、日程、活动创建、报名、待定和请假等入口。',
          ],
        },
        {
          title: '短视频上传与播放',
          items: [
            '短视频链路包含文件选择、大小和时长校验、封面预览、上传前确认、multipart 上传、列表回流、播放、点赞和评论。',
            '播放页根据真实视频宽高适配竖屏、横屏或普通视频，避免竖屏内容被压成横屏，也避免横屏视频被强拉伸。',
            '高副作用能力如支付、保险、IM、推送、地图和外部分享先做安全等价页，不在展示环境触发真实第三方服务。',
          ],
        },
      ],
      architecture: [
        {
          title: '遗留系统拆解',
          body:
            '旧工作区包含 Android、iOS、旧 Java WAR 服务端、康复服务端、部署脚本和历史文档。旧 Android 工程依赖旧构建栈、多个业务模块和视频/IM/推送/支付等第三方能力；旧服务端依赖 Tomcat、MySQL、Redis 和历史配置。迁移前先把这些边界文档化，避免把所有风险压到一次升级里。',
        },
        {
          title: '64 位客户端重建',
          body:
            '新版 Android 工程是轻量单模块客户端，包内不引入旧 32 位 native so，接口集中在 ApiClient，登录态、异步任务、UI 工具和内容排序工具分别封装。客户端继续兼容旧接口路径和返回 envelope，把字段 fallback 与媒体 URL 归一化集中处理。',
          visual: {
            id: 'xunqiu-module-map',
            type: 'architecture',
            title: '移动端模块图',
            description: '展示新客户端的主要页面、ApiClient 和内容模块关系，避免只用文字解释迁移范围。',
            image: '/images/projects/showcase/xunqiu-module-map.svg',
            alt: '寻球 64 位 Android 客户端模块图',
            caption: '模块图说明 Android 客户端页面和 ApiClient 边界，不包含本地工程路径或签名配置。',
          },
        },
        {
          title: '现代后端与接口兼容',
          body:
            '新后端使用 Spring Boot 3、Java 17、PostgreSQL、Flyway、Docker 和 Render。服务保持 `/free_kicker` 上下文和旧客户端熟悉的接口形态，控制器覆盖账号、用户、动态、短视频、球队、比赛、球场、搜索和 fallback；尚未真实接入的旧接口返回安全空结果或安全 stub。',
        },
        {
          title: '文件与媒体存储',
          body:
            '上传由服务端接收 multipart，再通过 S3-compatible 客户端写入 Cloudflare R2；数据库记录对象 key、公开 URL、文件名、MIME 和大小。未配置 R2 时，后端仍能返回可用于链路验证的占位公开 URL，便于先验证客户端主流程。',
        },
      ],
      quality: [
        {
          title: '验证链路',
          items: [
            'Android 侧维护测试矩阵，把功能标记为已验证、需回归、兜底可用或待接入，覆盖登录、首页、动态、短视频、球队、日程、赛事、球场、球币、消息和三方安全页。',
            '旧版入口对照清单把旧 App 主要入口映射到 64 位客户端的真实接入、安全等价、待回归或不纳入主线状态。',
            '后端 MockMvc 测试覆盖健康检查、旧登录 envelope、动态发布、视频上传校验、球队、球场、fallback 和幂等社交流。',
            'PostgreSQL/Testcontainers 测试验证 Flyway seed 与核心控制器，部署烟测脚本覆盖 health、login、tweets、videos、team 和 pitches。',
          ],
          visual: {
            id: 'xunqiu-verification-chain',
            type: 'status',
            title: '验证证据链',
            description: '把 Android 测试矩阵、旧入口对照、后端测试和部署烟测组织成可复盘的迁移验证链。',
            image: '/images/projects/showcase/xunqiu-verification-chain.svg',
            alt: '寻球迁移验证矩阵与烟测证据链示意图',
            caption: '验证链示意图展示公开可描述的测试类型，不代表实时 SLA 或生产监控面板。',
          },
        },
        {
          title: 'Health 与 smoke 边界',
          items: [
            '现代后端的健康检查路径保持在 `/free_kicker/actuator/health`，用于确认服务进程和基础依赖在某个时刻可响应。',
            '后端仓库的 smoke 脚本会在指定 base URL 上串起 health、兼容旧 envelope 的登录、动态、短视频、球队和球场列表。',
            '公开 health 若遇到 Render 冷启动或超时，只能说明需要重试和查看日志，不能把静态展示站当成后端长期在线或生产 SLA 的证明。',
          ],
        },
        {
          title: '部署和展示边界',
          body:
            '公开产品展示站由 Cloudflare Pages 承载静态页面、技术文档、素材和阶段 APK 下载；展示站中的 latest-xunqiu64.apk 是当前用于展示的阶段包副本，用来说明迁移进展，不等同于应用商店发布承诺。动态 API 由独立 Render 服务承载，数据库由 PostgreSQL/Flyway 初始化，文件上传走 R2。静态站和 BIAU Port 都只展示项目材料，不保存旧后端 IP、测试密码、签名路径、数据库连接、R2 密钥或 Render 私有配置。',
        },
      ],
      limitations: [
        {
          title: '当前边界',
          items: [
            '64 位客户端仍有一部分页面处于需回归或安全等价状态，不能把所有旧版深层能力都表述为完整生产可用。',
            '支付、IM、推送、地图、分享、真实兑换、赛事创建和比分提交等高副作用能力保留边界，不在展示环境触发真实外部服务。',
            'Render 免费服务、演示数据、静态阶段 APK 下载和 R2 配置都更适合展示和轻量验证，不应被描述为长期生产运营方案。',
            '阶段 APK 可以帮助访客理解 Android 64 位迁移结果，但公开下载前仍需要补齐签名、版本说明、扫描、回滚和发布渠道策略。',
          ],
        },
      ],
      roadmap: [
        {
          title: '后续优化方向',
          items: [
            '继续按测试矩阵回归真实手机、图片选择、短视频上传、球队队费、日程签到、WebView 兜底和旧接口字段兼容。',
            '逐步把更多旧 WebView 和安全等价页改成原生页面，减少旧网页质量和第三方 SDK 对核心体验的影响。',
            '强化后端权限、审计、文件治理、监控和部署策略，让 Render/R2 演示链路演进为更稳的生产部署。',
            '短视频后续可评估 ExoPlayer、缓存、多清晰度、错误恢复和更完整的信息流交互。',
          ],
        },
      ],
    },
    assistantContext: [
      '寻球是足球社群移动端迁移案例，核心是旧版 App/旧 Java WAR 后端保留历史链路，新 64 位 Android 客户端接入 Spring Boot 3 现代后端。',
      '64 位客户端是轻量单模块 Android 工程，接口集中在 ApiClient，保留旧接口路径和 response envelope，覆盖登录、动态、短视频、球队、日程、赛事、球场、球币和个人页等核心路径。',
      '现代后端使用 Spring Boot 3、Java 17、PostgreSQL、Flyway、Docker、Render 和 Cloudflare R2，控制器覆盖账号、用户、动态、视频、球队、比赛、球场、搜索和 fallback。',
      '短视频链路包含文件选择、大小/时长校验、封面、multipart 上传、R2 存储、列表回流、播放比例适配、点赞和评论，并针对小文件异常视频做了防护。',
      '项目有 Android 测试矩阵、旧版入口对照、后端 MockMvc 测试、PostgreSQL/Testcontainers 测试和部署烟测脚本；支付、IM、推送、地图、分享等高副作用能力当前以安全等价或 stub 方式收口。',
      '现代后端健康检查路径是 /free_kicker/actuator/health，smoke 脚本覆盖 health、登录、动态、短视频、球队和球场；如果公开 health 冷启动或超时，应作为运维排查信号，而不是生产 SLA 结论。',
      '公开展示站提供产品页、技术文档和 latest-xunqiu64.apk 阶段包副本；这些入口用于展示与轻量验证，不代表完整生产发布或长期生产运营方案，也不包含旧后端 IP、测试密码、签名路径或私有云配置。',
      'latest-xunqiu64.apk 是展示站阶段包，不等同于应用商店发布承诺；后续公开下载策略仍需要签名、版本说明、扫描、回滚和发布渠道策略。',
      '寻球静态展示站首页、技术文档页和 404 页已统一 BIAU Port / 泊岸标题与 favicon，并在页脚说明归属泊岸项目展示体系。',
      '后续优化方向包括真实设备回归、旧 WebView 原生化、权限与审计、文件治理、监控部署、短视频播放器升级和更完整的生产化运维。',
    ],
  },
]

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

export function getProjectAssistantSummary(project: Project) {
  return [project.summary, ...(project.assistantContext ?? [])].join(' ')
}

export function getProjectAssistantTags(project: Project) {
  return uniqueStrings([
    project.category,
    categoryLabels[project.category],
    project.status,
    statusLabels[project.status],
    project.role,
    ...project.stack,
    ...project.highlights,
  ])
}

export const capabilityTracks = [
  { title: 'AI 应用', detail: 'RAG、Agent、引用溯源、审核闭环', value: 'Legal RAG / Pet Workspace' },
  { title: '业务系统', detail: '后台、API、数据库、队列、审计日志', value: 'Ozon 电商 ERP' },
  { title: '互动体验', detail: 'Godot 展示入口、试玩计划、游戏展示页', value: '6 个游戏项目' },
  { title: '博客系统', detail: 'React + Semi、Astro、内容审计、部署准备', value: 'BIAU Port / Playlab' },
]
