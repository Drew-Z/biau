# Assistant Studio AI Daily production closure

## Goal

收口内部助手、Studio 和 AI Daily 的生产工作流：确认 hidden/review-needed 草稿链路、AI Daily issue 详情和发布 gate 可被安全使用，并记录仍需人工配置的平台事项。

## Requirements

- 复查内部助手到 Studio 草稿深链的生产边界，确保 `DATABASE_URL` 与 `STUDIO_DATABASE_URL` 约定仍清楚。
- 检查 Studio 草稿、source item、AI Daily issue、publish export 的公开安全状态。
- AI Daily 自动化只推进到安全草稿/审核态；不自动公开发布。
- 不输出 token、Studio admin token、数据库 URL、模型 provider URL 或真实请求头。

## Acceptance Criteria

- [ ] Studio/AI Daily 当前工作流状态已记录，包含已完成、manual gate 和后续可做项。
- [ ] 如有必要，补强 UI/API/文档以减少误操作或变量混淆。
- [ ] 验证 `studio:smoke` 或等价低敏 API 检查。
- [ ] 不做无意义模型 ping；任何模型调用都有业务产物或验收目的。
