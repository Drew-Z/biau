import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const distDir = path.resolve('dist')
const html = await readFile(path.join(distDir, 'index.html'), 'utf8')
const headers = await readFile(path.resolve('public/_headers'), 'utf8')

function requireAsset(pattern, label) {
  const match = html.match(pattern)
  if (!match?.[1]) throw new Error(`dist/index.html 缺少 ${label} 入口资源`)
  return match[1].replace(/^\//, '')
}

const cssAsset = requireAsset(/<link[^>]+href="\/?(assets\/index-[^"]+\.css)"/i, 'CSS')
const scriptAsset = requireAsset(/<script[^>]+src="\/?(assets\/index-[^"]+\.js)"/i, 'JavaScript')
const cssBytes = (await stat(path.join(distDir, cssAsset))).size
const scriptBytes = (await stat(path.join(distDir, scriptAsset))).size

const budgets = {
  cssBytes: 240_000,
  scriptBytes: 430_000,
}

const externalStylesheets = [...html.matchAll(/<link\b[^>]*>/gi)]
  .map((match) => match[0])
  .filter((tag) => /\brel="stylesheet"/i.test(tag))
  .map((tag) => tag.match(/\bhref="(https?:\/\/[^"]+)"/i)?.[1])
  .filter(Boolean)

if (externalStylesheets.length > 0) {
  throw new Error(`首屏不能包含阻塞式第三方样式：${externalStylesheets.join(', ')}`)
}
if (cssBytes > budgets.cssBytes) {
  throw new Error(`首屏 CSS ${cssBytes} bytes 超过预算 ${budgets.cssBytes} bytes`)
}
if (scriptBytes > budgets.scriptBytes) {
  throw new Error(`首屏 JavaScript ${scriptBytes} bytes 超过预算 ${budgets.scriptBytes} bytes`)
}
if (!/\/assets\/\*[\s\S]*max-age=31536000[\s\S]*immutable/i.test(headers)) {
  throw new Error('public/_headers 必须为哈希 assets 配置一年 immutable 缓存')
}

console.log('# Build performance budget')
console.log(`- css: ${cssBytes} / ${budgets.cssBytes} bytes`)
console.log(`- js: ${scriptBytes} / ${budgets.scriptBytes} bytes`)
console.log('- external blocking stylesheets: 0')
console.log('- immutable asset cache: configured')
