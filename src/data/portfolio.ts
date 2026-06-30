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

export interface ProjectDetailSection {
  title: string
  body?: string
  items?: string[]
  links?: ProjectLink[]
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
    ],
    detailContent: {
      overview: [
        {
          title: '从“问答机器人”推进到可演示工作台',
          body:
            'Legal RAG 的重点不是把合同丢给模型后返回一段结论，而是把文档入库、检索、引用、诊断、合同风险项和质量评测组织成一个可操作的工作台。访客可以看到知识库、问答、审查结果和质量面板，理解 AI 结论来自哪些片段以及系统为什么选择回答或拒答。',
        },
        {
          title: '公开演示只使用安全材料',
          body:
            '公开演示围绕已脱敏或公开安全的数据集展开，展示登录后的知识库初始化、RAG 问答、合同审查和质量报告，不暴露演示密码、模型密钥、数据库连接串或部署后台信息。',
        },
      ],
      workflow: [
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
            '项目采用 workspace monorepo：Web 端是 Vue 3、Vite、TypeScript，API 端是 Node.js、Express、TypeScript，并通过 shared package 复用请求/响应类型。API Dockerfile 会构建 shared 与 API 输出、复制数据集并暴露服务端口，线上演示使用可替换的模型与向量存储适配器。',
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
        },
        {
          title: '可解释性优先',
          items: [
            '问答要求基于召回片段生成，引用不足时可以拒答或返回边界说明。',
            '合同审查的高风险项来自规则命中，模型增强只改变表达，不绕过风险识别和 schema 校验。',
            '审计与诊断信息帮助复盘一次回答从导入、检索到生成的关键步骤。',
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
      '后续优化方向包括更完整的用户/邀请权限、更多脱敏数据集、评测趋势、OCR、rerank 模型、CI 与镜像发布。',
    ],
  },
  {
    id: 'pet-workspace',
    title: 'AI 宠物生成与审核管线',
    summary: '围绕 App 端、生成规则服务、Android 验证与生成管线组织的 AI 宠物项目工作区。',
    category: 'ai',
    status: 'main',
    role: '生成管线 / 质量门禁 / App 接口契约 / Android 联调',
    image: '/images/projects/showcase/fantasy-pet-flow.png',
    stack: ['Agent', 'Worker', '质量门禁', 'Android', 'Docker'],
    highlights: ['任务状态机', '生成审核', '人审发布', 'App 接口契约'],
    links: [],
  },
  {
    id: 'ozon-erp',
    title: 'Ozon 电商 ERP',
    summary: '面向小团队自用的 Ozon ERP，覆盖 Vue 管理后台、Node API、Prisma、Redis/BullMQ Worker 和 Chrome MV3 采集插件。',
    category: 'business',
    status: 'main',
    role: '业务系统 / 管理后台 / API / Worker / 浏览器插件',
    image: '/images/projects/showcase/erp-cover.svg',
    stack: ['Vue 3', 'Express', 'Prisma', 'PostgreSQL', 'Redis', 'BullMQ', 'WXT'],
    highlights: ['店铺授权', '商品与订单同步', '采集铺货', '审计日志'],
    links: [
      externalLink('访问 ERP', OZON_ERP_ENTRY_URL),
      internalLink('架构文章', '/blog/ozon-erp-architecture'),
    ],
  },
  {
    id: 'biau-playlab',
    title: 'Biau Playlab｜游戏作品集与系统设计内容站',
    summary: '基于 Astro 的独立游戏内容站，整合六个 Godot 游戏原型、Web 试玩、系统设计文章和开发日志。',
    category: 'platform',
    status: 'live',
    role: 'Astro 作品集 / Godot 游戏展示 / 系统设计文章 / Cloudflare Pages',
    stack: ['Astro 5', 'Content Collections', 'Godot Web', 'Cloudflare Pages'],
    highlights: ['六个游戏案例', 'Web 试玩入口', '系统设计文章', '开发日志'],
    detailLink: externalLink('进入游戏站', `${GAME_SITE_URL}/`),
    links: [
      externalLink('游戏站', `${GAME_SITE_URL}/`),
      externalLink('源码仓库', 'https://github.com/ciallo-bill/blog'),
    ],
  },
  {
    id: 'blog-semi',
    title: 'React + Semi 博客系统｜当前主站',
    summary: '当前主站，用 React 与 Semi Design 组织首页、项目、案例、博客、详情路由、主题切换和自动部署。',
    category: 'platform',
    status: 'ongoing',
    role: 'React 主站 / Semi 组件体系 / 项目案例路由 / 自动部署',
    stack: ['React', 'Vite', 'TypeScript', 'Semi Design'],
    highlights: ['多视图主站', '项目详情', '案例详情', '自动部署'],
    links: [],
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
  },
  {
    id: 'xunqiu',
    title: '寻球｜移动端与现代后端重建',
    summary: '面向足球社群和约赛场景的移动端业务系统：旧版客户端保留旧链路，新版 64 位客户端接入 Spring Boot 后端、托管数据库与 R2 上传链路。',
    category: 'mobile',
    status: 'main',
    role: 'Android 64 位 / Spring Boot 3 / Render / R2',
    image: '/images/projects/showcase/xunqiu-android64-runtime.png',
    stack: ['Android 64', 'Spring Boot 3', 'PostgreSQL', 'Cloudflare R2', 'Render'],
    highlights: ['新旧客户端分流', '兼容旧接口 envelope', 'Flyway 数据初始化', 'R2 上传验收'],
    links: [
      externalLink('产品展示页', `${XUNQIU_SITE_URL}/`),
      externalLink('新后端仓库', 'https://github.com/Drew-Z/xunqiu-backend-modern'),
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
  return uniqueStrings([project.category, project.status, project.role, ...project.stack, ...project.highlights])
}

export const capabilityTracks = [
  { title: 'AI 应用', detail: 'RAG、Agent、引用溯源、审核闭环', value: 'Legal RAG / Pet Workspace' },
  { title: '业务系统', detail: '后台、API、数据库、队列、审计日志', value: 'Ozon 电商 ERP' },
  { title: '互动体验', detail: 'Godot 展示入口、试玩计划、游戏展示页', value: '6 个游戏项目' },
  { title: '博客系统', detail: 'React + Semi、Astro、内容审计、部署准备', value: 'Biau Port / Playlab' },
]
