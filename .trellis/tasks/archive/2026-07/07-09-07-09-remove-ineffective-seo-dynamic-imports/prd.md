# Remove ineffective SEO dynamic imports

## Goal

消除生产构建中 `src/components/SeoManager.tsx` 触发的 `INEFFECTIVE_DYNAMIC_IMPORT` 警告，让 `npm.cmd run build` / `verify` 输出更干净，同时保持 SEO 元数据行为不变。

## Requirements

- 检查 `SeoManager` 当前动态导入 `src/data/blogCuration.ts` 和 `src/data/portfolio.ts` 的原因与调用路径。
- 如果这些模块已经被主 bundle 其他路径静态引用，则改为直接静态导入所需 public selectors / data，避免无效动态导入。
- 不改变页面标题、description、canonical、Open Graph、Twitter card、项目详情或博客详情 SEO 内容。
- 不新增第三方依赖，不做无关 chunk 拆分或路由重构。
- 不读取或写入任何私有环境变量、token、后台地址或模型配置。

## Acceptance Criteria

- [x] `npm.cmd run build` 通过，且不再出现 `INEFFECTIVE_DYNAMIC_IMPORT` 针对 `src/data/blogCuration.ts` 或 `src/data/portfolio.ts` 的警告。
- [x] `npm.cmd run lint` 通过。
- [x] 如涉及 SEO shell/metadata 源，确认默认站点 SEO 与 `SeoManager` 行为仍使用现有公开数据。
- [x] 父任务记录本次低敏构建清理进展。

## Notes

- This is a lightweight build-quality cleanup under `07-08-production-acceptance-manual-gates-closure`.
