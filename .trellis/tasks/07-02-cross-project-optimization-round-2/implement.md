# 跨项目产品展示与内容体系持续优化 - Implement

## Queue

1. 启动 `07-02-blog-semi-showcase-loop-audit`，修复主站项目卡片和外链行为一致性。
2. 根据巡检结果启动 `07-02-project-evidence-refresh-sync`，继续同步项目页事实和助手知识。
3. 根据 Pet 仓库状态启动 `07-02-pet-app-showcase-followup`，完善展示页和 APK gate。
4. 在公开内容安全边界内启动 `07-02-knowledge-blog-evidence-pack`，生成 review-only 证据包和草稿。

## Per-Child Checklist

- 读取相关 `.trellis/spec/` 指南和项目上下文。
- 巡检当前代码、数据和脚本，确认改动范围。
- 小步实现，避免无关重构。
- 运行 `git status --short`、`git diff --check`、敏感信息扫描和相关验证命令。
- 提交并按仓库策略推送。
- 归档 child task，记录下一项候选和 gate。

## Rollback Notes

- UI/数据同步类改动应集中在少量文件，必要时用反向 patch 回退本轮变更。
- 不使用 `git reset --hard`、`git checkout -- <file>` 或 `git clean -fd`。
