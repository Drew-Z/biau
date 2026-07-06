# ERP registration and demo usability

## Goal

复查 ERP 的生产注册、登录和演示可用性，确保访客不会因为注册入口缺失而无法理解系统，同时保证默认角色、滥用防护和公开状态说明安全。

## Requirements

- 进入 `D:\workspace4Cursor\erp` 前先读取本地规则和脚本。
- 检查注册开关、bootstrap 响应、登录/注册 UI、默认角色和演示路径。
- 如需生产环境变量或重启，只记录 manual gate。
- 主站项目页/状态页要同步真实 ERP 状态。

## Acceptance Criteria

- [ ] 明确当前生产注册是否开放及证据。
- [ ] 如果可本地修复注册/登录 UI 或文案，完成并验证。
- [ ] 运行 ERP 项目内最小相关验证和主站 `erp:synthetic`。
- [ ] 不公开真实管理员账号或不可回收密码。
