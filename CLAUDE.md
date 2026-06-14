# Claude Code Guide

请始终使用简体中文与用户沟通。代码、命令、路径、报错信息可以保留英文；解释、说明、总结必须使用中文。

## 项目定位

这是一个基于 React、Vite、TypeScript 和 Semi Design 的产品官网/展示系统，不要写成个人作品集口吻。目标是把 AI 应用、全栈业务系统、移动端/互动体验和资源内容组织成一个可筛选、可搜索、可演示的解决方案网站。

## 工作边界

- 当前主项目目录是 `/home/zhang/workspace/blog-semi`。
- 资料源目录是 `/home/zhang/workspace/reference-projects`，只用于阅读和整理信息。
- 不要直接修改 `../reference-projects`。
- 不要收录或扩展 `douyu`、`yihuan-helper`、`ques`。
- 项目详情和案例详情需要根据真实目录、README、源码结构整理，但要脱敏。
- 不要写入真实 IP、账号、密钥、数据库连接串、云端 API 地址、签名文件路径等敏感信息。

## 开发习惯

- 修改前先查看 `git status --short --branch`。
- 优先小步修改，完成后运行可行的验证命令。
- 常规验证顺序：`npm run lint`，再 `npm run build`。
- UI 组件优先使用 Semi Design：`@douyinfe/semi-ui-19` 和 `@douyinfe/semi-icons`。
- 数据优先集中在 `src/data/portfolio.ts`，复杂结构再拆分。
- 不要使用破坏性 Git 命令，例如 `git reset --hard`、`git clean -fd`、`git checkout -- <file>`，除非用户明确要求。
- 不要自动执行 `git push`，除非用户明确要求。

## UI 方向

- 整体风格应接近生产级官网和产品展示站，避免“作品集”措辞。
- 页面应有清晰的信息架构：首页、项目、案例、博客之间要有明显区分。
- 项目页偏技术视角：技术栈、架构、模块、实现方式、工程亮点。
- 案例页偏业务视角：问题、方案、过程、结果、证据。
- 保持浅色/暗色、中英文开关的状态一致性；当前以简体中文内容为主。
- 优先用真实项目截图和运行截图，缺图时用稳定占位，不要伪造业务数据。

## 可用插件与 MCP

- `frontend-design`：用于官网 UI、信息架构和视觉层级优化。
- `code-review`：用于修改后做风险和回归审查。
- `commit-commands`：用于整理提交信息。
- `claude-code-setup`：用于维护 Claude Code 项目配置。
- `context7`：查询框架、库、CLI 和云服务的当前文档。
- `playwright`：用于本地页面截图、交互和响应式验证。

## 常用命令

- `/project-inventory`：从资料源盘点展示项目。
- `/verify-build`：安装依赖并执行 lint/build 验证。
- `/deploy-check`：部署前检查 Cloudflare Pages 所需条件。
- `/ui-review`：审查页面布局、响应式、主题和可点击路径。
