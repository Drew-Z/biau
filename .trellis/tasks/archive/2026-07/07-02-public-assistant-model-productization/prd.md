# 公开助手模型接入产品化

## Goal

把 BIAU Port 右下角公开助手从“本地公开知识 fallback 小工具”升级为“可接入真实模型、仍受公开知识边界约束、具备产品化状态反馈”的公开问答入口。

## Confirmed Facts

- 后端已有 `/chat/public`。
- `server/src/model.ts` 已支持 OpenAI-compatible `/chat/completions`：
  - `OPENAI_API_KEY`
  - `OPENAI_BASE_URL`
  - `OPENAI_MODEL`
- 未配置模型时会 fallback 到公开知识摘要。
- 前端 `PublicAssistantWidget` 已支持 `VITE_CHAT_API_BASE_URL`，未配置时用本地 `publicKnowledgeBase`。
- 公开助手只能回答站点公开内容，不应变成通用聊天或暴露内部助手能力。

## Requirements

1. 明确模型接入点，不在前端暴露 API key：
   - 服务端通过 `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` 配置。
   - 前端只配置 `VITE_CHAT_API_BASE_URL` 指向站内 assistant API。
2. `/chat/public` 响应应返回非敏感元信息，让前端能展示：
   - 当前回答来自 `model` 还是 `fallback`。
   - 使用的非敏感模型名或 `fallback`。
   - citation 数量。
3. 公开助手 UI 更像正式产品：
   - 明确“公开知识问答 / model-assisted when configured”状态。
   - 展示引用数量和回答模式。
   - 保留引用卡片、建议问题、错误兜底。
4. 模型请求失败时不能让 UI 空白，仍返回公开知识 fallback。
5. 更新文档/任务记录，说明如何接入中转模型，但不写真实 key。
6. 保持现有 smoke/UI 检查通过。

## Acceptance Criteria

- [ ] `ChatResponse` 包含非敏感 `meta`。
- [ ] `/chat/public` 在模型配置/未配置时都有稳定响应。
- [ ] 前端公开助手能展示“模型辅助 / 本地知识兜底”状态和引用数量。
- [ ] 文档说明接入点和 env 变量，不包含真实 key。
- [ ] `npm.cmd run assistant:index`、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run server:build`、`npm.cmd run server:smoke`、`npm.cmd run check:ui` 通过。
- [ ] `git diff --check` 和 changed-file sensitive scan 通过。

## Out Of Scope

- 不在本任务中配置真实生产 API key。
- 不并发调用模型中转站。
- 不把公开助手扩展成内部助手或通用聊天。
- 不记录完整 prompt、API key 或用户敏感内容到公开日志。
