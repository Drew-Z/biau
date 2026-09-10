# 第 28 轮：完整 UI 与公开助手交互复核

## 范围与恢复点

- 2026-09-10，按用户“继续”恢复已有父任务；没有活动子任务，不重复创建审计或修复任务。
- 基线提交：`f529afcb`，`main`；与 `8188e3d6` 相比，业务源码、公开数据、检查器和构建配置没有差异。
- 旧检查 `93168` 与临时服务 `6746` 已无法恢复，操作系统也没有对应运行进程；旧检查没有可用终局证据，不能记为通过。
- 复用原有本地构建预览 `http://127.0.0.1:5190`，不另启服务。PowerShell 命令：`$env:UI_CHECK_BASE = 'http://127.0.0.1:5190'; npm.cmd run check:ui`。
- 完整 UI 进程会话 `74219` 已于 `2026-09-10T01:40:57.955Z` 确认 exit 0；日志和结果文件均已取得终局。
- 本轮证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-roadmap-round28-20260910T011736710Z`。`baseline.json` 保存 527 个受检源文件、公开文件和构建文件的 SHA-256；`check-ui.log` 与 `check-ui-result.json` 保存完整日志和退出码。

## 已取得的检查结果

| 检查 | 本轮结果 |
| --- | --- |
| `assistant:public-api-check` | exit 0，替换 fetch 的本地传输与数据合同通过 |
| `assistant:public-conversation-check` | exit 0，会话与修订分支合同通过 |
| `assistant:public-browser-state-check` | exit 0，浏览器状态与冷启动恢复合同通过 |
| `project-registry:check` | exit 0，12 identities、9 publications、39 link sets 通过 |
| `project-details:check` | exit 0，15 个项目详情证据合同通过 |
| `public-links:projection-check` | exit 0，44 个实际公开链接目标通过 |
| `check:ui` | exit 0，46 组 / 0 失败，17 条路由主矩阵及专项通过，1396064ms |

## 交付前核对

- [x] 确认完整 UI 最终组数、失败数与 exit code，并查看代表截图。
- [x] 对照 `baseline.json` 核对 527 个受检源码、公开文件和构建未漂移，见 `baseline-verification.json`。
- [x] 记录实际发现与父任务下一动作：创建 `09-10-stage-5-assistant-composer-fit`，仅处理下述稳定 UI 缺口。
- [ ] 核对本轮文件白名单和原有未跟踪资料，完成本地提交。

保护状态快照 SHA-256：`D744AD0698C429FC3ECD33AF3CAE16911E00234C6E4D28AD30E5805BB9414909`。
翻译范围、生产模型、数据库、发布、Feed/Cron、远端 CI 和既有用户资料沿用原授权边界。

## 新发现与独立修复

代表截图包含博客目录、首页项目面板、详情目录及桌面/移动助手。助手空输入提示出现末行裁切；等待全屏布局、字体和两帧绘制后复核 10 组：320px 英文在三个主题均为 `clientHeight=57`、`scrollHeight=76`，其余七组通过。稳定证据见 `composer-settled-baseline.json` 与六张对应截图，页面错误和外部请求均为 0。原有语言断言只比较 placeholder 字符串，未覆盖输入框内部的可见空间。

早期 `composer-baseline.json` 在移动全屏 effect 就绪前测得 95px，不能作为最终布局证据；独立修复以稳定的 76/57 测量为准。下一项只修正窄屏高度并补回归，原有完整 UI 通过结论不覆盖此新增断言。
