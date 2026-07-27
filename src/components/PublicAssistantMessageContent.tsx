import { Children, Fragment, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import Markdown, { type MarkdownToJSX } from 'markdown-to-jsx/react'

interface PublicAssistantMessageContentProps {
  content: string
}

interface AssistantCodeBlockProps {
  code: string
  language: string
}

function readTextContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(readTextContent).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return readTextContent(node.props.children)
  return ''
}

function readCodeBlock(children: ReactNode) {
  const child = Children.toArray(children)[0]
  if (!isValidElement<{ children?: ReactNode; className?: string }>(child)) {
    return { code: readTextContent(children).replace(/\n$/u, ''), language: '' }
  }
  const language = child.props.className?.match(/(?:^|\s)language-([a-z0-9+#.-]{1,24})(?:\s|$)/iu)?.[1] ?? ''
  return {
    code: readTextContent(child.props.children).replace(/\n$/u, ''),
    language,
  }
}

function AssistantCodeBlock({ code, language }: AssistantCodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const resetTimerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
  }, [])

  const copyCode = async () => {
    if (!navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = window.setTimeout(() => setCopied(false), 1_800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="public-assistant-markdown__code-block">
      <div className="public-assistant-markdown__code-header">
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={() => void copyCode()}
          aria-label={copied ? '已复制代码' : '复制代码'}
          title={copied ? '已复制' : '复制代码'}
        >
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        </button>
      </div>
      <pre tabIndex={0}><code>{code}</code></pre>
    </div>
  )
}

const markdownOptions: MarkdownToJSX.Options = {
  disableAutoLink: true,
  disableParsingRawHTML: true,
  ignoreHTMLBlocks: true,
  forceWrapper: true,
  wrapper: Fragment,
  overrides: {
    a: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    img: ({ alt }: { alt?: string }) => <span>{alt ?? ''}</span>,
    input: () => null,
    pre: ({ children }: { children?: ReactNode }) => {
    const block = readCodeBlock(children)
    return <AssistantCodeBlock code={block.code} language={block.language} />
    },
    table: ({ children }: { children?: ReactNode }) => (
      <div className="public-assistant-markdown__table-scroll" role="region" aria-label="回答中的表格" tabIndex={0}>
        <table>{children}</table>
      </div>
    ),
  },
}

export function PublicAssistantMessageContent({ content }: PublicAssistantMessageContentProps) {
  return (
    <div className="public-assistant-markdown">
      <Markdown options={markdownOptions}>{content}</Markdown>
    </div>
  )
}
