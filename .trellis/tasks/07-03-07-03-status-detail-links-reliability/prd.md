# Status card detail links and reliability observations

## Goal

让 `/status` 顶部入口卡片可以直接跳转到对应项目的可靠性详细状态位置，并继续完善后半段“项目可靠性观察”的信息组织。用户从卡片上看到一个入口可用时，应能一键定位这个入口背后的 health、synthetic、metrics、release gate 等详细检查项。

## Requirements

- 顶部入口卡片新增“详细状态”或等价按钮，跳转到同页对应可靠性项目区域。
- 每个可靠性项目区域应有稳定 anchor，适合从卡片按钮定位。
- 如果一个入口目标有关联 `relatedTargetId`，卡片应能优先定位到对应项目的详细观察区域。
- 可靠性观察继续完善：
  - 每个项目的检查层级、gate、下一步行动要更容易扫读。
  - 不能把 planned / unchecked 误表达成 online。
  - 不公开真实账号、密码、生产 API、模型 key、监控 dashboard、内部 URL 或敏感指标。
- 更新 UI 回归检查，覆盖“详细状态”按钮存在并能定位。

## Acceptance Criteria

- [x] `/status` 入口卡片展示可定位详细状态的按钮或链接。
- [x] 点击/键盘激活详细状态后，页面定位到对应可靠性项目区域。
- [x] 可靠性观察区域的 planned / unchecked / online 语义清晰。
- [x] `npm.cmd run check:ui`、`npm.cmd run lint`、`npm.cmd run build` 通过。
- [x] `git diff --check` 和敏感扫描通过。

## Notes

- 这是用户基于状态页截图提出的体验任务：不要让用户从顶部卡片看到状态后还要手动找后面的可靠性细节。
