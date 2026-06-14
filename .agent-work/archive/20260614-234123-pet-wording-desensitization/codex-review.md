# Codex Controller Review

Date: 2026-06-14
Repo: /home/zhang/workspace/blog-semi
Reviewed: .agent-work/current-task.md, .agent-work/cc-plan.md, src/App.tsx, src/data/portfolio.ts, safe summaries extracted from reference projects

## Verdict

第二片 CC 计划方向可用，但不批准按原样实施。

计划正确识别了三点：Ozon/Pet/xunqiu 现有内容已经基本够用，不应该从零重写；Pet 页面里出现的具名环境需要泛化；xunqiu 缺少业务案例页，后续需要补齐。但计划把“新增 xunqiu 案例”作为第一片实现，和当前任务卡的非目标“不要新增项目、案例或博客”冲突。

因此，本轮先批准一个更小、更安全的实现片：公开内容脱敏用词修正。xunqiu 业务案例作为下一片单独开任务卡，届时明确放开“为既有 xunqiu 项目补一条案例”的范围。

## Accepted From CC Plan

- 不重写 Ozon、Pet、xunqiu 已有项目详情。
- 保留项目详情页讲技术、案例详情页讲业务的分工。
- Ozon ERP 当前技术和案例内容基本符合公开表达，不作为本轮改动重点。
- Pet Workspace 的具名联调环境应泛化，避免公开站点出现过具体的联调/部署环境名。
- xunqiu 缺少业务案例页是结构性缺口，但需要单独授权后再补。

## Rejected Or Deferred

- 暂不新增 `caseStudies[]` 的 `xunqiu` 条目。本任务卡当前明写“不新增案例”，不能在同一片里放开。
- 暂不补 `fantasy-pet-kmp` 细节，避免把 Pet 叙事扩得太散。
- 暂不统一 Ozon “Chrome MV3 / WXT” 细节，现有表述不影响理解。
- 暂不做任何 UI/CSS 调整。

## Approved First Narrow Implementation Slice

第一片只做“Pet Workspace 公开文案脱敏用词修正”：

1. 在 `src/App.tsx` 中查找公开可见的具名联调环境文案。
2. 将 Pet Workspace 案例里的具名环境表述泛化为“本地容器替代环境”或“本地替代联调环境”。
3. 不改变 Pet 的架构含义：仍然保留生成管线、QA Gate、人审发布、App API、Android 验证这些重点。
4. 不修改 reference-projects。
5. 不新增项目、案例、博客。
6. 修改后运行敏感词扫描，确认公开源码里不再出现具名联调环境词（如果历史归档/流程文档里仍出现，需要标注是否属于工作流证据而非站点公开文案）。

## Expected Files

- `src/App.tsx`
- `.agent-work/verification.md`

## Explicit Non-actions

- 不新增 xunqiu 案例。
- 不改 Ozon 内容。
- 不扩展 Pet 技术细节。
- 不重写页面结构或样式。
- 不提交/推送，除非用户或 Controller 明确进入 ship step。

## Verification Gate

实施后必须执行：

```bash
npm run lint
npm run build
```

还需执行：

- `rg -n -e <具名联调环境> src/App.tsx src/data/portfolio.ts`
- 如有流程文档命中，人工判断是否为内部流程证据；公开站点源码不得命中。

## Next Builder Prompt

Builder 下一轮只执行 approved first narrow implementation slice。不要新增 xunqiu case，不要顺手改 Ozon/Pet 其他内容。
