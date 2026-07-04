import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  slug: 'agentic-rag-frontier-2026',
  title: '2026 年的 RAG 不再只是检索：Agentic RAG、混合检索与 GraphRAG 的知识地图',
  tag: 'AI 应用',
  column: 'knowledge',
  detail:
    '从问题路由、上下文 chunk、混合召回、融合排序、证据评估、纠错检索、GraphRAG 边界到 eval 与观测，梳理前沿 RAG 架构为什么从“向量 top-k”走向可控的证据系统。',
  date: '2026-07-04',
  readTime: '16 min',
  series: 'AI 应用知识库',
  knowledgePoints: [
    'Naive RAG',
    'Agentic RAG',
    'Adaptive-RAG',
    'Self-RAG',
    'CRAG',
    'Contextual Retrieval',
    'Hybrid Retrieval',
    'Dense/Sparse Fusion',
    'RRF/DBSF',
    'Rerank',
    'Evidence Judge',
    'GraphRAG',
    'RAG Evaluation',
    'Retrieval Observability',
    'RAG Eval Set',
  ],
  scenarios: [
    '站内知识库问答',
    '企业文档助手',
    '客服与技术支持机器人',
    '合同审查与引用溯源类应用',
    '跨文档研究与知识发现',
  ],
  practiceChecklist: [
    '先判断问题是否真的需要检索：事实问答、开放创作、私密凭据、越界咨询不能走同一条链路',
    '为 chunk 保留来源、标题、章节、实体、时间、可见性和适用范围，避免切片脱离语境',
    '把 dense embedding 与关键词、BM25 或 sparse vector 结合，保护项目名、错误码、模型名和专有名词',
    '多路召回后使用 RRF、DBSF 或 rerank 统一排序，不把候选简单拼接给模型',
    '回答前判断证据是否足够：证据弱时降级、澄清或拒答，而不是让模型自由补全',
    '检索失败要有纠错路径：改写问题、扩大检索、使用可信外部搜索或明确说明无资料',
    '只有关系密集、全局总结和多跳分析成为高频需求时，再引入 GraphRAG 或图数据库',
    '建立小型 eval 集，覆盖可回答、不可回答、证据冲突、精确字符串、复杂多跳和敏感拒答',
    '记录 retrieval meta、引用覆盖、回答延迟和失败原因，让质量优化可观测',
  ],
  sections: [
    {
      title: 'RAG 的问题边界：不是把 top-k 塞给模型',
      body:
        'Naive RAG 通常是三步：切文档、向量召回 top-k、把片段塞进提示词。它能快速上线，但默认了几个危险假设：所有问题都需要检索，检索只需要一次，召回片段天然可信，模型拿到片段就会按证据回答。前沿 RAG 的重点已经转向“控制系统”：先决定是否检索，再决定怎么检索，最后判断证据是否足够生成答案。',
    },
    {
      title: 'Agentic RAG：把检索变成可决策流程',
      body:
        'Agentic RAG 的“agentic”不等于让模型随意行动，而是把检索拆成显式决策节点：是否需要查资料、该查哪个库、是否需要改写问题、候选是否相关、是否可以回答。LangGraph 的 Agentic RAG 示例就把流程拆成生成检索意图、调用 retriever、判断文档相关性、改写问题、生成回答等节点。工程上真正重要的是这些节点可观察、可测试、可替换。',
    },
    {
      title: 'Adaptive-RAG：按问题复杂度选择策略',
      body:
        'Adaptive-RAG 的核心问题是：真实用户不会只问一种复杂度的问题。NAACL 2024 的 Adaptive-RAG 论文把策略分成无检索、单步检索、多步检索，并用问题复杂度分类器选择路径。这个思想比“所有问题都跑最强链路”更实用：简单问题少花钱、普通事实问题一次检索、复杂多跳问题才进入更慢的推理和检索循环。',
    },
    {
      title: 'Self-RAG：按需检索与自我批评',
      body:
        'Self-RAG 论文指出，固定检索若干段落可能降低模型灵活性，也可能把无关资料带进回答。它训练模型用 reflection tokens 判断何时检索、片段是否相关、回答是否被证据支持、回答是否有用。产品里未必照搬训练方案，但可以借鉴同一个控制思想：检索前判断需求，生成前评估片段，生成后检查支持度和引用边界。',
    },
    {
      title: 'CRAG：检索失败后的纠错路径',
      body:
        'CRAG 研究的是一个常被忽略的问题：如果检索错了怎么办。它用轻量检索评估器判断结果质量，并触发 Correct、Incorrect、Ambiguous 等动作；检索不可靠时，系统可以丢弃错误文档、补充外部搜索、或把文档拆解过滤后再组合。工程启发很直接：RAG 需要失败分支，不能只要“成功路径”。',
    },
    {
      title: 'Contextual Retrieval：解决 chunk 失忆',
      body:
        '很多检索失败不是向量库太弱，而是 chunk 被切碎后失去上下文。Anthropic 的 Contextual Retrieval 建议在 chunk 前补入简短的文档级解释，再分别用于 embedding 和 BM25。它还给出实验结果：Contextual Embeddings 加 Contextual BM25 可降低 top-20 检索失败率，配合 rerank 进一步降低失败率。这里的关键不是某个模型，而是让切片保留“我来自哪里、在讲什么、适用什么问题”。',
    },
    {
      title: 'Hybrid Retrieval：dense 与 sparse 为什么互补',
      body:
        'Dense embedding 擅长语义相近，例如“合同风险”与“条款审查”；sparse、BM25 或关键词检索擅长精确字符串，例如错误码、模型 ID、项目名、法规条号。Anthropic 的文章也用 BM25 补足 embedding 对唯一标识符不稳定的问题。Hybrid Retrieval 的意义是把语义召回和精确召回并列为证据入口，而不是迷信单一 embedding。',
    },
    {
      title: 'RRF、DBSF 与 rerank：候选如何排序',
      body:
        '多路召回后不能简单拼接候选，因为不同检索器的分数尺度不一致。Qdrant 的 Hybrid and Multi-Stage Queries 文档明确提供 dense/sparse 的 prefetch 查询，并支持 RRF 与 DBSF 这类融合方式。RRF 更看重多个列表里的排名位置，DBSF 尝试处理分数分布差异。随后再用 rerank 模型或规则筛掉弱相关片段，才能减少“看似相关但不能回答”的上下文噪音。',
    },
    {
      title: 'Evidence Judge：回答前先判断证据够不够',
      body:
        '召回到相关片段不等于可以回答。Evidence Judge 可以是规则、分类器、reranker、LLM judge 或它们的组合，用来判断证据是否覆盖问题中的关键断言。低成本版本也有价值：引用数不足、来源过单一、分数过低、片段之间冲突、问题要求私密信息时，系统应降级为澄清、边界说明或拒答，而不是把弱证据包装成确定答案。',
    },
    {
      title: 'GraphRAG：适合关系密集问题，但不是默认起点',
      body:
        'GraphRAG 的强项是跨文档、多实体、全局总结和关系推理。Microsoft GraphRAG 文档把流程描述为从文本抽取实体、关系和 claims，构建 community hierarchy，再在查询时使用 global search、local search、DRIFT search 等模式。它很适合“连接散落信息”“理解大语料整体主题”这类问题，但也带来抽取、索引、维护和更新成本。语料小、问题简单或实体关系不稳定时，先做好 contextual chunk、hybrid retrieval、rerank 和 eval 往往更划算。',
    },
    {
      title: 'Eval 与观测：如何知道 RAG 真的变好',
      body:
        'RAG 质量不能只靠“感觉回答更好”。至少要有一组固定 eval 问题，覆盖可回答、不可回答、证据不足、精确字符串、多跳关系、敏感拒答和过期信息。每次回答还应该记录 retrieval meta：检索策略、候选数、引用数、证据 sufficiency、fallback reason、延迟和失败类型。这样才能判断改动到底提升了召回、排序、证据覆盖，还是只是让模型语气更像那么回事。',
    },
    {
      title: '资料来源：这篇文章依据什么',
      body:
        '本文主要依据这些公开资料：Self-RAG 论文 https://arxiv.org/abs/2310.11511；CRAG 论文 https://arxiv.org/abs/2401.15884；Adaptive-RAG 论文 https://aclanthology.org/2024.naacl-long.389/；Anthropic Contextual Retrieval 工程文章 https://www.anthropic.com/engineering/contextual-retrieval；Qdrant Hybrid Queries 文档 https://qdrant.tech/documentation/search/hybrid-queries/；Microsoft GraphRAG 文档 https://microsoft.github.io/graphrag/；LangGraph Agentic RAG 教程 https://docs.langchain.com/oss/python/langgraph/agentic-rag。它们分别支撑本文关于按需检索、纠错检索、问题复杂度路由、上下文切片、混合召回、图式检索和 agentic 流程拆分的判断。',
    },
    {
      title: '一个应用注脚：泊岸助手应该怎么取舍',
      body:
        '放到泊岸这类公开站点助手里，合理路线不是先上最重的图数据库，而是先把问题路由、上下文 chunk、hybrid retrieval、证据 sufficiency、敏感拒答和 eval 做扎实。当前已经讨论并推进的 Agentic Hybrid RAG 方向符合这个判断：先让回答质量可解释、可降级、可观测；等真实问题证明“项目之间关系”和“跨文档全局总结”成为高频需求，再进入 GraphRAG-lite 或 Neo4j。',
    },
  ],
  takeaways: [
    '前沿 RAG 的核心不是“多接一个向量库”，而是路由、召回、排序、证据判断、失败降级和观测组成的控制面。',
    'Adaptive-RAG、Self-RAG、CRAG 解决的是同一类问题：不要无条件检索，不要无条件相信检索，不要在检索失败时硬答。',
    'Contextual Retrieval、Hybrid Retrieval、RRF/DBSF 和 rerank 主要提升“找得到、排得准、噪音少”的检索质量。',
    'GraphRAG 适合关系密集和全局理解场景，但只有在真实问题证明多跳和整体摘要需求足够高时才值得承担复杂度。',
    'RAG 是否进步，最终要看 eval 集、引用覆盖、retrieval meta、失败原因和用户问题日志，而不是只看一次回答是否顺耳。',
  ],
}

export default post
