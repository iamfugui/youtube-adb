// ==UserScript==
// @name         YouTube去广告 YouTube AD Blocker
// @name:zh-CN   YouTube去广告
// @name:zh-TW   YouTube去廣告
// @name:zh-HK   YouTube去廣告
// @name:zh-MO   YouTube去廣告

// @namespace    http://tampermonkey.net/
// @version      3.8

// @description         这是一个去除YouTube广告的脚本，轻量且高效，它能丝滑的去除界面广告和视频广告。This is a script that removes ads on YouTube, it's lightweight and efficient, capable of smoothly removing interface and video ads.
// @description:zh-CN   这是一个去除YouTube广告的脚本，轻量且高效，它能丝滑的去除界面广告和视频广告。
// @description:zh-TW   這是一個去除YouTube廣告的腳本，輕量且高效，它能絲滑地去除界面廣告和視頻廣告。
// @description:zh-HK   這是一個去除YouTube廣告的腳本，輕量且高效，它能絲滑地去除界面廣告和視頻廣告。
// @description:zh-MO   這是一個去除YouTube廣告的腳本，輕量且高效，它能絲滑地去除界面廣告和視頻廣告。

// @author       iamfugui
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=YouTube.com
// @grant        none
// @license MIT
// ==/UserScript==
(function() {
    `use strict`;

    const dev = false;//开发使用

    //界面广告选择器
    const cssSeletorArr = [
        `#masthead-ad`,//首页顶部横幅广告.
        `ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(.ytd-display-ad-renderer)`,//首页视频排版广告.
        `ytd-rich-section-renderer #dismissible`,//首页中部横幅广告.
        `.video-ads.ytp-ad-module`,//播放器底部广告.
        `tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)`,//播放页会员促销广告.
        `#related #player-ads`,//播放页评论区右侧推广广告.
        `#related ytd-ad-slot-renderer`,//播放页评论区右侧视频排版广告.
        `ytd-ad-slot-renderer`,//搜索页广告.
        `yt-mealbar-promo-renderer`,//播放页会员推荐广告.
    ];

    let lastTime = parseInt(getUrlParams(`t`))||0;//由于youtube出现广告前是先将进度条归零再进行广告node的更新,故此将上一次进度记录
    let currentTime = parseInt(getUrlParams(`t`))||0;//根据url初始化当前播放时间s
    let videoLink = `${location.href.split(`&`)[0]}`;//当前视频链接
    let video;

    /**
    * 将标准时间格式化
    * @param {Date} time 标准时间
    * @param {String} format 格式
    * @return {String}
    */
    function moment(time, format = `YYYY-MM-DD HH:mm:ss`) {
        // 获取年⽉⽇时分秒
        let y = time.getFullYear()
        let m = (time.getMonth() + 1).toString().padStart(2, `0`)
        let d = time.getDate().toString().padStart(2, `0`)
        let h = time.getHours().toString().padStart(2, `0`)
        let min = time.getMinutes().toString().padStart(2, `0`)
        let s = time.getSeconds().toString().padStart(2, `0`)
        if (format === `YYYY-MM-DD`) {
            return `${y}-${m}-${d}`
        } else {
            return `${y}-${m}-${d} ${h}:${min}:${s}`
        }
    }


    /**
    * 输出信息
    * @param {String} msg 信息
    * @return {undefined}
    */
    function log(msg) {
        if(!dev){
            return false;
        }
        console.log(`${moment(new Date())}  ${msg}`)
    }

    /**
    * 获取当前url的参数,如果要查询特定参数请传参
    * @param {String} 要查询的参数
    * @return {String || Object}
    */
    function getUrlParams(param) {
        // 通过 ? 分割获取后面的参数字符串
        let urlStr = location.href.split(`?`)[1]
        if(!urlStr){
            return ``;
        }
        // 创建空对象存储参数
        let obj = {};
        // 再通过 & 将每一个参数单独分割出来
        let paramsArr = urlStr.split(`&`)
        for(let i = 0,len = paramsArr.length;i < len;i++){
            // 再通过 = 将每一个参数分割为 key:value 的形式
            let arr = paramsArr[i].split(`=`)
            obj[arr[0]] = arr[1];
        }

        if(!param){
            return obj;
        }

        return obj[param]||``;
    }

    /**
    * 得到跳过链接
    * @return {String}
    */
    function getSkipAdUrl(){
        let urlParams = getUrlParams();
        let url = `${videoLink}`;
        for(let key in urlParams){
            if(key !== `v` && key !== `t`){
                url = `${url}&${key}=${urlParams[key]}`
            }
        }
        return `${url}&t=${parseInt(lastTime)}s`;
    }

    /**
    * 生成去除广告的css元素style并附加到HTML节点上
    * @param {String} styles 样式文本
    * @param {String} styleId 元素id
    * @return {undefined}
    */
    function generateRemoveADHTMLElement(styles,styleId) {
        //如果已经设置过,退出.
        if (document.getElementById(styleId)) {
            return false
        }

        //设置移除广告样式.
        let style = document.createElement(`style`);//创建style元素.
        style.id = styleId;
        (document.querySelector(`head`) || document.querySelector(`body`)).appendChild(style);//将节点附加到HTML.
        style.appendChild(document.createTextNode(styles));//附加样式节点到元素节点.
        log(`屏蔽页面广告节点已生成`)

    }

    /**
    * 生成去除广告的css文本
    * @param {Array} cssSeletorArr 待设置css选择器数组
    * @return {String}
    */
    function generateRemoveADCssText(cssSeletorArr){
        cssSeletorArr.forEach((seletor,index)=>{
            cssSeletorArr[index]=`${seletor}{display:none!important}`;//遍历并设置样式.
        });
        return cssSeletorArr.join(` `);//拼接成字符串.
    }


    /**
    * 检测用户切换了视频
    * @return {undefined}
    */
    function switchVideoHook(){
        if(videoLink !== `${location.href.split(`&`)[0]}`){
            videoLink = location.href.split(`&`)[0];//更新链接
            lastTime = parseInt(getUrlParams(`t`))||0;//根据url初始化当前播放时间s
            currentTime = parseInt(getUrlParams(`t`))||0;//根据url初始化当前播放时间s
            log(`检测到用户切换了视频,已更新播放进度`)
        }
    }

    /**
    * 去除播放中的广告
    * @return {undefined}
    */
    function removePlayerAD(){
        let observer;//监听器
        let progress;//进度条node
        let updateTimerId;//信息更新定时器

        //该函数主要是避免定时器对视频进度监听太慢导致进度条在跳转广告后出现偏移的情况
        let clickProgressHandler = function(){
            lastTime = video.currentTime;//记录播放进度
            currentTime = video.currentTime;//记录播放进度
            log(`监听到点击了进度条`);
            log(lastTime);
        }

        //开始监听
        function startObserve(){
            video = document.querySelector(`video`);//获取视频节点

            //广告节点监听
            const targetNode = document.querySelector(`.video-ads.ytp-ad-module`);
            //这个视频不存在广告
            if(!targetNode){
                return false;
            }

            //定时更新视频信息
            function updateCall(){
                switchVideoHook();//检测用户是否切换了视频

                if(!video){
                    return false;
                }

                videoLink = location.href.split(`&`)[0];//更新链接

                lastTime = currentTime>2?currentTime:lastTime;//广告标签节点出现时间会与广告出现时间存在偏差 当进度条时间小于2时，判定为广告记录条，不记录
                currentTime = video.currentTime;//未检测到广告,记录播放进度
                log(`查看上一次进度${lastTime}`);
                log(`查看当前进度${currentTime}`);
            }
            updateTimerId =setInterval(updateCall,1000);

            // 监听视频中的广告并处理
            const config = {childList: true, subtree: true };// 监听目标节点本身与子树下节点的变动
            // 当观察到变动时执行的回调函数
            const callback = function (mutationsList, observer) {
                switchVideoHook();//检测用户是否切换了视频

                //拥有跳过按钮的广告.
                let skipButton = document.querySelector(`.ytp-ad-skip-button`);
                if(skipButton)
                {
                    skipButton.click();// 跳过广告.
                    log(`刚刚监听到了广告节点变化并使用按钮跳过了一条广告`);
                    return false;//终止
                }

                //没有跳过按钮的短广告.
                let shortAdMsg = document.querySelector(`.video-ads.ytp-ad-module .ytp-ad-player-overlay`);
                if(shortAdMsg){
                    log(`查看上一次进度${lastTime}`);
                    log(`查看当前进度${currentTime}`);
                    video.pause();//暂停播放避免继续请求资源
                    log(`刚刚监听到了广告节点变化并即将跳过了一条广告`);
                    location.replace(getSkipAdUrl());//得到跳转的url,重新加载.
                    closeObserve();
                    return false;//终止
                }

                log(`刚刚监听到了广告节点变化但都没有处理:`);

            }
            observer = new MutationObserver(callback);// 创建一个观察器实例并传入回调函数
            observer.observe(targetNode, config);// 以上述配置开始观察广告节点

            //监听点击进度条并处理
            progress = document.querySelector(`.ytp-progress-bar-container`);
            progress.addEventListener(`click`,clickProgressHandler);
        }

        //结束监听
        function closeObserve(){
            observer.disconnect();
            clearInterval(updateTimerId);
            progress.removeEventListener(`click`,clickProgressHandler);
            updateTimerId = null;
            observer = null;
            progress = null;
        }

        //轮询任务
        setInterval(function(){
            //视频播放页
            if(getUrlParams(`v`)){
                if(observer && updateTimerId && progress){
                    return false;
                }
                startObserve();
            }else{
                //其它界面
                if(!observer && !updateTimerId && !progress){
                    return false;
                }
                closeObserve();
            }
        },16.6);

        log(`去除视频广告脚本持续运行中`)
    }

    /**
    * main函数
    */
    function main(){
        generateRemoveADHTMLElement(generateRemoveADCssText(cssSeletorArr),`removeAD`);//移除界面中的广告.
        removePlayerAD();//移除播放中的广告.
    }

    if (document.readyState === `loading`) {
        log(`YouTube去广告脚本即将调用:`);
        document.addEventListener(`DOMContentLoaded`, main);// 此时加载尚未完成
    } else {
        log(`YouTube去广告脚本快速调用:`);
        main();// 此时`DOMContentLoaded` 已经被触发
    }

})();
