# 兼容依赖安全修复与残留告警复核

## 目标与依据

官方 npm 审计在当前锁文件上报告 16 个存在告警的依赖条目（3 moderate / 13 high）。这包括构建工具、公开页面路由、助手抓取和 Express 依赖；7 月保留的 React Router 告警现在已有兼容修复。核对实际依赖图后，仅修复现有版本范围允许的条目，并为仍需跨主版本变更的项保留准确说明。

## 范围与约束

- 保持 package.json 的依赖声明与 npm 命令不变；优先只更新 package-lock.json，升级仅限已声明范围内的补丁/小版本。
- 在任务 Temp 的 package / lock 副本中生成候选锁文件，逐项审查版本、父依赖范围、来源和新增/移除节点后才应用到规范仓库。
- 初始可修复候选：baseline-browser-mapping、brace-expansion、browserslist、fast-uri、nanoid、postcss、qs、react-router / react-router-dom、sharp、undici、yaml；同时核对各自必要的依赖节点。
- Prisma 7.9.1 固定 deepmerge-ts 7.1.5 和 mysql2 3.15.3；不执行 audit fix --force、不降级 Prisma、不添加绕过固定范围的 overrides、不隐藏残留告警。
- 仅调用官方 registry 与公告正文；安装忽略生命周期脚本，测试使用本地 fixture。不读取私有环境文件，不连接真实数据库、模型或生产服务。
- Linux CI 浏览器验收是独立阻塞项，保持 review；本任务的本地回归不能被记作其通过。

## 文件边界

- Owned：package-lock.json、本子任务资料、父任务 assessment.md / task.json，最终 journal。
- Forbidden：package.json、业务源码与公开内容、workflow、生产配置、迁移、保护状态快照、旧任务资料与历史 worktree。
- node_modules 与 dist 仅按新锁文件更新为本地验证产物，不提交；保留无关未跟踪资料。

## 验收

- [x] 保存官方审计原始结果、依赖图和相关公告，说明每个条目的修复/残留理由。
- [x] 候选锁文件只包含兼容且必要的变化，根 package.json、Prisma/Playwright 版本和受保护输入保持。
- [x] 新锁文件的完整/生产投影审计实际执行；可兼容修复的条目不再出现，剩余项不以强制降级消除。
- [x] 本地依赖安装、lint、前后端 build、相关助手/抓取/数据合同、图片/发现检查、性能预算、smoke 与完整 UI 通过。
- [x] 零真实模型调用；冻结输入与保护快照无非预期漂移，临时服务只清理自身 PID。
- [x] 精确本地提交 `eb25462f`，仅归档本子任务，实际返回父任务并完成第 33 轮评估。CI 阻塞子任务保持未完成。

## 回滚

保留旧锁文件、源提交和审计结果；若候选带入越界版本或验证失败，只调整本任务的候选/锁文件，不覆盖用户资料或降低既有测试断言。生产未部署，不涉及线上回滚。
