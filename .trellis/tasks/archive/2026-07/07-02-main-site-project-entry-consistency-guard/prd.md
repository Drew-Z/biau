# Main site project entry consistency guard

## Goal

审计主站是否已经有自动检查覆盖“项目卡片进入详情、项目按钮/外链打开外部站点、移动端外链不误触发卡片导航、项目详情快捷链接保持可见”的一致性要求。

## Requirements

- 不重复新增已有检查，避免 `scripts/check-ui.mjs` 变成重复断言堆叠。
- 基于当前 `scripts/check-ui.mjs` 的真实实现判断覆盖范围。
- 如果已有覆盖足够，本任务不改代码，只记录结论并归档。
- 如果发现缺口，才补充最小 UI 检查。

## Acceptance Criteria

- [x] 确认首页轮播卡片点击会导航到项目详情。
- [x] 确认首页轮播外部动作按钮键盘激活不会导航详情，而会打开外部链接。
- [x] 确认 `/projects` 项目卡片可键盘进入详情。
- [x] 确认移动端项目卡片 footer 外链可见，且点击外链不触发卡片详情导航。
- [x] 确认项目详情页 header quick links 在截图前可见，外部/内部链接 affordance 正确。
- [x] 确认 Xunqiu 项目详情暴露“产品展示页 / 技术文档 / 阶段 APK”快捷链接。
- [x] 当前无需新增代码；`npm.cmd run check:ui` 已在本轮 Playlab 子任务后通过。

## Notes

- 审计结论：`scripts/check-ui.mjs` 已覆盖用户关心的项目入口一致性，不需要再新增重复 guard。
