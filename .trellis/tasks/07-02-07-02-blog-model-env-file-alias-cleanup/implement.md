# 博客模型工具 env-file 别名清理 - Implement

## Checklist

1. Read blog-content-pipeline usage and frontend/quality specs as needed.
2. Update `scripts/configure-blog-model.mjs` argument parsing to reject `--env-file` and `--env-file=...` with a clear message.
3. Keep `--local-env` and `--local-env=...` behavior unchanged.
4. Run offline CLI checks only; do not run `doctor --live` or any model request.
5. Run lint, build, diff check, and sensitive scan.

## Validation Commands

```powershell
npm.cmd run blog:model -- status --profile strong --local-env .trellis/workspace/zhang/nonexistent-blog-model.env --format markdown
npm.cmd run blog:model -- doctor --profile strong --local-env .trellis/workspace/zhang/nonexistent-blog-model.env --format markdown
npm.cmd run blog:model -- status --profile strong --env-file .trellis/workspace/zhang/nonexistent-blog-model.env --format markdown
npm.cmd run blog:model -- status --profile strong --env-file=.trellis/workspace/zhang/nonexistent-blog-model.env --format markdown
npm.cmd run lint
npm.cmd run build
git diff --check
```

Sensitive scan:

```powershell
git ls-files --modified --others --exclude-standard
# Run the repository standard sensitive-data scan on the listed files.
```

## Rollback

- Restore `--env-file` handling in `parseArgs` if compatibility is required again.
