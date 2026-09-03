# BIAU Port 标记探索：三个方向与推荐

本文是一次**有边界的品牌探索**，不改动任何生产代码。产出目标是三个原创、可直接落到 64×64 SVG 的标记方向，以及一个推荐方向和淘汰标准。

- 基线 commit：`21f5b613f8f49968fdfaa082f663c7e55a9caf0c`
- worktree：`D:\Agent\codex\worktrees\blog-semi-claude-dev`
- 分支：`claude/blog-semi-claude-dev`
- 状态：仅新增本文件，未触碰 `src/**`、`public/**`、`scripts/**`、`.trellis/**`

---

## 1. 探索输入

### 1.1 已核对的现状

写作前实际读过的文件，不是假设：

| 文件 | 关键事实 |
| --- | --- |
| `src/components/BiauPortMark.tsx` | 现役 Port Beacon：`viewBox="0 0 64 64"`，由 shell / shell-edge / bowl(aperture) / spine / water / terminal / beacon / beacon-glow 组成 |
| `src/styles/navigation.css:85-159` | `.nav-logo` 48×48、`border-radius:16px`、硬编码深蓝底板；`.nav-logo svg` 48×48 |
| `src/styles/navigation.css:1079-1090` | `.page-home .nav-logo` **40×40**、`border-radius:8px`、底板走 `--home-logo-surface` / `--home-logo-border` |
| `src/styles/appearance-themes.css:59-68 / 178-187` | morning 与 nature 定义了全套 `--biau-mark-*` |
| `src/styles/appearance-themes.css:205+` | **stellar 没有任何 `--biau-mark-*` 覆盖**，直接继承 `:root`（morning）的浅色 shell |
| `src/utils/appearance.ts:54` | `.light-theme` = `theme !== 'stellar'`，即 morning + nature 共用一套浅色 CSS 钩子 |
| `src/styles/animations.css:272-447` | 入场 `portBeaconDock` 2.02s；标记内部只用 `biauIntroShell / biauIntroDraw / biauIntroFade / biauIntroBeacon / biauIntroBeaconGlow` |
| `src/components/HarborIntro.tsx:4,81-102` | 存储键 `biau-port-harbor-intro:v3`；stage 尺寸由 `.nav-logo` 的 `getBoundingClientRect()` 实测注入 |
| `src/styles/animations.css:655` | 全局 `prefers-reduced-motion` 关闭开关（`animation-duration: 0.01ms !important`） |
| `public/favicon.svg` | **已过期**：仍是 21f5b613 之前的船体/尾迹/箭头形，与现役组件不一致 |

### 1.2 品牌命题（来自代码，不是新编的）

`src/components/HeroSplit.tsx:47` 是站点自己的承诺句：

> 记录每个产品从构想到上线的过程，并公开它的能力边界、当前状态与验证证据。

四个语义角色因此不是外部命题，而是站点已有文案的直接拆解：

| 角色 | 站内出处 |
| --- | --- |
| 生命周期（构想 → 上线） | `HeroSplit.tsx:47` |
| 能力边界 | `HeroSplit.tsx:47`、`portfolio.ts:340`、`public-content-governance.ts:44` |
| 公开状态 | `statusTargets.ts:8`：`online / degraded / offline / unchecked / planned` |
| 验证证据 | `HeroSplit.tsx:47`、`portfolio.ts:821`、`portfolio.ts:2147` |

标记要做的是把这句话压缩成几何，而不是新增任何业务主张。

### 1.3 禁用母题

船、帆、船体、浪、港湾、罗盘、箭头、播放键、普通 B 字母组合，一律不用；也不描摹任何既有品牌。

> 需要注意：现役标记的 `__water`（horizon baseline）和 `__bowl` 命名本身就贴近"浪/港湾"词汇。三个方向都保留 class 名以避免 CSS 改动，但语义已全部重新指派，建议后续单独做一次 class 更名。

---

## 2. 共用底盘与小尺寸算术

三个方向共用同一个外壳，只有内部字形不同。这样 stellar / morning / nature 的材质切换、`.nav-logo` 底板、入场 dock 都不需要重写。

### 2.1 底盘（沿用现役数值）

```
shell       rect  x=5    y=5    w=54   h=54   rx=18     fill=url(#shell)
shell-edge  rect  x=8.6  y=8.6  w=46.8 h=46.8 rx=14.6   stroke α=0.22  w=1.1
```

### 2.2 安全区

`rx=18` 的圆角会吃掉四角。内部字形一律画在 **x∈[15, 49]、y∈[15, 49]** 的方形安全区内，圆角附近（距角 < 8）不放实笔画。beacon 的 glow 半径按"圆心 ± r 仍落在 x/y∈[12, 52]"取值，避免 `.nav-logo { overflow: hidden }` 硬切出直边。

### 2.3 24px 可读性算术

这是决定所有笔宽的唯一依据。缩放系数 = 目标像素 / 64：

| viewBox 单位 | @64px | @48px | @40px | @24px |
| --- | --- | --- | --- | --- |
| 1.0 | 1.00px | 0.75px | 0.63px | 0.375px |
| 4.5 | 4.50px | 3.38px | 2.81px | 1.69px |
| 5.0 | 5.00px | 3.75px | 3.13px | 1.88px |
| 6.0 | 6.00px | 4.50px | 3.75px | 2.25px |
| 11.0（行距） | 11.00px | 8.25px | 6.88px | 4.13px |

据此定三条硬规则：

1. **主笔画 ≥ 5.0**，承担轮廓的主笔画取 **6.0**（24px 下 2.25px，1× 屏也不会消失）。
2. **两条平行主笔画的间隙 ≥ 5.0 单位**（24px 下 ≥ 1.88px）。间隙 < 4.5 在 24px @1× 会糊成一片。
3. **细节笔画（1.1–2.6 单位）在 24px 下不可依赖**，必须由更粗的元素独立撑起轮廓。

### 2.4 可读性阶梯（明确的降级契约）

四个语义角色不可能在 24px 都同时清晰。与其假装可以，不如声明阶梯——三个方向都遵守：

| 尺寸 | 真实场景 | 必须读出 |
| --- | --- | --- |
| 24px | favicon / 未来紧凑位 | 轮廓 + 状态灯（2 个角色） |
| 40px | `.page-home .nav-logo` | 轮廓 + 状态灯 + 边界（3 个角色） |
| 48px | 其他页 `.nav-logo` | 四角色可辨 |
| 64px+ | 入场 stage、品牌页 | 四角色 + 证据细节完整 |

证据层（最细的一组）统一定为 **40px 以下用 CSS 隐藏**，而不是任其糊成噪点。这是有意的降级，不是缺陷。

---

## 3. 方向 A — 段位闸口（Gate Ledger）

### 3.1 概念

三条**从左对齐、逐级变长**的横杠 = 构想 → 在建 → 上线；右侧一根**竖闸柱**是能力边界。前两级停在边界之前，只有"上线"级抵达边界并与之焊接成 T 形接点。灯在闸柱顶端，是公开状态；上线级下方一条副签细线，是验证证据。

读法：**账目式的进度记录，右侧有一道不可越过的界，界的顶端有一盏灯。**

### 3.2 几何词汇（64×64）

| 元素 | 几何 | 笔宽 / 端点 |
| --- | --- | --- |
| shell | `rect x=5 y=5 w=54 h=54 rx=18` | fill 渐变 |
| shell-edge | `rect x=8.6 y=8.6 w=46.8 h=46.8 rx=14.6` | 1.1，α 0.22 |
| stage1 构想 | `M15.5 23.5 H27` | **6.0**，round |
| stage2 在建 | `M15.5 34.5 H35` | **6.0**，round |
| stage3 上线 | `M15.5 45.5 H45` | **6.0**，左 round / **右 butt** |
| stile 边界 | `M45 20.5 V48.5` | 3.2，butt，α 0.55 |
| countersign 证据 | `M15.5 52.2 H33` | 2.2，round，α 0.6 |
| beacon 状态 | `circle cx=45 cy=16 r=3.2` | 实心 accent |
| beacon-glow | `circle cx=45 cy=16 r=6.4` | α 0.2 |

### 3.3 关键间隙核算

| 间隙 | 单位 | @24px | 结论 |
| --- | --- | --- | --- |
| 行距 23.5 / 34.5 / 45.5 → 笔间隙 | 5.0 | 1.88px | 通过（规则 2） |
| stage2 右端(38) → stile 左缘(43.4) | 5.4 | 2.03px | 通过，"未达边界"可读 |
| stage1 右端(30) → stile 左缘(43.4) | 13.4 | 5.03px | 通过 |
| stage3 butt 端(45) 落在 stile 带内(43.4–46.6) | 焊接 | — | T 接点，无越界 |
| pip 下缘(19.2) → stile 顶(20.5) | 1.3 | 0.49px | 24px 下并成一体 = 灯即柱顶（有意） |
| countersign 顶(51.1) → stage3 下缘(48.5) | 2.6 | 0.98px | 40px 以下隐藏 |
| glow 极点 (45, 9.6) / (51.4, 16) | — | — | 均在 shell 轮廓内，不被 `overflow:hidden` 切边 |

### 3.4 阶梯表现

- **24px**：三条不等长横杠 + 右上一点 accent。轮廓 + 状态可读。副签线隐藏。
- **40px**：闸柱显形，"逐级逼近一道界"成立。
- **48/64px**：副签线、T 接点、shell-edge 全部可辨。

### 3.5 风险

**最主要的风险：三条横杠在 24px 下可能被读成汉堡菜单图标。** 缓解靠三点——长度递增（菜单图标等长）、右侧竖柱、右上角 accent 灯。仍建议 24px 实测后再定案。

---

## 4. 方向 B — 界内序列（Scoped Sequence）

### 4.1 概念

一对**方括号**先声明能力边界——括号是所有工程语境里最无争议的"作用域"记号，且在极小尺寸下依然成立。括号之内是一段**两级台阶 + 顶端灯**的上升路径：构想 → 在建 → 已公开。灯就是第三个节拍，这是有意的合并：**产品"上线"的那一刻，正是它的状态开始公开的那一刻。** 底部两段不等长细线是双签证据。

读法：**一段被明确括起来的上升过程，尽头亮着一盏灯。**

### 4.2 几何词汇（64×64）

| 元素 | 几何 | 笔宽 / 端点 |
| --- | --- | --- |
| shell | `rect x=5 y=5 w=54 h=54 rx=18` | fill 渐变 |
| shell-edge | `rect x=8.6 y=8.6 w=46.8 h=46.8 rx=14.6` | 1.1，α 0.22 |
| bracket-left 边界 | `M25 21 H19 V48 H25` | **5.0**，miter，butt |
| bracket-right 边界 | `M39 21 H45 V48 H39` | **5.0**，miter，butt |
| ascent 生命周期 | `M25 42.5 H30 V36 H35.5 V31` | **4.5**，round join/cap |
| beacon 状态 / 上线 | `circle cx=35.5 cy=31 r=3.3` | 实心 accent |
| beacon-glow | `circle cx=35.5 cy=31 r=6.8` | α 0.2 |
| countersign 证据 | `M22 53 H33 M36 53 H42` | 2.0，round，α 0.62 / 0.38 |

括号腿内净空：x∈[21.5, 42.5]（21 单位）、y∈[23.5, 45.5]（22 单位）。

### 4.3 关键间隙核算

| 间隙 | 单位 | @24px | 结论 |
| --- | --- | --- | --- |
| tread1(y42.5) 与 tread2(y36) 笔间隙 | 2.0 | 0.75px | 24px 下软化，但两段**水平错开**，仍读作一次上升 |
| tread1 左端帽(22.75) → 左腿内缘(21.5) | 1.25 | 0.47px | 24px 下焊接：起点贴着边界（可接受） |
| glow 右缘(42.3) → 右腿内缘(42.5) | 0.2 | — | 刚好不压腿，光晕收在括号内 |
| glow 上缘(24.2) → 上臂下缘(23.5) | 0.7 | — | 收在括号内 |
| 证据线顶(52) → 下臂下缘(50.5) | 1.5 | 0.56px | 40px 以下隐藏 |

### 4.4 阶梯表现

- **24px**：一对括号 + 中间一道上升的斜向笔势 + 顶端 accent。台阶细节化为"上升"，方向感仍在。
- **40px**：两级台阶分离，"界内的过程"成立。
- **48/64px**：双签线与括号直角完整。

### 4.5 风险

**最主要的风险：内净空最紧的方向。** 括号双腿吃掉 x 方向 21 单位、双臂吃掉 y 方向 22 单位，台阶行距被压到 2.0 单位（低于本文规则 2 的 5.0）。之所以仍可接受，是因为台阶是**一条连续折线**而非两条平行笔画——但这条豁免必须靠 24px 实测确认，不能只靠算术。另一风险是括号在中文语境里工程味偏重，品牌温度低于 A 与 C。

---

## 5. 方向 C — 门槛柱（Threshold Post）

### 5.1 概念

一根**中央竖轴**自下而上贯穿三条**宽度递增**的横梁：11 → 17 → 26.4 单位。最上一条最宽、带下折端脚，是**门楣**——它同时是"上线"这一级和"能力边界"这条线。这不是省笔画，而是本项目的真实主张：**上线的前提是边界已经声明清楚。** 门楣之上一盏灯是公开状态；柱脚之下两段不等长细线是双签证据。

读法：**一根柱子穿过三道逐级变宽的梁，顶上压着一道门楣，门楣之上亮着一盏灯。**

### 5.2 几何词汇（64×64）

| 元素 | 几何 | 笔宽 / 端点 |
| --- | --- | --- |
| shell | `rect x=5 y=5 w=54 h=54 rx=18` | fill 渐变 |
| shell-edge | `rect x=8.6 y=8.6 w=46.8 h=46.8 rx=14.6` | 1.1，α 0.22 |
| lintel 门楣（上线 + 边界） | `M18.8 24.5 V21.5 H45.2 V24.5` | **5.2**，miter，butt |
| stage2 在建 | `M23.5 34 H40.5` | **5.0**，round |
| stage1 构想 | `M26.5 44.5 H37.5` | **5.0**，round |
| post 主轴 | `M32 44.5 V23` | **6.0**，round |
| beacon 状态 | `circle cx=32 cy=15 r=3.2` | 实心 accent |
| beacon-glow | `circle cx=32 cy=15 r=6.6` | α 0.2 |
| countersign 证据 | `M24 52 H30.5 M33.5 52 H40` | 2.2，round，α 0.6 / 0.38 |

横梁宽度 11 / 17 / 26.4 自下而上递增；竖轴居中于 x=32，左右对称。

### 5.3 关键间隙核算

| 间隙 | 单位 | @24px | 结论 |
| --- | --- | --- | --- |
| stage1 上缘(42) → stage2 下缘(36.5) | 5.5 | 2.06px | 通过（规则 2） |
| stage2 上缘(31.5) → 门楣端脚下缘(27.1) | 4.4 | 1.65px | 通过 |
| post 顶帽(20) 落在门楣带内(18.9–24.1) | 焊接 | — | 柱自下方顶入门楣，T 接点 |
| post 底帽(47.5) → 证据线顶(50.9) | 3.4 | 1.28px | 40px 以下隐藏证据 |
| pip 下缘(18.2) → 门楣上缘(18.9) | 0.7 | 0.26px | 24px 下并为"门楣自带灯"（有意） |
| glow 上缘(8.4) | — | — | 落在 x∈[23,41] 的平直顶边内，不被圆角切 |

### 5.4 阶梯表现

- **24px**：十字形柱梁轮廓 + 顶部 accent。既不像汉堡菜单，也不像括号。
- **40px**：三梁宽度差与门楣端脚显形，"逐级抵达门楣"成立。
- **48/64px**：双签线、端脚直角、shell-edge 完整。

### 5.5 风险

竖轴 + 横梁 + 顶灯的结构会让人联想到塔状灯具。考虑到标记本名 Port Beacon、且"灯塔"并不在禁用母题内，这更接近资产而非缺陷；但需避免把 shell 做成锥形或加装栏杆细节，否则会滑向具象灯塔。另一风险是三梁宽度差在 24px 下压缩，需实测确认 11 / 17 / 26.4 的差异仍可分辨。

---

## 6. 三主题行为：只换材质与光

### 6.1 不变量（三个方向共同遵守）

跨 morning / nature / stellar，以下内容**逐字符不变**：所有 `d` 路径、所有坐标、所有 `stroke-width`、所有 `linecap` / `linejoin`、`viewBox`、元素顺序。主题只能改渐变停靠色、accent 色、α 与滤镜。

判定方法很直接：把三个主题的 SVG 序列化后 diff，只允许 `--biau-mark-*` 解析值不同。任何 `d` 或数值差异即违约。

### 6.2 可变量

现有三组渐变 + 一个 accent 就够，不需要新增 token：

| Token | 承担 |
| --- | --- |
| `--biau-mark-shell-start/mid/end` | 外壳材质（morning 暖瓷、nature 青瓷、stellar 深空） |
| `--biau-mark-stroke-start/mid/end` | 主字形（横梁 / 括号 / 主轴） |
| `--biau-mark-water-start/mid/end` | 证据副签线 |
| `--biau-mark-beacon` | 状态灯与光晕 |

### 6.3 两个必须先处理的现状缺口

**缺口 1 — stellar 没有 mark token。** `appearance-themes.css:205+` 的 stellar 块不含任何 `--biau-mark-*`，因此暗色主题下标记继承 `:root`（morning）的**浅色外壳 + 深色笔画**。这不是设计决定，是继承的副作用。落地时必须为 stellar 显式补一组，方向建议（与该主题既有的 `#1a1f33` 底板、暖金描边、`#75e1e0` accent 对齐）：

```css
:root[data-site-theme='stellar'] {
  --biau-mark-shell-start: #1b2138;
  --biau-mark-shell-mid: #141a2c;
  --biau-mark-shell-end: #0b0f1d;
  --biau-mark-stroke-start: #f2f5fb;
  --biau-mark-stroke-mid: #c6d2e6;
  --biau-mark-stroke-end: #8fa8cb;
  --biau-mark-water-start: #8fb6cc;
  --biau-mark-water-mid: #cfe0ef;
  --biau-mark-water-end: #e6b878;
  --biau-mark-beacon: #e6b878;
}
```

以上为**待验证提案**，不是实测结果。必须跑对比度门槛后才可采用。

**缺口 2 — 两个 token 从未定义。** 组件里 `--biau-mark-shell-edge`（`BiauPortMark.tsx:52`）与 `--biau-mark-terminal`（同文件 :83）在 CSS 中无定义，永远走内联 fallback，其中 `--biau-mark-terminal` 的 fallback 是硬编码暖白 `rgba(255,246,218,0.76)`——在浅色外壳上会偏灰。要么三主题各自定义，要么从组件里删掉。

### 6.4 对比度门槛

状态灯是功能像素，不只是装饰：`online / degraded / offline / unchecked / planned` 五态要能被区分。因此要求 **accent 对本主题外壳 ≥ 3:1**，主字形对外壳 ≥ 4.5:1。本文未做实测，这是落地时必须跑的门槛，不是已完成的结论。

---

## 7. 入场动画概念（克制版）

### 7.1 约束

沿用 `portBeaconDock` 的 2.02s 三拍，不加长、不新增关键帧：

```
0      ─ 0.63s   窗口在视口中心展开        （biauIntroShell，已存在）
0.63s  ─ 1.29s   停驻：标记内部演出        ← 只在这 0.66s 窗口内编排
1.29s  ─ 2.02s   停靠到实测 .nav-logo 矩形 （portBeaconDock，已存在）
```

### 7.2 编排顺序即承诺句

不是"画一个 logo"，而是按 `HeroSplit.tsx:47` 的语序演一遍：**先划界 → 再走过程 → 再落证据 → 最后亮状态。** 以推荐方向 C 为例：

| 起止 | 元素 | 复用关键帧 |
| --- | --- | --- |
| 0.63 → 0.87 | 门楣 lintel 描画（边界先声明） | `biauIntroDraw` |
| 0.80 → 1.00 | stage1 构想 描画 | `biauIntroDraw` |
| 0.86 → 1.10 | post 主轴 自下而上描画 | `biauIntroDraw` |
| 0.90 → 1.10 | stage2 在建 描画 | `biauIntroDraw` |
| 1.06 → 1.18 | 双签证据 淡入 | `biauIntroFade` |
| 1.12 → 1.29 | 状态灯 + 光晕 点亮 | `biauIntroBeacon` / `biauIntroBeaconGlow` |

演出在 1.29s 收束，正好交给 dock 拍。**新增关键帧数 = 0**，只调 `animation-delay` 与 `duration`。

主轴自下而上这一点是免费的：`M32 44.5 V23` 的路径起点在下端，`pathLength={1}` + `stroke-dashoffset: 1 → 0` 天然从下往上长。

### 7.3 必须保住的既有约定

- 存储键 `biau-port-harbor-intro:v3` —— 只在首访演一次。字形若换，键要升到 `:v4`，否则老访客看不到新演出。
- 全局 `prefers-reduced-motion`（`animations.css:655`）把时长压到 `0.01ms`。因此**每个元素的静态 SVG 属性必须等于动画终态**（这是代码库里已有的纪律，`animations.css:433` 就为此写了注释）。降级动作不清屏、不闪烁，直接呈现完整点亮的标记。
- nav 里的标记是 `animated={false}`（`Navigation.tsx:68`），不参与描画，只保留 hover / focus 过渡。
- 入场 stage 的尺寸、圆角、底板、滤镜由 `HarborIntro.tsx:81-102` 从 `.nav-logo` 实测注入。字形换了不影响这条链路，**前提是不改 shell 的 `rx`**。

---

## 8. 推荐：方向 C — 门槛柱

### 8.1 横向对比

| 维度 | A 段位闸口 | B 界内序列 | **C 门槛柱** |
| --- | --- | --- | --- |
| 主笔画 ≥ 5.0 | ✅ 6.0 | ⚠️ 4.5 | ✅ 5.0–6.0 |
| 平行笔间隙 ≥ 5.0 | ✅ 5.0 | ❌ **2.0** | ✅ 5.5 / 4.4 |
| 24px 轮廓撞车 | ❌ 疑似汉堡菜单 | ⚠️ 括号偏通用 | ✅ 无已知撞车 |
| 语义压缩 | 4 元素各司其职 | 上线与状态合并 | 门楣兼任上线与边界 |
| 主轴对称 | 右重 | 右重 | ✅ 对称于 x=32 |
| 新增 class 钩子 | 1 | **0** | 1 |
| 新增 @keyframes | 0 | 0 | 0 |

### 8.2 选 C 的四个理由

1. **几何本身在论证产品主张。** 门楣同时是"上线"与"能力边界"，这不是为省笔画，而是说出"上线的前提是边界已经声明"。A 和 B 只是把四个角色并排标注，C 是唯一让结构承担论点的方向。
2. **小尺寸有真实余量。** C 的关键间隙是 5.5 与 4.4 单位；A 恰好压线在 5.0；B 只有 2.0，已经跌破本文自己的规则。规则是写给落地用的，不能为选型让步。
3. **对称性对得上既有动画。** 入场是**视口中心**展开、dock 也是中心对齐。C 对称于 x=32，光晕在整个 expand 拍里都稳在轴上；A 与 B 都是右重，展开时光心会偏出轴线，需要额外补偿。
4. **24px 轮廓不撞车。** A 最大的问题是三条横杠像汉堡菜单——导航栏里出现一个像菜单按钮的 logo 是功能性风险，不只是审美问题。

### 8.3 C 的代价

需要 1 个新 class 钩子（下方交接已列）。与 A 相同，比 B 多一个。这个代价换掉了 B 跌破间隙规则的问题，值得。

### 8.4 备选

若 24px 实测显示三梁宽度差（11 / 17 / 26.4）无法分辨，**退到 A**，并把 A 的汉堡菜单风险用"stage3 与闸柱焊接 + 右上灯"来压制。B 不作为备选，除非重做括号比例。

---

## 9. 淘汰标准（可判定，不靠口味）

任一条命中即淘汰该方向，不做微调挽救：

1. 两名以上评审在无提示情况下读出船、帆、船体、浪、港湾、罗盘、箭头、播放键或普通 B 字母。
2. 24px 下被读成汉堡菜单、设置齿轮或加载指示器等既有 UI 控件。
3. 主笔画 < 5.0 单位，或相邻平行笔画间隙 < 5.0 单位且无本文写明的豁免理由。
4. 三主题间出现任何 `d`、坐标或 `stroke-width` 差异。
5. accent 对本主题外壳对比度 < 3:1，或主字形对外壳 < 4.5:1。
6. 笔画或光晕被 `.nav-logo { overflow: hidden }` 切出可见直边。
7. 需要 2 个以上新 class 钩子，或需要新增 `@keyframes`。
8. 入场总时长超过 2.02s，或错过 1.29s 的 dock 交接点。
9. 需要位图资源，或引入不走 `--biau-mark-*` 的硬编码颜色。
10. 与任何既有品牌构成描摹关系。

---

## 10. 交接给 Codex

### 10.1 本次交接事实

| 项 | 值 |
| --- | --- |
| task | 品牌探索 leaf：BIAU Port 标记三方向 + 推荐 |
| branch / worktree | `claude/blog-semi-claude-dev` / `D:\Agent\codex\worktrees\blog-semi-claude-dev` |
| base SHA | `21f5b613f8f49968fdfaa082f663c7e55a9caf0c` |
| 变更文件 | `docs/brand/logo-exploration/port-mark-exploration.md`（新增，唯一） |
| 禁改路径 | `src/**`、`public/**`、`scripts/**`、`.trellis/**`、`package.json`、`package-lock.json`、`public/status/blog-semi-synthetic.json` —— **均未触碰** |
| 验证 | `git diff --check` 通过；未跑 lint / build（本次无代码变更，不适用） |
| 明确排除 | 无未提交的旁挂文件；本次不含任何 SVG 资产产出 |

### 10.2 落地 C 时的最小改动集（尚未执行）

| 顺序 | 文件 | 改动 |
| --- | --- | --- |
| 1 | `src/components/BiauPortMark.tsx` | 换内部字形为 §5.2 九个元素；保留 `viewBox`、`rx=18`、`useId` 前缀、`pathLength={1}`、`aria` 分支 |
| 2 | `src/styles/appearance-themes.css` | 为 stellar 补 `--biau-mark-*`（§6.3 提案）；决定 `--biau-mark-shell-edge` / `--biau-mark-terminal` 是定义还是删除 |
| 3 | `src/styles/navigation.css:147-153` | 过渡选择器列表加入新钩子 `.biau-port-mark__stage` |
| 4 | `src/styles/animations.css` | 按 §7.2 调 delay / duration；**不新增关键帧** |
| 5 | `src/components/HarborIntro.tsx:4` | 字形落地后把存储键升到 `biau-port-harbor-intro:v4` |
| 6 | `public/favicon.svg` | 同步为新字形（见下方风险 1） |

### 10.3 C 的 class 钩子映射

刻意最大化复用，把新增钩子压到 1 个：

| 元素 | class | 状态 |
| --- | --- | --- |
| shell | `biau-port-mark__shell` | 复用 |
| shell-edge | `biau-port-mark__shell-edge` | 复用 |
| lintel 门楣 | `biau-port-mark__bowl` | 复用（nav hover 已挂在其上） |
| stage2 在建 | `biau-port-mark__terminal` | 复用 |
| stage1 构想 | `biau-port-mark__stage` | **新增** |
| post 主轴 | `biau-port-mark__spine` | 复用 |
| beacon | `biau-port-mark__beacon` | 复用 |
| beacon-glow | `biau-port-mark__beacon-glow` | 复用 |
| countersign 证据 | `biau-port-mark__water` | 复用 |

`StellarEffects.tsx` 依赖的 `.harbor-intro__logo-shell` 不在本清单内，保持原样。

### 10.4 落地后的验证顺序

```powershell
npm run lint
npm run build
git diff --check
```

再补三项本次无法替代的人工/工具检查：

1. **24 / 40 / 48px 实测**：三主题 × 三尺寸共 9 张截图，用 `playwright` 抓。这是 A 与 C 之间的判定依据。
2. **对比度门槛**：accent 对外壳 ≥ 3:1、主字形对外壳 ≥ 4.5:1，三主题各测。
3. **跨主题几何 diff**：序列化三主题 SVG，确认只有颜色解析值不同（§6.1）。

`public/status/blog-semi-synthetic.json` 保持只读，不随本次改动 publish。

---

## 11. 遗留风险与未验证项

**风险 1 —— `public/favicon.svg` 已经过期，与现役组件不一致。** 它仍是 21f5b613 之前的船体 / 尾迹 / 箭头形几何（`favicon.svg:3,5,6,7`），也就是说**当前浏览器标签页展示的仍是已被废弃、且含禁用母题的旧标记**。这是本次探索之外的既存缺陷，属禁改路径，未处理。建议作为独立 leaf 修掉，优先级高于新字形落地。

**风险 2 —— 24px 可读性只算过、没测过。** §2.3 的像素值是 `目标px / 64` 的算术推导。1× 屏与 2× 屏的抗锯齿表现不同，B 的 2.0 单位间隙和 C 的三梁宽度差都必须实测。本文任何"通过"都只代表算术通过。

**风险 3 —— §6.3 的 stellar token 是提案。** 未做对比度实测，不能直接采用。

**风险 4 —— 汉堡菜单的撞车判断是主观推断。** 我没做用户测试。它足以支撑"选 C 而非 A"，但不足以断言 A 不可用。

**风险 5 —— 未产出 SVG 资产。** 本文只给几何词汇与坐标表。落地时的实际渲染可能暴露算术不可见的视觉问题（光学重心、笔画交点粗胖感），需要在 §10.2 第 1 步后立刻回看。

**风险 6 —— class 名与语义已经脱钩。** 复用 `__bowl` 承担门楣、`__water` 承担证据、`__terminal` 承担在建梁，是为压低 CSS 改动量。代价是可读性变差。建议字形落地稳定后单独做一次纯改名提交（改名与字形不要混在同一个 commit 里）。
