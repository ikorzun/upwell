/*
 * Upwell on CrazyGames: the game's platform calls (see `ads` in src/game.js) answered with the CrazyGames SDK v3.
 * The CrazyGames build (tools/crazygames/build.mjs) loads the SDK and then this file in the page's head, as window.bridge.
 *
 * - initialize()          SDK.init(), then loadingStart (the game's files are in, its save and type still to come). No SDK (a
 *                         blocker, another domain): rejected at once, and the game goes on without the platform.
 * - platform.sendMessage  game_ready → loadingStop. gameplayStart / gameplayStop come from the game's state (the tracker below).
 * - advertisement         interstitial → requestAd('midgame'), rewarded → requestAd('rewarded'); none in a Basic Launch (CrazyGames shows
 *                         no ads there), so no rewarded button; one ad at a time; while one plays the game is held and silent.
 * - platform.language     the SDK's systemInfo.locale.
 * - sound                 off while an ad plays and while CrazyGames' «mute audio» setting is on.
 * - storage               the SDK's Data module (the player's account), else the browser's localStorage (the module off for the game,
 *                         or no SDK); the game writes the platform's storage alone, so it must keep what it is given.
 * - server time, boards   none.
 */
(function () {
  'use strict';
  var EVENT_NAME = { AUDIO_STATE_CHANGED: 'audio_state_changed', PAUSE_STATE_CHANGED: 'pause_state_changed',
    INTERSTITIAL_STATE_CHANGED: 'interstitial_state_changed', REWARDED_STATE_CHANGED: 'rewarded_state_changed' };

  var listeners = {};
  function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); }
  function off(name, fn) { listeners[name] = (listeners[name] || []).filter(function (f) { return f !== fn; }); }
  function emit(name, value) {
    (listeners[name] || []).slice().forEach(function (fn) { try { fn(value); } catch (e) { setTimeout(function () { throw e; }); } });
  }
  function call(fn) { try { return fn(); } catch (e) { return undefined; } }   // a refused call never stops the game

  var sdk = null, starting = null, adShowing = false, adAsked = false, adsOn = false, muted = false;

  // ── Gameplay: gameplayStart / gameplayStop from the game's own state (the Poki build's tracker, tools/poki/poki.js). Playing = a level
  // in play (game.state 'play') in a visible page; the first start waits for the player's first input; each change said once; nothing
  // while an ad plays (its end says the change, if any).
  var tracker = (function () {
    var said = false, seenInput = false, hold = false, onChange = function () {};
    function state() { try { return game.state; } catch (e) { return null; } }   // (game.js's global; null before it runs)
    function playing() { return state() === 'play' && !document.hidden; }
    function sync() {
      if (hold) return;
      var now = playing() && seenInput;
      if (now !== said && (now || said)) { said = now; onChange(now); }
    }
    ['keydown', 'pointerdown', 'touchstart'].forEach(function (type) {
      window.addEventListener(type, function () { if (!seenInput && !hold) { seenInput = true; setTimeout(sync, 0); } }, { capture: true, passive: true });
    });
    document.addEventListener('visibilitychange', sync);
    (function loop() { sync(); requestAnimationFrame(loop); })();
    return {
      sync: sync,
      hold: function (h) { hold = h; if (!h) sync(); },
      onChange: function (fn) { onChange = fn; },
    };
  })();
  tracker.onChange(function (play) { if (sdk) call(function () { play ? sdk.game.gameplayStart() : sdk.game.gameplayStop(); }); });

  function sound() { emit(EVENT_NAME.AUDIO_STATE_CHANGED, !adShowing && !muted); }

  // ── Ads: one at a time; the game's state events first, then the pause and the sound, as the game expects them.
  function adBreak(kind) {
    var ev = kind === 'rewarded' ? EVENT_NAME.REWARDED_STATE_CHANGED : EVENT_NAME.INTERSTITIAL_STATE_CHANGED;
    if (adAsked) return;   // a second ask while one is out: turned away without a word (a 'failed' would end the first one's wait)
    if (!sdk || !adsOn) { emit(ev, 'failed'); return; }
    adAsked = true;
    tracker.sync(); tracker.hold(true);   // the stop said before the break, if the game left play this very moment
    var opened = false, done = false;
    emit(ev, 'loading');
    function over(rewarded) {
      if (done) return;
      done = true; adAsked = adShowing = false;
      tracker.hold(false);   // (all of this one's own before its last event: the game may ask for the next ad on it)
      if (opened) {
        emit(EVENT_NAME.PAUSE_STATE_CHANGED, false); sound();
        if (rewarded) emit(ev, 'rewarded');
        emit(ev, 'closed');
      } else emit(ev, 'failed');   // no ad (too soon, a blocker, none to show): the game goes on at once
    }
    try {
      sdk.ad.requestAd(kind === 'rewarded' ? 'rewarded' : 'midgame', {
        adStarted: function () {
          if (opened || done) return;
          opened = adShowing = true;
          emit(ev, 'opened'); emit(EVENT_NAME.PAUSE_STATE_CHANGED, true); sound();
        },
        adFinished: function () { over(kind === 'rewarded'); },
        adError: function (err) {
          if (err && err.code === 'adsDisabled') adsOn = false;   // none this visit (a Basic Launch, kids mode): no more asks, no rewarded button
          over(false);
        },
      });
    } catch (e) { over(false); }
  }
  // Keys under an ad stay out of the game (a Space would press the button under it).
  window.addEventListener('keydown', function (e) { if (adShowing) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

  function data() { return sdk && call(function () { return sdk.data; }); }   // (the Data module, or nothing when it is off for the game)

  window.bridge = {
    EVENT_NAME: EVENT_NAME,
    initialize: function () {
      if (starting) return starting;
      var SDK = window.CrazyGames && window.CrazyGames.SDK;
      if (!SDK) return (starting = Promise.reject(new Error('CrazyGames SDK not loaded')));
      starting = Promise.resolve(call(function () { return SDK.init(); })).then(function () {
        if (SDK.environment === 'disabled') throw new Error('not on CrazyGames');
        sdk = SDK;
        call(function () { sdk.game.loadingStart(); });
        // Ads only in a Full Launch (CrazyGames shows none in a Basic one: a rewarded button there would do nothing). The SDK keeps the
        // launch in its ad module's init info; read where it is, and a first 'adsDisabled' turns ads off anyway.
        var flow = call(function () { return sdk.ad.initInfo.launchFlow; });
        adsOn = flow !== 'basic';
        muted = !!call(function () { return sdk.game.settings.muteAudio; });
        call(function () { sdk.game.addSettingsChangeListener(function (s) { muted = !!(s && s.muteAudio); sound(); }); });
        tracker.sync();
      });
      return starting;
    },
    platform: {
      id: 'crazygames',
      get language() { var l = sdk && call(function () { return sdk.user.systemInfo.locale; }); return typeof l === 'string' && l ? l : navigator.language || 'en'; },
      get isAudioEnabled() { return !adShowing && !muted; },
      get isPaused() { return adShowing; },
      on: on,
      sendMessage: function (m) {
        if (!sdk) return Promise.resolve();
        if (m === 'game_ready') call(function () { sdk.game.loadingStop(); });
        setTimeout(tracker.sync, 0);   // (once the game's step is over: a level built under a story card is not play)
        return Promise.resolve();
      },
      getServerTime: function () { return Promise.reject(new Error('not on CrazyGames')); },
    },
    storage: {
      get: function (keys) {
        var d = data();
        try { return Promise.resolve(keys.map(function (k) { var v = d ? d.getItem(k) : localStorage.getItem(k); return v == null ? null : v; })); }
        catch (e) { return Promise.reject(e); }   // (no localStorage, as in some private windows: the game keeps this visit only)
      },
      set: function (keys, values) {
        var d = data();
        try { keys.forEach(function (k, i) { if (d) d.setItem(k, values[i]); else localStorage.setItem(k, values[i]); }); return Promise.resolve(); }
        catch (e) { return Promise.reject(e); }
      },
    },
    advertisement: {
      get isInterstitialSupported() { return adsOn; },
      get isRewardedSupported() { return adsOn; },
      on: on,
      off: off,
      showInterstitial: function () { adBreak('interstitial'); },
      showRewarded: function () { adBreak('rewarded'); },
    },
    leaderboards: { type: 'not_available' },
    player: { id: null },
  };
})();
