# Pet App 展示页继续优化

## Goal

继续完善 `D:\workspace4Cursor\pet\gamer\pet-app-showcase-site`，让 Pet App 当前 WIP 状态、截图、下载 gate、质量门禁和主站入口更适合作为访客可读展示页。

## Requirements

- 展示页必须如实标注当前 App 仍在推进中，不能暗示已经完整生产化。
- 使用真实、安全、可公开的 Android 模拟器截图；不使用私有后台截图、密钥、内部部署面板或未脱敏日志。
- APK 区域在没有确认公开签名包前保持“待公开构建”状态，不提供伪造或占位下载链接。
- 可以补充：
  - 本地打开说明。
  - 发布 APK 前检查清单。
  - 主站项目页反向链接或 Cloudflare Pages 部署说明。
  - 截图 alt 文案、移动端布局、下载 gate 视觉层次。
- 避免触碰 `pet/gamer` 里既有 unrelated dirty pagination files，除非用户明确要求。

## Acceptance Criteria

- [x] 展示页能本地打开，截图路径有效。
- [x] APK gate、WIP 边界和人审发布链路表达清楚。
- [x] `pet/gamer` 的既有 unrelated dirty files 不被回滚或混入本任务提交。
- [x] 如同步主站，`blog-semi` 需要更新项目页、助手知识和 sitemap，并通过相关检查。

## Notes

- 启动前先检查 `pet/gamer` 当前 git 状态，继续把分页相关脏文件视为其他窗口改动。
- Evidence read:
  - `D:\workspace4Cursor\pet\gamer\AGENTS.md`
  - `D:\workspace4Cursor\pet\gamer\docs\agents\domain.md`
  - `D:\workspace4Cursor\pet\gamer\docs\skills\gamer-mobile-community-ui\SKILL.md`
  - `D:\workspace4Cursor\pet\gamer\docs\ui\generation-human-review-flow.md`
  - `D:\workspace4Cursor\pet\gamer\docs\TRACEABILITY-MATRIX.md`
  - `D:\workspace4Cursor\pet\gamer\pet-app-showcase-site\index.html`
  - `D:\workspace4Cursor\pet\gamer\pet-app-showcase-site\styles.css`
  - `D:\workspace4Cursor\pet\gamer\pet-app-showcase-site\README.md`
- Change made in `pet/gamer`:
  - Added a public APK release checklist to the static showcase page.
  - Added BIAU Port project detail and source directory links with safe external-link attributes.
  - Clarified download gate status as human-confirmed and kept the APK button disabled.
  - Expanded README preview, download-policy, and public-link instructions.
- Validation in `pet/gamer`:
  - Local HTML reference check: passed, 6 relative asset references exist.
  - `git diff --check -- pet-app-showcase-site/index.html pet-app-showcase-site/styles.css pet-app-showcase-site/README.md`: passed.
  - Sensitive scan over `pet-app-showcase-site/`: no matches.
  - `git diff --cached --check`: passed before commit.
  - Commit: `7d4525d feat(app): clarify pet showcase release gate`.
  - Push: `origin/cursor-windows-migration` now matches local `7d4525d1c127374cb31ba5e01a6a2f5c9690f1ad`.
- Unrelated dirty files intentionally left untouched in `pet/gamer`:
  - `services/community-api/src/postgres-store.js`
  - `services/community-api/src/routes.js`
  - `services/community-api/src/store.js`
  - `services/community-api/src/pagination.js`
  - `services/community-api/src/pagination.test.js`
  - `test-out.txt`
- No `blog-semi` project-page sync was required in this child because the main site already records the Pet showcase source and WIP APK gate; the follow-up changed only the Pet static page.
