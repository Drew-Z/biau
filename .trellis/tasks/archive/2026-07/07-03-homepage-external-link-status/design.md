# 主页外链可用性检测与状态展示页 - Design

## Architecture

新增一个静态生成的状态数据流：

1. `src/data/statusTargets.ts`
   - 定义公开可检测的入口清单。
   - 首批以主页 IN PORT 外部按钮为主：Legal RAG、ERP、Playlab、寻球。
   - 每个入口包含 `id`、`projectId`、`label`、`url`、`kind`、`description`、`expectedStatus`、`note`。

2. `scripts/generate-site-status.mjs`
   - 读取同一份目标清单或镜像数据，逐个请求目标 URL。
   - 生成 `public/status/site-status.json`。
   - 不扫描页面所有 `href/src`，避免字体、脚本、图片等资源根路径误报。
   - 默认失败不阻塞构建；通过 JSON 的 `ok`、`status`、`issues` 暴露状态。

3. `src/pages/SiteStatusPage.tsx`
   - 读取 `/status/site-status.json`。
   - 无 JSON 或请求失败时显示“未检测 / 需要重新生成状态数据”，仍展示目标清单。
   - 按可用、异常、未检测汇总，展示最后检测时间、耗时、HTTP 状态和说明。
   - 外链使用 `target="_blank"`、`rel="noopener noreferrer"`。

4. 路由与索引
   - `src/App.tsx` 增加 `/status`。
   - `src/utils/seo.ts` 增加状态页 SEO。
   - `scripts/generate-sitemap.mjs` 增加 `/status`。
   - `src/components/Navigation.tsx` 可增加状态入口，中文“状态”、英文“STATUS”。

## Data Contract

`public/status/site-status.json`:

```json
{
  "checkedAt": "2026-07-03T00:00:00.000Z",
  "base": "https://biau.playlab.eu.cc",
  "ok": true,
  "summary": {
    "total": 4,
    "online": 4,
    "degraded": 0,
    "offline": 0,
    "unchecked": 0
  },
  "targets": [
    {
      "id": "legal-rag-workbench",
      "projectId": "legal-rag",
      "label": "Legal RAG 在线工作台",
      "url": "https://legal-rag-web.onrender.com",
      "kind": "demo",
      "status": "online",
      "httpStatus": 200,
      "durationMs": 1200,
      "checkedAt": "2026-07-03T00:00:00.000Z",
      "issues": [],
      "note": "可能冷启动；登录门禁不代表入口不可用。"
    }
  ]
}
```

前端只依赖 `id`、`url`、`status`、`httpStatus`、`durationMs`、`issues` 和说明字段。新增字段必须保持向后兼容。

## Status Semantics

- `online`: HTTP 2xx 或 3xx，入口可达。
- `degraded`: 请求成功但状态码是 401/403/404/405/429 或检测到需要登录、限流、冷启动等限制；可作为演示入口存在，但要显示限制。
- `offline`: 请求失败、超时或 5xx。
- `unchecked`: 状态 JSON 不存在、目标缺失或单项未生成。

## Safety

- 只检测公开 URL。
- 不记录 cookies、响应正文、账号、密码、token、后台地址、私有 IP 或部署平台细节。
- 检测结果只展示 HTTP 状态、耗时和公开说明。
- 当前用户提供的模型 key 不进入本任务。

## Trade-Offs

- 选择静态 JSON 而不是浏览器实时检测：避免 CORS、混合内容和用户端网络差异造成误判。
- 首轮只覆盖显式项目入口：减少噪声，后续可扩展为全站资源/可观测性页。
- 检测结果不是 SLA：页面文案必须说明这是最近一次公开入口检查，不能承诺长期在线。
