import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-error-code-system",
  "title": "AI 应用错误码体系：用户提示、诊断信息与重试语义",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 应用错误要同时服务用户、前端和开发诊断。本文讨论 code、message、retryable、stage、traceId 和 nextAction 的设计。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "错误码体系",
    "用户提示",
    "诊断信息"
  ],
  "scenarios": [
    "RAG 检索失败",
    "模型调用异常",
    "文档解析错误"
  ],
  "practiceChecklist": [
    "错误响应包含 code、message、retryable、stage、traceId 和 nextAction",
    "区分用户可读 message 与开发诊断 detail",
    "把可重试、不可重试、人工接管和权限错误分成稳定类别"
  ],
  "sections": [
    {
      "title": "问题背景：错误码不是给后端自己看的",
      "body": "AI 应用错误会影响前端交互、用户下一步动作、客服排查和系统告警。如果只返回 Internal Server Error，用户不知道能不能重试，前端也只能显示泛化失败。错误码体系要同时照顾用户、前端和开发诊断。"
    },
    {
      "title": "响应结构：把用户提示和诊断信息分开",
      "body": "一个实用错误响应可以包含 code、message、retryable、stage、traceId、jobId、resourceId、nextAction 和 detail。message 面向用户，detail 面向日志和开发者；traceId 用来串起 API、Worker、模型调用和前端反馈。"
    },
    {
      "title": "阶段分类：让错误落到具体链路",
      "body": "AI 应用可以按 upload、parse、ocr、embed、retrieve、rerank、generate、validate、tool_call、export、permission 等阶段定义错误。这样前端能展示“文档解析失败”而不是“AI 失败”，后端也能统计哪个阶段最不稳定。"
    },
    {
      "title": "重试语义：区分可重试和不可重试",
      "body": "model_timeout、provider_rate_limited、temporary_network_error 通常可以重试；unsupported_file_type、permission_denied、schema_invalid、document_deleted 通常不可直接重试；citation_missing、low_confidence、needs_human_review 可能要进入人工处理。"
    },
    {
      "title": "用户体验：错误提示要给下一步",
      "body": "错误提示不应该只说失败。比如文件类型不支持时提示允许格式；权限不足时提示联系管理员；模型超时时提示稍后重试；引用不足时提示上传更多资料或进入人工复核。nextAction 可以帮助前端统一渲染按钮。"
    },
    {
      "title": "版本治理：错误码要稳定演进",
      "body": "错误码一旦被前端、告警、客服和报表使用，就不能随意改名。新增错误码可以向后兼容，废弃错误码要保留映射。否则错误体系本身会变成新的不稳定来源。"
    }
  ],
  "takeaways": [
    "AI 应用错误码要同时服务用户提示、前端交互和开发诊断。",
    "错误响应应包含 code、retryable、stage、traceId 和 nextAction。",
    "可重试、不可重试、权限错误和人工接管要有稳定分类。"
  ]
}

export default post
