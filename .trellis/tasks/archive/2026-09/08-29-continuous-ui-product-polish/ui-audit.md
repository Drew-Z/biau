# UI 问题清单与轮次证据

## 基线

- 任务：`08-29-continuous-ui-product-polish`
- 基线提交：`5fd98f56`
- 工作区：`D:\workspace4Cursor\blog-semi`
- 初始状态：创建任务时 `main` 工作区干净；不得修改 `public/status/blog-semi-synthetic.json`。
- 浏览器首轮：已在 `http://127.0.0.1:4173` 运行，截图与指标保存在 `evidence/`。

## 问题清单

| ID | 严重度 | 状态 | 路径/视口/主题 | 证据与影响 | 处理 leaf / 原因 |
| --- | --- | --- | --- | --- | --- |
| UI-001 | P1 | 已验证 | `/projects`、`/blog`、详情、`/status`；320/390/430；三主题入口 | 初始 390px 子页面导航把 3 个 44px 主题按钮压缩到 40px 容器并裁切到视口外；修复后 3 个按钮均完整可见、44px、无横向溢出，品牌文字仍存在。 | `src/styles/navigation.css` + `scripts/check-ui.mjs`；首轮 leaf |
| UI-002 | P1 | 已验证 | 首页；桌面/移动；`morning`、`nature`、`stellar` | 参考站运行时截图与本地截图均确认三套背景动力学和材质已分离：Morning 为粉红→浅黄→青蓝→靛蓝→深蓝流动层；Nature 为淡紫→灰紫→浅青→叶绿→深叶绿云雾，并保留绿色线纹理；Stellar 为灰紫→深靛蓝→蓝钢→深海蓝星场，并使用暖金边框/控件。Hero 面板采用主题半透明 surface，未再被旧的统一玻璃层覆盖。 | `src/styles/appearance-themes.css`（Claude leaf）+ `src/styles/hero-split.css`；Round 2 截图与生产矩阵验证 |
| UI-003 | P1 | 暂缓 | 首页；中英文切换；桌面/移动 | 语言按钮和导航切换为 EN，但 Hero 正文、项目卡和页脚仍完全中文；要把语言状态做成完整产品契约，需要确定公开内容的翻译边界和文案来源。 | 需产品/内容决策；不伪造翻译，不在主题 leaf 中混修 |
| UI-004 | P2 | 已验证 | 项目卡；桌面/移动；三主题 | 移除 article 的 `role="link"`、`tabIndex` 和容器键盘处理，避免 link 角色内嵌 button/link；保留整卡指针入口，键盘入口由详情 button、状态 button 和外链各自承担。 | `src/components/ProjectCard.tsx` + `scripts/check-ui.mjs`；详情 Enter 导航、状态与外链隔离路径均通过 |
| UI-005 | P1 | 已验证 | 首页 Stellar；桌面/移动 | 复核发现 preview/commerce/image 卡片仍读取 Morning/Nature 专属浅色 surface，导致 Stellar 第 3/4/5 张卡片显著偏白，与参考站深蓝星场不一致。将 Stellar 三类专属 surface 统一到 `rgb(22 27 48 / 38%)`，并增加计算样式回归断言。 | `src/styles/appearance-themes.css` + `scripts/check-ui.mjs`；Round 6 截图与全量矩阵通过 |
| UI-006 | P1 | 已验证 | 首页 Logo、入场动画；桌面/移动；三主题 | 原创 Logo 已改为 Port Beacon 几何标记：圆角 shell、aperture、spine、horizon、signal terminal 和 beacon ring，不再使用船体/帆/水波形态。入场动效表现中心信号展开、短暂停留、Logo 线条成形后沿实时 `.nav-logo` 几何目标停靠；三主题只改变材质、颜色和光线，`prefers-reduced-motion` 继续由全局规则收束。 | `src/components/BiauPortMark.tsx`、`src/styles/animations.css`；Round 14 浏览器证据和完整 UI 矩阵通过。Claude leaf 两次恢复无交付差异并按协议终止，Codex 在主目录接管实现 |
| UI-007 | P1 | 已验证 | `/`、`/projects`、`/blog`、`/status`、详情；桌面/移动 | 首页局部字体覆盖已移除，真实路由展示/UI 字体 token 统一为共享 `Iowan Old Style/Source Han Serif SC` 与 `Segoe UI Variable/Segoe UI`。 | `src/styles/hero-split.css`、`src/styles/navigation.css`；Round 10 通过 |
| UI-008 | P1 | 已验证 | 首页 Stellar Port；桌面/移动 | Port 面板已改为深蓝透明内层，加入低强度径向光、10px blur、内侧高光和青色辉光；卡片与星场层级连续，文字/CTA 对比度通过生产矩阵。 | `src/styles/hero-split.css`、`scripts/check-production-appearance.mjs`；Round 11 通过 |
| UI-009 | P1 | 已验证 | 全站导航；桌面/移动；三主题 | 导航现在使用主题化高不透明度 surface、稳定边框/阴影、active/hover/focus 状态；移动端主题按钮维持 44px，非当前链接对比度通过自动化断言。 | `src/styles/appearance-themes.css`、`src/styles/navigation.css`、`scripts/check-production-appearance.mjs`；Round 10/11 通过 |
| UI-010 | P2 | 已验证 | Figma `BIAU Port UI Foundation` | bridge 已连接并可写入唯一 Foundation 页面。本轮建立 `BIAU Port UI Foundation · v1`（node `98:3`），包含三主题 surface 色板、材质说明和 Port Beacon 原创方向；本地变量/样式仍为空，外部设计库查询仍受 HTTP 403 限制，因此不把外部库当作依赖。 | Figma Foundation v1；证据 `evidence/figma-foundation-v1.png` |
| UI-011 | P1 | 已验证 | 首页；`320/390/430px`；三主题；中英文 | 移动首页卡片曾被固定为 `88px` 高，双行标题和两行描述超出内容区域并被 `overflow:hidden` 裁切。改为 `min-height:88px; height:auto` 并让网格行按内容撑开，三主题 `320px` 实测内容均在卡片边界内。 | `src/styles/hero-split.css`、`scripts/check-ui.mjs`；Round 13 通过 |
| UI-012 | P2 | 已验证，待品牌选择 | `/studio/brand/logo-lab`；桌面/320/390/430；三主题 | 生产 Logo 尚未形成可靠品牌结论，直接替换会把视觉试验扩散到导航和 favicon。实验页现只并列 Codex V3 和 Claude V3，覆盖单色、24/40/48/64px、三主题和 reduced-motion；生产 Logo 保持不变。 | `LogoLabPage`、两套 V3 SVG/CSS 候选、`check-ui-smoke.mjs`；Round 25 |
| UI-013 | P1 | 已验证 | `/studio/brand/logo-lab`；桌面/320/390/430；三主题 | 两个现有方案都以准确识别 `B/b` 为首要目标，与用户偏好的早期 Port 模糊轮廓不符。历史 `63dec579` 版本确认核心为主轴、单个开放港池、水口和状态点；新增第三套抽象 Port Glyph，水流线穿过未闭合港池，只保留弱 `b/B` 联想。 | `AbstractPortLabMark.tsx`、`abstract-port-lab.css`、Logo Lab 与 smoke；Round 20 |

## 轮次记录

### Round 0 — 规划

- 修改文件：仅本任务规划文档。
- 验证：待 `task.py start` 后执行。
- 浏览器：尚未启动开发服务器。

### Round 1 — 移动子页面导航 containment

- 修改文件：`src/styles/navigation.css`、`scripts/check-ui.mjs`。
- 修复：移动子页面固定 3 个主题按钮为 `142px` 组宽、动作区不收缩；320px 下压缩品牌文字和列间距但保留品牌，不隐藏身份。
- 浏览器证据：Playwright 在 `/projects`、`/blog`、项目详情、博客详情、`/status` 的 `320`、`390`、`430` 检查均得到 3/3 可见主题按钮、每个 `44px`、`scrollWidth - clientWidth = 0`；首页 3 主题截图保持原布局。
- 自动化：`check-ui.mjs` 已加入相同 containment 断言，覆盖公开子页面移动矩阵。
- 状态：UI-001 已验证；UI-002 主题 parity 进入下一轮。

### Round 2 — 三主题材质与参考站校准

- Claude 交接：`taskId=20260828-225628-8e19e67a`，`worktree=D:\Agent\codex\worktrees\blog-semi-claude-dev`，`branch=claude/blog-semi-claude-dev`，`commit=e43f403f26aef3192f2b75e180b01994bd25468d`；状态器确认 `completed/done`、worktree 干净。主目录未 cherry-pick，而是只将 `src/styles/appearance-themes.css` 的单文件差异以未提交形式应用，保留当前任务的审查边界。
- 修改文件：`src/styles/appearance-themes.css`、`src/styles/hero-split.css`。
- Morning：沿用参考 `#ece4d5` / `#18243a` 和粉红→浅黄→青蓝→靛蓝→深蓝背景，面板/卡片改为低透明度白色 surface。
- Nature：沿用参考 `#ebf0ea` / `#2a3328`，背景包含淡紫、灰紫、浅青、叶绿和深叶绿；面板为 `rgb(242 247 241 / 52%)`，卡片为 `rgb(247 252 246 / 38%)`，并保留独立绿色线纹理，因此不是 Morning 的绿色换色。
- Stellar：沿用参考 `#0b0e1a`、深靛蓝/蓝钢/深海蓝星场，面板为 `rgb(18 22 40 / 52%)`，卡片为 `rgb(22 27 48 / 38%)`，边框和控件维持暖金倾向。
- 背景所有权：未修改 `src/background/flowPalettes.ts` 的三组动力学；继续只使用 `FlowRenderer`、`StarfieldBackground` 和 `StellarEffects`，未新增 Canvas、Worker 或永久 RAF。
- 浏览器证据：`reference-cycle-0-stellar.png`、`reference-cycle-1-morning.png`、`reference-cycle-2-nature.png` 与 `round-2-desktop-*.png`、`round-2-mobile390-*.png`。Nature 截图可见浅青/叶绿云雾透过 Hero 面板，和 Morning 蓝紫流场、Stellar 深色星场形成独立视觉系统。
- 状态：UI-002 已验证。

### Round 3 — ProjectCard 语义与键盘路径

- 修改文件：`src/components/ProjectCard.tsx`、`scripts/check-ui.mjs`、`.trellis/spec/frontend/component-guidelines.md`。
- 修复：取消整张 article 的 link 角色和键盘焦点，保留指针点击；详情 button、状态 button、外链各自保持原生语义、焦点和冒泡隔离。规范同步为“嵌套动作由明确控件承担键盘入口”。
- 自动化：断言卡片无 `role`/`tabindex`，详情 button 可 focus，按 Enter 后进入详情；状态和外链仍走独立路径。
- 状态：UI-004 已验证。

### Round 4 — CSS 级联与首页移动节奏复核

- 修改文件：`src/styles/hero-split.css`。
- 根因：末尾主题材质规则原本只有 `.app.page-home ...` 优先级，无法覆盖同文件中更具体的 Morning/Nature 兼容选择器；提高最终 panel/card 覆盖为 `:root[data-site-theme] ...` 后，浏览器实际计算样式才稳定使用主题 surface。
- 修复期间发现并回滚了一次误命中的中段桌面布局选择器；最终桌面 `hero-panel` 保持原有 grid placement，移动端 `hero-intro` 恢复完整列宽，标题不再逐字换行。
- 浏览器测量：320/390/430px 标题宽度为 `272/342/382px`，首个项目卡 top 约 `364px`；三主题 `data-flow-dynamics` 仍分别为 `15|0.53|0.39|0.33|0.2|1.09|318`、`10|0.82|0.19|0.75|3|1.03|318`、`15|0.67|0.71|0.41|0.2|1.41|318`。
- 截图证据：`round-4-desktop-morning.png`、`round-4-desktop-nature.png`、`round-4-desktop-stellar.png`、`round-4-mobile390-morning.png`、`round-4-mobile390-nature.png`、`round-4-mobile390-stellar.png`。移动 Nature 首屏的主题控制、标题、首卡和底部导航均保持在视口内；底部导航覆盖区仍可通过页面滚动让内容越过，符合现有移动 tabbar contract。
- 回归结果：修复后首页移动路由和 editorial rhythm 均通过；一次完整检查曾出现 `/status` 430px sticky navigator 时序失败，独立连续三轮复现均为 `navigatorTop=8`、`status-manual top=86.4`、select 值同步，随后 smoke/production 矩阵均通过。
- 状态：UI-002、UI-001 均保持已验证；无新增高置信度问题。

### Round 5 — 继续审计与完整回归

- 工作区复核：仍只包含本任务的 6 个产品/规范文件和任务记录；`public/status/blog-semi-synthetic.json` 未进入差异。
- 视觉复核：重新并排检查参考站与 `round-4-desktop-*`、`round-4-mobile390-*` 证据。Morning 保留暖黄→青蓝→靛蓝流场，Nature 保留青绿低频云雾、独立灰绿 surface 和绿色纹理，Stellar 保留深蓝星场、暖金边界和青色强调；未发现可稳定复现的新主题差异。
- 完整回归：`check:ui` 本轮为 `groups=40 failed=0`，此前偶发的 `/status` 430px sticky navigator 时序问题没有再次出现。
- 专项回归：`check:ui:smoke` 为 `18/18`；`check:ui:production-appearance` 为 `14/14`，覆盖三主题、键盘切换、刷新持久化及 320/390/430 containment。
- 质量与预算：`lint`、`build`、`performance:check`、`git diff --check` 均通过；主 JS `421917 / 430000` bytes，主 CSS `145967 / 222755` bytes，无外部阻塞样式。
- 状态：无新增高置信度 UI 问题，满足“已不存在值得立即修复的问题”的停止条件；UI-003 仍按产品内容决策暂缓。

### Round 6 — Stellar 卡片材质回归修复

- 根因：`--home-card-preview`、`--home-card-image` 和 `--home-card-commerce` 在 Stellar 主题中仍沿用浅色默认值，末尾首页选择器虽已切换主题边框，却继续把这些专属 surface 注入卡片背景。
- 修复：在 `:root[data-site-theme='stellar']` 中将三类专属 surface 明确设为 `rgb(22 27 48 / 38%)`，使所有首页卡片保持深蓝星场层次；Morning/Nature 的差异化卡片令牌不变。
- 回归断言：`check-ui.mjs` 的主题矩阵现在读取前 5 张非循环首页卡片的计算 `--home-card-surface`，Stellar 任一 surface 偏离 `22 27 48` 即失败。
- 浏览器证据：新增 `evidence/round-6-desktop-stellar.png` 和 `evidence/round-6-mobile390-stellar.png`；桌面/移动均确认 5 张卡片统一深蓝材质、暖金边框和青色动作控件。
- 验证：`check:ui` `40/40`、`check:ui:smoke` `18/18`、`check:ui:production-appearance` `14/14`；`lint`、`build`、`performance:check`、`git diff --check` 均通过。
- 状态：UI-005 已验证；无新增高置信度主题问题，UI-003 继续按产品内容决策暂缓。

### Round 7 — 跨页面语言与主题回归审计

- 浏览器范围：`/`、`/projects`、`/blog`、`/status`、项目详情和博客详情；桌面及 `320/390/430px`；`morning`、`nature`、`stellar`。
- 语言状态：点击真实语言按钮后，按钮切换为 `EN`，顶部导航切换为英文，移动底部导航出现 `KNOWLEDGE`；主体正文、项目卡、详情正文、状态正文和页脚仍为中文。横向溢出为 `0`，主题按钮保持 `44px`。UI-003 再次确认，仍因缺少正式英文文案契约暂缓。
- 跨页面主题：Projects、Blog、Status 及详情路径的 body/hero surface 分别保持 Morning `rgb(236 228 213)`、Nature `rgb(235 240 234)`、Stellar `rgb(11 14 26)`，未发现主题状态丢失或页面级横向溢出。
- 证据：`evidence/round-7-*.png`。
- 状态：UI-001、UI-002、UI-004、UI-005 保持已验证；无新增高置信度问题。

### Round 8 — 启动动画结束后的真实页面复核

- 复核重点：等待品牌 intro 遮罩结束后，再检查首页第一视口，而不是将启动画面误判为页面内容。
- 桌面与移动证据：`evidence/round-10-desktop-morning.png`、`round-10-desktop-nature.png`、`round-10-desktop-stellar.png` 及对应 `round-10-mobile390-*.png`。
- 视觉结果：Morning 保持暖色到蓝紫流场与米色 surface；Nature 保持淡紫/青绿/叶绿云雾、灰绿面板和独立绿色材质；Stellar 保持深蓝星场、星点、暖金边框和青色操作控件。首页标题、首个项目卡、状态摘要和 CTA 均可见；`390px` 首屏无横向溢出，底部导航与助手控件没有改变主题语义。
- 交互语义：语言按钮和三个主题按钮均有明确 `aria-label`/`title`，主题按钮实测为 `44×44px`；未发现新的焦点或可达性缺陷。
- 状态：没有值得立即修复的高置信度 UI 问题；UI-003 继续暂缓，原因仍为产品内容决策而非布局缺陷。

### Round 9 — 重新定义融合式 UI 范围与 Foundation Phase 0

- 触发：用户视觉反馈推翻此前“参考站化首页已完成”的停止结论，明确要求保留主站信息架构，只融合三主题背景动效、材质和少量样式经验。
- 代码 gap：主题 token 已分出 Morning/Nature/Stellar 背景和基础 surface，但首页 `hero-split.css` 仍有独立字体/材质覆盖，导航 token 透明度过低，Stellar Port panel 与外部星场层级断裂。
- Figma gap：`BIAU Port UI Foundation` 页面存在但为空；`get_variable_defs`、`get_styles` 均无内容，旧主题页 `get_node` 因连接波动失败；`get_libraries` 返回 HTTP 403，未引入外部设计库。
- v1 范围锁定：不改变主站路由、内容、项目卡和 CTA；保留三主题背景 owner 与动效；以 Foundation 记录共享字体、导航 surface、Logo/入场动画候选、Port panel、Card 和 320/390/430 响应式状态；首页只使用适度主题材质，不复制参考站布局。
- 风险：Logo 最终形态、入场叙事、全站字体选择及英文翻译仍需产品/内容决策；本轮不伪造翻译，不修改 `public/status/blog-semi-synthetic.json`，不删除 Claude worktree。
- 状态：UI-006、UI-007、UI-008、UI-009 待处理；UI-010 Phase 0 已完成，进入 Foundation 建设前的确认点。

### Round 10 — 共享导航 surface 与跨页面字体统一

- 修改文件：`src/styles/appearance-themes.css`、`src/styles/navigation.css`、`src/styles/hero-split.css`。
- UI-009：Morning/Nature/Stellar 导航使用主题化高不透明度 surface、稳定边框/阴影、active/hover 背景和主题文字 token；移动端保持 44px 主题按钮与现有 containment。
- UI-007：移除首页 `Georgia/Inter` 和浅色 `Fraunces/DM Sans` 的局部 token 覆盖；导航中的硬编码 `DM Sans` 改为共享 `--font-ui`。真实路由测量确认 `/`、`/projects`、`/blog`、`/status`、项目详情和博客详情的展示/UI 字体 token 均一致。
- 浏览器证据：`evidence/round-9-nav-morning.png`、`evidence/round-9-nav-stellar.png`；Morning 与 Stellar 导航已从动态背景中分离，非当前项可读，`scrollWidth - clientWidth = 0`。
- 自动化：`lint`、`build`、`check:ui:production-appearance` `14/14`、`check:ui:smoke` `18/18`、`git diff --check` 均通过。
- 状态：UI-009、UI-007 已验证；下一轮处理 UI-008 Stellar Port 材质融合。

### Round 11 — Stellar Port 面板融合与回归契约

- 修改文件：`src/styles/hero-split.css`、`scripts/check-production-appearance.mjs`。
- UI-008：Stellar Port panel 改为深蓝透明内层，加入青色/蓝钢低强度径向光、10px 背景模糊、内侧高光和低强度辉光；卡片统一到同一深蓝层级，保留暖金边界和青色 CTA。
- 自动化契约：生产主题检查现在要求导航 surface alpha `>= 0.7`、非当前导航文字对比度 `>= 4.5`、导航存在 blur；Stellar panel 必须保留 blur。既有三主题 card/hero 对比度、动态 owner 和移动 containment 检查不变。
- 浏览器证据：`evidence/round-10-stellar-panel-loaded.png`；Stellar 页面在等待背景与主题切换完成后检查，Port panel 与星场连续，面板文字/CTA 可读，导航独立且无横向溢出。
- 自动化：`lint`、`build`、`check:ui` `40/40`、`check:ui:smoke` `18/18`、`check:ui:production-appearance` `14/14`、`performance:check`、`git diff --check` 均通过。
- 状态：UI-008 已验证；UI-006 Logo/入场动画仍待 Foundation 恢复后锁定原创方案；UI-003 英文内容仍因缺少正式翻译契约暂缓。

### Round 13 — Foundation v1 与移动卡片内容可读性

- Figma：确认唯一页面 `BIAU Port UI Foundation` 可写入；建立 `BIAU Port UI Foundation · v1`，记录 Morning/Nature/Stellar surface 色板、材质原则和 Port Beacon 原创 Logo/动画约束。截图证据：`evidence/figma-foundation-v1.png`。
- 浏览器审计：Playwright 实测首页 `320px` 的三主题首 5 张卡片。原实现中首三张卡片标题/描述超出 88px 卡片并被裁切；截图 `current-nature-320.png`、`current-stellar-320.png` 可复现。
- 修复：`src/styles/hero-split.css` 移动首页卡片改为 `height:auto`、`min-height:88px`、`grid-template-rows:auto`；`scripts/check-ui.mjs` 新增标题、描述、CTA 必须落在卡片边界内的断言。
- 修复后证据：`current-nature-320-fixed.png`、`current-stellar-320-fixed.png`；三主题测量结果中首 3 张卡片高度约 `113px`、后续约 `97px`，内容均未裁切，横向溢出为 `0`。
- 状态：UI-011 已验证；UI-006 进入下一轮 Logo/动画实现，UI-003 继续暂缓，仍需正式英文文案来源。

### Round 14 — Port Beacon Logo 与入场动效

- Claude 交接：原 bounded leaf `20260830-041114-26e62a49` 使用专用 worktree `D:\Agent\codex\worktrees\blog-semi-claude-dev`、base SHA `e43f403f26aef3192f2b75e180b01994bd25468d`，拥有 `BiauPortMark.tsx`、`HarborIntro.tsx`、`animations.css`。初始会话和两次恢复均未产生差异，最终状态 `failed_terminal`；未修改或删除该 worktree，Codex 接管实现。
- 修改文件：`src/components/BiauPortMark.tsx`、`src/styles/animations.css`。保留既有 DOM class 和实时停靠变量，避免破坏 `check-ui` 的几何/事件契约；新增 aperture、beacon ring 和 signal-field 视觉层，删除视觉上的船体叙事。
- 浏览器证据：`evidence/round-14-intro-desktop.png`、`round-14-intro-mobile390.png`、`round-14-intro-morning.png`、`round-14-intro-nature.png`、`round-14-intro-stellar.png` 以及对应 `round-14-nav-*`。桌面停靠目标与导航中心误差为 `0`，移动停靠目标与导航中心误差为 `0`；Morning、Nature、Stellar 均保持独立材质，Logo 在 40px 导航尺寸仍可辨识。
- 验证：`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run performance:check`、`npm.cmd run check:ui`（`40/40`）、`npm.cmd run check:ui:smoke`（`18/18`）、`npm.cmd run check:ui:production-appearance`（`14/14`）和 `git diff --check` 均通过。完整矩阵覆盖 17 路由、桌面/390px 移动、三主题、主题持久化、reduced-motion、Studio、助手和详情路径。
- 状态：原实现曾标记 UI-006 已验证，但用户视觉验收失败，后续重新打开该问题；UI-003 继续暂缓，原因仍是缺少正式英文翻译稿，不在 Logo leaf 中伪造内容。

### Round 15 — 开放 Logo 容器与真实三主题复核

- 用户反馈：内部几何虽已去除船体/水波/箭头，但导航和入场仍被圆角方形 shell 包裹，整体仍像通用 App 图标；本轮把 Logo 外层降为透明开放标记，保留主题化短角轮廓、独立导航 surface 和可见 focus ring。
- 修改文件：`src/styles/navigation.css`、`src/styles/animations.css`；未修改 `HarborIntro.tsx` 的实时停靠、sessionStorage、reduced-motion 或事件契约。
- 浏览器证据：`evidence/logo-open-frame-morning-desktop.png`、`logo-open-frame-nature-desktop.png`、`logo-open-frame-stellar-desktop.png`、`logo-open-frame-morning-mobile390.png`、`logo-open-frame-intro-morning-desktop-850ms.png`、`logo-open-frame-intro-stellar-mobile390-850ms.png`。桌面三主题和 390px 移动均为 `40×40`、透明外层、无横向溢出；真实 Stellar 移动 intro 的 shell 为约 `138×138`、无背景/边框/阴影。
- Claude 交接：新 bounded leaf `20260830-144058-6952c4dc` 使用 `D:\Agent\codex\worktrees\blog-semi-claude-dev`、base SHA `21f5b613f8f49968fdfaa082f663c7e55a9caf0c`，仅允许写 `docs/brand/logo-exploration/**`。Claude 以 `bypassPermissions` 启动，但上游 API 返回 403（剩余额度约 `$0.006`，预扣要求 `$0.300`），未产生文件或提交；按恢复协议停止，worktree 保留且干净。
- 状态：UI-006 仍为“待用户视觉验收”，当前是可运行候选而非最终品牌定稿；候选仍存在通用 B monogram 风险，下一轮如要定稿应先获得品牌方向确认或新的可用 Claude 概念材料。

### Round 16 — 回归修复与完整门禁

- 发现并修复：开放容器首次改动使旧的 shell parity 断言和子页面 brand focus ring 失败；通过统一 intro/nav 的透明 shell 与主题 focus outline 恢复契约，不放宽断言。
- 修改文件：`src/styles/navigation.css`、`src/styles/animations.css`。
- 验证：`npm.cmd run check:ui` `40/40`，覆盖 17 路由 × 桌面/390px；首次失败的 `flow-intro` 与 `catalog-projects` 分组已在修复后通过。`npm.cmd run check:ui:smoke` `18/18`；`npm.cmd run check:ui:production-appearance` `14/14`；`npm.cmd run performance:check` 通过；`git diff --check` 通过。
- 状态：UI-006 保持待用户视觉验收；UI-003 继续暂缓。未修改 `public/status/blog-semi-synthetic.json`。

### Round 17 — Figma 现场复核、开放证据窗候选与完整门禁

- Figma bridge 当前连接文件为 `my project`（fileKey `unsaved-mtg9u0j9-ebcblq79`），当前页仍是 `BIAU Port UI Foundation`，包含 `BIAU Port UI Foundation · v1`。页面仍保留旧的 `98:33 Brand direction / Port Beacon`；`get_variable_defs` 返回空 collections，`get_styles` 的 paints/text/effects/grids 均为空。因此 Foundation v1 不是与当前代码同步完成的设计系统，旧 Logo 区域不能作为最终稿。
- Claude 交接复核：`20260830-144058-6952c4dc` 的 manifest 明确记录 `bypassPermissions` 与 `--dangerously-skip-permissions`，agent/daemon 已停止，worktree `D:\Agent\codex\worktrees\blog-semi-claude-dev` 干净且无提交；失败根因是上游 API 403 预扣费额度不足（不是本地权限）。当前 `.trellis/config.yaml` 未显式覆盖 `codex.dispatch_mode`，按默认 `inline` 运行，因此主会话不会自动派发 Trellis implement/check 子代理。
- 本轮只读浏览器取样：使用项目 Playwright 在 1440x1000 与 390x900 进入 `/`，预置三主题和 `biau-port-harbor-intro:v3` session 状态。Morning、Nature、Stellar 的导航均为独立 surface；Stellar Port panel 与星场材质连续；移动端无横向溢出。固定底栏在首屏会覆盖后续可滚动卡片，但页面底部 clearance 仍可滚动到完整内容，未形成新的高置信度阻断问题。
- 最新验证：`npm.cmd run lint` 通过；`npm.cmd run build` 通过（Vite `8.0.16`、1880 modules、主 JS `422.09 kB`、主 CSS `153.24 kB`）；`npm.cmd run performance:check` 通过；`npm.cmd run check:ui` `40/40`；`npm.cmd run check:ui:smoke` `18/18`；`npm.cmd run check:ui:production-appearance` `14/14`；`git diff --check` 通过。未修改 `public/status/blog-semi-synthetic.json`。
- 状态：Figma 仍需后续把最新 Logo 方向和主题变量同步为正式 Foundation；Claude 需等待可用额度后再派一个只写 `docs/brand/logo-exploration/**` 的 bounded leaf。UI-006 保持待用户视觉验收；UI-003 继续暂缓，不伪造英文翻译。

### Round 20 — 早期 Port 轮廓回看与抽象 Glyph 候选

- 历史核查：commit `63dec5791dead908b56cab40f4a752baeb6077c1` 的最早 `BiauPortMark` 由竖向主轴、单个不闭合弧形港池、穿越水面线和暖色信号点组成；它只弱提示 `b/B`，并未将字母拟真作为识别前提。最早仓库 favicon `99e6360d` 为紫色闪电，不属于当前 Port 方向。
- 方向调整：新增 `AbstractPortLabMark`，保留偏移主轴、单个开放港池、穿越水口、短码头线与状态点，去掉双层内腔和完整 `B` 闭合；不复制旧圆角 App tile、旧 SVG 坐标或直接航海图标。
- 实验面：Logo Lab 现在并排展示定制大写 `B`、Claude `Basin & Channel` 小写 `b` 和抽象 Port Glyph；三者均覆盖单色、`24/40/48/64px`、Morning/Nature/Stellar 和 reduced-motion，生产导航与 favicon 未替换。
- 浏览器证据：`evidence/round-20-logo-abstract-desktop-morning.png`、`desktop-nature.png`、`desktop-stellar.png`、`mobile320-morning.png`、`mobile390-nature.png`、`mobile430-stellar.png`；所有视口 `overflow=0`，三张候选卡和 9 个抽象标记均存在，移动底栏隐藏。
- 自动化：`check:ui:smoke` 更新为同时断言 9 个 Codex、9 个 Claude 和 9 个抽象标记，21/21 通过；`check:ui` 40/40、`check:ui:production-appearance` 14/14、`lint`、`build`、`performance:check` 与 `git diff --check` 均通过。生产 Logo、`public/status/blog-semi-synthetic.json`、Figma Foundation 和 Claude worktree 均未修改。

## 最终验证快照

- `npm.cmd run lint`：通过。
- `npm.cmd run build`：通过；Vite `8.0.16`，1886 modules，主 JS `422.41 kB`、主 CSS `152.79 kB`。
- `npm.cmd run performance:check`：通过；JS `422418 / 430000` bytes，CSS `152798 / 222755` bytes，无外部阻塞样式。
- `git diff --check`：通过；仅有 Git 的 LF→CRLF 工作树提示，无 whitespace error。
- `$env:UI_CHECK_BASE='http://127.0.0.1:4174'; npm.cmd run check:ui`：40/40，通过 17 路由 × 桌面/390 移动完整矩阵。
- `$env:UI_CHECK_BASE='http://127.0.0.1:4174'; npm.cmd run check:ui:smoke`：21/21，通过 7 路由 × 桌面/390/窄屏。
- `npm.cmd run check:ui:production-appearance`：14/14，通过 Morning/Nature/Stellar、键盘持久化和 320/390/430 containment。
- `/projects/space-war` 曾在一次早期完整检查中出现时序失败；随后手动复现截图 `repro-space-war.png` 正常，最终 40/40 全量检查也通过，未修改路由或业务数据。
- `public/status/blog-semi-synthetic.json` 未修改。

## 剩余/暂缓

- UI-003 仍需产品决定全站英文内容的覆盖边界与真实翻译来源；在此之前不伪造 Hero、项目卡和 footer 的英文文案。
- 当前不存在值得立即继续修改的高置信度主题或主路径 UI 问题；UI-006 的剩余问题是品牌方向和用户视觉决策，不是可由自动化可靠判定的布局缺陷。后续若继续追求参考站的像素级构图，需要先明确允许调整产品站信息密度/可读性的程度，因为参考站截图本身有更低的卡片文字对比度。

### Round 18 — Claude 品牌探索交接与门槛柱 Logo 落地

- Claude 交接：`taskId=20260830-212421-0520513d`，`agentId=4719a8ae`，独立 worktree `D:\Agent\codex\worktrees\blog-semi-claude-dev`，base SHA `21f5b613f8f49968fdfaa082f663c7e55a9caf0c`，完成提交 `b37c4399a41d6ad0f590fad3b19d08961cdf301c`。唯一变更为 `docs/brand/logo-exploration/port-mark-exploration.md`，未触碰生产代码、受保护状态文件或脚本；`git diff --check` 通过。
- 设计审查：Claude 提出 A“段位闸口”、B“界内序列”、C“门槛柱”，并以主笔画、平行间隙、24px 轮廓风险、对称性和动画复用做出可判定比较。Codex 采用 C 的内部几何，但保留主站现有开放四角窗口，不重新引入圆角 App tile；该组合表达“阶段 → 边界 → 公开状态 → 证据”，同时避免旧 Port Beacon 的船体/波浪/箭头语义。
- 修改文件：`src/components/BiauPortMark.tsx`、`public/favicon.svg`、`src/styles/appearance-themes.css`、`src/styles/navigation.css`、`src/styles/animations.css`。三主题共用同一 SVG 几何；Stellar 增加显式 mark token，Morning/Nature 的开放边界改为主题化 `--biau-mark-shell-edge`，favicon 与运行时 Logo 同步。
- 动画/兼容：保留 `biau-port-harbor-intro:v3`、真实 `.nav-logo` DOM rect 停靠、`harborVesselDock` / `harborMarkLand` / `harborIntroVeil` 事件和全局 `prefers-reduced-motion`；仅调整既有描画顺序和延迟，未新增永久背景 owner。
- 浏览器证据：Playwright 实测 `1440x1000` 的 Morning/Nature/Stellar 首页、`390x900` Stellar 首页，以及 24/40/48px Logo 样本。三主题导航均为独立 surface；Stellar Port panel 与星场连续；24px 能读出中央柱、三层横梁和状态灯；390px 无横向溢出。浅色开放边界在修复后可见。
- Figma：在当前唯一 `BIAU Port UI Foundation` 页的既有 `98:33` 品牌区原位更新，不创建新页面。旧 Port Beacon 图形节点 `99:40`–`99:44` 已隐藏，区域改名为 `Brand direction / Open Threshold Mark`，文案改为当前品牌语义，并新增可编辑几何 frame `104:2`（开放四角、三层门槛柱、公开状态灯、证据双签线）。当前文档的正式 Variables/Styles 仍为空，因此这次是方向稿同步，不宣称完整设计系统已经完成。
- 自动化：`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui`（`40/40`）、`npm.cmd run check:ui:smoke`（`18/18`）、`npm.cmd run check:ui:production-appearance`（`14/14`）、`npm.cmd run performance:check` 和 `git diff --check` 均通过。未修改 `public/status/blog-semi-synthetic.json`。
- 状态：UI-006 的工程实现和回归已验证，品牌视觉仍保留用户最终确认；UI-003 继续因没有正式英文文案而暂缓。当前没有新的高置信度布局、主题或导航阻断问题。

### Round 19 — Codex / Claude 双实现 Logo Lab

- 页面：新增按需路由 `/studio/brand/logo-lab`，不进入主导航、项目目录或 sitemap；生产 `BiauPortMark` 与 favicon 均未被本轮实验替换。
- Codex 候选：`LogoLabMark` 的定制大写 `B`，以双内腔、开放切口、状态节点和短角安全区表达 Port；24px 隐藏角标/证据线，避免装饰糊成噪点。
- Claude 候选：`taskId=20260830-233033-f179f65f`，worktree `D:\Agent\codex\worktrees\blog-semi-logo-fluid`，base SHA `5fd98f56`，权限模式 `bypassPermissions`；只写 `ClaudeLogoLabMark.tsx` 与 `claude-logo-lab.css`。原 agent `00eddbd5` 在完成文件后进入 blocked；一次同 worktree recovery `3cc84873` 因恢复脚本旧 manifest 属性错误未能正常登记，Codex 保留并审查 diff 后精确停止两个 leaf 进程，没有盲目重启或删除 worktree。
- 集成审查：Claude 初稿主轴断开，放大时更像 `i+c`；单色样片在 Stellar 下继承浅色；固定三主题样片会被根主题覆盖。Codex 将主轴/内腔连成清晰小写 `b`、补足开放水口状态线、锁定单色墨色，并提高样片级 token 优先级。
- 浏览器：桌面与 320/390/430 均无横向溢出；每个视口渲染 9 个 Codex 与 9 个 Claude mark；三张固定主题样片分别解析 Morning `#15233b/#d5566d`、Nature `#203329/#d5a85d`、Stellar `#f2f5fb/#e6b878`，不再随当前页面主题串色。移动实验页隐藏底部 tabbar，避免遮挡长对照面。
- 视觉结论：大写 `B` 在 24px 的品牌字母识别更稳定，但开放短角较多、图形负担更重；小写 `b` 轮廓更简洁、主题材质更直接，但仍需验证是否过于接近常见字母标。两者都保留为候选，尚不替换生产主标。

### Round 22 — V3 重新生成与 Claude 上游阻塞

- 用户反馈：上一轮候选仍不符合“只隐约关联 B/b、优先抽象 Port 轮廓”的方向，要求 Codex 与 Claude Code 各自重新设计一版再比较；本轮不替换生产导航 Logo、favicon 或项目子标。
- Codex V3：新增 `CodexLogoV3Mark` 与 `codex-logo-v3.css`，采用偏移主轴、上下两段不闭合岸线、横向公开水口、状态节点和证据双刻度；几何不闭合为标准字母，也不使用 App 方块、船、锚、罗盘或波浪图标。后续视觉抽查已将回环拆为开放断面，降低 `P/B` 联想。
- Claude 交接：新 leaf `taskId=20260831-173510-87c6f98f`，worktree `D:\Agent\codex\worktrees\blog-semi-logo-v3`，base SHA `5fd98f5664e3469d5884dec155abdee0f6aca610`，权限模式 `bypassPermissions`，owned files 为 `ClaudeLogoV3Mark.tsx`、`claude-logo-v3.css` 和设计说明。Claude Code 启动时权限和 worktree 均正常，但 Opus 通道连续 10 次返回 `502 Upstream service temporarily unavailable`；同 session 恢复后仍未写入文件。随后以同一干净 worktree 显式启动 Sonnet leaf `taskId=20260831-183809-c3d8d9de`，同样在没有写入任何文件时转为 `blocked`。两次精确进程均已停止，worktree 保持干净；该 leaf 记录为外部推理服务阻塞，不把 Codex 方案冒充为 Claude 方案。
- 实验页：当前展示 Codex V3，并将上一版 Claude V2 标注为“临时参照 / V3 BLOCKED”；待 Claude 网关恢复后，只需在原 owned 文件中生成 V3 并替换 import，不改变生产页面。
- 浏览器与门禁：Logo Lab 桌面、`320/390/430px` 三个移动宽度均 `overflow=0`，2 个候选卡、9 个 Codex V3、9 个 Claude 参照均渲染，移动底栏隐藏。`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui` `40/40`、`npm.cmd run check:ui:smoke` `21/21`、`npm.cmd run check:ui:production-appearance` `14/14`、`npm.cmd run performance:check`、`git diff --check` 均通过；截图为 `evidence/round-22-logo-v3-*.png`。
- 状态：Codex V3 工程验收已验证；Claude V3 等待外部网关恢复后再生成。UI-006 仍是用户视觉确认项，生产 Logo 与 `public/status/blog-semi-synthetic.json` 未修改。

### Round 23 — Codex V3 开放岸线视觉复核

- 浏览器证据：重新生成 `evidence/round-23-logo-v3-desktop-morning.png`、`desktop-nature.png`、`desktop-stellar.png` 及 `mobile320-morning.png`、`mobile390-nature.png`、`mobile430-stellar.png`。截图基于当前上下两段开放岸线版本，不沿用 Round 22 的连续回环图片。
- 实测结果：六个视口的 `data-site-theme` 分别正确为 morning/nature/stellar，导航 surface 分别为 `rgb(236 228 213)`、`rgb(235 240 234)`、`rgb(11 14 26)`；Logo Lab 横向溢出均为 `0`。Codex V3 彩色预览、单色样本和 `24/40/48/64px` 阶梯均实际渲染，移动端单列布局无遮挡或裁切。
- 视觉结论：V3 的主轴、上下开放岸线、横向水口、状态节点和双证据刻度在大尺寸与小尺寸均保持同一几何；Nature 不再只是 Morning 换色，Stellar 的导航和面板与星场保持深色层级。该结论只确认工程和候选对照质量，不代表用户已确认生产品牌。
- Claude 状态：三个 V3 任务的 worktree 仍无文件差异、无提交；最终通过真实 `claude.cmd stop` 停止 `a74bc9c4`、`36e35e3b`、`45106ebe`，复核结果为 agent/daemon `stopped`、精确进程不存在、worktree 仍干净。此前连续 502 未产生任何 Claude V3 产物。按 recovery protocol 不再启动第四个 leaf，保留 worktree 和日志供外部网关恢复后继续。
- 验证：`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui`（`40/40`）、`npm.cmd run check:ui:smoke`（`21/21`）、`npm.cmd run check:ui:production-appearance`（`14/14`）、`npm.cmd run performance:check` 和 `git diff --check` 均通过；未修改 `public/status/blog-semi-synthetic.json`。
- 状态：Codex V3 工程和视觉复核已验证；Claude V3 仍为外部阻塞，UI-006 保持待用户视觉选择。当前没有新的高置信度主路径 UI 问题。

### Round 25 — Claude V3 初稿交接、有限集成与生产外观复验

- Claude 交接：初稿任务 `20260902-061019-9becd3a2` 在 `D:\Agent\codex\worktrees\blog-semi-logo-v3-retry`、分支 `claude/blog-semi-logo-v3-retry`、基线 `5fd98f5664e3469d5884dec155abdee0f6aca610` 完成提交 `9c23cffbcdf3f5fcabc8e64acf26b6f11d312e19`。授权范围仅为 `ClaudeLogoV3Mark.tsx`、`claude-logo-v3.css` 和 `docs/brand/logo-regeneration/claude-v3.md`。
- 失败与接管边界：后续 refinement `20260902-072153-09aee4fc` 及一次恢复均返回 `API Error: 405 Not Allowed`，worktree 无 diff，最终为 `failed_terminal`。按恢复协议停止精确 agent，不删除 worktree，也不重启同一 leaf。Codex 仅在主目录把直脊柱改为三段错位开放边界、将状态点改为非等距节奏，并修正 `prefers-reduced-motion` 规则；因此当前候选是“Claude 初稿 + Codex 有限收束/集成”，不是 Claude 独立最终交付。
- 浏览器证据：`round-25-logo-lab-morning-1440.png`、`round-25-logo-lab-nature-1440.png`、`round-25-logo-lab-stellar-1440.png`、`round-25-logo-lab-morning-320.png`、`round-25-logo-lab-nature-390.png`、`round-25-logo-lab-stellar-430.png`。实际路由为 `/studio/brand/logo-lab`；桌面有 2 张候选卡，三个根主题均正确，移动端为单列且无横向溢出，底部导航隐藏避免遮挡实验页。
- 自动化：当前 `4174` preview 上 `npm.cmd run check:ui:production-appearance` 为 `14/14`，覆盖 Morning/Nature/Stellar 外观、键盘主题持久化及 `320/390/430px` containment；`git diff --check` 通过；`public/status/blog-semi-synthetic.json` 仍未修改。此前同一版本的 `lint`、`build`、`check:ui` `40/40`、`check:ui:smoke` `21/21` 和 `performance:check` 均通过。
- 状态：UI-012 的工程候选与验收已完成，下一步需要用户的视觉选择才能替换生产主标；UI-003 仍因缺少正式英文文案契约暂缓。当前无新的高置信度主路径 UI 阻断问题。
