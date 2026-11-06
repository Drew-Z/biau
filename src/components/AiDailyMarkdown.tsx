import { createElement, type Attributes, type HTMLAttributes } from 'react'
import Markdown, { type MarkdownToJSX } from 'markdown-to-jsx/react'
import { dailyPublicUrl } from '../data/aiDailyEditions'

const allowed = new Set(['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'del', 'blockquote', 'code', 'pre', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary'])
const anchorId = /^[\p{L}\p{N}_-]{1,180}$/u
const options: MarkdownToJSX.Options = {
  disableAutoLink: true,
  evalUnserializableExpressions: false,
  forceWrapper: true,
  wrapper: 'div',
  sanitizer: (value) => value.startsWith('#') && anchorId.test(value.slice(1)) ? value : dailyPublicUrl(value),
  createElement(tag, raw, ...children) {
    // The parser handles Markdown/HTML syntax; only these elements and props reach React.
    if (typeof tag !== 'string' || !allowed.has(tag)) return null
    const props = raw as Attributes & Record<string, unknown>
    const safe: Attributes & HTMLAttributes<HTMLElement> & { href?: string; target?: string; rel?: string } = { key: props?.key }
    if (typeof props?.id === 'string' && anchorId.test(props.id)) safe.id = `daily-${props.id}`
    if (tag === 'a') {
      const href = typeof props?.href === 'string' ? props.href : ''
      if (href.startsWith('#') && anchorId.test(href.slice(1))) safe.href = `#daily-${href.slice(1)}`
      else {
        safe.href = dailyPublicUrl(href) ?? undefined
        if (safe.href) { safe.target = '_blank'; safe.rel = 'noopener noreferrer' }
      }
      if (!safe.href) return createElement('span', { key: safe.key, id: safe.id }, ...children)
    }
    // Ignore all authored style, handlers, className, src, and innerHTML props.
    return createElement(tag === 'h1' ? 'h2' : tag, safe, ...children)
  },
}

export function AiDailyMarkdown({ markdown }: { markdown: string }) {
  return createElement('div', { className: 'daily-edition-markdown', lang: 'zh-CN' }, createElement(Markdown, { options, children: markdown }))
}
