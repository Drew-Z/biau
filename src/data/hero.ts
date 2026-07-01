import { OZON_ERP_ENTRY_URL } from './siteLinks'

export type SiteLanguage = 'zh' | 'en'

export type CardAccent = 'signal' | 'commerce' | 'image' | 'preview'

export interface HeroProject {
  id: string
  title: string
  description: string
  poetry: string
  action: string
  accent: CardAccent
  detailLink: string
  externalLink?: string
}

export interface HeroPoem {
  main: string
  sub?: string
}

export const heroContent = {
  title: { zh: '泊岸', en: 'BIAU PORT' },
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
      title: '法律智能机器人',
      description: '让合同审查回到原文，让结论可被验证',
      poetry: '《在语义的迷宫中寻找条款》',
      action: 'OPEN',
      accent: 'signal',
      detailLink: '/projects/legal-rag',
      externalLink: 'https://legal-rag-web.onrender.com',
    },
    {
      id: 'pet-workspace',
      title: 'AI 宠物生成管线',
      description: '从生成、审核到发布，让不确定性进入确定流程',
      poetry: '《当算法编织出虚拟生命》',
      action: 'GENERATE',
      accent: 'commerce',
      detailLink: '/projects/pet-workspace',
    },
    {
      id: 'ozon-erp',
      title: '电商业务系统',
      description: '后台、API、队列、插件，串起跨境运营全链路',
      poetry: '《在商品流转中织网》',
      action: 'OPEN',
      accent: 'image',
      detailLink: '/projects/ozon-erp',
      externalLink: OZON_ERP_ENTRY_URL,
    },
    {
      id: 'biau-playlab',
      title: 'Biau Playlab 游戏站',
      description: '六个 Godot 原型、Web 试玩、开发日志与系统拆解内容站',
      poetry: '《把可玩的想法停靠成港》',
      action: 'PLAY',
      accent: 'preview',
      detailLink: '/projects/biau-playlab',
      externalLink: 'https://games.playlab.eu.cc/',
    },
    {
      id: 'xunqiu',
      title: '寻球移动端系统',
      description: 'Android 64 位客户端、现代后端、R2 上传与 Render 部署链路',
      poetry: '《让球场邀约重新连成网络》',
      action: 'VIEW',
      accent: 'commerce',
      detailLink: '/projects/xunqiu',
      externalLink: 'https://xunqiu.playlab.eu.cc/',
    },
    {
      id: 'blog-semi',
      title: '当前主站与知识库',
      description: '把首页、项目、知识文章和自动部署组织成持续更新的站点',
      poetry: '《在文字中凝固思考的痕迹》',
      action: 'READ',
      accent: 'signal',
      detailLink: '/projects/blog-semi',
    },
  ] as HeroProject[],
}
