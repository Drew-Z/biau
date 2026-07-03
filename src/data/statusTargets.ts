import { heroContent } from './hero'
import { MAIN_SITE_URL } from './siteLinks'

export type SiteStatusTargetKind = 'workbench' | 'business' | 'showcase' | 'mobile'
export type SiteStatusExpectation = 'public-entry' | 'login-gated' | 'static-site'
export type ReliabilityLayer = 'entry' | 'synthetic' | 'metrics' | 'observability'
export type ReliabilityStatus = 'online' | 'degraded' | 'offline' | 'unchecked' | 'planned'

export const reliabilityStatusOrder = ['online', 'degraded', 'offline', 'unchecked', 'planned'] as const satisfies ReliabilityStatus[]

export interface SiteStatusTarget {
  id: string
  projectId: string
  projectTitle: string
  label: string
  url: string
  kind: SiteStatusTargetKind
  expectation: SiteStatusExpectation
  description: string
  note: string
}

export interface ReliabilityCheck {
  id: string
  layer: ReliabilityLayer
  label: string
  status: ReliabilityStatus
  description: string
  evidence: string
  cadence: string
  ownerHint: string
  relatedTargetId?: string
}

export interface ReliabilityProject {
  id: string
  title: string
  category: 'main-site' | 'ai-workbench' | 'business-system' | 'mobile-app' | 'interactive'
  summary: string
  checks: ReliabilityCheck[]
  gates: string[]
  nextActions: string[]
}

export type ReliabilityStatusCounts = Record<ReliabilityStatus, number> & { total: number }

const targetMeta: Record<
  string,
  Pick<SiteStatusTarget, 'label' | 'kind' | 'expectation' | 'description' | 'note'>
> = {
  'legal-rag': {
    label: 'Legal RAG 在线工作台',
    kind: 'workbench',
    expectation: 'login-gated',
    description: '法律 RAG 与合同审查演示工作台入口。',
    note: '工作台有登录门禁；入口可达不代表已开放公开 demo 凭据，未显示凭据时仍是受控演示。',
  },
  'ozon-erp': {
    label: 'Ozon ERP 演示入口',
    kind: 'business',
    expectation: 'login-gated',
    description: '电商业务系统登录与演示入口。',
    note: '生产注册与演示账号属于人工 gate；状态页只检查公开入口是否响应。',
  },
  'biau-playlab': {
    label: 'BIAU Playlab 游戏站',
    kind: 'showcase',
    expectation: 'static-site',
    description: 'Godot 游戏项目展示、详情与 Web 试玩入口。',
    note: '静态站可用不代表每个 Web 试玩资源都已完成运行检查。',
  },
  xunqiu: {
    label: '寻球产品展示页',
    kind: 'mobile',
    expectation: 'static-site',
    description: '寻球 Android 64 位迁移展示页、文档和阶段包入口。',
    note: '阶段 APK 是否公开发布仍需人工确认；这里只检查展示页入口。',
  },
  'pet-workspace': {
    label: 'Pet App 展示页',
    kind: 'mobile',
    expectation: 'static-site',
    description: 'AI 桌宠社区 App 截图、下载状态和 APK 发布门禁说明。',
    note: '入口可达代表展示页和截图可访问；正式 APK 下载仍需签名包、校验摘要和人工确认。',
  },
}

export const SITE_STATUS_BASE_URL = MAIN_SITE_URL

export const siteStatusTargets: SiteStatusTarget[] = heroContent.projects
  .filter((project) => Boolean(project.externalLink))
  .map((project) => {
    const meta = targetMeta[project.id]
    return {
      id: `${project.id}-entry`,
      projectId: project.id,
      projectTitle: project.title,
      label: meta?.label ?? project.title,
      url: project.externalLink ?? '',
      kind: meta?.kind ?? 'showcase',
      expectation: meta?.expectation ?? 'public-entry',
      description: meta?.description ?? project.description,
      note: meta?.note ?? '公开项目入口，状态页只展示最近一次可达性检查。',
    }
  })

export const reliabilityProjects: ReliabilityProject[] = [
  {
    id: 'blog-semi',
    title: 'BIAU Port 主站',
    category: 'main-site',
    summary: '主站负责项目展示、公开助手、博客内容和状态页本身，是跨项目可靠性视图的聚合入口。',
    checks: [
      {
        id: 'blog-semi-public-routes',
        layer: 'entry',
        label: '核心公开路由',
        status: 'unchecked',
        description: '首页、项目集、博客、公开助手、站点地图和 robots 的 HTML/SEO 检查。',
        evidence: '`npm.cmd run main-site:synthetic` 会生成公开状态 JSON；`site:monitor` 可用于更细的页面与链接巡检。',
        cadence: '发布前或每日定时',
        ownerHint: '主站脚本',
      },
      {
        id: 'blog-semi-public-assistant',
        layer: 'synthetic',
        label: '公开助手问答',
        status: 'planned',
        description: '用一个公开项目问题验证同域 `/api/health` 与 `/api/chat/public` 是否返回模型或 fallback 状态。',
        evidence: '`main-site:synthetic` 会检查公开助手 API 是否真实接入、是否返回 citation，以及当前是模型增强还是公开知识 fallback。',
        cadence: '发布前 + 模型配置变更后',
        ownerHint: 'assistant API',
      },
      {
        id: 'blog-semi-metrics',
        layer: 'metrics',
        label: 'Assistant API 指标',
        status: 'planned',
        description: '默认关闭的 `/metrics` 可输出低敏 HTTP 计数和延迟直方图，供 Prometheus 采集。',
        evidence: '后台观测规范要求 `METRICS_ENABLED` 明确开启后才暴露指标。',
        cadence: '生产 gate 后持续采集',
        ownerHint: 'Prometheus/Grafana',
      },
    ],
    gates: ['开启生产模型、生产 metrics scrape 或第三方告警前需要人工确认。'],
    nextActions: ['把 `main-site:synthetic` 接入定时任务或内部监控。', 'Cloudflare Pages Functions 部署后配置 `ASSISTANT_MODEL_*` 并复查公开助手状态。'],
  },
  {
    id: 'legal-rag',
    title: 'Legal RAG 法律机器人',
    category: 'ai-workbench',
    summary: '重点不是只看工作台能否打开，而是法律问答、citation、合同审查和质量面板是否能完成演示闭环。',
    checks: [
      {
        id: 'legal-rag-entry',
        layer: 'entry',
        label: '在线工作台入口',
        status: 'unchecked',
        description: '检查公开 Legal RAG 工作台入口是否响应。',
        evidence: '由 L0 入口检测自动合并。',
        cadence: '每次生成状态页',
        ownerHint: '公开入口',
        relatedTargetId: 'legal-rag-entry',
      },
      {
        id: 'legal-rag-health',
        layer: 'synthetic',
        label: 'API health',
        status: 'planned',
        description: '请求 `/api/health`，确认 API、向量库 readiness 和冷启动状态。',
        evidence: '仓库文档和 demo 脚本记录了 health 作为演示前置检查。',
        cadence: '演示前 + 定时检查',
        ownerHint: 'Legal RAG API',
      },
      {
        id: 'legal-rag-qa',
        layer: 'synthetic',
        label: '法律问答 + citation',
        status: 'planned',
        description: '用公开安全数据集提问一次，断言 answer、citations、retrieved chunks 和 diagnostics 可用。',
        evidence: 'Legal RAG 仓库包含公开安全数据集、RAG eval 和演示 smoke 路径。',
        cadence: '模型或数据集变更后',
        ownerHint: 'RAG synthetic check',
      },
      {
        id: 'legal-rag-contract-review',
        layer: 'synthetic',
        label: '合同审查',
        status: 'planned',
        description: '提交脱敏样本合同，断言风险条目、引用和 human review 标记存在。',
        evidence: '仓库包含 contract-review eval set 和 sample contract。',
        cadence: '发布前 + 合同审查规则变更后',
        ownerHint: 'Review synthetic check',
      },
      {
        id: 'legal-rag-observability',
        layer: 'observability',
        label: '模型与质量看板',
        status: 'planned',
        description: '后续可把模型错误、RAG eval、合同审查 eval 和 API 指标送入内部看板。',
        evidence: '当前仅记录接入方向，不公开私有模型渠道或后台地址。',
        cadence: '人工 gate 后',
        ownerHint: 'Grafana/LLM tracing',
      },
    ],
    gates: [
      '公开 demo 凭据必须可回收且经人工确认；真实后台管理员密码不能写入文章、项目页或状态页。',
      'Web 登录页只有在部署环境配置 VITE_PUBLIC_DEMO_EMAIL / VITE_PUBLIC_DEMO_PASSWORD 后才会展示公开演示凭据。',
    ],
    nextActions: [
      '配置 `LEGAL_RAG_API_BASE_URL` 后启用 health live check。',
      '准备可回收 demo 凭据后，同步 API 侧登录校验密码和 Web 侧公开演示提示，再启用问答、合同审查和质量面板 synthetic check。',
    ],
  },
  {
    id: 'ozon-erp',
    title: 'Ozon ERP',
    category: 'business-system',
    summary: 'ERP 的可靠性要覆盖登录/注册、角色边界、店铺配置、插件连接和商品同步，而不只是登录页响应。',
    checks: [
      {
        id: 'ozon-erp-entry',
        layer: 'entry',
        label: '演示入口',
        status: 'unchecked',
        description: '检查 ERP 登录/演示入口是否响应。',
        evidence: '由 L0 入口检测自动合并。',
        cadence: '每次生成状态页',
        ownerHint: '公开入口',
        relatedTargetId: 'ozon-erp-entry',
      },
      {
        id: 'ozon-erp-health',
        layer: 'synthetic',
        label: 'API health',
        status: 'planned',
        description: '请求 `/api/health` 并确认运行版本、数据库 readiness 和部署状态。',
        evidence: 'ERP 文档包含 `/api/health` 部署检查路径。',
        cadence: '部署后 + 每日',
        ownerHint: 'ERP API',
      },
      {
        id: 'ozon-erp-auth',
        layer: 'synthetic',
        label: '登录 / 注册策略',
        status: 'planned',
        description: '验证登录可用、生产注册开关符合当前策略、新用户默认角色安全。',
        evidence: 'ERP 仓库已有注册路由、注册测试和生产注册配置说明。',
        cadence: '鉴权改动后',
        ownerHint: 'Auth synthetic check',
      },
      {
        id: 'ozon-erp-plugin-sync',
        layer: 'synthetic',
        label: '插件与商品同步',
        status: 'planned',
        description: '后续用脱敏 fixture 验证插件登录状态、商品导入和同步任务路径。',
        evidence: '仓库包含 extension、shops、products、market metrics 和 smoke 脚本痕迹。',
        cadence: '插件发布前',
        ownerHint: 'ERP extension/API',
      },
      {
        id: 'ozon-erp-metrics',
        layer: 'metrics',
        label: '业务 API 指标',
        status: 'planned',
        description: '后续暴露低敏 HTTP 指标，避免把店铺、SKU、用户或订单细节放入 metrics label。',
        evidence: '当前主站只记录接入要求，不修改 ERP 生产配置。',
        cadence: '生产 gate 后持续采集',
        ownerHint: 'Prometheus/Grafana',
      },
    ],
    gates: ['真实生产自助注册已获方向性批准，但上线配置、滥用防护和公开演示账号仍需独立 gate。'],
    nextActions: [
      '配置 `ERP_SYNTHETIC_API_BASE_URL` 后运行 `npm.cmd run erp:synthetic` 生成 health 与注册策略检查。',
      '准备可回收 demo 凭据后配置 `ERP_SYNTHETIC_USERNAME` / `ERP_SYNTHETIC_PASSWORD`，再启用登录 smoke。',
      '主站项目详情同步实际注册策略和可演示路径。',
    ],
  },
  {
    id: 'xunqiu',
    title: '寻球',
    category: 'mobile-app',
    summary: '寻球需要同时看静态展示页、后端健康、兼容 API、阶段 APK 说明和移动端下载 gate。',
    checks: [
      {
        id: 'xunqiu-entry',
        layer: 'entry',
        label: '产品展示页',
        status: 'unchecked',
        description: '检查寻球展示页、文档和阶段包入口是否响应。',
        evidence: '由 L0 入口检测自动合并。',
        cadence: '每次生成状态页',
        ownerHint: '公开入口',
        relatedTargetId: 'xunqiu-entry',
      },
      {
        id: 'xunqiu-backend-health',
        layer: 'synthetic',
        label: '后端 health',
        status: 'planned',
        description: '请求 Spring Actuator health，确认后端返回 `UP`。',
        evidence: '后端仓库包含 `/free_kicker/actuator/health`、Render healthCheckPath 和 smoke-test 脚本。',
        cadence: '部署后 + 每日',
        ownerHint: 'xunqiu-backend-modern',
      },
      {
        id: 'xunqiu-compat-api',
        layer: 'synthetic',
        label: '兼容 API smoke',
        status: 'planned',
        description: '检查动态、视频、球队和球场等兼容 API 返回安全成功结构。',
        evidence: '后端 smoke-test 和 MockMvc compatibility tests 已覆盖这些接口类型。',
        cadence: 'API 变更后',
        ownerHint: 'Compatibility API',
      },
      {
        id: 'xunqiu-apk-gate',
        layer: 'observability',
        label: 'APK 发布 gate',
        status: 'planned',
        description: '公开下载前检查签名包、版本说明、病毒扫描和回滚说明。',
        evidence: '当前状态页只展示 gate，不公开未经批准的下载链接。',
        cadence: '发布候选生成后',
        ownerHint: 'Release checklist',
      },
    ],
    gates: ['后端真实 URL、阶段 APK 下载和生产部署变更都需要人工确认。'],
    nextActions: [
      '配置 `XUNQIU_SYNTHETIC_API_BASE_URL` 后运行 `npm.cmd run xunqiu:synthetic` 生成后端 health 与兼容 API 检查。',
      'APK 下载公开前补签名、版本、扫描和回滚清单，不在 synthetic 脚本里暴露下载地址。',
    ],
  },
  {
    id: 'pet-gamer',
    title: 'Pet / Gamer',
    category: 'mobile-app',
    summary: '当前适合展示工作进展与发布清单，正式 APK、社区 API 和账号体系还需要后续版本接入。',
    checks: [
      {
        id: 'pet-showcase',
        layer: 'entry',
        label: 'App 展示页',
        status: 'planned',
        description: '检查 Pet App 静态展示页、截图和当前工作说明是否可访问。',
        evidence: '主站已有后续接入任务；未确认公开签名包前不放真实下载。',
        cadence: '展示页更新后',
        ownerHint: 'Pet showcase',
        relatedTargetId: 'pet-workspace-entry',
      },
      {
        id: 'pet-apk-gate',
        layer: 'observability',
        label: 'APK 发布 gate',
        status: 'planned',
        description: '检查正式 release 构建、签名、校验摘要、下载链接、回滚说明和隐私说明后再公开。',
        evidence: '当前只记录 gate；已定位内部 debug 构建，但不声明 APK 已公开。',
        cadence: '发布候选生成后',
        ownerHint: 'Release checklist',
      },
      {
        id: 'pet-community-api',
        layer: 'metrics',
        label: '社区 API 指标',
        status: 'planned',
        description: '后续若有后端服务，再补 health、auth smoke 和低敏 `/metrics`。',
        evidence: '当前主站只保留未来接入位。',
        cadence: '后端服务上线后',
        ownerHint: 'Pet API',
      },
    ],
    gates: ['真实 Pet APK 发布、后端部署和账号体系公开演示都需要人工确认。'],
    nextActions: ['将 debug 构建记录转成正式 release candidate 清单。', '有正式签名包、校验摘要和版本说明后补下载状态检查。'],
  },
  {
    id: 'biau-playlab',
    title: 'BIAU Playlab / Game',
    category: 'interactive',
    summary: '游戏项目以静态站、游戏详情、Web 试玩资源、截图和移动端提示为主要可靠性边界。',
    checks: [
      {
        id: 'biau-playlab-entry',
        layer: 'entry',
        label: '游戏站入口',
        status: 'unchecked',
        description: '检查 Playlab 静态站入口是否响应。',
        evidence: '由 L0 入口检测自动合并。',
        cadence: '每次生成状态页',
        ownerHint: '公开入口',
        relatedTargetId: 'biau-playlab-entry',
      },
      {
        id: 'biau-playlab-web-builds',
        layer: 'synthetic',
        label: 'Web 试玩资源',
        status: 'planned',
        description: '检查每个公开试玩项目的 HTML、WASM/PCK 或导出资源是否可加载。',
        evidence: '游戏仓库包含 Godot 项目、截图捕获脚本和 Playlab 资源同步痕迹。',
        cadence: '游戏导出后',
        ownerHint: 'Playlab static check',
      },
      {
        id: 'biau-playlab-mobile-hints',
        layer: 'synthetic',
        label: '移动端提示',
        status: 'planned',
        description: '检查移动端访问时是否清楚提示试玩限制、控制方式或推荐设备。',
        evidence: '主站详情页已持续优化移动端提示和项目入口。',
        cadence: 'UI 改动后',
        ownerHint: 'UI regression',
      },
    ],
    gates: ['是否上线新的试玩构建或公开测试版本需要人工确认。'],
    nextActions: ['为 Playlab 增加静态资源 manifest 检查。', '把关键游戏详情纳入 UI 回归截图。'],
  },
]

export function getReliabilityAnchorId(projectId: string) {
  return `reliability-${projectId}`
}

export function getReliabilityProjectStatusCounts(project: Pick<ReliabilityProject, 'checks'>): ReliabilityStatusCounts {
  const counts = reliabilityStatusOrder.reduce(
    (summary, status) => {
      summary[status] = 0
      return summary
    },
    { total: 0 } as ReliabilityStatusCounts,
  )

  for (const check of project.checks) {
    counts.total += 1
    counts[check.status] += 1
  }

  return counts
}

export function findReliabilityProjectForTarget(
  target: Pick<SiteStatusTarget, 'id' | 'projectId'>,
  projects: ReliabilityProject[] = reliabilityProjects,
) {
  return (
    projects.find((project) =>
      project.checks.some((check) => check.relatedTargetId === target.id || check.id === target.id),
    ) ?? projects.find((project) => project.id === target.projectId)
  )
}
