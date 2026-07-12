# Research

参考站 390px 首屏采用整卡箭头入口和 `:active scale`，用户触摸时能立即确认命中目标。主站首屏纵向密度已经优于参考站，不需要继续压缩；差距在于首页/项目整卡虽可点击却缺少触控状态，博客仍只有底部按钮入口。

采用现有组件交互模式统一三类卡片，比增加新手势更符合此前确定的移动端自然滚动方向。
## Verification Evidence

- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `npm.cmd run check:ui` passed for 14 routes, including 320/390/430px real touch contexts.
- Reference and BIAU 390px screenshots were compared; BIAU keeps the denser first viewport while adopting the reference site's clearer card affordance.