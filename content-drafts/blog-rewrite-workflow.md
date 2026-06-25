# 公开博客重构工作流

## 目标

把旧的知识点内容重构为正式技术博客：每篇文章围绕一个明确问题展开，包含背景、核心概念、工作流程、工程取舍、项目案例、图示素材和复盘结论。

## 内容标准

- 标题是正常技术主题，不使用记录式标题。
- 摘要说明文章解决什么问题。
- 正文按“概念 -> 流程 -> 工程取舍 -> 项目例子 -> 误区 -> 结论”推进。
- 每篇至少有一张视觉素材：流程图、架构图、截图、生成配图或可授权图片。
- 项目例子只使用可公开表达的项目语境。
- 发布前必须通过 `npm run blog:check`。

## Gemini 使用方式

主流程使用仓库脚本，不把 Gemini CLI 作为主生产链路。

```bash
npm run blog:plan
npm run blog:draft -- --slug rag-overview-public --force
```

原因：

- 脚本可以固定提示词、结构要求和禁用词检查。
- 输出进入 `content-drafts/`，便于人工审稿和 Git 管理。
- 同一个主题可以反复生成、对比和覆盖。

Gemini CLI 只适合辅助场景，例如临时扩写某一段、改标题、列大纲、生成配图提示词。正式草稿仍应进入脚本流程。

## 本地 API 配置

`.env.local` 只保存在本地，不提交仓库。

```bash
GEMINI_BASE_URL=http://localhost:8317
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-pro
GEMINI_TEMPERATURE=0.65
```

如果出现 `auth_unavailable`，说明本地代理能识别模型，但还没有配置 Gemini provider 的上游认证；需要先修好代理侧认证，再运行草稿脚本。

## 图片与图示

优先级：

1. 项目真实截图：界面、流程、控制台、报告页。
2. 自制图示：RAG 链路、Agent 状态机、部署架构、数据流。
3. 可授权图片资源：只用于背景解释，不替代项目证据。
4. 生成图：用于封面或抽象概念图，必须避免误导为真实产品截图。

图片进入文章前，需要记录来源、用途和替代文本。公开页面不要使用版权不清晰的图片。

## Skill 使用建议

- `content-strategy`：确定栏目、主题簇和发布顺序。
- `baoyu-url-to-markdown`：把参考文章转成 markdown，用来分析结构和写法；第一次使用前需要配置媒体下载偏好。
- `baoyu-diagram`：生成流程图、架构图和知识图解。
- `imagegen` 或 `baoyu-cover-image`：生成封面图或概念插图。
- `copy-editing`：发布前做语气、结构和可读性修订。
- `ai-seo`：检查标题、摘要、关键词和 AI 搜索可引用性。

## 发布流程

1. 在 `scripts/blog-rewrite-plan.json` 选题。
2. 用 Gemini 脚本生成草稿。
3. 人工补项目案例和图片。
4. 运行 `npm run blog:check`。
5. 审稿通过后，把文章转换到 `src/data/blog.ts`。
6. 运行 `npm run build` 和 `npm run lint`。
7. 提交并推送。
