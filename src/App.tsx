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

const navItems: Array<{ key: NavViewKey; label: string; icon: React.ReactNode }> = [
  { key: 'home', label: '首页', icon: <IconHome /> },
  { key: 'projects', label: '项目', icon: <IconApps /> },
  { key: 'cases', label: '案例', icon: <IconBriefcase /> },
  { key: 'blog', label: '博客', icon: <IconArticle /> },
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
    detail: '记录合同审查、引用溯源和 RAG 问答的实现路径。',
    date: '2026-06-11',
    readTime: '8 min',
    sections: [
      { title: '为什么先做 RAG 项目', body: '法律合同审查天然适合展示检索增强生成的价值：文本长、条款多、风险点分散，并且回答必须能追溯到来源。这个项目把 AI 能力从聊天框推进到文档导入、条款切分、语义检索、引用溯源和风险审查的完整流程。' },
      { title: 'MVP 阶段的取舍', body: '为了保证本地演示稳定，项目先用 Mock Embedding 和内存向量库跑通主链路。这样可以把精力放在接口边界、数据结构、引用返回和前端工作台上，后续再替换真实 embedding、pgvector、PDF/DOCX parser 和任务队列。' },
      { title: '面试讲述重点', body: '讲项目时不要只说“接了 AI 接口”，而是强调如何降低幻觉风险：回答必须带 citations，审查结果要能回到原文条款，风险输出要结构化，关键节点要保留人工复核入口。' },
    ],
    takeaways: ['先跑通可解释闭环，再替换生产级模型和存储。', 'RAG 项目的核心展示点是引用、阈值、召回质量和人工复核。', '博客文章负责沉淀复盘，项目页负责讲工程实现，案例页负责讲业务价值。'],
  },
  {
    slug: 'ozon-erp-architecture',
    title: 'Ozon ERP 架构整理',
    tag: '全栈开发',
    detail: '整理后台、API、Worker、插件和数据库的边界。',
    date: '2026-06-12',
    readTime: '6 min',
    sections: [
      { title: '系统边界', body: 'ERP 项目的价值在于把后台操作、API 服务、数据库模型、异步任务和浏览器插件组织成一条可追踪链路。' },
      { title: '交付口径', body: '对外展示时需要突出审批、审计、队列和安全开关，而不是暴露真实店铺、账号或连接信息。' },
    ],
    takeaways: ['业务系统要讲清楚模块边界。', '真实写入必须有开关和审计。', '插件、Worker、API 的协作是工程亮点。'],
  },
  {
    slug: 'game-showcase-standard',
    title: '游戏项目展示规范',
    tag: '游戏项目',
    detail: '统一试玩入口、封面图、操作说明和导出流程。',
    date: '2026-06-13',
    readTime: '5 min',
    sections: [
      { title: '为什么需要展示规范', body: '游戏项目如果只放源码，访问者很难理解玩法循环。展示页需要明确玩法、操作方式、版本状态、截图证据和试玩入口。' },
      { title: '下一步接入', body: '先把每个游戏整理成独立展示页，再逐步接入 Godot Web 导出包、加载状态和版本记录。' },
    ],
    takeaways: ['每个游戏要有独立入口。', '试玩包和项目说明保持解耦。', '版本记录能让原型更像产品。'],
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
    results: ['生成任务、审核、发布拆成可追踪阶段', '服务端工具覆盖任务包、审核决策、运行摘要和资产校验', 'Android 桌宠实验验证悬浮窗、前台服务和本地证明链', '本地 HidenCloud 替代环境用于稳定联调社区 API'],
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
    id: 'godot-showcase',
    projectId: 'game-first-tetris',
    title: 'Godot Web 游戏展示体系',
    eyebrow: '游戏项目 / 互动体验',
    status: '补充中',
    summary: '把 Tetris、Spacewar、InteSpace、Raiden Prototype、Space War 等 Godot 项目整理成可试玩、可说明、可回归的展示体系。',
    outcome: '多款互动项目的统一展示规范',
    challenge: '游戏项目如果只放源码很难被快速理解，需要让访问者看到玩法循环、操作方式、版本阶段、截图证据和 Web 试玩入口。',
    solution: '项目统一按 Godot 工程、场景、脚本、文档、导出预设和验证日志组织，页面侧按玩法类型拆成可浏览的项目详情，并保留外部试玩跳转。',
    results: ['Tetris 已具备经典模式、Rogue 原型、触屏桥接和多尺寸回归', 'Spacewar 展示版包含主菜单、设置、Help、暂停、结果页和会话总结', 'Raiden Prototype 形成双关垂直切片、Boss、章节过场和公开 Demo 准备文档', 'Space War 保留复古横向射击、Sector/Boss、程序化音效和发布文档'],
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
              {item.label}
            </button>
          ))}
        </nav>

        <ThemeToggle theme={siteTheme} onChange={setSiteTheme} />
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
          <Text type="tertiary">Project Categories</Text>
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
                  <Text type="tertiary">Selected Projects</Text>
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
          <Text type="tertiary">Case Matrix</Text>
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
        <Text type="tertiary">Projects</Text>
        <Title heading={1}>项目系统</Title>
        <Paragraph>按 AI 应用、全栈开发和游戏项目三条能力线组织项目，让访问者第一屏就能看到主体展示、项目截图、技术栈和可跳转入口。</Paragraph>
      </section>

      <section className="project-stage">
        <div className="project-stage-head">
          <div>
            <span className="section-pill">Project Categories</span>
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
                  <Text type="tertiary">Selected Project</Text>
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
              <article key={project.id} className={detailProject.id === project.id ? 'project-thumb-card is-active' : 'project-thumb-card'}>
                <span>{categoryLabels[project.category]}</span>
                <strong>{project.title}</strong>
                <em>{project.summary}</em>
                <Space wrap>
                  <Button size="small" theme="light" type="primary" onClick={() => onSelectProject(project.id)}>预览</Button>
                  <Button size="small" theme="solid" type="primary" onClick={() => onOpenProjectDetail(project)}>项目详情</Button>
                  {projectCase ? <Button size="small" onClick={() => onOpenCase(projectCase)}>案例</Button> : null}
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
        <Text type="tertiary">Cases</Text>
        <Title heading={1}>案例中心</Title>
        <Paragraph>参考成熟官网的 Customer Stories 结构，案例页只讲业务场景、解决方案、交付结果和证据材料；工程细节统一跳转到独立项目详情页。</Paragraph>
      </section>

      <section className="case-matrix-board">
        <div className="case-board-head">
          <div>
            <span className="section-pill">Case Library</span>
            <Title heading={2}>按落地故事组织案例</Title>
            <Paragraph>每个案例都遵循 Challenge / Solution / Results：先讲为什么做，再讲怎么交付，最后给截图、架构和面试讲述入口。</Paragraph>
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
                <Button theme="solid" type="primary" onClick={() => onOpenCase(featuredCase)}>查看案例详情</Button>
                <Button onClick={() => onOpenProjectDetail(featuredProject)}>项目完整介绍</Button>
              </Space>
            </div>
          </article>

          <aside className="case-guide-card">
            <span className="section-pill">What Goes Here</span>
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
              <p>面试或对外展示时如何讲业务价值、技术取舍和后续扩展。</p>
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
                  <Button theme="solid" type="primary" onClick={() => onOpenCase(caseStudy)}>查看案例详情</Button>
                  <Button theme="light" type="primary" onClick={() => onOpenProjectDetail(project)}>项目详情</Button>
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
          '案例页则进一步讲清楚业务场景、截图证据和面试讲解口径，避免和项目详情页重复。',
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
        <span className="section-pill">Project Brief</span>
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
          <Button theme="solid" type="primary" onClick={onOpenProjectDetail}>打开项目详情页</Button>
          {projectCase ? <Button onClick={onOpenCase}>查看对应案例</Button> : null}
          {gameSlug ? <Button onClick={onOpenGameDetail}>进入游戏展示页</Button> : null}
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
  nextSteps: string[]
}

function getProjectDetailContent(project: Project): ProjectDetailContent {
  if (project.id === 'legal-rag') {
    return {
      subtitle: 'RAG 合同审查全栈 MVP',
      overview: '项目围绕法律合同审查建立完整业务闭环：导入合同文本，按条款切分，检索相关上下文，生成问答或审查结论，并用 citations 绑定来源片段，让 AI 输出可解释、可复核。',
      modules: [
        { title: '知识库导入', detail: '导入合同文本并组织为可检索材料，为后续问答和审查提供上下文。' },
        { title: '条款切分', detail: '将长合同拆成适合检索和引用的 chunk，保留条款语义和来源信息。' },
        { title: 'RAG 问答', detail: '根据用户问题召回相关条款，生成回答并展示引用来源。' },
        { title: '合同风险审查', detail: '围绕付款、交付、责任、解除等风险点输出等级、建议和引用。' },
      ],
      implementation: [
        '前端用 Vue 3 实现合同审查工作台、知识库页面和问答页面。',
        '后端用 Express + TypeScript 暴露文档、检索、问答和审查接口。',
        'MVP 阶段使用 Mock Embedding 保证演示稳定，后续可替换真实向量数据库。',
        '输出层将 answer、risk item、source chunk 和 citations 组织为前端可直接渲染的数据结构。',
      ],
      nextSteps: ['接入真实 Embedding 与向量数据库', '增加合同版本对比', '导出审查报告', '补充用户权限和审计日志'],
    }
  }

  if (project.id === 'ozon-erp') {
    return {
      subtitle: '电商 ERP 全栈业务系统',
      overview: '项目面向小团队电商运营场景，组合 Vue 管理后台、Express API、Prisma/PostgreSQL、Redis/BullMQ Worker、WXT/MV3 浏览器插件和 shared types，覆盖店铺授权、商品同步、采集铺货、审批动作和审计日志。',
      modules: [
        { title: '管理后台', detail: 'apps/web 承载商品、订单、店铺、工具、设置、审批中心和任务中心等高频操作页面。' },
        { title: 'API 与数据模型', detail: 'apps/api 使用 Express + Prisma 组织业务接口、数据库模型、Ozon API 适配和鉴权逻辑。' },
        { title: 'Worker 与队列', detail: 'Redis/BullMQ 用于承接同步、采集、导入导出等长流程，避免所有动作阻塞在前端请求中。' },
        { title: '浏览器插件', detail: 'apps/extension 使用 WXT/MV3 承接平台侧采集、铺货入口和版本检查能力。' },
      ],
      implementation: [
        '使用 monorepo 组织 web、api、extension、shared，前后端共享类型和利润/平台字段计算逻辑。',
        '真实写入通过显式开关控制，并通过 PendingAction、JobQueue、审计日志沉淀可追踪链路。',
        '部署文档覆盖本地 Docker、数据库迁移、容器云运行、插件版本发布和接手检查清单。',
        '线上展示已排除真实店铺凭证、SFTP 信息、数据库连接、默认账号和生产端口等敏感内容。',
      ],
      nextSteps: ['补充脱敏后台截图', '整理 Prisma ER 图', '沉淀插件采集链路案例', '补充队列失败重试与审计说明'],
    }
  }

  if (project.id === 'pet-workspace') {
    return {
      subtitle: 'AI 宠物生成与审核管线',
      overview: 'Pet Workspace 不是单个仓库，而是 AI 宠物相关项目工作区：gamer 负责 App-facing 能力，fantasy-pet-rule 负责生成管线、Worker 编排、QA Gate 和公开 API 契约，Android 与本地 HidenCloud 替代环境负责联调验证。',
      modules: [
        { title: 'App-facing 工作区', detail: 'gamer 承载社区 API、管理审核 UI、共享包和 App 集成测试。' },
        { title: '生成服务管线', detail: 'fantasy-pet-rule 组织生成任务、服务端 QA gates、任务包、审核决策和产物索引。' },
        { title: 'Android 验证', detail: 'floating-pet-android 验证悬浮窗权限、前台服务、位置恢复、本地证明和事件哈希链。' },
        { title: '联调环境', detail: 'gamer-hidencloud-local 使用本地 Docker 替代不稳定云端服务，并代理生成 API。' },
      ],
      implementation: [
        '用任务状态和产物 manifest 管理生成过程，避免一次性出图流程无法追踪。',
        '通过 QA Gate、人审决策和发布记录，把生成资产进入 App 的路径拆成可审计阶段。',
        'Android 端验证悬浮窗、通知、前台服务和真实设备/模拟器验收流程。',
        '线上展示只保留工程结构和流程，不暴露云端 API、任务 JSON、模型缓存或候选素材中的敏感信息。',
      ],
      nextSteps: ['补充审核后台截图', '整理生成任务状态图', '补充 App API 契约说明', '增加典型生成案例复盘'],
    }
  }

  if (project.id === 'xunqiu') {
    return {
      subtitle: '移动端业务系统整理与 64 位重构',
      overview: 'Xunqiu 是一个多端历史项目集合，包含 Android、iOS、Java Spring 服务端、康复服务端、发布包和迁移文档。当前展示重点放在 64 位 Android 新客户端、服务端接口复用、移动端模块梳理和发布验收流程。',
      modules: [
        { title: 'Android 64 位客户端', detail: '新客户端复用既有服务端接口，逐步替换旧 32 位工程，并拆分为 MainActivity 与多个原生页面模块。' },
        { title: '移动端功能模块', detail: '覆盖登录、首页、动态、社区、赛程、赛事、商品、个人页和短视频播放/发布。' },
        { title: 'Java 服务端', detail: '历史服务端为 Maven WAR + Spring MVC/Security + MySQL/Redis，包含 App API、后台管理和 H5 页面。' },
        { title: '发布验收', detail: 'docs 中沉淀 Android 打包、阶段 APK、真机/模拟器验证、视频流和上传链路检查。' },
      ],
      implementation: [
        '新 Android 客户端采用更现代的 Gradle/JDK/SDK 构建链路，重点解决 64 位兼容和旧模块迁移。',
        '页面层按 screen/Home、Tweet、Community、Schedule、Championship、Goods、Profile、Video 等模块组织。',
        '接口层封装 ApiClient、AuthSession、LoginResult 等基础能力，逐步把历史功能恢复为可维护页面。',
        '线上展示只保留技术结构和功能范围，不公开服务器 IP、数据库配置、测试账号、签名文件或发布包哈希。',
      ],
      nextSteps: ['补充脱敏移动端截图', '整理服务端接口地图', '梳理 32 位到 64 位迁移故事', '沉淀发布验收案例'],
    }
  }

  if (project.id === 'game-first-tetris') {
    return {
      subtitle: 'Godot 4 Tetris 可试玩原型',
      overview: '项目基于 Godot 4，保留经典俄罗斯方块主线和 Rogue 原型实验线，已经形成主菜单、经典模式、Rogue 三选一、局间承接、暂停、Help、响应式布局和触屏输入桥接。',
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
        '公开展示只描述玩法和验证流程，不公开本地绝对工具路径或一次性 artifacts。',
      ],
      nextSteps: ['补充 Web 试玩封面', '整理触屏控件演进记录', '统一游戏项目详情页截图', '补充发布导出说明'],
    }
  }

  if (project.id === 'raiden-prototype') {
    return {
      subtitle: 'Godot 4 纵版射击展示候选版',
      overview: 'Raiden Prototype 是短局街机射击垂直切片，用来验证双关章节、火力成长、资源决策、Boss 收束、章节过场和公开 Demo 准备流程。',
      modules: [
        { title: '双关章节', detail: 'Chapter Run 串联 Stage 01、结果页、ChapterBriefing、Stage 02、ChapterEnding 和 ChapterOutro。' },
        { title: '战斗系统', detail: '包含玩家移动、自动射击、受伤、死亡、敌群编排、掉落升级和炸弹清屏。' },
        { title: 'Boss 与环境', detail: '第二关接入风暴十字封线、Boss 相位切换、overdrive 和最后安全窗口提示。' },
        { title: '发布准备', detail: 'tools 中保留展示验证、Demo 就绪检查、试玩包和公开 Demo 候选资料夹准备脚本。' },
      ],
      implementation: [
        'Godot scenes/ui 与 scenes/game 分离菜单、结果页、章节过场和战斗场景。',
        'scripts/autoload 管理全局运行状态、章节状态和结算数据。',
        'scripts/entities 与 scripts/game 拆分玩家、敌人、掉落、关卡数据、Boss、特效和环境互动。',
        '通过 headless autoplay 与章节验证命令沉淀稳定展示候选版质量。',
      ],
      nextSteps: ['补充公开 Demo 截图', '整理试玩反馈表入口', '补素材授权清单摘要', '补外部试玩说明'],
    }
  }

  if (project.id === 'game-next-spacewar' || project.id === 'intespace' || project.id === 'space-war') {
    return {
      subtitle: project.role,
      overview: `${project.title} 是 Godot 互动体验项目，重点展示主菜单、战斗流程、暂停/帮助、结果页、Web 或桌面展示构建，以及围绕玩法闭环的阶段文档。`,
      modules: [
        { title: '玩法闭环', detail: '围绕首页、战斗、升级或关卡推进、结算、重开和帮助入口组织玩家体验。' },
        { title: 'Godot 工程', detail: '保留 project.godot、scenes、scripts、assets、docs 和 export_presets 等标准工程结构。' },
        { title: '展示构建', detail: '通过 README、导出预设、验证日志或发布包说明展示项目阶段。' },
        { title: '验证记录', detail: '使用 headless、自检脚本、人工回归或阶段日志记录版本稳定性。' },
      ],
      implementation: [
        `项目技术栈以 ${project.stack.join('、')} 为主，重点关注玩法体验和可展示构建。`,
        '场景层承载菜单、战斗和结果页；脚本层拆分实体、关卡、UI 和全局状态。',
        '文档层记录项目方向、阶段进度、验证方式和下一步试玩计划。',
        '线上展示不复制本地日志全文，只沉淀可公开的玩法、结构和验证结论。',
      ],
      nextSteps: ['补充代表性截图', '整理 Web 试玩入口', '统一操作说明', '沉淀一页游戏项目复盘'],
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
        '将生成、审核、发布拆成独立阶段，便于定位失败节点，也方便面试时讲清楚工程取舍。',
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
        { title: '关卡与节奏', detail: '通过敌人、速度、得分或阶段变化制造推进感，避免只是静态 Demo。' },
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

  return (
    <div className="project-detail-page">
      <section className="project-detail-hero">
        <div className="project-detail-copy">
          <Text type="tertiary">Project Detail</Text>
          <Title heading={1}>{project.title}</Title>
          <Paragraph>{detail.overview}</Paragraph>
          <Space wrap>
            <Button theme="solid" type="primary" onClick={onBack}>返回项目系统</Button>
            {projectCase ? <Button onClick={() => onOpenCase(projectCase)}>查看对应案例</Button> : null}
            {gameSlug ? <Button onClick={() => onOpenGameDetail(project)}>进入游戏展示页</Button> : null}
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

      <section className="project-detail-section">
        <div className="project-detail-section-head">
          <span className="section-pill">Modules</span>
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
          <span className="section-pill">Implementation</span>
          <Title heading={2}>实现方式</Title>
        </div>
        <div className="project-implementation-list">
          {detail.implementation.map((item) => <p key={item}>{item}</p>)}
        </div>
      </section>

      <section className="project-detail-section">
        <div className="project-detail-section-head">
          <span className="section-pill">Roadmap</span>
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
      tagline: '太空射击方向展示版，重点呈现敌人节奏、战斗反馈和关卡推进。',
      stage: '适合作为 Spacewar 系列的主展示页，后续接入 Web 导出文件。',
      gameplay: ['飞船移动、射击与规避', '敌人波次、关卡推进和结果反馈', '主菜单、设置、帮助、暂停与结算页面', '单局总结用于展示可复盘体验'],
      systems: [
        { title: '战斗循环', detail: '输入、发射、命中、受击、得分和结算构成完整单局。' },
        { title: '页面状态', detail: '菜单、帮助、暂停、失败和结果页让项目更接近可发布版本。' },
        { title: '展示包装', detail: '通过封面、说明和项目页跳转降低试玩前的理解成本。' },
      ],
      integration: ['接入导出目录', '补充主菜单截图', '加入试玩前加载状态', '整理关卡节奏说明'],
    },
    intespace: {
      tagline: '空间探索与战斗方向的互动项目，用于展示实时操控和视觉包装能力。',
      stage: '当前作为空间互动项目沉淀，后续补齐玩法截图和在线体验。',
      gameplay: ['空间移动与方向控制', '探索、战斗反馈和场景切换', '视觉包装用于形成项目识别度', 'Web 页面承载项目说明和入口'],
      systems: [
        { title: '空间操控', detail: '重点验证角色或飞行器在空间场景中的移动反馈。' },
        { title: '战斗反馈', detail: '通过命中、受击、特效和状态变化增强可感知性。' },
        { title: '项目包装', detail: '展示页将玩法目标、截图证据和后续计划整理到同一入口。' },
      ],
      integration: ['补充运行截图', '整理核心场景', '接入 Web 试玩包', '完善项目复盘'],
    },
    'raiden-prototype': {
      tagline: '短局街机纵版射击垂直切片，适合展示关卡、Boss 和火力成长。',
      stage: '已经具备公开 Demo 准备口径，后续把试玩包接入本站。',
      gameplay: ['双关章节与章节过场', '火力成长、资源决策和敌机压迫', 'Boss 收束形成阶段目标', '短局体验便于面试和线上展示'],
      systems: [
        { title: '章节结构', detail: 'Chapter Run 将推进、过场、Boss 和结算组织成可讲述流程。' },
        { title: '火力成长', detail: '通过局内资源和火力变化提升单局反馈密度。' },
        { title: 'Demo 准备', detail: '页面侧预留试玩、截图和版本说明入口，便于逐步公开。' },
      ],
      integration: ['接入公开 Demo', '补 Boss 截图', '整理操作说明', '增加版本状态'],
    },
    'space-war': {
      tagline: '复古太空战斗项目，保留 Sector/Boss、程序化音效和独立发布文档。',
      stage: '适合作为复古横向射击项目展示，后续补试玩和发布记录。',
      gameplay: ['横向移动、射击和敌人压迫', 'Sector 推进与 Boss 收束', '程序化音效增强即时反馈', '发布文档记录项目阶段和导出方式'],
      systems: [
        { title: '战斗系统', detail: '移动、攻击、敌人、碰撞和结算形成基础战斗闭环。' },
        { title: '阶段推进', detail: 'Sector 与 Boss 把单局拆成更容易理解的展示节奏。' },
        { title: '发布材料', detail: '保留导出、说明和版本记录，方便后续部署成可试玩入口。' },
      ],
      integration: ['补充 Web 包', '整理发布日志', '增加试玩入口', '统一游戏封面'],
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
          <Text type="tertiary">Playable Showcase</Text>
          <Title heading={1}>{project.title}</Title>
          <Paragraph>{content.tagline}</Paragraph>
          <Space wrap>
            <Button theme="solid" type="primary" onClick={() => onOpenProjectDetail(project)}>查看技术详情</Button>
            <Button onClick={onBack}>返回项目系统</Button>
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
          <span className="section-pill">Gameplay</span>
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
          <span className="section-pill">Systems</span>
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
          <span className="section-pill">Next</span>
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

function CaseDetailView({ caseStudy, onBack, onOpenProject }: { caseStudy: CaseStudy; onBack: () => void; onOpenProject: (project: Project) => void }) {
  const project = projects.find((entry) => entry.id === caseStudy.projectId) ?? projects[0]
  const caseStats = [
    { label: '案例类型', value: caseStudy.eyebrow.split('/')[0].trim(), detail: caseStudy.status },
    { label: '交付成果', value: caseStudy.results.length.toString(), detail: caseStudy.outcome },
    { label: '证据材料', value: caseStudy.evidence.length.toString(), detail: '截图 / 文档 / 目录结构' },
  ]
  const workflow = caseStudy.results.map((item) => item.split('，')[0]).slice(0, 5)
  const caseImages = caseStudy.id === 'legal-rag'
    ? [
        { title: '合同审查工作台', image: '/images/projects/showcase/legal-rag-reviewed.png', detail: '按风险类型展示付款条款、交付标准、解除条款等审查结果。' },
        { title: '知识库导入', image: '/images/projects/showcase/legal-rag-knowledge.png', detail: '沉淀合同文本、条款切片和可追踪的知识库材料。' },
        { title: '引用溯源问答', image: '/images/projects/showcase/legal-rag-qa.png', detail: '回答法律问题时给出来源片段，便于解释和复核。' },
      ]
    : []

  return (
    <div className="case-detail-page">
      <section className="case-detail-hero">
        <div className="case-detail-copy">
          <Text type="tertiary">{caseStudy.eyebrow}</Text>
          <Title heading={1}>{caseStudy.title}</Title>
          <Paragraph>{caseStudy.summary}</Paragraph>
          <Space wrap>
            <Button theme="solid" type="primary" onClick={() => onOpenProject(project)}>查看项目详情</Button>
            <Button onClick={onBack}>返回案例中心</Button>
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
          <span className="section-pill">Challenge / Solution</span>
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
          <span className="section-pill">Workflow</span>
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
          <span className="section-pill">Architecture</span>
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
          <span className="section-pill">Evidence</span>
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
                <Paragraph>该证据来自项目目录中的公开文档、源码结构或运行材料，线上展示已脱敏处理。</Paragraph>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="case-detail-section case-talking-section">
        <div>
          <span className="section-pill">Interview</span>
          <Title heading={2}>面试讲解口径</Title>
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
        <Text type="tertiary">Blog</Text>
        <Title heading={1}>博客系统</Title>
        <Paragraph>参考 Vercel Blog 的精选文章和最新文章结构，用统一的浅色/暗色风格记录项目复盘、学习路线和面试准备。</Paragraph>
      </section>

      <section className="blog-magazine">
        <div className="blog-magazine-head">
          <div>
            <span className="section-pill">Featured / Latest</span>
            <Title heading={2}>项目复盘与学习记录</Title>
          </div>
          <div className="blog-topic-pills" aria-label="博客栏目">
            <span>项目复盘</span>
            <span>AI 应用学习</span>
            <span>全栈工程记录</span>
            <span>面试知识点</span>
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
            <Text type="tertiary">Article Index</Text>
            <strong>展示系统</strong>
            <span>项目目录</span>
            <span>案例矩阵</span>
            <span>学习记录</span>
          </aside>
        </article>

        <div className="blog-latest-head">
          <Title heading={3}>Latest Notes</Title>
          <Text type="tertiary">后续每天可以继续把知识点追加到这里。</Text>
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
          <Text type="tertiary">Article Index</Text>
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
        <Button theme="solid" type="primary" onClick={onOpenProjectDetail}>查看项目详情页</Button>
        {projectCase ? <Button theme="light" type="primary" onClick={() => onOpenCase(projectCase)}>查看案例详情</Button> : null}
        {gameSlug ? <Button theme="light" type="primary" onClick={onOpenGameDetail}>进入游戏展示页</Button> : null}
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



