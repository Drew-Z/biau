# 技术设计

根因是最初的手工加固未成为后续 Prisma 迁移的必备契约。三张新增表无 RLS，两个函数沿用调用者 search_path；实际 anon/authenticated 权限已经撤销，因此本轮补齐纵深防护，不宣称已经发生泄漏。

新增向前 Prisma 迁移，只处理 Request、AnswerRevision、Branch 与两个公开助手函数。迁移在事务中限时获取锁，固定函数路径为 pg_catalog、安装 schema、pg_temp，保留 SECURITY INVOKER。schema 来自执行迁移时的 current_schema，并始终通过标识符转义。生产为 public，本地隔离 schema 也使用同一份迁移。撤销 PUBLIC 及存在的 Supabase Data API 角色权限；普通 PostgreSQL 没有这些角色也能安装。

扩展既有真实数据库回归，明确分开旧数据迁移与后续加固。使用隔离 schema 和最小权限测试角色，检查授权拒绝、意外授予表访问后 RLS 默认拒绝、owner 写入、临时同名表无法绕过跨会话校验。既有业务契约继续执行。

运维脚本保留数据库指纹与白名单保护；可选 RAG 表必须六张完整存在，不能放宽为任意 public 表。verify 同样检查白名单、owner、触发器和固定路径；新迁移与 ops apply 的函数配置一致。新增仅针对数据库路径的 CI 工作流，使用临时 PostgreSQL 17，不连接生产或模型。

生产沿用 Prisma 迁移历史，不引入另一套自动部署迁移系统。先逻辑备份 public 应用 schema 并在本地 PostgreSQL 恢复、核对表计数和关键约束；再部署同一迁移。回退优先事务回滚/向前修复，备份是灾难恢复保障，不自动覆盖线上新数据。保留生产服务旧部署标识，提交前将 RAG 同步设为只检查以保证 0 embedding，验证后恢复原变量。

## Studio 实查后的范围补充

独立 Studio 保留 12 张历史表，合计 40 张应用表；当前全部未开启 RLS，Data API 角色具有 schema/table 权限。新增第二份向前迁移建立完整服务端边界：28 张基础表必须存在，12 张历史表和 6 张 RAG 表分别要求完整存在或完整缺席，未知对象拒绝。对审核过的表启用 RLS，撤销 PUBLIC/anon/authenticated 对 schema、表、sequence、函数的授权；四个触发器函数固定路径。保持 owner 和 service_role 使用路径，不删除历史表。

PostgreSQL 的 schema 级默认权限只能增加到全局默认权限上，因此需要同时撤销迁移 owner 的全局 PUBLIC 函数执行默认权限，并撤销 schema 范围 Data API 默认授权。加入真实数据库检查，验证迁移后新建表/函数也没有匿名授权。

两个生产库分别备份与本地恢复验证，按当前归属执行同一 Prisma 迁移。新的运维回归使用本地新建临时数据库，覆盖 40/34/28 表形态、缺失/未知表、错误 owner、被禁用/错误绑定的触发器以及权限漂移；CI 不接触生产数据。
