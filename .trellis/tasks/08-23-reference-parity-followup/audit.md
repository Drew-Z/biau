# 参考站视觉细节续审结果

## 证据范围

- 参考站：`D:/workspace4Cursor/resourses/沐星埠.html`、`沐星埠_files/app.js.下载`、`沐星埠_files/tools-starfield.js.下载`、用户提供的参考截图。
- 主站：`src/components/FlowBackground.tsx`、`src/components/StarfieldBackground.tsx`、`src/styles/hero-split.css`、`scripts/check-ui.mjs`。
- 截图审计视口：1440x1000、390x900、430x900；每个视口在 intro 结束后采集 `t0`、`t0+800ms`、`t0+1600ms`。

## 差距与修复

| 区域 | 修复前证据 | 参考站行为 | 本轮决策与结果 | 验证 |
| --- | --- | --- | --- | --- |
| 固定 Stellar 背景 | `src/styles/hero-split.css:44-48` 的 `.light-theme body/.app` 强制使用 `#dbe4e5 → #bfd0d3` 浅色渐变；默认 `auto/light` 截图没有深色流体与星场 | 参考站首页默认以单一深色 Stellar 构图承载内容，外观材质不替换全屏背景 | 删除旧全屏浅色覆盖；`light/dark/auto` 仍只改变内容表面。修复后 1440/390/430 的 `body/.app` computed background 均为 `none` | 新增 intro-resume UI 断言；三视口运行时读取 `bodyBackground/appBackground === 'none'` |
| Intro → Flow | `FlowBackground.tsx:75` 只在初始化、resize、visibility、reduced-motion 时读取 `harbor-intro-active`；intro 移除后没有触发 `sync()`，首次加载停在 `paused` 且 opacity 为 0 | 参考站首页启动动画完成后背景运行时持续绘制，首屏内容不会永久缺少动态背景 | 监听 `document.documentElement` class 变化并复用现有 `sync()`；不重建 renderer/worker。intro 结束后 Flow 恢复 `running`，CSS transition 完成后可见 | `scripts/check-ui.mjs` 等待 class 移除、`running` 和可见 opacity；Flow 帧差 > 0.02 |
| Intro → Starfield | `StarfieldBackground.tsx:56` 同样无法感知 intro class 移除，首次加载星场停在 `paused` | 参考站 starfield 在正常模式持续运行，静态/隐藏才冻结 | 增加同样的根 class MutationObserver；复用 renderer、RAF、reduced/hidden 分支，cleanup 时断开 observer | UI 断言检查 `data-starfield-state=running`、opacity > 0、星场帧差 > 0.02 |
| 截图细节 | 单帧或 intro 过渡期截图可能只得到 CSS fallback/半透明首帧，误以为缺少流体和点光 | 参考截图包含多层流体带、星点、局部 edge glow 和面板周界，细节随动画相位变化 | 审计改为运行时状态 + 三相位截图；不以单帧平均 RGB 作为唯一结论。修复后均值稳定且画面可见细节恢复 | 1440 均值 `[27,40,73]`；390 `[39,56,85]`；430 `[38,55,85]`；三相位均采集成功 |

## 有意保留的差异

- 主站继续使用 React、typed Stellar profile、主站品牌和中文业务内容，不复制参考站 Logo、字体、SplitText 私有脚本、音效或外部资源。
- 主站保留 `light/dark/auto` 作为可读性模式；它们不会再切换全屏背景，但面板和控件仍可有不同对比度。
- 参考站的完整硬件评分、30 分钟冷却和私有调试面板不属于本轮视觉收益范围；主站继续使用现有 `static/balanced/full` 与生命周期降级。

## 结果

- 本轮两个高价值差距均已修复：固定 Stellar 背景不再被 light-theme 覆盖，intro 结束后两个全局背景 owner 能恢复运行。
- 用户已有 `public/status/blog-semi-synthetic.json` 仍未纳入本任务修改或提交。
