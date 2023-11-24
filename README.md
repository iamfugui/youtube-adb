## 简介
这是一个去除YouTube广告的[GreasyFork](https://greasyfork.org/scripts/459541-youtube%E5%8E%BB%E5%B9%BF%E5%91%8A-youtube-ad-blocker)脚本，轻量且高效，它能丝滑的去除界面广告和视频广告。android电脑双端适用，android端请使用[Via浏览器](https://viayoo.com/)安装使用。PC请使用[Tampermonkey](https://www.tampermonkey.net/)安装使用，代码已同步至[GitHub](https://github.com/iamfugui/YouTube-AD-Blocker)。iOS请自行尝试。

## 原理
- 使用style标签设置去除广告样式。
- 使用MutationObserver监听视频广告并将其去除。

## 效果
- 完全去除界面广告，且后续使用感知不到界面广告的存在。
- 对于拥有跳过按钮的视频广告，可以在毫秒单位内跳过。
- 对于没有跳过按钮的6s视频广告，可以在毫秒单位内跳过。

## Introduction
This is a [GreasyFork](https://greasyfork.org/scripts/459541-youtube%E5%8E%BB%E5%B9%BF%E5%91%8A-youtube-ad-blocker) script that removes YouTube ads. It works on both android and PC. For android devices, please install and use it with the [Free Browser](https://github.com/woheller69/browser) or the [Via Browser](https://viayoo.com/). For PC, please install and use it with [Tampermonkey](https://www.tampermonkey.net/). The code has also been synchronized to [GitHub](https://github.com/iamfugui/YouTube-AD-Blocker). iOS can also be used, maybe.

## Principles
- Use style tags to set the ad removal styles.
- Use MutationObserver to listen for video ads and remove them.

## Effects
- Interface ads are completely removed, and subsequent use cannot perceive the presence of interface ads.
- For video ads with a skip button, they can be skipped within milliseconds.
- The 6s video advertisement without a skip button can be skipped in milliseconds.
