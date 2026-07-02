# 同步 ERP 登录体验到主站项目页

## Goal

把 ERP 仓库最近完成的登录页受控入口优化、注册关闭态说明、登录后概览首次引导同步到 BIAU Port 主站的 Ozon ERP 项目详情和公开助手知识，让访客看到的项目案例与当前真实实现一致。

## User Value

- 访客能理解 ERP 不是开放注册 SaaS，而是受控团队工作台。
- 主站项目页能说明登录页、Owner 初始化、注册 gate、概览页推荐路径之间的产品体验闭环。
- 公开助手回答 ERP 项目时能提到最新入口体验和安全边界，而不是停留在旧描述。

## Confirmed Facts

- ERP 分支 `codex/ozon-plugin-parity` 当前干净，最新相关提交包括：
  - `6b91b1a feat: add ERP overview first-run guidance`
  - `c7c5bec feat: refine ERP login landing`
- ERP `LoginView.vue` 已包含受控登录状态、工作链路卡、注册关闭态说明、BIAU Port 回跳和 bootstrap 失败时不默认开放注册的前端兜底。
- ERP `OverviewView.vue` 已包含当前账号/角色、生产注册 gate 提醒，以及店铺配置、插件下载、商品同步、上架记录推荐路径。
- 主站 Ozon ERP 项目数据位于 `src/data/portfolio.ts`，派生助手知识位于 `server/data/public-knowledge.json`。

## Requirements

1. 更新 `src/data/portfolio.ts` 中 `ozon-erp` 的公开项目详情和 `assistantContext`。
2. 只写公开安全事实，不包含真实账号、密码、token、数据库连接、生产主机、私有后台、密钥或部署细节。
3. 同步内容应覆盖：
   - 登录页受控入口状态与工作链路表达。
   - 注册关闭态的可行动说明。
   - bootstrap 失败时前端不默认开放自助注册。
   - 概览页当前账号/角色与推荐路径引导。
4. 重新生成助手知识和 sitemap，保持公开索引一致。

## Acceptance Criteria

- [x] `ozon-erp` 项目详情页包含最新登录页和概览页体验事实。
- [x] `assistantContext` 和生成后的 `server/data/public-knowledge.json` 包含最新公开摘要。
- [x] 不引入任何敏感信息或未确认公开的 ERP 运维细节。
- [x] `npm.cmd run assistant:index`、`npm.cmd run sitemap:generate`、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build` 通过。
- [x] `git diff --check` 和变更文件敏感信息扫描通过。

## Validation

- Updated `src/data/portfolio.ts` Ozon ERP detail content and `assistantContext` from ERP commits `6b91b1a` and `c7c5bec`.
- `npm.cmd run assistant:index` passed and regenerated `server/data/public-knowledge.json` with 23 public knowledge items.
- `npm.cmd run sitemap:generate` passed with 25 URLs; sitemap content did not change.
- `npm.cmd run blog:check` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed, with existing Vite ineffective dynamic import warnings for `blogCuration.ts` and `portfolio.ts`.
- `npm.cmd run check:ui` passed across 8 routes and 2 viewports.
- `git diff --check` passed.
- Sensitive-info scan over changed project data, generated knowledge, and task PRD found only the PRD's forbidden-information wording; no actual secrets or private deployment details were introduced.

## Out Of Scope

- 不修改 ERP 仓库代码。
- 不开启生产自助注册。
- 不发布博客草稿。
- 不部署主站或 ERP。
