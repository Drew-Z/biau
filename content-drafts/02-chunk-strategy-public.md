---
slug: "chunk-strategy-public"
title: "RAG 文档切分：Chunk 为什么决定答案能不能被验证"
column: "knowledge"
series: "AI 应用知识库"
tag: "AI 应用"
sourceCurrentSlug: "rag-chunk-strategy"
status: "draft"
generatedBy: "model-assisted-polish:review:deepseek-v4-pro:deepseek-v4-pro"
generatedAt: "2026-07-01T19:05:42.010Z"
modelStrategy: "Codex evidence pack + Codex scaffold + strong profile draft + review profile polish + Codex final fact/safety review"
---

# RAG 文档切分：Chunk 为什么决定答案能不能被验证

## Evidence Pack
- TODO: add source paths, URLs, screenshots, task notes, test output, or external references.

## Safe Public Facts
- 这是一篇知识积累草稿，主题来自 `scripts/blog-rewrite-plan.json` 的 `chunk-strategy-public` 选题。
- 公开角度是把 chunk 讲成 RAG 的最小证据单元，强调切分质量如何影响召回、引用和审查报告。

## Uncertain Or Stale Facts
- 文中的 Legal RAG 和企业制度文档例子需要发布前回到真实代码、文档或截图核验。
- 模型生成的技术判断需要由 Codex 或作者逐条复核后才能发布。

## Forbidden / Private Details
- Do not include real IPs, accounts, keys, database URLs, private dashboards, local secret paths, customer names, or sensitive metrics.

## Draft Brief
- Column: 知识积累 / Knowledge Notes
- Column note: 适合长期有效的技术总结、架构理解、工程治理、AI 应用方法。
- Target reader: 正在做知识库、合同审查或长文档问答的开发者
- Summary: 解释 chunk size、overlap、元数据和合同条款切分之间的关系。
- Public angle: 把 chunk 讲成 RAG 的最小证据单元，强调切分质量如何影响召回、引用和审查报告。
- Knowledge points: Chunk size、Overlap、元数据、引用溯源
- Project examples: Legal RAG 条款级切分、企业制度文档入库

## Article Outline
- Problem boundary
- Core mechanism
- Engineering tradeoffs
- Example from this site or a sanitized project
- Common failure modes
- Practical checklist

## Model Strategy
- Codex evidence pack + Codex scaffold + strong profile draft + review profile polish + Codex final fact/safety review
- This generated draft used the `strong` profile for the first model body.
- Review/polish with the `review` profile only after evidence facts are checked.
- Review/polish stage used the `review` profile (deepseek-v4-pro / deepseek-v4-pro).
- Codex final fact/safety review is still required before promotion.

## Review Gates
- [ ] Every project claim is backed by the evidence pack.
- [ ] No private or sensitive information is included.
- [ ] The selected column matches the actual purpose of the article.
- [ ] Model-generated placeholders have been replaced or removed before publishing.
- [ ] Hidden drafts remain hidden until explicitly curated.

## Promotion Checklist
- [ ] Convert reviewed content into `src/data/blog-posts/<slug>.ts` only after review.
- [ ] Add summary metadata to `src/data/blog.ts`.
- [ ] Register a loader in `src/data/blogContent.ts` only if the post should be public/loadable.
- [ ] Add `blogCuration` only when ready for public visibility.
- [ ] Run `npm.cmd run blog:audit`, `assistant:index`, `sitemap:generate`, `lint`, and `build` after public promotion.

## Draft Body

### RAG 文档切分：Chunk 为什么决定答案能不能被验证

在构建 RAG 系统时，很多人第一时间关心的是 Embedding 模型的召回率，或者大模型最终生成的效果。但一旦系统进入合同审查、企业制度问答这类严肃场景，用户最在意的往往不再是“答案看起来对不对”，而是“答案能不能被验证”。

在这种需求下，文档切分就不再只是“把长文本塞进上下文窗口”的预处理步骤。每一个 Chunk，本质上变成了 RAG 系统的最小证据单元。切分的粒度、重叠怎么处理、元数据有没有保留，直接决定了最终生成出来的审查报告或问答引用是否可信。

这篇文章会从工程实践的角度，讨论 Chunk 的切分质量如何影响召回、引用溯源，以及在高要求场景下怎么取舍。

---

## 1. 问题的边界：为什么“能找到”不等于“能验证”

长文档问答或合同审查里，一个很典型的糟糕体验是这样的：LLM 给出了一段看起来很专业的结论，末尾还标了 `[1]`。用户点开引用来源，弹出来的却是一段 1000 Token 的文本块，里面横跨三个不同章节的内容。用户只能在这 1000 Token 里自己翻找，试图找到支撑结论的那一两句话。

这个问题的根源，在于切分边界和语义边界没有对齐。

一旦 RAG 的目标变成“生成可验证的报告”，问题的边界就从“怎么提高向量相似度”，转移到了“怎么提供精准的上下文证据”。如果一个 Chunk 跨了多个独立的合同条款，或者在切分时丢了“这是哪份文件、哪个章节”的信息，这个 Chunk 作为证据就是失效的。

## 2. 核心机制：把 Chunk 当成最小证据单元

要让答案可验证，需要重新审视文档切分里的三个核心参数：Chunk size、Overlap 和元数据。

**Chunk Size：证据的聚焦程度**
过大的 Chunk 会带进大量噪声，让 LLM 在生成时注意力偏移，同时让用户的溯源成本变得很高；过小的 Chunk 又容易丢掉必要的前置条件，比如只切到“应当承担违约责任”，却漏了前面触发这条责任的前提。在严肃场景下，Chunk Size 不应该由 Token 数量决定，而应该由“一个完整的逻辑单元”来决定。

**Overlap：证据的连贯性保障**
Overlap 的工程初衷，是为了防止硬切分截断关键句子。但从溯源视角看，Overlap 更重要的作用是保护“指代关系”和“条件-结论关系”。适当的重叠能保证，即使命中了边缘内容，LLM 和用户也能看到完整的语义闭环。

**元数据：证据的防伪标签**
纯文本的 Chunk 是没有定位能力的。一个合格的证据单元，必须携带丰富的元数据：文档名称、版本、章节标题、段落层级，甚至 PDF 的物理页码。当 LLM 引用这个 Chunk 时，前端就可以把这些元数据渲染成清晰的溯源卡片，而不是只甩一段裸文本。

## 3. 工程上的权衡：固定长度 vs. 语义/结构化切分

实际开发中，通常会面临两种切分策略的选择。

**策略 A：基于 Token/字符的固定长度切分（比如 LangChain 的 `RecursiveCharacterTextSplitter`）**
- 优势：实现非常简单，处理速度快，几乎不需要针对特定文档格式做适配。
- 劣势：对证据的破坏性很大。它可能把一条完整的免责条款从中间一分为二，导致前半部分和后半部分在向量空间里被映射到完全不同的方向，最终无法被同时召回。

**策略 B：基于文档结构的语义切分（比如按 Markdown 标题、HTML 标签或正则匹配条款来切分）**
- 优势：很好地保留了证据的完整性。召回的内容天然具备逻辑独立性，LLM 总结和用户验证的体验都明显更好。
- 劣势：工程复杂度高。需要写不少解析器来处理各种脏数据，有时甚至要引入多模态模型来解析复杂 PDF 的版面结构。

在合同审查这类高要求场景下，通常必须选择策略 B，或者采用“结构化切分 + 内部二次固定长度切分”的混合方式。

## 4. 实践案例：Legal RAG 与企业制度文档入库

*（注：以下项目实现细节目前为框架说明，请在发布前替换或补充真实的工程实践记录。）*

### 案例一：Legal RAG 的条款级切分

处理法律合同或审查任务时，按 Token 切分基本不可行。合同的效力往往精确到具体的条款。

**实现思路**
在文档解析阶段，放弃纯文本提取，而是通过版面分析或正则表达式，把合同解析成树状结构。切分的最小粒度严格控制在“条款”级别。
- 元数据注入：每个 Chunk 都要注入父级节点的结构信息。比如，当前 Chunk 的文本是“乙方应在三个工作日内赔偿”，它的元数据就必须包含 `{"chapter": "第七章 违约责任", "clause": "7.2.1 赔偿期限"}`。
- 溯源效果：当 LLM 指出合同存在风险时，引用的不再只是一段话，而是明确指向“第七章 7.2.1 条”，用户核验的效率会大幅提升。

> `[待作者补充：请在此处插入真实的 Legal RAG 切分代码片段，或展示一段包含层级元数据的 Chunk JSON 数据。请务必回到代码库或部署脚本中核验逻辑，不要依赖 README。]`

### 案例二：企业制度文档入库

企业内部的报销制度、HR 手册里，往往包含大量列表和跨段落的条件分支。

**实现思路**
采用基于 Markdown 的标题层级切分。把文档转成 Markdown 后，按 `#`、`##`、`###` 进行分块。如果某个 `###` 下的内容超过了 LLM 的处理上限，再做子段落切分，但必须保留父标题的元数据。

> `[待作者补充：请在此处插入企业制度文档在系统前端的“引用溯源卡片”截图，展示元数据是如何辅助用户验证答案的。请确认截图来源于真实测试或 Trellis 任务记录。]`

## 5. 常见的失效模式

在构建可验证的 RAG 系统时，下面几个失效模式比较容易踩坑。

1. **代词悬空**
   切分时把“张三在 2023 年成立了公司。”和“他持有 60% 的股份。”切到了两个 Chunk。用户问“张三的持股比例”，第二个 Chunk 即使包含答案，也因为缺乏主语而很难被向量检索召回。

2. **“科学怪人”式的上下文拼接**
   当 Overlap 设得过大，且检索召回了相邻的两个 Chunk 时，如果没有在组装 Prompt 前做去重或合并，LLM 会看到大量重复甚至错位的句子，容易产生幻觉。

3. **元数据剥离**
   文档经过多个清洗管道时，最初提取的页码或章节信息被意外丢弃，最终存入向量数据库的只剩纯文本，溯源能力彻底丧失。

## 6. 实用检查清单

如果你正在重构知识库的文档切分模块，建议在部署前检查下面几项：

- [ ] **边界测试**：随机抽 20 个 Chunk，人工读一遍，评估它们是否构成一个独立、可理解的语义单元。
- [ ] **元数据校验**：检查存入向量数据库的 Payload，是否包含足够让用户在原文件里定位的字段（比如页码、章节名、文档 ID）。
- [ ] **独立检索测试**：暂时关掉 LLM 生成模块，直接输入 Query，观察召回的 Top-3 Chunks 能不能直接作为证据回答问题。
- [ ] **UI 溯源闭环**：前端界面是否提供了明显的引用标记；点击引用后，能不能高亮显示对应的 Chunk 文本及其元数据。

> `[待作者补充：发布前请再次核对文中涉及的技术方案、项目场景与实际部署状态是否一致，替换所有占位符，并附上相关的外部参考链接或开源依赖（如适用）。]`
