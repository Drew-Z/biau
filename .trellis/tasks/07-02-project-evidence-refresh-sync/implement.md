# 项目案例证据刷新与主站同步 - Implement

## Checklist

1. 启动本 child task。
2. 加载 `trellis-before-dev`，读取 frontend data/state/type/quality 规范。
3. 更新 `src/data/portfolio.ts` 的 `blog-semi` 项目：
   - 添加 `image`。
   - 添加 `detailContent`。
   - 添加 `assistantContext`。
   - 视证据补充 stack/highlights，但不扩大到无证据声明。
4. 运行生成与验证：
   - `npm.cmd run assistant:index`
   - `npm.cmd run sitemap:generate`
   - `npm.cmd run blog:check`
   - `npm.cmd run lint`
   - `npm.cmd run build`
5. 提交并推送 `blog-semi/main`。
6. 记录未处理项目和下一轮推荐。

## Risk / Rollback

- 风险集中在 `src/data/portfolio.ts` 文案和生成文件。
- 回退方式是反向 patch 本轮数据改动；不使用破坏性 git 命令。
