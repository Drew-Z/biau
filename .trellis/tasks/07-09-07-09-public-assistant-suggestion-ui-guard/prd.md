# Public assistant suggestion UI guard

## Goal

为公开助手新增的“人工 gate 怎么处理”建议按钮补 UI 回归断言，确保后续重构不会把状态 gate 处理入口从公开助手面板中误删。

## Requirements

- `check:ui` 应在公开助手面板打开后验证“人工 gate 怎么处理”建议按钮可见。
- 断言应使用公开助手实际按钮文本，不引入新的硬编码路由或敏感数据。
- 不改变助手行为、知识内容或模型调用路径。

## Acceptance Criteria

- [ ] `npm.cmd run lint` 通过。
- [ ] `npm.cmd run check:ui` 通过。
- [ ] 公开助手初始面板仍保持简洁，不自动产生默认聊天气泡或引用卡。

## Notes

- 这是父任务 `.trellis/tasks/07-08-production-acceptance-manual-gates-closure` 下的轻量测试护栏任务。
