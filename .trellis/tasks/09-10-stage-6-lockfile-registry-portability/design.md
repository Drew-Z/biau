# 下载地址修复设计

锁文件的现有 resolved 地址会在 npm ci 中直接请求 npmmirror 并重定向到其 CDN。机器的默认 registry 不能作为锁文件已使用官方包地址的证明。本次只做精确主机名替换，保留 tarball 路径与 SRI；通过 JSON 字段比较拒绝任何其他变更，而非运行可能重新选版的 npm update。

候选已在独立 Node 22 / Linux x64 容器从空 node_modules 和空 npm 缓存执行 `npm ci --ignore-scripts --no-audit --no-fund`，实际安装 445 包，版本/integrity 对照无差异。该试验仅证明批量下载、解包与内容匹配；正式 Ubuntu CI 必须后续从新的已提交源运行原始七步。

应用后运行主机 lint/build/performance，核对当前构建与先前依赖修复的产物一致。没有版本、源码、运行配置变化时，已有完整 UI 46/0、smoke 21/0 与助手/内容合同仍覆盖相同运行内容；明确记录复用依据，不重复耗时的完整 UI。所有原始网络失败记录继续保留。
