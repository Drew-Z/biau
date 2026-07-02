# 公开助手产品体验与模型接入落地补强

## Goal

在已有 `/chat/public` 和 `PublicAssistantWidget` 的基础上，把公开助手从“有模型接入点的浮窗”补强为访客可理解、部署者可配置、失败可诊断、仍然安全受限的正式产品入口。

## Current Evidence

- 后端已有 `POST /chat/public`，会检索 `server/data/public-knowledge.json` 并调用 `generateAnswer`。
- `server/src/model.ts` 已支持 OpenAI-compatible `/chat/completions`，当前环境变量是 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`。
- 前端 `PublicAssistantWidget` 通过 `VITE_CHAT_API_BASE_URL` 调后端；未配置时回退到本地 `publicKnowledgeBase`。
- `.env.example` 已提示前端不能暴露模型 key，但配置名偏通用，部署者不容易看出这是公开助手模型通道。
- 当前 UI 能显示 `model/fallback` 和 citation 数，但状态较技术化，失败原因对访客和部署者都不够清晰。

## Requirements

- 不配置、不读取、不提交任何真实 API key、真实中转地址、生产后台地址或账号密码。
- 保留前端只调用站内 assistant API 的安全边界；模型密钥只允许在服务端环境变量里出现。
- 增加更明确的公开助手模型接入点命名，优先支持 `ASSISTANT_MODEL_*`，同时兼容当前 `OPENAI_*` env，避免现有部署立即失效。
- 后端返回非敏感 `meta`，让前端能区分：
  - `model`：模型生成成功；
  - `fallback`：未配置模型或模型失败，使用公开知识摘要；
  - 非敏感 provider/model 标签；
  - citation 数量。
- 模型失败时继续返回 fallback，但要在服务端保留非敏感 failure reason/code 给前端状态使用，不能暴露 base URL、key、原始 provider body 或 prompt。
- 公开助手 UI 要更像正式产品：
  - 入口文案表达“公开知识问答”，不暗示可访问私有资料；
  - header 状态区区分“AI 辅助已启用 / 公开知识兜底 / 服务暂不可用”；
  - 回答 bubble 展示模式、模型标签、引用数量；
  - 错误态提供下一步，比如浏览项目页/知识页，而不是只说失败；
  - 保持移动端不遮挡主要内容，文本不溢出。
- 更新 `.env.example` 和相关文档/任务记录，说明部署时如何接入模型。

## Acceptance Criteria

- [x] `server/src/env.ts` 支持 `ASSISTANT_MODEL_API_KEY`、`ASSISTANT_MODEL_BASE_URL`、`ASSISTANT_MODEL_NAME`、`ASSISTANT_MODEL_PROVIDER`，并兼容旧 `OPENAI_*`。
- [x] `server/src/model.ts` 在不暴露敏感信息的前提下返回模式、模型标签、provider 标签和 fallback reason。
- [x] `POST /chat/public` 与 `POST /chat/internal` 的 `meta` 均保持向后兼容，并携带可展示的非敏感状态。
- [x] `PublicAssistantWidget` 的首屏、状态、回答 meta、错误态更像正式产品，不把公开助手包装成通用聊天。
- [x] `.env.example` 明确公开助手模型接入点，真实 key 仍只能放在部署环境或 `.env.local`。
- [x] 验证通过：`npm.cmd run assistant:index`、`npm.cmd run server:build`、`npm.cmd run server:smoke`、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build`、必要时 `npm.cmd run check:ui`。
- [x] `git diff --check` 和 changed-file sensitive scan 通过。

## Out Of Scope

- 不配置真实生产模型。
- 不发 live model 测活请求。
- 不把公开助手升级为内部助手、通用聊天或私有仓库问答。
- 不做账号体系、长期会话、消息持久化或配额计费。
