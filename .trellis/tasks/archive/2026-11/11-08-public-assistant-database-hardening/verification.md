# 数据库防护验证

2026-11-08（北京时间）。本轮真实模型调用与 embedding 调用均为 0。

## 已验证结果

- 公开助手/RAG 数据库 34 张表、独立 Studio 数据库 40 张表完成两份向前 Prisma 迁移，两个库均为 21 条成功迁移记录。
- Studio 原有 40 张表的 RLS 未启用，anon/authenticated 同时持有 schema/table 权限；当前全部撤销。公开助手原有三张表缺少 RLS，但 Data API 权限此前已撤销。
- 两库所有应用表开启 RLS，无 FORCE、无公开 policy，四个触发器函数固定解析路径。owner 持久化路径保留，历史表和业务数据不删除。
- 两库迁移前后的业务表行数完全相同；RAG 仍为 32 documents / 75 chunks。
- Supabase security advisors：两个库均 0 ERROR / 0 WARN；仅剩预期的 `rls_enabled_no_policy` INFO，分别对应 34 / 40 张服务端专用表。官方说明：[RLS 默认拒绝](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)。
- 集中本地备份已 SHA-256 校验，并分别实际恢复到临时 PostgreSQL 17。Studio 首次备份受会话中断截断，已标记无效并保留；第二份完整备份恢复成功。仅凭 `pg_restore --list` 不足以证明备份完整。
- 真实数据库测试通过：空库完整 Prisma 部署、旧回答升级、RLS 默认拒绝、误授权、函数路径与临时表遮蔽、不可变回答、跨会话拒绝、整会话删除，及 40/28/34 表部署形态。
- 运维拒绝测试通过：未知/缺失表、错误 owner、禁用/跨 schema 错绑触发器、错误数据库指纹。修复 PostgreSQL 17 `\\quit` 不能保证非零退出的问题。
- 本地 Prisma validate/generate、server build/smoke、public persistence、service modes smoke、lint、Vite build、部署契约及 diff 检查通过。

## 线上验证与边界

- 两库 `verify.sql` 均通过。Public 与 Studio 于北京时间 18:24 前后完成部署，均为 `live`，启动日志确认无待执行迁移并正常监听；Studio 的 Render 健康门禁为 `/health`。本地直连 Render 仍超时，未将其描述为本地 HTTP 验收通过。
- 数据库 [CI 42471013199](https://github.com/Drew-Z/biau/actions/runs/42471013199) 全部通过；首轮数据库 SQL 测试已通过，但 CI 漏生成 Prisma Client 导致后续持久化测试失败，补齐生成步骤后复验通过。
- [Site Quality 42471013112](https://github.com/Drew-Z/biau/actions/runs/42471013112) 通过。[RAG 检查 42470824244](https://github.com/Drew-Z/biau/actions/runs/42470824244) 通过，32 documents / 75 chunks，不调用 embedding；RAG 已自动部署。临时 `PUBLIC_RAG_SYNC_CHECK_ONLY` 仓库变量已删除，恢复原状态。
- 部署后的 [Reliability 42471492707](https://github.com/Drew-Z/biau/actions/runs/42471492707)：7 passed / 1 failed / 1 skipped。主站路由及助手 health 已通过；`unchecked` 指按预算未调用真实聊天，不是跳过 health。剩余失败是 4 个外部项目链接 HTTP/超时，Legal RAG 因缺少该巡检环境配置跳过。这些属于后续可用性工作，不能声称整套巡检全绿。
- Horizon 真正 schedule 运行 [42453568590](https://github.com/Drew-Z/biau/actions/runs/42453568590) 成功，但结果为 `no-input`：采集 0、模型 0、未发布，保留旧期刊。它证明调度与空输入保护生效，不能代替新一期自动生成/发布验收；AI 日报 AC12 保持未完成。

## 恢复

Git 基线为 `796e9d5e07fde26ed1bb5397c226f4132269e23c`。敏感数据库备份及 SHA-256 清单仅保存于本地集中恢复组；保留此前 Render 部署标识。恢复备份必须由单独恢复决策控制，不自动覆盖线上后续数据。

本次工作提交：`d035a307`（迁移/防护/测试）、`8d8d3d7e`（CI 初始化修正），均已推送。专用 PostgreSQL 容器、它的匿名数据卷和本轮临时运维脚本已清理；完整备份、无效备份标记和验证记录保留。既有 UI、青珑及不明来源未跟踪目录保留。
