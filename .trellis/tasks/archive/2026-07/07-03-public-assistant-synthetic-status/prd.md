# Public assistant synthetic status

## Goal

把主站公开助手同域 `/api` 接入状态纳入 `main-site:synthetic` 和 `/status` 可靠性观察。后续如果 Cloudflare Pages Functions 没部署、模型没配置、模型通道失败或公开助手只能 fallback，状态页应能直接展示，而不是只能通过截图人工判断。

## Requirements

- `scripts/check-main-site-synthetic.mjs` 在现有公开路由检查之外，新增 `blog-semi-public-assistant` synthetic check。
- 检查范围：
  - `GET /api/health` 是否可达并返回 JSON。
  - `POST /api/chat/public` 是否返回 answer、citations、meta。
  - 如果 `meta.mode === "model"`，状态为 `online`。
  - 如果 API 可用但返回 fallback，状态为 `degraded`，summary 说明 fallback 原因。
  - 如果 API 不可达或 payload 无效，状态为 `offline`。
- 不记录真实模型 base URL、API key、provider 私有地址、请求/响应全文或其他敏感信息。
- 生成的 `public/status/blog-semi-synthetic.json` 可被 `site:status` 合并到 `blog-semi-public-assistant`。
- 公开助手 UI 不应在模型未接入或 API fallback 时输出大段长文；fallback 回答要保持短结论、清楚说明未接模型/本地知识状态。
- 部署文档要记录 `/api/health` 返回 HTML 或 `/api/chat/public` 返回 404/405 时的判断：这是 Functions 未部署或未被识别，不是前端已经接入模型。

## Acceptance Criteria

- [x] `npm.cmd run main-site:synthetic -- --base http://127.0.0.1:<preview>` 能生成两个 checks：`blog-semi-public-routes` 和 `blog-semi-public-assistant`。
- [x] 未启动 Cloudflare Functions 的本地 preview 下，公开路由 check 可保持在线，公开助手 check 明确为 offline/degraded 而不是误报 online。
- [x] `npm.cmd run site:status` 合并后，`public/status/site-status.json` 的 `blog-semi-public-assistant` 使用 synthetic 状态与 evidence。
- [x] 打开公开助手默认不出现历史/默认气泡；fallback 回答不再铺满首屏，并明确显示本地知识或未接模型状态。
- [x] `npm.cmd run lint`、`npm.cmd run build` 通过。
- [x] `git diff --check` 与敏感扫描通过。

## Out of Scope

- 不配置 Cloudflare Pages 真实环境变量。
- 不发真实模型请求。
- 不改变 `/status` 页面布局。

## Live Observation

- 2026-07-03 现场检查：`/api/health` 返回 HTML 首页，`POST /api/chat/public` 返回 405，说明当前线上部署没有真正启用同域 Pages Functions；需要代码侧暴露为 offline/degraded，并在部署侧重新确认 Functions 发布与 `ASSISTANT_MODEL_*` 配置。

## Validation

- `npm.cmd run cf-assistant:smoke`: passed.
- `npm.cmd run server:smoke`: passed.
- `npm.cmd run main-site:synthetic -- --base http://127.0.0.1:<preview>`: routes online, assistant offline with 404 API checks.
- `npm.cmd run check:ui`: passed against local preview.
- `npm.cmd run main-site:synthetic -- --base https://biau.playlab.eu.cc`: routes online, assistant offline because health returned non-JSON and chat returned HTTP 405.
- `npm.cmd run site:status`: merged `blog-semi-public-assistant` synthetic evidence into `public/status/site-status.json`.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed; Vite kept existing ineffective dynamic import warnings.
- `git diff --check`: passed with Windows line-ending warnings only.
- Sensitive scan: only placeholder env names and existing token/key handling code were found; no real model key, relay URL, or temporary GLM credential was written.
