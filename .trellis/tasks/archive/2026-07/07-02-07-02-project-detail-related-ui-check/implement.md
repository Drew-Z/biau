# 项目详情相关推荐 UI 回归检查 - Implement

## Checklist

1. Read frontend quality and component specs.
2. Add a focused helper/test block to `scripts/check-ui.mjs`.
3. Verify the block checks `ozon-erp` and `xunqiu` without relying on fixed recommended project IDs.
4. Run lint, build, UI check, diff check, and sensitive scan.

## Validation Commands

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

Sensitive scan:

```powershell
git ls-files --modified --others --exclude-standard
# Run the repository standard sensitive-data scan on the listed files.
```

## Rollback

- Remove only the new project-detail related recommendation block from `scripts/check-ui.mjs`.
