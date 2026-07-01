# 项目案例证据刷新与主站同步

## Goal

持续刷新 `blog-semi` 项目案例页，让访客看到的实现、架构、技术栈、验证方式、当前边界和后续优化方向与各项目仓库的真实状态一致。

## Requirements

- 证据来源优先读取当前代码、脚本、测试、部署文档、数据文件和近期提交，不只依赖 README。
- 第一批巡检项目：
  - `D:\workspace4Cursor\erp`
  - `D:\workspace4Cursor\legal-rag`
  - `D:\workspace4Codex\xunqiu-backend-modern`
  - `D:\workspace4Codex\xunqiu\xunqiu-showcase-site`
  - `D:\workspace4Cursor\pet\gamer`
  - `D:\workspace4Cursor\game\blog`
  - 主要游戏项目目录，如 `space-war`、`game-first-tetris`、`game-next-spacewar`、`intespace`、`raiden-prototype`、`spacewar II`
- 更新范围优先在 `blog-semi`：
  - `src/data/portfolio.ts`
  - `server/data/public-knowledge.json`
  - `public/sitemap.xml`
  - 必要时补充 `content-drafts/` 证据记录
- 不公开真实账号、密钥、生产数据库连接串、私有后台地址、签名文件路径或未确认可公开的部署细节。

## Acceptance Criteria

- [x] 至少刷新一个项目案例页，且每个新增事实都能追溯到仓库证据。
- [x] 更新公开助手知识和 sitemap。
- [x] 运行 `npm.cmd run assistant:index`、`npm.cmd run sitemap:generate`、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build`。
- [x] 明确记录未处理项目、后续优化方向和人工审核 gate。

## Notes

- Evidence read:
  - `src/App.tsx`
  - `src/data/portfolio.ts`
  - `src/data/blogCuration.ts`
  - `src/data/assistant.ts`
  - `scripts/generate-assistant-knowledge.ts`
  - `scripts/generate-sitemap.mjs`
  - `scripts/verify.mjs`
  - `package.json`
  - `README.md`
  - `public/images/projects/showcase/blog-semi-*.png|webp`
- Change made:
  - Refreshed `blog-semi` project with real showcase image, expanded public stack/highlights, additional related reading links, full `detailContent`, and `assistantContext`.
  - Regenerated `server/data/public-knowledge.json`.
  - Ran sitemap generation; `public/sitemap.xml` had no content diff because project/blog URLs did not change.
- Validation:
  - `npm.cmd run assistant:index`: passed, generated 23 public knowledge items.
  - `npm.cmd run sitemap:generate`: passed, generated 25 URLs.
  - `npm.cmd run blog:check`: passed.
  - `npm.cmd run lint`: passed.
  - `npm.cmd run build`: passed with existing Vite ineffective dynamic import warnings.
  - `npm.cmd run check:ui` with temporary preview server at `http://127.0.0.1:5174`: passed.
  - `git diff --check`: passed.
  - Sensitive scan over changed public data and task files: only existing frontend token variable names were matched; no secret values were found.
- Not handled in this child:
  - Deeper evidence refresh for `erp`, `legal-rag`, `xunqiu`, `pet/gamer`, `game/blog`, and individual game repositories remains in the parent backlog.
  - Publishing or deleting blog content remains a human review gate.
