# PostgreSQL 迁移验收记录

## 结果

2026-09-10 在本机 Docker named pipe 上以缓存镜像运行 PostgreSQL 18.4。既有 `npm.cmd run assistant:public-migration-check` 实际 exit 0，终局输出为 `Public assistant PostgreSQL revision migration contracts passed.`。外层验证和资源清理同样 exit 0；没有修改检查器或迁移来取得通过。

- 空 schema：创建 AnswerRevision、Branch 两表及全部 7 个触发器。
- 旧数据：回填 3 个 Revision、2 个 Branch，aggregate 计数保持；回答、引用、指标、显示快照、时间、问题、会话/分支、父修订及反馈关系保真。对象响应保持、历史标量响应转为 v2 冻结响应，旧回答字段按原迁移移除。
- 7 项拒绝断言：Revision UPDATE、Session active branch、Branch head、Turn parent、Revision lineage、Request branch、Feedback revision 的不可变或归属约束生效。
- 删除：清除一个合成 Session 后，其 Turn、Revision、Feedback 和 Branch 均为 0。

## 隔离与清理

- 本地 context 为 `desktop-linux`；镜像为 `sha256:bd1890816ae0b8ad4644f05728570d4be774e1f1490d7232f5084b52ea335183`，`--pull never`。
- 端口仅绑定 loopback，唯一数据挂载为 `/var/lib/postgresql` 的 tmpfs；没有仓库/用户目录挂载、持久数据卷或外部服务连接。
- 运行后 `temporarySchemas=0`、`publicTables=0`。唯一任务容器停止 exit 0，`--rm` 清理完成；原有 17 个容器及其运行集合、43 个卷保留，新增卷为 0。
- 临时连接值只用于当前进程环境，退出时恢复原值；未写入任何环境配置、任务资料或日志，未调用真实模型。
- 9 个冻结文件全部无漂移：检查器、四份迁移、Prisma schema、package/package-lock 和保护快照。保护快照 SHA-256 仍为 `D744AD0698C429FC3ECD33AF3CAE16911E00234C6E4D28AD30E5805BB9414909`。

## 证据

- 目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-migration-20260910T035727097Z`。
- `migration-check.log`：既有 npm 检查实际输出。
- `database-postcheck.json`：PostgreSQL 版本及 schema/table 清理计数。
- `source-baseline.json`：9 个输入文件的 SHA-256。
- `result.json`：隔离、实际退出码、容器/卷清理、文件无漂移和最终 `passed=true`。
- 起止：`2026-09-10T03:57:27.6308177Z` → `2026-09-10T03:57:37.4287127Z`，工具会话 `71408` 已确认 exit 0。

## 边界与交付

本项补齐第 25 轮缺少测试数据库的本地验收；结论仅覆盖上述四份迁移和 PostgreSQL 18.4 合成数据，不能扩大为 Supabase RLS、生产数据库版本、线上数据或真实服务已经验收。无业务源码变更，沿用刚完成的 lint/build、完整 UI 46/0 等基线，不重复运行相同检查。

验收日志作为交付证据保留。原有未跟踪资料和上一子任务 `undefined/` 中受自动审批限制的两份临时文件不变。现在进行精确本地提交，随后仅归档本子任务并实际返回父任务。
