# Public assistant UI and recovery polish

## Goal

Fix history drawer layering, select contrast, fullscreen layout, edit composer containment, and premature fallback degradation without live provider probing.

## Requirements

- 历史会话作为助手内部模态层显示，抽屉必须使用不透明表面，底层标题、消息和控制不得穿透或叠字。
- “资料范围”原生选择器在深浅主题及浏览器原生弹出菜单中都必须保持可读，不出现白底白字。
- 桌面全屏应使用稳定的居中内容列，只有消息区滚动；标题、设置、建议和输入区不得散落到视口边缘。
- 问题编辑器必须约束在所属用户消息内；全屏和窄屏下 textarea、取消与发送修改按钮不得溢出或拉宽消息列。
- 主通道与两个备用模型共享最多三次生成尝试。备用提供商的第一个模型若返回能力或模型相关常见的 `400/422`，允许继续到同故障域内的第二个模型；取消、策略拒绝、`409/413` 等请求级永久错误仍停止。
- 模型顺序使用真实请求驱动的进程内自适应路由：稳定主通道保持质量优先；失败通道短期熔断，最近可用通道自动接管；冷却结束后由下一次真实请求半开恢复。打开助手不得触发模型请求、目录查询或测活。
- 不执行真实模型、搜索、向量库或重排服务测活；所有恢复行为使用本地 fixture 验证。
- 保持现有匿名会话、分支、修订、反馈、焦点恢复和移动端首次打开契约不变。

## Acceptance Criteria

- [ ] 历史抽屉背景完全不透明，拥有独立层叠上下文；桌面和 390px 下无底层文字穿透。
- [ ] `select` 与 `option` 使用高对比前景/背景，并声明与主题一致的原生控件色彩方案。
- [ ] 1440x900 桌面全屏中主内容列居中且宽度受限，消息区占据剩余高度并独立滚动，输入区稳定留在底部。
- [ ] 320/390/430px 下问题编辑器、操作按钮、历史抽屉和输入区均在视口内，无横向滚动或遮挡。
- [ ] 确定性测试证明主通道失败后可进入备用通道，备用模型一的 `400/422` 可继续到备用模型二，同时永久错误不会扩大重试。
- [ ] 确定性测试证明失败通道在冷却期内被降序、可用通道保持原质量顺序、冷却到期后恢复基线顺序，排序过程不会产生网络请求。
- [ ] `check:ui`、`assistant:public-agent-check`、`assistant:public-model-check`、`lint`、`build` 和 `git diff --check` 通过。
- [ ] Playwright 桌面和移动端截图复核通过，且部署版本对应本次提交。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
