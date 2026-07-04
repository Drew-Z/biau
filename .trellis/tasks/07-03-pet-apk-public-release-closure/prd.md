# Pet APK 公开发布门禁与展示页下载收口

## Goal

在不误导访客的前提下推进 Pet APK 公开下载：只有满足公开发布条件时才放真实下载链接，否则继续展示当前工作和发布门禁。

## Requirements

- APK 公开前必须具备：
  - release APK 或 AAB 候选。
  - 签名策略和签名产物确认。
  - 版本号、构建时间、变更摘要。
  - 校验摘要，例如 SHA-256。
  - 基础安装/启动/核心页面回归。
  - 人工批准公开下载。
- debug APK 只能作为内部验证信号，不得包装成公开发布。
- 展示页需要清楚区分：
  - 当前 App 画面。
  - 已完成能力。
  - APK 未公开的原因。
  - 满足条件后的下载区域。
- 如果 APK 最终托管到 Cloudflare Pages/R2/GitHub Release，需要记录部署位置但不提交私有 token。

## Acceptance Criteria

- [x] 确认当前 Pet 工作区是否存在 release APK/AAB 候选。
- [x] 若没有 release 候选，主站和展示页继续不暴露下载 href。
- [ ] 若有 release 候选，记录签名、校验、版本和回归证据后再开放下载。
- [x] `pet:synthetic` 或等效检查保证未批准前不会出现真实 APK 下载链接。
- [x] 主站 Pet 项目详情、状态页和展示页下载状态一致。

## Notes

- 推荐第一步：在 Pet 仓库查找 release 产物与 Gradle 构建配置，确认当前能否生成可公开签名包。
- 2026-07-04 UTC evidence: the Pet `gamer` app/community repo is the active Android source. The Android artifact scan found `app-debug.apk` only and no release APK/AAB candidate, so public download remains gated. `pet:synthetic` validates the public showcase page, screenshots, and absence of APK download hrefs; the report also records a non-secret `apkGate` summary.
