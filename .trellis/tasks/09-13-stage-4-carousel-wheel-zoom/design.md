# 技术设计

## 事件边界

在 `RightScrollCards.handleNativeWheel` 的第一行检查 `event.ctrlKey`，命中时立即返回。保留既有 mobile/motion gate、`preventDefault()`、`applyWheelDelta()`、`passive: false` 与监听清理；不手动执行缩放，也不改变任何运动状态或参数。普通 wheel 的行为保持在原路径。

只选择已经复现的 Ctrl/wheel 缩放问题。把整个 listener 改为 passive 会破坏普通轮播；重写手势或统一其他修饰键没有当前证据。触屏 pinch、视口跨断点重建和其他组件均不扩入本项。

## 文件所有权

| 文件 | 允许修改 |
| --- | --- |
| `src/components/RightScrollCards.tsx` | wheel 入口新增 Ctrl 守卫一行 |
| `scripts/check-home-carousel-wheel-ui.mjs` | 新增真实 wheel / pinch 专项 |
| `scripts/check-ui.mjs` | import 与原 catalog-projects 组调用各一行 |
| `.trellis/spec/frontend/component-guidelines.md` | 轮播与浏览器滚轮缩放的所有权 |
| `.trellis/spec/frontend/quality-guidelines.md` | 原生输入、命中、缩放及专项合同 |
| `.trellis/spec/frontend/index.md` | 更新后的规范索引 |
| 当前子任务、父 task/assessment、当前 journal/index | 规划、交付与返回记录 |

不改 CSS、语言字典、项目/公开数据、路由、API、助手状态、依赖、其他 wheel/pointer 处理器或保护状态快照。普通滚动的速度、循环、惯性、自动播放与暂停合同全部复用。

## 33 场景浏览器矩阵

- 可动桌面：1440/Morning/zh、1280/Stellar/en、1440/Nature/zh，各执行 Ctrl 上/下滚轮、原生 mouse-source pinch、页面外部 pinch 对照与普通滚轮，共 15 场景。
- 窄屏：320/Stellar/en、390/Nature/zh、430/Morning/en，各执行 Ctrl 滚轮、原生 wheel pinch 与普通滚轮，共 9 场景。使用窄屏鼠标输入核对 wheel listener 的模式边界，不据此宣称验收了物理触屏 pinch。
- 减少动画：1440 的 Morning/en、Stellar/zh、Nature/en，各执行相同三种动作，共 9 场景。

每场景使用独立 Context，固定本地 origin，阻止 service worker 和外部网络，将所有 API 替换为本地固定 503；不打开真实助手。偏好 init script 只在目标 origin 写 storage。等待界面就绪后显式即时滚动到目标并等待两帧，再使用真实可见区域的坐标，核对 `elementFromPoint` 和实际 WheelEvent 目标；不能只相信先前 hover 的坐标。保存准备前后位置和事件坐标，避免把准备期页面移动引发的误命中计作产品结果。

用 document 的被动 capture/bubble 观察器记录 trusted/cancelable/ctrlKey、是否取消，以及同一事件前后的轮播位置。可动普通事件必须取消且产生即时位移；Ctrl 与静态模式事件不取消且不产生即时位移。比较 URL/history、主题、语言与内容身份。允许浏览器缩放改变视觉视口位置，不把合法缩放当成布局溢出。

原生 pinch 通过 Chromium `Input.synthesizePinchGesture` 的 mouse source 产生真实 Ctrl wheel，要求 `visualViewport.scale` 从 1 增至约 1.4；不使用 `Emulation.setPageScaleFactor` 或 CSS zoom 制造成功。Ctrl+wheel 本身只验证事件所有权，因为 headless 外部对照也不执行浏览器 chrome 缩放。

失败保留截图和事件记录；所有 Context 在 finally 关闭。专项独立运行并接入原完整 UI 的 catalog-projects 组，维持 46 组和旧断言。先让专项在旧构建真实失败，再实施守卫并验证新构建。

## 验收与回滚

执行 lint → build、专项、性能、smoke、完整 UI；只复用同一输入已经通过的检查。冻结 source/spec/dist 和实际 HTTP 响应，最终提交后再次核对。回滚只涉及本工作提交的入口守卫、专项接入和规范；其他任务、资料和生产配置不受影响。
