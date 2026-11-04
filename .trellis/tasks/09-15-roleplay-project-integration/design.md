# 设计

## 接入边界

blog-semi 负责公开项目说明、SEO 和入口投影；Roleplay 独立站负责角色库、游客会话、GLM 请求和密钥保护。两者通过外部 HTTPS 链接连接。

## 数据层

- `src/data/siteLinks.ts`：增加 Roleplay 公共站点 URL。
- `src/data/productRegistry.ts`：增加产品身份。
- `src/data/portfolio.ts`：增加项目案例、公开入口和技术边界。
- `src/data/projectPublication.ts`：增加在线公开发布记录。
- `src/data/hero.ts`：增加首页项目卡。
- `src/data/statusTargets.ts`：增加入口和低敏可靠性检查说明。

## 安全

仅公开“API Key 留在服务器端、游客会话有边界、模型为 GLM”的产品级描述；不公开具体上游地址、服务器 IP、密钥、管理员令牌或内部文件路径。
