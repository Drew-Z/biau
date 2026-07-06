# Playlab Game entry and trial checks

## Goal

完善 Playlab/Game 公开入口、Web 试玩资源检查、移动端提示和截图证据，让游戏项目展示更可信、更易试用。

## Requirements

- 进入 `D:\workspace4Cursor\game` 前先读取本地规则和脚本。
- 检查公开游戏站入口、试玩 HTML、WASM/PCK/资源、移动端提示、截图和版本说明。
- 不把未验证的新试玩构建包装成已上线。
- 如需发布新构建或域名配置，记录 manual gate。

## Confirmed Facts

- `D:\workspace4Cursor\game` 没有顶层 git 仓库或根级规则文件，是多个游戏原型目录的工作区。
- `npm.cmd run playlab:synthetic` 已确认公开 Playlab 页面、6/6 个 playable 页面、36/36 个发现资源和 5/5 个移动/控制提示项通过。
- Playlab synthetic 现在对网络失败使用低敏分类，不把原始 URL、路径、堆栈或 token 写入 public status。

## Acceptance Criteria

- [x] 至少一个 Playlab/Game 入口或试玩检查有可审计改进。
- [x] 运行 `playlab:synthetic` 或项目内等价静态检查。
- [x] 必要时同步主站项目页/状态页/助手知识。
- [x] 不公开未批准构建或私有发布配置。
