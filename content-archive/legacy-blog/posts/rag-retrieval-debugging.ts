import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "rag-retrieval-debugging",
  "title": "RAG 召回失败排查：从入库到 Citation 的逐层定位",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "RAG 召回失败可能发生在入库、过滤、召回、精排或生成阶段。本文给出从无结果到错引用的逐层排查路径。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "RAG 排障",
    "召回质量",
    "检索评估"
  ],
  "scenarios": [
    "合同条款召回失败",
    "企业知识库无答案",
    "引用片段不相关"
  ],
  "practiceChecklist": [
    "先确认目标文档和 chunk 是否真实入库",
    "用固定问题检查向量召回、关键词召回和 rerank 各阶段结果",
    "记录 query、filter、topK、score、chunkId 和 citation 命中情况"
  ],
  "sections": [
    {
      "title": "问题分类：先判断是哪一种失败",
      "body": "RAG 召回失败不只有“无结果”。常见问题包括无结果、召回错文档、召回对文档但错片段、片段相关但不足以回答、rerank 把正确片段排掉、生成阶段忽略引用。先分类，才能避免在错误环节反复调参数。"
    },
    {
      "title": "入库阶段：确认目标内容真实存在",
      "body": "很多召回问题其实发生在入库阶段。要确认文档是否解析成功、是否被清洗规则误删、chunk 是否过短或过长、metadata 是否完整、embedding 是否生成成功、document status 是否为 active。目标内容如果没有正确入库，后面再调 topK 也没用。"
    },
    {
      "title": "过滤阶段：metadata filter 是高频误区",
      "body": "企业 RAG 通常会使用 tenant、workspace、document、role、status、version 等 metadata filter。过滤条件写错时，正确 chunk 可能在库里，却被检索前排除。排查时要打印最终 filter，并用目标 documentId 做一次定向查询确认。"
    },
    {
      "title": "召回阶段：向量和关键词分别检查",
      "body": "向量检索适合语义相似，关键词检索适合条款号、金额、日期、专有名词。排查时可以分别看 vector topK 和 keyword topK，再看合并去重后的结果。如果只有一种召回方式命中，说明混合检索权重或查询改写还要调整。"
    },
    {
      "title": "排序阶段：记录 rerank 前后排名变化",
      "body": "rerank 能提升排序，也可能把正确片段排掉。需要记录 rerank 前后的 chunkId、score 和排名变化。scoreThreshold 过高会导致无结果，topK 过低会漏掉答案，topK 过高又会引入噪声。参数调整要用 golden set 验证，而不是凭单次体验。"
    },
    {
      "title": "生成阶段：检查回答和 citation 是否一致",
      "body": "召回正确不代表最终回答正确。生成阶段可能忽略上下文、引用错片段、把多个片段混在一起。最终要检查 answer 是否只基于 retrievedChunks，citation 是否能定位原文，回答中没有依据的结论是否被标记为不确定。"
    }
  ],
  "takeaways": [
    "RAG 召回失败要先分类，再按入库、过滤、召回、rerank、生成逐层排查。",
    "metadata filter、status 和版本常常是企业 RAG 召回失败的隐藏原因。",
    "调 topK、阈值和 rerank 必须用 golden set 验证整体效果。"
  ]
}

export default post
