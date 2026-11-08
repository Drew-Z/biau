# 执行计划

- [x] 恢复上下文，确认三表/两函数防护缺口、无 Data API 授权和既有工作区边界。
- [x] 保存 Git 基线与本地集中恢复清单。
- [x] 新增向前迁移，扩展真实数据库回归与定向 CI。
- [x] 更新运维白名单、函数检查和数据库规范。
- [x] 本轮独立 Docker PostgreSQL 17 验证迁移与运维脚本，包括拒绝场景。
- [x] 生产只读预检、备份及本地恢复验证，再应用迁移并核对安全、计数与健康。
- [x] prisma validate/generate、server build/smoke、public persistence、lint、build、diff check。
- [x] 精确提交推送，验证数据库 CI 与相关自动部署，恢复 RAG 检查变量。
- [x] 记录真实日报定时状态；清理本轮容器与临时脚本，保留备份。验收证据提交后执行任务归档。

恢复基线：仓库 main 的 796e9d5e07fde26ed1bb5397c226f4132269e23c。恢复清单由本地 CODEX_HOME backups/tasks 管理，数据库备份不进入 Git 或远端。
