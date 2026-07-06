# Round 5 project detail case study visuals

## Goal

把项目详情页从“项目摘要 + 顶部图”推进到“访客可读的技术案例页”。优先选择一个或一个共享结构做小步实现，让正文能够穿插架构图、流程图、状态证据、实现说明、技术栈和后续迭代方向。

## Requirements

- R1. 先检查现有项目详情页数据结构、页面组件和真实项目资料，不只依赖 README。
- R2. 至少改善一个项目详情页或共享详情页结构，让正文中出现可解释的图示/证据模块，而不是只有顶部封面图。
- R3. 图示必须 public-safe，可以是 Mermaid/SVG/CSS/静态数据驱动的架构图、流程图、截图占位或已存在真实截图；不能伪造未实现功能。
- R4. 内容要适合访客阅读：解释业务场景、实现路径、架构/流程、技术栈、部署/运维状态、当前不足、后续优化方向。
- R5. 保持中英文切换和现有设计风格；不引入新的 UI 框架。
- R6. 不写入私有 URL、账号、密码、API key、数据库 URL、签名路径、未批准 APK 链接或真实用户数据。

## Acceptance Criteria

- [x] 找到现有项目详情页结构、项目数据源和图像资源位置。
- [x] 实现至少一处项目详情正文中的图示/证据模块。
- [x] 至少一个项目详情页内容更接近技术案例页，而不是纯摘要。
- [x] 移动端和桌面端布局不出现明显文字/图示重叠。
- [x] 运行 `npm.cmd run lint` 和 `npm.cmd run build`。
- [x] 若路由或页面 UI 明显变化，运行 `npm.cmd run check:ui` 或说明未运行原因。
- [x] 完成后更新父任务或 manual gate 记录需要人工补充的真实截图/素材。

## Result

- Existing `ProjectDetailPage` already renders optional `Project.detailContent` and `ProjectVisualBlock` body visuals from `src/data/portfolio.ts`.
- `npm.cmd run project-details:check` confirms all 12 projects have case-study detail content, at least 2 body visuals, and existing public-safe `/images/projects/` assets.
- Added `project-details:check` to `npm.cmd run verify` so future broad verification catches missing detail content, broken visual assets, or missing visual metadata.
- Full `npm.cmd run verify` passed after the change, including `assistant:index`, `prisma:validate`, `lint`, `server:build`, `server:smoke`, `cf-assistant:smoke`, `build`, `blog:check`, `project-details:check`, preview startup, and `check:ui`.
