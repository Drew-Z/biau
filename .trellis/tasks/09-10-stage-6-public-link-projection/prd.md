# 公开链接巡检与公开 projection 对齐

## Goal

让 `public-links:check` 检查公开页面实际可见的链接投影，避免把已被 publication 门禁替换为站内状态入口的原始 `entry` URL 误报为公开断链，同时保留文档、仓库、证据和 status 链接的巡检。

## Evidence

- `scripts/check-public-links.ts:152-172` 直接遍历 hero/portfolio 原始链接。
- `src/data/projectPublication.ts:254-289` 提供现有公开链接投影。
- `src/components/ProjectCard.tsx:29-31`、`src/pages/ProjectDetailPage.tsx:75-77,270-310` 使用该投影渲染公开页面。
- 2026-09-10 Node 链接检查为 43 个目标、37 个失败；其中若干目标在公开页面已不可见。

## Scope

- `scripts/check-public-links.ts`：按公开 projection 收集 hero action、项目卡片/详情链接、正文链接和视觉来源。
- 必要的确定性检查脚本或既有链接检查断言：覆盖 online、unchecked、planned、case-only、缺失 publication 和聚合游戏项目。
- 本任务资料和验证记录。

## Out Of Scope

- 不改变 `projectPublications` 的 availability/access、任何 URL、项目内容、助手知识、状态快照或生成 payload。
- 不改变真实外链的 HTTP 接受规则；403、超时和网络错误仍按原规则报告。
- 不调用真实模型、生产服务或写入公开状态快照。

## Acceptance Criteria

- [ ] `public-links:check` 的目标集合与当前公开 React 投影一致。
- [ ] `unchecked`/`planned`/`offline`/`case-only` 的 `entry` 不再作为外部目标，替换出的站内 status/planning 链接仍可检查。
- [ ] 可见的 documentation、repository、evidence 和聚合游戏 entry 链接仍被检查。
- [ ] 确定性回归证明上述边界，且不依赖外部网络或真实模型。
- [ ] `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run project-registry:check`、相关链接投影检查和 `git diff --check` 通过。

## Rollback

只回滚本任务的脚本、检查和任务资料；不触碰现有公开数据和保护状态。
