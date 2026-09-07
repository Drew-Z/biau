import assert from 'node:assert/strict'
import { getProjectListHref, parseProjectGroupSearch, serializeProjectGroupSearch } from '../src/utils/projectDiscovery'

let checks = 0
function check(name: string, run: () => void) {
  try {
    run()
    checks += 1
  } catch (error) {
    throw new Error(`Project discovery contract: ${name}`, { cause: error })
  }
}

check('default links stay compatible', () => {
  assert.equal(parseProjectGroupSearch(''), 'ai')
  assert.equal(parseProjectGroupSearch('?group='), 'ai')
  assert.equal(getProjectListHref('ai'), '/projects')
})

check('all public groups round-trip', () => {
  for (const [group, expected] of [['ai', ''], ['fullstack', '?group=fullstack'], ['tool', '?group=tool']] as const) {
    assert.equal(serializeProjectGroupSearch(group), expected)
    assert.equal(parseProjectGroupSearch(expected), group)
  }
})

check('invalid groups cannot hide the catalog', () => {
  for (const value of ['unknown', 'TOOLS', 'ai ', '../tool', '__proto__', 'constructor', '工具', 'x'.repeat(2048)]) {
    assert.equal(parseProjectGroupSearch(`?group=${encodeURIComponent(value)}`), 'ai', value)
  }
})

check('duplicates use only the first value', () => {
  assert.equal(parseProjectGroupSearch('?group=tool&group=ai'), 'tool')
  assert.equal(parseProjectGroupSearch('?group=unknown&group=tool'), 'ai')
  assert.equal(parseProjectGroupSearch('?group=&group=fullstack'), 'ai')
})

check('encoded input canonicalizes idempotently', () => {
  assert.equal(parseProjectGroupSearch('?group=%74%6F%6F%6C'), 'tool')
  for (const search of ['?group=ai&unused=1', '?group=tool&group=fullstack', '?group=%74%6F%6F%6C', '?group=%E0%A4%A']) {
    const first = serializeProjectGroupSearch(parseProjectGroupSearch(search))
    assert.equal(serializeProjectGroupSearch(parseProjectGroupSearch(first)), first)
  }
})

check('return addresses stay inside the project directory', () => {
  for (const search of ['?group=tool&returnTo=//example.invalid', '?returnTo=https://example.invalid', '?group=https://example.invalid', '?group=fullstack&token=fixture-only']) {
    const href = getProjectListHref(parseProjectGroupSearch(search))
    const url = new URL(href, 'https://fixture.invalid')
    assert.equal(url.origin, 'https://fixture.invalid')
    assert.equal(url.pathname, '/projects')
    assert.ok(!href.includes('returnTo') && !href.includes('token'))
  }
})

console.log(`Project discovery contract passed: ${checks} groups.`)
