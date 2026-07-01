import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-environment-config-management",
  "title": "AI 多环境配置管理：dev、staging、prod 的隔离策略",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 应用会同时连接模型、数据库、队列、对象存储和回调服务。本文讨论开发、预发和生产环境如何隔离密钥、数据和写入链路。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "多环境配置",
    "密钥隔离",
    "发布安全"
  ],
  "scenarios": [
    "AI 应用部署",
    "预发验证",
    "生产故障回滚"
  ],
  "practiceChecklist": [
    "dev、staging、prod 使用独立密钥、数据库、对象存储和队列",
    "预发环境使用脱敏数据和生产相同的配置结构",
    "禁止在本地或预发环境误连生产模型写入链路"
  ],
  "sections": [
    {
      "title": "问题背景：环境隔离是生产化基础",
      "body": "AI 应用经常同时连接模型供应商、向量库、对象存储、队列、数据库和回调服务。如果 dev、staging、prod 配置边界不清，很容易出现本地调试误写生产、预发使用真实敏感数据、测试任务消耗生产预算等问题。"
    },
    {
      "title": "资源隔离：每个环境要有独立命名空间",
      "body": "理想情况下，dev、staging、prod 使用独立数据库、Redis、对象存储 bucket、向量索引、模型 API key、Webhook secret 和队列命名空间。即使为了成本共享部分资源，也要通过前缀、租户和权限强隔离。"
    },
    {
      "title": "预发环境：像生产但不是真生产",
      "body": "staging 应该尽量复刻生产配置结构，例如同样的 provider 抽象、队列、Worker、权限和监控，但数据要脱敏，外部写入要关闭或指向沙箱。这样才能发现生产配置问题，又不会污染真实业务。"
    },
    {
      "title": "密钥管理：模型配置要分层保存",
      "body": "密钥不应该写进代码或前端包。模型 provider、baseUrl、apiKey、model、embeddingModel、rerankModel、budgetLimit 应该通过环境变量或配置中心管理，并按环境明确区分。日志里也不能打印密钥和完整请求头。"
    },
    {
      "title": "任务回调：防止预发和生产串线",
      "body": "AI 长任务常有 Webhook、导出链接、对象存储 URL 和 Worker 回调。每个环境都要使用独立域名、队列名、callbackUrl 和 signed URL secret。否则预发任务可能回调生产地址，或者生产用户下载到测试文件。"
    },
    {
      "title": "发布记录：回滚要带配置快照",
      "body": "每次发布不仅要记录代码版本，也要记录环境配置快照、promptVersion、modelVersion、队列开关和预算阈值。出问题时，才能判断是代码变了、模型变了，还是配置变了。"
    }
  ],
  "takeaways": [
    "AI 应用多环境管理要隔离密钥、数据、队列、对象存储、向量索引和回调地址。",
    "staging 应该复刻生产结构，但使用脱敏数据和沙箱写入。",
    "发布记录要包含配置快照，方便定位和回滚。"
  ]
}

export default post
