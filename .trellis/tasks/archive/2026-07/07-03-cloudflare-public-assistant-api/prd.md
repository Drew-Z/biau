# Cloudflare public assistant API

## Goal

让 Cloudflare Pages 上的公开助手具备同域模型接入路径：前端可以把 `VITE_CHAT_API_BASE_URL` 配置为 `/api`，由 Pages Functions 在服务端读取 `ASSISTANT_MODEL_*` 私有环境变量调用 GLM/OpenAI-compatible 模型，避免公开助手必须先部署独立 Render API 才能接入大模型。

## Background

- 当前主站部署在 Cloudflare Pages。
- 公开助手前端已经只通过 `VITE_CHAT_API_BASE_URL` 调用助手 API，不会在浏览器暴露模型 key。
- 线上截图显示公开助手仍处于本地公开知识模式，说明模型通道没有接上。
- Cloudflare 官方文档说明 Pages Functions 可在项目根目录 `functions/` 中提供动态功能，并支持 TypeScript 与环境变量绑定。

## Requirements

- 新增 Cloudflare Pages Functions：
  - `GET /api/health`：返回公开助手 API 状态与是否配置模型。
  - `POST /api/chat/public`：接收 `{ message }`，检索公开知识，若配置 `ASSISTANT_MODEL_*` 则调用 OpenAI-compatible chat completions。
- 复用 `server/data/public-knowledge.json` 的公开知识，不新增私有知识源。
- 未配置模型、模型失败或无公开上下文时，返回与现有前端兼容的 fallback payload。
- 不在仓库写入真实 GLM key、真实中转 URL、账号密码、数据库连接串或私有后台地址。
- 更新部署文档与 `.env.example`，说明 Cloudflare Pages 推荐配置 `VITE_CHAT_API_BASE_URL=/api`，模型变量放 Pages runtime secrets/variables。
- 不改变内部助手数据库、邀请码、管理页和 Express API 的现有能力；Render API 路线继续作为内部助手/完整 API 选项保留。

## Acceptance Criteria

- [x] `functions/api/health.ts` 和 `functions/api/chat/public.ts` 存在并返回前端兼容 payload。
- [x] 本地 Node 校验脚本或 smoke 能覆盖 Cloudflare public chat function 的 fallback、mock model success、provider failure。
- [x] 前端 `.env.example` / 文档推荐 Cloudflare 同域 `/api` 接入，不暴露模型 key。
- [x] `npm.cmd run assistant:index`、相关 function smoke、`npm.cmd run lint`、`npm.cmd run build` 通过。
- [x] `git diff --check` 与敏感扫描通过。

## Out of Scope

- 不把内部助手迁移到 Cloudflare Functions。
- 不配置 Cloudflare 线上环境变量；这一步需要用户在 Pages 后台设置。
- 不发布真实模型 key 或真实中转 base URL。
