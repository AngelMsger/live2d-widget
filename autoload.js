const defaultOptions = Object.freeze({
    cdnPath: '/',
    waifuTips: Object.freeze({
        event: {
            idle: [],
            devtool: [],
            copy: [],
            visibilitychange: [],
            screenshot: []
        },
        welcome: '欢迎阅读{title}!',
        seasons: [],
        times: [],
        referrer: {
            baidu: '',
            google: '',
            bing: ''
        }
    }),
    enableTips: true,
    enableTool: true
});

async function loadWidget(config) {
    config = config || '';
    if (typeof config === 'string') {
        config = { cdnPath: config };
    }

    config = { ...defaultOptions, ...config };
    if (!config.cdnPath.endsWith('/')) {
        config.cdnPath += '/';
    }

    localStorage.removeItem('waifu-display');
    sessionStorage.removeItem('waifu-text');
    const waifuTipsHtml = config.enableTips ? '<div id="waifu-tips"></div>' : '';
    const waifuToolHtml = config.enableTool
        ? `<div id="waifu-tool">
            <span class="fa fa-lg fa-comment"></span>
            <span class="fa fa-lg fa-user-circle"></span>
            <span class="fa fa-lg fa-camera-retro"></span>
            <span class="fa fa-lg fa-info-circle"></span>
            <span class="fa fa-lg fa-times"></span>
        </div>`
        : '';
    const waifuHtml = `<div id="waifu">
        ${ waifuTipsHtml }
        <canvas id="live2d" width="800" height="800"></canvas>
        ${ waifuToolHtml }
    </div>`;

    let modelList;
    async function loadModelList() {
        if (!modelList) {
            const res = await fetch(`${ config.cdnPath }model_list.json`);
            modelList = await res.json();
        }

        return modelList;
    }

    const modelListByFetch = await loadModelList();
    if (!modelListByFetch.models || !modelListByFetch.models.length) {
        // 缺少模型.
        return;
    }

    document.body.insertAdjacentHTML('beforeend', waifuHtml);
    // https://stackoverflow.com/questions/24148403/trigger-css-transition-on-appended-element
    setTimeout(() => {
        document.getElementById('waifu').style.bottom = 0;
    }, 0);

    function randomSelection(obj) {
        return Array.isArray(obj)
            ? obj[Math.floor(Math.random() * obj.length)]
            : obj;
    }

    function showHitokoto() {
        fetch('https://v1.hitokoto.cn')
            .then(response => response.json())
            .then(body => showMessage(body.hitokoto, 6000, 9));
    }

    let messageTimer;
    function showMessage(textOrArray, timeout, priority, templateArgs) {
        if (
            !config.enableTips || !textOrArray ||
            (sessionStorage.getItem('waifu-text') &&
                sessionStorage.getItem('waifu-text') > priority)
        ) {
            return;
        }

        if (messageTimer) {
            clearTimeout(messageTimer);
            messageTimer = null;
        }

        textOrArray = String(randomSelection(textOrArray));
        if (templateArgs) {
            Object
                .keys(templateArgs)
                .forEach(key => textOrArray
                    .replace(`{${ key }}`, templateArgs[key]));
        }

        sessionStorage.setItem('waifu-text', priority);
        const tips = document.getElementById('waifu-tips');
        tips.innerHTML = textOrArray;
        tips.classList.add('waifu-tips-active');
        messageTimer = setTimeout(() => {
            sessionStorage.removeItem('waifu-text');
            tips.classList.remove('waifu-tips-active');
        }, timeout);
    }

    let waifuTips;
    async function loadWaifuTips() {
        if (!waifuTips) {
            if (!config.enableTips) {
                waifuTips = {};
            } else {
                const res = await fetch(`${ config.cdnPath }waifu-tips.json`);
                waifuTips = await res.json();
            }
        }

        return waifuTips;
    }

    const waifuTipsByFetch = await loadWaifuTips();

    config.waifuTips = { ...defaultOptions.waifuTips, ...waifuTipsByFetch, ...config.waifuTips };
    config.modelList = []
        .concat(config.modelList, modelListByFetch)
        .filter(model => Boolean(model));

    let isWaifuToolEventRegistered = false;
    function registerWaifuToolEventListener() {
        if (!config.enableTool) {
            return;
        }

        if (isWaifuToolEventRegistered) {
            return;
        }

        // 一言.
        document
            .querySelector('#waifu-tool .fa-comment')
            .addEventListener('click', showHitokoto);
        // 替换模型.
        document
            .querySelector('#waifu-tool .fa-user-circle')
            .addEventListener('click', loadOtherModel);
        // 拍照.
        document
            .querySelector('#waifu-tool .fa-camera-retro')
            .addEventListener('click', () => {
                showMessage(config.waifuTips.event.screenshot, 6000, 9);
                Live2D.captureName = 'photo.png';
                Live2D.captureFrame = true;
            });
        // 关于.
        document
            .querySelector('#waifu-tool .fa-info-circle')
            .addEventListener('click', () => {
                const url = config.aboutUrl || 'https://github.com/stevenjoezhang/live2d-widget';
                open(url);
            });
        // 隐藏.
        document
            .querySelector('#waifu-tool .fa-times')
            .addEventListener('click', () => {
                localStorage.setItem('waifu-display', Date.now());
                showMessage(config.waifuTips, 2000, 11);
                document.getElementById('waifu').style.bottom = '-500px';
                setTimeout(() => {
                    document.getElementById('waifu').style.display = 'none';
                    document.getElementById('waifu-toggle').classList.add('waifu-toggle-active');
                }, 3000);
            });
        isWaifuToolEventRegistered = true;
    }

    const isDefaultWaifuTipsRegistered = false;
    function registerDefaultWaifuTips() {
        if (!config.enableTips) {
            return;
        }

        if (isDefaultWaifuTipsRegistered) {
            return;
        }

        // 空闲消息.
        let userAction = false; let
            userActionTimer;
        window.addEventListener('mousemove', () => userAction = true);
        window.addEventListener('keydown', () => userAction = true);
        setInterval(() => {
            if (userAction) {
                userAction = false;
                clearInterval(userActionTimer);
                userActionTimer = null;
            } else if (!userActionTimer) {
                userActionTimer = setInterval(
                    () => showMessage(config.waifuTips.idle, 6000, 9),
                    20000
                );
            }
        }, 1000);
        // 打开 DevTool.
        const devtools = () => { };
        console.log('%c', devtools);
        devtools.toString = () => showMessage(config.WaifuTips.devtool, 6000, 9);
        // 复制.
        window.addEventListener('copy', () => showMessage(config.waifuTips.copy, 6000, 9));
        // 回归页面.
        window.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                showMessage(config.waifuTips.visibilitychange, 6000, 9);
            }
        });
    }

    function showWelcomeMessage() {
        if (!config.enableTips) {
            return;
        }

        let text; let referrer;
        if (location.pathname === '/') {
            // 主页.
            const now = new Date();
            const month = now.getMonth() + 1;
            const date = now.getDate();
            let dateList = Array.isArray(config.waifuTips.seasons)
                ? config.waifuTips.seasons
                : Object
                    .entries(config.waifuTips.seasons)
                    .map(season => {
                        const [date, text] = season;
                        return { date, text };
                    });
            dateList = dateList
                .map(season => {
                    season.date = season.date
                        .split('-')
                        .map(fromOrTo => fromOrTo
                            .split('/')
                            .map(Number.parseInt))
                        .reduce((memo, monthAndDate) =>
                            memo.concat(monthAndDate), []);
                    return season;
                })
                .filter(season => [2, 4].includes(season.date.length))
                .sort((lhs, rhs) => (lhs.date[0] - rhs.date[0]) * 10 +
                    (lhs.date[1] - rhs.date[1]));
            text = dateList.find(season => {
                if (season.date.length === 2) {
                    return season.date[0] === month &&
                        season.date[1] === date;
                }

                if (season.date.length === 4) {
                    const isSameOrAfter = season.date[0] < month ||
                        (season.date[0] === month && season.date[1] <= date);
                    const isSameOrBefore = month < season.date[2] ||
                        (season.date[2] === month && date <= season.date[3]);
                    return isSameOrAfter && isSameOrBefore;
                }

                return false;
            });
            if (!text) {
                const hour = now.getHours();
                let timeList = Array.isArray(config.waifuTips.times)
                    ? config.waifuTips.times
                    : Object
                        .entries(config.waifuTips.times)
                        .map(time => {
                            const [hour, text] = time;
                            return { hour, text };
                        });
                timeList = timeList
                    .map(time => {
                        time.hour = String(time.hour || 0)
                            .split('-')
                            .map(Number.parseInt)
                            .sort((lhs, rhs) => lhs - rhs);
                        return time;
                    })
                    .filter(season => [1, 2].includes(season.date.length))
                    .sort((lhs, rhs) => lhs.hour[0] - rhs.hour[0]);
                text = timeList.find(time => {
                    if (time.hour.length === 1 || time.hour[0] === time.hour[1]) {
                        return time.hour[0] === hour;
                    }

                    if (time.hour.length === 2) {
                        return time.hour[0] <= hour && hour < time.hour[1];
                    }

                    return false;
                });
            }
        } else if (document.referrer !== '' && config.waifuTips.referrer) {
            // 跳转.
            const referrerUrl = new URL(document.referrer);
            referrer = referrer.hostname;
            const domain = referrerUrl.hostname.split('.')[1];
            if (location.hostname === referrerUrl.hostname) {
                text = config.waifuTips.welcome;
            } else if (config.waifuTips.referrer[domain]) {
                text = config.waifuTips.referrer[domain];
            } else if (config.waifuTips.referrer.default) {
                text = config.waifuTips.referrer.default;
            }
        } else {
            text = config.waifuTips.welcome;
        }

        if (text) {
            const title = document.title.split(' – ')[0];
            showMessage(text, 7000, 8, { title, referrer });
        }
    }

    async function loadModel(modelId, message) {
        const modelList = await loadModelList();
        if (modelList.models.length > 0) {
            modelId %= modelList.models.length;
            localStorage.setItem('modelId', modelId);
            const target = randomSelection(modelList.models[modelId]);
            loadlive2d('live2d', `${ config.cdnPath }model/${ target }/index.json`);
            showMessage(message, 4000, 10);
        }
    }

    async function loadOtherModel() {
        const modelList = await loadModelList();
        if (modelList.models.length > 0) {
            let modelId = Number.parseInt(localStorage.getItem('modelId')) || 0;
            modelId = (modelId + 1) % modelList.models.length;
            const text = modelList.messages
                ? modelList.messages[modelId]
                : undefined;
            loadModel(modelId, text);
        }
    }

    (async function initModel() {
        const modelId = Number.parseInt(localStorage.getItem('modelId')) || 0;
        await loadModel(modelId);
        await Promise.all([
            registerWaifuToolEventListener(),
            registerDefaultWaifuTips()
        ]);
        await showWelcomeMessage();
    })();
}

async function initWidget(config) {
    const waifuToggleHtml = '<div id="waifu-toggle"><span>看板娘</span></div>';
    document.body.insertAdjacentHTML('beforeend', waifuToggleHtml);
    const toggle = document.getElementById('waifu-toggle');
    toggle.addEventListener('click', () => {
        toggle.classList.remove('waifu-toggle-active');
        if (toggle.getAttribute('first-time')) {
            loadWidget(config);
            toggle.removeAttribute('first-time');
        } else {
            localStorage.removeItem('waifu-display');
            document.getElementById('waifu').style.display = '';
            setTimeout(() => {
                document.getElementById('waifu').style.bottom = 0;
            }, 0);
        }
    });
    if (localStorage.getItem('waifu-display') &&
        Date.now() - localStorage.getItem('waifu-display') <= 86400000) {
        toggle.setAttribute('first-time', true);
        setTimeout(() => toggle.classList.add('waifu-toggle-active'), 0);
    } else {
        loadWidget(config);
    }
}

function loadExternalResource(url, type) {
    return new Promise((resolve, reject) => {
        let tag;
        if (type === 'css') {
            tag = document.createElement('link');
            tag.rel = 'stylesheet';
            tag.href = url;
        } else if (type === 'js') {
            tag = document.createElement('script');
            tag.src = url;
        }

        if (tag) {
            tag.onload = () => resolve(url);
            tag.onerror = () => reject(url);
            document.head.appendChild(tag);
        }
    });
}

if (screen.width >= 768) {
    const config = {
        cdnPath: '/'
    };
    Promise.all([
        loadExternalResource(`${ config.cdnPath }waifu.css`, 'css'),
        loadExternalResource(`${ config.cdnPath }live2d.min.js`, 'js')
    ]).then(() => initWidget(config));
}
