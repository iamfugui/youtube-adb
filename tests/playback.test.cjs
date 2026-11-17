const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const file = path.join(__dirname, "..", "index.user.js");
const source = fs.readFileSync(file, "utf8");
const skip = source.slice(
  source.indexOf("    let skipAdTimer = null;"),
  source.indexOf("\n    /**", source.indexOf("    let skipAdTimer = null;")),
);
const helper = source.slice(
  source.indexOf("    let pendingOverlayResume = null;"),
  source.indexOf("    let resumeVideo ="),
);
function fixture({
  ad = true,
  button = false,
  overlay = true,
  duration = 20,
  paused = true,
  ended = false,
  currentTime = 2,
  effectiveClick = false,
  transitionOnSeek = false,
  rejectPlay = false,
} = {}) {
  let now = 0,
    id = 1,
    adActive = ad,
    clicks = 0,
    plays = 0,
    seeks = [],
    timers = new Map(),
    listeners = new Map();
  const location = { href: "https://www.youtube.com/watch?v=one" };
  let time = currentTime;
  const video = {
    isConnected: true,
    readyState: 1,
    duration,
    paused,
    ended,
    closest() {
      return null;
    },
    get currentTime() {
      return time;
    },
    set currentTime(t) {
      seeks.push(t);
      time = t;
      if (transitionOnSeek) adActive = false;
    },
    play() {
      plays++;
      if (rejectPlay) return Promise.reject(new Error("blocked"));
      this.paused = false;
      return Promise.resolve();
    },
  };
  const playButton = {
    closest(selector) {
      return selector === ".ytp-play-button" || selector.includes("button")
        ? this
        : null;
    },
  };
  const volume = {
    closest(selector) {
      return selector === ".ytp-play-button"
        ? null
        : selector.includes("button")
          ? this
          : null;
    },
  };
  const body = { closest: () => null };
  const editable = {
    closest: (selector) => (selector.includes("input") ? editable : null),
  };
  const skipButton = {
    click() {
      clicks++;
      if (effectiveClick) adActive = false;
    },
  };
  let player = {
    isConnected: true,
    classList: { contains: (n) => n === "ad-showing" && adActive },
    contains: (n) => n === playButton || n === video,
    querySelector(s) {
      if (s === "video" || s === "video.html5-main-video") return video;
      if (s === ".ad-showing") return null;
      if (s.startsWith(".ytp-ad-skip-button"))
        return button ? skipButton : null;
      return overlay ? {} : null;
    },
  };
  const doc = {
    querySelector(s) {
      return s === "#movie_player"
        ? player
        : s === ".ad-showing" && adActive
          ? player
          : null;
    },
    addEventListener(n, fn) {
      if (!listeners.has(n)) listeners.set(n, new Set());
      listeners.get(n).add(fn);
    },
    removeEventListener(n, fn) {
      listeners.get(n)?.delete(fn);
      if (!listeners.get(n)?.size) listeners.delete(n);
    },
  };
  const context = vm.createContext({
    document: doc,
    URL,
    location,
    window: { location },
    performance: { now: () => now },
    setTimeout(fn, ms) {
      const i = id++;
      timers.set(i, { fn, at: now + ms });
      return i;
    },
    clearTimeout: (i) => timers.delete(i),
    log: () => {},
    nativeTouch: () => {},
    video: null,
  });
  vm.runInContext(
    skip +
      "\n" +
      helper +
      "\nglobalThis.api={skipAd,armEnforcementRecovery,get explicit(){return explicitManualPauseIdentity},get suppressed(){return manualSuppressedIdentity},get pending(){return pendingOverlayResume},get skipTimer(){return skipAdTimer}}",
    context,
  );
  const api = context.api;
  const notice = { matches: () => true, querySelector: () => null };
  function emit(type, props = {}) {
    const event = {
      type,
      isTrusted: true,
      target: video,
      button: 0,
      key: "Escape",
      repeat: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      ...props,
    };
    for (const fn of [...(listeners.get(type) || [])])
      if (listeners.get(type)?.has(fn)) fn(event);
  }
  async function advance(ms) {
    const end = now + ms;
    let loops = 0;
    while (true) {
      let pick;
      for (const [i, t] of timers)
        if (t.at <= end && (!pick || t.at < pick.t.at)) pick = { i, t };
      if (!pick) break;
      if (++loops > 1000) throw new Error("timer loop");
      now = pick.t.at;
      timers.delete(pick.i);
      pick.t.fn();
      await Promise.resolve();
    }
    now = end;
    await Promise.resolve();
  }
  return {
    api,
    video,
    playButton,
    volume,
    body,
    editable,
    emit,
    advance,
    timers,
    listeners,
    arm() {
      api.armEnforcementRecovery(notice);
    },
    get clicks() {
      return clicks;
    },
    get plays() {
      return plays;
    },
    get seeks() {
      return seeks;
    },
    get adActive() {
      return adActive;
    },
    setAd(v) {
      adActive = v;
    },
  };
}

test("Auto-paused overlay ad: seek 19.9 then play confirmed ad", async () => {
  const f = fixture();
  f.api.skipAd();
  assert.deepEqual(f.seeks, [19.9]);
  assert.equal(f.plays, 1);
});
test("Seek transitions to normal content: no play after transition", async () => {
  const f = fixture({ transitionOnSeek: true });
  f.api.skipAd();
  assert.deepEqual(f.seeks, [19.9]);
  assert.equal(f.plays, 0);
  await f.advance(500);
  assert.equal(f.seeks.length, 1);
  assert.equal(f.plays, 0);
});
test("Button initial click never seek/play same call", async () => {
  const f = fixture({ button: true });
  f.api.skipAd();
  assert.equal(f.clicks, 1);
  assert.equal(f.seeks.length, 0);
  assert.equal(f.plays, 0);
  await f.advance(500);
  assert.deepEqual(f.seeks, [19.9]);
  assert.equal(f.plays, 1);
});
test("Effective button transition: stale retry never touches content", async () => {
  const f = fixture({ button: true, effectiveClick: true });
  f.api.skipAd();
  await f.advance(500);
  assert.equal(f.clicks, 1);
  assert.equal(f.seeks.length, 0);
  assert.equal(f.plays, 0);
  assert.equal(f.timers.size, 0);
});
test("Manual pause play-button: no mute/click/seek/play", async () => {
  const f = fixture({ button: true, paused: false });
  f.emit("pointerdown", { target: f.playButton });
  f.video.paused = true;
  f.api.skipAd();
  assert(f.api.explicit);
  assert.equal(f.clicks, 0);
  assert.equal(f.seeks.length, 0);
  assert.equal(f.plays, 0);
  assert.equal(f.video.muted, undefined);
});
test("Manual pause VIDEO: no automatic ad finishing", async () => {
  const f = fixture({ paused: false });
  f.emit("pointerdown");
  f.video.paused = true;
  f.api.skipAd();
  assert.equal(f.seeks.length, 0);
  assert.equal(f.plays, 0);
});
for (const key of ["k", " "])
  test(
    "Manual " + JSON.stringify(key) + " pause: no automatic finishing",
    async () => {
      const f = fixture({ paused: false });
      f.emit("keydown", { key, target: f.body });
      f.video.paused = true;
      f.api.skipAd();
      assert(f.api.explicit);
      assert.equal(f.seeks.length, 0);
      assert.equal(f.plays, 0);
    },
  );
test("Play clears explicit+conservative suppression and schedules only delayed retry", async () => {
  const f = fixture({ paused: false });
  f.arm();
  f.emit("pointerdown", { target: f.playButton });
  f.video.paused = true;
  f.emit("pointerdown", { target: f.playButton });
  assert.equal(f.api.explicit, "");
  assert.equal(f.api.suppressed, "");
  assert.equal(f.plays, 0);
  assert.equal(f.seeks.length, 0);
  assert.equal(f.timers.size, 1);
  f.video.paused = false;
  await f.advance(500);
  assert.deepEqual(f.seeks, [19.9]);
});
test("Volume interaction during recovery only suppresses recovery, not skipAd", async () => {
  const f = fixture();
  f.arm();
  f.emit("pointerdown", { target: f.volume });
  assert(f.api.suppressed);
  assert.equal(f.api.explicit, "");
  f.api.skipAd();
  assert.equal(f.plays, 1);
  assert.deepEqual(f.seeks, [19.9]);
});
test("Editable K and modifier-K do not imply manual pause", async () => {
  const f = fixture({ paused: false });
  f.emit("keydown", { key: "k", target: f.editable });
  assert.equal(f.api.explicit, "");
  f.emit("keydown", { key: "k", ctrlKey: true, target: f.body });
  assert.equal(f.api.explicit, "");
});
test("Space focused on native Play button preserves pause and resume intent", async () => {
  const f = fixture({ paused: false });
  f.arm();
  f.emit("keydown", { key: " ", target: f.playButton });
  f.video.paused = true;
  assert(f.api.explicit);
  assert(f.api.suppressed);
  f.api.skipAd();
  assert.equal(f.plays, 0);
  assert.equal(f.seeks.length, 0);
  f.emit("keydown", { key: " ", target: f.playButton });
  assert.equal(f.api.explicit, "");
  assert.equal(f.api.suppressed, "");
  assert.equal(f.seeks.length, 0);
  f.video.paused = false;
  await f.advance(500);
  assert.deepEqual(f.seeks, [19.9]);
  assert.equal(f.plays, 0);
});
test("Enter only focused Play button preserves pause and resume", async () => {
  const f = fixture({ paused: false });
  f.emit("keydown", { key: "Enter", target: f.volume });
  assert.equal(f.api.explicit, "");
  f.emit("keydown", { key: "Enter", target: f.playButton });
  f.video.paused = true;
  assert(f.api.explicit);
  f.api.skipAd();
  assert.equal(f.seeks.length, 0);
  assert.equal(f.plays, 0);
  f.emit("keydown", { key: "Enter", target: f.playButton });
  assert.equal(f.api.explicit, "");
  assert.equal(f.api.suppressed, "");
  f.video.paused = false;
  await f.advance(500);
  assert.deepEqual(f.seeks, [19.9]);
});
test("Space on unrelated button is not player toggle", async () => {
  const f = fixture({ paused: false });
  f.emit("keydown", { key: " ", target: f.volume });
  assert.equal(f.api.explicit, "");
});
test("Untrusted click cannot set or clear pause intent", async () => {
  const f = fixture({ paused: false });
  f.emit("pointerdown", { target: f.playButton, isTrusted: false });
  assert.equal(f.api.explicit, "");
});
test("Ended ad never seeks or plays", async () => {
  const f = fixture({ ended: true });
  f.api.skipAd();
  await f.advance(500);
  assert.equal(f.seeks.length, 0);
  assert.equal(f.plays, 0);
});
test("Near-end auto-paused ad resumes without rewind or repeated play", async () => {
  const f = fixture({ currentTime: 19.9 });
  f.api.skipAd();
  assert.equal(f.seeks.length, 0);
  assert.equal(f.plays, 1);
  await f.advance(1500);
  assert.equal(f.seeks.length, 0);
  assert.equal(f.plays, 1);
});
test("No ad marker: no media writes", async () => {
  const f = fixture({ ad: false });
  f.api.skipAd();
  assert.equal(f.plays, 0);
  assert.equal(f.seeks.length, 0);
  assert.equal(f.timers.size, 0);
});
test("Infinity button still clicks, never seeks/plays", async () => {
  const f = fixture({ duration: Infinity, button: true });
  f.api.skipAd();
  await f.advance(500);
  assert.equal(f.clicks, 2);
  assert.equal(f.seeks.length, 0);
  assert.equal(f.plays, 0);
});
test("25 repeated calls maintain single 500ms timer", async () => {
  const f = fixture({ button: true });
  for (let i = 0; i < 25; i++) f.api.skipAd();
  assert.equal(f.timers.size, 1);
  await f.advance(500);
  assert.equal(f.timers.size, 1);
});
test("Rejected ad play caught, no concurrent repeated seeks", async () => {
  const f = fixture({ rejectPlay: true });
  f.api.skipAd();
  await Promise.resolve();
  await f.advance(500);
  assert.equal(f.seeks.length, 1);
  assert.equal(f.plays, 2);
});
test("Doubleclick fullscreen while playing clears false VIDEO pause intent", async () => {
  const f = fixture({ paused: false });
  f.emit("pointerdown");
  assert(f.api.explicit);
  f.emit("dblclick");
  assert.equal(f.api.explicit, "");
  assert.equal(f.api.suppressed, "");
});
