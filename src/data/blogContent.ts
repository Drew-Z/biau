import type { BlogPost } from './blogShared'

export { blogColumnMeta, blogColumnOrder } from './blogShared'

const postLoaders: Record<string, () => Promise<{ default: BlogPost }>> = {
  'legal-rag-review': () => import('./blog-posts/legal-rag-review'),
  'legal-rag-production-upgrade-plan': () => import('./blog-posts/legal-rag-production-upgrade-plan'),
  'ozon-erp-architecture': () => import('./blog-posts/ozon-erp-architecture'),
  'pet-workspace-pipeline': () => import('./blog-posts/pet-workspace-pipeline'),
  'xunqiu-android64-rebuild': () => import('./blog-posts/xunqiu-android64-rebuild'),
  'game-showcase-standard': () => import('./blog-posts/game-showcase-standard'),
  'content-modeling-project-site': () => import('./blog-posts/content-modeling-project-site'),
  'public-content-governance': () => import('./blog-posts/public-content-governance'),
  'static-site-release-verification': () => import('./blog-posts/static-site-release-verification'),
  'blog-content-system-build-log': () => import('./blog-posts/blog-content-system-build-log'),
}

export function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  const loader = postLoaders[slug]
  if (!loader) return Promise.resolve(undefined)
  return loader().then((module) => module.default)
}

export function getLoadableBlogPostSlugs() {
  return Object.keys(postLoaders)
}
