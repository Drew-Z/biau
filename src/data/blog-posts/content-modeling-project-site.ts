import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "content-modeling-project-site",
  "title": "内容模型设计：项目、资源与博客如何分层",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "产品化展示站点不能把所有内容塞进一个页面。本文从实体、索引、正文加载、策展、关联和质量门禁出发，说明项目站如何建立稳定内容模型。",
  "date": "2026-06-20",
  "readTime": "12 min",
  "series": "公开站点与内容系统",
  "knowledgePoints": [
    "内容实体建模",
    "摘要索引",
    "正文 Loader",
    "公开策展",
    "项目关联",
    "助手索引",
    "质量门禁"
  ],
  "scenarios": [
    "产品官网内容系统",
    "项目展示站",
    "技术博客平台",
    "静态站迁移到 Studio/CMS",
    "公开助手知识库"
  ],
  "practiceChecklist": [
    "先定义内容实体的职责：项目、博客、资源、状态、试玩入口和下载 gate 不混在同一张表里",
    "把列表摘要和正文内容分开，让筛选、搜索和路由加载各取所需",
    "为公开策展单独建模 visibility、role、priority 和 projectIds，不把是否公开写死在正文里",
    "用项目关联连接案例页、博客和助手知识，但避免把项目页稳定事实复制成博客正文",
    "为每类公开数据写审计脚本，检查孤儿 loader、隐藏内容泄露、无效项目关联和敏感内容",
    "面向未来 Studio/CMS 时先稳定字段和边界，再考虑数据库或后端接口",
    "所有运行时生成物都要能从公开数据重新生成，例如助手知识、sitemap 和状态页"
  ],
  "sections": [
    {
      "title": "问题背景：页面堆叠会削弱信息表达",
      "body": "展示站点最常见的问题，是把项目介绍、技术说明、截图、博客、资源链接、状态证据、试玩入口和下载说明全部塞进一个页面。短期看起来内容很多，长期会变得难维护、难筛选、难复用。内容模型的价值，是先定义每类内容的职责，再让页面围绕模型组合展示，而不是让页面结构决定内容边界。"
    },
    {
      "title": "第一层：内容实体要先有职责边界",
      "body": "项目实体负责描述产品能力、业务场景、技术架构、演示入口、截图证据和后续方向；博客实体负责解释一个方法、复盘一次迭代或沉淀一类知识；资源实体适合保存作者主动推荐的工具、链接和材料；状态实体负责表达最近一次可验证结果；下载 gate 负责表达是否允许公开发布。实体边界清楚后，页面才能自由组合这些内容。"
    },
    {
      "title": "第二层：摘要索引服务列表、筛选和搜索",
      "body": "列表页不需要整篇正文，只需要稳定摘要：slug、title、tag、column、detail、date、readTime、series 和 knowledgePoints。摘要索引越小，筛选和搜索越轻；正文越独立，路由加载越稳定。这个分层也让公开助手可以从摘要里拿到高信号标签，而不必在每次列表渲染时加载所有文章正文。"
    },
    {
      "title": "第三层：正文 Loader 服务详情页和按需加载",
      "body": "正文模块适合放 sections、takeaways、scenarios 和 practiceChecklist 这类长内容。详情页按 slug 加载正文，缺失时返回不可读状态，而不是让整个列表崩掉。运行时 loader 还提供一个很重要的审计边界：公开摘要里出现的文章必须有可加载正文；隐藏文章不应该意外暴露 loader；孤儿正文文件也不应该悄悄留在公开目录里。"
    },
    {
      "title": "第四层：公开策展不要和正文混在一起",
      "body": "一篇文章是否公开、是否精选、属于案例还是方法、优先级是多少、关联哪些项目，这些不是正文内容，而是策展决策。单独的 curation 层可以让同一篇文章先保持 hidden，审核后再变成 featured；也可以让项目详情页读取相关博客，而不需要正文模块知道自己会出现在哪个页面。visibility、role、priority 和 projectIds 是典型策展字段。"
    },
    {
      "title": "第五层：项目关联解决“相关内容”而不是复制事实",
      "body": "项目页和博客经常互相引用，但它们承担不同职责。项目页存稳定事实：产品能力、技术栈、演示入口、截图、架构和路线图；博客解释过程：为什么这么做、踩过哪些坑、取舍是什么、哪些知识能复用。projectIds 这样的关联字段可以把二者连接起来，让项目详情页展示相关文章，让助手知道某篇文章服务哪个项目，同时避免把项目页完整功能清单复制成博客正文。"
    },
    {
      "title": "第六层：派生产物要能重新生成",
      "body": "内容模型一旦稳定，就会产生多个派生产物：公开助手知识、知识图谱、sitemap、状态页、项目推荐、搜索标签和相关内容列表。派生产物不应该成为第二份事实来源，而应该从公开数据重新生成。这样修改一篇文章或一个项目时，只需要更新源数据，再运行生成脚本和审计脚本，就能让站内导航、助手回答和搜索入口保持一致。"
    },
    {
      "title": "质量门禁：内容模型需要脚本保护",
      "body": "结构化内容最怕悄悄漂移：摘要有 slug 但正文 loader 缺失、正文文件已经删除但 loader 还在、hidden 内容进入公开选择器、策展引用不存在的项目、项目详情缺少截图或结构图、文章里出现私有路径。审计脚本的作用不是追求形式主义，而是在内容增长时保持模型契约。没有门禁，内容模型迟早会退回页面堆叠。"
    },
    {
      "title": "工程取舍：静态数据、Studio 和 CMS 的边界",
      "body": "早期站点可以把结构化数据放在 src/data 中，迭代快、部署简单、适合静态站。内容规模变大后，可以接 Studio、Headless CMS、Markdown 文件或后端接口；但迁移前最重要的是字段和边界已经稳定。否则换成任何 CMS 都只是把混乱搬到数据库里。最终形态应让编辑在工作台创建草稿，审核通过后再导出到公开静态数据。"
    },
    {
      "title": "证据边界：本篇依据哪些公开材料",
      "body": "这篇文章的依据来自当前公开仓库中的内容模型，而不是未公开后台资料：src/data/blogShared.ts 定义 BlogPost、BlogColumn、knowledgePoints、scenarios、practiceChecklist、sections 和 takeaways；src/data/blog.ts 维护摘要索引；src/data/blogCuration.ts 维护 featured、archive、hidden、role、priority 与 projectIds；src/data/blogContent.ts 维护正文 loader；src/data/portfolio.ts 提供项目展示模型；scripts/audit-blog-catalog.ts 检查策展、项目关联和正文索引一致性；scripts/check-public-blog.mjs、scripts/check-blog-knowledge-quality.ts、scripts/check-project-detail-evidence.ts 和 scripts/generate-assistant-knowledge.ts 则分别覆盖公开安全、知识文质量、项目证据和助手知识生成。"
    },
    {
      "title": "项目例子：blog-semi 如何组织内容",
      "body": "blog-semi 把项目展示、博客、状态页、Studio 草稿和助手知识拆成不同层。Legal RAG、Pet、ERP、移动端和游戏项目进入项目模型；知识积累、项目总结、构建手记和 AI 日报进入博客模型；状态页读取 reliabilityProjects 和 synthetic 快照；公开助手读取生成后的知识索引。这样站点更像一个产品内容系统，而不是临时拼接的展示页。"
    }
  ],
  "takeaways": [
    "内容模型的第一步是定义实体职责，而不是先设计页面或选择 CMS。",
    "摘要索引、正文 loader、策展层和项目关联应分开建模，分别服务列表、详情、公开选择和关联推荐。",
    "助手知识、sitemap、状态页和搜索标签应从公开数据重新生成，不应成为第二份事实来源。",
    "静态数据可以长期有效；真正需要后台时，也应先稳定字段、审核边界和导出门禁。"
  ]
}

export default post
