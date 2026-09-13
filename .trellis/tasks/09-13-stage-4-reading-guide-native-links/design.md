# 技术设计

## 行为边界

`DetailReadingGuide.handleNavigate` 是共享章节链接的唯一拦截点。保留 `<a href="#stable-id">`，在查找目标或修改界面之前检查原事件是否已经取消、按钮是否为主按钮、是否有 Ctrl/Meta/Shift/Alt。只有普通主按钮激活进入既有关闭和延后滚动逻辑。键盘 Enter 产生无修饰主按钮 click，继续使用该路径。

修饰键操作直接交还浏览器；不手动 `window.open`，不新增 Router 导航、tab/window 状态、焦点修复、全局监听或 timeout。原菜单、页面位置和 URL 不由本次处理器改写。普通跳转的 hash 与焦点行为不在本次改变范围。

## 文件所有权

| 文件 | 允许修改 |
| --- | --- |
| `src/components/DetailReadingGuide.tsx` | `handleNavigate` 入口的事件归属守卫 |
| `scripts/check-reading-guide-links-ui.mjs` | 新增原生链接与普通跳转浏览器专项 |
| `scripts/check-ui.mjs` | 一行 import、一行在原 reading-navigation 组调用 |
| `.trellis/spec/frontend/component-guidelines.md` | 目录的原生事件合同 |
| `.trellis/spec/frontend/quality-guidelines.md` | 新页观测、源页面保持与专项命令 |
| `.trellis/spec/frontend/index.md` | 索引指向更新后的合同 |
| 当前子任务、父 `task.json` / `assessment.md`、当前 journal/index | 规划、交付、归档与返回记录 |

不修改路由 hooks、页面数据、语言字典、CSS、API、助手状态、依赖、现有测试断言或保护状态快照。不改变旧审计保留的普通目录焦点策略。

## 浏览器验证

主矩阵为 1440/Morning/zh、320/Stellar/en、390/Nature/zh、430/Morning/en，含正常动画与 reduced-motion。每配置覆盖博客（保留 column）、项目（保留 group）和状态详情，每页执行 Ctrl 点击、Ctrl+Enter、Shift 点击、中键、普通点击、普通 Enter，共 72 场景。另在桌面博客通过有界浏览器事件观测覆盖 Meta、Alt 与已取消 click，共 75 场景。

原生打开必须监听 BrowserContext 的新 page，随后等待其精确目标 URL 和真实页面内容；不能只等 source page 的 popup 事件，也不能把初始 about:blank 的 DOMContentLoaded 当作目标页面已加载。使用 context 级本地网络 guard 覆盖新页的第一个请求，`/api/**` 全部使用固定本地 503，模型调用为 0。

在动作前完成目录展开及滚动稳定等待，动作后比较原 URL/history、标题、展开状态、滚动位置、内容及语言/主题。新页必须包含原 href 的路径/query/fragment 和真实目标节点。普通动作保留目录关闭、滚动到目标及原 URL 的断言。Meta/Alt 的观测只在 document 冒泡阶段取消浏览器默认行为，记录目录处理器是否已取消事件并核对目录没有关闭；已取消动作在 capture 阶段拦截，核对目录尊重前置所有者。

每场景保存结果，失败保存当前页和错误；Context 在 finally 中关闭，所有弹出的文档随之关闭。代表截图供主会话复核。专项在旧构建上必须先真实失败，证明覆盖已确认问题；既有完整 UI 断言保持。

## 验收与回滚

按 `lint → build`、专项、性能、smoke 和完整 UI 验证。旧的 API/数据/依赖检查不因事件守卫重复运行；完整 UI 自带语言、目录、路由、助手和页面矩阵。冻结受检 source、spec、dist 和实际本地 HTTP 响应，交付前后核对。

回滚仅涉及当前工作提交的组件入口守卫、专项接入和规范，不处理原资料或生产配置。若发现独立问题，保留证据并返回父任务评估，不把它偷偷扩入当前修改。
