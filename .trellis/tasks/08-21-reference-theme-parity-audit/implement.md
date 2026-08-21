# 实施计划：参考站主题实现差距审计与补齐

## 1. 基线与差距矩阵

- [x] 读取前端组件、hook、质量规范与 thinking guide。
- [x] 对照参考证据和当前源码，创建 `audit.md`，记录每项现状、差距、决策和验证。
- [x] 采集当前主站 desktop/mobile 三主题运行时 data 属性与关键 computed style。

## 2. 实现顺序

- [x] 校准 Starfield 密度、深度视差、twinkle、opacity、静态/恢复逻辑。
- [x] 校准 Stellar edge range，并把品牌高光绑定到 live DOM 几何。
- [x] 将 panel perimeter flow 改为真实圆角周界光点，加入 reveal、vertical surge、30/45fps 预算和 cleanup。
- [x] 校准 carousel wheel/drag/flick/inertia/tilt 常量和边界条件。
- [x] 校准 Hero cinema 普通/impulse 字符时序；保持移动端/reduced/low-power 静态路径。
- [x] 检查 prepaint 与 typed profile 接管过程，仅在存在真实首帧差距时补丁。
- [x] 更新 UI 诊断断言和差距矩阵实现状态。

## 3. 验证

- [x] 运行最小相关测试或脚本，逐模块修复。
- [x] 运行 `npm.cmd run lint`。
- [x] 运行 `npm.cmd run build`。
- [x] 运行 `npm.cmd run performance:check`。
- [x] 运行 `npm.cmd run check:ui:smoke`。
- [x] 运行 `npm.cmd run check:ui`，覆盖 1440×1000、390×900、三主题、light/dark、scene transition、reduced-motion、low-power、hidden/resume、no-WebGL/no-Worker、carousel 与标题。
- [x] 检查 `git diff`，确认无无关格式化，且 `public/status/blog-semi-synthetic.json` 未进入任务修改。

## 4. 风险与回滚点

- Starfield seed/密度变化可能改变截图稳定性：先固定随机序列，再更新断言。
- Perimeter flow 可能增加 RAF 成本：以 30/45fps 节流和 static 停止作为性能门槛；异常时可回退现有 SVG fallback。
- Hero/carousel 常量会影响交互手感：保留键盘和静态模式，按模块回滚常量。
- Prepaint 修改位于 React 之前：仅写最小同步状态，解析或存储异常必须保持默认安全背景。

## 5. 完成门

- [x] `audit.md` 不再含未分类的高价值差距。
- [x] 全部验证通过，或对无法无损对齐的剩余差异给出证据与明确理由。
- [x] 更新必要的 `.trellis/spec/` 约束。
- [ ] 仅提交本任务文件和代码；提交后在 `main` 推送 `origin main`。
