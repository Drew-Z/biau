# Pet App 展示页继续优化 - Implement

## Checklist

1. 启动本 child task。
2. 在 `D:\workspace4Cursor\pet\gamer` 确认 dirty files，并只碰 `pet-app-showcase-site/`。
3. 更新静态展示页：
   - 增加发布前检查清单。
   - 增加主站项目详情链接和截图区入口。
   - 优化下载 gate 文案和视觉层次。
4. 更新 `pet-app-showcase-site/README.md`：
   - 说明本地打开方式。
   - 说明公开 APK 接入前置条件。
   - 说明不要替换为 placeholder download。
5. 验证：
   - 检查 HTML 引用的 CSS 和图片存在。
   - `git diff --check`。
   - 敏感信息扫描。
6. 在 `pet/gamer` 独立提交并推送当前分支。
7. 回到 `blog-semi` 记录验证结果并归档 child task。

## Rollback

- 回退仅限 `pet-app-showcase-site/` 的静态文件改动。
- 不使用破坏性 git 命令，不回滚 unrelated dirty files。
