import assert from 'node:assert/strict'
import { getPublicBlogPosts, type CuratedBlogPost } from '../src/data/blogCuration'
import {
  getBlogListHref,
  MAX_BLOG_QUERY_LENGTH,
  parseBlogDiscoverySearch,
  resolveBlogDiscovery,
  serializeBlogDiscoveryState,
} from '../src/utils/blogDiscovery'

const seed = getPublicBlogPosts()[0]
assert.ok(seed, 'the public catalog must provide a fixture template')
const fixtures: CuratedBlogPost[] = Array.from({ length: 25 }, (_, index) => ({
  ...seed,
  slug: `discovery-fixture-${index}`,
  title: index < 13 ? `fixture-only ${index}` : `other entry ${index}`,
  column: index < 13 ? 'project-notes' : 'knowledge',
}))
let checks = 0

function check(name: string, run: () => void) {
  try {
    run()
    checks += 1
  } catch (error) {
    throw new Error(`Blog discovery contract: ${name}`, { cause: error })
  }
}

check('stable defaults and unknown parameters', () => {
  assert.deepEqual(parseBlogDiscoverySearch(''), { column: 'all', query: '', page: 1 })
  const state = parseBlogDiscoverySearch('?column=unknown&returnTo=https://example.invalid&page=0')
  assert.equal(getBlogListHref(state), '/blog')
})

check('duplicate parameters select the first value', () => {
  const state = parseBlogDiscoverySearch('?column=resources&column=knowledge&q=first&q=second&page=2&page=3')
  assert.deepEqual(state, { column: 'resources', query: 'first', page: 2 })
  assert.equal(serializeBlogDiscoveryState(state), '?column=resources&q=first&page=2')
})

check('Unicode and separators round-trip without losing typing spaces', () => {
  const state = { column: 'all' as const, query: 'RAG 公开 + & / 🧭 ', page: 1 }
  assert.deepEqual(parseBlogDiscoverySearch(serializeBlogDiscoveryState(state)), state)
  const longQuery = '🧭'.repeat(160)
  assert.equal(Array.from(parseBlogDiscoverySearch(`?q=${encodeURIComponent(longQuery)}`).query).length, MAX_BLOG_QUERY_LENGTH)
  assert.equal(parseBlogDiscoverySearch(serializeBlogDiscoveryState({ ...state, query: longQuery })).query, '🧭'.repeat(120))
})

check('invalid page values cannot create empty out-of-range views', () => {
  for (const page of ['', '0', '-1', '1.5', '1e2', 'Infinity', 'NaN', '01', '9007199254740992']) {
    assert.equal(parseBlogDiscoverySearch(`?page=${page}`).page, 1, page)
  }
})

check('real multi-page slices and upper bounds', () => {
  const second = resolveBlogDiscovery('?page=2', fixtures)
  assert.equal(second.totalPages, 3)
  assert.equal(second.visiblePosts.length, 12)
  assert.equal(second.visiblePosts[0].slug, 'discovery-fixture-12')
  const last = resolveBlogDiscovery('?page=999', fixtures)
  assert.equal(last.state.page, 3)
  assert.deepEqual(last.visiblePosts.map((post) => post.slug), ['discovery-fixture-24'])
  assert.equal(getBlogListHref(last.state), '/blog?page=3')
})

check('filtering drives pagination before the page is clamped', () => {
  const result = resolveBlogDiscovery('?column=project-notes&q=fixture-only&page=3', fixtures)
  assert.equal(result.filteredPosts.length, 13)
  assert.equal(result.totalPages, 2)
  assert.equal(result.state.page, 2)
  assert.deepEqual(result.visiblePosts.map((post) => post.slug), ['discovery-fixture-12'])
})

check('empty results keep page one and preserve search context', () => {
  const result = resolveBlogDiscovery('?column=resources&q=no-result&page=9', fixtures)
  assert.equal(result.totalPages, 1)
  assert.equal(result.state.page, 1)
  assert.deepEqual(result.visiblePosts, [])
  assert.equal(getBlogListHref(result.state), '/blog?column=resources&q=no-result')
})

check('canonicalization is idempotent and returns only to the blog', () => {
  for (const search of [
    '?page=2&q=fixture-only&column=project-notes&unused=1',
    '?column=all&page=1',
    '?q=%E0%A4%A&returnTo=//example.invalid',
    '?q=https%3A%2F%2Fexample.invalid&page=999',
  ]) {
    const first = serializeBlogDiscoveryState(resolveBlogDiscovery(search, fixtures).state)
    const second = serializeBlogDiscoveryState(resolveBlogDiscovery(first, fixtures).state)
    assert.equal(second, first)
    assert.equal(new URL(getBlogListHref(resolveBlogDiscovery(search, fixtures).state), 'https://fixture.invalid').pathname, '/blog')
  }
})

console.log(`Blog discovery contract passed: ${checks} groups with 25 isolated fixture posts.`)
