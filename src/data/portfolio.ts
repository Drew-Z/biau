export type ProjectCategory = 'ai' | 'business' | 'interactive' | 'mobile' | 'platform'
export type ProjectStatus = 'main' | 'live' | 'mvp' | 'ongoing'

export interface ProjectLink {
  label: string
  href: string
  type: 'internal' | 'external'
}

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
}

const GAME_SITE_URL = 'https://games.playlab.eu.cc'
const PLAY_SITE_URL = 'https://play.playlab.eu.cc'

function externalLink(label: string, href: string): ProjectLink {
  return { label, href, type: 'external' }
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

export const projects: Project[] = [
  {
    id: 'legal-rag',
    title: 'Legal RAG｜法律智能机器人与合同审查',
    summary: '法律合同 RAG 全栈 MVP，包含文档导入、条款切分、引用溯源、智能问答和合同风险审查。',
    category: 'ai',
    status: 'main',
    role: '全栈 MVP / RAG 流程 / 合同审查工作台',
    image: '/images/projects/showcase/legal-rag-reviewed.png',
    stack: ['Vue 3', 'Express', 'TypeScript', 'RAG', '可替换向量库'],
    highlights: ['知识库导入', 'RAG 问答', '合同风险审查', '引用溯源'],
    links: [],
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
    summary: '面向小团队自用的 Ozon ERP，覆盖 Vue 管理后台、Node API、Prisma、BullMQ Worker 和 Chrome 采集插件。',
    category: 'business',
    status: 'main',
    role: '业务系统 / 管理后台 / API / Worker / 浏览器插件',
    image: '/images/projects/showcase/erp-cover.svg',
    stack: ['Vue 3', 'Express', 'Prisma', 'PostgreSQL', 'BullMQ', 'WXT'],
    highlights: ['商品与订单同步', '采集铺货', '审批中心', '审计日志'],
    links: [],
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
    summary: 'Godot 4 俄罗斯方块原型，包含经典模式、肉鸽三选一强化、触屏桥接、响应式布局和截图回归。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 引擎 / Web 试玩 / 触屏适配',
    image: '/images/projects/showcase/tetris-classic-desktop.png',
    stack: ['Godot 4', 'Web 导出', '游戏原型'],
    highlights: ['经典模式', '肉鸽原型', '触屏输入', '截图回归'],
    detailLink: gameSiteLink('first-tetris'),
    links: [gameSiteLink('first-tetris'), gamePlayLink('first-tetris')],
  },
  {
    id: 'game-next-spacewar',
    title: '太空战机｜展示构建',
    summary: 'Godot 4.6 太空射击展示构建，补齐主菜单、设置、帮助、暂停、结果页和单局复盘总结。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 展示构建 / 战斗循环 / 单局复盘',
    image: '/images/projects/showcase/next-spacewar-menu.png',
    stack: ['Godot 4.6', '太空射击', 'Web 导出'],
    highlights: ['主菜单', '帮助暂停', '战斗循环', '结果复盘'],
    detailLink: gameSiteLink('next-spacewar'),
    links: [gameSiteLink('next-spacewar'), gamePlayLink('next-spacewar')],
  },
  {
    id: 'intespace',
    title: '竖屏肉鸽射击｜intespace',
    summary: '竖屏自动射击肉鸽游戏，围绕武器树、局内升级、首领试炼、局外成长和集成试玩收口。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 引擎 / 肉鸽玩法 / 武器树 / 局外成长',
    image: '/images/projects/showcase/intespace-player-hub.png',
    stack: ['Godot', '肉鸽玩法', '武器树系统', '移动端优先'],
    highlights: ['武器树', '自动射击', '首领试炼', '局外成长'],
    detailLink: gameSiteLink('intespace'),
    links: [gameSiteLink('intespace'), gamePlayLink('intespace')],
  },
  {
    id: 'raiden-prototype',
    title: '纵版弹幕射击｜垂直切片',
    summary: 'Godot 纵版射击垂直切片，覆盖双关卡章节、火力成长、首领相位、章节过场和试玩验证。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 引擎 / 纵版射击 / 原型验证',
    image: '/images/projects/showcase/raiden-main-menu.png',
    stack: ['Godot', '纵版射击', '原型验证'],
    highlights: ['双关卡章节', '火力成长', '首领收束', '试玩验证'],
    detailLink: gameSiteLink('raiden'),
    links: [gameSiteLink('raiden'), gamePlayLink('raiden')],
  },
  {
    id: 'space-war',
    title: '复古横版射击｜space-war',
    summary: '复古横向太空射击完整版本，包含多区域关卡、首领战、道具、高分、结果页、程序化音效和发布文档。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 引擎 / 复古射击 / 发布版 / 展示入口',
    image: '/images/projects/showcase/space-war-gameplay.png',
    stack: ['Godot 4.6', '复古射击', 'Web 包计划'],
    highlights: ['区域首领', '道具系统', '高分结算', '发布文档'],
    detailLink: gameSiteLink('space-war'),
    links: [gameSiteLink('space-war'), gamePlayLink('space-war')],
  },
  {
    id: 'spacewar-ii',
    title: '移动纵向射击｜Spacewar II',
    summary: 'Godot 4.6 纵向移动射击续作原型，围绕菜单、战斗、拾取升级、炸弹、紧凑 HUD 和结果页接入第六个 Web 试玩位。',
    category: 'interactive',
    status: 'live',
    role: 'Godot 引擎 / 纵向射击 / Web 试玩 / 第六项目接入',
    image: '/images/projects/showcase/spacewar-ii-cover.svg',
    stack: ['Godot 4.6', '移动射击', 'Web 导出'],
    highlights: ['纵向推进', '拾取升级', '炸弹系统', '结果结算'],
    detailLink: gameSiteLink('spacewar-ii'),
    links: [gameSiteLink('spacewar-ii'), gamePlayLink('spacewar-ii')],
  },
  {
    id: 'xunqiu',
    title: '寻球｜移动端业务系统',
    summary: '多端历史业务系统，包含旧版 Android、新 64 位 Android、iOS、Java 服务端、后台与 H5、发布包和迁移文档。',
    category: 'mobile',
    status: 'main',
    role: 'Android 64 位重构 / Java 服务端 / 发布验收',
    image: '/images/projects/showcase/xunqiu-module-map.svg',
    stack: ['Android', 'Java Spring', 'MySQL', '发布验收'],
    highlights: ['64 位重构', '业务模块', '服务端接口', '发布验收'],
    links: [],
  },
]

export const capabilityTracks = [
  { title: 'AI 应用', detail: 'RAG、Agent、引用溯源、审核闭环', value: 'Legal RAG / Pet Workspace' },
  { title: '业务系统', detail: '后台、API、数据库、队列、审计日志', value: 'Ozon 电商 ERP' },
  { title: '互动体验', detail: 'Godot 展示入口、试玩计划、游戏展示页', value: '6 个游戏项目' },
  { title: '博客系统', detail: 'React + Semi、Astro、内容审计、部署准备', value: 'Biau Port / Playlab' },
]
