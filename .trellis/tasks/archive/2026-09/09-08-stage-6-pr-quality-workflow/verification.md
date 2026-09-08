# PR 质量工作流验收

2026-09-08，主会话在规范目录本地验证。只新增 `.github/workflows/site-quality.yml`、更新质量规范和任务记录，没有执行推送、部署、签名或生产操作。

## 配置与静态检查

- 用 npm exec 的 `js-yaml@4.1.1` 标准解析器读取实际 YAML；仅使用 npm 临时工具缓存，未修改项目依赖。核对普通事件、main 分支、权限、并发、Node/Actions 版本、超时、命令顺序及两个精确日志路径。
- 实际 Bash `-n` 通过，使用绝对路径 `C:/Program Files/Git/bin/bash.exe`；随后执行 YAML 中同一段未修改的步骤，复用现有 smoke。
- lint、TypeScript/build、博客发现 8 组/25 fixtures、项目发现 6 组、analytics 17 cases、registry 12 identities/9 publication records、performance 均实际 exit 0。工具 session 为 95965，未单独保存原始静态输出日志。
- `task.py validate`、`trellis:archive-check` 通过。业务 src/public/server/scripts、package.json/lockfile 和既有两个 workflow 的 Git diff 为空。

## Preview 生命周期

| 场景 | 实际结果 | 服务处理 |
| --- | --- | --- |
| 原始步骤，5186 | smoke 21 组、0 失败、10116ms，exit 0 | 自有 preview 清理，端口无监听 |
| 测试进程内的 npm 函数返回 17，5187 | exit 17，未被 tee 吞掉 | 自有 preview 清理，端口无监听 |
| 使用已在监听的 5185 | EADDRINUSE、exit 1，未启动新 preview | 既有 preview 及返回 HTML 保留 |
| 测试进程内向 Bash 发送 TERM，5188 | exit 143 | 自有 preview 清理，端口无监听 |

注入仅在单次测试 Bash 中定义 npm 函数，workflow 与既有检查器保持原字节。两份生命周期验证记录中的 workflow SHA-256 均为 `8b2cde17faf0e78435fd2d5593129b1f254f3ec1f66ccf6f70d5c20ed5eb1438`。端口冲突记录中 previewCleaned=false 表示有意保留原有服务，不是遗留本次进程。

## 完整 UI 证据复用

重新 build 后，12 个原验证文件、入口 JS 及 HTML 哈希均与第 9 轮最终证据一致，5185 返回相同 HTML。因此明确复用第 9 轮完整 UI 45 组、0 失败、1124527ms；没有在仅修改 workflow/规范后再次重复全量。首次状态页 wheel 未复现的限制也随源证据保留。

## 验证边界

实际环境为 Windows、Git Bash、Node 24.14.0；工作流目标为 Ubuntu/Node 22。远端 CI 未执行，本地也未重复 npm ci 或安装 Linux 系统依赖。依赖安装写法依据已抓取的官方文档与仓库约定，不将它们说成本机实际执行结果。

日志、结构化验证和官方文档位于 `C:/Users/zhang/AppData/Local/Temp/blog-semi-resume-20260908-62seN4`，哈希见 `delivery-evidence.json`。本轮一次性 `verify-site-quality.ps1` 已清理；日志和截图证据保留。中断恢复后重新校验 14 个源码/规范文件、12 份证据文件和构建哈希，全部一致，没有遗留检查进程。

本地交付提交 `037eee5d88f91a1f5ba564ee73864df3472a537a`，共 13 个白名单文件。已仅归档本子任务，并实际执行 `task.py start 09-06-website-completion-roadmap` 返回父任务；远端未推送。
