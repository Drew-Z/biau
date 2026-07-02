# 泊岸品牌图标与入场动画优化

## Goal

把 `biau port / 泊岸` 的品牌识别从“泛港湾场景”收敛为更明确、可复用、可缩放的站点图标和轻量入场动画：小写 `b` 作为主体，融合港湾/端口、水线、暖色灯点，让访客第一眼能感知“泊岸”的安全感、归属感和数字 port 的现代感。

本任务只做 SVG / CSS / 前端静态体验，不使用图片生成，不接 Lottie / GSAP，不添加外部动画依赖。

## Confirmed Facts

- 当前站点已有 `src/components/Navigation.tsx`，左侧导航 logo 是一段内联 SVG，偏船/港湾形态，但不是清晰的小写 `b` 标识。
- 当前首页已有 `src/components/HarborIntro.tsx`，只在首页首次会话展示，并通过 `sessionStorage` key `biau-port-harbor-intro:v1` 避免重复播放。
- `HarborIntro` 已尊重 `prefers-reduced-motion: reduce`，reduced motion 时不播放入场动画。
- `scripts/check-ui.mjs` 已覆盖首页 intro：要求 `.harbor-intro__vessel` 挂载、`harborVesselDock` / `harborMarkLand` / `harborIntroVeil` 完成，并在 3 秒内结束。
- 当前 `public/favicon.svg` 是旧的紫色闪电风格，与“泊岸”品牌意象不一致。
- 用户提供了两版外部模型方案，并要求 Codex 自行生成、对比、挑选或融合成最优方案；推荐方向是融合“方案二的数字 port / 港湾结构”和“方案一的灯塔暖光 / 泊岸归宿感”，第一版使用 SVG + CSS。

## Requirements

- 新站点图标采用融合方案：
  - 主体是小写 `b`。
  - 竖线表达“岸 / 灯塔 / 稳定依靠”。
  - 右侧弧线表达“港湾 / 船只靠泊”。
  - 内部水线表达“泊岸”。
  - 暖琥珀灯点表达“归宿 / 指引”。
  - 可以用克制的 `>` 负空间或线条暗示数字端口，但不能喧宾夺主。
- 提供可复用的 React SVG 标识组件，避免导航和 intro 继续维护两套不一致的 logo SVG。
- 导航 logo 使用新标识，并保持：
  - `Link` 回主页的语义和现有焦点检查。
  - 点击 logo 图形切换 harbor scene 的既有行为。
  - 深色、浅色、`dusk` / `garden` / `stellar` 场景下仍有可读对比。
- 首页入场动画升级为轻量品牌动画：
  - 首次会话播放，不重复打扰。
  - reduced motion 时不播放。
  - 总时长控制在 3 秒内，优先 1.8-2.4 秒。
  - 叙事为“寻光 -> 成岸 -> 靠泊 -> 水线/端口接通 -> 缩入导航”。
  - 保持 `check-ui` 可检测的关键 class 和 animation name，或同步更新检查脚本。
- `public/favicon.svg` 更新为新 `b` 标识的静态版本，确保小尺寸仍能辨认。
- 不引入 Lottie、GSAP、外部图片、真实运营数据、密钥或部署配置。

## Acceptance Criteria

- [x] 导航中的 logo 明确呈现 `b + 港湾 / 水线 / 暖灯`，不再只是船形图案。
- [x] 首页首次入场动画使用新品牌图标完成，并保留 sessionStorage / reduced-motion 保护。
- [x] `public/favicon.svg` 与新品牌图标一致。
- [x] `scripts/check-ui.mjs` 覆盖并通过 intro 结束、导航焦点、页面无横向溢出等既有检查。
- [x] 运行并记录 `npm.cmd run lint`、`npm.cmd run build`、必要时 `npm.cmd run check:ui`、`git diff --check`、敏感信息扫描。
- [x] 不提交真实密钥、生产地址、私有 dashboard、未确认公开内容或生成图片资产。

## Out of Scope

- 不做正式品牌手册。
- 不引入 GSAP、Lottie 或 AE 导出流程。
- 不新增外部字体或 CDN。
- 不改变项目页、博客内容或助手数据。
