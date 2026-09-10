# 锁文件官方源可移植性修复

## Goal

基于 Linux npm 安装失败与官方源候选成功证据，仅统一 479 个 resolved 下载地址，保持依赖版本和 integrity 不变，精确本地交付后恢复原 Ubuntu CI 验收。

## Requirements

- 将 package-lock.json 中 479 个 `https://registry.npmmirror.com/` resolved 主机名统一为 `https://registry.npmjs.org/`；保持 URL 路径和其余全部字段不变。
- 依赖节点、版本、integrity、父范围、根 package.json、Prisma/Playwright 版本均保持；不重新解析或升级依赖，不添加 override，不改机器级 npm 配置。
- 依据是整批镜像安装出现 ECONNRESET，而官方地址候选的空缓存 Linux 安装通过且 445 个安装节点与原版本/integrity 一致。单包双源对照均成功，因此不宣称镜像永久不可用或唯一根因已被完全证明。
- 主机实际依赖保持原状态；运行 lint/build/performance，比较源/构建哈希。完整 UI 明确复用依赖修复 eb25462f 的 46/0 与 smoke 21/0，前提是除了 resolved 地址，所有版本/integrity、源码和构建字节保持。
- 原 Ubuntu CI 子任务继续 review / blocked。本任务的传输实验不代替其生命周期脚本、audit、Chromium 和浏览器验收；本地交付后实际返回父任务，再用新的已提交快照恢复 CI。

## 文件边界

- Owned：package-lock.json、frontend/quality-guidelines.md 的依赖下载核对规则、本子任务资料、父任务 assessment/task 与最终 journal。
- Forbidden：package.json、业务源码、公开内容、workflow、生产/私有配置、数据库、保护快照及旧任务资料。node_modules 不重装；dist 只作为本地构建验证产物，不提交。
- 保留原有 13 份未跟踪资料、历史 worktree、被自动审批拒绝处理的文件；不推送、部署、调用真实模型或启用 Feed/Cron。

## Acceptance Criteria

- [x] 官方地址候选在独立空缓存 Linux / Node 22 的传输实验中 exit 0，445 个安装节点版本/integrity 与原锁文件一致；原始失败和双源成功证据保留。
- [x] 应用后的文件与候选 SHA-256 完全一致，结构化比较确认仅 479 个 resolved 改动，其他字段与 package.json 不变。
- [x] lint/build/performance 通过；除锁文件外，677 个冻结输入及 13 份旧未跟踪资料无漂移，满足既有完整 UI 证据复用条件。
- [ ] 按精确白名单本地提交，仅归档本子任务，实际返回父任务并恢复原 CI 验收。

## 证据和回滚

证据目录为 `C:/Users/zhang/AppData/Local/Temp/blog-semi-ci-linux-resume-20260910T095901931286Z-72kd9_9l`；registry-candidate.json、candidate-install-result.json、mirror-diagnostic.json 保存字段差异、安装结果与双源对照。源基线为 f9c1133f，前置记录提交为 9f6b0e12。若地址规范化导致不可兼容下载，仅回退本子任务的 resolved 地址，不调整版本/integrity 或覆盖原有资料。
