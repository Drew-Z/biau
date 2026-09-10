# 实施与验证

- [x] 读取迁移检查器与 backend 数据库、目录、日志和质量规范，确认没有生产或模型请求。
- [x] 核对规范仓库、远端、worktree，并运行工作区只读审计。
- [x] 确认本机 Docker 与缓存 PostgreSQL 18.4，建立范围明确的子任务。
- [x] 冻结输入文件，创建唯一 tmpfs 容器，核对 loopback 端口和数据挂载。
- [x] 运行 `npm.cmd run assistant:public-migration-check`，保存实际退出码、迁移结果与临时 schema 清理证据。
- [x] 清理唯一任务容器，核对既有容器/卷及源码/保护快照未变。
- [ ] 写入验证结论，精确本地提交、仅归档本子任务、记录 journal 并实际返回父任务重新评估。
