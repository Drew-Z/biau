# 网站完善路线图设计

## 1. 目标与分层

本任务是路线图总任务，不直接承载所有功能实现。它负责持续评估、阶段顺序、跨阶段契约、子任务边界和整合验收；每个可独立交付的工作在开始实现前再创建自己的 Trellis 子任务。2026-09-08 起，主任务自身负责循环协议与评估记录，保持 `in_progress`；每个阶段可以拆成多个小子任务。

建议的阶段边界如下：

| 阶段 | 主要所有者 | 依赖 | 独立验收结果 |
| --- | --- | --- | --- |
| Stage 1 UI 稳定 | 现有 `09-04-continuous-ui-quality-loop`，必要时拆子任务 | 无；先完成现有脏改动的边界审查 | UI 回归矩阵和可追溯审计记录通过 |
| Stage 2 浏览与查找 | 前端目录页、博客目录和共享 URL 状态 | Stage 1 的导航/移动布局契约稳定 | 可分享的筛选/搜索链接、返回位置和状态反馈通过 |
| Stage 3 内容展示 | `src/data/`、详情页、内容检查脚本 | Stage 2 的入口和关联关系稳定 | 重点案例结构、链接和公开证据一致 |
| Stage 4 双语与包容交互 | App 偏好、导航、页面文案、无障碍交互 | Stage 1 的控件/焦点契约；Stage 2 的状态命名稳定 | 语言、主题、键盘、触控和 reduced-motion 一致 |
| Stage 5 公开产品闭环 | Public Assistant、AI Daily、生产门禁 | Stage 3 的内容证据；人工生产批准 | 助手产品复核通过；AI Daily 完成单版次发布闭环 |
| Stage 6 运维与持续质量 | scripts、CI、SEO、低敏分析 | 前五阶段的稳定合同 | 检查、预算、链接巡检和低敏报告可持续运行 |

父任务不把阶段依赖隐含为 Git 分支依赖。进入实现时，阶段子任务的 `prd.md` 必须明确依赖、owned files、forbidden files、验收命令和回滚点；父任务做重新评估与跨阶段整合审查。

## 2. 当前数据流

```text
static data / content curation
        -> React route pages
        -> shared navigation, URL state, theme/language preferences
        -> browser checks and SEO/analytics projections

Studio review / public status / approved assistant knowledge
        -> checked public projections
        -> public pages and assistant citations
```

Stage 1 和 Stage 2 默认只改前端和确定性检查，不增加后端搜索服务。博客已有 `filterBlogPosts()` 和项目已有分类数据，优先复用这些来源；只有浏览器证据证明客户端筛选无法满足目标时，才重新讨论 API 或索引服务。

2026-09-07 的只读返回路径基线已确认：博客筛选/搜索和移动项目分组在进入详情后，均会在浏览器后退或页面返回链接操作时丢失；14 组均复现。优先闭合这些已有浏览条件，测试覆盖与代码依据见 `discovery-baseline.md`。2026-09-08 的循环授权允许完成子任务规划后实施；旧基线不作为阅读位置、跨页恢复或全部语言状态的通过结论。

## 3. URL 与状态设计原则

- 项目集和博客的可分享浏览状态使用标准 query 参数，不把搜索词、筛选项或页码只放在 React state。
- 解析 URL 时对未知值、超长 query、负页码和不存在的筛选项使用稳定默认值；序列化只输出规范化后的公开状态。
- 目录到详情的链接保留必要的返回上下文；返回位置属于浏览器体验契约，不写入公开内容数据。
- 空结果、加载、错误和无效详情链接分别有语义明确的 UI 状态；不能用空白区域或普通成功提示代替错误状态。
- 不把动态 id、搜索词或 query/hash 写入分析事件；复用现有 analytics 归一化工具。

## 4. 语言与偏好设计原则

先盘点页面实际文案覆盖，再决定是增加完整 `zh/en` 资源映射还是分批补齐公共 shell。语言切换不得只改变顶部导航而让正文、筛选、空状态、页脚和辅助标签保持另一种语言。偏好持久化必须有版本化 key、非法值回退和 SSR/浏览器 API 保护；不改变公开数据事实。

## 5. 内容与 AI 边界

- 重点案例只引用仓库已有公开证据；截图、结果数字、状态和体验入口必须通过现有内容/项目检查。
- 公开助手只能消费批准的 public projection；不把 Studio 草稿、私有 endpoint 或模型诊断放进页面。
- AI Daily 先以人工版次完成生成、审核、导出、发布 Feed、撤回和 rollback evidence，之后才评估 Cron。真实模型调用和部署属于独立 manual gate，不由本路线图默认触发。

## 6. 兼容、回滚与交付

- 沿用 React Router、现有 class-based CSS、设计令牌、`lucide-react` 和已有 Playwright 检查，不引入新的 UI 框架。
- 每个阶段使用独立提交，父任务整合时不暂存其他任务的脏文件；旧的 UI 任务和工作树保持可恢复。
- Stage 2 若 URL 状态导致历史链接失效，回滚到仅内存状态并保留兼容读取；Stage 4 若完整双语范围过大，先回滚到 shell 文案契约，不伪造未翻译内容；Stage 5 任何生产失败都回到关闭 generation/feed 的安全状态。
- 发布前必须运行相关 lint、build、UI smoke/full、内容/链接/SEO/数据安全检查；生产操作还需人工门禁和可恢复版本。

## 7. 串行评估与恢复

执行协议见 `loop.md`，最新决策和证据见 `assessment.md`。只使用现有 `task.py create/start/archive --no-commit` 与 `task.json.meta.loop`，不修改 Trellis 上游包，不添加无限 shell runner 或自动提交 hook。

`meta.loop.phase` 为 `assess`、`execute`、`verify`、`deliver`、`waiting` 或 `stopped`；`activeChild` 最多指向一个子任务。`round`、`nextAction`、`ownerThreadId`、`automationId` 和 `lastCompletedChild` 是恢复线索，不能代替 Git、子任务验收和实际进程状态。

同一回合在子任务完成后立即返回父任务并继续；原生 heartbeat 仅负责回合结束/中断后的续跑，不启动新 Codex 任务或另一个编码进程。每次唤醒先核对当前 Git、任务状态和未完成检查；已有活动子任务时恢复它，已有提交时核对后记账，不重复提交。检查失败先修复；外部阻塞或需要新决策的候选记入等待项，优先选择其他可执行工作。

只归档完成的子任务，父任务和原有持续 UI 任务均不归档。子任务归档使用 `--no-commit` 后按精确白名单提交，避免全局 `session_auto_commit: true` 将其他任务带入。用户明确停止时将 `enabled=false`，暂停同一自动化并保存恢复点。

依据：本地 `.trellis/scripts/task.py`、`common/task_store.py` 和 [官方会话定时任务说明](https://developers.openai.com/codex/app/automations.md)（2026-09-08 实际获取正文）。本地文件任务需要电脑开机、应用运行且项目可访问；未来唤醒是否成功以实际运行结果为准。
