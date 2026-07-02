# 助手部署文档模型接入描述一致性修复

## Goal

修复公开助手 / 内部助手部署文档里关于模型接入状态的旧描述，避免部署者误以为当前助手仍只能使用静态公开站点知识。

本任务来源于上一轮只读巡检记录：`docs/deployment.md` 前文已经配置并说明 `ASSISTANT_MODEL_*` 服务端模型接入点，但后文仍保留“当前公开助手和内部助手都只使用生成的公开站点知识”的旧句子。

## Requirements

- 只更新文档描述，不改助手运行时代码。
- 保留当前安全边界：真实模型 Key、Base URL、模型名只放服务端私有环境变量；前端只配置 `VITE_CHAT_API_BASE_URL`。
- 新描述必须准确表达当前行为：
  - 助手先检索生成的公开站点知识。
  - 配置 `ASSISTANT_MODEL_*` 后，服务端可在公开知识约束内调用 OpenAI-compatible 模型生成回答。
  - 未配置模型、模型不可用或低置信度时，应回退到公开知识摘要并说明限制。
- 不写入真实账号、密钥、生产地址、数据库连接串或私有后台细节。

## Acceptance Criteria

- [x] `docs/deployment.md` 不再出现“公开助手和内部助手都只使用生成的公开站点知识”这类与模型接入点冲突的绝对描述。
- [x] `docs/deployment.md` 中 `ASSISTANT_MODEL_*` 与 fallback 行为前后一致。
- [x] 通过 `git diff --check`。
- [x] 通过文档变更范围的敏感信息扫描。

## Notes

- 这是文档-only 轻量任务，PRD-only 即可。
