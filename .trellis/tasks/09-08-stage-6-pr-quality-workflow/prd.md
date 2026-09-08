# 建立基础 PR 质量工作流

## Goal

让普通 PR、main 更新和手动运行获得同一套基础质量门禁，尽早发现静态错误、目录合同变化、预算超限和主要路由/CSS/溢出问题。

## Requirements

- R1：新增独立 `site-quality.yml`，使用普通 pull_request、main push 和 workflow_dispatch；无 schedule、生产 Secret 或发布操作，权限仅 contents: read，checkout 不持久化凭证。
- R2：沿用 Node 22、Actions v5 和现有 npm 命令，运行 npm ci、lint、build、博客/项目发现合同、analytics、registry、performance，再安装 Chromium 及系统依赖并运行本地 smoke。现有人工完整 UI 门禁保留。
- R3：preview 只绑定 loopback、strictPort；端口被占用时失败，不借用其他服务。就绪等待有界，smoke 失败保留非零退出码，成功/失败/终止均回收自己启动的 preview；只上传本次 preview/smoke 日志。
- R4：验证 YAML 与命令引用，实际测试成功、smoke 失败和端口冲突；记录本地 Node 24/Windows 与远端 Node 22/Ubuntu 的区别，不声称远端 CI 已运行。
- Owned：`.github/workflows/site-quality.yml`、`.trellis/spec/frontend/quality-guidelines.md`、本任务和父任务记录。
- Forbidden：业务 src、public、server、package.json/lockfile、既有工作流、生产配置、真实模型、推送/部署/签名/公开发布/业务 Feed 或 Cron。

## Acceptance Criteria

- [x] PRD、设计、实施步骤与官方证据齐备，明确本地循环授权及边界。
- [x] workflow YAML 可解析，事件/权限/超时/并发/版本/命令/日志白名单正确。
- [x] 使用 workflow 原始 Bash 步骤完成 smoke 成功路径，并验证失败退出、端口冲突与 TERM；自有 preview 均清理，既有 preview 保留。
- [x] 必要静态门禁通过或明确复用同一源码的既有证据，业务文件及保护快照无变更。
- [ ] 精确本地提交、仅归档本子任务、实际返回父任务并记录剩余决策。

## Notes

- 普通实施和本地提交沿用父任务持续授权，不重复请求启动许可。
- 原有总体验证入口会生成公开知识并读取本地生产验收资料，不能直接用于这一无生产凭证门禁。
- 工作流的实际远端执行依赖后续批准推送；本项只准备并验证本地交付物。
