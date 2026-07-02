# 站点访问与运行监察 MVP - Design

## Architecture

本任务拆成三块，彼此低耦合：

1. `scripts/check-site-monitor.mjs`
   - Node 脚本，默认检查线上 `https://biau.playlab.eu.cc`。
   - 不需要构建产物、不读取私有 env 文件、不调用任何需要认证的 API。
   - 用 `fetch` 检查核心页面、`sitemap.xml`、`robots.txt`；可选从页面 HTML 中提取链接并检查同源/外部链接。

2. `src/utils/analytics.ts`
   - 前端 no-op analytics adapter。
   - 默认 `VITE_ANALYTICS_PROVIDER` 未设置时不发送任何数据。
   - 只在运行时尝试调用已由站点管理员自行注入的 `window.umami.track` 或 `window.plausible`。

3. `docs/site-monitoring.md`
   - 解释“访问人数”和“站点监察”的数据来源与操作方式。
   - 把人工配置项和代码可自动检查项分开，避免误以为仓库能直接读 Cloudflare/Umami 后台数据。

## Data Flow

### Site monitor

```text
CLI args / env -> target config -> fetch routes -> parse HTML metadata/link hrefs -> check sitemap/robots -> print report -> exit code
```

- `--base` / `SITE_MONITOR_BASE`: 目标站点根 URL。
- `--check-links`: 检查核心页面中发现的同源链接。
- `--check-external`: 显式检查外部链接；默认关闭。
- `--json`: 输出 JSON，便于后续 CI 解析。
- `--timeout`: 单请求超时。

### Analytics adapter

```text
UI interaction -> trackAnalyticsEvent(name, payload) -> provider switch -> window.umami/window.plausible/no-op
```

- 不创建用户 ID。
- 不发送用户输入正文。
- 事件 payload 只包含项目 id、来源、链接类型、问题长度等低敏信息。

## Compatibility

- Node 运行环境使用仓库现有 Node 22 方向和内置 `fetch`，不新增依赖。
- 前端 adapter 使用 `import.meta.env`，兼容 Vite。
- provider 未配置或脚本未注入时必须静默 no-op，不能影响页面交互。

## Privacy And Security

- 仓库只记录 provider 类型和变量名，不记录真实 token、站点 id 或私有 endpoint。
- `site:monitor` 默认只访问自有站点；外部链接必须显式开启。
- 公开助手事件只记录 `questionLength`，不记录问题正文。
- 真实统计平台配置属于人工 gate。

## Trade-offs

- Cloudflare Web Analytics 最适合先看 PV/UV/来源，但仓库脚本无法无凭据读取后台数据；因此本任务只写操作指引，不自动拉取访问报表。
- `site:monitor` 不是 uptime 服务，不能替代 Cloudflare/Better Stack/cron 定时器；但它能先把“该查什么”固化为可运行命令。
- 前端埋点默认 no-op，会先产生代码路径但不产生数据；这比先硬接某个 analytics vendor 更稳。
