export type SiteLanguage = 'zh' | 'en'

export type CardAccent = 'signal' | 'commerce' | 'image' | 'preview'

export interface HeroProject {
  id: string
  title: string
  description: string
  poetry: string
  action: string
  accent: CardAccent
  link: string
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
      action: 'READ',
      accent: 'signal',
      link: '/projects/legal-rag',
    },
    {
      id: 'pet-workspace',
      title: 'AI 宠物生成管线',
      description: '从生成、审核到发布，让不确定性进入确定流程',
      poetry: '《当算法编织出虚拟生命》',
      action: 'GENERATE',
      accent: 'commerce',
      link: '/projects/pet-workspace',
    },
    {
      id: 'ozon-erp',
      title: '电商业务系统',
      description: '后台、API、队列、插件，串起跨境运营全链路',
      poetry: '《在商品流转中织网》',
      action: 'MANAGE',
      accent: 'image',
      link: '/projects/ozon-erp',
    },
    {
      id: 'game-first-tetris',
      title: '俄罗斯方块原型',
      description: '经典模式、肉鸽强化与触屏输入，收束成可试玩循环',
      poetry: '《像素之间的梦想与规则》',
      action: 'PLAY',
      accent: 'preview',
      link: '/projects/game-first-tetris',
    },
    {
      id: 'blog-semi',
      title: '当前主站与知识库',
      description: '把首页、项目、知识文章和自动部署组织成持续更新的站点',
      poetry: '《在文字中凝固思考的痕迹》',
      action: 'READ',
      accent: 'signal',
      link: '/projects/blog-semi',
    },
  ] as HeroProject[],
}
