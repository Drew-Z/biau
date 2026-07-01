import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "model-fallback-timeout-provider-switch",
  "title": "模型降级与供应商切换：让 AI 调用失败时可恢复",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "模型服务会超时、限流、返回异常或效果波动。本文讨论 timeout、错误分类、retry、fallback、provider 抽象和人工接管如何保证可用性。",
  "date": "2026-06-20",
  "readTime": "11 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Fallback",
    "超时重试",
    "Provider 抽象"
  ],
  "scenarios": [
    "RAG 问答降级",
    "合同审查批处理",
    "AI 生成服务稳定性"
  ],
  "practiceChecklist": [
    "模型调用设置 timeout、retry 上限、backoff 和错误分类",
    "通过 provider 抽象支持 generate、embed、rerank 等能力切换",
    "高风险或多次失败任务进入人工处理，不无限重试"
  ],
  "sections": [
    {
      "title": "概念：模型服务不是永远稳定的依赖",
      "body": "模型服务可能超时、限流、返回格式不合法、供应商故障，或者某个模型在特定任务上效果波动。如果没有降级策略，AI 应用会表现成随机失败；如果盲目无限重试，又会放大成本并拖垮任务队列。"
    },
    {
      "title": "流程：错误分类决定下一步动作",
      "body": "网络超时、限流和临时 5xx 可以有限重试；权限错误、参数错误、schema 长期不合法、内容安全拒绝通常不应该盲目重试。错误分类清楚后，系统才能决定是重试、切模型、降级返回、拒答，还是进入人工复核。"
    },
    {
      "title": "工程取舍：timeout 和 retry 必须有上限",
      "body": "每次模型调用都应该设置 timeout、retry 上限和 backoff。对于批量合同审查或生成管线，单个任务失败不能无限占用 worker。失败状态、错误原因、已重试次数和下一步建议要落库，方便前端展示和人工处理。"
    },
    {
      "title": "Provider 抽象：降低模型切换成本",
      "body": "工程上可以把模型调用抽象成 provider，例如 generate、embed、rerank、moderate、structuredOutput 等接口。上层业务只依赖统一接口，底层可以切换不同模型或供应商。这样从 mock provider 切到真实 provider，或从一个 embedding 服务切到另一个服务时，不需要重写业务链路。"
    },
    {
      "title": "项目例子：RAG 和生成管线的不同降级",
      "body": "legal-rag 可以从 mock embedding 升级到真实 embedding，并为问答和审查设置超时重试；引用不足时拒答或进入人工复核。Pet Workspace 生成管线要避免失败任务无限 repair，可以在多次失败后转人审或标记素材不可发布。"
    },
    {
      "title": "边界：降级不等于偷偷变差",
      "body": "降级可以是复杂审查失败时返回“需要人工复核”，流式回答失败时返回非流式结果，强模型超时时切到轻量模型做摘要，引用不足时提示资料不足。关键是让用户看到可解释状态，而不是悄悄给出低可信答案。"
    }
  ],
  "takeaways": [
    "模型调用要有超时、错误分类、重试上限和清晰降级路径。",
    "Provider 抽象能降低模型、供应商和 mock/production 实现之间的切换成本。",
    "多次失败或高风险结果应进入人工复核，而不是无限重试。"
  ]
}

export default post
