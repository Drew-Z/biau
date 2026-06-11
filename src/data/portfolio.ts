export type ProjectCategory = 'ai' | 'business' | 'interactive' | 'mobile' | 'platform'
export type ProjectStatus = 'main' | 'live' | 'mvp' | 'ongoing' | 'pending'

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
  links: {
    label: string
    href: string
    type: 'internal' | 'external'
  }[]
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
  pending: '待整理',
}

export const projects: Project[] = [
  {
    id: 'legal-rag',
    title: 'Legal RAG｜法律智能机器人与合同审查',
    summary: '法律合同 RAG 全栈 MVP，包含文档导入、条款切分、引用溯源、问答和合同风险审查。',
    category: 'ai',
    status: 'main',
    role: '全栈 MVP / RAG 流程 / 合同审查工作台',
    image: '/images/projects/showcase/legal-rag-reviewed.png',
    stack: ['Vue 3', 'Express', 'TypeScript', 'RAG', 'Mock Embedding'],
    highlights: ['知识库导入', 'RAG 问答', '合同风险审查', '引用 citations'],
    links: [
      { label: '本页查看', href: '#legal-rag', type: 'internal' },
    ],
  },
  {
    id: 'pet-workspace',
    title: 'Pet Workspace｜AI 宠物生成与审核管线',
    summary: '围绕 gamer、fantasy-pet-rule、Android 与生成管线组织的 AI 宠物项目工作区。',
    category: 'ai',
    status: 'main',
    role: '生成管线 / QA gate / App API 契约 / Android 联调',
    image: '/images/projects/showcase/fantasy-pet-flow.png',
    stack: ['Agent', 'Worker', 'QA Gate', 'Android', 'Docker'],
    highlights: ['任务状态机', '生成审核', '人审发布', 'App-facing API'],
    links: [
      { label: '本页查看', href: '#pet-workspace', type: 'internal' },
    ],
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
    links: [
      { label: '本页查看', href: '#ozon-erp', type: 'internal' },
    ],
  },
  {
    id: 'biau-playlab',
    title: 'Biau Playlab｜Astro 博客系统',
    summary: '旧版 Astro 静态内容站，承载文章、开发日志、游戏展示、RSS、站点审计和 Cloudflare Pages 发布资料。',
    category: 'platform',
    status: 'live',
    role: 'Astro 内容站 / 游戏展示 / 内容审计 / 静态部署',
    stack: ['Astro', 'Content Collections', 'Cloudflare Pages'],
    highlights: ['内容集合', '游戏展示', 'R2 试玩包', '静态部署'],
    links: [],
  },
  {
    id: 'blog-semi',
    title: 'Biau Blog｜React + Semi 博客系统',
    summary: '当前主站，用 React + Semi 组织首页、项目、案例、博客、详情路由、主题切换和 Cloudflare 自动部署。',
    category: 'platform',
    status: 'ongoing',
    role: 'React 主站 / Semi 组件体系 / 项目案例路由 / CF 部署',
    stack: ['React', 'Vite', 'TypeScript', 'Semi Design'],
    highlights: ['多视图主站', '项目详情', '案例详情', '自动部署'],
    links: [{ label: '当前站点', href: '#blog-semi', type: 'internal' }],
  },
  {
    id: 'game-first-tetris',
    title: 'game-first-tetris',
    summary: 'Godot 4 俄罗斯方块原型，包含经典模式、Rogue 三选一、触屏桥接、响应式布局和截图回归。',
    category: 'interactive',
    status: 'live',
    role: 'Godot / Web 游戏 / 试玩入口',
    stack: ['Godot', 'Web Export', 'Game Prototype'],
    highlights: ['经典模式', 'Rogue 原型', '触屏输入', '截图回归'],
    links: [{ label: '查看页面', href: '/games/first-tetris', type: 'external' }],
  },
  {
    id: 'game-next-spacewar',
    title: 'game-next-spacewar',
    summary: 'Godot 4.6 太空射击展示构建，补齐主菜单、设置、Help、暂停、结果页和 session summary。',
    category: 'interactive',
    status: 'live',
    role: 'Godot / Spacewar / 展示构建 / 单局复盘',
    stack: ['Godot 4.6', 'Spacewar', 'Web Export'],
    highlights: ['主菜单', '帮助暂停', '战斗循环', '结果复盘'],
    links: [{ label: '查看页面', href: '/games/next-spacewar', type: 'external' }],
  },
  {
    id: 'intespace',
    title: 'intespace',
    summary: '竖屏自动射击 Roguelite，围绕武器树、局内升级、Boss 试炼、局外成长和集成试玩收口。',
    category: 'interactive',
    status: 'live',
    role: 'Godot / Roguelite / 武器树 / 局外成长',
    stack: ['Godot', 'Roguelite', 'Weapon Tree', 'Mobile-first'],
    highlights: ['武器树', '自动射击', 'Boss 试炼', '局外成长'],
    links: [{ label: '查看页面', href: '/games/intespace', type: 'external' }],
  },
  {
    id: 'raiden-prototype',
    title: 'raiden-prototype',
    summary: 'Godot 纵版射击垂直切片，覆盖双关章节、火力成长、Boss 相位、章节过场和 Demo 验证。',
    category: 'interactive',
    status: 'live',
    role: 'Godot / STG / 原型验证',
    stack: ['Godot', 'STG', 'Prototype'],
    highlights: ['双关章节', '火力成长', 'Boss 收束', 'Demo 验证'],
    links: [{ label: '查看页面', href: '/games/raiden', type: 'external' }],
  },
  {
    id: 'space-war',
    title: 'space-war',
    summary: '复古横向太空射击完整版本，包含 Sector/Boss、道具、高分、结果页、程序化音效和发布文档。',
    category: 'interactive',
    status: 'live',
    role: 'Godot / Retro Shooter / 发布版 / Web 展示',
    stack: ['Godot 4.6', 'Retro Shooter', 'Web'],
    highlights: ['Sector/Boss', '道具系统', '高分结算', '发布文档'],
    links: [{ label: '查看页面', href: '/games/space-war', type: 'external' }],
  },
  {
    id: 'xunqiu',
    title: 'xunqiu｜移动端业务系统',
    summary: '多端历史业务系统，包含旧 Android、新 64 位 Android、iOS、Java 服务端、后台/H5、发布包和迁移文档。',
    category: 'mobile',
    status: 'pending',
    role: 'Android 64 位重构 / Java 服务端 / 发布验收',
    stack: ['Android', 'Java Spring', 'MySQL', 'Release'],
    highlights: ['64 位重构', '业务模块', '服务端接口', '发布验收'],
    links: [],
  },
]

export const capabilityTracks = [
  { title: 'AI 应用', detail: 'RAG、Agent、引用溯源、审核闭环', value: 'Legal RAG / Pet Workspace' },
  { title: '业务系统', detail: '后台、API、数据库、队列、审计日志', value: 'Ozon 电商 ERP' },
  { title: '互动体验', detail: 'Godot Web 导出、试玩入口、游戏展示页', value: '5 个游戏项目' },
  { title: '博客系统', detail: 'React + Semi、Astro、内容审计、部署准备', value: 'Biau Blog / Playlab' },
]

export const articles = [
  { title: 'Legal RAG 项目说明', tag: 'AI 应用', status: '可整理' },
  { title: 'Ozon 电商 ERP 交付说明', tag: '业务系统', status: '可整理' },
  { title: 'Pet Workspace 架构边界', tag: 'AI 应用', status: '待补图' },
  { title: 'Godot Web 游戏展示规范', tag: '互动体验', status: '待整理' },
]
