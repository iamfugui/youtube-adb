'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(resolve(__dirname, '..', 'index.user.js'), 'utf8');
const start = source.indexOf('    let pendingOverlayResume = null;');
const end = source.indexOf('    let resumeVideo =', start);
assert.ok(start >= 0 && end > start, 'the userscript must contain the recovery helpers');
const recoverySource = source.slice(start, end);

// Execute the production helpers, with DOM events and time controlled by each test.
// Ad skipping is an external dependency here; its behavior has separate tests.
function createFixture({ showingAd = false, playMode = 'resolve' } = {}) {
    let now = 0;
    let nextTimerId = 1;
    let ad = showingAd;
    let currentPlayMode = playMode;
    let pendingPlay;
    const timers = new Map();
    const listeners = new Map();
    const playCalls = [];
    const location = { href: 'https://www.youtube.com/watch?v=first&index=1' };

    function makeVideo(overrides = {}) {
        return {
            isConnected: true,
            readyState: 1,
            currentTime: 1,
            paused: false,
            ended: false,
            closest() { return null; },
            play() {
                playCalls.push(now);
                if (currentPlayMode === 'throw') throw new Error('play failed synchronously');
                if (currentPlayMode === 'reject') return Promise.reject(new Error('autoplay denied'));
                if (currentPlayMode === 'pending') {
                    return new Promise((resolvePlay) => { pendingPlay = resolvePlay; });
                }
                this.paused = false;
                return Promise.resolve();
            },
            ...overrides,
        };
    }

    let video = makeVideo();
    const playButton = {
        closest(selector) {
            return selector === '.ytp-play-button' || selector.startsWith('button,') ? this : null;
        },
    };
    const body = { closest() { return null; } };
    let player = {
        isConnected: true,
        classList: { contains(name) { return name === 'ad-showing' && ad; } },
        querySelector(selector) {
            if (selector === 'video.html5-main-video') return video;
            return null;
        },
        contains(node) { return node === video || node === playButton; },
    };
    const document = {
        querySelector(selector) { return selector === '#movie_player' ? player : null; },
        addEventListener(name, callback) {
            if (!listeners.has(name)) listeners.set(name, new Set());
            listeners.get(name).add(callback);
        },
        removeEventListener(name, callback) {
            listeners.get(name)?.delete(callback);
            if (listeners.get(name)?.size === 0) listeners.delete(name);
        },
    };

    const context = vm.createContext({
        URL,
        location,
        document,
        performance: { now: () => now },
        setTimeout(callback, delay) {
            const id = nextTimerId++;
            timers.set(id, { callback, at: now + delay });
            return id;
        },
        clearTimeout(id) { timers.delete(id); },
    });
    vm.runInContext(`
        let skipAdTimer = null;
        function skipAd() {}
        ${recoverySource}
        globalThis.recovery = {
            armEnforcementRecovery,
            get pending() { return pendingOverlayResume; },
            get observed() { return enforcementObserved; },
            get suppressed() { return manualSuppressedIdentity; }
        };
    `, context);
    const recovery = context.recovery;
    const countListeners = () => [...listeners.values()].reduce((sum, entries) => sum + entries.size, 0);
    const baselineListeners = countListeners();
    const enforcementNode = {
        matches(selector) { return selector === 'ytd-enforcement-message-view-model'; },
        querySelector() { return null; },
    };

    function emit(type, overrides = {}) {
        const event = {
            type,
            target: video,
            isTrusted: true,
            button: 0,
            key: 'Escape',
            repeat: false,
            ctrlKey: false,
            altKey: false,
            metaKey: false,
            ...overrides,
        };
        // DOM dispatch does not invoke a listener removed earlier during this event.
        for (const callback of [...(listeners.get(type) || [])]) {
            if (listeners.get(type)?.has(callback)) callback(event);
        }
    }

    async function advance(milliseconds) {
        const target = now + milliseconds;
        let iterations = 0;
        while (true) {
            let next;
            for (const [id, timer] of timers) {
                if (timer.at <= target && (!next || timer.at < next.timer.at)) next = { id, timer };
            }
            if (!next) break;
            assert.ok(++iterations < 1000, 'timer callbacks must remain bounded');
            now = next.timer.at;
            timers.delete(next.id);
            next.timer.callback();
            await Promise.resolve();
        }
        now = target;
        await Promise.resolve();
    }

    return {
        recovery,
        playCalls,
        timers,
        body,
        playButton,
        emit,
        advance,
        get video() { return video; },
        get player() { return player; },
        arm() { recovery.armEnforcementRecovery(enforcementNode); },
        armUnrelated() {
            recovery.armEnforcementRecovery({ matches: () => false, querySelector: () => null });
        },
        setAd(value) { ad = value; },
        setHref(value) { location.href = value; },
        replaceVideo(overrides) { video = makeVideo(overrides); },
        replacePlayer() { player = { ...player }; },
        settlePlay() { pendingPlay?.(); },
        assertClean() {
            assert.equal(recovery.pending, null);
            assert.equal(timers.size, 0, 'no recovery timer remains');
            assert.equal(countListeners(), baselineListeners, 'temporary listeners are removed');
        },
    };
}

test('metadata cannot enable recovery before an actual enforcement notice', async () => {
    const fixture = createFixture();
    fixture.armUnrelated();
    fixture.video.paused = true;
    fixture.emit('loadedmetadata');
    fixture.emit('pause');
    await fixture.advance(12000);
    assert.equal(fixture.recovery.observed, false);
    assert.deepEqual(fixture.playCalls, []);
    fixture.assertClean();
});

test('after enforcement, metadata can recover the next SPA video without a second notice', async () => {
    const fixture = createFixture();
    fixture.arm();
    fixture.emit('yt-navigate-start');
    fixture.setHref('https://www.youtube.com/watch?v=second&index=2');
    fixture.replaceVideo({ paused: true });
    fixture.emit('loadedmetadata');
    await fixture.advance(150);
    assert.equal(fixture.playCalls.length, 1);
    fixture.emit('yt-navigate-start');
    fixture.assertClean();
});

test('quality metadata on the same watch cannot restart an expired recovery', async () => {
    const fixture = createFixture();
    fixture.arm();
    await fixture.advance(5400);
    fixture.assertClean();
    fixture.replaceVideo({ paused: true });
    fixture.emit('loadedmetadata');
    await fixture.advance(1000);
    assert.deepEqual(fixture.playCalls, []);
    fixture.assertClean();
});

test('the fixed ten-second limit survives duplicate notices and waiting ads', async () => {
    const fixture = createFixture({ showingAd: true });
    fixture.video.ended = true;
    fixture.video.currentTime = 20;
    fixture.video.paused = true;
    fixture.arm();
    const pending = fixture.recovery.pending;
    for (let second = 0; second < 9; second++) {
        await fixture.advance(1000);
        fixture.arm();
        assert.equal(fixture.recovery.pending, pending);
        assert.equal(pending.hardDeadline, 10000);
        assert.equal(fixture.timers.size, 1);
    }
    assert.deepEqual(fixture.playCalls, []);
    await fixture.advance(1100);
    fixture.assertClean();
});

test('content has a five-second window that repeated metadata cannot extend', async () => {
    const fixture = createFixture();
    fixture.arm();
    await fixture.advance(150);
    assert.equal(fixture.recovery.pending.contentDeadline, 5150);
    fixture.emit('loadedmetadata');
    const deadline = fixture.recovery.pending.contentDeadline;
    await fixture.advance(1000);
    fixture.emit('loadedmetadata');
    assert.equal(fixture.recovery.pending.contentDeadline, deadline);
    await fixture.advance(4400);
    assert.deepEqual(fixture.playCalls, []);
    fixture.assertClean();
});

test('content starting late in an ad wait cannot extend the overall ten-second limit', async () => {
    const fixture = createFixture({ showingAd: true });
    fixture.arm();
    await fixture.advance(9000);
    fixture.setAd(false);
    fixture.replaceVideo();
    fixture.emit('loadedmetadata');
    assert.equal(fixture.recovery.pending.contentDeadline, 10000);
    await fixture.advance(1100);
    fixture.assertClean();
});

test('an ended ad is waited out without play, then a native content pause at 2.5s is recovered', async () => {
    const fixture = createFixture({ showingAd: true });
    fixture.video.ended = true;
    fixture.video.currentTime = 20;
    fixture.video.paused = true;
    fixture.arm();
    await fixture.advance(2000);
    assert.ok(fixture.recovery.pending);
    assert.deepEqual(fixture.playCalls, []);
    fixture.setAd(false);
    fixture.replaceVideo({ readyState: 0, currentTime: 0 });
    await fixture.advance(150);
    assert.deepEqual(fixture.playCalls, []);
    fixture.video.readyState = 1;
    fixture.emit('loadedmetadata');
    await fixture.advance(2500);
    assert.deepEqual(fixture.playCalls, [], 'playing content is left alone');
    fixture.video.currentTime = 2.5;
    fixture.video.paused = true;
    fixture.emit('pause');
    await Promise.resolve();
    assert.equal(fixture.playCalls.length, 1);
    fixture.emit('yt-navigate-start');
    fixture.assertClean();
});

test('recovery attempts are separated by at least 500ms and stop at three', async () => {
    const fixture = createFixture();
    fixture.arm();
    fixture.video.paused = true;
    await fixture.advance(150);
    for (let attempt = 0; attempt < 3; attempt++) {
        fixture.video.paused = true;
        fixture.emit('pause');
        await fixture.advance(600);
    }
    assert.equal(fixture.playCalls.length, 3);
    for (let index = 1; index < fixture.playCalls.length; index++) {
        assert.ok(fixture.playCalls[index] - fixture.playCalls[index - 1] >= 500);
    }
    fixture.assertClean();
});

test('an unresolved play promise prevents overlapping attempts', async () => {
    const fixture = createFixture({ playMode: 'pending' });
    fixture.arm();
    fixture.video.paused = true;
    await fixture.advance(2500);
    assert.equal(fixture.playCalls.length, 1);
    assert.equal(fixture.recovery.pending.inFlight, true);
    fixture.video.paused = false;
    fixture.settlePlay();
    await Promise.resolve();
    await fixture.advance(3000);
    assert.equal(fixture.playCalls.length, 1);
    fixture.assertClean();
});

for (const playMode of ['reject', 'throw']) {
    test(`a ${playMode} from play ends recovery and cleans up`, async () => {
        const fixture = createFixture({ playMode });
        fixture.arm();
        fixture.video.paused = true;
        await fixture.advance(150);
        assert.equal(fixture.playCalls.length, 1);
        fixture.assertClean();
        await fixture.advance(12000);
        assert.equal(fixture.playCalls.length, 1);
    });
}

test('a trusted manual pause is preserved through later metadata and repeated notices', async () => {
    const fixture = createFixture();
    fixture.arm();
    fixture.emit('keydown', { target: fixture.body, key: 'k' });
    fixture.video.paused = true;
    assert.ok(fixture.recovery.suppressed);
    fixture.emit('pause');
    fixture.emit('loadedmetadata');
    fixture.arm();
    await fixture.advance(12000);
    assert.deepEqual(fixture.playCalls, []);
    fixture.assertClean();
});

test('untrusted input does not suppress the native-pause recovery', async () => {
    const fixture = createFixture();
    fixture.arm();
    fixture.emit('keydown', { target: fixture.body, key: 'k', isTrusted: false });
    fixture.video.paused = true;
    fixture.emit('pause');
    await Promise.resolve();
    assert.equal(fixture.playCalls.length, 1);
    fixture.emit('yt-navigate-start');
    fixture.assertClean();
});

test('video replacement cancels instead of playing the replacement', async () => {
    const fixture = createFixture();
    fixture.arm();
    await fixture.advance(150);
    fixture.replaceVideo({ paused: true });
    await fixture.advance(150);
    assert.deepEqual(fixture.playCalls, []);
    fixture.assertClean();
});

for (const change of ['navigation event', 'watch identity', 'player replacement', 'player disconnect']) {
    test(`${change} cancels pending recovery`, async () => {
        const fixture = createFixture({ showingAd: true });
        fixture.arm();
        if (change === 'navigation event') fixture.emit('yt-navigate-start');
        if (change === 'watch identity') fixture.setHref('https://www.youtube.com/watch?v=second');
        if (change === 'player replacement') fixture.replacePlayer();
        if (change === 'player disconnect') fixture.player.isConnected = false;
        await fixture.advance(150);
        assert.deepEqual(fixture.playCalls, []);
        fixture.assertClean();
    });
}

test('playlist index changes alone do not cancel the same watch', async () => {
    const fixture = createFixture({ showingAd: true });
    fixture.arm();
    const pending = fixture.recovery.pending;
    fixture.setHref('https://www.youtube.com/watch?v=first&index=9');
    await fixture.advance(150);
    assert.equal(fixture.recovery.pending, pending);
    fixture.emit('yt-navigate-start');
    fixture.assertClean();
});
