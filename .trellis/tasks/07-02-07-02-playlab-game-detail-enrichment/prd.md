# Playlab 游戏项目详情补强

## Goal

把 BIAU Port 主站中的 Playlab/Godot 游戏项目从“卡片摘要 + 外链试玩”补强为访客可读的项目详情页。每个游戏详情应能说明玩法目标、实现边界、展示状态、质量证据和后续优化方向，而不是只把访客送到外部游戏站。

## Requirements

- 基于当前 `game/blog` 内容、主站现有 `portfolio.ts` 和公开站点数据整理事实；不能只依赖过时 README。
- 优先补齐以下主站项目：
  - `game-first-tetris`
  - `game-next-spacewar`
  - `intespace`
  - `raiden-prototype`
  - `space-war`
  - `spacewar-ii`
- 每个项目应补充或完善：
  - `detailContent.overview`：访客能快速理解项目是什么、当前展示状态是什么。
  - `detailContent.workflow`：核心玩法/体验链路。
  - `detailContent.architecture`：Godot/Web 导出/站点展示等实现方式，避免空泛技术栈。
  - `detailContent.quality`：可公开的验证证据，如内容审计、构建、试玩入口、截图素材或导出检查。
  - `detailContent.limitations`：当前边界，如移动端输入、平衡、音效、内容深度、试玩反馈等。
  - `detailContent.roadmap`：后续优化方向，方便未来版本迭代。
- 必要时同步 `assistantContext`，让公开助手回答游戏项目时能引用更准确的主站事实。
- 不改外部游戏仓库源码、不部署、不更换公开链接、不生成假截图或假指标。
- 不写入真实账号、密钥、私有后台、部署控制台、未确认下载地址或敏感指标。

## Acceptance Criteria

- [x] 六个 Playlab/Godot 游戏项目都有访客可读的 `detailContent`。
- [x] 公开助手知识已同步生成，且不包含未确认或敏感内容。
- [x] 运行 `npm.cmd run assistant:index`、`npm.cmd run sitemap:generate`、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build`。
- [x] 如变更影响页面渲染，运行 `npm.cmd run check:ui` 或记录合理跳过原因。
- [x] 人工审核 gate 清晰：部署、外链变更、截图替换、公开游戏版本声明仍需单独确认。

## Notes

- 本任务是父任务 `07-02-cross-project-optimization-round-2` 的下一轮自动优化，优先级属于“产品/展示体验”。
- 范围限定为主站内容同步和验证；游戏源码质量问题只记录为后续方向。
- 本轮基于 `game/blog/src/content/games/*.md`、相关 devlog、游戏站脚本和主站现有 `portfolio.ts` 同步内容；未改游戏源码、未部署、未替换链接或截图。
- 已同步 `server/data/public-knowledge.json`。`public/sitemap.xml` 重新生成但没有内容差异。
- `npm.cmd run check:ui` 第一次因未启动 `127.0.0.1:5174` preview 服务失败；随后临时启动 hidden preview 复跑，命令退出码为 0，并已关闭残留预览进程。输出中的 `ERR_NETWORK_CHANGED` 是临时预览环境噪声。
- 敏感信息扫描仅命中已有公开 URL，没有发现密钥、连接串、私有后台或未确认下载地址。
