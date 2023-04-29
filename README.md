## 简介
这是一个去除YouTube广告的脚本，轻量且高效，它能丝滑的去除界面广告和视频广告。请使用[Greasy Fork](https://greasyfork.org/scripts/459541/versions/new)安装使用，代码已同步至[GitHub](https://github.com/iamfugui/YouTube-AD-Blocker)。
## 原理
- 使用style标签设置去除广告样式。
- 使用MutationObserver监听视频广告并将其去除。
- 对于拥有跳过按钮的视频广告，脚本会立即调用按钮跳过该广告。
- 对于没有跳过按钮的视频广告，脚本会在记录视频进度的前提下重载界面，规避广告。

## 效果
- 完全去除界面广告，且后续使用感知不到界面广告的存在。
- 对于拥有跳过按钮的视频广告，可以在毫秒单位内跳过。
- 对于没有跳过按钮的视频广告，该规避方法能将广告时间从6-30秒缩短至2秒内。

## Introduction
This is a script that removes ads on YouTube, it's lightweight and efficient, capable of smoothly removing interface and video ads.Please install and use this script via [Greasy Fork](https://greasyfork.org/scripts/459541/versions/new), and the source code has been synchronized to [GitHub](https://github.com/iamfugui/YouTube-AD-Blocker).

## Principles
- Use style tags to set the ad removal styles.
- Use MutationObserver to listen for video ads and remove them.
- For video ads with a skip button, the script will immediately call the button to skip the ad.
- For video ads without a skip button, the script will reload the interface based on recording the progress of the video to avoid the ad.

## Effects
- Interface ads are completely removed, and subsequent use cannot perceive the presence of interface ads.
- For video ads with a skip button, they can be skipped within milliseconds.
- For video ads without a skip button, this avoidance method reduces ad time from 6-30 seconds to within 2 seconds.
