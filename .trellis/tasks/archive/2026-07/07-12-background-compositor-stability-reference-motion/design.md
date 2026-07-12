# Design

## Architecture

新增 `FlowBackground`，替换 App 中现有 `gradient-bg`、`harbor-environment` 与 grain DOM：

```text
App
└─ FlowBackground
   ├─ fixed <canvas>
   ├─ CSS fallback on .app
   └─ runtime controller
      ├─ OffscreenCanvas Worker (preferred)
      ├─ main-thread WebGL renderer (fallback)
      └─ CSS-only fallback (WebGL unavailable)
```

共享 `FlowRenderer` 负责 WebGL program、uniform、resize、palette 与 draw，worker 和主线程不复制 shader 或状态机。

## Rendering

使用单个 full-screen triangle 的 fragment shader：

- 低频 fbm/value noise 扭曲 UV；
- 5-stop 场景调色板沿斜向渐变；
- 两层不同速度的 domain warp 形成流体场；
- 柔和高光和雾带提供参考站的亮暗迁移；
- canvas 内部分辨率按 viewport 与 capped DPR 计算，不使用 DOM blur/mix-blend。

目标帧率 30fps，DPR 上限 1.25。视觉变化由 shader time uniform 完成，浏览器只合成一个 canvas layer。

## Lifecycle

- mount：显示 CSS fallback，初始化 worker；失败则主线程 renderer。
- first frame：设置 `data-flow-ready="true"`，canvas 淡入，fallback 停止动画。
- resize：更新 canvas backing size 与 resolution uniform。
- theme/scene：MutationObserver 读取根节点 class / `data-harbor-scene`，发送新 palette；shader 平滑插值。
- document hidden：暂停；visible：恢复并重置时间基准。
- harbor intro active：暂停时间推进，保持静态画面。
- unmount：取消 RAF、移除监听、terminate worker、释放 WebGL resources。

## Motion Policy

删除现有 hardware/network `balanced/static` 推断、hook 和专用脚本。仅监听 `prefers-reduced-motion`：reduce 时渲染一次静态帧并停止循环，偏好变化后实时更新。

## CSS Migration

- `.app` 保留场景渐变 fallback。
- `.flow-background` 固定 inset 0、pointer-events none、z-index 0、contain strict。
- 内容与导航保持 z-index 1+。
- 删除或停用旧 fixed pseudo fluid layers、harbor environment、grain 和对应持续动画规则。
- 保留与卡片/面板有关的场景变量，不删除 UI surface tokens。

## Rollback

组件初始化失败自动停留在 CSS fallback。代码回滚只需恢复旧背景 DOM；不涉及数据、路由或后端契约。