# 提交范围

完成全部验收后，按 `.trellis/workflow.md` Phase 3.4 对这一组文件作一次提交确认。现有用户规则允许 main 成功提交后显式推送；不把其他任务的文件并入。

用户已确认本计划并授权提交、推送 main。

执行提交：`feat(assistant): separate Qinglong presence from chat [skip render]`

本地验收已完成：lint、TypeScript + Vite、55 项桌宠 UI、21 组 smoke、合同与体积预算通过；最终完整 UI 46 组通过、0 组失败。所有模型请求均为本地 fixture。

## 本任务文件

- `src/App.tsx`
- `src/components/Navigation.tsx`
- `src/components/PublicAssistantCompanion.tsx`（新增）
- `src/components/PublicAssistantPetBubble.tsx`（新增）
- `src/components/PublicAssistantLauncher.tsx`（删除，由稳定宿主替代）
- `src/components/PublicAssistantPet.tsx`
- `src/components/PublicAssistantWidget.tsx`
- `src/hooks/usePublicAssistantPresence.ts`（新增）
- `src/hooks/usePublicAssistantCollision.ts`
- `src/utils/publicAssistantPresence.ts`（新增）
- `src/data/publicAssistantPetCopy.ts`
- `src/styles/public-assistant-pet.css`
- `src/styles/flow-pages.css`
- `src/styles/route-pages.css`
- `scripts/check-public-assistant-pet-ui.mjs`
- `scripts/check-public-assistant-availability-ui.mjs`
- `scripts/check-public-assistant-reading-warmup-ui.mjs`
- `scripts/check-site-language-ui.mjs`
- `scripts/check-ui.mjs`
- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/tasks/11-10-public-assistant-pet-presence/` 内的 PRD、design、implement、research、task、上下文 JSONL、本验收记录和提交计划。

## 已有改动，排除在外

- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/workspace/zhang/index.md`
- `docs/deployment.md`
- `docs/manual-gates.md`
- ` .trellis/`（目录名有前导空格）
- `.trellis/tasks/09-04-continuous-ui-quality-loop/` 内已有未跟踪文档
- `.trellis/tasks/11-04-qinglong-eight-state/`
- `.trellis/tasks/11-10-public-assistant-always-on/`
- `undefined/`
- `public/biau-port-icon.svg`
- `vendor/lingban-pet-runtime-0.1.0.tgz`

本地凭据、恢复清单、临时构建、截图与日志均不提交。
