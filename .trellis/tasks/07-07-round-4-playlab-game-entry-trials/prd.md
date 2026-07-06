# Playlab Game entry and trial checks

## Goal

完善 Playlab/Game 公开入口、Web 试玩资源检查、移动端提示和截图证据，让游戏项目展示更可信、更易试用。

## Requirements

- 进入 `D:\workspace4Cursor\game` 前先读取本地规则和脚本。
- 检查公开游戏站入口、试玩 HTML、WASM/PCK/资源、移动端提示、截图和版本说明。
- 不把未验证的新试玩构建包装成已上线。
- 如需发布新构建或域名配置，记录 manual gate。

## Acceptance Criteria

- [ ] 至少一个 Playlab/Game 入口或试玩检查有可审计改进。
- [ ] 运行 `playlab:synthetic` 或项目内等价静态检查。
- [ ] 必要时同步主站项目页/状态页/助手知识。
- [ ] 不公开未批准构建或私有发布配置。
