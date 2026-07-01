# 跨项目产品展示与内容体系持续优化 - Design

## Boundaries

- 父任务负责长期目标、任务地图、跨子任务验收和人工审核 gate。
- 子任务负责具体实现；每个子任务都必须能独立验证、提交、推送和归档。
- `blog-semi` 是公开展示和内容中枢；其他仓库作为证据来源或独立产品体验优化对象。

## Operating Model

1. 对候选仓库执行只读巡检，确认当前实现、脚本、链接和验证方式。
2. 选择低风险、高收益且不需要人工审核的子任务启动。
3. 子任务进入 `in_progress` 后，Codex inline 加载 `trellis-before-dev` 并直接实现。
4. 完成后运行最小相关验证、敏感信息扫描、提交并推送。
5. 归档子任务，更新父任务或 backlog，继续下一项。

## Safety Rules

- 不公开真实账号、密钥、私有后台、生产数据库连接串、签名文件或未确认部署细节。
- 不伪造 APK 下载、生产可用状态、模型能力、部署状态或测试结果。
- 不删除旧博客、不发布草稿、不生成正式图片资产，除非用户明确审核通过。
- 不回滚其他窗口或用户已有改动。

## Verification Strategy

- `blog-semi`: `assistant:index`、`sitemap:generate`、`blog:check`、`lint`、`build`，必要时 `check:ui`。
- `erp`: workspace build/test，避免默认开启生产自助注册。
- `legal-rag`: `typecheck` / `build` / 项目 README 中的 validate/evaluate 命令按改动范围选择。
- `pet/gamer`: `npm.cmd test` 或相关静态页路径检查；保留既有 unrelated dirty files。
- `xunqiu-backend-modern`: `mvn test` 或 `mvn -DskipTests package` 按改动范围选择。
- `game/blog`: `npm run verify` 或内容/构建审计按改动范围选择。
