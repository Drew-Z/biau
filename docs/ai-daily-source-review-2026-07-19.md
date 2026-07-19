# AI Daily 来源与查询组预审

审核日期：2026-07-19

这份记录是生产来源门禁的低敏预审，不是内容转载许可，也不是生产启用批准。审核使用公共页面、公开 RSS/Atom 和必要的 HTTPS 元数据核对页面可访问性、日期、列表稳定性、AI 信号、营销噪声和归属边界；没有运行 provider doctor、模型 ping、空 prompt 或模型测试任务。

清单仍保持：

- `readiness: pending-human-review`
- 所有来源和查询组 `enabled: false`
- 只有用户确认核心集合、预算和引用边界后，才允许进入真实版次验收

## 结论摘要

| 类型 | Approved | Hold | Rejected |
| --- | ---: | ---: | ---: |
| 来源 | 16 | 9 | 5 |
| 查询组 | 4 | 3 | 3 |

## 来源结论

### Approved

| 来源 | 证据入口 | 使用边界 |
| --- | --- | --- |
| Anthropic News | https://www.anthropic.com/news | HTML 增量；保留标题、日期、短摘要和原文链接 |
| Google DeepMind Blog | https://deepmind.google/discover/blog/ | RSS 优先；过滤少量合作与机构动态 |
| AWS Artificial Intelligence Blog | https://aws.amazon.com/blogs/machine-learning/ | 区分发布、教程、客户案例和产品推广 |
| Microsoft Research Blog | https://www.microsoft.com/en-us/research/blog/ | 只收明确 AI/ML/agent/AI for science 内容 |
| NVIDIA Developer Blog | https://developer.nvidia.com/blog/ | 按 AI 分类过滤；性能结论标记为厂商口径 |
| Qualcomm OnQ | https://www.qualcomm.com/news/onq?tags=AI | 使用 AI 标签；过滤 5G、移动和纯产品宣传 |
| GitHub Changelog | https://github.blog/changelog/ | 限定 Copilot、AI、model 与退役公告 |
| Meta Engineering | https://engineering.fb.com/category/ai-research/ | 保留作者和分类；过滤非 AI 工程内容 |
| Alibaba Group News | https://www.alibabagroup.com/en/news | 允许官方 canonical 跳转到 Alizila；按 URL 去重 |
| Mistral AI News | https://mistral.ai/news/ | HTML 增量；优先 Product、Research、Engineering |
| Cohere Blog | https://cohere.com/blog | 过滤合作 PR、办公动态、商品和泛 SEO 内容 |
| Red Hat AI Blog | https://www.redhat.com/en/blog/channel/artificial-intelligence | RSS 优先；产品和 ROI 数字明确归因 Red Hat |
| CNCF Blog | https://www.cncf.io/blog/ | AI/ML/LLM/agent/GPU 过滤；区分 Staff/Project/Member Post |
| Kubernetes Blog | https://kubernetes.io/blog/ | 只收 AI workload、GPU、Kubeflow 等主题并保留署名 |
| CMU Machine Learning Blog | https://blog.ml.cmu.edu/ | 研究补充源；优先链接论文、代码和数据 |
| MIT Technology Review AI | https://www.technologyreview.com/topic/artificial-intelligence/ | 作为分析来源；排除或显著标注赞助内容 |

### Hold

| 来源 | 原因 | 重新审核条件 |
| --- | --- | --- |
| Google AI Blog | RSS 混入 Search、Workspace、Education 等内容 | 完成二次 AI 分类与文章日期核对 |
| Microsoft AI Blog | 专题跨多个 Microsoft 频道，全站 feed 噪声高 | 建立专题 HTML 抓取和官方域名白名单 |
| Google Cloud AI/ML Blog | 无确认可用 feed，排名与客户营销内容较多 | 验证结构化列表和逐篇日期 |
| Hugging Face Blog | 官方、合作伙伴、机构和社区作者混合 | 建立作者/组织白名单与来源标签 |
| Adobe AI Blog | 完整列表依赖动态 CaaS，未发现稳定 feed | 找到稳定 CMS、站点地图或 feed |
| Databricks Engineering | 工程分类混源，部分列表项缺日期 | 验证 AI 子类和日期提取 |
| Snowflake Engineering | 无稳定 feed，列表日期不足 | 证明分页和逐篇日期增量可用 |
| Moonshot Platform Docs | 是能力文档，不是带日期的新闻流 | 定位 changelog 或版本变化检测机制 |
| MiniMax News | 客户端渲染，索引缺稳定日期列表 | 验证 Next.js/结构化数据抽取 |

### Rejected

| 来源 | 原因 |
| --- | --- |
| Apple Newsroom | 全量新闻室的日常 AI 信号太低 |
| ByteDance Newsroom | 英文列表陈旧，缺少当前稳定 AI 新闻流 |
| Zhipu AI News | 路径返回产品首页，缺少稳定文章链接与日期 |
| Alibaba Cloud AI Blog | 给定地址重定向到伪 200 的 not-found 页面 |
| ModelScope Headlines | 页面壳没有可重复抽取的标题、链接和日期 |

## 查询组结论

| 查询组 | 状态 | 关键决定 |
| --- | --- | --- |
| `frontier-model-releases` | approved | 保留模型发布、能力变化和退役；阈值降到 4，保留 signal |
| `open-source-ai` | approved | 移除 GitHub/Hugging Face 硬限制；保留 signal |
| `ai-infrastructure` | approved | 聚焦 inference runtime、GPU SDK、serving framework；关闭 signal |
| `china-ai-releases` | approved | 改用自然中文一方发布查询；阈值降到 4，保留 signal |
| `agent-platforms` | hold | 先划清 protocol/runtime 与 developer tools 的重叠 |
| `developer-ai-tools` | hold | 移除 GitHub-only；等待与 agent platforms 去重 |
| `multimodal-edge-ai` | hold | 已补 robotics/VLA，但需测量与 frontier 的重复 |
| `enterprise-ai` | rejected | 当前结果空间仍以营销、SEO 和新闻稿为主 |
| `research-breakthroughs` | rejected | “breakthrough”缺少客观标准，需要单独 significance gate |
| `ai-policy-safety` | rejected | 法域和一方监管来源范围尚未定义 |

推荐首批核心查询组是：

1. `frontier-model-releases`
2. `open-source-ai`
3. `ai-infrastructure`
4. `china-ai-releases`

四组合计预算上限为 12 requests、78 results、72 cost units；只有 frontier、open-source 和 China 组启用 signal。这个预算是清单上限，不是必须耗尽的配额。

## 引用与版权边界

- 仅保存必要元数据、事实卡、短摘录和原文链接，不复制整篇正文、图片或图表。
- 官方域名只证明发布主体，不自动授予全文转载权。
- 厂商性能、市场排名、客户收益和产品能力必须明确归因发布方。
- 社区、合作伙伴、Member Post、赞助内容和独立分析必须保留来源类型，不包装成官方技术结论。
- 重要发布事实优先由第一方来源证明；MIT Technology Review 等分析源用于背景和影响判断。

## 剩余人工门禁

用户只需确认两项：

1. 是否接受上述 16 个 approved 来源作为首批来源候选，并保持 9 个 hold、5 个 rejected 不启用。
2. 是否接受四个核心查询组及 12/78/72 的总预算上限。

确认后再单独切换顶层 readiness 和 approved 条目的 enabled 状态；契约要求所有条目完成审核、至少 12 个来源和 4 个查询组获批，hold/rejected 项继续禁用。在此之前不得运行真实采集版次或三角色模型评估。
