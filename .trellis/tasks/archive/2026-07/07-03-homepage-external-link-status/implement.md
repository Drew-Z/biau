# 主页外链可用性检测与状态展示页 - Implementation Plan

## Checklist

- [x] 读 Trellis 前端规范、脚本相关质量规则和当前任务文件。
- [x] 新增公开状态目标数据模块。
- [x] 新增生成状态 JSON 的 Node 脚本，并加入 `package.json` script。
- [x] 生成初始 `public/status/site-status.json`。
- [x] 新增 `/status` React 页面，读取状态 JSON 并提供无数据 fallback。
- [x] 接入 `src/App.tsx`、`src/utils/seo.ts`、`src/components/Navigation.tsx`。
- [x] 更新 `scripts/generate-sitemap.mjs` 并重新生成 `public/sitemap.xml`。
- [x] 补充或扩展 UI 检查，覆盖状态页基础可见性。
- [x] 运行验证命令并修复问题。
- [ ] 标记 PRD 验收项、提交、推送、归档、写 journal。

## Validation Commands

```powershell
npm.cmd run site:status
npm.cmd run sitemap:generate
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

## Review Points

- 状态页不能把字体资源根路径 404 视为项目入口失败。
- 状态页不能承诺 SLA，只能展示最近一次公开入口检测结果。
- 所有外链按钮必须 `target="_blank"` 且 `rel="noopener noreferrer"`。
- 不提交任何真实模型 key、账号、密码、后台 URL、数据库连接串或私有部署信息。

## Rollback

- 删除新增状态数据、页面、脚本、路由和 sitemap 项。
- 恢复 `package.json`、`src/App.tsx`、`src/utils/seo.ts`、`src/components/Navigation.tsx`、`scripts/generate-sitemap.mjs`。
