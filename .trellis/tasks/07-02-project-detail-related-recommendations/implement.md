# 项目详情相关推荐质量优化 - Implement

## Checklist

1. Read frontend specs.
2. Update `ProjectDetailPage.tsx` recommendation helper.
3. Add title selection for same-category vs cross-category recommendations.
4. Run recommendation sampling script to verify key projects.
5. Run lint/build and pre-commit checks.

## Validation Commands

```powershell
npx tsx <sampling-script>
npm.cmd run lint
npm.cmd run build
git diff --check
```

Sensitive scan on changed files:

```powershell
git ls-files --modified --others --exclude-standard
# Then run the repository standard sensitive-data scan on the listed files.
# Treat matches in rule text, example commands, or task slugs as false positives only after inspecting the matched line.
```

## Rollback

- Restore the previous `related` `useMemo` block if the recommendation logic becomes noisy.
