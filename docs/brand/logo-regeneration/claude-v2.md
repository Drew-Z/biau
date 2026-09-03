# Claude Code V2：Quay Cut

这是 Claude Code 针对 BIAU Port 的第二轮独立候选，仅用于 `/studio/brand/logo-lab` 评审，不是生产 Logo、favicon 或项目子标。

## 概念

Quay Cut 不在底板上描一条完整的 `B`，而是把“港口”理解成一块被水道切开的公开边界：深色实体代表能力边界，右侧敞开的切口代表公开入口，内部的小泊位块代表当前状态。三个递增刻度是证据节拍。整体轮廓可以产生很弱的 `b/B` 联想，但不依赖识字成立。

## 实现

- `src/components/ClaudeLogoV2Mark.tsx`：64 x 64 SVG、唯一 `useId` 渐变、语义 title、单色模式、动效模式和尺寸降级。
- `src/styles/claude-logo-v2.css`：Morning/Nature/Stellar 独立材质；24px 隐藏脆弱岸线、外缘和刻度，40px 隐藏刻度；`prefers-reduced-motion` 直接保留静态终态。
- 不使用位图、外部资源、新依赖或既有候选路径；不修改生产组件和共享主题文件。

## 与其它候选的区别

- Codex V2「Split Quay」是分离岸柱加开放外廓，重点是“边界之间的公共水口”。
- Claude V2「Quay Cut」是实心陆地减去深水道，重点是“从能力边界中切出公开入口”。
- 两者不复用同一几何、坐标或视觉叙事，便于在同一实验页进行公平比较。

## 已知风险

深色实体在浅色 Morning/Nature 样片中比线性标记更重；24px 下水道细节会被有意简化。最终选择仍应以单色轮廓、24px 识别、三主题材质和真实导航尺寸的视觉评审为准。
