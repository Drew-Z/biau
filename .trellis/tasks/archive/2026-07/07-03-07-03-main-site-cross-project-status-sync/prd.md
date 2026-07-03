# Main site cross-project status sync after external updates

## Goal

把刚刚在外部项目完成的访客可见变化同步回 BIAU Port 主站，避免项目页、状态页和公开助手仍描述旧状态。

## Requirements

- 基于当前仓库事实和已推送外部变更同步，不依赖旧 README 或记忆：
  - ERP 已改为生产默认开放普通注册，显式关闭开关仍可关闭。
  - ERP、Legal RAG、BIAU Playlab、寻球展示站已接入 BIAU Port / 泊岸标题、favicon 或可见品牌归属；ERP 和 Playlab 本轮补齐页面主视觉/导航/页脚层面的归属提示。
  - Pet 静态展示页需要使用 BIAU Port / 泊岸标题与 favicon。
  - Pet APK 只找到 debug 包，公开 APK 下载继续保持门禁关闭。
- 更新主站公开数据时只写可公开事实，不写真实账号、密码、密钥、私有后台、数据库连接串、部署面板或内部地址。
- 同步范围优先覆盖：
  - `src/data/portfolio.ts` 项目详情、边界和后续优化；
  - `src/data/statusTargets.ts` 状态页检查说明、gate 和 next action；
  - `src/data/assistant.ts` 公开助手知识，确保访客询问 ERP/Legal/寻球/Playlab/Pet 时不会得到旧答案。
- 如修改项目/助手数据，重新生成 assistant index 和 sitemap。

## Acceptance Criteria

- [x] ERP 项目页、状态页、助手知识都说明生产注册当前默认开放，新账号默认 `operator`，显式关闭开关仍可关闭。
- [x] Legal RAG 项目页/助手知识说明线上工作台品牌已对齐 BIAU Port / 泊岸，但登录凭据仍只通过可公开 demo 配置展示。
- [x] ERP、Playlab、Legal RAG、寻球项目页/状态页说明外部展示站已统一 BIAU Port / 泊岸标题、favicon 或可见品牌归属，且保留各自产品名。
- [x] Pet 项目页/状态页继续明确公开 APK 未开放，只记录 debug 构建证据和 release gate 缺口，并说明 Pet 展示页已接入 BIAU Port / 泊岸标题与 favicon。
- [x] ERP web build 和 Playlab Astro build 通过，证明外部品牌壳修改可构建。
- [x] 运行 `npm.cmd run assistant:index`、`npm.cmd run sitemap:generate`、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build`。
- [x] 运行 `git diff --check` 和敏感信息扫描。

## Human Gates

- 不开启新的线上部署。
- 不公开真实 Pet APK。
- 不公开任何 demo 密码、模型 key、数据库连接串或私有服务地址。
