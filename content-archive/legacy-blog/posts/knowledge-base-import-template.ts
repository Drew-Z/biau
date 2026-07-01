import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "knowledge-base-import-template",
  "title": "知识库导入模板：目录、标签、Owner 与权限字段",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "RAG 入库前的 metadata 会决定后续检索、权限和运营质量。本文讨论导入模板如何标准化目录、标签、owner、权限和生命周期。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "知识库导入",
    "元数据标准",
    "内容治理"
  ],
  "scenarios": [
    "企业资料批量入库",
    "合同库初始化",
    "制度文件知识库建设"
  ],
  "practiceChecklist": [
    "导入前收集 title、category、tags、owner、visibility、expireAt 和 reviewCycle",
    "用模板校验缺失字段、重复文件和权限字段",
    "导入结果生成成功、失败和待补充清单"
  ],
  "sections": [
    {
      "title": "问题背景：导入模板决定后续质量",
      "body": "很多 RAG 项目效果不好，不是模型问题，而是入库时没有标准化 metadata。文档没有 owner、目录混乱、标签随意、权限字段缺失，后续检索、运营、审计和过期复核都会变得困难。"
    },
    {
      "title": "字段设计：模板要覆盖业务和治理信息",
      "body": "基础字段包括 title、sourcePath、documentType、category、tags、owner、department、visibility、allowedRoles、effectiveAt、expireAt、reviewCycle、language、sensitivity。不同业务可以扩展合同编号、客户名称、项目编号等领域字段。"
    },
    {
      "title": "目录标签：用约束减少后续混乱",
      "body": "目录用于组织结构，标签用于横向检索。目录最好来自受控枚举，避免同一类文档出现“制度”“规章”“规范”多个写法。标签可以允许多选，但也要有推荐词表和合并规则。"
    },
    {
      "title": "Owner 机制：把内容质量落实到责任人",
      "body": "知识库需要内容 owner。owner 负责确认文档是否有效、是否过期、是否允许被 AI 使用。没有 owner 的文档可以先导入为 pending_review，而不是直接 active。"
    },
    {
      "title": "权限字段：不能等上线后再补",
      "body": "批量导入时必须收集 visibility、tenant、workspace、allowedRoles、allowedUsers 或 department。权限字段缺失时，宁可暂缓入库，也不要默认公开。权限默认值应该保守。"
    },
    {
      "title": "导入报告：让成功、失败和待补充可复盘",
      "body": "导入完成后应该生成报告，列出成功文档、失败文档、重复文档、缺失字段、权限异常和待人工确认项。这个报告既是运营清单，也是后续优化解析和模板的依据。"
    }
  ],
  "takeaways": [
    "知识库导入模板要把目录、标签、owner、权限和生命周期字段前置。",
    "metadata 标准化会直接影响检索、审计、运营和过期复核质量。",
    "导入报告要列出成功、失败、重复、缺失和待人工确认项。"
  ]
}

export default post
