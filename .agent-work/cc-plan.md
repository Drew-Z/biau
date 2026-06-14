现在我已经读完了所有需要的文件。根据要求，我应直接输出 `.agent-work/cc-plan.md` 的完整 Markdown 内容（简体中文，不用 fenced code block，不问是否写入）。

---

# CC Plan：内容校准与脱敏补强（第二片，只读规划）

本轮目标：把现有公开站内容（Ozon ERP、Pet Workspace、xunqiu）与 Codex 提供的安全摘要逐条比对，只指出最小范围的内容校准与脱敏补强，不重写、不扩列、不重构。第一片导航文案/路由提示口径保持不动。

## 1. Read-only Findings

- 三个目标项目都已经在站内存在完整内容，分布在四个位置：
  - `src/data/portfolio.ts`：`projects[]` 里的卡片摘要（Ozon `ozon-erp`、Pet `pet-workspace`、xunqiu `xunqiu`）。
  - `src/App.tsx` `caseStudies[]`：`ozon-erp`、`pet-workspace` 有完整业务案例；xunqiu 没有 case 条目。
  - `src/App.tsx` `getProjectDetailContent()`：三者都有项目技术详情（overview/modules/implementation/nextSteps）。
  - `src/App.tsx` `getProjectStructure()`：三者都有目录边界条目。
- 内容已自带脱敏意识：Ozon detail 明确写“不展示真实店铺凭证、数据库连接、账号口令、服务器地址或生产端口”；Pet detail 写“不暴露云端 API、任务 JSON、模型缓存或候选素材”；xunqiu detail 写“不公开服务器 IP、数据库配置、测试账号、签名文件或发布包哈希”。整体方向与安全摘要一致，不需要从零重写。
- xunqiu 存在结构性不对称：它在 `projects[]`、`getProjectDetailContent()`、`getProjectStructure()` 里都有，但 `caseStudies[]` 没有对应条目，所以 `/cases/xunqiu` 无法独立打开，只能走项目详情页。这是和 Ozon/Pet 最大的内容不一致点。
- 用词与安全摘要的细微偏差：
  - Ozon 摘要写采集插件是 “Chrome MV3/WXT”，站内有的地方写 “WXT/MV3”，有的写 “Chrome 采集插件”，口径基本一致，属可统一项而非错误。
  - Pet 摘要把 Android 实验拆为 `floating-pet-android`（悬浮宠物 MVP）与 `fantasy-pet-kmp`（KMP 桌宠实验）两条；站内只突出了 `floating-pet-android`，没有提 KMP，属可补可不补的细节。
  - Pet detail 出现具体环境代称（见 `caseStudies` 的 `results`），偏向暴露真实联调环境命名，建议泛化为“本地容器替代环境”。

## 2. Current Content Already Good Enough（不要重写）

- Ozon `getProjectDetailContent('ozon-erp')` 的 overview/modules/implementation：模块边界、PendingAction/JobQueue/审计、Docker/容器部署口径都已到位，且已声明脱敏边界。保持。
- Ozon `caseStudies` 的 `ozon-erp`：challenge/solution/results/architecture/talkingPoints 已覆盖“多端协作 + 写入开关 + 审批审计 + 队列/直写”，与安全摘要“公开可讲”项完全吻合。保持。
- Pet `getProjectDetailContent('pet-workspace')` 与 `caseStudies` 的 `pet-workspace`：gamer / fantasy-pet-rule 边界、Worker 编排、QA Gate、人审发布、App API 契约、Android 浮窗验证都已讲清，结构正确。除个别用词外保持。
- xunqiu `getProjectDetailContent('xunqiu')` 与 `getProjectStructure('xunqiu')`：64 位重构、模块清单、Java 服务端历史、发布验收口径准确，已声明脱敏边界。保持。
- 三者卡片摘要 `projects[]`：方向、技术栈、highlights 表达准确，无需改写。
- 结论：本片不做内容“重写”，只做“补一个缺口 + 改少量用词 + 跑一次脱敏核对”。

## 3. Calibration Gaps By Project

校准时务必区分两类内容：项目详情页讲技术（`getProjectDetailContent` / `getProjectStructure`），案例详情页讲业务（`caseStudies`）。

- Ozon ERP
  - 技术侧（项目详情）：无实质缺口。可选统一“Chrome MV3 / WXT”表述，使插件命名一致，不改语义。
  - 业务侧（案例）：无实质缺口，保持现状。
- Pet Workspace
  - 技术侧：可在 `getProjectStructure('pet-workspace')` 的“Android 验证工程”一条里，把 `fantasy-pet-kmp`（KMP 桌宠实验）作为一句补充，避免读者以为只有一个 Android 实验。属低优先补充。
  - 业务侧：`caseStudies` 中具名联调环境用词偏具体，建议泛化。这是业务案例侧唯一需要动的句子。
- xunqiu
  - 技术侧：已完整，保持。
  - 业务侧：缺一个 `caseStudies` 条目，导致和 Ozon/Pet 的“项目详情 + 业务案例”双页结构不对齐。这是三者中唯一的结构性缺口，建议补一条脱敏后的业务案例（不新增项目，只补案例数据）。

## 4. Desensitization Checklist（逐项目）

执行内容改动前后都要按此核对，确保不引入安全摘要里的“不可公开”项。

- Ozon ERP 必须不出现：部署主机/IP、用户名、端口、真实店铺凭证、API key、数据库连接串、`.env`、tmp payload、真实订单号/店铺名/账号。允许出现：多端协作、写入开关、PendingAction 审批、审计日志、队列/直写模式、Docker/容器部署口径（均为概念级）。
- Pet Workspace 必须不出现：真实云端 API、服务端生产地址、模型配置、运行包 runs、生成产物路径、候选素材、private pipeline payload、数据库/环境变量、具体联调环境命名。允许出现：生成任务状态、Worker 编排、QA Gate、人审发布、App API 契约、Android 悬浮窗/前台服务/权限/事件链验证（概念级）。
- xunqiu 必须不出现：真实测试账号、token、服务器 IP、数据库配置、SQL 细节、签名文件、APK hash、发布包路径、真实测试媒体 URL、测试数据。允许出现：手机号登录、动态/评论/点赞、短视频上传播放、赛事/日程/商品/个人页、服务端接口复用、历史多端接手、模拟器验证（概念级）。
- 通用：补的 xunqiu 案例里 `evidence` 只写“目录结构 / 文档 / 脱敏截图”这类抽象证据名，沿用现有 `caseStudies` 的写法，不写具体文件路径。

## 5. Proposed Scope

本片只做以下三件事，按优先级排序：

1. 高优先（结构对齐）：为 xunqiu 在 `src/App.tsx` `caseStudies[]` 补一条脱敏业务案例，使 `/cases/xunqiu` 可独立打开，与 Ozon/Pet 一致。
2. 中优先（用词脱敏）：把 Pet `caseStudies` 中具名联调环境泛化为“本地容器替代环境”，并同步检查 `getProjectDetailContent('pet-workspace')` 是否有同类具名环境。
3. 低优先（用词统一/可选）：Ozon 插件统一为 “Chrome MV3 / WXT”；Pet 目录补一句 `fantasy-pet-kmp`。低优先项可在第一片实现后视情况再做，不强制本次完成。

明确不做：不新增 `projects[]` 条目、不新增博客、不动 Godot/legal-rag/blog 内容、不拆 `App.tsx`、不改数据结构、不改路由与按钮口径（第一片已定）。

## 6. Files Expected To Change Later

- `src/App.tsx`
  - `caseStudies[]`：新增一个 `id: 'xunqiu'`、`projectId: 'xunqiu'` 的条目（高优先）。
  - `caseStudies[]` 的 `pet-workspace.results`：替换具名环境用词（中优先）。
  - `getProjectStructure('pet-workspace')`、`getProjectDetailContent('ozon-erp')` 用词统一（低优先，可选）。
- 不改 `src/data/portfolio.ts`（xunqiu 已有项目条目，案例数据放在 `App.tsx` 的 `caseStudies` 即可，符合现有架构）。
- 不改 `src/App.css`、不新增图片资源（xunqiu 暂无脱敏截图，案例 `evidence` 走文字证据，复用 `CaseDetailView` 的 `caseEvidence-note` 回退分支即可）。

## 7. First Narrow Implementation Slice

第一片实现只做“高优先”一件事，便于 Codex 单独审查：

- 在 `src/App.tsx` `caseStudies[]` 末尾新增 xunqiu 案例对象，字段沿用现有 `CaseStudy` 类型：
  - `id: 'xunqiu'`、`projectId: 'xunqiu'`、`eyebrow: '移动端 / 历史系统接手'`、`status: '补充中'`。
  - `summary` / `challenge` / `solution`：聚焦 32 位到 64 位 Android 重构、服务端接口复用、历史多端接手、发布验收，全部概念级。
  - `results` / `evidence` / `architecture` / `talkingPoints`：复用 detail 已有口径压缩成业务表达，`evidence` 只写抽象证据名。
- 该新增会让 `CasesView` 的 `secondaryCases`（`caseStudies.slice(1)`）自动多出 xunqiu 卡片，无需改组件逻辑；`/cases/xunqiu` 路由已被 `getViewFromPath` 支持，自动可达。
- 不在第一片里碰 Pet 用词与 Ozon 用词，留到后续微调片。

## 8. Verification

- 静态验证：`npm run lint`，再 `npm run build`，确认新增对象不破坏类型（`CaseStudy` 字段必须齐全）。
- 路由验证（playwright 或手动）：访问 `/cases/xunqiu` 应能独立打开案例详情；`/cases` 列表应新增 xunqiu 卡片；`/projects/xunqiu` 的“打开业务案例”按钮在补案例后应能跳转（此前因无案例不显示）。
- 回归验证：`/cases/ozon-erp`、`/cases/pet-workspace`、`/projects/ozon-erp`、`/projects/pet-workspace`、`/projects/xunqiu` 内容应与改动前一致（除 Pet 用词微调）。
- 脱敏扫描：提交前对改动文本做敏感词扫描（IP、token、key、`.env`、APK hash、具名联调环境、真实账号/店铺/订单等），确保第 4 节清单为空命中。

## 9. Risks / Questions

- 风险：实现者可能把 xunqiu 案例写得过细，泄露服务端/发布包细节；缓解办法是案例只复用现有 detail 口径，不回 reference-projects 取新信息。
- 风险：新增案例后 `caseStudies[0]` 仍是 legal-rag（featured 不变），但 `secondaryCases` 顺序变化，需确认 xunqiu 卡片样式（`status` 颜色映射只覆盖“整理中/补充中”，用 `补充中` 可命中 orange，安全）。
- 待确认问题：Pet 的具名联调环境是否就是要彻底去名词化（建议是）；xunqiu 案例 `status` 用 `补充中` 还是 `整理中`（建议 `补充中`，因暂无截图）；低优先用词统一项是否纳入第一片（建议不纳入）。

## 10. Explicit Non-actions

- 不新增项目、案例条目以外的任何 `projects[]` / 博客内容。
- 不改 Godot 五款游戏、legal-rag、blog-semi、biau-playlab 的任何文案。
- 不拆 `App.tsx`、不迁移数据文件、不改路由表与 `gameRouteByProjectId`、不改第一片导航/按钮文案。
- 不改 `src/data/portfolio.ts` 结构与字段。
- 不读取或复制 `/home/zhang/workspace/reference-projects` 原始目录内容，本片只依据站内现状与安全摘要。
- 不在本规划轮改动除 `.agent-work/cc-plan.md` 外的任何文件。
