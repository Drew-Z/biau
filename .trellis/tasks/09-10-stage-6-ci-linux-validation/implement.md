# 执行顺序

- [x] 阅读父任务、既有 CI 验收、workflow、npm 入口、浏览器网络拦截和质量规范。
- [x] 核对仓库/worktree，执行工作区只读审计；通过 smart-search fetch 取得官方 runner 和 Playwright 正文。
- [x] 建立有限验证子任务，明确本地下载、源码副本、凭证与资源清理边界。
- [x] 冻结 678 个源/构建文件，准备 Ubuntu 24.04 与缓存 Node 22，记录镜像及版本。
- [ ] 在无 node_modules 的已提交快照执行原样 CI run 步骤，保存逐步结果。
- [x] 核对 preview 未启动、8 个临时容器已回收、原资源和 678 个主工作区文件哈希，完成阻塞证据审查。
- [ ] 精确本地提交、仅归档本子任务、实际返回父任务并重新评估；记录 journal。

## 已取得的执行证据

- 初次运行：Ubuntu 24.04.4、Node 22.23.2、npm 10.9.8，前五个 workflow run 步骤均 exit 0。Chromium 安装因 Ubuntu 的两个软件包下载返回 `500 / unexpected EOF` 失败，smoke 未执行；原始失败结果和日志保留。
- 初次运行的两个任务容器在恢复后按精确 ID 确认已移除；原报告中 CI 容器的 `removed=false` 是 stop 后立即查询的短暂结果，补充证据单独保存，不重写原报告。
- 新容器使用相同源快照、镜像、Node 二进制和原样 Bash 步骤。只重建 npm 依赖与产物，复用初次成功的 lint、四项合同、性能检查；继续 Chromium 与 smoke。Chromium 仅在已知下载错误时允许一次额外重试，每次保留独立日志，不修改安装源、工作流或断言。
- 新运行开始时主工作区 678 个冻结文件无漂移，保护快照哈希保持。最终结果和运行后核对待写入 verification.md。
- `retry-1` 的两次 Chromium 安装均因不同 Ubuntu 包的 `500 / unexpected EOF` 失败，两个任务容器均已回收。APT 默认清缓存行为与 HTTPS 传输截断诊断已保存；按 design.md 再执行一次有界、仅调整容器下载恢复配置的 `recovery-apt`，保留所有旧日志。
- 恢复配置预检查的空 hook 误判已在独立副本修正；最终新容器中 `npm ci` 出现 `ECONNRESET`，未到 Chromium 阶段。停止重试，实际终局、清理和 678 文件无漂移均已写入 verification.md。
- 未满足浏览器验收，因此保留 review / blocked，不归档或声称完成。父任务记录 blockedChildren 后按协议继续独立依赖审计。

## 第 34 轮恢复

- [x] Windows 与隔离 Linux 下载探测均通过，跨环境内容哈希、已知字体 SHA-256 和 npm integrity 匹配；探测容器已清理。
- [x] 冻结 `f9c1133f` 的 678 个源/构建输入及新锁文件，导出 1511 个已跟踪文件（私有配置路径 0），核对七个原样脚本；准备脚本与 PowerShell helper 语法通过。
- [ ] 从空 npm / Chromium 缓存重新执行全部七个步骤，保留每步实际退出码，不复用旧锁文件结果。
- [ ] 核对 preview 退出、任务容器回收、原资源保留与冻结输入无漂移，再更新完整验收结论。

- 本次单次运行实际失败于新锁文件的 npm ci，exit 1；Ubuntu bootstrap 通过，后续步骤和 preview 未运行。两份依赖的镜像请求重试恢复，最终 aborted 的未完成 unpack 为 js-tiktoken；完整 npm debug 日志已保存，不直接认定唯一根因。
- 三个相关包的官方/镜像串行对照均成功且 integrity 一致。4 个本轮 CI/探测容器均移除，原资源保留；父任务独立评估仅下载地址变化的候选，本 CI 子任务保持 review / blocked。
- 终局完整性已核对：678 个源码/构建输入和 13 份原有未跟踪资料无漂移。父任务的官方地址候选在独立空缓存 Linux 实验中安装 445 包成功，版本/integrity 无偏差，未计入本 CI 的通过步骤。

## 第 36 轮正式验收

- [x] 官方下载地址修复已独立提交并归档，父任务实际恢复本 CI 子任务。
- [x] 固定 d06b5ace 与新锁文件，冻结 678 个输入，导出 1518 个已跟踪文件并核对七个原样脚本。
- [ ] 从空缓存执行全部七步：本次在 Ubuntu bootstrap 的 apt-get update 以 exit 100 结束，workflow 步骤实际执行 0 项。
- [ ] 取得 Chromium / smoke / preview 退出终局及资源、源码完整性核对，再精确本地交付。
- [x] 保存本次真实失败、两个容器移除、原有资源保留和 678 个输入 / 13 份旧资料无漂移证据；五个本轮一次性下载/源归档文件已清理。
- [ ] 保留 review / blocked，精确提交阻塞记录、实际返回父任务重新评估，并记录 journal；不归档 CI。
