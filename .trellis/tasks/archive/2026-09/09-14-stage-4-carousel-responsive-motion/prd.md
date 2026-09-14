# 首页轮播响应式运动

## Goal

让首页项目轮播在同一页面内切换窄屏和桌面布局时，按当前交互模式正确停止或恢复自动滚动与滚轮惯性，使访客不必刷新页面才能继续浏览项目。

## Confirmed Facts

- 基线为 `afc56c09ec3940d9fa725c530a4405687a0079d2`；1599 tracked 文件、原 13 份资料和 37 个已完成子任务完整。509 source / 4 spec / 172 build / 49 实际本地 HTTP 响应与前项交付一致。
- `src/components/RightScrollCards.tsx:70-81` 在首次移动模式时提前退出运动 effect；`syncMotion`（原 151-170 行）和 `tick`（原 108-136 行）没有响应移动模式变化。`src/utils/responsive.ts:1` 的现有判定为 `(max-width: 768px), (pointer: coarse)`。
- 本地 Chromium 三主题各一组窄屏初始样本（320/390/430，覆盖 zh/en）放大至 1440 后，750ms 观察中的自动位移及滚轮后惯性位移均为 0。三个直接桌面初始对照有自动位移，滚轮惯性位移为 43.84–57.03px。
- 三个桌面缩窄样本的 CSS transform 虽为 `none`，内联位置仍在更新（750ms 内 4.92–9.30px）。证据位于 `C:/Users/zhang/AppData/Local/Temp/blog-semi-carousel-resize-ke1j094n/probe-before/`，检查 exit 0 表示观察完成，不表示产品通过；API/model/page/external-request 均为 0。

## Requirements

- R1（P2）：首次窄屏打开再放大后，恢复与直接桌面打开相同的自动滚动、循环位置和普通滚轮惯性；无需路由跳转、刷新或语言切换。
- R2：每次进入现有移动交互模式时停止轨道运动并清理位移、惯性和倾斜；再次允许运动时按当前布局测量周期并只启动一个循环。
- R3：保留 reduced-motion、隐藏页面、品牌入场的暂停条件，以及 Ctrl wheel 原生缩放、原有拖动/悬停/焦点行为；切换宽度、主题或语言不替换轮播 DOM，不改变项目内容、链接、URL 或历史。
- R4：使用本地浏览器证据及永久专项覆盖初始窄屏、两个方向与重复跨断点、当前 pointer/reduced-motion 状态，并保留原完整 UI 断言。

## Acceptance Criteria

- [x] AC1 / R1：320/390/430 初始页面在三主题、两种界面语言下放大至桌面后自动滚动，真实普通 wheel 被轮播接收且后续惯性继续，首个桌面周期已正确测量。
- [x] AC2 / R2：768/769 边界及重复窄/宽切换后，移动模式轨道无内联平移和持续样式写入，恢复桌面后无重复循环、空白周期或残留惯性。
- [x] AC3 / R3：动态 reduced-motion / pointer 模式与静态初始模式按现有判定正确暂停恢复，原生 wheel 缩放专项通过；内容、链接、DOM、偏好、URL/history 和原交互验收保持。
- [x] AC4 / R4：主会话完成 lint、build、运动专项、wheel 专项、performance、smoke、完整 UI 和精确差异/输入核对，随后本地提交、仅归档本子任务并实际返回父路线图。

## Constraints And Out Of Scope

- 沿用父路线图持续授权与 Codex inline。主会话规划、实现、最终验证与交付，不派实现/检查代理。
- 不改变断点、pointer 策略、速度/摩擦/拖拽手感、CSS、项目内容、主题或语言来源，不引入依赖或新的 React 状态。
- 不扩展物理触屏 pinch 或新的手势设计；pointer 仿真只核验模式门控，不等同于真实触屏设备验收。
- 不 push/deploy/sign，不调用生产 DB/relay/model，不公开内容或启用 Feed/Cron，不修改 `public/status/blog-semi-synthetic.json`、未知 scheduler、其他任务资料或历史 worktree。authored/SEO 翻译继续暂缓。
