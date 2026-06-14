# Codex Controller Review

Date: 2026-06-14
Repo: /home/zhang/workspace/blog-semi
Reviewed: .agent-work/current-task.md, .agent-work/adoption-audit.md, .agent-work/cc-plan.md, src/data/portfolio.ts, src/App.tsx, /mnt/d/workspace4Codex/ques/fanhui.txt

## Verdict

方向有价值，但不批准按 CC 计划原样实施。

CC 计划正确抓住了“内容补全、脱敏、详情页区分度、路由清晰度”这条主线，也正确避免了先拆 App.tsx、先重做全站 UI、先扩展无关项目。但计划里的第一个切片“补充 Ozon ERP 项目详情内容”已经落后于当前源码状态：`getProjectStructure`、`getProjectDetailContent`、`caseStudies` 中已经存在 Ozon ERP、Pet Workspace、xunqiu 和 Godot 展示体系的主要内容。

因此，本轮不应该重复实现 Ozon 详情，而应该进入“对照当前实现查漏补缺 + 小范围页面区分和按钮语义修正”。

## Accepted From CC Plan

- 保持项目为生产级官网/产品展示系统，不写成作品集口吻。
- `fanhui.txt` 只作为参考材料，不替代当前源码和真实项目目录。
- 不新增或扩展 `douyu`、`yihuan-helper`、`ques`。
- 不修改 `/home/zhang/workspace/reference-projects`。
- 第一轮不做大规模重构，不拆 `App.tsx`，不重做全站 UI。
- 继续把项目详情页定义为技术视角，把案例详情页定义为业务视角。
- Ozon ERP、Pet Workspace、xunqiu 必须持续做脱敏检查。

## Required Corrections

1. 当前展示项目是 11 个，不是 12 个。不要为了凑数量新增项目。
2. 案例数据目前在 `src/App.tsx` 的 `caseStudies` 中，不在 `src/data/portfolio.ts`。
3. Ozon ERP、Pet Workspace、xunqiu 的项目详情内容已经存在，不能把“新增这些详情”作为第一片。
4. `godot-showcase` 案例已经存在，不能再作为新增项处理。
5. CC 输出带了外层说明和 fenced code block，后续 Builder 输出应直接写原始 Markdown 内容。
6. 第一轮实施不能包含新增博客文章，博客扩展应作为后续单独任务。

## Approved First Narrow Slice

第一片改为：项目页与案例页的“现状校准和小范围体验修正”。

目标：在不重构、不扩范围的前提下，让已有项目详情和案例详情更容易被用户感知为“已经跳到新页面”，并让项目/案例按钮的语义更清楚。

### Scope

- 对照当前 `src/App.tsx` 和 `src/data/portfolio.ts`，确认 Ozon ERP、Pet Workspace、xunqiu、Godot 展示体系内容是否已经覆盖项目目录里的真实信息。
- 只补明显缺失或表述不准的公开内容，不重写整段文案。
- 优化项目列表、项目详情、案例列表、案例详情之间的按钮文案和页面提示，让“列表预览”和“详情页”区别更明显。
- 必要时小范围调整 `src/App.css` 的间距、标题层级或详情页视觉区分，但不要重做页面体系。

### Expected Files

- `src/App.tsx`
- `src/data/portfolio.ts`（仅在确有文案/数据缺口时）
- `src/App.css`（仅在详情页视觉区分或间距确实需要时）
- `.agent-work/verification.md`（记录验证结果）

### Explicit Non-actions

- 不拆 `App.tsx`。
- 不新增项目。
- 不新增博客文章。
- 不新增案例，除非用户明确要求。
- 不接入真实试玩包。
- 不修改 reference-projects。
- 不复制真实账号、IP、API、数据库连接、订单号、签名文件路径或生产部署细节。

## Verification Gate

实施后必须执行：

```bash
npm run lint
npm run build
```

UI 检查至少覆盖：

- `/projects`
- `/projects/ozon-erp`
- `/cases/ozon-erp`
- `/projects/pet-workspace`
- `/cases/pet-workspace`
- `/projects/xunqiu`
- `/cases/godot-showcase`

检查点：

- 从列表页点击按钮后，详情页有明显不同的首屏和路由提示。
- 项目详情页讲技术栈、目录、模块和实现方式。
- 案例详情页讲业务场景、方案、结果和证据。
- 浅色/暗色主题下标题、段落、按钮间距不挤压。
- 没有混入敏感信息。

## Next Builder Prompt

Builder 下一轮应只执行 approved first narrow slice。开始前先读本 review，再读当前源码，不要照抄 cc-plan 的第一个切片。
