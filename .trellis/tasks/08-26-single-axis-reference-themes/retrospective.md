# Bug Analysis: Nature Flow 仅呈现旧站浅色换色

## 1. Root Cause Category

- **Category**: B - Cross-Layer Contract；D - Test Coverage Gap。
- **Specific Cause**: Nature 已拿到参考色板，但参考 runtime 的速度、场强、扭曲和噪声尺度在 `FlowRenderer` 写入 uniform 前仍被旧 profile 模型二次缩放。Canvas 还叠加了额外 opacity/filter，因此输出接近旧站浅薄荷换色，而不是参考的浅青到深叶绿雾化云场。

## 2. Why Earlier Fixes Failed

1. 先调色板与 CSS token：只修正了颜色，保留了错误的 shader 参数量纲和 Canvas 合成路径。
2. 先验收 owner、非空 Canvas 与数值范围：这些检查没有确认 `profile -> uniform -> screenshot` 的语义一致性，因而无法发现“数值有效但构图错误”。
3. 主题持久化夹具初始总写入 Morning：刷新测试在验证 Stellar 前覆盖了待测值，造成与产品行为无关的超时。

## 3. Prevention Mechanisms

| Priority | Mechanism | Specific Action | Status |
| --- | --- | --- | --- |
| P0 | Architecture | `FlowThemeProfile` 保存参考量纲；渲染器只应用显式时间换算 `26 / speed`，不再隐式缩放 distortion/noiseScale。 | DONE |
| P0 | Test coverage | 两个 UI 外观检查精确断言三个主题的 dynamics tuple；截图取证验证 Canvas 非空、主题 owner 一致及移动端 containment。 | DONE |
| P1 | Documentation | 前端质量规范与跨层思考指南记录“数值 profile 不能二次解释”。 | DONE |
| P1 | Test fixture | 仅当 `biau-port-theme` 缺失时 seed 默认值，刷新测试不覆盖待验证主题。 | DONE |

## 4. Systematic Expansion

- **Similar Issues**: 任何从 typed profile 传到 Worker、Canvas 或 CSS filter 的数值都需要检查单位、合成顺序和默认值。
- **Design Improvement**: 动态参数通过 `FlowThemeProfile` 集中定义，避免在组件或 shader 调用点分散重写。
- **Process Improvement**: 参考站视觉复刻必须同时审计源码参数、uniform 映射、Canvas 合成和实际截图，不能只比较色板或平均颜色。

## 5. Knowledge Capture

- [x] 更新 `frontend/state-management.md`、`hook-guidelines.md`、`type-safety.md`、`quality-guidelines.md`。
- [x] 更新 `guides/cross-layer-thinking-guide.md`。
- [x] 项目没有 `src/templates/markdown/spec/`，无模板副本需要同步。
