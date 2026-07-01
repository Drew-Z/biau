import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "prompt-version-management",
  "title": "Prompt 版本管理：让提示词迭代可评估、可回滚",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "提示词不是一次性字符串，而是影响 AI 质量的工程资产。本文讨论 promptVersion、模板变量、评测回归、灰度发布和异常回滚。",
  "date": "2026-06-20",
  "readTime": "11 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Prompt 版本",
    "评测回归",
    "灰度与回滚"
  ],
  "scenarios": [
    "RAG 回答提示词",
    "合同审查提示词",
    "Agent 工具规划提示词"
  ],
  "practiceChecklist": [
    "为关键 prompt 记录 version、purpose、variables、model 和 changelog",
    "使用固定评测集验证每次改动",
    "线上异常时能通过配置切回稳定 promptVersion"
  ],
  "sections": [
    {
      "title": "概念：Prompt 是工程资产",
      "body": "很多 AI 应用早期把 prompt 写成代码里的字符串，改起来很快，但进入多人协作和真实用户环境后，就会出现无法追踪谁改了什么、为什么改、改完效果变好还是变差的问题。Prompt 应该像配置、规则和模型版本一样被管理。"
    },
    {
      "title": "流程：版本、变量、评测、发布",
      "body": "关键 prompt 应该有 version、name、purpose、variables、model、temperature 和 changelog。生成结果要记录 promptVersion。改动前先明确目标，改动后用固定评测集回归，再灰度到少量请求，最后根据指标决定是否全量发布。"
    },
    {
      "title": "工程取舍：模板和变量要分开",
      "body": "Prompt 模板负责定义任务、输出格式和约束，变量负责注入用户问题、检索上下文、合同条款、业务规则等动态内容。把模板和变量分开后，测试、缓存、审计和回滚会更清楚，也能避免临时字符串拼接导致格式失控。"
    },
    {
      "title": "评估：不能凭感觉改 prompt",
      "body": "提示词改动必须用固定样例回归。RAG 可以用 golden set 检查答案是否忠于引用；合同审查可以检查风险类型、引用和结构化字段；Agent 可以检查工具选择和参数是否合法。一次看似更聪明的改动，可能悄悄破坏另一类问题。"
    },
    {
      "title": "项目例子：不同链路拆不同 prompt",
      "body": "legal-rag 可以把问答 prompt、合同审查 prompt、结构化输出修复 prompt 分开管理；Pet Workspace 可以把生成、QA、repair prompt 分开；Agent 工具调用则要把规划 prompt 和工具参数修复 prompt 分开。不同 prompt 承担不同风险，不能混成一个大模板。"
    },
    {
      "title": "回滚：Prompt 不应该只能靠重新发版",
      "body": "生产环境可以先让少量请求使用新版 prompt，比较成功率、人工驳回率、结构化校验失败率、引用命中率和成本。如果指标变差，要能通过配置或数据库快速切回旧版，而不是等待重新发版代码。"
    }
  ],
  "takeaways": [
    "Prompt 应该作为工程资产管理，具备版本、变量、评测和回滚机制。",
    "提示词修改要用固定样例回归，不能只凭单次效果判断。",
    "线上 AI 质量问题需要通过 promptVersion、model 和 traceId 回溯定位。"
  ]
}

export default post
