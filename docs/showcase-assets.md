# 展示素材清单

这个文件用于跟踪主站公开展示素材。原则是：优先使用真实运行截图，其次使用脱敏后的架构/流程图；不发布访问凭据、真实服务地址、数据库配置、签名材料、发布校验信息、真实任务 JSON 或未经确认的第三方素材。

## 素材标准

每个重点项目至少准备：

- 1 张封面图：用于项目卡片、详情页首屏或首页轮播。
- 2-3 张运行截图：用于案例页证据材料，展示真实功能状态。
- 1 张架构或流程图：用于说明系统边界、数据流或任务流。
- 1 组脱敏说明：明确哪些信息已被替换、裁剪或不公开。

## 当前覆盖

| 项目 | 已上线素材 | 缺口 | 下一步 |
| --- | --- | --- | --- |
| Legal RAG | 合同审查工作台、知识库导入、引用溯源问答、RAG 流程闭环图 | 报告导出或模型替换边界图 | 后续补一张“审查报告导出/真实模型替换”脱敏图 |
| Pet Workspace | 生成管线图、生成产物图、App API 契约图、人审决策流图 | 脱敏审核后台真实截图 | 后续补一张不含任务来源和云端配置的审核后台截图 |
| Ozon ERP | ERP 封面图、运营链路图、数据审批模型图、后台模块视图 | 脱敏真实后台截图 | 后续补一张去除店铺、订单、商品和连接信息的真实后台截图 |
| xunqiu | 64 位客户端模块地图、迁移流程图、验收链路图 | 64 位客户端脱敏运行截图 | 只采集新客户端脱敏截图，不复用含真实数据旧素材 |
| Space War | 主菜单、玩法画面、结算页 | Web 试玩入口截图 | 已接入项目卡与 Godot 案例页 |
| 其他 Godot 项目 | 文字证据已补齐 | 各项目封面、玩法截图、结果页截图 | 后续按项目逐个补真实运行图 |
| blog-semi | 站点本身可在线截图 | 首页、项目页、博客页的版本化截图 | 每次大改后保留桌面和移动端截图 |

## 已上线文件

```text
public/images/projects/showcase/legal-rag-reviewed.png
public/images/projects/showcase/legal-rag-knowledge.png
public/images/projects/showcase/legal-rag-qa.png
public/images/projects/showcase/legal-rag-flow.svg
public/images/projects/showcase/fantasy-pet-flow.png
public/images/projects/showcase/fantasy-pet-artifact.png
public/images/projects/showcase/fantasy-pet-api-contract.svg
public/images/projects/showcase/fantasy-pet-review-flow.svg
public/images/projects/showcase/erp-cover.svg
public/images/projects/showcase/ozon-erp-workflow.svg
public/images/projects/showcase/ozon-erp-data-model.svg
public/images/projects/showcase/ozon-erp-admin-console.svg
public/images/projects/showcase/xunqiu-module-map.svg
public/images/projects/showcase/xunqiu-migration-flow.svg
public/images/projects/showcase/xunqiu-verification-chain.svg
public/images/projects/showcase/space-war-menu.png
public/images/projects/showcase/space-war-gameplay.png
public/images/projects/showcase/space-war-result.png
```

## 不直接公开的素材

- `xunqiu` 旧服务端、旧 App、发布包和配置目录中的图片需要逐张复核，避免暴露真实用户凭据、真实用户、服务器信息或历史业务数据。
- `pet` 生成过程中的真实任务包、运行目录、候选素材、模型配置和云端地址不进入公开站点。
- 游戏项目的日志、构建产物、分发包和本地验证路径不进入公开站点；只发布截图、封面和脱敏后的版本说明。
