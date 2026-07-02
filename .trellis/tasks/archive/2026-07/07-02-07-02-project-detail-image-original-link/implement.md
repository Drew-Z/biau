# 项目详情主图原图查看入口 - Implement

## Checklist

1. Read frontend component, state, accessibility, and quality specs.
2. Update `ProjectDetailPage.tsx` so `project.image` is wrapped by an accessible original-image link.
3. Add minimal CSS for the original-image affordance without changing project facts or assets.
4. Extend `scripts/check-ui.mjs` to verify `/projects/xunqiu` detail hero link attributes.
5. Run lint, build, UI check, diff check, and sensitive scan.

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

- Restore the `detail-hero-image` wrapper from anchor back to `div`, remove the affordance CSS, and remove only the new UI check block.
