# 锁文件下载地址验收

## 变更

- package-lock.json 仅有 479 个 resolved 主机名从 registry.npmmirror.com 改为 registry.npmjs.org；522 个 tarball 地址现均为官方源。所有 URL 路径、版本、integrity、依赖节点/范围、根声明和其他 metadata 保持。
- 应用文件与已测试的 Temp 候选逐字节一致，SHA-256 为 `A38EE12252FAFE0C8C243FC6CA82714AD9D83E1F598BCB05019B1571F7F59D52`。package.json SHA-256 保持 `6E91AA8E107FA19E909BDB73E17CD2B5B842E417E404757456ED7AC45926ED8D`。
- frontend 质量规范补充实际 resolved 来源、字段/integrity 比较、传输试验与正式 CI 的边界；没有新命令、环境变量、生产接口或基础设施配置。

## 实际验证

| 检查 | 结果 |
| --- | --- |
| 官方地址候选的干净 Linux 安装 | Node 22.23.2 / Linux x64，空 npm 缓存；`npm ci --ignore-scripts --no-audit --no-fund` exit 0，42612ms，445 个安装节点的版本/integrity 无偏差。 |
| lint | exit 0，15325ms。 |
| build | exit 0，6630ms，包含 TypeScript 检查。 |
| performance:check | exit 0，425ms。 |
| 输入与构建 | `2026-09-10T10:38:06Z` 核对，除锁文件外 677 个冻结输入无漂移，包含全部原 dist；13 份原有未跟踪文件无漂移。 |
| 完整 UI / smoke | 明确复用 eb25462f 依赖修复的 Windows 完整 UI 46/0、smoke 21/0；所有运行依赖版本/integrity、源码和构建字节相同，本项未重跑全量 UI。 |

候选安装容器已清理，原有 17 个容器及运行集合、43 个卷保留，新增卷 0。主机 node_modules 未重装，保护快照保持 `D744AD0698C429FC3ECD33AF3CAE16911E00234C6E4D28AD30E5805BB9414909`。

## 边界与后续

官方和镜像的三组单包对照均下载成功，不能将镜像说成永久不可达或已证明的全部失败根因；原整批安装失败日志完整保留。本项的传输试验不包括 lifecycle、audit、Ubuntu 或 Chromium/smoke，正式 CI 仍由原子任务独立完成。Prisma 固定链的残留告警不因下载地址变化而关闭。

已本地提交 `efce524ec74745e928126d0e3cf3ddc4ff0b5ce1`，仅归档本子任务至 `.trellis/tasks/archive/2026-09/09-10-stage-6-lockfile-registry-portability`，原活动目录已不存在；已实际执行 task.py start 返回父任务第 36 轮评估，由父任务继续恢复原 Ubuntu CI。未推送、部署、调用真实模型、公开内容或启用 Feed/Cron；旧 npm-cache 和 undefined 文件的策略拒绝边界保持。

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-ci-linux-resume-20260910T095901931286Z-72kd9_9l`；主要记录为 registry-candidate.json、candidate-install-result.json、registry-fix-checks.json、registry-fix-validation.json。
