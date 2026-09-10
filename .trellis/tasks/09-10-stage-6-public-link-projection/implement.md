# 执行清单

1. [x] 在修改前用 fixture/纯函数记录当前 raw target 与公开 projection 的差异。
2. [x] 重构 `check-public-links.ts` 的目标收集，复用 `projectPublication` 公开投影；保持网络检查器和低敏输出不变。
3. [x] 为 online、unchecked、planned、case-only、聚合游戏和各类 link intent 补确定性断言。
4. [x] 运行 `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run project-registry:check`、链接投影检查和 `git diff --check`。
5. [x] 用 `npm.cmd run public-links:check -- --json` 做只读现场检查；记录当前 Node 网络限制，不发布 snapshot。
6. [ ] 按白名单检查 diff，提交并归档子任务，再返回父路线图。
