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
  title: { zh: '笔岸实验室', en: 'BIAU LABS' },
  // Rotating hero couplets — mirrors the original site's cycling hero title.
  poems: [
    { main: '思绪如河奔涌', sub: '终在笔岸成形' },
    { main: '我看见未来', sub: '它向我微笑' },
    { main: '不知去向者', sub: '须重返来处' },
    { main: '让混沌的念头', sub: '在笔尖落定' },
    { main: '于字里行间', sub: '打捞沉默的光' },
  ] as HeroPoem[],
  // Backwards-compatible alias for the lead couplet.
  poetry: {
    main: '思绪如河奔涌',
    sub: '终在笔岸成形',
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
      id: 'godot-games',
      title: '互动体验原型',
      description: '从俄罗斯方块到太空射击，让玩法循环可试玩',
      poetry: '《像素之间的梦想与规则》',
      action: 'PLAY',
      accent: 'preview',
      link: '/projects?group=games',
    },
    {
      id: 'blog-system',
      title: '知识沉淀平台',
      description: '从 RAG 到 Agent，从业务系统到游戏开发',
      poetry: '《在文字中凝固思考的痕迹》',
      action: 'READ',
      accent: 'signal',
      link: '/blogs',
    },
  ] as HeroProject[],
}
