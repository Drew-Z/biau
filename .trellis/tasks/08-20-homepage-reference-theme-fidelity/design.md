# Technical Design

## 1. Design Goals

建立一个以参考站三主题为视觉基准、但不复制其品牌和运行时的首页表面系统。实现重点是让背景色场、内容层级、面板材质和交互光效形成一个完整的主题，而不是增加更多独立特效。

## 2. Existing Ownership To Preserve

- `FlowBackground` 是唯一环境 Canvas owner，继续负责 Flow profile、CSS foundation、pointer state、reduced-motion 和 fallback。
- `FlowRenderer` 继续负责 shader 色场；不增加第二 Canvas、独立星场 timer 或 React frame state。
- `HeroSplit`、`RightScrollCards` 保留产品数据、状态和 CTA 投影，只调整语义 class/data attributes 与视觉层级所需的最小结构。
- `appearance.ts` 继续拥有 theme/scene 持久化、auto 解析和场景循环。

## 3. Surface Model

为每个 `themeMode x harborScene` 组合建立一套语义 token，至少覆盖：

- page base / horizon / texture contrast;
- ink / muted / eyebrow / status;
- nav surface / border / active indicator;
- hero surface / hero shadow / hero accent;
- panel surface / panel border / panel inset / panel blur;
- card surface / card border / card shadow / card accent strength;
- action surface / action ink / focus ring;
- footer surface / footer border.

场景 token 表达色彩关系和材质方向，明暗 token 调整亮度、透明度和文本对比。所有 token 仍由现有 class-based CSS 投影，不引入新的组件框架。

## 4. Reference Mapping

| 泊岸场景 | 参考方向 | 主要结构 |
| --- | --- | --- |
| `dusk` | default / morning spectral | 暖纸色与粉蓝光谱、低对比细 grain、柔和玻璃面板、琥珀 active indicator |
| `garden` | nature | 浅紫到青绿的清透色场、有机 contour、明亮半透明面板、绿色/青色低饱和强调 |
| `stellar` | stellar | 深蓝靛紫空间、青蓝星光、深色半透明面板、局部边缘光和周界流光 |

参考站的 dedicated starfield、3D Logo、GSAP boot 和外部字体只转译为 CSS/现有 Flow 的视觉契约，不复制资产或运行时。

## 5. Component And CSS Changes

1. 收敛 `appearance-themes.css` 中现有重复/冲突的主题覆盖，把当前六组合的 page/nav/hero/panel/card/action/footer token 放到同一组明确的 scene + mode 规则。
2. 调整 `hero-split.css` 的默认透明度、面板阴影、标题/正文色阶和卡片强调逻辑，避免统一 dark-panel 作为基础再被主题色污染。
3. 调整 `flow-pages.css` 的 foundation、texture、landmark、项目板材质和 Stellar 周界光，使它们只强化场景，不主导内容层级。
4. 如有必要，在 `HeroSplit.tsx` / `RightScrollCards.tsx` 增加非视觉语义标识（如场景 profile hooks），不改变公开交互契约。

## 6. Responsive And Accessibility

- 桌面保持明确双栏，intro 与 project board 中心对齐；`1024px` 以下恢复单栏。
- 320/390/430 宽度保留 44px 触控目标、品牌和 CTA 可见性，避免主题材质造成文字溢出。
- 所有背景层 `aria-hidden`、指针层 `pointer-events:none`；颜色不是唯一状态信号。
- reduced-motion、hidden、低功耗和 Save-Data 继续暂停/静止；不让 CSS 特效绕过环境状态。

## 7. Verification Strategy

- 静态检查六组合 token 完整性、场景差异和单 Canvas 数量。
- 截图检查默认桌面视口下三场景，以及 390px Garden/Stellar/Dusk 的可读性和层级。
- 运行 `lint`、`build`、`performance:check`、`check:ui:smoke`、完整 `check:ui`、`git diff --check`。
- 不写入、不暂存 `public/status/blog-semi-synthetic.json`。

## 8. Rollback

优先按文件/区块回退本轮 token 与首页样式；不回滚或覆盖用户状态快照，不改变内容数据、发布状态、路由和外链。
