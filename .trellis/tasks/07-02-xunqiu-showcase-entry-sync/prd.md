# 寻球主站展示入口补齐

## Goal

让 BIAU Port 的寻球项目页与已公开的寻球静态展示站保持入口一致：访客从主站项目详情页可以直接到达产品展示页、技术文档、阶段 APK、后端仓库和迁移复盘文章。

## Requirements

- 证据来源必须来自当前仓库和本地项目文件，不只依赖 README：
  - `src/data/portfolio.ts` 中当前 `xunqiu` 项目数据。
  - `D:\workspace4Codex\xunqiu\xunqiu-showcase-site\index.html`。
  - `D:\workspace4Codex\xunqiu\xunqiu-showcase-site\docs.html`。
  - `D:\workspace4Codex\xunqiu\xunqiu-showcase-site\docs\technical\validation-and-deploy.md`。
  - `D:\workspace4Codex\xunqiu\xunqiu-showcase-site\downloads\latest-xunqiu64.apk` 文件状态。
  - `D:\workspace4Codex\xunqiu\xunqiu-android64\docs\TEST_MATRIX.md`。
- 主站新增或调整的链接只能指向已经在公开展示站中存在的静态入口。
- 不新增 API Health 外链，除非有明确可公开的真实服务地址；本轮只记录后端由独立 Render 服务承载。
- 不写入旧后端 IP、数据库地址、Render/R2 密钥、账号、签名文件路径或任何私有配置。
- 不修改 `xunqiu` 或 `xunqiu-backend-modern` 仓库。
- 若改动 `src/data/portfolio.ts`，必须同步生成 assistant knowledge 和 sitemap。

## Acceptance Criteria

- [x] `xunqiu` 项目链接包含产品展示页、技术文档、阶段 APK、后端仓库和迁移复盘文章。
- [x] 项目详情文案准确说明 APK 是“展示站当前阶段包副本”，不包装成正式生产发布。
- [x] `assistantContext` 同步包含技术文档与阶段 APK 入口，且不泄露旧后端 IP 或私有地址。
- [x] 运行 `npm.cmd run assistant:index`、`npm.cmd run sitemap:generate`、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build`。
- [x] 运行 `git diff --check` 和敏感信息扫描。

## Notes

- 人工 gate：不验证实时线上健康状态；不新增真实 API Health 链接；不部署任何项目。
- 证据记录：
  - `xunqiu-showcase-site/index.html` 公开导航和 CTA 包含 `docs.html` 与 `downloads/latest-xunqiu64.apk`。
  - `xunqiu-showcase-site/docs.html` 公开技术文档入口包含 APK 下载按钮和后端仓库入口。
  - `xunqiu-showcase-site/docs/technical/validation-and-deploy.md` 说明 `downloads/latest-xunqiu64.apk` 是当前用于展示的最新阶段包副本。
  - `xunqiu-showcase-site/downloads/latest-xunqiu64.apk` 本地存在，大小约 5.8 MB，最后修改时间为 2026-05-02。
  - `xunqiu-android64/docs/TEST_MATRIX.md` 记录 Android 64 位客户端状态、需回归项、阶段 APK 与未执行项边界。
- 验证记录：
  - `npm.cmd run assistant:index`：通过，生成 23 条公开知识。
  - `npm.cmd run sitemap:generate`：通过，生成 25 个 URL；仅 `lastmod` 刷新到 2026-07-02。
  - `npm.cmd run blog:check`：通过。
  - `npm.cmd run lint`：通过。
  - `npm.cmd run build`：通过；仅有现有 dynamic import chunk 提示。
  - `npm.cmd run check:ui`：通过。
  - `git diff --check`：通过；仅有工作区 LF/CRLF 转换提示。
  - 敏感信息扫描：无命中。
