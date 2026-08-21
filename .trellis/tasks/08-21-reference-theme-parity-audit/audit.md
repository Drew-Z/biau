# 参考站与主站差距矩阵

## 范围与映射

- 参考晨光 → 主站 Dusk；参考自然 → 主站 Garden；参考星辰 → 主站 Stellar。
- 主站继续独立支持 `light | dark | auto`，不复制参考站品牌键名、素材和私有脚本。
- 参考证据来自 `D:/workspace4Cursor/resourses/沐星埠.html`、`沐星埠_files/app.js.下载`、`tools-starfield.js.下载` 与 `home-runtime.js.下载`；压缩运行时位于单行时以符号名辅助定位。

## 差距矩阵

| 模块 | 参考站行为与证据 | 审计前主站 | 本任务结果 | 验证 |
|---|---|---|---|---|
| prepaint | HTML 26–88 行在主 CSS 前恢复三主题并注入完整渐变 | `index.html` 只写场景 data，body 固定 `#071827` | 为 3 scene × light/dark 注入与 CSS profile 一致的同步首帧渐变；公开 `data-performance=balanced` | UI 主题持久化、构建产物检查 |
| typed profile / owner | 主题切换同步材质与运行时 | Flow、Starfield、Stellar owner 已稳定挂载并原子递增版本 | 保留既有架构，无重复主题 owner；共享低功耗判定收敛到 `visualPerformance.ts` | UI 六组合、scene/profile version |
| Starfield 密度 | `clamp(round(width*height/4800),150,280)`，seed `20260727`；`tools-starfield.js.下载:1` | 场景固定 22/34/172 | 改为面积密度；低功耗降为 32%，且保持稳定 seed/profile | `data-starfield-count`、low-power/no-WebGL 检查 |
| Starfield 深度/视差 | 四层 `.22/.48/.76/1.08`，`depth²`，最大 52/42px | 三层线性 depth，18/12px | 四层深度、平方视差、52/42px | Canvas 与 owner UI 检查 |
| Starfield twinkle | 双正弦；static/reduced 固定 1；`tools-starfield.js.下载:1` | 单正弦，reduced 通过时间 0 近似 | 双正弦；profile twinkle 为 0 时显式固定 1，低功耗冻结 | reduced/low-power/hidden 检查 |
| Starfield opacity | stellar `.78`、nature `.42`、晨光 `.58` | `1/.36/.5` | CSS 对齐 `.78/.42/.58` | 六主题 computed style / canvas 可见性 |
| edge glow | `.site-header`、`.home-hero`、`.hero-panel`；range `clamp(min*.14,52,96)`；148px 多色光层 | panel 独立 `.16,48..96`，全屏 pointer glow；缺 header/hero 实体层 | `StellarEffects` 单 owner 动态挂载 navigation/hero/panel 局部层，统一 `.14,52..96` 与 148px 多色 radial；panel 公式同步 | pointer near-edge / center、cleanup |
| brand highlight | 品牌实体高光随 live 元素 | 固定 `52px 34px` | 每次同步读取 `.nav-logo` 或 intro shell 的 bounding rect | runtime CSS vars、responsive UI |
| panel perimeter | 真实圆角周界；7600ms、88×52、垂直 surge、opacity .9、1.4s smoothstep reveal、30/45fps；`home-runtime.js.下载:1` | SVG dash fallback，无运动 owner | 新增真实圆角几何光点 owner；垂直段 0.8 时间权重和 1.45 major；面板 opacity≥.95 后 reveal；balanced/full 30/45fps；SVG 仅 fallback | `data-stellar-border-flow`、fps/size vars、reduced/mobile/low-power |
| Hero 普通换文 | outgoing .5s；incoming 1.05s、stagger .046、power2.out | title-only incoming .58/.028/back | incoming 校准 1.05/.046/power2；ghost outgoing .5 | UI 标题轮换与 hidden/resume |
| Hero impulse | incoming .82s back.out(1.12)，方向投影 | CSS 已有 .82s 弹性入场与方向 CSS vars | 保留现有方向性实现；未复制 SplitText 私有运行时 | drag/keyboard/reduced 检查 |
| carousel inertia | auto .3、friction 4、flick 1.2、wheel 2.5、max 4200、min 16、max dt .02、EMA .6/.4、stale 80ms、tilt ±2.5 | friction 对齐；其他速度单位、clamp、dt 不同 | 对齐 dt、wheel、EMA、flick、max/min、stale；保留主站竖向板式与移动静态模式 | wheel prompt、drag click fence、mobile/static |
| performance | static/balanced/full 统一预算；CPU/内存/网络/电池/visibility/context-loss | Flow/Starfield/Stellar 各自读取部分低功耗信号 | 共享 synchronous `visualPerformance`，static/balanced/full 映射；保留 Flow Worker/WebGL 与现有 hidden/reduced cleanup | low-power、hidden/resume、no-WebGL/Worker |

## 有意保留的差异

- 主站保留 React、typed profile 与现有 GSAP owner，不加载参考站 SplitText 插件或复制压缩脚本。
- 主站保留 light/dark 外观层，因此 light 组合使用主站可读性 profile，不强行覆盖成参考站单一主题明度。
- 未引入参考站完整 CPU/内存/网络打分和 30 分钟 WebGL session cooldown；当前共享 static/balanced/full 映射已覆盖用户可见的 reduced、save-data、低内存与生命周期降级，进一步启发式重构不具备本轮必要的视觉收益证据。
