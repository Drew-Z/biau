import {
  ANCHOR_LEARNING_DEMO_URL,
  BIAU_PLAYLAB_SITE_URL,
  CHATUS_SITE_URL,
  LEGAL_RAG_SITE_URL,
  OZON_ERP_ENTRY_URL,
  PET_APP_SHOWCASE_URL,
  XUNQIU_SITE_URL,
} from './siteLinks'
import type { ProductId } from './productRegistry'
import { getProjectLinkCopy, projectInterfaceCopy } from './projectInterfaceCopy'
import type { SiteLanguage } from '../utils/siteLanguage'

export const PUBLIC_PROJECT_IDS = [
  'legal-rag',
  'chatus',
  'pet-workspace',
  'ozon-erp',
  'biau-playlab',
  'anchor-learning',
  'blog-semi',
  'xunqiu',
  'canvas',
] as const

export type PublicProjectId = (typeof PUBLIC_PROJECT_IDS)[number]
export type ProductMaturity = 'case-study' | 'mvp' | 'active' | 'maintained'
export type ProductAvailability = 'online' | 'degraded' | 'offline' | 'unchecked' | 'planned'
export type ProductAccess = 'public' | 'login-gated' | 'case-only'
export type ProjectLinkIntent = 'entry' | 'documentation' | 'repository' | 'evidence' | 'status'
export type ProjectCtaMode = 'direct' | 'caution' | 'status-only'

interface ProjectPublicationBase {
  projectId: PublicProjectId
  productId: ProductId
  maturity: ProductMaturity
  access: ProductAccess
  owner: string
  statusHref: string
  externalHref?: string
}

export interface AvailableProjectPublication extends ProjectPublicationBase {
  availability: 'online' | 'degraded'
  evidenceLabel: string
  verifiedAt: string
  unavailableReason?: never
}

export interface UnavailableProjectPublication extends ProjectPublicationBase {
  availability: 'offline' | 'unchecked' | 'planned'
  evidenceLabel?: string
  verifiedAt?: string
  unavailableReason: string
}

export type ProjectPublication = AvailableProjectPublication | UnavailableProjectPublication

export interface ProjectCtaProjection {
  mode: ProjectCtaMode
  enabled: boolean
  label: string
  compactLabel: string
  labelLanguage: SiteLanguage
  href: string
  statusHref: string
  explanation?: string
  explanationLanguage?: SiteLanguage
}

export interface ProjectLinkCandidate {
  label: string
  href: string
  type: 'internal' | 'external'
  intent?: ProjectLinkIntent
}

export interface PublishedProjectLink extends ProjectLinkCandidate {
  intent: ProjectLinkIntent
  labelLanguage: SiteLanguage
  explanation?: string
  explanationLanguage?: SiteLanguage
}

export const projectPublications = {
  'legal-rag': {
    projectId: 'legal-rag',
    productId: 'legal-rag',
    maturity: 'mvp',
    availability: 'unchecked',
    access: 'login-gated',
    owner: 'Legal RAG',
    statusHref: '/status/legal-rag',
    externalHref: LEGAL_RAG_SITE_URL,
    unavailableReason: '受控工作台入口需要重新完成公开访问与登录边界验收。',
  },
  chatus: {
    projectId: 'chatus',
    productId: 'chatus',
    maturity: 'active',
    availability: 'unchecked',
    access: 'login-gated',
    owner: 'Chatus',
    statusHref: '/status/chatus',
    externalHref: CHATUS_SITE_URL,
    unavailableReason: '邀请制入口尚未在本次产品审计中重新验证。',
  },
  'pet-workspace': {
    projectId: 'pet-workspace',
    productId: 'pet-workspace',
    maturity: 'mvp',
    availability: 'online',
    access: 'public',
    owner: 'Pet workspace',
    statusHref: '/status/pet-gamer',
    externalHref: PET_APP_SHOWCASE_URL,
    evidenceLabel: '2026-07-09 synthetic 验证展示页与 4/4 截图；APK 下载仍独立受 gate 约束',
    verifiedAt: '2026-07-09T02:23:53.694Z',
  },
  'ozon-erp': {
    projectId: 'ozon-erp',
    productId: 'ozon-erp',
    maturity: 'active',
    availability: 'unchecked',
    access: 'login-gated',
    owner: 'Ozon ERP',
    statusHref: '/status/ozon-erp',
    externalHref: OZON_ERP_ENTRY_URL,
    unavailableReason: '公开入口当前重定向到托管停机页，登录与核心业务流需要在服务恢复后重新验收。',
  },
  'biau-playlab': {
    projectId: 'biau-playlab',
    productId: 'biau-playlab',
    maturity: 'maintained',
    availability: 'online',
    access: 'public',
    owner: 'BIAU Playlab',
    statusHref: '/status/biau-playlab',
    externalHref: BIAU_PLAYLAB_SITE_URL,
    evidenceLabel: '2026-07-09 synthetic 验证 3/3 页面、6/6 试玩页与 36/36 资源',
    verifiedAt: '2026-07-09T02:23:54.344Z',
  },
  'anchor-learning': {
    projectId: 'anchor-learning',
    productId: 'anchor-learning',
    maturity: 'mvp',
    availability: 'online',
    access: 'public',
    owner: 'Anchor Learning',
    statusHref: '/status/anchor-learning',
    externalHref: ANCHOR_LEARNING_DEMO_URL,
    evidenceLabel: '2026-07-27 生产 Playwright 桌面、平板与手机验收',
    verifiedAt: '2026-07-27T00:00:00.000Z',
  },
  'blog-semi': {
    projectId: 'blog-semi',
    productId: 'biau-port',
    maturity: 'active',
    availability: 'unchecked',
    access: 'case-only',
    owner: 'BIAU Port',
    statusHref: '/status/blog-semi',
    unavailableReason: '主站案例不需要外部入口；生产可用性由状态页单独表达。',
  },
  xunqiu: {
    projectId: 'xunqiu',
    productId: 'xunqiu',
    maturity: 'mvp',
    availability: 'unchecked',
    access: 'public',
    owner: 'Xunqiu',
    statusHref: '/status/xunqiu',
    externalHref: XUNQIU_SITE_URL,
    unavailableReason: '展示页、后端兼容接口与 APK gate 需要分别复核。',
  },
  canvas: {
    projectId: 'canvas',
    productId: 'canvas',
    maturity: 'mvp',
    availability: 'planned',
    access: 'case-only',
    owner: 'BIAU Port',
    statusHref: '/status',
    unavailableReason: 'Cloudflare Pages 部署主体已存在，仍等待公开域名、维护边界、隐私规则、截图与验收证据。',
  },
} as const satisfies Record<PublicProjectId, ProjectPublication>

export function getProjectPublication(projectId: PublicProjectId) {
  return projectPublications[projectId]
}

export function isPublicProjectId(projectId: string): projectId is PublicProjectId {
  return (PUBLIC_PROJECT_IDS as readonly string[]).includes(projectId)
}

export function findProjectPublication(projectId: string) {
  return isPublicProjectId(projectId) ? getProjectPublication(projectId) : undefined
}

export function getProjectCta(publication: ProjectPublication, language: SiteLanguage = 'zh'): ProjectCtaProjection {
  const copy = projectInterfaceCopy[language].cta
  const statusOnly = (explanation: string, explanationLanguage: SiteLanguage = language): ProjectCtaProjection => ({
    mode: 'status-only',
    enabled: false,
    label: publication.availability === 'planned' ? copy.plan : copy.status,
    compactLabel: publication.availability === 'planned' ? copy.compact.plan : copy.compact.status,
    labelLanguage: language,
    href: publication.availability === 'planned' ? `/projects/${publication.projectId}` : publication.statusHref,
    statusHref: publication.statusHref,
    explanation,
    explanationLanguage,
  })

  if (publication.availability === 'planned' || publication.availability === 'unchecked' || publication.availability === 'offline') {
    return statusOnly(publication.unavailableReason, 'zh')
  }

  if (publication.access === 'case-only') {
    return statusOnly(copy.caseOnly)
  }

  if (!publication.externalHref) {
    return statusOnly(copy.missingEntry)
  }

  const gated = publication.access === 'login-gated'
  if (publication.availability === 'degraded') {
    return {
      mode: 'caution',
      enabled: true,
      label: gated ? copy.controlled : copy.caution,
      compactLabel: copy.compact.caution,
      labelLanguage: language,
      href: publication.externalHref,
      statusHref: publication.statusHref,
      explanation: copy.degraded,
      explanationLanguage: language,
    }
  }

  return {
    mode: 'direct',
    enabled: true,
    label: gated ? copy.controlled : copy.open,
    compactLabel: gated ? copy.compact.controlled : copy.compact.open,
    labelLanguage: language,
    href: publication.externalHref,
    statusHref: publication.statusHref,
    explanation: gated ? copy.gated : undefined,
    explanationLanguage: gated ? language : undefined,
  }
}

export function getPublishedProjectLinks(
  publication: ProjectPublication | undefined,
  links: readonly ProjectLinkCandidate[],
  language: SiteLanguage = 'zh',
): PublishedProjectLink[] {
  const localizeLink = (link: ProjectLinkCandidate): PublishedProjectLink => ({
    ...link,
    ...getProjectLinkCopy(link.label, language),
    intent: link.intent ?? 'evidence',
  })
  if (!publication) {
    return links.map(localizeLink)
  }

  const cta = getProjectCta(publication, language)
  let statusLinkAdded = false

  return links.flatMap((link): PublishedProjectLink[] => {
    const intent = link.intent ?? 'evidence'
    if (intent !== 'entry' || cta.enabled) return [localizeLink(link)]
    if (statusLinkAdded) return []

    statusLinkAdded = true
    return [
      {
        label: cta.label,
        labelLanguage: cta.labelLanguage,
        href: cta.href,
        type: 'internal',
        intent: 'status',
        explanation: cta.explanation,
        explanationLanguage: cta.explanationLanguage,
      },
    ]
  })
}
