import {
  ANCHOR_LEARNING_DEMO_URL,
  BIAU_PLAYLAB_SITE_URL,
  CHATUS_SITE_URL,
  LEGAL_RAG_SITE_URL,
  OZON_ERP_ENTRY_URL,
  PET_APP_SHOWCASE_URL,
  ROLEPLAY_SITE_URL,
  XUNQIU_SITE_URL,
} from './siteLinks'
import type { PublicProjectId } from './projectPublication'
import { formatProductTitle, getProductIdentity } from './productRegistry'

export type { SiteLanguage } from '../utils/siteLanguage'

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
      description: '邀请制成员空间，以会话 Agent、能力分配和显式记忆支撑持续工作',
      poetry: '《让每段上下文都有停泊之处》',
      action: 'INVITE',
      actionLabel: '打开 Chatus 邀请制工作台',
      accent: 'signal',
      detailLink: '/projects/chatus',
      externalLink: CHATUS_SITE_URL,
    },
    {
      id: 'roleplay-demo',
      title: formatProductTitle('roleplay-demo', '游客式多角色聊天'),
      description: '从角色库进入独立故事页，在服务端密钥隔离下体验 GLM 多角色对话',
      poetry: '《让每个故事都有自己的入口》',
      action: 'CHAT',
      accent: 'signal',
      detailLink: '/projects/roleplay-demo',
      externalLink: ROLEPLAY_SITE_URL,
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
      description: '连接插件采集、后台草稿、任务执行与审计，说明跨境运营的写入边界',
      poetry: '《在商品流转中织网》',
      action: 'OPEN',
      accent: 'image',
      detailLink: '/projects/ozon-erp',
      externalLink: OZON_ERP_ENTRY_URL,
    },
    {
      id: 'biau-playlab',
      title: formatProductTitle('biau-playlab', '游戏站'),
      description: '六个不同阶段的 Godot 项目，集中展示玩法、Web 入口与开发记录',
      poetry: '《把可玩的想法停靠成港》',
      action: 'PLAY',
      accent: 'preview',
      detailLink: '/projects/biau-playlab',
      externalLink: `${BIAU_PLAYLAB_SITE_URL}/`,
    },
    {
      id: 'xunqiu',
      title: formatProductTitle('xunqiu', '移动端系统'),
      description: '分层呈现 Android 64 位迁移、现代后端兼容与静态展示',
      poetry: '《让球场邀约重新连成网络》',
      action: 'VIEW',
      accent: 'commerce',
      detailLink: '/projects/xunqiu',
      externalLink: `${XUNQIU_SITE_URL}/`,
    },
    {
      id: 'blog-semi',
      title: formatProductTitle('biau-port', '当前主站与知识库'),
      description: '三组项目目录、内容搜索、阅读返回与三主题中英文界面',
      poetry: '《在文字中凝固思考的痕迹》',
      action: 'READ',
      accent: 'signal',
      detailLink: '/projects/blog-semi',
    },
  ] as HeroProject[],
}
