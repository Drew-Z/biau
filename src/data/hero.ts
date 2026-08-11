import {
  ANCHOR_LEARNING_DEMO_URL,
  BIAU_PLAYLAB_SITE_URL,
  CHATUS_SITE_URL,
  LEGAL_RAG_SITE_URL,
  OZON_ERP_ENTRY_URL,
  PET_APP_SHOWCASE_URL,
  XUNQIU_SITE_URL,
} from './siteLinks'
import type { PublicProjectId } from './projectPublication'
import { formatProductTitle, getProductIdentity } from './productRegistry'

export type SiteLanguage = 'zh' | 'en'

export type CardAccent = 'signal' | 'commerce' | 'image' | 'preview'

export interface HeroProject {
  id: PublicProjectId
  title: string
  description: string
  poetry: string
  action: string
  actionLabel?: string
  accent: CardAccent
  detailLink: string
  externalLink?: string
}

export interface HeroPoem {
  main: string
  sub?: string
}

const masterSite = getProductIdentity('biau-port')

export const heroContent = {
  title: { zh: masterSite.name.zh, en: masterSite.name.en.toUpperCase() },
  // Rotating hero couplets — mirrors the original site's cycling hero title.
  poems: [
    { main: '思绪如河奔涌', sub: '终在泊岸成形' },
    { main: '我看见未来', sub: '它向我微笑' },
    { main: '不知去向者', sub: '须重返来处' },
    { main: '让混沌的念头', sub: '在笔尖落定' },
    { main: '于字里行间', sub: '打捞沉默的光' },
  ] as HeroPoem[],
  // Backwards-compatible alias for the lead couplet.
  poetry: {
    main: '思绪如河奔涌',
    sub: '终在泊岸成形',
  },
  projects: [
    {
      id: 'legal-rag',
      title: formatProductTitle('legal-rag', 'Legal RAG 与合同审查'),
      description: '让合同审查回到原文，让结论可被验证',
      poetry: '《在语义的迷宫中寻找条款》',
      action: 'OPEN',
      accent: 'signal',
      detailLink: '/projects/legal-rag',
      externalLink: LEGAL_RAG_SITE_URL,
    },
    {
      id: 'chatus',
      title: formatProductTitle('chatus', 'Chatus 私人 AI 工作台'),
      description: '邀请制成员空间，以会话 Agent、长期记忆和多模型协调支撑持续工作',
      poetry: '《让每段上下文都有停泊之处》',
      action: 'INVITE',
      actionLabel: '打开 Chatus 邀请制工作台',
      accent: 'signal',
      detailLink: '/projects/chatus',
      externalLink: CHATUS_SITE_URL,
    },
    {
      id: 'anchor-learning',
      title: formatProductTitle('anchor-learning', '来源可溯源学习'),
      description: '把技术文档变成有来源、可校验、可继续的练习路径',
      poetry: '《把答案重新系回原文》',
      action: 'DEMO',
      accent: 'preview',
      detailLink: '/projects/anchor-learning',
      externalLink: ANCHOR_LEARNING_DEMO_URL,
    },
    {
      id: 'pet-workspace',
      title: formatProductTitle('pet-workspace', 'AI 桌宠生成管线'),
      description: '从生成、审核到发布，让不确定性进入确定流程',
      poetry: '《当算法编织出虚拟生命》',
      action: 'APP',
      accent: 'commerce',
      detailLink: '/projects/pet-workspace',
      externalLink: PET_APP_SHOWCASE_URL,
    },
    {
      id: 'ozon-erp',
      title: formatProductTitle('ozon-erp', 'Ozon ERP'),
      description: '后台、API、队列、插件，串起跨境运营全链路',
      poetry: '《在商品流转中织网》',
      action: 'OPEN',
      accent: 'image',
      detailLink: '/projects/ozon-erp',
      externalLink: OZON_ERP_ENTRY_URL,
    },
    {
      id: 'biau-playlab',
      title: formatProductTitle('biau-playlab', '游戏站'),
      description: '六个 Godot 原型、Web 试玩、开发日志与系统拆解内容站',
      poetry: '《把可玩的想法停靠成港》',
      action: 'PLAY',
      accent: 'preview',
      detailLink: '/projects/biau-playlab',
      externalLink: `${BIAU_PLAYLAB_SITE_URL}/`,
    },
    {
      id: 'xunqiu',
      title: formatProductTitle('xunqiu', '移动端系统'),
      description: 'Android 64 位客户端、现代后端、R2 上传与 Render 部署链路',
      poetry: '《让球场邀约重新连成网络》',
      action: 'VIEW',
      accent: 'commerce',
      detailLink: '/projects/xunqiu',
      externalLink: `${XUNQIU_SITE_URL}/`,
    },
    {
      id: 'blog-semi',
      title: formatProductTitle('biau-port', '当前主站与知识库'),
      description: '把首页、项目、知识文章和自动部署组织成持续更新的站点',
      poetry: '《在文字中凝固思考的痕迹》',
      action: 'READ',
      accent: 'signal',
      detailLink: '/projects/blog-semi',
    },
  ] as HeroProject[],
}
