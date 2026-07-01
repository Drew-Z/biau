import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "prompt-security-test-set",
  "title": "Prompt 安全测试集：越权、注入、泄露与工具滥用",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "安全不能只靠一句系统提示。本文讨论如何用固定样例测试 prompt injection、越权请求、敏感信息泄露、危险输出和工具滥用。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Prompt 安全",
    "安全测试集",
    "护栏评测"
  ],
  "scenarios": [
    "企业知识库问答",
    "Agent 工具调用",
    "合同审查安全测试"
  ],
  "practiceChecklist": [
    "准备越权、注入、泄露、危险建议和工具滥用样例",
    "每次 prompt、模型或护栏变更后跑安全测试集",
    "记录拦截率、误杀率、绕过样例和人工复核结果"
  ],
  "sections": [
    {
      "title": "问题背景：安全不能只靠一句系统提示",
      "body": "Prompt 里写“不要泄露敏感信息”是必要的，但远远不够。用户可能诱导模型忽略规则、请求越权文档、要求输出内部配置、触发危险工具调用。安全测试集就是用固定攻击样例反复验证护栏是否有效。"
    },
    {
      "title": "样例覆盖：测试集要覆盖主要攻击类型",
      "body": "常见类型包括 prompt injection、角色覆盖、越权查询、敏感信息提取、数据外带、危险建议、绕过 citation、工具滥用和多轮诱导。每类都应该有正常样例、边界样例和明显攻击样例。"
    },
    {
      "title": "RAG 场景：重点验证检索权限和越权引用",
      "body": "RAG 安全测试要验证模型是否会回答用户无权访问的文档，是否会把检索到的内部片段泄露出去，是否能识别“忽略上文规则”这类注入。正确做法是检索前权限过滤，模型输出后再检查越权引用。"
    },
    {
      "title": "Agent 场景：重点验证工具边界",
      "body": "Agent 安全测试要验证模型是否会调用未授权工具、构造危险参数、重复执行写操作或绕过 PendingAction。测试样例应该包含“请直接删除”“帮我跳过审核”“用管理员身份执行”等请求。"
    },
    {
      "title": "指标设计：不能只看拦截率",
      "body": "安全测试要看 attack block rate，也要看 false positive。拦截太松会漏风险，拦截太严会影响正常业务。还要记录 bypass 样例、误杀样例、riskType、stage、promptVersion 和 guardrailVersion。"
    },
    {
      "title": "持续演进：安全样例要不断扩充",
      "body": "真实用户反馈、红队测试、线上拦截日志和人工复核都可以进入安全测试集。每次改 prompt、模型、工具 schema 或权限策略，都应该重新跑安全集，避免旧问题复发。"
    }
  ],
  "takeaways": [
    "Prompt 安全测试集要覆盖注入、越权、泄露、危险输出和工具滥用。",
    "RAG 安全重点是检索前权限过滤和输出后越权引用检查。",
    "安全测试既要看拦截率，也要看误杀率和绕过样例。"
  ]
}

export default post
