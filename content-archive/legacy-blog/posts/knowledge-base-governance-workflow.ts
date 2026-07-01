import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "knowledge-base-governance-workflow",
  "title": "知识库治理流程：新增、复核、下线、归档与责任人机制",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "企业知识库不是一次性导入文档。本文讨论如何设计 owner、reviewCycle、过期复核、下线归档和治理任务，让 RAG 知识长期保持可信。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "知识库治理",
    "内容 Owner",
    "文档生命周期"
  ],
  "scenarios": [
    "企业知识库运营",
    "RAG 内容治理",
    "制度文件复核"
  ],
  "practiceChecklist": [
    "为每份文档设置 owner、status、reviewCycle、expireAt 和 sensitivity",
    "把新增、复核、下线、归档和删除设计成明确状态流",
    "用查询日志、引用反馈和质量评分触发治理任务"
  ],
  "sections": [
    {
      "title": "问题背景：知识库会自然变旧",
      "body": "RAG 项目常见误区是把文档导入看作一次性任务。企业制度会更新，合同模板会变更，项目资料会过期，权限也会调整。如果没有治理流程，系统可能继续引用旧资料，导致答案看似有依据但实际已经不可靠。"
    },
    {
      "title": "生命周期：文档要有状态流",
      "body": "文档可以设计为 draft、pending_review、active、needs_update、archived、deleted 等状态。新增资料先进入草稿或待复核，通过 owner 确认后才进入 active；到期未复核进入 needs_update；不再适用的资料归档或删除。状态流能让知识库运营可见。"
    },
    {
      "title": "责任人机制：owner 决定内容可信度",
      "body": "每份文档都应该有 owner 或责任部门。owner 负责确认资料是否有效、是否可被 AI 使用、是否需要更新、是否可以公开给某些角色。没有 owner 的文档不宜默认进入检索范围，否则后续无人为错误答案负责。"
    },
    {
      "title": "触发条件：治理任务来自数据反馈",
      "body": "治理任务可以由多个信号触发：文档到期、权限变更、查询无答案、用户反馈引用错误、数据质量评分低、模型回答低置信度、同类问题高频出现。治理流程不是凭感觉维护，而是由真实使用数据推动。"
    },
    {
      "title": "工程取舍：治理流程不能压垮运营",
      "body": "治理太轻会导致知识库失真，治理太重又会让资料迟迟无法上线。MVP 可以先要求 owner、category、visibility、reviewCycle 和 status 几个关键字段，再逐步补质量评分、任务看板和自动提醒。"
    },
    {
      "title": "项目例子：Legal RAG 的合同模板库",
      "body": "Legal RAG 可以把合同模板、制度文件和审查规则分别设定 owner 与复核周期。付款模板、违约条款、保密协议一旦更新，相关 chunk、embedding、缓存和 citation 都要按 documentVersion 失效，避免旧依据继续出现在报告里。"
    }
  ],
  "takeaways": [
    "知识库治理要覆盖新增、复核、下线、归档和删除全生命周期。",
    "owner、status、reviewCycle 和权限字段是可信知识库的基础。",
    "查询日志、引用反馈和质量评分应该转化为治理任务。"
  ]
}

export default post
