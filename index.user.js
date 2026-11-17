// ==UserScript==
// @name         youtube-adb
// @name:zh-CN   YouTube去广告
// @name:zh-TW   YouTube去廣告
// @name:zh-HK   YouTube去廣告
// @name:zh-MO   YouTube去廣告
// @namespace    https://github.com/iamfugui/youtube-adb
// @version      6.21
// @description         A script to remove YouTube ads, including static ads and video ads, without interfering with the network and ensuring safety.
// @description:zh-CN   脚本用于移除YouTube广告，包括静态广告和视频广告。不会干扰网络，安全。
// @description:zh-TW   腳本用於移除 YouTube 廣告，包括靜態廣告和視頻廣告。不會干擾網路，安全。
// @description:zh-HK   腳本用於移除 YouTube 廣告，包括靜態廣告和視頻廣告。不會干擾網路，安全。
// @description:zh-MO   腳本用於移除 YouTube 廣告，包括靜態廣告和視頻廣告。不會干擾網路，安全。
// @match        *://*.youtube.com/*
// @exclude      *://accounts.youtube.com/*
// @exclude      *://www.youtube.com/live_chat_replay*
// @exclude      *://www.youtube.com/persist_identity*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=YouTube.com
// @grant        none
// @license MIT
// @downloadURL https://update.greasyfork.org/scripts/459541/YouTube%E5%8E%BB%E5%B9%BF%E5%91%8A.user.js
// @updateURL https://update.greasyfork.org/scripts/459541/YouTube%E5%8E%BB%E5%B9%BF%E5%91%8A.meta.js
// ==/UserScript==

(function() {
    `use strict`;

    let video;
    //界面广告选择器
    const cssSelectorArr = [
        `#masthead-ad`,//首页顶部横幅广告.
        `ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(.ytd-display-ad-renderer)`,//首页视频排版广告.
        `.video-ads.ytp-ad-module`,//播放器底部广告.
        `tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)`,//播放页会员促销广告.
        `ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]`,//播放页右上方推荐广告.
        `#related #player-ads`,//播放页评论区右侧推广广告.
        `#related ytd-ad-slot-renderer`,//播放页评论区右侧视频排版广告.
        `ytd-ad-slot-renderer`,//搜索页广告.
        `yt-mealbar-promo-renderer`,//播放页会员推荐广告.
        `ytd-popup-container:has(a[href="/premium"])`,//会员拦截广告
        `ad-slot-renderer`,//M播放页第三方推荐广告
        `ytm-companion-ad-renderer`,//M可跳过的视频广告链接处
    ];
    window.dev=false;//开发使用

    /**
    * 将标准时间格式化
    * @param {Date} time 标准时间
    * @param {String} format 格式
    * @return {String}
    */
    function moment(time) {
        // 获取年⽉⽇时分秒
        let y = time.getFullYear()
        let m = (time.getMonth() + 1).toString().padStart(2, `0`)
        let d = time.getDate().toString().padStart(2, `0`)
        let h = time.getHours().toString().padStart(2, `0`)
        let min = time.getMinutes().toString().padStart(2, `0`)
        let s = time.getSeconds().toString().padStart(2, `0`)
        return `${y}-${m}-${d} ${h}:${min}:${s}`
    }

    /**
    * 输出信息
    * @param {String} msg 信息
    * @return {undefined}
    */
    function log(msg) {
        if(!window.dev){
            return false;
        }
        console.log(window.location.href);
        console.log(`${moment(new Date())}  ${msg}`);
    }

    /**
    * 设置运行标志
    * @param {String} name
    * @return {undefined}
    */
    function setRunFlag(name){
        let style = document.createElement(`style`);
        style.id = name;
        (document.head || document.body).appendChild(style);//将节点附加到HTML.
    }

    /**
    * 获取运行标志
    * @param {String} name
    * @return {undefined|Element}
    */
    function getRunFlag(name){
        return document.getElementById(name);
    }

    /**
    * 检查是否设置了运行标志
    * @param {String} name
    * @return {Boolean}
    */
    function checkRunFlag(name){
        if(getRunFlag(name)){
            return true;
        }else{
            setRunFlag(name)
            return false;
        }
    }

    /**
    * 生成去除广告的css元素style并附加到HTML节点上
    * @param {String} styles 样式文本
    * @return {undefined}
    */
    function generateRemoveADHTMLElement(id) {
        //如果已经设置过,退出.
        if (checkRunFlag(id)) {
            log(`屏蔽页面广告节点已生成`);
            return false
        }

        //设置移除广告样式.
        let style = document.createElement(`style`);//创建style元素.
        (document.head || document.body).appendChild(style);//将节点附加到HTML.
        style.appendChild(document.createTextNode(generateRemoveADCssText(cssSelectorArr)));//附加样式节点到元素节点.
        log(`生成屏蔽页面广告节点成功`);
    }

    /**
    * 生成去除广告的css文本
    * @param {Array} cssSelectorArr 待设置css选择器数组
    * @return {String}
    */
    function generateRemoveADCssText(cssSelectorArr){
        cssSelectorArr.forEach((selector,index)=>{
            cssSelectorArr[index]=`${selector}{display:none!important}`;//遍历并设置样式.
        });
        return cssSelectorArr.join(` `);//拼接成字符串.
    }

    /**
    * 触摸事件
    * @return {undefined}
    */
    function nativeTouch(){
        // 创建 Touch 对象
        let touch = new Touch({
            identifier: Date.now(),
            target: this,
            clientX: 12,
            clientY: 34,
            radiusX: 56,
            radiusY: 78,
            rotationAngle: 0,
            force: 1
        });

        // 创建 TouchEvent 对象
        let touchStartEvent = new TouchEvent(`touchstart`, {
            bubbles: true,
            cancelable: true,
            view: window,
            touches: [touch],
            targetTouches: [touch],
            changedTouches: [touch]
        });

        // 分派 touchstart 事件到目标元素
        this.dispatchEvent(touchStartEvent);

        // 创建 TouchEvent 对象
        let touchEndEvent = new TouchEvent(`touchend`, {
            bubbles: true,
            cancelable: true,
            view: window,
            touches: [],
            targetTouches: [],
            changedTouches: [touch]
        });

        // 分派 touchend 事件到目标元素
        this.dispatchEvent(touchEndEvent);
    }


    /**
    * 获取dom
    * @return {undefined}
    */
    function getVideoDom(){
        video = document.querySelector(`.ad-showing video`) || document.querySelector(`video`);
    }


    /**
    * 自动播放
    * @return {undefined}
    */
    function playAfterAd(){
        if (manualSuppressedIdentity === playbackIdentity()) return;
        if (!video || !video.isConnected) return;
        if(video.paused && video.currentTime<1){
            video.play();
            log(`自动播放视频`);
        }
    }


    /**
    * 移除YT拦截广告拦截弹窗并且关闭关闭遮罩层
    * @return {undefined}
    */
    function closeOverlay(){
        //移除YT拦截广告拦截弹窗
        const premiumContainers = [...document.querySelectorAll(`ytd-popup-container`)];
        const matchingContainers = premiumContainers.filter(container => container.querySelector(`a[href="/premium"]`));

        if(matchingContainers.length>0){
            matchingContainers.forEach(container => { armEnforcementRecovery(container); container.remove(); });
            log(`移除YT拦截器`);
        }

        // 获取所有具有指定标签的元素
        const backdrops = document.querySelectorAll(`tp-yt-iron-overlay-backdrop`);
        // 查找具有特定样式的元素
        const targetBackdrop = Array.from(backdrops).find(
            (backdrop) => backdrop.style.zIndex === `2201`
        );
        // 如果找到该元素，清空其类并移除 open 属性
        if (targetBackdrop) {
            targetBackdrop.className = ``; // 清空所有类
            targetBackdrop.removeAttribute(`opened`); // 移除 open 属性
            log(`关闭遮罩层`);
        }
    }


    /**
    * 跳过广告
    * @return {undefined}
    */
    let skipAdTimer = null;
    // Only act on confirmed ads, revalidating on every retry.
    function skipAd(isRetry = false) {
        const adPlayer = document.querySelector('.ad-showing');
        const adVideo = adPlayer && adPlayer.querySelector('video');
        if (!adVideo || !adVideo.isConnected) {
            if (skipAdTimer !== null) clearTimeout(skipAdTimer);
            skipAdTimer = null;
            return;
        }
        if (explicitManualPauseIdentity === playbackIdentity()) {
            if (skipAdTimer !== null) clearTimeout(skipAdTimer);
            skipAdTimer = null;
            return;
        }
        video = adVideo;
        const skipButton = adPlayer.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern');
        const shortAdMsg = adPlayer.querySelector('.video-ads.ytp-ad-module .ytp-ad-player-overlay, .ytp-ad-button-icon');
        if ((skipButton || shortAdMsg) && window.location.href.indexOf('https://m.youtube.com/') === -1) video.muted = true;
        if (skipButton || shortAdMsg) {
            if (skipAdTimer === null) {
                skipAdTimer = setTimeout(() => { skipAdTimer = null; skipAd(true); }, 500);
            }
        }
        const canFinishAd = !adVideo.ended && Number.isFinite(adVideo.duration) && adVideo.duration > 0.2;
        const canAdvance = canFinishAd && adVideo.currentTime < adVideo.duration - 0.2;
        const stillAd = () => adPlayer.isConnected && document.querySelector('.ad-showing') === adPlayer && adPlayer.querySelector('video') === adVideo;
        const finishAd = () => {
            if (!stillAd() || explicitManualPauseIdentity === playbackIdentity()) return;
            if (canAdvance) adVideo.currentTime = adVideo.duration - 0.1;
            // Seeking may have switched to content; revalidate before playing.
            if (stillAd() && adVideo.paused && !adVideo.ended && explicitManualPauseIdentity !== playbackIdentity()) {
                try {
                    const result = adVideo.play();
                    if (result && result.catch) result.catch(() => {});
                } catch (_) {}
            }
        };
        if (skipButton) {
            // If the button did not work, the retry uses a seek fallback.
            if (isRetry === true && canFinishAd && stillAd()) {
                finishAd();
                return;
            }
            // Clicking may switch to content; do not seek afterward.
            skipButton.click();
            if (typeof Touch === 'function' && typeof TouchEvent === 'function') nativeTouch.call(skipButton);
            log('按钮跳过广告');
            return;
        }
        if (shortAdMsg && canFinishAd && stillAd()) {
            finishAd();
            log('结束已确认的视频广告');
        }
    }

    /**
    * 去除播放中的广告
    * @return {undefined}
    */
    function removePlayerAD(id){
        //如果已经在运行,退出.
        if (checkRunFlag(id)) {
            log(`去除播放中的广告功能已在运行`);
            return false
        }

        //监听视频中的广告并处理
        const targetNode = document.body;//直接监听body变动
        const config = {childList: true, subtree: true };// 监听目标节点本身与子树下节点的变动
        const observer = new MutationObserver(()=>{getVideoDom();closeOverlay();skipAd();playAfterAd();});//处理视频广告相关
        observer.observe(targetNode, config);// 以上述配置开始观察广告节点
        log(`运行去除播放中的广告功能成功`);
    }

    /**
    * main函数
    */
    function main(){
        generateRemoveADHTMLElement(`removeADHTMLElement`);//移除界面中的广告.
        removePlayerAD(`removePlayerAD`);//移除播放中的广告.
    }

    if (document.readyState === `loading`) {
        document.addEventListener(`DOMContentLoaded`, main);// 此时加载尚未完成
        log(`YouTube去广告脚本即将调用:`);
    } else {
        main();// 此时`DOMContentLoaded` 已经被触发
        log(`YouTube去广告脚本快速调用:`);
    }

    let pendingOverlayResume = null;
    let enforcementObserved = false;
    let lastRecoveryIdentity = '';
    let manualSuppressedIdentity = '';
    // Track explicit pause intent separately from conservative input cancellation.
    let explicitManualPauseIdentity = '';
    function playbackIdentity() {
        const url = new URL(location.href);
        return url.origin + url.pathname + ':' + (url.searchParams.get('v') || '');
    }
    function cancelOverlayResume() {
        if (pendingOverlayResume) clearTimeout(pendingOverlayResume.timer);
        pendingOverlayResume = null;
        document.removeEventListener('pointerdown', cancelOverlayResumeFromInput, true);
        document.removeEventListener('keydown', cancelOverlayResumeFromInput, true);
        document.removeEventListener('yt-navigate-start', cancelOverlayResume, true);
        document.removeEventListener('loadedmetadata', checkOverlayResume, true);
        document.removeEventListener('pause', checkOverlayResume, true);
    }
    function cancelOverlayResumeFromInput(event) {
        if (event.isTrusted) {
            manualSuppressedIdentity = playbackIdentity();
            cancelOverlayResume();
        }
    }
    function checkOverlayResume(event) {
        const pending = pendingOverlayResume;
        if (!pending) return;
        clearTimeout(pending.timer);
        const now = performance.now();
        const player = document.querySelector('#movie_player');
        if (now >= pending.hardDeadline || playbackIdentity() !== pending.identity || !player || player !== pending.player || !player.isConnected) {
            cancelOverlayResume();
            return;
        }
        const videoelem = player.querySelector('video.html5-main-video');
        const showingAd = player.classList.contains('ad-showing') || !!player.querySelector('.ad-showing');
        if (showingAd) {
            pending.content = null;
            pending.contentDeadline = 0;
        } else if (videoelem && videoelem.isConnected && videoelem.readyState >= 1) {
            if (!pending.metadataSeen && event && event.type === 'loadedmetadata' && event.target === videoelem) {
                pending.metadataSeen = true;
                pending.content = null;
                pending.contentDeadline = 0;
            }
            if (!pending.content && !videoelem.ended) {
                pending.content = videoelem;
                pending.contentDeadline = Math.min(pending.hardDeadline, now + 5000);
            }
            if (pending.content) {
                if (pending.content !== videoelem || videoelem.ended || now >= pending.contentDeadline) {
                    cancelOverlayResume();
                    return;
                }
                if (videoelem.paused && !pending.inFlight && now - pending.lastAttempt >= 500) {
                    if (pending.attempts >= 3) {
                        cancelOverlayResume();
                        return;
                    }
                    pending.attempts += 1;
                    pending.lastAttempt = now;
                    pending.inFlight = true;
                    try {
                        const result = videoelem.play();
                        if (result && result.then) {
                            result.then(() => { if (pendingOverlayResume === pending) pending.inFlight = false; }, () => { if (pendingOverlayResume === pending) cancelOverlayResume(); });
                        } else pending.inFlight = false;
                    } catch (_) { cancelOverlayResume(); return; }
                }
            }
        }
        if (pendingOverlayResume === pending) pending.timer = setTimeout(checkOverlayResume, 150);
    }
    function startEnforcementRecovery(player, fromMetadata = false, fromNotice = false) {
        const identity = playbackIdentity();
        if (manualSuppressedIdentity === identity) return;
        if (pendingOverlayResume && pendingOverlayResume.identity === identity && pendingOverlayResume.player === player) return;
        if (!fromNotice && lastRecoveryIdentity === identity) return;
        cancelOverlayResume();
        lastRecoveryIdentity = identity;
        pendingOverlayResume = {identity, player, hardDeadline: performance.now() + 10000, content: null, contentDeadline: 0, metadataSeen: fromMetadata, attempts: 0, lastAttempt: -Infinity, inFlight: false, timer: null};
        document.addEventListener('pointerdown', cancelOverlayResumeFromInput, true);
        document.addEventListener('keydown', cancelOverlayResumeFromInput, true);
        document.addEventListener('yt-navigate-start', cancelOverlayResume, true);
        document.addEventListener('loadedmetadata', checkOverlayResume, true);
        document.addEventListener('pause', checkOverlayResume, true);
        pendingOverlayResume.timer = setTimeout(checkOverlayResume, 150);
    }
    function armEnforcementRecovery(node) {
        const enforcement = node && (node.matches('ytd-enforcement-message-view-model') ? node : node.querySelector('ytd-enforcement-message-view-model'));
        const player = document.querySelector('#movie_player');
        if (!enforcement || !player) return;
        enforcementObserved = true;
        startEnforcementRecovery(player, false, true);
    }
    function trackExplicitPlaybackIntent(event) {
        if (!event.isTrusted) return;
        const target = event.target;
        const player = document.querySelector('#movie_player');
        const videoelem = player && player.querySelector('video.html5-main-video');
        if (!target || !target.closest || !videoelem || !videoelem.isConnected) return;
        if (event.type === 'keydown') {
            if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
            const key = event.key.toLowerCase();
            if (key !== 'k' && key !== ' ') {
                const playButton = target.closest('.ytp-play-button');
                if (key !== 'enter' || !playButton || !player.contains(playButton)) return;
            }
            if (key === ' ' && target.closest('button, a, [role="button"], [role="slider"], [role="menuitem"]')) {
                const playButton = target.closest('.ytp-play-button');
                if (!playButton || !player.contains(playButton)) return;
            }
        } else {
            if (event.button !== 0) return;
            const playButton = target.closest('.ytp-play-button');
            if (target !== videoelem && !(playButton && player.contains(playButton))) return;
        }
        const identity = playbackIdentity();
        // Cancel before removing listeners so Play is not treated as a manual pause.
        cancelOverlayResume();
        if (videoelem.paused || videoelem.ended) {
            if (explicitManualPauseIdentity === identity) explicitManualPauseIdentity = '';
            if (manualSuppressedIdentity === identity) manualSuppressedIdentity = '';
            // Wait for the native control action before retrying ad skipping.
            if ((player.classList.contains('ad-showing') || player.querySelector('.ad-showing')) && skipAdTimer === null) {
                skipAdTimer = setTimeout(() => { skipAdTimer = null; skipAd(true); }, 500);
            }
        } else {
            explicitManualPauseIdentity = identity;
            manualSuppressedIdentity = identity;
        }
    }
    document.addEventListener('pointerdown', trackExplicitPlaybackIntent, true);
    document.addEventListener('keydown', trackExplicitPlaybackIntent, true);
    // Double-clicking the video toggles fullscreen and may not actually pause.
    document.addEventListener('dblclick', event => {
        if (!event.isTrusted) return;
        const player = document.querySelector('#movie_player');
        const videoelem = player && player.querySelector('video.html5-main-video');
        const identity = playbackIdentity();
        if (event.target !== videoelem || !videoelem || videoelem.paused || explicitManualPauseIdentity !== identity) return;
        explicitManualPauseIdentity = '';
        if (manualSuppressedIdentity === identity) manualSuppressedIdentity = '';
        if ((player.classList.contains('ad-showing') || player.querySelector('.ad-showing')) && skipAdTimer === null) {
            skipAdTimer = setTimeout(() => { skipAdTimer = null; skipAd(true); }, 500);
        }
    }, true);
    // YouTube can retain enforcement state across videos in the same tab.
    document.addEventListener('loadedmetadata', event => {
        if (!enforcementObserved) return;
        const player = document.querySelector('#movie_player');
        if (!player || event.target !== player.querySelector('video.html5-main-video') || player.classList.contains('ad-showing') || player.querySelector('.ad-showing')) return;
        startEnforcementRecovery(player, true);
    }, true);
    let resumeVideo = () => {
        if (manualSuppressedIdentity === playbackIdentity()) return;
        const videoelem = document.body.querySelector('video.html5-main-video');
        if (videoelem && videoelem.paused) {
            const result = videoelem.play();
            if (result && result.catch) result.catch(() => {});
        }
    };

    let removePop = node => {
        const elpopup = node.matches('ytd-enforcement-message-view-model') ? node : node.querySelector('ytd-enforcement-message-view-model')

        if (elpopup && elpopup.isConnected && elpopup.parentNode) {
            armEnforcementRecovery(elpopup);
            elpopup.parentNode.remove()
            console.log('remove popup', elpopup)
            const bdelems = document
                .getElementsByTagName('tp-yt-iron-overlay-backdrop')
            for (var x = (bdelems || []).length; x--;)
                bdelems[x].remove()
            resumeVideo()
        }

        if (node.tagName.toLowerCase() === 'tp-yt-iron-overlay-backdrop') {
            node.remove()
            resumeVideo()
            console.log('remove backdrop', node)
        }
    }

    let obs = new MutationObserver(mutations => mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
            Array.from(mutation.addedNodes)
                .filter(node => node.nodeType === 1)
                .map(node => removePop(node))
        }
    }))

    // have the observer observe foo for changes in children
    obs.observe(document.body, {
        childList: true,
        subtree: true
    })
})();
