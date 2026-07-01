import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-safety-guardrails",
  "title": "AI 安全护栏：从输入拦截到工具调用边界",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "AI 安全不是一个敏感词列表。本文讨论输入识别、检索权限、工具最小权限、输出审核和可解释拦截如何组成完整护栏。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "安全护栏",
    "权限边界",
    "输出审核"
  ],
  "scenarios": [
    "合同审查",
    "Agent 工具调用",
    "企业知识库问答"
  ],
  "practiceChecklist": [
    "对用户输入、检索范围、工具参数和模型输出分别做安全检查",
    "高风险工具调用必须经过权限校验和人工确认",
    "记录拦截原因、风险类型和后续处理结果"
  ],
  "sections": [
    {
      "title": "问题背景：护栏不是一个敏感词列表",
      "body": "AI 安全护栏不是简单过滤几个词。真实系统里风险来自多个环节：用户输入可能诱导越权，检索可能带出不该看的文档，工具调用可能执行危险操作，模型输出可能泄露隐私或给出不合规建议。护栏要覆盖整条链路。"
    },
    {
      "title": "输入阶段：先识别意图和风险类型",
      "body": "输入侧可以识别 prompt injection、越权查询、敏感数据请求、违法请求和高风险业务请求。对于明显危险的输入直接拒绝；对于不确定的输入，可以降级为普通问答、要求用户补充权限，或进入人工复核。"
    },
    {
      "title": "检索阶段：在召回前守住权限边界",
      "body": "RAG 的安全重点是检索范围。系统应该先根据 tenant、workspace、role、documentACL 和 status 做 metadata filter，再进入向量检索和 rerank。不能先把不该看的文档召回到上下文里，再期待模型自己不要说出来。"
    },
    {
      "title": "工具阶段：Tool Calling 要遵守最小权限",
      "body": "Agent 工具不能给模型无限能力。每个工具都要有 schema、权限校验、参数校验、幂等键和风险等级。读操作和写操作要分开，高风险写入要进入 PendingAction 或人工确认，不能让模型直接提交生产变更。"
    },
    {
      "title": "输出阶段：生成后还要二次检查",
      "body": "模型输出后还需要检查是否包含敏感信息、越权引用、危险建议、虚构法律结论、缺失引用或格式错误。对于合同审查这类场景，输出最好绑定 citation 和 confidence，缺少依据时返回“不确定”比强行回答更可靠。"
    },
    {
      "title": "审计体验：拦截也要可解释",
      "body": "安全护栏不能只返回失败。系统应该记录 riskType、stage、reason、traceId、userId、documentId 和 action。前端可以给用户明确但不过度暴露内部规则的提示，后台则保留完整审计，方便复盘和调参。"
    }
  ],
  "takeaways": [
    "AI 安全护栏要覆盖输入、检索、工具调用和输出，而不是只做敏感词过滤。",
    "RAG 必须在检索前守住权限边界，不能依赖模型自觉保密。",
    "高风险工具调用要有权限、审计、幂等和人工确认。"
  ]
}

export default post
