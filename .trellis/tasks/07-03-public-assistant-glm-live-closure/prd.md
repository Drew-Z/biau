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

- [ ] 明确记录公开助手当前线上接入状态：fallback、model-ready、model-live 或 blocked。
- [ ] 本地 `cf-assistant:smoke` 或等效检查覆盖 fallback、模型成功和 provider failure fallback。
- [ ] 如果线上未接入模型，PRD/文档列出用户需要在平台后台配置的变量和验证 URL。
- [ ] 如果线上已接入模型，记录低敏验证证据，不输出 key。
- [ ] UI 默认打开状态保持简洁，不再弹出大段默认说明。
- [ ] 主站项目详情、助手知识和状态页只描述已验证能力。

## Notes

- 推荐第一步：检查线上 `/api/health` 是否返回 JSON，以及 `modelConfigured` / `mode` 状态；若返回首页 HTML 或 404，先处理 Cloudflare Functions 部署问题。
