import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  slug: 'agentic-rag-frontier-2026',
  title: '2026 年的 RAG 不再只是检索：从 Agentic RAG 到泊岸助手的架构选择',
  tag: 'AI 应用',
  column: 'knowledge',
  detail:
    '把 2026 年前沿 RAG 拆成可落地的知识卡：任务路由、上下文 chunk、混合召回、融合排序、证据评估、agentic loop、GraphRAG 边界、eval 与观测如何组合成泊岸助手的技术路线。',
  date: '2026-07-04',
  readTime: '18 min',
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
    'Qdrant',
    'Scoped RAG Orchestrator',
    'Grounding Routing',
    'Retrieval Meta',
    'Refusal Policy',
    'RAG Eval Set',
  ],
  scenarios: [
    '公开站点 AI 助手',
    '内部项目知识库问答',
    '跨项目技术案例检索',
    '合同审查与引用溯源',
    'RAG 质量诊断与状态页观测',
  ],
  practiceChecklist: [
    '先给问题分类：站点事实、创作、规划、敏感凭据、越界咨询分别走不同 grounding',
    '对项目名、错误码、状态标签和 URL 类问题保留关键词/稀疏信号，不只依赖 embedding',
    '给 chunk 写入项目、栏目、状态、版本、可见性和来源类型，避免孤立段落失去语境',
    '初召回后保留 candidateCount、citationCount、sufficiency、fallbackReason 和 expandedEntityCount',
    '用 rerank 或 evidence judge 判断证据是否足够，弱证据只给边界说明或引导用户补充问题',
    '把创作类请求从 strict retrieval 中放出来，避免站内资料污染写作任务',
    '只有出现稳定的跨实体、多跳、全局总结需求时，再引入 GraphRAG-lite 或图数据库',
    '为公开助手建立小型 eval 集，覆盖入口、状态、技术栈、博客知识、敏感拒答和无资料拒答',
    '把每次回答的 retrieval meta 接进状态页或内部诊断页，避免只凭感觉判断质量',
  ],
  sections: [
    {
      title: '问题边界：RAG 不是把 top-k 塞给模型',
      body:
        '早期 RAG 常被简化成“向量库召回 top-k 片段，再让模型回答”。这个流程能快速工作，但它假设所有问题都需要检索、所有检索都只做一次、所有候选片段都可信、所有回答都应该生成。到 2026 年，更实用的理解是：RAG 是围绕证据选择、证据评估和回答边界建立的控制系统。检索只是其中一个动作，不是唯一动作。',
    },
    {
      title: '核心知识点 1：任务路由决定是否检索',
      body:
        'Agentic RAG 的第一步不是查库，而是判断用户意图。站点事实类问题适合 strict grounding；创作、改写、头脑风暴类问题可以 background grounding 或 none grounding；索要后台密码、API key、数据库 URL 这类请求应该直接拒答。泊岸助手代码里已经有 public/internal 边界，以及 internal 的 strict、background、none grounding 思路，这比“任何问题都检索”更接近可控产品。',
    },
    {
      title: '核心知识点 2：Adaptive-RAG 关心问题复杂度',
      body:
        'Adaptive-RAG 的价值在于把问题按复杂度分流：简单问题可能不需要检索，普通事实问题适合一次检索，复杂多跳问题才值得多步检索或问题改写。工程上可以把它落成一个路由表：无资料请求走澄清，单事实请求走一次 hybrid retrieval，多实体关系请求走二次检索或关系扩展，创作请求不强行引用站内资料。',
    },
    {
      title: '核心知识点 3：Self-RAG 强调按需检索和自检',
      body:
        'Self-RAG 反对无条件把固定段落塞进上下文，它更强调“需要时检索”和“生成后检查支持度”。在产品里，这对应两个能力：一是模型或规则判断当前问题是否真的需要站内证据；二是回答生成后做确定性自检，例如是否出现私有路径、密钥、未公开来源格式，或者是否在证据不足时说得太确定。',
    },
    {
      title: '核心知识点 4：CRAG 处理检索失败而不是粉饰失败',
      body:
        'CRAG 的核心提醒是：检索会错，错了以后不能让生成模型硬答。它把检索结果评估为 Correct、Incorrect 或 Ambiguous，并触发不同动作。落到泊岸助手，可以对应 sufficient、weak、none 三种状态：enough 才回答；weak 要降低语气并给出边界；none 要拒答或请求补充，而不是编造项目状态。',
    },
    {
      title: '核心知识点 5：Contextual Retrieval 解决 chunk 失忆',
      body:
        '很多 RAG 失败不是因为模型弱，而是 chunk 被切碎后失去背景。Contextual Retrieval 的启发是：chunk 应该带上文档级背景。对泊岸来说，一个 chunk 不应只保存“支持 Qdrant”，还应该知道它属于公开助手、RAG Orchestrator、某篇博客或某个项目页，知道可见性、栏目、状态和适用范围。这样召回和引用都更稳。',
    },
    {
      title: '核心知识点 6：Hybrid Retrieval 不是口号，而是两类信号互补',
      body:
        '向量检索擅长语义相似，但对项目名、错误码、模型 ID、路由名、状态标签和 URL 这类精确文本不一定稳定。关键词、BM25 或稀疏检索能补上精确匹配。Hybrid Retrieval 的工程目标不是“多一种检索显得高级”，而是让语义召回和精确召回互补，并在 retrieval meta 中记录它们各自贡献了多少候选。',
    },
    {
      title: '核心知识点 7：融合排序决定候选是否真正可用',
      body:
        '多路召回后不能简单拼接结果。RRF 这类 rank fusion 会利用不同召回列表中的排名信号，DBSF 这类分数融合会处理不同分数分布之间的可比性。Qdrant 的 hybrid 与 multi-stage query 能支持这类路线。更重要的是，融合排序后要看引用多样性：只有一个来源支持的回答，应当比多个独立公开资料支持的回答更谨慎。',
    },
    {
      title: '核心知识点 8：rerank 和 evidence judge 是生成前的质检',
      body:
        '召回候选不等于可回答。rerank 负责重新排序候选片段，evidence judge 负责判断这些片段是否足以回答问题。一个低成本版本可以先用规则：引用数不足、候选分数过低、来源都来自同一项目、命中私有凭据意图，都降级为 weak 或 none。后续再用模型或专门 reranker 做更细判断。',
    },
    {
      title: '核心知识点 9：GraphRAG 适合关系密集问题，但不该提前崇拜',
      body:
        'GraphRAG 的强项是跨文档、多实体、全局总结和关系推理。它需要抽取实体和关系，构建 community summary，并维护图索引。公开展示站当前主要是项目页、状态页、博客和演示入口，先做好 contextual chunk、hybrid retrieval、rerank、refusal 和 eval 更划算。只有当真实问题反复追问“项目之间如何依赖”“版本状态为什么变化”“多篇资料之间有什么关系”时，GraphRAG-lite 或 Neo4j 才会变成刚需。',
    },
    {
      title: '泊岸当前实现映射',
      body:
        '当前代码已经有 RAG Orchestrator、Qdrant adapter、本地只读 fallback、公开/内部助手边界、凭据请求拒答、retrieval meta 和确定性自检。Qdrant 路径会返回 agentic-hybrid-qdrant，本地路径会返回 local-agentic-hybrid；meta 中包含 candidateCount、citationCount、sufficiency、fallbackReason、expandedEntityCount 和 modelCalls。这些字段不是装饰，它们是后续质量观测和状态页诊断的入口。',
    },
    {
      title: '一个更具体的回答流程',
      body:
        '用户问“Legal RAG 的合同审查现在能不能演示？”时，公开助手应该先判定为站点事实问题，进入 strict grounding；检索公开项目页、状态页和博客；如果 sufficiency 是 enough，就回答可见入口、演示边界和当前状态；如果 weak，就说明资料不足并给出可查看页面；如果 private-credential，就拒绝提供后台密码。这个流程比“召回几段文字让模型自由发挥”更接近产品级助手。',
    },
    {
      title: '为什么上一版显得空',
      body:
        '上一版的问题不是方向错，而是知识颗粒太粗：只说“要路由、要混合检索、要可观测”，却没有解释每个机制解决什么失败模式，也没有给出工程判据。知识积累类文章应该让读者带走可迁移的判断方式：什么时候不检索，什么时候补关键词，什么时候拒答，什么时候才需要图数据库，什么时候该看 retrieval meta。',
    },
    {
      title: '下一阶段路线：先质量闭环，再图谱扩展',
      body:
        '更合理的路线是三步。第一步，把公开知识库 chunk 做上下文化，并让检索 meta 稳定进入日志和状态页。第二步，在 Qdrant 上推进 dense/sparse 或关键词信号融合，同时加入 rerank/evidence judge。第三步，基于真实问题日志抽取轻量实体关系，形成 GraphRAG-lite；只有当图遍历和全局总结频繁出现，才进入 Neo4j 或完整 GraphRAG。',
    },
  ],
  takeaways: [
    '前沿 RAG 的核心不是“多接一个向量库”，而是任务路由、证据评估、拒答和观测组成的控制面。',
    'Hybrid Retrieval 要解决具体失败模式：语义召回漏掉精确字符串，关键词召回理解不了同义表达，融合排序负责把两者合并成可用候选。',
    'GraphRAG 是关系密集场景的强工具，但在公开站点语料较小、问题尚未证明多跳需求前，先做 Agentic Hybrid RAG 更稳。',
    '泊岸助手已经有第一条生产切片，但下一步必须用 eval、retrieval meta 和状态页把“回答变好”变成可观测事实。',
  ],
}

export default post
