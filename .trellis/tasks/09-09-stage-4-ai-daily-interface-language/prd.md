# 补齐 AI 日报公共界面双语

## Goal

让选择英文的读者理解 AI 日报的刷新、加载、内容时效、修正与来源操作，并在详情里使用同一语言的固定阅读目录。保留已批准内容、证据和生产发布边界。

## Confirmed Facts

- 第 15 轮已完整交付并实际返回父任务；当前基线 `c2c1c7a800d7c382bd988172b24b5b16502fa715`，第 16 轮持续授权有效，主会话拥有当前父任务。
- `AiDailyPublicPage.tsx:15-86` 使用 abort/sequence/ETag 与 60 秒可见性刷新；错误目前在请求结束时转成中文字符串。不能把语言加入 load/effect 的依赖来刷新文案。
- `AiDailyPublicDetailPage.tsx:23-77` 以 publicId 管理独立请求、ETag 和已加载正文；SEO 从已批准 payload 投影，必须保持。详情目录 ID 固定，部分项目随 uncertainty/citations 显隐。
- 两页面固定控件和错误均未消费共享语言；详情共享目录的外壳已双语，但项目仍默认中文。公共 API 的 decoder 已验证来源 URL、字段和状态，本轮不修改其输入合同。
- 首页剩余文案包含定位介绍与作者题句，助手则有更大的状态/命令范围；当前先完成直接服务内容发现的两个 AI 日报公共页面，不把它们合并成一个无边界任务。

## Requirements

- R1：使用唯一 SiteLanguage 翻译两页面固定介绍、状态/新鲜度、覆盖/来源计数、刷新/重试/分页、加载/空/错误/修正、详情元数据与目录/分区标题。
- R2：将页面错误从已翻译字符串改为有限 UI 错误类别，保留原 HTTP/error 判断顺序；显示时按语言映射。已发生、等待中或刷新失败的状态切语言不能新增请求、丢失 payload 或清空 ETag。
- R3：共享日期显示按既有 feed/detail 选项和本地时区接受可选语言，默认中文；不改 approvedAt/revision、计数、freshness/stale 判断或时间值。中文缺值、错误分支及标题语义保持。
- R4：作者标题、事实/影响/不确定性保持原值和中文标记；外部引用标题/发布者/摘录保留原文，并用未知语言标记，来源动作独立使用界面语言。产品名称、URL、安全属性、SEO和发布状态不变。
- R5：切语言不重挂载页面/阅读目录，不重启请求、轮询或读取 effect。保留 refresh/append/304、abort/late-response、pending 禁用、原正文保持、目录 focus/Escape/真实锚点及刷新/history。
- R6：浏览器覆盖 320/390/430/1440 × 三主题 × 两语言的 feed/detail，补充延迟、空/过时、错误、404/410、分页和 304 恢复；验证 44px、文本包含与移动可达性，只修实测布局问题。
- R7：全部请求使用本地 fixture；不 push/deploy/sign、真实模型调用、内容发布、生产数据/验收改写、Feed/Cron 或 heartbeat 修改。原有十一份资料和历史 worktree 保留。

## Acceptance Criteria

- [x] PRD/design/implement 收敛，先保留原源码/构建和旧界面负向证据。
- [x] 固定文案、有限错误类别、日期与作者/来源边界通过确定性与浏览器检查。
- [x] 语言矩阵及延迟/错误/刷新/分页/304/目录连续性通过，代表截图已审查。
- [x] lint/build、public payload/feed 合同、analytics、deployment docs、助手知识、performance、完整 language、smoke、完整 UI 通过且最终文件/构建无漂移。
- [ ] 精确本地提交，仅归档本子任务，实际启动父任务并继续评估。

## Out of Scope

首页与助手双语、作者内容翻译、SEO语言、public API/schema/server、生产 Feed 与 Edition、Studio编辑流程、依赖或设计系统重构。当前没有待答产品问题；规划/启动/本地提交沿用父任务已有授权。
