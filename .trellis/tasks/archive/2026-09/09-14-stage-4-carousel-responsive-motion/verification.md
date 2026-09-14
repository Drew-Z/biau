# 首页轮播响应式运动验证

## 基线

- HEAD：`afc56c09ec3940d9fa725c530a4405687a0079d2`。
- 1599 tracked / 13 original untracked / 37 completed children，原字节记录在 `baseline.json`。
- 509 source / 4 spec / 172 build / 49 实际 HTTP 响应与前项最终验收一致，详见 `baseline-inputs.json` / `baseline-http.json`。
- 证据根：`C:/Users/zhang/AppData/Local/Temp/blog-semi-carousel-resize-ke1j094n`。

## 修复前观察

`probe-before` 为六个独立 Chromium context、三主题、两种初始模式，API/model/page/external-request 均 0。三组窄屏 → 桌面的自动与滚轮惯性位移均为 0；直接桌面对照有运动。三组桌面 → 窄屏仍写内联轨道位置，尽管 CSS 将 transform 设为 none。exit 0 只表示观察完成。

主会话已查看 Morning 窄屏转桌面、Stellar 桌面返回截图；结论来自运动/事件采样，单张截图不证明动画状态。

## 永久专项与诊断

| 检查 | 结果 | durationMs | 解释 |
| --- | --- | ---: | --- |
| probe-before | exit 0 | 37809 | 六组只读观察，记录产品问题与桌面对照 |
| motion-before | exit 1 | 4704 | 旧构建有效失败：320 → 1440 后无暂停条件，7 个帧样本位置均为 0 |
| motion-after | exit 1 | 7134 | 修复后的初始恢复、wheel 惯性和 768 静态已通过；769 准备时 `(1,1)` 仍在轮播面板内，hover=true，未满足自动播放前提 |
| motion-nav-pointer | exit 0 | 236737 | 改用真实导航 Logo 作为面板外指针位置，保留所有暂停断言，24/24 配置通过 |

`motion-before-checker.mjs`、`motion-after-checker.mjs` 和原始日志/截图完整保留；没有为取点问题修改产品。最终专项为 18 个 resize 配置与 6 个模式配置，共 78 个静态阶段；断言静态阶段的轨道 style 写入数不增加，动态阶段实际运动，真实 wheel 产生后续惯性，内容与现有 DOM 保持。主会话已查看最终三主题代表截图。

## 最终输入和门禁

`validation-inputs.json` 冻结 510 source / 4 spec / 172 build / 49 实际 HTTP 响应。`motion-final-proof.json` 证明构建后仅修改了 checker 的面板外指针准备和三份规范；所有编译源码、构建和 HTTP 字节一致，因此复用 build 并补跑最终 lint。

| 检查 | 当前结果 | durationMs |
| --- | --- | ---: |
| lint-final | exit 0 | 10167 |
| build（tsc + Vite） | exit 0 | 12238 |
| motion-nav-pointer | exit 0，24/24 | 236737 |
| wheel-final | exit 0，33/33 | 51607 |
| performance | exit 0 | 355 |
| smoke | exit 0，21/0 | 11223 |
| full-ui | exit 0，46/0 | 2712294 |

smoke 组累计为 10525ms。轮播两项专项的 API/model/page/external-request 均为 0；full-ui 工具会话 `68664` 已实际完成并收取终局，组累计 2708595ms，包含运动 24、wheel 33、阅读链接 75、助手图片 72 / Branch 32 / 历史 188 / 反馈 72。没有重复全量。

## 提交前恢复核对

原预览退出后，首次 pre-delivery 在 HTTP 核对阶段收到 WinError 10061；没有生成成功记录，也不是 UI 断言失败。恢复时确认旧 PID 16032 不存在、5198 无监听、旧工具会话不存在，再用相同 dist 启动自有预览，保留 preview-resume.log / preview-resume.json。

pre-delivery-resumed.json 已重新核对 510 source / 4 spec / 172 build / 49 实际 HTTP 响应，全部与最终验收输入一致；原 13 份未跟踪资料及旧 37 个完成子任务完整，索引为空，差异仅在本子任务白名单。没有重跑已通过且输入未变的完整 UI。

工作提交：`9487b92423796fc849840284d2f1631ca49d331b`，16 个精确文件，暂存/提交 blob 与工作树原字节核对通过；未 push、deploy 或签名。

归档提交：`9cdb089054d96e822e3db641e32b9e330aeff58f`，仅当前七文件移动/引用校正及父记账；已实际 start 父路线图，round 55 / activeChild=null，38 个子任务均 completed。随后三主题 × 中英文的文字分析只读取当前产品并进行可恢复的浏览器 CSS 隔离观察，主题源码与构建保持原值。

收尾前 before-preview-close.json 再次核对 510/4/172/49 与冻结一致，原 13 份资料和旧 37 个子任务保持。自有预览 PID 13232 按创建时间/命令/可执行文件/端口核对后关闭，5198 无监听且重绑验证通过；工具会话 79430 收取主动结束 exit 1，与产品检查结果分开。浏览器已关闭。没有删除任何文件：本轮截图、测量、失败诊断和提交核对记录均仍有交付/后续对照用途。
