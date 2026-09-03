# Claude Logo V3 Mark - 设计文档

## 设计理念

**流动阈值 (Flow Threshold)**

这个标记采用抽象的流动曲线、断续边界和负空间设计，表现 BIAU Port 的核心语义：港口阈值、海洋流动和公共边界。字母 B 只通过偏移的双段节奏隐约提示，而不描绘完整字母。

## 视觉元素

### 1. 主体结构

- **断续边界 (Broken Boundary)**: 左侧三段错开的短边作为锚点，代表港口的固定边界和公共接口的稳定性，同时避免形成字母直脊柱
- **上层流动轮廓 (Upper Flow)**: 向右上偏移的开放曲线表现流入的动态
- **下层流动轮廓 (Lower Flow)**: 向内收缩并错位的短曲线与上层形成不对称呼应，留下可识别的开放负形
- **阈值刻度 (Threshold Ticks)**: 四组不闭合的边界刻度，象征港口边界和开放入口，避免退化为通用 App 方块

### 2. 标记点

三个圆形标记点以错位节奏分布在入口边界，代表：
- 公共状态的锚点
- 数据流的检查点
- 边界的可见节点

## 设计约束遵循

✅ **独立视觉方向**: 使用抽象流动曲线而非具象图标
✅ **BIAU Port 语义**: 港口阈值（边界框）、流动（曲线）、公共边界（标记点）
✅ **B 作为抽象节奏**: 通过偏移的两段弧线、断续边界和负空间暗示，非字面描绘
✅ **避免常见图标**: 不是船、帆、锚、指南针、波浪、应用方块或标准字体
✅ **抽象轮廓**: 类似早期站点的剪影风格，保持辨识度

## 技术实现

### 组件接口

```typescript
interface ClaudeLogoV3MarkProps {
  size?: number | string          // 尺寸，支持 24/40/48/64px
  monochrome?: boolean            // 单色模式
  animated?: boolean              // 动画模式
  title?: string                  // 可访问性标题
  ariaHidden?: boolean            // 装饰性隐藏
  className?: string              // 自定义样式类
}
```

### 主题支持

通过 CSS 变量支持三种主题：

| 主题 | 流动色系 | 阈值背景 | 标记点 |
|------|---------|---------|--------|
| **Morning** | 蓝色系 (#315e9b → #367f62) | 浅暖色 | 琥珀色 |
| **Nature** | 青绿色系 (#2478a0 → #438f74) | 浅绿色 | 金棕色 |
| **Stellar** | 冷蓝灰系 (#7fa7c7 → #98b8a8) | 深蓝灰 | 金黄色 |

### 动画行为

当 `animated={true}` 时：

1. **流动绘制**: 上下弧线和脊柱持续绘制，形成 3 秒循环
2. **标记脉动**: 三个标记点依次缩放脉动，2 秒循环

所有动画遵循 `prefers-reduced-motion: reduce` 媒体查询，在用户偏好减少动画时自动禁用。

### 单色模式

当 `monochrome={true}` 时：
- 所有渐变替换为 `currentColor`
- 继承父元素文字颜色
- 降低波纹透明度至 0.4
- 背景透明度降至 0.08

适用场景：导航栏、页脚、单色背景的嵌入使用。

## 尺寸与响应式

- **ViewBox**: 64×64 单位
- **推荐尺寸**: 24px（小图标）、40px（中等）、48px（默认）、64px（大型展示）
- **笔画宽度**: 主要路径 4.5-5 单位，边界刻度 1.7 单位，保证在小尺寸下清晰可辨

## 可访问性

- **装饰性使用** (`ariaHidden={true}`, 默认): 对屏幕阅读器隐藏
- **语义使用**: 传入 `title` 和 `ariaHidden={false}` 时，添加 `role="img"` 和 `<title>` 元素
- **焦点行为**: `focusable="false"` 避免键盘导航干扰

## 使用示例

```tsx
import { ClaudeLogoV3Mark } from '@/components/ClaudeLogoV3Mark'

// 默认 48px，主题自适应
<ClaudeLogoV3Mark />

// 小尺寸，单色，带动画
<ClaudeLogoV3Mark size={24} monochrome animated />

// 语义化使用，带标题
<ClaudeLogoV3Mark
  size={64}
  title="BIAU Port - Claude V3 标记"
  ariaHidden={false}
/>
```

## 设计差异化

与 Codex 候选方案对比：

- **Codex 方向**: （待 Codex 完成后对比）
- **Claude V3 方向**: 强调流动性和开放边界，使用抽象曲线和节奏感，视觉上更偏向"过程"和"流"的概念

## 文件清单

- `src/components/ClaudeLogoV3Mark.tsx` - React 组件
- `src/styles/claude-logo-v3.css` - 样式和动画
- `docs/brand/logo-regeneration/claude-v3.md` - 本设计文档

## 后续集成

由 Codex 负责：
1. 在 Logo Lab 页面中添加此组件的展示卡片
2. 与其他候选标记并列比较
3. 评估是否需要调整视觉平衡或主题适配

---

**设计者**: Claude Code
**创建日期**: 2026-09-02
**版本**: V3 初版
