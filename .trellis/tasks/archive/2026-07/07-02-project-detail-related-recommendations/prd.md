# 项目详情相关推荐质量优化

## Goal

优化主站项目详情页底部“同类项目”推荐，让访客在看完一个项目后能继续跳到更相关的项目。当前逻辑只按 `category` 取前三个，导致单类目项目如 `ozon-erp`、`xunqiu` 没有推荐，也没有利用技术栈、公开博客关联和项目状态。首版只做低风险推荐评分，不改项目事实内容、不改公开链接、不引入后端。

## Evidence

- `src/pages/ProjectDetailPage.tsx` 当前 `related` 逻辑：`projects.filter((p) => p.id !== project.id && p.category === project.category).slice(0, 3)`。
- 当前抽样结果：
  - `ozon-erp` 无推荐。
  - `xunqiu` 无推荐。
  - `biau-playlab` 只推荐 `blog-semi`，但它和其他游戏项目也有强关联。
- `src/data/blogCuration.ts` 已有 `getProjectBlogPosts(projectId)`，能说明多个项目是否共享同一篇公开延展阅读。
- `src/data/portfolio.ts` 项目数据已有 `category`、`status`、`stack`、`links` 等公开安全字段。

## Requirements

- 新增更稳的项目详情推荐逻辑：
  - 保留同 category 的强相关性。
  - 利用共享公开博客阅读建立关联，例如 Playlab 游戏共用 `game-showcase-standard`。
  - 利用共享技术栈建立关联，例如 PostgreSQL、Cloudflare Pages、Godot、Android、Vite、TypeScript 等。
  - 重点展示项目可获得适度权重，但不能压过真实关联。
  - 排序稳定：分数相同按原项目顺序，避免 UI 抖动。
- 详情页推荐标题应更准确：
  - 当推荐中包含跨 category 项目时，不继续叫“同类项目”，改为“相关项目”。
  - 全部同 category 时可保留“同类项目”。
- 至少保证 `ozon-erp` 和 `xunqiu` 详情页不再出现空推荐。
- 不新增不真实的项目关系字段、不改项目描述事实、不公开私有地址。
- 不改变项目卡片、首页卡片、博客详情页已有行为。

## Acceptance Criteria

- [x] `ProjectDetailPage` 使用评分推荐而不是只按 category 取前三。
- [x] `ozon-erp` 与 `xunqiu` 至少各有 1 个相关项目推荐。
- [x] 推荐结果最多 3 个，且不包含当前项目。
- [x] 跨 category 推荐标题显示“相关项目”，纯同 category 推荐标题显示“同类项目”。
- [x] 验证通过：推荐逻辑抽样脚本、`npm.cmd run lint`、`npm.cmd run build`、`git diff --check` 和敏感信息扫描。

## Notes

- 这是访客可见的小步体验优化，不涉及部署、外部服务、账号或生产数据。

## Validation Log

- `npx tsx` 抽样断言通过：所有项目推荐最多 3 个、不包含自身；`ozon-erp`、`xunqiu` 均有推荐；跨 category 与同 category 标题符合预期。
- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过；Vite 输出既有动态导入 chunk 提示，不影响构建。
- `git diff --check` 通过，仅输出 Windows 行尾提示。
- 敏感信息扫描仅命中父任务 slug、规范安全提示和任务扫描示例里的规则文字，均为误报；本次源码与任务记录未新增密钥或私有地址。
