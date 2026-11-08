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

- 两库 `verify.sql` 均通过；本地访问三个 Render 服务的健康地址持续超时，已启动独立 GitHub Reliability Check，待结果补记。
- 新数据库 CI 待代码推送后验收。RAG 同步临时设为只检查，结束后恢复原有仓库变量状态。
- Horizon 真正 schedule 运行 [42453568590](https://github.com/Drew-Z/biau/actions/runs/42453568590) 成功，但结果为 `no-input`：采集 0、模型 0、未发布，保留旧期刊。它证明调度与空输入保护生效，不能代替新一期自动生成/发布验收；AI 日报 AC12 保持未完成。

## 恢复

Git 基线为 `796e9d5e07fde26ed1bb5397c226f4132269e23c`。敏感数据库备份及 SHA-256 清单仅保存于本地集中恢复组；保留此前 Render 部署标识。恢复备份必须由单独恢复决策控制，不自动覆盖线上后续数据。
