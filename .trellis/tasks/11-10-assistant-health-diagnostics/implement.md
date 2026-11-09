# 实施计划

- [x] 恢复授权、Git 基线、已有调查与任务恢复清单。
- [x] 阅读巡检实现及相关 backend/shared 规范，明确诊断修复范围。
- [x] 增加失败复现，记录旧版测试失败。
- [x] 实现健康有界读取、固定诊断与 suite 安全投影。
- [x] 补齐本地回路/子进程边界用例，更新监控文档及观测规范。
- [x] 运行 main-site:health-check、reliability:report-check、legal-rag:read-only-check、verification:diagnostics-check、status:contract、docs:observability-check、lint、build 和 git diff --check。
- [ ] 检查任务差异和敏感字段，精确提交并推送 main。
- [ ] 运行一次云端只读 Reliability，读取当前 artifact 并保留实际失败/恢复结果。
- [ ] 更新证据与恢复清单、清理本轮临时材料、归档任务并记录日志。

恢复点：基线 cd09dce93ca433cf6990bebb60fccac926daa2bd，恢复清单位于本机 CODEX_HOME/backups/tasks/20261109T171707422Z-assistant-health-diagnostics/manifest.json。已有其他任务的脏文件全部保留。
