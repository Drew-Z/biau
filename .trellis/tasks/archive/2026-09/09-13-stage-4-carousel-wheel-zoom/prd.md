# 首页轮播滚轮缩放

## 目标

访客把指针放在首页项目轮播上时，仍能使用浏览器的滚轮缩放手势；普通滚轮继续浏览项目，移动和减少动画模式维持原有行为。

## 已确认事实

- `src/components/RightScrollCards.tsx:346-349` 在桌面可动模式中无条件取消 wheel 并将 deltaY 加入轮播位置/惯性，没有区分 Ctrl 修饰。
- 基线 `1a90dc10dec64bac7256ae41ed308012222e7044` 的三主题真实浏览器输入确认：Ctrl+滚轮和 mouse-source 原生 pinch 共 6/6 被取消并推动轮播；三个轮播 pinch 均保持 scale=1，三个页面外部 pinch 对照均放大到约 1.4；三个普通滚轮对照正常。页面、外部请求错误和模型调用为 0。
- `assessment-before.json` 保存 15 个有效观察。首轮两次普通滚轮未命中轮播，不纳入正常对照；补齐坐标和真实目标断言后重取三组对照。headless 的 Ctrl+滚轮在外部也不改变缩放，仅用于事件归属核验；实际缩放结论来自原生 pinch 和 visualViewport。
- `scripts/check-ui.mjs:5256-5313` 已验证普通滚轮、遮罩与轮播位移，未验证 Ctrl 修饰或实际 pinch 缩放；保留这些原断言。

## 要求

- R1：Ctrl 修饰的 wheel 由浏览器处理，轮播不取消该事件、不把它加入位置或惯性。原生 wheel pinch 可以在轮播区域正常放大页面。
- R2：普通 wheel 仍按现有桌面规则推动轮播；原监听器、速度/摩擦常量、拖动、悬停/焦点暂停、自动播放和内容行为保持。
- R3：窄屏和 reduced-motion 模式继续不拦截普通 wheel；现有语言、主题、URL、布局和浏览器缩放行为保持。
- R4：通过真实且命中正确区域的浏览器事件、事件取消状态、即时轮播位移及实际视口缩放核验；区分 Ctrl+滚轮的 headless 限制与实际 pinch 证据，不模拟 CSS zoom 或用合成 DOM 事件代替原生输入。

## 验收标准

- [x] AC1：三主题、中英文桌面配置的 Ctrl 上/下滚轮不被取消、不产生轮播即时位移；轮播原生 pinch 和页面对照均实际放大。
- [x] AC2：普通桌面滚轮仍被轮播消费并产生位移；320/390/430 与三个 reduced-motion 配置继续保留普通 wheel 和 Ctrl/pinch 的原生处理。
- [x] AC3：33 场景专项、保留原断言的完整 UI、smoke、lint/build 和性能检查通过；受检 source/spec/build/本地 HTTP 响应一致。
- [ ] AC4：精确本地提交，仅归档本子任务，实际返回父任务并完成第 54 轮评估、Session 140 和资源收尾。

## 范围与授权

沿用父 `loop.md` 的持续本地授权。只修复 wheel 的 Ctrl 边界，不改变触屏 touch/pointer 策略、resize 生命周期、其他修饰键、轮播样式或公开内容。禁止 push/deploy/sign、真实模型/DB/relay、Feed/Cron、保护快照和未知 scheduler 操作；authored/SEO 翻译继续暂缓。原 13 份资料和历史 worktree 保留。
