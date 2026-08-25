# 双轴外观视觉审计

## 范围

- 本地生产构建：`http://127.0.0.1:4180`
- 视口：`1440x1000`、`390x900`、`430x900`
- 场景：`dusk`、`garden`、`stellar`
- 动态相位：约 `0.9s`、`2.4s`、`5.1s`
- 证据目录：`D:/Agent/codex/visualizations/2026/08/25/01a03793-4d62-7c11-bef8-a7cbd18a318e/final-reference-parity`

## 结论

- 三个场景在桌面和移动端均呈现独立材质：Dusk 为暖色暮光，Garden 为绿金流体，Stellar 为深蓝星场；不是同一配色的别名。
- Hero、项目面板、卡片、控制强调色和 footer 均随场景变化，Hero 到 footer 的全页背景连续，无额外全屏 Canvas 或无 owner 装饰。
- `390x900` 与 `430x900` 下导航、项目卡片、固定底栏和浮动助手均保持在视口内，无横向溢出或不可读文字。
- Stellar 三个相位的流体亮带位置明显不同，确认正常运动帧非重复静态截图；文件 SHA-256 也各不相同。
- 有意保留：Stellar 沿用参考站接近的深蓝流体、稠密星场与局部边界光；Dusk/Garden 不启用 Stellar 专属 perimeter effects。

## Stellar 相位哈希

- `desktop-stellar-900ms.png`: `50E71D2775B27DAFF2ED4631E6B1F98BA37CC49E45900ED1E4E7960DA96924D1`
- `desktop-stellar-2400ms.png`: `DF1A5B14833DBBED4ED9BFAF2A41432811DF61FAFAFA19AF54CEB3280C1F6601`
- `desktop-stellar-5100ms.png`: `D2E35B5C4C37882D772702FC692AF045439D6589B04E791C4728B6F5DB347D15`

## 验证

- `npm.cmd run lint`: 通过
- `npm.cmd run build`: 通过
- `npm.cmd run performance:check`: 通过
- `UI_CHECK_BASE=http://127.0.0.1:4180 npm.cmd run check:ui:smoke`: 18/18 通过
- `UI_CHECK_BASE=http://127.0.0.1:4180 npm.cmd run check:ui`: 40/40 通过
- `UI_CHECK_BASE=http://127.0.0.1:4180 npm.cmd run check:ui:production-appearance`: 14/14 通过
- `git diff --check`: 通过

线上生产检查需在本任务提交并推送、Pages 部署完成后再次执行。
