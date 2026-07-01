import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-release-checklist",
  "title": "AI 应用发布检查清单：质量、安全、成本与回滚",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 应用上线不能只看页面能否点击。本文把 RAG 质量、Agent 安全、权限隔离、监控成本、降级和回滚纳入发布检查。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "发布检查",
    "质量门禁",
    "上线准备"
  ],
  "scenarios": [
    "RAG MVP 上线",
    "Agent 工作流发布",
    "企业知识库交付"
  ],
  "practiceChecklist": [
    "发布前跑 golden set、权限测试、失败重试和降级演练",
    "确认日志、trace、成本告警和错误监控已开启",
    "准备配置回滚、模型降级和人工接管路径"
  ],
  "sections": [
    {
      "title": "问题背景：发布不能只看页面能否点击",
      "body": "传统功能测试只能证明按钮、接口和页面基本可用。AI 应用还要验证回答依据、引用准确性、权限隔离、工具调用安全、成本上限、失败恢复和人工接管。发布前检查清单就是为了防止 Demo 级系统直接进入真实业务。"
    },
    {
      "title": "RAG 质量：用 Golden Set 验证证据链",
      "body": "上线前要跑 golden set，检查召回率、citation 命中率、无答案处理、引用原文定位、metadata filter 和文档版本。对于合同审查，还要检查关键风险类型是否能召回，低置信度时是否会提示不确定。"
    },
    {
      "title": "Agent 安全：验证工具边界和人工确认",
      "body": "Agent 要检查工具 schema、权限校验、参数校验、幂等键、maxSteps、maxRetries、超时、PendingAction 和人工确认。高风险工具必须能被拦截，失败后不能无限重试，也不能绕过审核直接写入生产数据。"
    },
    {
      "title": "权限数据：跨租户和导出链接都要测",
      "body": "发布前要测试跨租户、跨工作区、离职用户、过期文档、私有文档和导出链接权限。日志、prompt、引用片段、原始文件和导出报告要做脱敏或访问控制。上传文件要有限制、扫描和异步处理。"
    },
    {
      "title": "运行保障：监控、成本和降级路径",
      "body": "线上必须有 traceId、model、promptVersion、retrievedChunks、token、latency、errorType、cost 和 userFeedback。还要配置成本告警、队列堆积告警、模型失败降级、缓存策略和人工接管入口。"
    },
    {
      "title": "发布记录：让代码、配置和模型都可回滚",
      "body": "发布不只是 deploy。要记录发布版本、配置版本、promptVersion、模型版本和评测结果。出现问题时，可以回滚代码、回滚配置、切换模型、暂停批量任务或关闭高风险功能。"
    }
  ],
  "takeaways": [
    "AI 应用发布前要同时验证功能、质量、安全、成本、监控和回滚。",
    "RAG 必须用 golden set 验证召回和引用，Agent 必须验证工具边界和人工接管。",
    "发布记录要包含代码、配置、prompt、模型和评测结果。"
  ]
}

export default post
