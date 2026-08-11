export const PRODUCT_IDS = [
  'biau-port',
  'public-assistant',
  'ai-daily',
  'canvas',
  'legal-rag',
  'chatus',
  'pet-workspace',
  'ozon-erp',
  'xunqiu',
  'anchor-learning',
  'enterprise-document-agent',
  'biau-playlab',
] as const

export type ProductId = (typeof PRODUCT_IDS)[number]
export type ProductFamily = 'master' | 'assistant' | 'content' | 'tool' | 'business' | 'mobile' | 'interactive'
export type ProductProjection = 'public' | 'planned' | 'internal' | 'reference'

export interface ProductIdentity {
  id: ProductId
  name: {
    zh: string
    en: string
  }
  descriptor: {
    zh: string
    en?: string
  }
  family: ProductFamily
  attribution: 'by BIAU Port / 泊岸'
  aliases: readonly string[]
  publicProjection: ProductProjection
}

export const productRegistry = {
  'biau-port': {
    id: 'biau-port',
    name: { zh: '泊岸', en: 'BIAU Port' },
    descriptor: { zh: '产品、知识与创作港口', en: 'Product, knowledge and creation port' },
    family: 'master',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['BIAU PORT', 'blog-semi'],
    publicProjection: 'public',
  },
  'public-assistant': {
    id: 'public-assistant',
    name: { zh: '知航', en: 'BIAU Beacon' },
    descriptor: { zh: '网站智能研究助手', en: 'Public research assistant' },
    family: 'assistant',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['Public Assistant', '公开助手'],
    publicProjection: 'public',
  },
  'ai-daily': {
    id: 'ai-daily',
    name: { zh: '潮讯', en: 'TideBrief' },
    descriptor: { zh: '经审核的 AI 日报', en: 'Reviewed AI daily brief' },
    family: 'content',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['AI Daily', 'AI 日报'],
    publicProjection: 'public',
  },
  canvas: {
    id: 'canvas',
    name: { zh: '画帆', en: 'BIAU Canvas' },
    descriptor: { zh: '图像托管与分享工具', en: 'Image hosting and sharing tool' },
    family: 'tool',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['Canvas', 'cloudflare-imgbed', '图床'],
    publicProjection: 'planned',
  },
  'legal-rag': {
    id: 'legal-rag',
    name: { zh: '律航', en: 'LexBeacon' },
    descriptor: { zh: '法律 RAG 与合同审查工作台', en: 'Legal RAG and contract review workspace' },
    family: 'assistant',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['Legal RAG', '法律智能机器人'],
    publicProjection: 'public',
  },
  chatus: {
    id: 'chatus',
    name: { zh: '泊语', en: 'HarborTalk' },
    descriptor: { zh: '邀请制私人 AI 工作台', en: 'Invite-only private AI workspace' },
    family: 'assistant',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['Chatus'],
    publicProjection: 'public',
  },
  'pet-workspace': {
    id: 'pet-workspace',
    name: { zh: '帆灵', en: 'SailSprite' },
    descriptor: { zh: 'AI 桌宠社区与生成管线', en: 'AI desktop companion community and pipeline' },
    family: 'mobile',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['Pet', 'AI 桌宠社区与生成管线'],
    publicProjection: 'public',
  },
  'ozon-erp': {
    id: 'ozon-erp',
    name: { zh: '商舱', en: 'OpsDeck' },
    descriptor: { zh: '跨境电商运营系统', en: 'Cross-border commerce operations system' },
    family: 'business',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['Ozon ERP', '电商业务系统'],
    publicProjection: 'public',
  },
  xunqiu: {
    id: 'xunqiu',
    name: { zh: '寻球', en: 'BallTrail' },
    descriptor: { zh: '球场邀约与移动端系统', en: 'Sports meetup mobile system' },
    family: 'mobile',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['Xunqiu'],
    publicProjection: 'public',
  },
  'anchor-learning': {
    id: 'anchor-learning',
    name: { zh: '锚学', en: 'Anchor Learning' },
    descriptor: { zh: '来源可溯源学习助手', en: 'Source-grounded learning assistant' },
    family: 'content',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['Anchor'],
    publicProjection: 'public',
  },
  'enterprise-document-agent': {
    id: 'enterprise-document-agent',
    name: { zh: '文航', en: 'DocBeacon' },
    descriptor: { zh: '企业文档智能体', en: 'Enterprise document agent' },
    family: 'assistant',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['Enterprise Document Agent'],
    publicProjection: 'planned',
  },
  'biau-playlab': {
    id: 'biau-playlab',
    name: { zh: '游湾', en: 'BIAU Playlab' },
    descriptor: { zh: '游戏作品集与互动实验', en: 'Game portfolio and interactive lab' },
    family: 'interactive',
    attribution: 'by BIAU Port / 泊岸',
    aliases: ['Playlab', '游戏作品集'],
    publicProjection: 'public',
  },
} as const satisfies Record<ProductId, ProductIdentity>

export function getProductIdentity(productId: ProductId) {
  return productRegistry[productId]
}

export function formatProductName(productId: ProductId) {
  const identity = getProductIdentity(productId)
  return `${identity.name.zh} ${identity.name.en}`
}

export function formatProductTitle(productId: ProductId, technicalDescriptor?: string) {
  const name = formatProductName(productId)
  return technicalDescriptor ? `${name}｜${technicalDescriptor}` : name
}
