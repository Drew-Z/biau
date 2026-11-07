# 设计

## 巡检证据

沿用已有串行 suite 与临时投影。新增 `--json` 输出模式，只将当前低敏 suite report 写入 stdout，内部子命令 stdout/stderr 继续捕获；strict 失败保持 exit 1。Actions 用 `npm --silent` 将 JSON 重定向至 RUNNER_TEMP，并在 always 上传该精确文件。公开状态仍只由显式 publish 命令写入。

通过本地 HTTP fixture 运行真实 CLI，验证健康 200 / 503、退出码、当前时间、低敏字段及 public/status 哈希不变。不要仅断言代码里出现了参数。

## 生产诊断

先取平台状态与低敏日志，再用修复后的 GitHub workflow 取独立网络观察。Render free 闲置启动可能约一分钟，短健康超时只表示观察窗口内未就绪。有界唤醒复检根据实际云端证据决定，不以延长超时掩盖持续故障。

## 依赖

使用官方 npm 已发布的同主版本补丁/次版本，Prisma client/adapter/CLI 保持一致。仅更新受影响依赖树，不执行 force 或无依据 overrides。审核前后 lock 差异，完成现有离线 API/迁移/模型协议、服务模式、构建和浏览器 smoke 验证；不调用真实模型。

## 公开知识同步

保留内容 checksum 与部署就绪边界。根据实际部署能力选择最小修复，避免内容未变却因主站提交变化长期等待；内容变化仍须部署对应索引后同步。数据库已同步 checksum 与运行时源 checksum 属于不同事实，不能互换作为成功证明。方案随证据补充。

## 恢复与边界

干净跟踪文件由已核验 Git 基线恢复，清单集中在本任务 CODEX_HOME/backups/tasks 组。原桌宠修改、未知未跟踪文件、历史 worktree 与生产配置不纳入本次提交。不得提交私有 URL、凭据、原始日志或用户内容。
