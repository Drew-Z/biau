# 主站项目展示闭环审计与修复 - Implement

## Checklist

1. 加载 `trellis-before-dev` 和相关 frontend spec。
2. 修改 `ProjectsPage.openProjectDetail`，移除 `project.detailLink` 外跳分支，统一 `navigate(`/projects/${project.id}`)`。
3. 视需要补充简短注释或变量名，让语义明确为“主站详情”。
4. 运行验证：
   - `git diff --check`
   - 敏感信息扫描
   - `npm.cmd run lint`
   - `npm.cmd run build`
   - `npm.cmd run check:ui`
5. 提交并推送 `blog-semi/main`。
6. 归档本 child task，并记录下一项候选。

## Risk / Rollback

- 风险集中在 `src/pages/ProjectsPage.tsx` 的导航逻辑。
- 回退方式是反向 patch 本轮变更；不使用破坏性 git 命令。
