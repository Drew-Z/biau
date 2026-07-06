# Xunqiu showcase backend and APK consistency

## Goal

复查寻球展示站、现代后端 health、兼容 API、阶段 APK 和文档一致性，确保主站展示不夸大阶段包和生产能力。

## Requirements

- 进入 `D:\workspace4Codex\xunqiu` 与 `D:\workspace4Codex\xunqiu-backend-modern` 前先读取本地规则和脚本。
- 检查展示站标题/favicon/文档/APK 说明，后端 health 和兼容 API smoke。
- 阶段 APK 不等同正式发布；正式公开下载仍需签名、扫描、版本和人工批准。
- 生产 URL、R2、数据库等平台配置作为 manual gate。

## Confirmed Facts

- `D:\workspace4Codex\xunqiu\xunqiu-showcase-site` 是公开静态展示站源，包含 BIAU Port / 泊岸标题、技术文档和 `downloads/latest-xunqiu64.apk` 阶段包。
- `D:\workspace4Codex\xunqiu-backend-modern` 是 Spring Boot 3 / Java 17 后端仓库，包含 `scripts/smoke-test.ps1`，可在配置生产 base 后验证 health 与兼容 API。
- 当前没有配置 `XUNQIU_SYNTHETIC_API_BASE_URL`，因此后端 health 与兼容 API 维持 unchecked。
- 最新 APK gate 只记录脱敏摘要：`apkGate.status=stage-apk-found`，文件名为 `latest-xunqiu64.apk`，不包含本地路径或下载 URL。

## Acceptance Criteria

- [x] 展示站、后端和 APK 状态有当前证据。
- [x] 运行 `xunqiu:synthetic` 或项目内等价 smoke。
- [x] 必要时同步主站项目页、状态页和助手知识。
- [x] 不公开旧后端 IP、测试密码、签名路径或私有云配置。
