# Round 5 internal assistant agentic workspace polish

## Goal

把内部助手 MVP 继续向最终形态 Agentic Workspace 推进。当前子任务只选择一个不依赖真实模型调用、不依赖生产 token、不需要云平台操作的本地可验证改进。

## Requirements

- R1. 先检查内部助手现有前后端边界、admin/member/session/knowledge/model-channel/tool diagnostics 相关代码和脚本。
- R2. 不运行模型测活、provider ping 或无业务意义 doctor。
- R3. 不读取或写入 `.env`、真实 member token、admin token、数据库 URL、模型渠道、RAG key、Qdrant/Aiven/Supabase endpoint。
- R4. 改进必须反哺最终形态：更清楚的 Agentic Workspace UX、更稳的 route boundary、更好的安全诊断、更可验证的工具/知识/会话/模型渠道契约，至少实现其中一项。
- R5. 所有前端诊断只展示低敏字段，不显示 baseUrl、apiKey、raw env、provider endpoint、raw tool payload、raw prompt 或私有文档内容。
- R6. 本地验证优先使用 mock、service mode smoke、lint/build/UI check。

## Acceptance Criteria

- [x] 找到现有内部助手关键文件和测试脚本。
- [x] 实现一个小而真实的 Agentic Workspace 改进。
- [x] 不触发真实模型调用。
- [x] 运行与改动相关的 smoke / lint / build / UI 检查。
- [x] 敏感信息扫描无命中。
- [x] 记录剩余人工门禁或生产验证事项。

## Result

- Tightened frontend Agent metadata normalization in `src/data/assistant.ts`:
  - known workflow-step allowlist;
  - known tool-id allowlist;
  - known tool error-class allowlist;
  - bounded label/summary/title/column/guardrail issue strings;
  - stricter same-site Studio draft artifact validation.
- Added `npm.cmd run assistant:meta-check` to exercise intentionally unsafe Agent metadata and verify that endpoint/key/prompt-like fields do not survive normalization.
- Added `assistant:meta-check` to `npm.cmd run verify`.
- Updated `.trellis/spec/frontend/state-management.md` so future Agent inspector or meta-normalizer changes know to run the new safety check.
- Full `npm.cmd run verify` passed after the change.
