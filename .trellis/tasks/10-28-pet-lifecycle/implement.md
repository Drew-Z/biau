# 实施与验证

1. 固定打包共享运行时 0.3.0，更新博客的 vendor 依赖及锁文件。
2. 实现并验证纯活动适配器；接入 Widget 的提交、进度、终态、取消和会话保留路径。
3. 更新视觉组件的单次反馈领取，补完成未读与双语可访问说明。
4. 更新桌宠浏览器专项，覆盖实际请求与阅读、关闭/重开、失败/取消/重试、历史和资源故障。
5. 执行共享 runtime 测试、博客活动/API/会话/浏览器状态契约、lint、build、performance、smoke 和完整 UI 检查；测试仅使用本地 fixture。
6. 核对改动范围、已验证基线与正式资源哈希，保存测试证据，清理本轮临时文件，更新交付记录。

状态：本地交付完成。既有未提交内容保留；旧的 0.1.0 tarball 保留为历史依赖。

验证结果：共享 runtime 21 项、纯活动适配 15 组、桌宠浏览器 43 场景、API/会话/浏览器状态契约、lint、build、performance、smoke 21 组及完整 UI 46 组均通过。完整 UI 覆盖 17 条路由与两个视口；所有助手夹具验证的真实模型调用为 0。

桌面和 320px 未读截图已人工复核。共享包 10 个文件与源代码和安装内容一致，锁文件 SRI 一致；叶芽三张 PNG 的哈希和几何均通过。基线 7 个原有文件已重新校验，8 个新文件记录为原不存在。

交付记录：`D:\workspace4Cli\claude\pet-studio\docs\BLOG-AGENT-PET-LIFECYCLE-2026-10-28.md`。恢复与证据：`D:\Agent\codex\backups\tasks\20261012T034101524Z-pet-studio-revision` 的 `blog-pet-lifecycle-20261028` 阶段及同名 evidence 目录。

未新增 clone/worktree，未提交或部署；本轮临时服务已关闭，原有未跟踪目录保留。后续 Codex 原生资源和 Windows 宿主适配分别验收。
