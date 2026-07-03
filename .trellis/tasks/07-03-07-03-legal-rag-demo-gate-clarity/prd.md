# Legal RAG demo gate clarity

## Goal

让主站访客在进入 Legal RAG 演示前就能理解：线上工作台入口是正确的，但它默认有登录门禁；只有部署环境配置了低权限公开 demo 凭据时，登录页才会显示“公开演示凭据”和填入按钮。主站不能公开真实后台密码，也不能让访客误以为当前入口是免登录可用。

## Requirements

- 更新主站 Legal RAG 项目详情或状态相关公开文案，明确：
  - 演示入口：`https://legal-rag-web.onrender.com`。
  - 未显示公开演示凭据时，代表该入口仍是受控演示，需要由站点维护者在部署环境配置低权限 demo 凭据。
  - Web 侧 `VITE_PUBLIC_DEMO_PASSWORD` 只允许放可公开、低权限、可轮换的 demo 密码；API 侧认证密码必须同步配置，但真实后台/管理员密码不能写入文章、项目页或状态 JSON。
  - 质量面板、法律问答和合同审查仍然属于登录后的演示路径。
- 更新公开助手知识或项目数据中相关事实，让用户询问“法律项目怎么进入/为什么登录失败”时能给出安全说明。
- 不新增真实密码、账号以外的敏感信息、Render 后台链接、数据库 URL、模型 key 或内部部署配置。

## Acceptance Criteria

- [x] 主站 Legal RAG 项目详情或状态页能说明登录门禁和公开 demo 凭据 gate。
- [x] 公开助手知识包含 Legal RAG 演示入口与凭据配置边界。
- [x] 运行必要生成脚本后，公开数据不包含真实密码、key、token、数据库 URL 或私有后台地址。
- [x] 通过 `npm.cmd run assistant:index`、`npm.cmd run lint`、`npm.cmd run build`。
- [x] 通过 `git diff --check` 和敏感扫描。

## Notes

- 本任务只改公开说明与知识，不替用户设置 Render 环境变量，不部署，不公开真实密码。
- 2026-07-03: 已更新 `src/data/portfolio.ts`、`src/data/statusTargets.ts` 和 `src/data/assistant.ts`，并重新生成 `server/data/public-knowledge.json` 与 `public/status/site-status.json`。
- 2026-07-03: `npx.cmd tsx` 验证“法律项目怎么进入 / legal rag 登录失败 密码 / 演示凭据在哪里”均优先命中 `project:legal-rag`。
- 2026-07-03: 敏感扫描仅命中安全说明、公开环境变量名和已有 token/password 关键词，无真实密码、key、token、数据库 URL 或后台链接。
