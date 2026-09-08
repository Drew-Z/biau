# 公开路由恢复验收

2026-09-08，主会话在规范目录 `D:/workspace4Cursor/blog-semi` 完成实现和最终检查。实现基线为 `cdc97640fb908b7922fe038c8f612f3b091a624a`，所有操作保持本地范围。

## 行为与范围

- 博客/项目详情的助手建议仅对路径片段解码一次，原生解码失败回到既有三条默认建议。已挂载助手打开或关闭时，损坏地址都保留正常缺失页、导航、返回操作和历史导航。
- 帆灵 publication 的备用状态引用从 `/status/pet-workspace` 修正到已有 `/status/pet-gamer`。registry 使用真实 reliability 路径集合校验九份 publication；Canvas 的 `/status` 总览仍合法。
- 未改项目状态、公开事实、文章、生成知识、sitemap、状态 ID、CSS、App/路由组件、URL/阅读恢复、依赖或 lockfile。

## 实际检查

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 新助手检查的原代码负向基线 | exit 1，`URIError: URI malformed` | `route-recovery-assistant-negative.log` |
| 新 registry 检查的原数据负向基线 | exit 1，一项不存在的帆灵状态目标 | `route-recovery-registry-negative.log` |
| 新 UI 检查的原 build 负向基线 | exit 1，助手已挂载时根节点清空 | `route-recovery-ui-negative.log` |
| `assistant:kg-check` | exit 0，31 docs / 61 chunks / 166 entities / 231 relations，26 个路径用例 | `route-recovery-assistant.log` |
| `project-registry:check` | exit 0，12 identities / 9 publications | `route-recovery-registry.log` |
| `assistant:eval` | exit 0，17/17，modelCalls=0 | `route-recovery-eval.log` |
| `status:contract` | exit 0，8 projects / 7 external targets / 33 checks | `route-recovery-status.log` |
| 最终 lint | exit 0 | `route-recovery-lint-final-v2.log` |
| build（含 TypeScript） | exit 0，`index-C16oVPxo.js` | `route-recovery-build.log` |
| performance | exit 0，入口 CSS 152358 bytes，route CSS 141623 bytes，入口 JS 295681 bytes | `route-recovery-performance.log` |
| smoke | exit 0，21 组、0 失败，10816ms | `route-recovery-smoke.log` |
| 最终公开路由专项 | exit 0，48 个坏地址矩阵 + 4 个合法编码详情 + 18 个状态引用 | `route-recovery-ui-final-v2.log` |
| 最终完整 UI | exit 0，45 报告组、0 失败，1156319ms | `route-recovery-check-ui-final.log` |

本轮完整 UI 实际运行了新 public-route-recovery 组和原有全部组，没有复用上一轮 44 组作为本轮结果。专项的 70 个场景与完整 UI 的 45 个报告组为不同计数。业务源码在首次 build/smoke/performance 后未再改变，后续两处修改仅修正专项检查器的标题定位；因此这些构建检查对应同一业务版本。最终 lint 在检查器修正后补跑并取得 exit 0。

## 检查器问题与恢复记录

1. `route-recovery-ui.log` 在首个合法编码博客页失败：检查器用“Legal RAG/法律”猜测标题，真实文章标题为“合同审查 RAG 项目复盘：引用、诊断、评测与受控演示”。改为读取既有公开数据中的准确标题。
2. `route-recovery-ui-final.log` 在桌面合法编码博客页读到了目录建议。原因是同名目录卡片 h3 在导航提交前已经满足标题 locator。`route-recovery-heading-diagnostic.log` 实际证明 `/blog` 匹配 H3，等待详情 H1 后建议为“总结核心结论”，页面错误为零。最终检查器限定 `level: 1`，没有增加固定 sleep 或修改业务代码。
3. 中断后的旧 lint 工具会话失效，日志只有启动行，不能据此宣称通过；已用 `route-recovery-lint-final-v2.log` 的实际 exit 0 补足。
4. 审计阶段的早期直接坏地址诊断只记录 launcher 点击超时，没有记录 HTTP 状态或正文。不能据此确定是 preview 中间件拒绝请求。有效负向证据来自先挂载助手、再进行 SPA history 导航的独立场景。

## 证据一致性与限制

- `delivery-evidence.json` 保存 13 个源码/检查器/规范/保护文件 SHA-256，以及最终入口 JS 和 HTML 哈希。preview `http://127.0.0.1:5184` 实际返回的入口 JS 与当前 dist 字节一致；恢复后的自有 preview PID 为 2932。
- 保护快照 `public/status/blog-semi-synthetic.json` 仍为 `d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909`。
- 主会话查看移动 Morning 的博客缺失页和桌面 Stellar 的项目缺失页截图，导航、标题、正文及返回按钮保留。其余两张代表图同目录保留。
- 检查限 Chromium、本地 preview 和 API fixture，不构成跨浏览器或生产可用性验收。公开路由专项只允许 GET `/api/health`，未发送业务/模型请求。
- 日志与截图保留在 `C:/Users/zhang/AppData/Local/Temp/blog-semi-discovery-20260908-4f78e2a8f7f64b4799ddd9b9e3b8da57`，均为验收证据。未删除原有未跟踪资料或历史 worktree；本项没有需要清理的自有一次性 runner。
- 未推送、部署、签名、发布内容、开启 Feed/Cron、修改生产配置或消费 usage reset。提交后仅归档本子任务，再实际返回父任务评估。
