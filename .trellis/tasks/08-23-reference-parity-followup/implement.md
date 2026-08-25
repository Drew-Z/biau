# 实施计划：参考站视觉细节续审

## 1. 规划与基线

- [x] 建立本任务并记录用户已有 `public/status/blog-semi-synthetic.json` 修改。
- [x] 读取归档参考站审计、单主题重构设计、前端质量规范和当前组件实现。
- [x] 运行本地服务并确认完整 `check:ui` 基线 40/40 通过。
- [x] 采集参考截图、主站首次加载与跳过 intro 的同视口运行时证据。

## 2. 实现

- [x] 删除 `hero-split.css` 中覆盖固定 Stellar 背景的 light-theme body/app 规则。
- [x] 在 `FlowBackground.tsx` 增加根 class MutationObserver，intro 状态变化时复用 sync 恢复/暂停现有 renderer。
- [x] 在 `StarfieldBackground.tsx` 增加同等 class observer，保持 renderer、RAF 和 reduced/hidden 分支可清理。
- [x] 在 `check-ui.mjs` 增加首次 intro 后 Flow/Starfield 恢复断言和多相位非空采样，避免单帧截图误判。
- [x] 写入本轮 `audit.md`，记录修复前后证据与仍有意保留的主站差异。

## 3. 验证

- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `npm.cmd run performance:check`
- [x] `npm.cmd run check:ui:smoke`
- [x] `npm.cmd run check:ui`
- [x] 运行生产 appearance 检查（部署后）；第一次 `light/320` 为瞬时超时，复测后 8/8 组通过，线上 `https://biau.pages.dev` 已验证。
- [x] `git diff --check`，确认 status JSON 未被修改或暂存。

## 风险与回滚点

- CSS 删除可能暴露旧的 light-theme token；若出现对比度回归，只调整内容 surface token，不恢复全屏浅色背景。
- observer 可能产生重复 sync；以单一 renderer/worker、单一 RAF 和现有 motion token 诊断确认，无需引入第二套事件总线。
