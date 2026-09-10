# 跨域网站体验与项目助手缺口审计

## Goal

在翻译范围暂缓、生产边界保持关闭的前提下，重新检查公开网站的 UI 体验、项目整理和公开助手，找出一个有证据、可独立验收、无需新产品决定的缺口；若没有这样的缺口，明确记录无新问题并结束本子任务。

## Scope

- 公共 UI：`/`、`/projects`、`/blog`、`/status`、`/ai-daily`、`/assistant`、项目详情、博客详情；覆盖 `320/390/430/769/1024/1440`、三主题和中英文，优先检查遮挡、溢出、控件命中、焦点、状态恢复与内容发现。
- 项目整理：核对 `src/data/portfolio.ts`、项目注册/公开 publication 投影、项目详情证据、分类/别名/链接集合和博客关联是否存在重复、孤立或不可解释条目。
- 公开助手：核对 launcher/widget、加载/错误/恢复/分支/历史/引用外壳、API/会话/browser-state 合同，以及 authored/payload 与固定 UI 边界；不调用真实模型或生产服务。

## Acceptance Criteria

- [ ] 保存每个领域的检查命令、范围、结果和证据路径。
- [ ] 仅当问题能给出稳定复现步骤、用户影响、文件/符号定位和最小修复边界时，才提出一个候选修复；不批量创建候选。
- [ ] 若没有满足条件的缺口，明确记录“无新独立缺口”，不修改业务源码、公开数据或生产配置。
- [ ] 所有公开助手检查保持零真实模型调用、零外部请求；保护状态快照保持不变。

## Validation

```powershell
npm.cmd run check:ui:smoke
npm.cmd run blog:discovery-check
npm.cmd run projects:discovery-check
npm.cmd run blog:discovery-ui
npm.cmd run projects:discovery-ui
npm.cmd run reading:navigation-ui
npm.cmd run public-routes:ui
npm.cmd run project-details:check
npm.cmd run project-registry:check
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-conversation-check
npm.cmd run assistant:public-browser-state-check
npm.cmd run ai-daily:public-payload-check
git diff --check
```

## Boundaries and Rollback

- Owned files are this task's PRD, audit/verification notes and parent task bookkeeping only.
- Do not edit `src/`, `public/status/blog-semi-synthetic.json`, production configuration, assistant relay code, AI Daily artifacts, Feed/Cron settings or existing untracked continuous UI materials.
- Audit-only changes can be reverted by removing this child task's notes and restoring the parent bookkeeping; no runtime rollback is required.
