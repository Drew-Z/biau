# Authored 内容与 SEO 双语范围审计

## Goal

在公共固定界面双语完成后，盘点 authored 内容与 SEO 投影的实际语言边界，为下一阶段是否翻译内容提供可追溯的产品决策依据。审计只读，不翻译、不改公开数据、不调用真实模型或生产服务。

## Requirements

- 盘点公开项目目录/详情、博客目录/详情、AI Daily feed/detail、公开助手回答与引用投影中的 authored/payload 字段、当前语言标记和 UI 投影边界。
- 盘点 `SeoManager`、路由标题/description、canonical、Open Graph、sitemap 或其他 SEO 产物的语言来源、URL 约束和潜在双语缺口。
- 区分固定界面 copy、authored 内容、批准 payload、引用/来源文本、模型元数据和生产状态；不得把它们混为可直接翻译的字符串。
- 输出字段级覆盖矩阵、风险/依赖、建议优先级和需要用户决定的问题；所有结论必须引用仓库文件与行号或可复现脚本结果。
- 不创建翻译数据、不变更路由或 SEO 输出、不触碰 AI Daily 生产版次、公开 Feed/Cron、heartbeat 或保护状态快照。

## Constraints

- Owned files: this task's `prd.md`, `design.md`, `implement.md`, `audit.md`, `verification.md`, and any temporary evidence under the task directory.
- Read-only source scope: `src/pages/`, `src/components/`, `src/data/`, `src/utils/seo.ts`, `src/components/SeoManager.tsx`, `public/`, existing `scripts/check-*` and package scripts.
- Forbidden: modifying `src/`, `public/`, package/dependency files, API contracts, assistant knowledge, approved AI Daily records, production configuration, `public/status/blog-semi-synthetic.json`, heartbeat, or external services.
- Preserve all existing untracked task material and historical worktrees.

## Acceptance Criteria

- [ ] Every public authored/payload family has a field-level language and ownership classification.
- [ ] SEO language sources, canonical/URL behavior, and missing or ambiguous locale signals are recorded with evidence.
- [ ] Fixed interface copy is excluded from content translation recommendations when already covered by existing language projections.
- [ ] The audit ends with one of: a bounded follow-up implementation scope, or an explicit user/production decision gate with exact required input.
- [ ] Existing deterministic contracts pass; no source, public data, production state, or protected snapshot changes occur.\n
