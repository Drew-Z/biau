# 隔离与证据设计

- 基线为 `5d709535`；只读核对现有 Docker context、镜像、容器与卷，再冻结既有检查器、四份迁移及保护快照哈希。
- 使用已缓存镜像 ID、`--pull never`、唯一任务名称/标签和 `--rm`。镜像声明的数据目录为 `/var/lib/postgresql`，其 `PGDATA` 是 `/var/lib/postgresql/18/docker`；将整个声明目录挂为 tmpfs，避免创建匿名持久卷。
- PostgreSQL 仅发布到 loopback 临时端口。使用专用合成数据库/用户及随机临时密码，连接值只传给子进程的 `PUBLIC_ASSISTANT_REVISION_TEST_DATABASE_URL`。
- 用 `pg_isready` 有界等待后调用既有 npm 检查；运行后只读检查 `pa_revision_empty_*` 和 `pa_revision_legacy_*` 已删除，public schema 没有新增业务表。
- finally 仅停止本轮唯一容器，由 `--rm` 回收；随后核对该 ID 不存在，既有容器 ID 和卷集合仍保留。日志只保存版本、退出码、合成夹具断言和资源清理结果，不保存凭证或连接 URL。
- 不修改、重建或停止任何现有容器；不改变 Docker context，不运行 prune，不挂载仓库、用户目录或既有数据卷。
- 本项无业务代码变更，不重跑刚完成的全站 UI/lint/build；任务门禁是实际迁移检查、隔离/清理证据、文件哈希和 Git diff 检查。
