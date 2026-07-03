# 公开助手 GLM 部署验证与产品化收口

## Goal

让主站公开助手从“本地公开知识兜底”推进到“服务端模型增强可验证”的状态，并保持失败时安全回退。

目标不是把模型 key 写进前端，而是确认 Cloudflare Pages Functions 或独立 assistant server 已经能通过服务端环境变量调用 OpenAI-compatible GLM 模型，并在 UI 上表现得像一个正式产品入口。

## Requirements

- 检查当前公开助手接入点：
  - Cloudflare Pages Functions: `/api/health`、`/api/chat/public`。
  - 独立 assistant server: `/health`、`/chat/public`。
  - 前端 `PublicAssistantWidget` 和公开助手页面的状态展示。
- 模型配置只能使用服务端环境变量：
  - `ASSISTANT_MODEL_BASE_URL`
  - `ASSISTANT_MODEL_API_KEY`
  - `ASSISTANT_MODEL_NAME`
  - `ASSISTANT_MODEL_PROVIDER`
- 不在仓库、前端 bundle、文档示例里写入真实 key。
- 未配置模型、模型失败、公开知识置信度不足时，助手必须清楚回退到公开知识，不编造站点事实。
- 线上验证需要区分：
  - 本地 smoke 通过。
  - Cloudflare Pages Functions 已部署。
  - 真实模型环境变量已配置。
  - 公开 URL 返回 model mode。

## Acceptance Criteria

- [x] 明确记录公开助手当前线上接入状态：`blocked-by-deploy`，见 `live-check.md`。
- [x] 本地 `cf-assistant:smoke` 覆盖 fallback、模型成功和 provider failure fallback。
- [x] 线上未接入模型时，部署文档和 `live-check.md` 列出用户需要在平台后台配置的变量和验证 URL。
- [x] 线上尚未进入 model-live；因此没有记录任何真实模型 key 或 provider 私有地址。
- [x] UI 默认打开状态保持简洁，不再弹出大段默认说明；已用 `check:ui` 验证。
- [x] 主站状态数据只描述已验证能力：公开路由 online，公开助手 API offline / Function 未部署或旧部署。

## Notes

- 推荐第一步：检查线上 `/api/health` 是否返回 JSON，以及 `modelConfigured` / `mode` 状态；若返回首页 HTML 或 404，先处理 Cloudflare Functions 部署问题。
- 2026-07-03 检查结论：`/api/health` 返回静态 HTML，`/api/chat/public` 返回 HTTP 405，且线上 HTML 仍是旧 `Biau Labs` shell。需要先在 Cloudflare Pages 重新部署最新 `main` 并确认 Functions 生效，再配置 `ASSISTANT_MODEL_*`。
