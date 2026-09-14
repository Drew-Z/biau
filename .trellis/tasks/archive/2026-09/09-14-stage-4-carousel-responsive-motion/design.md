# 首页轮播响应式运动设计

## 范围与根因

运动 effect 当前按挂载时宽度决定是否安装监听器，但 wheel/pointer handlers 每次读取当前模式，CSS 又会即时切换布局。这使三个层面的状态不同步：窄屏挂载后 handler 可接收桌面输入，运动循环和周期测量却从未启动；桌面挂载后移动 CSS 已静态，循环仍写入轨道。

## 状态合同

所有挂载路径都安装同一套 effect 生命周期。导出现有 `MOBILE_INTERACTION_QUERY` 供轮播订阅，不复制 query 或改变工具函数行为。移动 MediaQueryList 的 change 与现有 reduced-motion / visibility / root-attribute 信号共用 `syncMotion`：

| 当前条件 | 轨道行为 |
| --- | --- |
| 移动模式或 reduced motion | 取消 RAF，清零速度和位置，重置周期初始化、倾斜及现有拖动标记，移除内联平移 |
| hidden 或 intro active | 延续既有暂停合同，不重设可恢复的浏览位置 |
| 桌面且允许运动 | 重置帧时间，只在没有已排队 RAF 时启动；下一 tick 用当前卡片尺寸测量周期 |

`tick` 也读取移动模式，防止 change 通知前继续绘制。effect cleanup 移除新增监听器；依赖继续为 `projects.length`，不加入主题/语言依赖或通过 key 强制重挂载。现有 `resetReducedMotion` 扩展为静态模式重置并改名，复用现有实现。

wheel 的 Ctrl 守卫、non-passive listener、普通 wheel delta、惯性常量和所有 pointer handlers 保持原路径。此设计只同步既有运动开关，不重新定义手势。

## 浏览器验证

新增 `checkHomeCarouselMotion(browser, base)` 独立入口，并在完整 UI 既有 `catalog-projects` 组调用，不删除或弱化原检查。

- 18 个 resize 配置：三主题 × 两种语言 × 初始 320/390/430。先确认静态，切到 769/1440 后确认运动及真实 wheel 惯性，再跨 768/769 和窄/宽重复切换。
- 6 个模式配置：三主题 × 两种语言，初始桌面 reduced-motion、运行时 reduce/no-preference 与 pointer coarse/fine。先断言实际媒体查询值，再断言状态。
- 静态验收采样轨道 transform / `--carousel-scroll-y` 及 style MutationObserver，不能只检查 CSS `transform:none`。正向验收使用真实帧位移与同一可信 wheel 的前后位置，再观察后续惯性。
- 不改 product DOM 做测试挂钩；记录真实目标、样式、媒体查询、URL/history、内容与节点身份，使用实际可见坐标和本地网络 guard。保存每个配置结果和代表截图；失败准备与真实产品失败分开。
- 同样受检版本运行原 33 场景 wheel 专项及完整 UI，覆盖原生缩放、焦点/悬停、拖动与其他组件合同。模型和 API 调用保持 0。

## Owned Files

- `src/components/RightScrollCards.tsx`
- `src/utils/responsive.ts`（只导出现有 query）
- `scripts/check-home-carousel-motion-ui.mjs`
- `scripts/check-ui.mjs`（只接入专项）
- `.trellis/spec/frontend/component-guidelines.md`、`quality-guidelines.md`、`index.md`
- 本子任务文件；父 `task.json` / `assessment.md`；交付后当前开发日志/index。

除以上范围外均保持。尤其不改变 `src/styles/`、`src/data/`、依赖与保护快照。

## 回滚

若新门控回归，按工作提交精确回退两份产品文件、专项及其接入，保留原始失败证据和规划记录；不回滚前项 Ctrl wheel 守卫，不重置整个工作区。未通过验收不归档当前子任务。
