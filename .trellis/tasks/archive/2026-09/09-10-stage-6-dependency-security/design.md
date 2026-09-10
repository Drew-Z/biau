# 依赖修复设计

1. 基线来自提交 `210b5916`；它仅比 CI 源提交多任务文档，package / lock 哈希相同。官方 audit 已在没有 node_modules 的 Temp 副本中运行，显式使用空 user/global npm config，不读取私有配置。
2. 根声明保持；先让 npm 在 Temp 生成定向兼容更新候选，再比较所有 lock 节点的 version / resolved / integrity / dependencies，禁止跨主版本、Prisma/Playwright 变化、无关批量升级及 registry 全量改写。
3. 固定版本约束优先于自动审计建议。Prisma 的 deepmerge / MySQL 条目先核对公告与实际调用路径；主站 BrowserRouter、后端 PG adapter、仓库控制的 Prisma 配置与构建输入分别说明，避免将未使用的服务端能力说成线上可利用漏洞，也不把未证实的不可达说成永久豁免。
4. 新锁文件应用后使用常规 npm 安装且忽略生命周期脚本，检查安装前后 package / lock 身份；不执行广义 verify、内容生成、数据库迁移或真实模型检查。先运行 lint/build 与助手、抓取、项目合同，再针对本轮新构建运行 smoke / 完整 UI。
5. 使用任务自有 loopback preview 和明确 PID，原有 5190 preview 不动；最终无监听与进程清理结果单独保存。UI 网络拦截沿用既有 fixture guard。
6. 审计结果记录时间、平台、版本、残留依赖边与建议恢复条件。新锁文件不能复用旧版 Linux smoke 的未完成结果；父任务继续记录 CI 下载阻塞。
