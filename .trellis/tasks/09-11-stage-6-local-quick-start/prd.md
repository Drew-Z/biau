# 本地快速开始的 Node 与锁文件契约

## Goal

让按 README 接手项目的开发者选择与锁定工具链兼容的 Node 版本，并使用与 CI 一致的首次安装方式。

## Evidence

- 两份 README 的快速开始分别写着 `Node.js 22 or newer` / `Node.js 22+`。按目标平台分别检查，当前锁文件有 18 个 Linux x64 节点、17 个 Windows x64 节点不接受 Node 22.0.0；两者各有 10 个 ESLint 节点也不接受 22.12.0。
- 静态 engine 范围检查显示，22.13.0、22.23.2、24.0.0 和 24.14.0 对两个 x64 目标均无冲突；这不是在所有版本上执行过验证的声明。
- `.github/workflows/site-quality.yml` 使用 Node 22 和 `npm ci`；两份快速开始仍使用 `npm install`。
- 本地 Ubuntu 22.23.2 全部七个 CI run 步骤已在归档 CI 子任务中通过；当前主机为 Windows / Node 24.14.0 / npm 11.17.0。

## Requirements

- 两份快速开始统一说明 Node 22.x 至少 22.13.0，或 Node 24.x；优先使用 CI 所在的 Node 22 分支并采用其最新补丁。
- 首次安装使用 `npm ci`，说明其使用已提交的锁文件。保留知识生成、前端启动及可选后端启动的原有顺序。
- Windows 示例使用 PowerShell 7 与 `npm.cmd`；说明其他系统可使用相同参数的 `npm`。
- 这是 README 文档修复，不更改 package / lock、workflow、主机依赖或运行时支持策略，不把依赖 engine 检查称为全版本运行测试。
- 本地持续授权覆盖本子任务的规划、实现、验证、精确提交和归档；不推送、部署、签名或调用真实模型。

## Acceptance Criteria

- [x] 两份快速开始的版本范围、锁文件安装和命令顺序一致，Node 下限来自实际锁定依赖。
- [x] 命令名称在 package.json 中存在，本地链接可解析，PowerShell 示例语法有效。
- [x] `npm.cmd run docs:manual-gates-check` 与 `git diff --check` 通过。
- [ ] package / lock、业务源码、workflow、保护状态文件和原有 13 份未跟踪资料保持；只提交 owned files。

## Notes

- 轻量文档任务，使用 PRD 和 verification.md，不新增实现或检查代理。
- Owned：README.md、README.zh-CN.md 的快速开始；本子任务资料；父任务的评估、剩余门禁与状态；必要的开发记录。若没有新通用规范，经验保存在本子任务。
- Forbidden：src/、server/、functions/、prisma/、scripts/、package.json、package-lock.json、.github/、所有 public/ 文件、私有环境和其他未完成任务；尤其不得改 public/status/blog-semi-synthetic.json。
- 本轮同时完成只读 Prisma 上游复核，结果用于父任务剩余门禁，不借机升级依赖。
- 原始证据：C:\Users\zhang\AppData\Local\Temp\blog-semi-quick-start-20260910T1909322779799Z。回滚边界为本子任务的两份 README 差异。
