import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "rag-data-quality-scoring",
  "title": "RAG 数据质量评分：解析、Chunk、Metadata 与 Citation",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "RAG 质量上限来自数据。本文讨论如何把解析质量、chunk 完整度、metadata 覆盖率和 citation 命中转成可治理指标。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "数据质量",
    "RAG 评估",
    "质量评分"
  ],
  "scenarios": [
    "知识库治理",
    "合同库清洗",
    "RAG 上线验收"
  ],
  "practiceChecklist": [
    "为解析成功率、chunk 完整度、metadata 覆盖率和 citation 命中率建立评分",
    "低质量文档进入待复核或重新清洗队列",
    "按文档、目录、owner 和租户展示质量分布"
  ],
  "sections": [
    {
      "title": "问题背景：数据质量决定 RAG 上限",
      "body": "RAG 效果不好时，很多人第一反应是换模型或调 prompt，但如果文档解析错、chunk 切坏、metadata 缺失，模型再强也很难给出可靠答案。数据质量评分的目标，是在生成前就发现知识库里的低质量资料。"
    },
    {
      "title": "解析质量：关注 OCR、表格和版面噪声",
      "body": "解析质量可以看 parseSuccess、ocrConfidence、tableDetected、textLength、乱码比例、空页比例、标题识别率和页码覆盖率。扫描件、表格合同和多栏 PDF 最容易出问题，需要单独标记低置信度区域。"
    },
    {
      "title": "Chunk 质量：检查完整度和原文位置",
      "body": "Chunk 质量可以看平均长度、过短比例、过长比例、是否跨章节、是否保留标题、overlap 是否合理、chunk 与原文位置是否可追踪。合同类文档尤其要检查条款号、标题层级和定义条款是否被切断。"
    },
    {
      "title": "Metadata 质量：权限和版本字段不能缺失",
      "body": "metadata 覆盖率可以看 source、documentId、owner、category、tags、section、page、status、visibility、version 是否完整。缺少权限字段或版本字段的文档，即使内容解析成功，也不应该直接进入 active 检索范围。"
    },
    {
      "title": "Citation 质量：判断引用是否支撑结论",
      "body": "Citation 质量可以看 citation hit rate、引用是否能定位原文、引用片段是否支持结论、页码是否正确、用户反馈是否准确。引用质量低说明检索、rerank、chunk 或前端定位至少有一环需要调整。"
    },
    {
      "title": "治理闭环：评分要驱动具体动作",
      "body": "质量分不是为了好看，而是为了触发动作。低解析分的文档重新 OCR，低 chunk 分的文档重新切分，metadata 缺失的文档进入补字段清单，引用反馈差的文档进入评测集和人工复核。"
    }
  ],
  "takeaways": [
    "RAG 数据质量评分要覆盖解析、chunk、metadata、检索和 citation。",
    "低质量文档不应直接进入 active 检索范围。",
    "质量分要驱动重新解析、重新切分、补字段和人工复核。"
  ]
}

export default post
