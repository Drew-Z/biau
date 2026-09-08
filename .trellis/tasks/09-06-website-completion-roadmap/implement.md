# 网站完善路线图实施计划

## 启动前门禁

- [x] 创建总任务并完成代码、文档、规范和现有任务盘点。
- [x] 明确 Stage 1-6 的边界、依赖、验收方向和 out-of-scope。
- [x] 用户确认主要成功标准为项目理解与内容发现，并完成 PRD convergence pass。
- [x] 2026-09-08 用户授权持续评估与执行；父任务承担循环协议，进入 `in_progress`，不直接启动所有阶段。
- [x] 第一项独立子任务 `09-08-stage-1-ui-delivery` 已完成并归档，已实际返回父任务重新评估。
- [x] 在子任务代码编辑前使用 `trellis-before-dev`，读取 frontend 相关 spec 和当前子任务上下文；后续子任务继续遵守。

## Stage 1：UI 稳定与交付

1. 复核现有 `09-04-continuous-ui-quality-loop` 的脏文件、审计记录和未关闭队列。
2. 每轮只选择一个最高优先级、可由真实浏览器证实的问题；当前已知状态页移动按钮线索优先进入审计，不在本总任务中偷改。
3. 运行导航、移动触控、三主题、中英文、键盘焦点、reduced-motion、溢出和加载状态矩阵。
4. 以独立子任务提交 UI 修复，确认不包含总任务、其他任务或保护文件。
5. 完成后将 Stage 1 结果作为 Stage 2 的入口契约，而不是把持续 UI 猎测标记为永久完成。

## Stage 2：浏览与查找

- [x] 完成返回路径只读基线：14 组确认博客筛选/搜索与移动项目分组丢失，详见 `discovery-baseline.md`；未改生产代码。
- [x] 在 Stage 1 交付边界确认后创建并评审实际 Stage 2 博客子任务；已交付并返回父任务，项目分组继续独立实施。

1. 先为 `ProjectsPage`、`BlogPage`、`BlogColumnFilter`、`filterBlogPosts()` 和相关 CSS 画出现有状态流。
2. 设计并实现规范化 query 参数：项目筛选/搜索（若证据支持）、博客 column/query/page；同步浏览器后退、前进、刷新和复制链接。
3. 为详情返回、空结果、加载、错误、非法筛选和超出页码补齐确定性状态。
4. 检查分析事件不会携带 query/hash/dynamic id，且不引入后端搜索依赖。
5. 通过 `check:ui:smoke`、相关完整 UI 组、`lint`、`build`、`git diff --check`。

## Stage 3：内容与展示

1. 建立重点项目的公开事实清单和文章/状态/助手关联矩阵。
2. 按现有数据类型补齐案例阅读结构、截图/流程位置、体验入口和“未验证/待批准”标签。
3. 运行 `project-details:check`、`blog:check`、`public-links:check`、`status:contract`、`analytics:check` 和 SEO 检查。
4. 任何新的公开事实、品牌方向、翻译来源或下载状态进入 `needs-user-decision`，不在默认实现中猜测。

## Stage 4：双语与包容交互

1. 清点 `App.tsx`、`Navigation`、所有 public pages、`SiteFooter` 和 aria/placeholder 文案的语言来源。
2. 选择可审计的共享文案资源或最小映射，确保切换后正文、状态、控件、页脚和辅助标签不会混用语言。
3. 加入偏好持久化、非法值回退、刷新恢复、键盘/焦点恢复和 320/390/430 触控检查。
4. 检查 reduced-motion、读屏名称、错误/空状态和弹层层级；不以增加字体缩放或隐藏内容解决布局问题。

## Stage 5：公开产品闭环

1. 先运行公开助手本地合同和只读产品验收复核，确认引用、恢复、移动端和隐私边界没有漂移。
2. 为 AI Daily 建立单版次 acceptance manifest，完成生成、审核、导出、Feed、撤回和 rollback evidence 的确定性检查。
3. 每次真实模型调用、生产部署、公开 Feed 开启和 Cron 创建都单独记录人工批准；失败立即关闭生成/Feed，不自动重试未知 provider 状态。

## Stage 6：持续质量与运维

1. 盘点 CI 中已有的 lint/build/UI/链接/可靠性检查，合并重复入口而不增加无意义的并行服务。
2. 建立性能预算、SEO、公开链接、状态快照和低敏分析的固定报告格式。
3. 评估 Plausible/Umami、Sentry/Faro/Langfuse 等外部服务前，先确定采集字段、采样和保留期限；未完成人工决策时保持关闭。

## 验收命令

基础门禁：

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui:smoke
git diff --check
```

按阶段补充：

```powershell
npm.cmd run check:ui
npm.cmd run project-details:check
npm.cmd run blog:check
npm.cmd run public-links:check
npm.cmd run status:contract
npm.cmd run analytics:check
npm.cmd run reliability:check
npm.cmd run performance:check
npm.cmd run docs:manual-gates-check
```

## 风险与回滚点

- 现有 UI 脏文件与总任务规划文件混在同一工作树：每个子任务提交前必须通过 `git diff --cached --name-only` 核对文件白名单。
- URL 状态可能改变旧链接或返回行为：先保留默认值和兼容读取，再逐步增加参数；发现回归时只回退该子任务。
- 双语补齐可能暴露未经确认的翻译：未知翻译保持原文或标记待确认，不编造来源。
- 公开内容和 AI Daily 可能把草稿/失败结果误当成发布结果：发布前强制运行 public projection、manual gate 和 rollback 检查。
- 性能预算可能被内容和全量 UI 检查拖慢：先使用现有脚本和分层门禁，不为路线图引入新 runner。

## 子任务建议

下一步建议按以下顺序创建，不提前批量启动：

1. `stage-1-ui-delivery`：接管现有 UI 任务的一个明确修复轮次。
2. `stage-2-browse-discovery`：项目/博客 URL 状态与返回体验。
3. `stage-3-content-consistency`：重点案例与公开证据矩阵。
4. `stage-4-language-inclusive`：双语覆盖与包容交互。
5. `stage-5-ai-product-loop`：公开助手复核与 AI Daily 单版次闭环。
6. `stage-6-quality-operations`：持续质量、性能、SEO 和低敏分析。

只有前一阶段满足其独立验收并保留回滚点，才进入下一阶段；父任务最终整合不代替子任务质量检查。

## 连续执行记录

- [x] 保存 `loop.md`、`assessment.md` 和 `task.json.meta.loop`，核对工作流入口一致。
- [x] 第一轮：审查并交付 7 个历史 UI 修改文件，复用本会话已通过且代码未改变的 UI-012 完整验证，提交 `cb327d8c`。
- [x] 返回父任务，重新评估并完成博客状态子任务；提交 `9991079a`，完整 UI 42 组与 smoke 21 组通过，已归档并再次返回父任务。
- [x] 轮次 3：项目移动分组的 URL、历史和详情返回已交付 `789d0db3`，保留桌面完整展示；专项 24+2 组、既有项目组和 smoke 通过，已归档并返回父任务。
- [x] 轮次 4：阅读入口位置、键盘焦点、新详情与历史恢复已交付 `37f93b5b`；阅读专项 48+4+22 组、完整 UI 44 组、smoke 21 组和基础门禁通过，已归档并实际返回父任务。
- [x] 轮次 5：只读内容/证据审计已交付 `c308d09b`，10 项合同与生成投影通过；另保存助手损坏路径整页崩溃和帆灵备用状态引用错误的实际证据，已归档并实际返回父任务。
- [x] 轮次 6：公开路由边界已交付 `8a0dd627`，专项 70 场景、完整 UI 45 组及基础检查通过，已归档并实际返回父任务；业务事实和发布边界保持。
- [x] 轮次 7：语言与交互只读审计已交付 `3868683b`，六组交互、八组阅读目录对照、两组筛选语义证据完整；已归档并实际返回父任务。
- [x] 轮次 8：博客栏目具名分组与选中状态已交付 `3e0bdbda`；接续后真实 Tab/Shift+Tab、24+6 组专项、21 组 smoke、lint/build/合同/性能通过，完整 UI 45 组明确复用同构建证据，已归档并实际返回父任务。
- [x] 轮次 9：栏目文字对比度已交付 `da19773c`，576 个文字样本、完整 UI 45 组、smoke 21 组及静态门禁通过；首次未复现的状态页 wheel 失败保留完整证据，子任务已归档并实际返回父任务。
- [x] 轮次 10：基础 PR 质量 workflow 已交付 `037eee5d`，YAML/Bash、smoke、失败/冲突/TERM 清理和静态合同通过，明确复用同构建完整 UI，已归档并实际返回父任务。用户随后选择公共界面优先的分阶段中英文。
- [x] 轮次 11：共享语言偏好、导航辅助标签、页脚、载入与 404 已交付 `a8142559`；本轮完整 UI 46/0、最终语言专项 12+5+1、smoke 21/0 与静态检查通过，已归档并实际返回父任务。
- [x] 轮次 12：目录公共控件双语和移动分页已交付 `d215071e`；最终完整 UI 46/0、smoke 21/0、语言专项 12+24+12+5+1、栏目 12 组/1152 对比度样本及静态检查通过，已归档并实际返回父任务。
- [x] 轮次 13：详情公共阅读界面与共享目录双语已交付 `87b2e01c`；最终完整 UI 46/0、smoke 21/0、语言专项 12+24+12+5+1+24+4+2 及静态检查通过，23 个源码/检查器/规范/边界文件和 8 个构建文件无漂移；已仅归档本子任务并实际返回父任务。
- [x] 首轮协议实际走通；原生 heartbeat `automation` 已创建并回读配置，ACTIVE、每 15 分钟、当前会话一致；2026-09-08T04:59:41.041Z 实际收到定时消息，当时当前回合仍在运行。
- [ ] 持续在每轮末尾更新子任务验收、提交、归档位置和下一动作；不归档父任务。
