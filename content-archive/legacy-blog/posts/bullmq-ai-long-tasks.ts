import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "bullmq-ai-long-tasks",
  "title": "BullMQ 长任务队列：让 AI 文档处理和生成管线跑稳",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 应用里的文档解析、embedding、批量审查和素材生成都不适合同步请求。本文讨论如何用 BullMQ 设计任务状态、重试、幂等和失败恢复。",
  "date": "2026-06-20",
  "readTime": "11 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "BullMQ",
    "Worker",
    "幂等与重试"
  ],
  "scenarios": [
    "文档解析入库",
    "批量 embedding",
    "AI 生成和 QA 管线"
  ],
  "practiceChecklist": [
    "API 只创建任务并返回 jobId",
    "Worker 分阶段更新状态、日志和中间结果",
    "用幂等 key、唯一索引和错误分类防止重复执行与盲目重试"
  ],
  "sections": [
    {
      "title": "概念：队列把长任务从请求链路里拆出来",
      "body": "PDF 解析、OCR、chunk 切分、embedding、批量合同审查、图片生成、QA 校验和打包发布都可能耗时较长。如果这些动作都放在同步接口里，接口容易超时，用户刷新后状态也容易丢失。BullMQ 这类队列的价值，是把任务提交、执行、重试和状态追踪拆开。"
    },
    {
      "title": "流程：API 创建任务，Worker 分阶段执行",
      "body": "典型流程是：前端提交请求，API 校验权限并创建任务记录，返回 jobId；BullMQ 将任务放入队列；Worker 领取任务并按阶段更新状态；执行过程中写入日志、中间结果和进度事件；成功后标记 completed，失败后根据错误类型重试、降级或进入人工处理。"
    },
    {
      "title": "工程取舍：重试不能只是再跑一遍",
      "body": "AI 任务失败原因很多：模型超时、解析失败、schema 校验不通过、第三方接口限流、文件缺失、权限失效。能重试的错误要设置 backoff 和最大次数；不能重试的错误要直接失败并给出可解释原因。否则盲目重试会浪费 token、重复调用外部接口，还可能污染业务数据。"
    },
    {
      "title": "幂等：队列可靠性的底线",
      "body": "Worker 可能因为崩溃恢复、网络抖动或重复投递而再次执行同一个任务。没有幂等设计，同一个文档可能重复入库，同一批商品可能重复写入，同一个生成资产可能重复发布。可以用 documentHash、jobId、businessKey、唯一索引和状态机保护关键写入。"
    },
    {
      "title": "项目例子：RAG 和生成管线都需要队列",
      "body": "legal-rag 中，文档解析、chunk、embedding 和索引写入适合放入队列；Pet Workspace 中，生成、QA、修复、打包和发布准备也适合队列；Ozon ERP 中，商品同步、批量导入和外部平台写入同样需要队列。队列不是 AI 专属技术，但它是 AI 应用生产化的基本功。"
    },
    {
      "title": "前端体验：任务状态要能被用户理解",
      "body": "队列不是只给后端看的。前端需要展示 queued、running、retrying、failed、completed，也需要更细的阶段，例如 parsing、embedding、reviewing、packaging。状态设计清楚后，SSE、轮询、日志和人工处理页面才能围绕同一个任务模型工作。"
    }
  ],
  "takeaways": [
    "AI 文档处理和生成管线天然适合异步队列，而不是同步接口硬等。",
    "队列可靠性依赖状态落库、错误分类、重试策略和幂等保护。",
    "BullMQ 能把传统后端长任务经验迁移到 RAG、Agent 和生成管线。"
  ]
}

export default post
