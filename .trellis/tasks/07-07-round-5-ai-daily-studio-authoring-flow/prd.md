# Round 5 AI Daily Studio authoring flow

## Goal

继续完善 AI Daily 与 Studio 的写作、审核和隐藏草稿流。当前子任务只做不依赖真实模型调用、不依赖生产 token、不需要云平台操作的本地可验证改进。

## Requirements

- R1. 检查 AI Daily issue 详情页、Studio 草稿编辑/预览、AI Daily draft generation、export/readiness/smoke 脚本和相关文档。
- R2. 不触发真实模型调用；不运行中转站测活。
- R3. AI Daily 或 Studio 产物默认保持 hidden / review-needed，不能自动发布到公开博客、助手知识或 sitemap。
- R4. 改进要提升正式软件工程流程：更清楚的草稿结构、更稳的本地验证、更明确的人工审核 gate 或更一致的前端/脚本契约。
- R5. 不写入真实 token、数据库 URL、模型渠道、私有内容源、未审核日报正文或生产后台信息。

## Acceptance Criteria

- [x] 找到 AI Daily / Studio 相关文件和脚本。
- [x] 实现一个本地可验证的 authoring flow 改进。
- [x] 不触发真实模型调用。
- [x] 运行相关 smoke/check/lint/build。
- [x] 记录人工门禁或生产验证事项。
