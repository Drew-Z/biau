# Roleplay 项目接入

## 目标

将独立部署的游客式多角色聊天演示接入 BIAU Port / 泊岸的公开项目目录，提供项目详情、公开入口和可靠性边界说明。

## 范围

- 注册 `角色剧场 Roleplay` 产品身份。
- 将项目加入 AI 项目目录与首页项目入口。
- 项目详情页展示角色库、游客会话、GLM 服务端密钥边界和 Cloudflare Tunnel 部署方式。
- 公开入口指向 `https://roleplay.playlab.eu.cc/`。
- 增加低敏可靠性状态定义，不写入 API Key、上游地址、管理员令牌或服务器 IP。

## 非目标

- 不把聊天前端复制进 blog-semi 的 React bundle。
- 不让 blog-semi 代理聊天 API。
- 不在仓库写入模型密钥、服务器凭据或管理员 token。
- 不覆盖现有未提交主题、排版和脚本改动。

## 验收标准

- 项目集能看到并打开 Roleplay 详情页。
- 首页有 Roleplay 项目入口。
- 详情页的公开入口可打开新域名。
- 产品注册、项目发布、项目详情和可靠性检查通过。
- `npm.cmd run lint` 与 `npm.cmd run build` 通过。
