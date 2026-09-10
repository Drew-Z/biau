# CI Ubuntu 与 Node 22 本地干净环境验收

## 目标

从已提交快照在本地 Ubuntu 24.04/Node 22 容器执行现有 CI 的干净安装、lint/build、合同、性能和浏览器 smoke，保存实际结果与清理证据；不推送或触发远端 CI。

## 已确认依据与范围

- 第 10 轮 CI 验收仅覆盖 Windows/Git Bash/Node 24，未执行目标 Linux 平台的干净 `npm ci` 或系统依赖安装。
- GitHub 官方 runner-images 当前将 x64 `ubuntu-latest` 映射到 Ubuntu 24.04；仓库 workflow 明确使用 Node 22，锁文件固定 Playwright 1.61.1。
- Playwright 1.61.1 的官方 noble Dockerfile 内置 Node 24。使用官方 Ubuntu 24.04 基础镜像，复制本机已缓存官方 Node 22 镜像中的运行时，并实际核对系统、架构、Node/npm 版本。
- 从基线提交 `a234e599` 导出已跟踪文件，使用容器内独立副本、干净 npm 和浏览器缓存；执行实际 YAML 中原样提取的全部 run 步骤。
- 只交付本地运行证据、父子任务记录和必要的质量规范。若发现实现问题，先保存原始失败证据，再由父任务独立定界修复。
- 网络仅用于官方镜像、npm、Ubuntu 系统包和 Playwright 浏览器安装；业务检查由既有本地夹具/网络拦截执行，不传入生产凭证。

## 验收

- [x] 记录 Ubuntu 24.04、x64、Node 22、npm、Playwright 1.61.1 与镜像/源快照身份。
- [x] 干净 `npm ci`、lint、build、四项本地合同和性能预算实际通过。
- [ ] 原样 Chromium/系统依赖安装步骤通过，浏览器 smoke 为 21 组/0 失败，保留每步退出码。
- [ ] 正常步骤退出后 preview 端口无监听，任务自有容器全部移除，既有容器/卷保持。
- [x] 主仓库源码、依赖、原构建与保护快照未变；全部任务容器移除，既有资源保留。
- [ ] 全部验收通过后按精确资料白名单提交、归档本子任务并实际回到父任务。当前下载阻塞以 review 保留，不能提前归档。

## 不在范围

不推送、部署、调用 GitHub Actions 或真实模型；不读取私有环境文件、不配置生产服务、不修改公开内容、现有 workflow、业务源码或依赖。容器通过不代替 GitHub 托管环境、Actions 插件、权限、缓存和 artifact 上传的实际远端验收。
