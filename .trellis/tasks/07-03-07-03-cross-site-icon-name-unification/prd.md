# Unify public site icons and names

## Goal

把 BIAU Port / 泊岸作为所有公开展示站点的统一父品牌落到真实可见面上，而不是只改主站数据或浏览器标题。访问者打开任意项目演示时，应能明确看出它属于 BIAU Port / 泊岸，但项目自身名称仍保留。

## Scope

首轮处理可本地修改和验证的公开站点/展示面：

- `D:/workspace4Cursor/blog-semi` 主站。
- `D:/workspace4Cursor/erp` Ozon ERP 前端展示/登录/注册入口。
- `D:/workspace4Cursor/game` BIAU Playlab / game 展示站。
- `D:/workspace4Cursor/legal-rag` Legal RAG 公开演示入口。
- `D:/workspace4Cursor/pet` Pet 当前展示页或可构建前端壳。
- `D:/workspace4Codex/xunqiu` 与 `D:/workspace4Codex/xunqiu-backend-modern` 中面向访客的展示/下载/前端壳；如果某仓库仅是后端或移动端工程，只记录证据和后续落点，不强行改无关文件。

## Requirements

- 统一父品牌使用 `BIAU Port / 泊岸`，允许中文语境显示 `BIAU Port 泊岸`。
- 保留产品身份，例如 `Ozon ERP`、`Legal RAG`、`BIAU Playlab`、`寻球`、`Pet`；不要把所有项目改成同一个名字。
- 每个可修改站点至少核对这些面：
  - Browser shell：`<title>`、favicon / apple touch icon / manifest / site metadata。
  - Visible shell：导航品牌、登录/注册页品牌、侧边栏 logo、页脚归属、返回 BIAU Port 链接。
  - Main-site data：`src/data/portfolio.ts`、`src/data/statusTargets.ts`、`src/data/assistant.ts` 等主站公开数据里对应名称和入口。
- 图标优先复用或生成一致的 BIAU Port / 泊岸 SVG/PNG favicon 资产；不要引入真实密钥、私有域名、账号或内部环境地址。
- 如果某项目目前没有可公开前端或无法安全部署，只在任务记录里标为待人工部署/待后续任务，不做虚假展示。

## Acceptance Criteria

- [x] 形成一份跨站点品牌核对表，列出每个项目的当前状态、修改文件、验证命令、后续手工事项。
- [x] 主站公开数据和 SEO shell 与 `BIAU Port / 泊岸` 保持一致。
- [x] ERP 的登录/注册/浏览器 shell 可见 BIAU Port / 泊岸 父品牌，且真实注册入口不再被隐藏。
- [x] Game/Playlab 的浏览器 shell、可见壳和 favicon/manifest 对齐。
- [x] Legal RAG 的公开演示入口不再只被登录页挡住，演示说明包含可访问路径或公开 demo 提示；品牌壳对齐。
- [x] Pet 展示页或下载页入口使用统一品牌壳；APK 未获人工发布确认时不暴露真实下载链接。
- [x] 寻球相关公开展示面完成品牌核对；无法修改的部分记录清楚原因。
- [x] 对每个被改仓库运行最小可行验证：lint/build/typecheck 或项目已有等价命令；无法运行时记录原因。
- [x] 不提交真实密钥、密码、内部 API、私有 dashboard 或未审核 APK。

## Human Gates

- 发布真实 Pet APK。
- 部署任何生产站点。
- 暴露真实后台密码、模型 Key、监控面板、管理账号。
- 修改 DNS / Cloudflare / Render / Vercel 等平台配置。
