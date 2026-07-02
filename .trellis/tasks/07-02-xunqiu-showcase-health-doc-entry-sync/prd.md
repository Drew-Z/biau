# Xunqiu showcase health and doc entry sync

## Goal

让寻球案例的静态展示站、主站项目页和公开助手知识更准确地说明：静态展示页 / 技术文档 / 阶段 APK / 现代后端健康检查 / 新旧迁移边界分别是什么，避免把旧后端敏感配置或冷启动中的 Render health 包装成稳定生产能力。

## Requirements

- 依据当前仓库文件，而不是旧 README 单独判断：
  - `D:/workspace4Codex/xunqiu/xunqiu-showcase-site`
  - `D:/workspace4Codex/xunqiu-backend-modern`
  - `D:/workspace4Cursor/blog-semi/src/data/portfolio.ts`
- 不公开真实旧后端 IP、数据库配置、测试密码、签名路径、R2 key、Render 环境变量或其他私有运维信息。
- 不发布或替换 APK；只说明现有阶段 APK 是展示副本。
- 如果公开 health 检查超时或冷启动，不把它写成“已正常运行”；只记录 smoke/health 的检查方式和边界。
- 主站项目页和助手知识要同步：
  - 展示站入口。
  - 技术文档入口。
  - 阶段 APK 入口与边界。
  - 后端 smoke/health 检查能力与冷启动边界。
  - 新旧客户端/后端分流迁移策略。
- 展示站文档如需调整，保持纯静态、无需构建、不写入敏感信息。

## Acceptance Criteria

- [ ] 展示站验证文档说明 health/smoke 检查、冷启动/超时处理和不等同生产 SLA。
- [ ] 主站 Xunqiu 项目页/assistantContext 同步 health/smoke、APK、docs 和迁移边界。
- [ ] 不新增真实 IP、账号、密码、密钥或私有部署细节。
- [ ] `blog-semi` 公开助手索引和 sitemap 根据需要重新生成。
- [ ] touched repos 的最小验证、`git diff --check` 和敏感扫描通过。

## Notes

- 2026-07-02 公开 health URL 试探在 60 秒内超时；本任务只把它作为“需要检查/可能冷启动”的边界，不宣称线上已通过。
