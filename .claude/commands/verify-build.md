# Verify Build

请验证当前项目是否可以正常开发和构建。

步骤：

1. 运行 `git status --short --branch`。
2. 如果没有 `node_modules`，运行 `npm install`。
3. 运行 `npm run lint`。
4. 运行 `npm run build`。
5. 如果失败，先判断是代码问题、依赖问题、平台原生包问题还是网络问题。
6. 输出：执行了哪些命令、成功/失败结果、需要用户处理的事项。
7. 不要自动提交或推送。
