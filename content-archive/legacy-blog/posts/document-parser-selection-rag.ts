import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "document-parser-selection-rag",
  "title": "RAG 文档解析器选型：PDF、DOCX、OCR 与 Markdown 如何接入",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "RAG 的第一步不是 embedding，而是把业务文档变成可检索、可引用的文本结构。本文讨论不同格式的解析路线、结构保留和失败处理。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "文档解析",
    "格式结构保留",
    "解析失败处理"
  ],
  "scenarios": [
    "合同文档入库",
    "企业知识库构建",
    "扫描件和表格处理"
  ],
  "practiceChecklist": [
    "按文件类型选择 parser，不要统一按纯文本处理",
    "保留页码、标题、条款号、表格、图片位置和 quote",
    "解析失败要记录原因、parserVersion 和 retryable，并支持人工复核"
  ],
  "sections": [
    {
      "title": "概念：解析器决定 RAG 入库质量",
      "body": "RAG 的第一步不是 embedding，而是把业务文档变成可检索、可引用的文本和结构。PDF、DOCX、Markdown、HTML、图片扫描件的结构差异很大，如果统一当成纯文本处理，标题、页码、表格、条款号和图片上下文很容易丢失。"
    },
    {
      "title": "流程：先识别格式，再保留结构",
      "body": "入库时应先识别文件类型、是否扫描件、是否包含表格和图片，再选择 parser。解析结果最好统一成结构化中间格式，包含 text、page、section、headingPath、table、bbox、quote 和 parserVersion，后续 chunk、citation 和评估都基于这个中间层。"
    },
    {
      "title": "工程取舍：PDF、DOCX、Markdown 各有边界",
      "body": "文本型 PDF 要处理换行、列顺序、页眉页脚和表格；扫描 PDF 需要 OCR；DOCX 更容易保留段落、标题、列表和表格，但要处理修订痕迹和嵌套结构；Markdown/HTML 天然带标题层级，适合技术文档和知识库入库。"
    },
    {
      "title": "OCR：解析结果要带置信度",
      "body": "OCR 不是把图片转成文本就结束。扫描件会出现错字、漏字、表格错位和数字识别错误。解析结果最好保留 confidence、page、bbox 和原图引用。低置信度片段可以进入人工复核，避免模型基于不可靠文本给出确定结论。"
    },
    {
      "title": "项目例子：合同文档优先保留条款结构",
      "body": "对于合同文档，条款编号、标题层级、页码、表格和原文位置应该优先保留。后续 chunk 才能按条款切分，citation 才能回到原文。解析器选型不是为了拿到最多文字，而是为了保留能支撑审查和引用的证据结构。"
    },
    {
      "title": "失败处理：解析失败也是业务状态",
      "body": "解析失败不能只在服务端报错。系统应该记录 failedStage、errorType、fileHash、parserVersion 和 retryable。前端可以展示“解析失败、需要重新上传、需要 OCR 或人工处理”，队列也能根据错误类型决定是否重试。"
    }
  ],
  "takeaways": [
    "文档解析要按格式保留结构，不能只追求拿到纯文本。",
    "合同类 RAG 要特别保留页码、条款号、表格、quote 和原文位置。",
    "解析失败需要状态化处理，成为入库流程的一部分。"
  ]
}

export default post
