# Pet App 展示页接入主站

## Goal

把 `pet/gamer/pet-app-showcase-site` 的 App 展示与下载状态页接入 BIAU Port 主站公开静态路径，让访客能直接查看 AI 桌宠 Android App 当前截图、展示面和 APK 发布门禁，而不是只能跳到 GitHub 源码目录。同时整理 `pet/gamer` 当前脏文件、完善静态展示页部署说明，并尝试产出本地 APK 构建产物与校验记录。

## User Value

- 访客可以从主站 Pet 项目详情直接打开可读的 App 展示页。
- 页面展示真实模拟器截图和当前发布状态，明确 APK 还没有公开构建。
- 主站项目页、公开助手知识和 sitemap 能同步这个展示入口。
- `pet/gamer` 当前未提交改动得到归类、验证和提交/清理建议，避免长期悬挂。
- APK 进入“本地可验证产物”阶段，但不自动开放下载。

## Confirmed Facts

- `D:/workspace4Cursor/pet/gamer` 当前有未提交分页相关改动和一个疑似测试输出文件；需要先检查差异再处理。
- `pet/gamer/pet-app-showcase-site/index.html` 已说明 App 当前覆盖桌宠首页、孵化入口、社区、个人页和 APK 下载 gate。
- `pet/gamer/pet-app-showcase-site/README.md` 明确禁止用占位下载替代真实 APK，公开 APK 需要可复现构建、签名策略、校验、基础回归和人工批准。
- `blog-semi/public/images/projects/showcase/` 已有 `android-main.png`、`android-hatch.png`、`android-community.png`、`android-profile.png` 等截图资产。
- `src/data/portfolio.ts` 当前 Pet 项目链接仍主要指向展示页源码目录，不是可直接浏览的展示页。

## Requirements

1. 在 `blog-semi` 中新增一个公开静态展示页，例如 `/pet-app-showcase/`。
2. 展示页必须使用已有公开截图资产，不引入外部图片或生成图片。
3. 展示页必须明确：
   - 当前展示的是阶段 App 工作面。
   - APK 下载仍关闭。
   - 公开 APK 需要构建、签名、校验、回归和人工审核。
4. 更新 `src/data/portfolio.ts` 的 Pet 项目链接、详情和 `assistantContext`，让主站指向可浏览展示页，同时保留源码链接作为辅助。
5. 重新生成助手知识和 sitemap。
6. 不写入真实账号、token、私有 API、生产地址、内部 artifact 路径或 APK 文件。
7. 检查并整理 `pet/gamer` 当前脏文件：
   - 先读 `pet/gamer/AGENTS.md` 和相关差异。
   - 对源代码改动按功能归类、运行相关测试。
   - 对生成输出或临时文件，只在确认无价值时清理。
8. 优化 Pet 静态展示页的部署说明：
   - 明确可作为纯静态页面部署。
   - 明确主站静态路径与原项目展示页的关系。
   - 明确 APK 公开发布前置条件。
9. 尝试本地 Android APK 构建：
   - 使用项目现有 Gradle/Android 构建命令。
   - 记录本地 APK 产物路径、版本信息、checksum 和构建限制。
   - 不把 APK 放入 `blog-semi/public/`，不启用公开下载链接。

## Acceptance Criteria

- [ ] `/pet-app-showcase/` 可作为静态页面访问，并展示四张 App 截图。
- [ ] 页面没有公开 APK 下载链接，下载按钮或状态明确为待公开构建。
- [ ] Pet 项目详情页链接指向 `/pet-app-showcase/`，并保留展示源码入口。
- [ ] `assistantContext` 和 `server/data/public-knowledge.json` 同步展示页事实。
- [ ] `npm.cmd run assistant:index`、`npm.cmd run sitemap:generate`、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build`、必要时 `npm.cmd run check:ui` 通过。
- [ ] `git diff --check` 和变更文件敏感信息扫描通过。
- [ ] `pet/gamer` 脏文件已完成分类：要么验证后提交，要么确认是临时输出并清理，要么记录为需要人工处理的 blocker。
- [ ] Pet 静态展示页部署说明说明了纯静态部署、主站入口和 APK gate。
- [ ] 本地 APK 构建已尝试；若成功，记录非公开产物路径和校验信息；若失败，记录失败原因和下一步。

## Out Of Scope

- 不把真实 APK 发布到公开网站或启用公开下载。
- 不实际部署任何项目到线上。
- 不使用图片生成作为正式公开资产。
- 不写入签名密钥路径、私有 artifact 地址或任何真实凭据。
