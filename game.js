(function () {
  'use strict';

  var COLS = 6;
  var ROWS = 8;
  var TOTAL = COLS * ROWS;
  var FINISH = TOTAL - 1;
  var STEP_MS = 170;
  var WIPE_TIME_MS = 2400;
  var WIPE_TAPS_NEEDED = 3;
  var POOP_COUNT = 16;
  var WAITER_DISTANCE = 8;
  var BEST_KEY = 'usNeedWipeHighScore';

  var board = document.getElementById('board');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var wipesEl = document.getElementById('wipes');
  var proximityEl = document.getElementById('proximity');
  var proximityHud = document.getElementById('proximityHud');
  var rollBtn = document.getElementById('rollBtn');
  var dieFace = document.getElementById('dieFace');
  var toastEl = document.getElementById('toast');
  var muteBtn = document.getElementById('muteBtn');
  var boardShell = document.querySelector('.board-shell');

  var wipeOverlay = document.getElementById('wipeOverlay');
  var wipeCard = document.getElementById('wipeCard');
  var wipeTimerFill = document.getElementById('wipeTimerFill');
  var wipeProgressFill = document.getElementById('wipeProgressFill');
  var wipeBtn = document.getElementById('wipeBtn');

  var caughtOverlay = document.getElementById('caughtOverlay');
  var caughtText = document.getElementById('caughtText');

  var winOverlay = document.getElementById('winOverlay');
  var winCard = document.getElementById('winCard');
  var finalScoreEl = document.getElementById('finalScore');
  var newBestText = document.getElementById('newBestText');
  var playAgainBtn = document.getElementById('playAgainBtn');

  var tileEls = [];
  var playerToken, bushTokens = [], waiterToken;

  var state = null;
  var toastTimer = null;

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // ---------- Sound (synthesized, no external assets) ----------
  var Sound = (function () {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    var ctx = null;
    var MUTE_KEY = 'usNeedWipeMuted';
    var muted = localStorage.getItem(MUTE_KEY) === '1';

    function ensure() {
      if (!AudioCtx) return null;
      if (!ctx) ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function tone(freq, dur, opts) {
      if (muted) return;
      var c = ensure();
      if (!c) return;
      opts = opts || {};
      var t0 = c.currentTime + (opts.delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + dur);
      var peak = opts.gain != null ? opts.gain : 0.15;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    }

    var noiseBufferCache = {};
    function getNoiseBuffer(c, dur) {
      var key = dur.toFixed(3);
      if (noiseBufferCache[key]) return noiseBufferCache[key];
      var size = Math.max(1, Math.floor(c.sampleRate * dur));
      var buffer = c.createBuffer(1, size, c.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
      noiseBufferCache[key] = buffer;
      return buffer;
    }

    function noiseBurst(dur, opts) {
      if (muted) return;
      var c = ensure();
      if (!c) return;
      opts = opts || {};
      var t0 = c.currentTime + (opts.delay || 0);
      var src = c.createBufferSource();
      src.buffer = getNoiseBuffer(c, dur);
      var filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(opts.freq || 700, t0);
      if (opts.freqTo) filter.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqTo), t0 + dur);
      var gain = c.createGain();
      var peak = opts.gain != null ? opts.gain : 0.2;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter).connect(gain).connect(c.destination);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    }

    return {
      unlock: ensure,
      isMuted: function () { return muted; },
      setMuted: function (v) { muted = v; localStorage.setItem(MUTE_KEY, v ? '1' : '0'); },
      roll: function () {
        for (var i = 0; i < 4; i++) tone(300 + randInt(-40, 40), 0.05, { type: 'square', gain: 0.07, delay: i * 0.07 });
      },
      step: function () { tone(520, 0.05, { type: 'square', gain: 0.05 }); },
      tap: function () { tone(720, 0.06, { type: 'triangle', gain: 0.09 }); },
      wipeSuccess: function () {
        tone(523, 0.12, { type: 'triangle', gain: 0.14 });
        tone(659, 0.12, { type: 'triangle', gain: 0.14, delay: 0.09 });
        tone(784, 0.18, { type: 'triangle', gain: 0.16, delay: 0.18 });
      },
      wipeFail: function () {
        noiseBurst(0.16, { freq: 500, freqTo: 100, gain: 0.16 });
        tone(180, 0.35, { type: 'sawtooth', slideTo: 70, gain: 0.16, delay: 0.05 });
      },
      plop: function () {
        noiseBurst(0.16, { freq: 900, freqTo: 150, gain: 0.22 });
        tone(220, 0.14, { type: 'sine', slideTo: 70, gain: 0.16, delay: 0.03 });
        tone(110, 0.18, { type: 'sine', slideTo: 45, gain: 0.12, delay: 0.06 });
      },
      catchSfx: function () {
        tone(140, 0.28, { type: 'sawtooth', slideTo: 50, gain: 0.2 });
        tone(90, 0.3, { type: 'square', gain: 0.14, delay: 0.05 });
      },
      win: function () {
        var notes = [523, 659, 784, 1046];
        notes.forEach(function (n, i) { tone(n, 0.22, { type: 'triangle', gain: 0.16, delay: i * 0.14 }); });
      }
    };
  })();

  function updateMuteBtn() { muteBtn.textContent = Sound.isMuted() ? '🔇' : '🔊'; }
  updateMuteBtn();
  muteBtn.addEventListener('click', function () {
    Sound.setMuted(!Sound.isMuted());
    updateMuteBtn();
    Sound.unlock();
  });

  function pathIndexForCell(row, col) {
    if (row % 2 === 0) return row * COLS + col;
    return row * COLS + (COLS - 1 - col);
  }

  function buildBoard() {
    board.innerHTML = '';
    tileEls = new Array(TOTAL);
    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        var idx = pathIndexForCell(row, col);
        var tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = idx;
        if (idx === FINISH) {
          tile.classList.add('finish');
          tile.innerHTML = '<svg class="finish-castle" viewBox="0 0 200 160"><use href="#sprite-castle"/></svg>';
        }
        tileEls[idx] = tile;
        board.appendChild(tile);
      }
    }
    tileEls[0].classList.add('start');

    playerToken = document.createElement('div');
    playerToken.className = 'token player';
    playerToken.innerHTML = '<svg viewBox="0 0 100 100"><use href="#sprite-tp"/></svg>';
    board.appendChild(playerToken);

    bushTokens = [];
    for (var i = 0; i < 2; i++) {
      var b = document.createElement('div');
      b.className = 'token bush';
      b.innerHTML = '<svg viewBox="0 0 100 100"><use href="#sprite-bush"/></svg>';
      board.appendChild(b);
      bushTokens.push(b);
    }

    waiterToken = document.createElement('div');
    waiterToken.className = 'token bush-waiter';
    waiterToken.innerHTML = '<svg viewBox="0 0 100 100"><use href="#sprite-bush-waiter"/></svg>';
    board.appendChild(waiterToken);
  }

  function pickPoopTiles() {
    var poop = new Set();
    var count = Math.min(POOP_COUNT, FINISH - 2 - 4);
    while (poop.size < count) {
      var idx = randInt(4, FINISH - 2);
      poop.add(idx);
    }
    return poop;
  }

  function newState() {
    return {
      playerIndex: 0,
      score: 0,
      wipes: 0,
      busy: false,
      gameOver: false,
      poopTiles: pickPoopTiles(),
      wipedTiles: new Set(),
      bushes: [
        { index: -5 },
        { index: -10 }
      ]
    };
  }

  function applyTileClasses() {
    for (var i = 0; i < TOTAL; i++) {
      var el = tileEls[i];
      el.classList.remove('poop', 'wiped');
      if (state.poopTiles.has(i)) {
        el.classList.add('poop');
        if (state.wipedTiles.has(i)) el.classList.add('wiped');
      }
    }
  }

  function positionToken(el, index, sizeFactor) {
    if (index < 0) index = 0;
    var boardRect = board.getBoundingClientRect();
    var tileRect = tileEls[index].getBoundingClientRect();
    var size = tileRect.width * (sizeFactor || 0.72);
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.left = (tileRect.left - boardRect.left + (tileRect.width - size) / 2) + 'px';
    el.style.top = (tileRect.top - boardRect.top + (tileRect.height - size) / 2) + 'px';
  }

  function repositionAll() {
    if (!state) return;
    positionToken(playerToken, state.playerIndex, 0.72);
    for (var i = 0; i < state.bushes.length; i++) {
      positionToken(bushTokens[i], state.bushes[i].index, 0.8);
    }
    positionToken(waiterToken, FINISH, 0.62);
  }

  function showToast(text, kind) {
    toastEl.textContent = text;
    toastEl.className = 'toast show' + (kind ? ' ' + kind : '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = 'toast'; }, 1500);
  }

  function spawnSparkles(tileEl) {
    var boardRect = board.getBoundingClientRect();
    var r = tileEl.getBoundingClientRect();
    var cx = r.left - boardRect.left + r.width / 2;
    var cy = r.top - boardRect.top + r.height / 2;
    var symbols = ['✨', '✨', '💦', '⭐'];
    for (var i = 0; i < 7; i++) {
      var s = document.createElement('span');
      s.className = 'sparkle';
      s.textContent = symbols[randInt(0, symbols.length - 1)];
      var angle = Math.random() * Math.PI * 2;
      var dist = 30 + Math.random() * 40;
      s.style.left = cx + 'px';
      s.style.top = cy + 'px';
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      board.appendChild(s);
      s.addEventListener('animationend', function () { this.remove(); });
    }
  }

  function spawnConfetti(container) {
    var colors = ['#ff6b6b', '#ffd23f', '#4fd44f', '#3ab0ff', '#c77dff'];
    for (var i = 0; i < 28; i++) {
      var c = document.createElement('span');
      c.className = 'confetti';
      c.style.left = (Math.random() * 100) + '%';
      c.style.background = colors[randInt(0, colors.length - 1)];
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      c.style.animationDuration = (1.6 + Math.random() * 1) + 's';
      c.style.setProperty('--rot', (Math.random() * 360) + 'deg');
      container.appendChild(c);
      c.addEventListener('animationend', function () { this.remove(); });
    }
  }

  function screenShake() {
    boardShell.classList.remove('shake');
    void boardShell.offsetWidth;
    boardShell.classList.add('shake');
  }

  function updateHud() {
    scoreEl.textContent = state.score;
    wipesEl.textContent = state.wipes;
    var best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    bestEl.textContent = Math.max(best, state.score);

    var nearest = Infinity;
    for (var i = 0; i < state.bushes.length; i++) {
      var b = state.bushes[i];
      if (b.index >= 0) {
        var dist = state.playerIndex - b.index;
        if (dist < nearest) nearest = dist;
      }
    }
    if (nearest === Infinity) {
      proximityEl.textContent = 'far';
      proximityHud.classList.remove('danger');
    } else if (nearest <= 4) {
      proximityEl.textContent = 'DANGER!';
      proximityHud.classList.add('danger');
    } else if (nearest <= 10) {
      proximityEl.textContent = 'near';
      proximityHud.classList.remove('danger');
    } else {
      proximityEl.textContent = 'far';
      proximityHud.classList.remove('danger');
    }

    var toFinish = FINISH - state.playerIndex;
    waiterToken.classList.toggle('active', toFinish > 0 && toFinish <= WAITER_DISTANCE);
  }

  async function stepPlayerTo(target) {
    while (state.playerIndex < target) {
      state.playerIndex++;
      positionToken(playerToken, state.playerIndex, 0.72);
      Sound.step();
      await sleep(STEP_MS);
    }
    playerToken.classList.remove('bounce');
    void playerToken.offsetWidth;
    playerToken.classList.add('bounce');
  }

  function startWipeQTE() {
    return new Promise(function (resolve) {
      var taps = 0;
      var done = false;
      wipeProgressFill.style.width = '0%';
      wipeCard.classList.remove('urgent');
      wipeTimerFill.style.transition = 'none';
      wipeTimerFill.style.width = '100%';
      wipeOverlay.classList.remove('hidden');

      void wipeTimerFill.offsetWidth;
      wipeTimerFill.style.transition = 'width ' + WIPE_TIME_MS + 'ms linear';
      wipeTimerFill.style.width = '0%';

      var urgentTimeout = setTimeout(function () { wipeCard.classList.add('urgent'); }, WIPE_TIME_MS * 0.55);
      var timeout = setTimeout(function () { finish(false); }, WIPE_TIME_MS);

      function onTap() {
        if (done) return;
        Sound.tap();
        taps++;
        wipeProgressFill.style.width = Math.min(100, (taps / WIPE_TAPS_NEEDED) * 100) + '%';
        if (taps >= WIPE_TAPS_NEEDED) finish(true);
      }

      function onKey(e) {
        if (e.code === 'KeyW' || e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          onTap();
        }
      }

      function finish(success) {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        clearTimeout(urgentTimeout);
        wipeCard.classList.remove('urgent');
        wipeBtn.removeEventListener('click', onTap);
        document.removeEventListener('keydown', onKey);
        wipeOverlay.classList.add('hidden');
        resolve(success);
      }

      wipeBtn.addEventListener('click', onTap);
      document.addEventListener('keydown', onKey);
    });
  }

  async function showCaught(text) {
    caughtText.textContent = text;
    caughtOverlay.classList.remove('hidden');
    await sleep(1100);
    caughtOverlay.classList.add('hidden');
  }

  async function moveBushes() {
    var aggression = state.playerIndex > 24 ? 2 : 1;
    for (var i = 0; i < state.bushes.length; i++) {
      var b = state.bushes[i];
      if (b.index < state.playerIndex) {
        var step = aggression + randInt(0, 1);
        b.index = Math.min(b.index + step, state.playerIndex);
      }
      if (b.index >= 0) bushTokens[i].classList.add('active');
      positionToken(bushTokens[i], b.index, 0.8);
      await sleep(120);
    }
  }

  async function checkCatch() {
    if (state.playerIndex <= 0) return false;
    var caughtBy = -1;
    for (var i = 0; i < state.bushes.length; i++) {
      if (state.bushes[i].index >= state.playerIndex) { caughtBy = i; break; }
    }
    if (caughtBy === -1) return false;

    Sound.catchSfx();
    screenShake();
    bushTokens[caughtBy].classList.remove('lunge');
    void bushTokens[caughtBy].offsetWidth;
    bushTokens[caughtBy].classList.add('lunge');

    state.score = Math.max(0, state.score - 20);
    state.playerIndex = Math.max(0, state.playerIndex - 5);
    positionToken(playerToken, state.playerIndex, 0.72);
    updateHud();

    await showCaught('An angry bush got you! -20 points, knocked back 5 tiles.');

    for (var j = 0; j < state.bushes.length; j++) {
      state.bushes[j].index = state.playerIndex - (6 + j * 3);
      if (state.bushes[j].index < 0) bushTokens[j].classList.remove('active');
      positionToken(bushTokens[j], state.bushes[j].index, 0.8);
    }
    updateHud();
    return true;
  }

  function checkWin() {
    if (state.playerIndex >= FINISH) {
      state.playerIndex = FINISH;
      state.score += 100;
      var best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
      var isNew = state.score > best;
      if (isNew) localStorage.setItem(BEST_KEY, String(state.score));
      finalScoreEl.textContent = state.score;
      newBestText.classList.toggle('hidden', !isNew);
      updateHud();
      winOverlay.classList.remove('hidden');
      Sound.win();
      spawnConfetti(winCard);
      state.gameOver = true;
      return true;
    }
    return false;
  }

  async function handleRoll() {
    if (state.busy || state.gameOver) return;
    state.busy = true;
    rollBtn.disabled = true;
    Sound.unlock();

    rollBtn.classList.add('rolling');
    Sound.roll();
    await sleep(320);
    rollBtn.classList.remove('rolling');

    var roll = randInt(1, 4);
    dieFace.textContent = '(' + roll + ')';

    var target = Math.min(state.playerIndex + roll, FINISH);
    await stepPlayerTo(target);

    if (checkWin()) { state.busy = false; return; }

    var landedIndex = state.playerIndex;
    if (state.poopTiles.has(landedIndex) && !state.wipedTiles.has(landedIndex)) {
      Sound.plop();
      var success = await startWipeQTE();
      if (success) {
        state.wipedTiles.add(landedIndex);
        state.wipes++;
        state.score += 30;
        tileEls[landedIndex].classList.add('wiped');
        Sound.wipeSuccess();
        spawnSparkles(tileEls[landedIndex]);
        showToast('+30 Nice wipe!', 'good');
      } else {
        state.score = Math.max(0, state.score - 15);
        state.playerIndex = Math.max(0, state.playerIndex - 3);
        Sound.wipeFail();
        showToast('Too slow... -15, knocked back 3 tiles', 'bad');
        await stepBackAnimation();
      }
      updateHud();
    }

    await moveBushes();
    updateHud();

    var wasCaught = await checkCatch();
    if (!wasCaught && checkWin()) { state.busy = false; return; }

    state.busy = false;
    dieFace.textContent = '';
    if (!state.gameOver) rollBtn.disabled = false;
  }

  async function stepBackAnimation() {
    positionToken(playerToken, state.playerIndex, 0.72);
    await sleep(200);
  }

  function resetGame() {
    state = newState();
    applyTileClasses();
    repositionAll();
    for (var i = 0; i < bushTokens.length; i++) bushTokens[i].classList.remove('active');
    waiterToken.classList.remove('active');
    var stray = winCard.querySelectorAll('.confetti');
    for (var s = 0; s < stray.length; s++) stray[s].remove();
    winOverlay.classList.add('hidden');
    caughtOverlay.classList.add('hidden');
    wipeOverlay.classList.add('hidden');
    dieFace.textContent = '';
    rollBtn.disabled = false;
    updateHud();
  }

  rollBtn.addEventListener('click', handleRoll);
  playAgainBtn.addEventListener('click', resetGame);

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && !rollBtn.disabled && wipeOverlay.classList.contains('hidden')) {
      e.preventDefault();
      handleRoll();
    }
  });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(repositionAll, 100);
  });

  buildBoard();
  resetGame();
})();
