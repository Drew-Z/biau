# 技术设计

## 数据流

```text
hero/portfolio raw data
  -> project publication policy
  -> getProjectCta / getPublishedProjectLinks
  -> rendered public links
  -> public-links checker target map
```

巡检器必须消费与页面相同的 projection。原始 `detailLink` 不是项目详情页当前渲染的公开链接；只有通过页面组件实际渲染的 `project.links`、section links 和 visual source 才进入目标集合。hero 的外部 action 通过 `findProjectPublication` 与 `getProjectCta` 判断；被关闭的 action 不添加外部 URL，但对应的站内 status URL应作为内部目标保留。

## 兼容边界

- `getPublishedProjectLinks(undefined, links)` 保持聚合游戏项目的原始 entry 链接。
- internal relative links 继续解析到 `MAIN_SITE_URL`，用于检查站内 status、博客和详情路由。
- 目标集合仍按 URL 去重并保留 contexts；网络分类、重试和输出格式不变。
- 不写入 `public/status/public-links-synthetic.json`，本任务验证只读运行。

## 风险与回滚

主要风险是误删仍在页面中可见的 documentation/evidence 或 status 链接。通过对每个 intent 建立 fixture 目标快照和 `project-registry:check` 复验降低风险。若检查器输出或现有合同出现漂移，回滚本任务文件即可恢复原收集器。
