# Pet showcase APK release gate

## Goal

完善 Pet 展示页和 APK 发布 gate，清楚展示当前工作状态，同时避免公开 debug APK 或未经批准的下载链接。

## Requirements

- 进入 `D:\workspace4Cursor\pet` 前先读取本地规则和脚本。
- 检查展示页、截图、下载状态、APK/AAB 产物、签名和校验摘要。
- 只有 release 构建、签名、回归、校验和人工批准齐全时才允许公开下载。
- 当前若只有 debug 产物，必须保持 gate 关闭并说明原因。

## Confirmed Facts

- Pet 根目录没有顶层 git 仓库，实际由多个子项目/原型仓库组成。
- 当前公开展示页源位于 `D:\workspace4Cursor\pet\gamer\pet-app-showcase-site`。
- `npm.cmd run pet:synthetic` 确认公开展示页和 4/4 截图可访问。
- 最新 `apkGate.status` 是 `debug-only`，只发现 debug APK，公开下载仍需关闭。

## Acceptance Criteria

- [x] Pet 展示页和主站状态准确表达 APK gate。
- [x] 运行 `pet:synthetic` 或项目内展示页检查。
- [x] 记录发布所需人工 gate。
- [x] 不公开未批准 APK、签名文件路径或内部构建链接。
