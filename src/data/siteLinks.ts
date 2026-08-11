const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')
const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined

export const MAIN_SITE_URL = 'https://biau.playlab.eu.cc'
export const LEGAL_RAG_SITE_URL = 'https://legal-rag-web.onrender.com'
export const LEGAL_RAG_HEALTH_URL = 'https://legal-rag-api-9bki.onrender.com/api/health'
export const CHATUS_SITE_URL = 'https://chatus.ciallobill.qzz.io'
export const ANCHOR_LEARNING_SITE_URL = 'https://anchor.playlab.eu.cc'
export const ANCHOR_LEARNING_DEMO_URL = `${ANCHOR_LEARNING_SITE_URL}/app/`
export const PET_APP_SHOWCASE_URL = `${MAIN_SITE_URL}/pet-app-showcase/`
export const PET_APP_SHOWCASE_PATH = '/pet-app-showcase/'
export const BIAU_PLAYLAB_SITE_URL = 'https://games.playlab.eu.cc'
export const BIAU_PLAYLAB_PLAY_URL = 'https://play.playlab.eu.cc'
export const XUNQIU_SITE_URL = 'https://xunqiu.playlab.eu.cc'
export const XUNQIU_DOCS_URL = `${XUNQIU_SITE_URL}/docs.html`
export const XUNQIU_BACKEND_DOCS_URL = `${XUNQIU_SITE_URL}/docs/technical/validation-and-deploy.md`
export const OZON_ERP_SITE_URL = trimTrailingSlash(
  viteEnv?.VITE_OZON_ERP_URL?.trim() || 'https://erp.ciallobill.qzz.io',
)
export const OZON_ERP_ENTRY_URL = `${OZON_ERP_SITE_URL}/#/login?from=biau-port`
