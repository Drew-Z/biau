# 跨项目产品展示与内容体系持续优化

## Goal

把 BIAU Port 及其相关项目从“有实现但展示分散”推进到“访客能看懂、点得通、信得过、可演示”的长期状态。每一轮先基于当前仓库证据巡检，再选择低风险、高收益的小步优化执行；需要人工审核的事项只记录为 gate，不阻塞其他可自动推进的工作。

本父任务只承载长期规则、任务地图和跨子任务验收；实际实现由 child tasks 独立完成、验证、提交、推送和归档。

## Requirements

- 默认优先级为产品展示与访客体验，而不是自动生成大量文章：
  - 60% 产品/展示体验。
  - 25% 工程质量/文档同步。
  - 15% 博客/内容草稿。
- 每个子任务必须独立可验证，优先修复访客马上能感知的问题：
  - 主站首页、项目页、项目详情页、助手知识、站点地图和公开链接。
  - 项目页事实与 `erp`、`legal-rag`、`xunqiu-backend-modern`、`xunqiu-showcase-site`、`pet/gamer`、`game/blog` 和主要游戏仓库保持一致。
  - 静态展示页、下载页、demo 入口、截图和后续优化方向必须如实表达当前边界。
- 所有内容必须证据优先，不从过时 README 单点推断项目状态；优先读取当前代码、脚本、测试、部署文档、数据文件和近期提交。
- 不写入真实账号、密钥、生产数据库连接串、私有后台地址、签名文件路径或未确认可公开的部署细节。
- 模型与图片生成仅用于草稿或辅助，不自动发布；不并发打同一个中转，不显示 API key，不做无意义测活。
- 提交后按仓库策略推送：
  - `blog-semi/main` 可以在成功提交后默认 `git push origin main`。
  - 其他仓库推送当前工作分支；不安装自动 push hook。

## Child Task Map

- `07-02-blog-semi-showcase-loop-audit`: 主站项目展示闭环审计与修复，优先处理卡片/按钮/详情页/外链行为一致性。
- `07-02-project-evidence-refresh-sync`: 项目案例证据刷新与主站同步，按项目仓库证据更新项目详情和助手知识。
- `07-02-pet-app-showcase-followup`: Pet App 展示页继续优化，补截图、发布清单、APK gate 和主站链接。
- `07-02-knowledge-blog-evidence-pack`: 知识积累博客草稿证据包，先产出 review-only 草稿和证据，不发布。
- `07-02-07-02-playlab-game-detail-enrichment`: Playlab 六个 Godot 游戏项目详情补强，让主站详情页解释玩法、实现、验证、边界和后续方向。
- `07-02-erp-auth-entry-experience`: ERP 登录/注册入口审计与自助注册 gate 加固，保守解析 `ERP_REGISTRATION_ENABLED` 并补充测试/文档。
- `07-02-chunk-strategy-draft-evidence-review`: RAG chunk strategy 草稿证据刷新，移除模型占位，补当前 Legal RAG splitter/citation 证据。

## Human Review Gates

- 是否开启 ERP 生产自助注册。
- 是否发布真实 Pet APK。
- 是否部署任何项目到线上。
- 是否删除旧博客。
- 是否把草稿发布到公开博客。
- 是否公开任何仍含“待核验”的内容。
- 是否使用图片生成作为正式公开资产。

## Acceptance Criteria

- [x] 至少一个 child task 完成实现、验证、提交、推送并归档。
- [x] 每个已完成 child task 都记录验证命令和人工审核 gate。
- [x] `blog-semi` 的公开展示、助手知识、站点地图和博客检查在相关子任务中保持同步。
- [x] 长期 backlog 中的后续候选清晰记录，未做事项不能被描述为已完成。
- [x] 不提交敏感信息、未确认公开下载链接或未经审核发布的博客内容。

## Current Round Summary

- 已完成 7 个 child task：主站展示闭环、blog-semi 案例刷新、Pet 展示页 gate、Embedding 知识草稿证据包、Playlab 游戏详情补强、ERP 自助注册 gate 加固、Chunk strategy 草稿证据刷新。
- 本轮已覆盖产品/展示体验、项目证据同步、草稿内容治理、跨项目链接安全边界、生产注册误配置防护和 RAG 知识草稿去占位。
- 父任务不归档，继续作为长期自动优化队列；后续仍按“低风险、高收益、可验证、遇 gate 切下一个”的规则推进。

## Next Candidate Queue

- `erp` 登录后首次引导：注册 gate 已加固；后续可优化登录后的首次进入提示、角色说明和关键路径引导，生产自助注册仍是人工 gate。
- `blog-semi` 首页与项目详情：检查首页项目卡、详情页同类推荐、外链按钮和移动端信息密度是否还有访客体验问题。
- `xunqiu` 展示链路：复核主站项目详情、展示页、APK/文档入口和后端健康检查叙事是否仍一致。
- `legal-rag` 公开演示叙事：检查质量面板、demo 路径、拒答与引用说明是否能被非开发访客快速理解。
- 博客草稿后续：`chunk-strategy-public` 已完成证据刷新；接下来可 review `rag-overview-public`，或在人工确认后进入模型辅助润色，不发布、不删除旧文。

## Notes

- 如果某个子任务遇到 blocker，记录 blocker、证据和下一步建议后切换到下一个可执行优化。
- 父任务保持 `planning` 或长期跟踪状态；启动实现时优先启动具体 child task。
