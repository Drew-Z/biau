# 实施与验收

- [x] 第 12 轮完成交付/归档/日志，实际回到父任务；读取所有共享目录调用点和相关 frontend 规范。
- [x] 完成 PRD 收敛、设计、文件边界与当前持续授权核对。
- [x] 在既有语言检查中加入详情和共享目录断言，保存原构建负向结果：英文详情返回仍为“知识库”。
- [x] 接入固定阅读字典和内容语言标记，保持原文、publication、锚点与状态生命周期。
- [x] 运行 lint/build/performance、blog/projects discovery、project-details、registry、analytics 合同及语言专项；仅针对真实失败修正。
- [x] 检查代表性手机/桌面截图，运行 smoke 和完整 UI，冻结源码/检查器/构建哈希与保护文件。
- [ ] 记录验证结果与限制，精确白名单本地提交、仅归档本子任务、实际返回父任务并继续评估。

主要命令：`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run language:ui`、`npm.cmd run check:ui:smoke`、`npm.cmd run check:ui`。浏览器只用本地 fixture 与网络 guard，真实模型调用为零。

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-reading-language-20260909-9828749c`。复用本会话的 5190 preview，保留原 5183；没有创建一次性脚本。交付前核对本轮资源用途及 Git 白名单。
