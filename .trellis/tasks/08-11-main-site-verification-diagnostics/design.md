# Main site verification diagnostics design

## Architecture

本任务保持现有检查命令和页面 fixture，新增四个小型共享边界：

1. `scripts/lib/verification-progress.mjs`
   - 统一 smoke/full 的 `[START]`、`[PASS]`、`[FAIL]` 日志。
   - 维护当前 group/context，供未捕获异常输出定位信息。
2. `scripts/lib/network-diagnostics.mjs`
   - 纯函数分类 Node/browser 网络错误与 HTTP 状态。
   - 不返回 URL、原始 message、cause 或证书内容。
3. `scripts/lib/status-output.mjs`
   - 解析 `--write-status`，校验输出路径，提供原子 JSON 写入。
   - 参数缺席时返回 disabled；默认检查不落盘。
4. `scripts/lib/ui-network-guard.mjs`
   - 统一 smoke/full 的同源、loopback、`data:` 与 `blob:` 网络边界。
   - 使用 `route.fallback()` 保留后注册页面 fixture 的优先权。

`scripts/check-verification-diagnostics.mjs` 直接导入这些纯函数运行 fixture，不发网络请求。

## Progress contract

日志格式稳定为：

```text
[check:ui] START route-matrix desktop /projects
[check:ui] PASS  route-matrix desktop /projects 184ms
[check:ui] FAIL  public-assistant mobile /blog 3210ms
```

- smoke 以 `route-smoke` 为组，逐 route/viewport 报告。
- full 至少划分 route matrix、catalog/reading、flow/intro、public assistant、Studio/mobile、AI Daily/SEO 六个命名组。
- 进度工具只负责计时与上下文，不吞掉异常、不改变断言结果。
- full 的现有失败数组仍是完整诊断源；未捕获异常额外打印当前 group/context 后失败退出。

## UI network boundary

每个 Playwright page 创建后立即安装本地网络 guard：

- 允许 `UI_CHECK_BASE` 同源请求、loopback、`data:`、`blob:`。
- 允许显式 `page.route` fixture 继续处理同源 API。
- 其他 `http:`/`https:` 请求中止并记录固定 `external_request_blocked` 失败。
- guard 使用 `route.fallback()` 放行，不能用 `route.continue()` 截断后续 fixture handler。

这条边界验证“没有真实外部调用”，但不把页面中的普通外链 href 当成请求；只有真正发出的网络请求才受限。

## Network diagnostics contract

```js
classifyNetworkFailure(error) ->
  'timeout' | 'dns_error' | 'tls_error' |
  'connection_error' | 'network_error'

classifyHttpResult(status) ->
  { ok: boolean, issueKind: '' | 'http_status' }
```

解析顺序：

1. `AbortError`、`TimeoutError`、`ETIMEDOUT`、`UND_ERR_CONNECT_TIMEOUT` -> `timeout`
2. `ENOTFOUND`、`EAI_AGAIN` -> `dns_error`
3. Node/OpenSSL 证书错误码 -> `tls_error`
4. `ECONNREFUSED`、`ECONNRESET`、`EPIPE`、`UND_ERR_SOCKET` -> `connection_error`
5. 其他无 HTTP response 错误 -> `network_error`
6. 任意非 200-399 HTTP response -> `http_status`

错误码从 error、cause、cause.cause 的有限深度读取；不使用任意字符串包含匹配作为主分类依据。CLI 可显示本地诊断摘要，但公开 snapshot 只能消费 `issueKind`。

## Status publication contract

所有状态写入脚本接受：

```text
--write-status
--write-status=<repo-relative path>
--write-status <repo-relative path>
```

- 无 flag：只运行检查并输出终端摘要/JSON，文件系统不变。
- 裸 flag：使用该脚本的既定 `public/status/<name>.json`。
- 带路径：解析后必须位于 `public/status/` 或可靠性套件创建的受控临时目录；越界立即失败且不写文件。
- 写入使用临时文件 + rename，避免中断留下半截 JSON。

`reliability:check` 默认创建 OS 临时目录，把受控路径传给每个子命令并读取结果；结束时清理。显式 `--write-status` 才把经过 `status:contract` 约束的结果发布到 `public/status`。子进程参数由 suite 构造，用户路径不直接拼接为 shell 字符串。

## Public payload safety

public-links snapshot 从标准化结果投影：

```ts
{
  failedCount: number
  issueKind?: FixedIssueKind
  issues: string[] // fixed templates only
}
```

禁止字段与内容：URL、endpoint、base URL、headers、token、原始 error、cause、证书链、response body、本地路径。HTTP 403 公开呈现为 `http_status`，不记录目标 URL。

## Compatibility and rollback

- 保持 npm command 名称与默认退出码语义；变化仅是默认不再写公开快照。
- 需要发布快照的 CI/人工流程改为显式 `--write-status` 或新增 `*:publish` npm alias。
- 若 full 分组改造出现回归，可逐组移除进度包装；原断言和 fixture 不移动、不删除。
- 若临时汇总失败，suite 失败退出且不发布部分公开快照。

## Validation matrix

| Case | Expected |
|---|---|
| DNS error with nested `cause.code` | `dns_error` |
| Self-signed/expired certificate | `tls_error` |
| Abort/connect timeout | `timeout` |
| Refused/reset/socket | `connection_error` |
| Unknown fetch failure | `network_error` |
| HTTP 403/404/500 | fail + `http_status` |
| Default synthetic command | no `public/status` mutation |
| Explicit valid status path | atomic JSON write |
| Path outside allowed root | reject before write |
| UI external request | abort + contextual failure |
| UI same-origin fixture | fixture handles request normally |
