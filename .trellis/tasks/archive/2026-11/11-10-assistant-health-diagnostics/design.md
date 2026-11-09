# 助手健康诊断设计

## 边界与数据流

GET 健康响应 → 有界读取和固定类别 → synthetic checks[].healthAttempts → Reliability steps[main-site].healthAttempts → 本次 CI JSON artifact。

只改巡检脚本与文档。生产代理已有 upstream-not-configured / invalid-response / response-too-large / timeout / unreachable 五个固定码，无需修改 Function、Render 或模型配置。响应中的固定码描述代理报告的错误，不证明故障发生在哪一层。

## 合同

- 新 helper `scripts/lib/assistant-health-diagnostics.mjs` 统一持有诊断分类、安全投影和健康读取；网络分类复用 `network-diagnostics.mjs`。
- 每次 synthetic 尝试保留 attempt/httpStatus/durationMs/issues，并新增 failureKind、responseType、proxyError。failureKind 仅固定枚举；responseType 为 json/html/other/none；proxyError 仅白名单或 null。
- 健康正文上限 16 KiB，header/body 共用原 timeout；超限取消正文，正文超时与网络中断保留已收到的 HTTP 状态。显式聊天路径不受大小限制变更影响。
- suite 仅从当前 main-site 的指定 assistant check 投影最多五次记录。只复制校验后的数值、枚举；不复制原始 issues/正文/任意附加字段。旧字段缺失时诊断为 null，不补造成功或覆盖率。
- 缺少报告、跳过和历史 evidence 不导出当前 healthAttempts。新增字段不改变 suite 的失败优先、覆盖率或 strict 退出码。

## 验证与回退

先用现有 fixture 复现固定码与 attempts 丢失，再补回路 HTTP 和真实 suite 子进程测试。验证敏感原文不进入输出、五次上限、恢复证据、正文超时/上限和公开快照无变化。

回退使用任务恢复清单记录的基线提交，仅回退此任务文件。无需迁移数据、改 Secrets 或发布 public/status。
