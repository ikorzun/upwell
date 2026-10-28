/*
 * Upwell on Poki: the game's platform calls (the Playgama Bridge's, see `ads` in src/game.js) answered with the Poki SDK.
 * The Poki build (tools/poki/build.mjs) loads Poki's SDK and then this file where the Bridge was, as window.bridge.
 *
 * - initialize()          PokiSDK.init(); a failed init still plays, as Poki's docs ask. No SDK (a blocker): rejected at once, the
 *                         game goes on without ads and says nothing about it.
 * - platform.sendMessage  game_ready → gameLoadingFinished; level_started / completed / failed → Poki's own game events (measure).
 *                         gameplayStart / gameplayStop come from the game's state instead (the tracker below), not from these.
 * - advertisement         interstitial → commercialBreak, rewarded → rewardedBreak; one ad at a time; while one plays the game is
 *                         held and silent (pause and audio events) and its keys are kept from the game (Poki draws the ad in this page).
 * - platform.language     PokiSDK.getLanguage().
 * - storage, server time  none: the game keeps its save in localStorage, which Poki syncs to the cloud for a logged-in player.
 * - leaderboards          none.
 * - Poki's pill on a phone is moved under the hearts (PILL).
 */
(function () {
  'use strict';
  var EVENT_NAME = { AUDIO_STATE_CHANGED: 'audio_state_changed', PAUSE_STATE_CHANGED: 'pause_state_changed',
    INTERSTITIAL_STATE_CHANGED: 'interstitial_state_changed', REWARDED_STATE_CHANGED: 'rewarded_state_changed' };
  var PILL = [0, 64];   // Poki's pill (62×46 at the game's top left, 24 px down by default) under the HUD's hearts: movePill(topPercent, topPx)

  var listeners = {};
  function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); }
  function off(name, fn) { listeners[name] = (listeners[name] || []).filter(function (f) { return f !== fn; }); }
  function emit(name, value) {
    (listeners[name] || []).slice().forEach(function (fn) { try { fn(value); } catch (e) { setTimeout(function () { throw e; }); } });
  }
  function call(fn) { try { return fn(); } catch (e) { return undefined; } }   // a refused call never stops the game

  var sdk = null, starting = null, adShowing = false, adAsked = false;

  // ── Gameplay: Poki's gameplayStart / gameplayStop from the game's own state (no Poki calls in this block: the CrazyGames build may
  // take it as it is). Playing = a level in play (game.state 'play') in a visible page. The first start waits for the player's first
  // input (a key, a press, a touch: Poki's «not on load»); each change is said once (never two starts or two stops in a row, never a stop
  // before the first start); nothing while an ad plays (its end says the change, if any).
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
      hold: function (h) { hold = h; if (!h) sync(); },   // an ad up: nothing said till it is over
      onChange: function (fn) { onChange = fn; },
    };
  })();
  tracker.onChange(function (play) { if (sdk) call(function () { play ? sdk.gameplayStart() : sdk.gameplayStop(); }); });

  // ── Ads: one at a time; the game's state events first, then the pause and the sound, as the Bridge sends them.
  function adBreak(kind, run) {
    var ev = kind === 'rewarded' ? EVENT_NAME.REWARDED_STATE_CHANGED : EVENT_NAME.INTERSTITIAL_STATE_CHANGED;
    if (adAsked) return;   // a second ask while one is out: turned away without a word (a 'failed' would end the first one's wait)
    if (!sdk) { emit(ev, 'failed'); return; }
    adAsked = true;
    tracker.sync(); tracker.hold(true);   // the stop said before the break, if the game left play this very moment
    var opened = false;
    emit(ev, 'loading');
    function started() {
      if (opened) return;
      opened = adShowing = true;
      emit(ev, 'opened'); emit(EVENT_NAME.PAUSE_STATE_CHANGED, true); emit(EVENT_NAME.AUDIO_STATE_CHANGED, false);
    }
    function over(rewarded) {
      adAsked = false;
      if (opened) {
        adShowing = false;
        if (rewarded) emit(ev, 'rewarded');
        emit(ev, 'closed'); emit(EVENT_NAME.PAUSE_STATE_CHANGED, false); emit(EVENT_NAME.AUDIO_STATE_CHANGED, true);
      } else emit(ev, 'failed');   // no ad (too soon, a blocker, none to show): the game goes on at once
      tracker.hold(false);
    }
    var answer;
    try { answer = run(started); } catch (e) { over(false); return; }
    Promise.resolve(answer).then(function (ok) { over(kind === 'rewarded' && ok === true); }, function () { over(false); });
  }
  // Keys under an ad stay out of the game (a Space would press the button under it); Poki's own controls are left alone.
  window.addEventListener('keydown', function (e) {
    if (adShowing && !(e.target && e.target.closest && e.target.closest('[id^="poki"], [class*="poki"]'))) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);

  // Poki's own game events: each level's start and its one outcome (developers.poki.com/guide/game-events).
  function measure(m, data) {
    var k = { level_started: 'start', level_completed: 'complete', level_failed: 'fail' }[m];
    if (!k || !data || typeof sdk.measure !== 'function') return;
    call(function () { sdk.measure('level', data.world + '-' + data.level, k); });
  }

  window.bridge = {
    EVENT_NAME: EVENT_NAME,
    initialize: function () {
      if (starting) return starting;
      var SDK = window.PokiSDK;
      if (!SDK) return (starting = Promise.reject(new Error('Poki SDK not loaded')));
      starting = Promise.resolve(call(function () { return SDK.init(); })).catch(function () {}).then(function () {
        sdk = SDK;
        call(function () { if (typeof sdk.movePill === 'function') sdk.movePill(PILL[0], PILL[1]); });
        tracker.sync();
      });
      return starting;
    },
    platform: {
      id: 'poki',
      get language() { var l = sdk && call(function () { return sdk.getLanguage(); }); return typeof l === 'string' && l ? l : navigator.language || 'en'; },
      get isAudioEnabled() { return !adShowing; },
      get isPaused() { return adShowing; },
      on: on,
      sendMessage: function (m, data) {
        if (!sdk) return Promise.resolve();
        if (m === 'game_ready') call(function () { sdk.gameLoadingFinished(); });
        else measure(m, data);
        setTimeout(tracker.sync, 0);   // (once the game's step is over: a level built under a story card is not play)
        return Promise.resolve();
      },
      getServerTime: function () { return Promise.reject(new Error('not on Poki')); },
    },
    storage: {
      get: function () { return Promise.reject(new Error('not on Poki')); },   // the game's own localStorage instead
      set: function () { return Promise.reject(new Error('not on Poki')); },
    },
    advertisement: {
      isInterstitialSupported: true,
      isRewardedSupported: true,
      on: on,
      off: off,
      showInterstitial: function () { adBreak('interstitial', function (started) { return sdk.commercialBreak(started); }); },
      showRewarded: function () { adBreak('rewarded', function (started) { return sdk.rewardedBreak(started); }); },
    },
    leaderboards: { type: 'not_available' },
    player: { id: null },
  };
})();
