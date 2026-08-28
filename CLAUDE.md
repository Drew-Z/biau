# Claude Code Guide

请始终使用简体中文与用户沟通。代码、命令、路径、报错信息可以保留英文；解释、说明、总结必须使用中文。

## 项目定位

这是一个基于 React、Vite、TypeScript、自定义设计令牌和 Lucide 图标的产品官网/展示系统，不要写成个人作品集口吻。目标是把 AI 应用、全栈业务系统、移动端/互动体验和资源内容组织成一个可筛选、可搜索、可演示的解决方案网站。

## 工作边界

- 当前规范主项目目录是 `D:\workspace4Cursor\blog-semi`。
- Windows 本地任务默认使用 PowerShell 7；不要假设 WSL 路径或 Linux shell 存在。
- 资料源目录如需使用，必须先确认其在当前机器上的真实路径；只用于阅读和整理信息。
- 不要直接修改资料源项目。
- 不要收录或扩展 `douyu`、`yihuan-helper`、`ques`。
- 项目详情和案例详情需要根据真实目录、README、源码结构整理，但要脱敏。
- 不要写入真实 IP、账号、密钥、数据库连接串、云端 API 地址、签名文件路径等敏感信息。

## 开发习惯

- 修改前先查看 `git status --short --branch`、`git worktree list` 和当前 Trellis task。
- 优先小步修改，完成后运行可行的验证命令。
- 常规验证顺序：`npm run lint`，再 `npm run build`。
- UI 优先复用现有 class-based CSS、设计令牌和 `lucide-react`，不要无依据引入新的组件框架。
- 数据优先集中在 `src/data/portfolio.ts`，复杂结构再拆分。
- 不要使用破坏性 Git 命令，例如 `git reset --hard`、`git clean -fd`、`git checkout -- <file>`，除非用户明确要求。

## Claude Code 与 Codex 协作

参考 `D:\workspace4Cursor\learn\anchor` 的实际协作方式，本项目采用“独立 worktree + 独立分支 + commit 交接”的串行模型：

1. 一次只处理一个 Trellis task 或一个可独立验收的叶任务。
2. 规范主目录用于基线检查、集成和最终验证；不要把两个代理同时放进同一个未提交工作区。
3. Claude Code 的实现任务使用 `D:\Agent\codex\worktrees\` 下的托管 worktree 和独立 `claude/<task-scope>` 分支。
4. Codex 可以在规范主目录或自己的 worktree 中做审查和集成，但不得同时编辑 Claude 正在负责的文件集合。
5. 通过 commit 交接，不通过复制未提交文件、共享编辑器状态或强制覆盖工作区交接。
6. 每次交接必须记录：`task`、`branch/worktree`、`commit`、变更文件、验证结果、已知风险，以及明确排除的未提交文件。
7. 合并、冲突解决和推送由一个明确的集成人负责。允许在用户已授权且验证通过后显式执行 `git push origin main`；不要安装自动推送 hook，也不要把 Trellis `session_auto_commit` 当成产品代码提交。

### 当前工作区保护

- `public/status/blog-semi-synthetic.json` 的既有用户改动不属于任何新 task，除非用户明确指定，否则不得覆盖、暂存或提交。
- `D:\workspace4Cursor\blog-semi-public-route` 是另一个活动 worktree；不得清理、回滚、复用或删除，除非先确认其任务已结束且工作树满足回收条件。
- 在创建或回收 worktree 前，先运行 `D:\workspace4Cursor\.workspace-management\audit-worktrees.ps1`，并核对远端、分支和 `git worktree list --porcelain`。

### Claude Code 起始检查

在新 worktree 中开始任务时运行：

```powershell
git status --short --branch
git rev-parse --show-toplevel
git worktree list --porcelain
python .\.trellis\scripts\task.py current --source
```

复杂任务遵循 Trellis 的 `prd.md`、`design.md`、`implement.md` 规划和 `task.py start` 激活门槛；实现后至少运行 lint、build 和任务相关检查，再提交交接。

## UI 方向

- 整体风格应接近生产级官网和产品展示站，避免“作品集”措辞。
- 页面应有清晰的信息架构：首页、项目、案例、博客之间要有明显区分。
- 项目页偏技术视角：技术栈、架构、模块、实现方式、工程亮点。
- 案例页偏业务视角：问题、方案、过程、结果、证据。
- 保持浅色/暗色、中英文开关的状态一致性；当前以简体中文内容为主。
- 优先用真实项目截图和运行截图，缺图时用稳定占位，不要伪造业务数据。

## 可用插件与 MCP

- `frontend-design`：用于官网 UI、信息架构和视觉层级优化。
- `code-review`：用于修改后做风险和回归审查。
- `commit-commands`：用于整理提交信息。
- `claude-code-setup`：用于维护 Claude Code 项目配置。
- `context7`：查询框架、库、CLI 和云服务的当前文档。
- `playwright`：用于本地页面截图、交互和响应式验证。

## 常用命令

- `/project-inventory`：从资料源盘点展示项目。
- `/verify-build`：安装依赖并执行 lint/build 验证。
- `/deploy-check`：部署前检查 Cloudflare Pages 所需条件。
- `/ui-review`：审查页面布局、响应式、主题和可点击路径。
