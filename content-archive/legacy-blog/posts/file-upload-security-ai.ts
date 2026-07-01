import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "file-upload-security-ai",
  "title": "文件上传安全：大小限制、类型校验、病毒扫描和异步处理",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "RAG 文档上传是知识库的入口风险。本文讨论文件大小、类型校验、内容嗅探、隔离存储、扫描和异步入库如何协同。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "文件上传安全",
    "内容校验",
    "异步处理"
  ],
  "scenarios": [
    "RAG 文档上传",
    "合同审查附件",
    "企业知识库导入"
  ],
  "practiceChecklist": [
    "限制文件大小、数量和类型",
    "不要只信任扩展名，要做 MIME 和内容嗅探",
    "上传后先隔离存储，扫描和解析通过后再入库"
  ],
  "sections": [
    {
      "title": "问题背景：上传是 AI 应用的入口风险",
      "body": "RAG 和合同审查都需要用户上传文件，这意味着系统要面对超大文件、错误格式、恶意脚本、压缩炸弹、病毒、伪装扩展名和敏感数据。上传安全不是附属功能，而是知识库入库链路的第一道门。"
    },
    {
      "title": "第一道门：限制大小、数量和类型",
      "body": "接口层应该限制单文件大小、批量数量、总大小和允许类型。例如只允许 PDF、DOCX、TXT、MD、PNG、JPG 等明确类型。错误要尽早返回，避免大文件占满内存、磁盘或队列。"
    },
    {
      "title": "类型校验：不要只相信扩展名",
      "body": "用户可以把任意文件改名为 .pdf，所以服务端要检查 MIME、文件头和实际内容。对于 DOCX 这类压缩格式，也要检查内部结构。类型不匹配的文件应拒绝或进入隔离状态。"
    },
    {
      "title": "存储策略：先隔离，再入库",
      "body": "上传文件可以先放到 quarantine 区域，完成病毒扫描、内容嗅探、hash 去重和权限记录后，再进入正式对象存储。解析 Worker 只处理通过安全检查的文件，避免把恶意文件直接交给 parser。"
    },
    {
      "title": "工程取舍：上传后异步处理",
      "body": "文件上传接口不应该同步完成 OCR、解析、chunk 和 embedding。更稳的是上传后创建 document 和 job，返回 jobId，Worker 异步处理。前端展示 uploaded、scanning、parsing、indexing、failed、ready 等状态。"
    },
    {
      "title": "权限边界：敏感文件要全程受控",
      "body": "上传后的原始文件、解析文本和 citation 都要绑定 tenant、workspace、owner 和 ACL。对象存储访问使用短期签名 URL 或后端代理，不要把永久公开链接暴露给前端。"
    }
  ],
  "takeaways": [
    "文件上传安全是 RAG 入库链路的第一道门。",
    "服务端要限制大小和类型，并做 MIME、文件头和内容校验。",
    "上传、扫描、解析和索引应该状态化、异步化、可追踪。"
  ]
}

export default post
