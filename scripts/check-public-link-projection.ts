import assert from 'node:assert/strict'
import { collectTargets } from './check-public-links'

const targets = collectTargets()
const urls = new Set(targets.map((target) => target.url))

assert.equal(urls.size, targets.length, 'public link target URLs must be unique')

for (const hiddenEntry of [
  'https://legal-rag-web.onrender.com/',
  'https://chatus.ciallobill.qzz.io/',
  'https://erp.ciallobill.qzz.io/#/login?from=biau-port',
  'https://xunqiu.playlab.eu.cc/',
]) {
  assert.equal(urls.has(hiddenEntry), false, `${hiddenEntry} is hidden by the public projection`)
}

for (const statusHref of ['/status/legal-rag', '/status/chatus', '/status/ozon-erp', '/status/xunqiu']) {
  assert.equal(urls.has(new URL(statusHref, 'https://biau.playlab.eu.cc').toString()), true, `${statusHref} remains observable`)
}

for (const visibleLink of [
  'https://legal-rag-api-9bki.onrender.com/api/health',
  'https://xunqiu.playlab.eu.cc/docs.html',
  'https://github.com/Drew-Z/anchor',
  'https://games.playlab.eu.cc/games/first-tetris/',
  'https://play.playlab.eu.cc/first-tetris/index.html',
]) {
  assert.equal(urls.has(visibleLink), true, `${visibleLink} remains observable`)
}

console.log(`Public link projection passed: ${targets.length} visible targets with status, evidence, documentation, repository, and game-entry coverage.`)
