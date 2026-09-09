import type { ProjectCategory, ProjectStatus } from './portfolio'
import type { SiteLanguage } from '../utils/siteLanguage'

interface ProjectInterfaceCopy {
  cta: {
    plan: string
    status: string
    controlled: string
    caution: string
    open: string
    compact: Record<'plan' | 'status' | 'controlled' | 'caution' | 'open', string>
    caseOnly: string
    missingEntry: string
    degraded: string
    gated: string
  }
  carousel: {
    title: string
    description: string
    count: (count: number) => string
    browse: string
    allProjects: string
  }
}

export const projectInterfaceCopy: Record<SiteLanguage, ProjectInterfaceCopy> = {
  zh: {
    cta: {
      plan: '查看项目规划',
      status: '查看当前状态',
      controlled: '打开受控入口',
      caution: '谨慎访问',
      open: '打开项目',
      compact: { plan: '规划', status: '状态', controlled: '受控', caution: '谨慎', open: '打开' },
      caseOnly: '该项目仅展示案例内容，不提供直接体验入口。',
      missingEntry: '项目入口尚未配置。',
      degraded: '部分能力可能不可用，请先查看当前状态。',
      gated: '该入口需要登录、邀请或受控演示凭据。',
    },
    carousel: {
      title: 'IN PORT / 当前泊岸',
      description: '项目状态与访问边界',
      count: (count) => `${String(count).padStart(2, '0')} 项`,
      browse: '浏览 IN PORT 项目',
      allProjects: '查看全部项目',
    },
  },
  en: {
    cta: {
      plan: 'View project plan',
      status: 'View current status',
      controlled: 'Open controlled access',
      caution: 'Visit with caution',
      open: 'Open project',
      compact: { plan: 'Plan', status: 'Status', controlled: 'Access', caution: 'Caution', open: 'Open' },
      caseOnly: 'This project is presented as a case study, with no direct demo.',
      missingEntry: 'A project entry has not been configured.',
      degraded: 'Some features may be unavailable. Check the current status first.',
      gated: 'This entry requires sign-in, an invitation, or controlled demo credentials.',
    },
    carousel: {
      title: 'IN PORT',
      description: 'Project status and access',
      count: (count) => `${String(count).padStart(2, '0')} ${count === 1 ? 'project' : 'projects'}`,
      browse: 'Browse IN PORT projects',
      allProjects: 'View all projects',
    },
  },
}

export const projectCategoryLabelsEn: Record<ProjectCategory, string> = {
  ai: 'AI applications',
  business: 'Business systems',
  interactive: 'Interactive experiences',
  mobile: 'Mobile apps',
  platform: 'Blog platform',
  tool: 'Tools',
}

export const projectStatusLabelsEn: Record<ProjectStatus, string> = {
  main: 'Featured',
  live: 'Page exists',
  mvp: 'MVP',
  ongoing: 'In progress',
}

const projectLinkLabelsEn = new Map<string, string>([
  ['API Health', 'API Health'],
  ['App 展示页', 'App showcase'],
  ['GitHub', 'GitHub'],
  ['Web 试玩', 'Play on the web'],
  ['产品展示页', 'Product showcase'],
  ['公开内容治理', 'Public content governance'],
  ['内容模型文章', 'Content model article'],
  ['后端验证文档', 'Backend verification docs'],
  ['回到首页', 'Back to home'],
  ['在线工作台', 'Online workspace'],
  ['官网', 'Website'],
  ['展示标准文章', 'Showcase standards article'],
  ['展示页源码', 'Showcase source code'],
  ['打开 App 展示页', 'Open app showcase'],
  ['打开产品展示页', 'Open product showcase'],
  ['打开工作台', 'Open workspace'],
  ['打开浏览器 Demo', 'Open browser demo'],
  ['打开邀请制入口', 'Open invitation-only entry'],
  ['技术文档', 'Technical documentation'],
  ['构建手记', 'Build log'],
  ['架构文章', 'Architecture article'],
  ['查看 Next Spacewar 案例', 'View Next Spacewar case study'],
  ['查看 Raiden 案例', 'View Raiden case study'],
  ['查看 Raiden 项目', 'View Raiden project'],
  ['查看 Spacewar II 案例', 'View Spacewar II case study'],
  ['查看 Tetris 案例', 'View Tetris case study'],
  ['查看 intespace 案例', 'View intespace case study'],
  ['查看 space-war 案例', 'View space-war case study'],
  ['查看游戏详情', 'View game details'],
  ['浏览器 Demo', 'Browser demo'],
  ['游戏站', 'Game site'],
  ['游戏站详情', 'Game site details'],
  ['源码仓库', 'Source repository'],
  ['生产化路线', 'Production roadmap'],
  ['生成管线文章', 'Generation pipeline article'],
  ['访问 ERP', 'Visit ERP'],
  ['迁移复盘文章', 'Migration review article'],
  ['进入游戏站', 'Open game site'],
  ['邀请制工作台', 'Invitation-only workspace'],
  ['静态站验证', 'Static site verification'],
  ['项目复盘', 'Project review'],
  ['查看来源', 'View source'],
])

export function getProjectLinkCopy(label: string, language: SiteLanguage): { label: string; labelLanguage: SiteLanguage } {
  const translated = language === 'en' ? projectLinkLabelsEn.get(label) : undefined
  return { label: translated ?? label, labelLanguage: translated === undefined ? 'zh' : 'en' }
}
