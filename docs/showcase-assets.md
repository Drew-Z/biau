# 展示素材清单

这个文件用于跟踪主站公开展示素材。原则是：优先使用真实运行截图，其次使用脱敏后的架构/流程图；不发布访问凭据、真实服务地址、数据库配置、签名材料、发布校验信息、真实任务 JSON 或未经确认的第三方素材。

## 素材标准

每个重点项目至少准备：

- 1 张封面图：用于项目卡片、详情页首屏或首页轮播。
- 2-3 张运行截图：用于案例页证据材料，展示真实功能状态。
- 1 张架构或流程图：用于说明系统边界、数据流或任务流。
- 1 组脱敏说明：明确哪些信息已被替换、裁剪或不公开。

## 自动检查

项目详情页的正文证据由脚本守门：

```powershell
npm.cmd run project-details:check
```

该检查会读取 `src/data/portfolio.ts`，确认每个项目都有详情内容、完整的案例分组、正文中至少有 3 个 visual、至少 1 张运行截图、至少 1 张结构/流程类图示、非单纯复用 hero 图的正文证据、可读的 section 密度、唯一 visual id、公开安全的 hero 图和项目链接。所有图片路径必须指向 `public/images/projects/` 下的真实文件，并检查 visual 标题、说明、alt、caption 和 source 信息。

资产本身也会被检查：引用图片必须能被本地图片管线解析出尺寸，宽高和面积不能像图标/占位图一样过小；PNG/JPEG 等栅格素材需要保留同名 `.webp` 优化副本。新增或修改项目详情页时先跑它，再跑 `assistant:index`、`lint`、`build` 和 UI 检查。

## 当前覆盖

| 项目 | 已上线素材 | 缺口 | 下一步 |
| --- | --- | --- | --- |
| Legal RAG | 合同审查工作台、知识库导入、引用溯源问答、RAG 流程闭环图、报告输出与模型集成边界图 | 无 | 已补全报告导出和模型集成边界说明 |
| Pet Workspace | 生成管线图、生成产物图、App API 契约图、人审决策流图、审核后台运行截图 | 无 | 已补充由 admin-review 临时运行环境生成的脱敏审核后台截图 |
| Ozon ERP | ERP 封面图、运营链路图、数据审批模型图、后台模块视图、后台运行截图 | 无 | 已补充由真实 ERP 前端临时副本生成的脱敏运行截图 |
| xunqiu | 64 位客户端模块地图、迁移流程图、验收链路图、64 位客户端欢迎页运行截图 | 无 | 已补充由新 64 位客户端临时 debug 构建生成的未登录欢迎页脱敏运行截图 |
| Space War | 主菜单、玩法画面、结算页、试玩闭环流程图、站内试玩展示入口截图 | 无 | 已补充 `/games/space-war` 站内展示入口截图和公开试玩闭环图；真实 Godot Web 包后续单独接入 |
| 其他 Godot 项目 | Tetris 桌面运行截图、Tetris 移动端主菜单截图、Tetris 结构图、Next Spacewar 主菜单、Next Spacewar 战斗 HUD、Next Spacewar 结果复盘、Next Spacewar 展示路径图、InteSpace 玩家中枢、InteSpace 战斗 HUD、InteSpace 结果总结、InteSpace 系统闭环图、Raiden 主菜单、Raiden Stage 01 战斗、Raiden Stage 02 风暴机关、Raiden 结果复盘、Raiden 章节总结、Raiden 垂直切片图 | 暂无明显 Godot 结果页截图缺口 | Tetris 截图来自 Godot 4.6.1 临时副本截图回归；Next Spacewar、InteSpace 和 Raiden 截图来自 Godot 4.6.1 Windows 运行时临时副本；Next Spacewar 和 InteSpace 结果复盘使用临时副本构造公开安全单局完成状态后截取真实 UI；Raiden 结果复盘使用临时副本构造公开安全章节完成状态后截取真实 UI |
| blog-semi | 首页、项目页、博客页桌面与移动端版本化截图 | 无 | 2026-07-10 已从本地当前路由重新抓取首页、项目集和博客截图，并跳过首次访问开屏动画；每次大改后继续保留桌面和移动端截图 |

## 已上线文件

```text
public/images/projects/showcase/legal-rag-reviewed.png
public/images/projects/showcase/legal-rag-knowledge.png
public/images/projects/showcase/legal-rag-qa.png
public/images/projects/showcase/legal-rag-flow.svg
public/images/projects/showcase/legal-rag-report-boundary.svg
public/images/projects/showcase/fantasy-pet-flow.png
public/images/projects/showcase/fantasy-pet-artifact.png
public/images/projects/showcase/fantasy-pet-api-contract.svg
public/images/projects/showcase/fantasy-pet-review-flow.svg
public/images/projects/showcase/fantasy-pet-admin-review-runtime.png
public/images/projects/showcase/erp-cover.svg
public/images/projects/showcase/ozon-erp-workflow.svg
public/images/projects/showcase/ozon-erp-data-model.svg
public/images/projects/showcase/ozon-erp-admin-console.svg
public/images/projects/showcase/ozon-erp-admin-runtime.png
public/images/projects/showcase/xunqiu-module-map.svg
public/images/projects/showcase/xunqiu-migration-flow.svg
public/images/projects/showcase/xunqiu-verification-chain.svg
public/images/projects/showcase/xunqiu-android64-runtime.png
public/images/projects/showcase/space-war-menu.png
public/images/projects/showcase/space-war-gameplay.png
public/images/projects/showcase/space-war-result.png
public/images/projects/showcase/space-war-web-showcase.png
public/images/projects/showcase/space-war-loop.svg
public/images/projects/showcase/godot-tetris-structure.svg
public/images/projects/showcase/godot-next-spacewar-showcase.svg
public/images/projects/showcase/godot-intespace-loop.svg
public/images/projects/showcase/godot-raiden-vertical-slice.svg
public/images/projects/showcase/tetris-classic-desktop.png
public/images/projects/showcase/tetris-mobile-menu.png
public/images/projects/showcase/next-spacewar-menu.png
public/images/projects/showcase/next-spacewar-gameplay.png
public/images/projects/showcase/next-spacewar-result-summary.png
public/images/projects/showcase/intespace-player-hub.png
public/images/projects/showcase/intespace-gameplay-hud.png
public/images/projects/showcase/intespace-result-summary.png
public/images/projects/showcase/raiden-main-menu.png
public/images/projects/showcase/raiden-stage-01-gameplay.png
public/images/projects/showcase/raiden-stage-02-storm.png
public/images/projects/showcase/raiden-results-summary.png
public/images/projects/showcase/raiden-chapter-outro.png
public/images/projects/showcase/blog-semi-home-desktop.png
public/images/projects/showcase/blog-semi-home-mobile.png
public/images/projects/showcase/blog-semi-projects-desktop.png
public/images/projects/showcase/blog-semi-projects-mobile.png
public/images/projects/showcase/blog-semi-blogs-desktop.png
public/images/projects/showcase/blog-semi-blogs-mobile.png
```

## 不直接公开的素材

- `xunqiu` 旧服务端、旧 App、发布包和配置目录中的图片需要逐张复核，避免暴露真实用户凭据、真实用户、服务器信息或历史业务数据。
- `pet` 生成过程中的真实任务包、运行目录、候选素材、模型配置和云端地址不进入公开站点。
- 游戏项目的日志、构建产物、分发包和本地验证路径不进入公开站点；只发布截图、封面和脱敏后的版本说明。
