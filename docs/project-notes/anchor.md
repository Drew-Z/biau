# Anchor Learning 工程技术档案

## 项目摘要

Anchor Learning 是一款 Flutter 学习助手，把技术文档与代码转化为可追溯知识和练习。它的核心合同不是“AI 生成了一道题”，而是“学习者能检查题目背后的 source chunk、locator、解释、引用和验证边界”。[source-verified] 证据：E-ANCHOR-001、E-ANCHOR-003。

公开 Web 是独立的静态引导演示，内置 Flutter、Git、JavaScript 三套双语数据和十二道题，支持进度恢复、引用摘录、解释和脚本化导师提示。它不上传文件、不访问后端、不做 analytics、不调用模型。[source-verified] 证据：E-ANCHOR-006、E-ANCHOR-007。

## 产品边界

- Flutter 客户端承载完整产品方向，当前受支持的发布面是 Android Private Alpha。
- 浏览器 Demo 只演示“问题 → 回答 → 反馈 → 来源证据 → 导师提示”的可见闭环。
- Demo 不声称具备 Flutter Web parity、项目导入、账号、云同步、实时 AI 或生产模型评估。
- 本地目录已改名为 `anchor`；package ID、数据库名、secure-storage prefix 和环境变量仍保留兼容标识，迁移不属于本次目录改名。

[source-verified] 证据：E-ANCHOR-001、E-ANCHOR-002、E-ANCHOR-009。

## 架构与职责

Flutter 和 Riverpod 负责 UI/状态边界，sqflite repository 负责本地 SQLite 持久化，Dio 支撑网络能力，`lib/services/` 中的任务服务负责导入、生成、Agent、检索、评估、隐私和发布边界。[source-verified] 证据：E-ANCHOR-002、E-ANCHOR-004。

| 层级 | 主要职责 | 权威状态 | 典型失败边界 |
| --- | --- | --- | --- |
| `lib/features/` | 学习、deck、Agent、知识库、profile、ingestion UI | 可重建界面状态 | 页面销毁或 provider 重建 |
| `lib/data/` | model、repository、database helper、demo seed | 本地领域记录 | migration、transaction、partial seed |
| `lib/services/` | ingestion、generation、checkpoint、search、evaluation、privacy、release | 长任务与服务合同 | 输入版本、外部调用、恢复与验证 |
| `web/landing/app/` | 静态 Demo 数据、渲染、进度和语言 | 浏览器内置数据与 localStorage | 旧版本或损坏缓存 |

生成链拆为 knowledge extraction、prerequisite mapping、question generation、citation verification 和 question validation。引用断链与答案不一致因此可以分别测试，不被一个大型 prompt 的 success 布尔值掩盖。

## 核心实现

- `lib/main.dart` 负责应用启动与 first-run gate；`lib/app.dart` 负责应用级导航。
- `lib/data/database/database_helper.dart` 和 `lib/data/repositories/` 管理 sqflite 持久化与 repository contract。
- `lib/services/` 管理导入、生成 Task、Agent runtime、hybrid search、interview、evaluation、privacy、release 与 scheduling。
- `web/landing/app/scripts/data.js` 定义 `Dataset -> Question -> Options -> Explanation -> Citations -> TutorHints`。
- `web/landing/app/scripts/app.js` 负责 locale-aware render、答题、`anchor.demo.progress.v1` 归一化、恢复、完成和重置。

[source-verified] 证据：E-ANCHOR-002、E-ANCHOR-004、E-ANCHOR-006、E-ANCHOR-007。

## 核心数据流

1. 用户选择受支持的文档或代码来源。
2. content hash 区分未变化、更新和重复内容。
3. `SemanticChunker` 按 Markdown/代码结构形成有界 chunk，并输出可读 locator。
4. extraction 与 prerequisite Task 构建知识概念和先修关系。
5. question generation 生成包含 cited chunk ID 的候选题。
6. citation verification 检查引用是否存在、可定位且包含候选支持材料。
7. question validation 检查题干、选项与正确答案是否和证据一致。
8. 通过门禁的内容进入本地 repository 和学习 runtime；失败候选保持可检查状态。
9. hybrid search 与 checkpoint 支持更长的导师或模拟面试会话。

[source-verified] 证据：E-ANCHOR-003、E-ANCHOR-004。

## 可靠性与故障处理

### 可追溯数据

chunk ID、locator、content hash、引用摘录和 validation state 都是持久字段。验证失败不会被静默提升为可信题目；来源变化后，依赖记录必须进入失效、重建或复核流程。[source-verified] 证据：E-ANCHOR-003、E-ANCHOR-004。

### 长任务恢复

checkpoint 保存可恢复阶段、必要输入引用和版本，不复制完整文档或无界模型上下文。恢复前需核对 schema、来源 hash 和已提交阶段，避免旧 checkpoint 重放到新流程。

### Demo 状态恢复

浏览器读取 `anchor.demo.progress.v1` 时校验版本、dataset、question index、option 和提交状态；未知值被丢弃，越界索引按合同钳制或整体重置。语言由 `anchor.locale` 统一，默认跟随浏览器，显式选择后同步可见文本、`html.lang`、标题、描述和 ARIA。[source-verified] 证据：E-ANCHOR-006、E-ANCHOR-007。

### 首次 Demo 播种残余风险

Flutter 首次 Demo seed 仍存在非原子写入风险：若部分 source 已写入而后续 chunk 失败，下次启动可能把残缺数据识别为 existing user。该风险不由静态 Web Demo 引入，也尚未通过本轮文档工作解决；后续应使用单事务或稳定 seed version 做幂等补偿。

## 关键取舍

| 决策 | 选择原因 | 代价或失败信号 | 需要补充的验证 |
| --- | --- | --- | --- |
| local-first sqflite | 隐私、离线连续性、用户数据所有权 | migration、backup、多设备冲突更复杂 | Android 安装升级、数据库迁移、备份恢复 |
| 结构感知 chunk + locator | 保留章节/符号语义并可回到原文 | 长无空行内容、格式变化会挑战边界稳定性 | 大文件、无空行代码、格式微调与唯一 ID |
| citation 与 answer 双门禁 | 区分引用存在和语义支持 | 增加延迟，也可能拒绝流畅候选 | 否定、乱序、部分支持、多选组合反例 |
| 静态 Web Demo | 确定性、低成本、零 provider 风险 | 无法展示导入、模型、云同步和完整 Flutter | 三视口、全部 12 题、零 off-origin、资产 hash |
| 保留兼容标识 | 避免升级、数据库和 credential 丢失 | 品牌名与历史标识并存 | 将来独立设计迁移和回滚计划 |

[source-verified] 证据：E-ANCHOR-003、E-ANCHOR-007、E-ANCHOR-009。

## 安全与隐私

- 学习资料、知识点、题目和进度默认 local-first；export、deletion、support bundle 和 credential storage 有独立服务边界。
- 浏览器 Demo 只包含内置教学摘录，只保存语言和 Demo 进度。
- Demo response policy 阻止外部连接，`no-transform` 避免托管边缘注入 analytics。
- 公开截图只使用内置教学 fixture，不使用真实导入资料。
- “引用验证”和“问题验证”是风险门禁，不得宣传为绝对正确或彻底消除幻觉。

[source-verified] 证据：E-ANCHOR-005、E-ANCHOR-007。

## 验证矩阵

| 层级 | 覆盖范围 | 已有证据 | 仍不能证明 |
| --- | --- | --- | --- |
| Flutter unit/service | service、database、Agent、evaluation、privacy、first-run、Private Alpha | 345 项测试通过记录 | 当前移动生产环境与真实模型质量 |
| Analyze/Build | Dart format、analyzer、Android release build | 同一兼容 toolchain 的 CI job | 安装升级和真实设备行为 |
| Web unit | 三套数据、题型、状态归一化 | 5 项确定性检查 | 浏览器布局和部署缓存 |
| Web Playwright | 12 题、locale、citation、tutor、recovery、ARIA、三视口、网络边界 | 本地和生产各 12 项通过 | Flutter import、SQLite、AI Task、云同步 |
| Asset parity | HTML 引用的 versioned JS 与仓库 SHA-256 一致 | 5 个关键资产一致 | 持续可用性 |

[source-verified] 证据：E-ANCHOR-005、E-ANCHOR-011、E-ANCHOR-012；[production-observed] 证据：E-ANCHOR-008。

## 交付状态

静态站已部署在 Anchor 公共域名：`/` 与 `/app/` 返回不同的预期页面，`/app/index.html` canonicalize 到 `/app/`。生产 Playwright 和关键资产 hash 检查通过。[production-observed] 证据：E-ANCHOR-008。

这些结果不认证 Android 安装、数据库 migration、模型正确性、云同步、iOS 或其他 unsupported 平台。[source-verified] 证据：E-ANCHOR-009。

## 代码入口

- Flutter 启动与导航：`lib/main.dart`、`lib/app.dart`
- 本地持久化：`lib/data/database/database_helper.dart`、`lib/data/repositories/`
- ingestion、generation、Agent、evaluation、privacy：`lib/services/`
- Web Demo 数据与 runtime：`web/landing/app/scripts/data.js`、`web/landing/app/scripts/app.js`
- Web unit/E2E：`web/tests/data.test.mjs`、`web/tests/demo.spec.js`
- Android Private Alpha CI：`.github/workflows/ci.yml`

[source-verified] 证据：E-ANCHOR-004、E-ANCHOR-006、E-ANCHOR-007、E-ANCHOR-011、E-ANCHOR-012。

## 证据索引

主要证据为 E-ANCHOR-001 至 E-ANCHOR-012。源码事实来自 Anchor commit `3df49e00fac37bef169631b4c2f986f26df8ab4d`；生产观察单独标记，不与测试库存或未来设计混用。

## 面试重点

重点准备 locator 稳定性、结构切块、content hash 增量导入、Task 拆分、citation 与 answer 双门禁、local-first migration、checkpoint 恢复、混合检索、静态 Demo 的价值和局限、localStorage 版本化、首次播种非原子风险，以及为什么“anti-hallucination”必须表达为门禁而不是绝对保证。
