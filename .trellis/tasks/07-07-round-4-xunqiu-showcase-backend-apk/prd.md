# Xunqiu showcase backend and APK consistency

## Goal

复查寻球展示站、现代后端 health、兼容 API、阶段 APK 和文档一致性，确保主站展示不夸大阶段包和生产能力。

## Requirements

- 进入 `D:\workspace4Codex\xunqiu` 与 `D:\workspace4Codex\xunqiu-backend-modern` 前先读取本地规则和脚本。
- 检查展示站标题/favicon/文档/APK 说明，后端 health 和兼容 API smoke。
- 阶段 APK 不等同正式发布；正式公开下载仍需签名、扫描、版本和人工批准。
- 生产 URL、R2、数据库等平台配置作为 manual gate。

## Acceptance Criteria

- [ ] 展示站、后端和 APK 状态有当前证据。
- [ ] 运行 `xunqiu:synthetic` 或项目内等价 smoke。
- [ ] 必要时同步主站项目页、状态页和助手知识。
- [ ] 不公开旧后端 IP、测试密码、签名路径或私有云配置。
