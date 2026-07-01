import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "prompt-template-variable-design",
  "title": "Prompt 模板设计：把变量、约束和输出格式拆清楚",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "Prompt 不应该是随手拼接的长字符串。本文讨论如何拆分模板、动态变量、任务约束、few-shot 示例和输出 schema。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Prompt 模板",
    "变量注入",
    "输出约束"
  ],
  "scenarios": [
    "RAG 回答生成",
    "合同审查报告",
    "结构化输出修复"
  ],
  "practiceChecklist": [
    "把稳定规则、动态变量和输出 schema 分开管理",
    "为 prompt 建立版本、用途、变量说明和评测样例",
    "输出格式交给服务端 schema 校验，不只靠文字约束"
  ],
  "sections": [
    {
      "title": "概念：Prompt 是可管理模板",
      "body": "早期 Demo 可以把 prompt 写死在代码里，但真实系统需要复用、评测、审计和回滚。Prompt 模板应该像业务配置一样管理，明确用途、变量、输出格式、模型参数和版本，而不是一段随手拼接的字符串。"
    },
    {
      "title": "流程：模板、变量、约束、schema 分层",
      "body": "模板负责稳定规则，例如任务目标、回答边界、输出格式和禁止事项；变量负责动态内容，例如用户问题、检索片段、合同条款、语言、风险类型和当前用户权限；schema 负责服务端校验输出。分层后更容易测试和回滚。"
    },
    {
      "title": "工程取舍：约束要具体到可校验",
      "body": "“请认真回答”没有工程价值。更好的约束是“只能基于 citations 中的内容回答”“每个风险项必须包含 riskLevel、reason、suggestion、citations”“没有依据时输出 unable_to_answer”。约束越具体，后端越容易校验。"
    },
    {
      "title": "Few-shot：示例稳定输出，也占用预算",
      "body": "Few-shot 示例可以稳定输出风格，但会占用 token，并可能让模型模仿不适合当前场景的内容。合同审查类示例应该覆盖风险项、引用和拒答，不要只给理想答案。示例也要和 prompt 版本一起管理。"
    },
    {
      "title": "项目例子：合同审查 prompt 怎么拆",
      "body": "legal-rag 可以把问答 prompt、风险审查 prompt、结构化输出修复 prompt 分开。问答 prompt 强调基于 citation 回答；审查 prompt 强调风险类型和建议；修复 prompt 只处理 schema 错误。不同模板承担不同风险，便于单独评估。"
    },
    {
      "title": "版本管理：Prompt 改动必须连接评估",
      "body": "Prompt 每次修改都应该记录 version 和 changelog，并用固定评测集回归。这样当某次改动导致引用下降或结构化失败率上升时，能快速定位并回滚，而不是在代码里翻找字符串差异。"
    }
  ],
  "takeaways": [
    "Prompt 模板要把稳定规则和动态变量分开。",
    "输出格式必须由服务端 schema 校验。",
    "Prompt 版本要和评测结果绑定，方便回滚和持续优化。"
  ]
}

export default post
