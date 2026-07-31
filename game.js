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
  var TURBO_COUNT = 3;
  var WAITER_DISTANCE = 8;
  var THIRD_BUSH_TILE = 26;
  var LEADERBOARD_KEY = 'usNeedWipeLeaderboard';
  var LEADERBOARD_SIZE = 5;
  var INTRO_SEEN_KEY = 'usNeedWipeSeenIntro';

  var WIPE_SUCCESS_MSGS = ['Nice wipe!', 'Squeaky clean!', 'Fresh as a daisy!', 'Crisis averted!', 'Smooth operator!'];
  var WIPE_FAIL_MSGS = ['Too slow... skid marks!', 'Yikes, missed it!', 'Not clean enough!', 'Whoops, try again next time!'];
  var CATCH_MSGS = ['An angry bush got you!', 'Ambushed by the bushes!', 'The bushes pounced!', 'Leaf me alone!!'];

  var board = document.getElementById('board');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var wipesEl = document.getElementById('wipes');
  var streakEl = document.getElementById('streak');
  var streakHud = document.getElementById('streakHud');
  var proximityEl = document.getElementById('proximity');
  var proximityHud = document.getElementById('proximityHud');
  var rollBtn = document.getElementById('rollBtn');
  var dieFace = document.getElementById('dieFace');
  var toastEl = document.getElementById('toast');
  var muteBtn = document.getElementById('muteBtn');
  var musicBtn = document.getElementById('musicBtn');
  var helpBtn = document.getElementById('helpBtn');
  var introOverlay = document.getElementById('introOverlay');
  var introCloseBtn = document.getElementById('introCloseBtn');
  var boardShell = document.querySelector('.board-shell');
  var leaderboardList = document.getElementById('leaderboardList');

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
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // ---------- Sound (synthesized, no external assets) ----------
  var Sound = (function () {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    var ctx = null;
    var MUTE_KEY = 'usNeedWipeMuted';
    var MUSIC_KEY = 'usNeedWipeMusicOn';
    var muted = localStorage.getItem(MUTE_KEY) === '1';
    var musicOn = localStorage.getItem(MUSIC_KEY) !== '0';
    var musicTimer = null;
    var musicStep = 0;
    var MELODY = [523, 659, 784, 659, 587, 784, 659, 523, 440, 523, 659, 523, 392, 523, 587, 659];
    var BASS = [131, 131, 131, 131, 196, 196, 196, 196, 131, 131, 131, 131, 175, 175, 196, 196];

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

    function playMusicStep() {
      if (muted || !musicOn) return;
      var i = musicStep % MELODY.length;
      tone(MELODY[i], 0.16, { type: 'triangle', gain: 0.055 });
      tone(BASS[i], 0.2, { type: 'sine', gain: 0.05 });
      musicStep++;
    }

    return {
      unlock: ensure,
      isMuted: function () { return muted; },
      setMuted: function (v) { muted = v; localStorage.setItem(MUTE_KEY, v ? '1' : '0'); },
      isMusicOn: function () { return musicOn; },
      setMusicOn: function (v) {
        musicOn = v;
        localStorage.setItem(MUSIC_KEY, v ? '1' : '0');
        if (v) this.startMusic(); else this.stopMusic();
      },
      startMusic: function () {
        if (musicTimer || !musicOn) return;
        musicStep = 0;
        musicTimer = setInterval(playMusicStep, 230);
      },
      stopMusic: function () {
        if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      },
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
      streakBonus: function () {
        tone(880, 0.1, { type: 'square', gain: 0.12 });
        tone(1046, 0.14, { type: 'square', gain: 0.13, delay: 0.08 });
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
      turbo: function () {
        tone(660, 0.08, { type: 'square', gain: 0.14 });
        tone(990, 0.08, { type: 'square', gain: 0.14, delay: 0.06 });
        tone(1320, 0.14, { type: 'square', gain: 0.15, delay: 0.12 });
      },
      shieldBlock: function () {
        tone(500, 0.12, { type: 'sine', gain: 0.15 });
        tone(760, 0.16, { type: 'sine', gain: 0.15, delay: 0.08 });
      },
      growl: function () {
        noiseBurst(0.14, { freq: 900, freqTo: 250, gain: 0.15 });
        tone(85, 0.18, { type: 'sawtooth', slideTo: 50, gain: 0.13, delay: 0.02 });
      },
      thirdBush: function () {
        tone(120, 0.3, { type: 'sawtooth', slideTo: 40, gain: 0.2 });
        tone(90, 0.3, { type: 'sawtooth', slideTo: 35, gain: 0.18, delay: 0.12 });
      },
      catchSfx: function () {
        noiseBurst(0.2, { freq: 1000, freqTo: 150, gain: 0.2 });
        tone(140, 0.28, { type: 'sawtooth', slideTo: 50, gain: 0.22 });
        tone(90, 0.3, { type: 'square', gain: 0.16, delay: 0.05 });
      },
      win: function () {
        var notes = [523, 659, 784, 1046];
        notes.forEach(function (n, i) { tone(n, 0.22, { type: 'triangle', gain: 0.16, delay: i * 0.14 }); });
      }
    };
  })();

  function updateMuteBtn() { muteBtn.textContent = Sound.isMuted() ? '🔇' : '🔊'; }
  function updateMusicBtn() { musicBtn.textContent = Sound.isMusicOn() ? '🎵' : '🔕'; }
  updateMuteBtn();
  updateMusicBtn();
  muteBtn.addEventListener('click', function () {
    Sound.setMuted(!Sound.isMuted());
    updateMuteBtn();
    Sound.unlock();
  });
  musicBtn.addEventListener('click', function () {
    Sound.unlock();
    Sound.setMusicOn(!Sound.isMusicOn());
    updateMusicBtn();
  });

  function getLeaderboard() {
    try {
      var raw = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveScoreToLeaderboard(score) {
    var board_ = getLeaderboard();
    board_.push(score);
    board_.sort(function (a, b) { return b - a; });
    board_ = board_.slice(0, LEADERBOARD_SIZE);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board_));
    return board_;
  }

  function renderLeaderboard(list, highlightScore) {
    leaderboardList.innerHTML = '';
    var highlighted = false;
    for (var i = 0; i < list.length; i++) {
      var li = document.createElement('li');
      var isCurrent = !highlighted && list[i] === highlightScore;
      if (isCurrent) { li.classList.add('current'); highlighted = true; }
      li.innerHTML = '<span class="rank">#' + (i + 1) + '</span><span>' + list[i] + '</span>';
      leaderboardList.appendChild(li);
    }
  }

  function openOverlay(el) { el.classList.remove('hidden'); }
  function closeOverlay(el) { el.classList.add('hidden'); }

  helpBtn.addEventListener('click', function () { openOverlay(introOverlay); });
  introCloseBtn.addEventListener('click', function () {
    closeOverlay(introOverlay);
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  });

  var dismissableOverlayIds = ['introOverlay', 'supportOverlay', 'privacyOverlay', 'faqOverlay'];
  dismissableOverlayIds.forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('click', function (e) {
      if (e.target === el) closeOverlay(el);
    });
  });
  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeOverlay(document.getElementById(btn.dataset.close));
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    dismissableOverlayIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el.classList.contains('hidden')) closeOverlay(el);
    });
  });

  document.getElementById('supportBtn').addEventListener('click', function () { openOverlay(document.getElementById('supportOverlay')); });
  document.getElementById('privacyBtn').addEventListener('click', function () { openOverlay(document.getElementById('privacyOverlay')); });
  document.getElementById('faqBtn').addEventListener('click', function () { openOverlay(document.getElementById('faqOverlay')); });

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
    for (var i = 0; i < 3; i++) {
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

  function pickTurboTiles(poopSet) {
    var turbo = new Set();
    var guard = 0;
    while (turbo.size < TURBO_COUNT && guard < 500) {
      guard++;
      var idx = randInt(4, FINISH - 2);
      if (!poopSet.has(idx)) turbo.add(idx);
    }
    return turbo;
  }

  function newState() {
    var poopTiles = pickPoopTiles();
    return {
      playerIndex: 0,
      score: 0,
      wipes: 0,
      streak: 0,
      shield: false,
      busy: false,
      gameOver: false,
      thirdBushActive: false,
      poopTiles: poopTiles,
      wipedTiles: new Set(),
      turboTiles: pickTurboTiles(poopTiles),
      consumedTurbo: new Set(),
      bushes: [
        { index: -5, bias: randInt(-1, 1) },
        { index: -10, bias: randInt(-1, 1) },
        { index: -9999, bias: randInt(-1, 1) }
      ]
    };
  }

  function applyTileClasses() {
    for (var i = 0; i < TOTAL; i++) {
      var el = tileEls[i];
      el.classList.remove('poop', 'wiped', 'turbo', 'used');
      if (state.poopTiles.has(i)) {
        el.classList.add('poop');
        if (state.wipedTiles.has(i)) el.classList.add('wiped');
      }
      if (state.turboTiles.has(i)) {
        el.classList.add('turbo');
        if (state.consumedTurbo.has(i)) el.classList.add('used');
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
    streakEl.textContent = state.streak;
    streakHud.classList.toggle('streak-hot', state.streak >= 2);
    var leaderboard = getLeaderboard();
    var best = leaderboard.length ? leaderboard[0] : 0;
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
    var baseAggression = state.playerIndex > 24 ? 2 : 1;
    for (var i = 0; i < state.bushes.length; i++) {
      var b = state.bushes[i];

      if (i === 2 && !state.thirdBushActive) {
        if (state.playerIndex >= THIRD_BUSH_TILE) {
          state.thirdBushActive = true;
          b.index = Math.max(0, state.playerIndex - 12);
          bushTokens[i].classList.add('active');
          positionToken(bushTokens[i], b.index, 0.8);
          Sound.thirdBush();
          screenShake();
          showToast('😱 A THIRD bush joins the chase!', 'bad');
          await sleep(450);
        }
        continue;
      }

      if (b.index < state.playerIndex) {
        if (Math.random() < 0.12) {
          // this bush hesitates for a turn — unpredictable, not always closing in
        } else {
          var step = Math.max(1, baseAggression + b.bias + randInt(0, 2));
          if (Math.random() < 0.18) {
            step += randInt(2, 3);
            bushTokens[i].classList.remove('snarl');
            void bushTokens[i].offsetWidth;
            bushTokens[i].classList.add('snarl');
            Sound.growl();
          }
          b.index = Math.min(b.index + step, state.playerIndex);
        }
      }
      if (b.index >= 0) bushTokens[i].classList.add('active');
      positionToken(bushTokens[i], b.index, 0.8);
      await sleep(110);
    }
  }

  async function checkCatch() {
    if (state.playerIndex <= 0) return false;
    var caughtBy = -1;
    for (var i = 0; i < state.bushes.length; i++) {
      if (state.bushes[i].index >= state.playerIndex) { caughtBy = i; break; }
    }
    if (caughtBy === -1) return false;

    bushTokens[caughtBy].classList.remove('lunge');
    void bushTokens[caughtBy].offsetWidth;
    bushTokens[caughtBy].classList.add('lunge');

    if (state.shield) {
      state.shield = false;
      playerToken.classList.remove('shielded');
      Sound.shieldBlock();
      showToast('🛡️ Shield blocked the bush!', 'good');
      return false;
    }

    Sound.catchSfx();
    screenShake();

    state.score = Math.max(0, state.score - 20);
    state.playerIndex = Math.max(0, state.playerIndex - 5);
    state.streak = 0;
    positionToken(playerToken, state.playerIndex, 0.72);
    updateHud();

    await showCaught(pick(CATCH_MSGS) + ' -20 points, knocked back 5 tiles.');

    for (var j = 0; j < state.bushes.length; j++) {
      if (j === 2 && !state.thirdBushActive) continue;
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
      var prevBoard = getLeaderboard();
      var prevBest = prevBoard.length ? prevBoard[0] : 0;
      var isNew = state.score > prevBest;
      var newBoard = saveScoreToLeaderboard(state.score);
      renderLeaderboard(newBoard, state.score);
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
    Sound.startMusic();

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

    if (state.turboTiles.has(landedIndex) && !state.consumedTurbo.has(landedIndex)) {
      state.consumedTurbo.add(landedIndex);
      tileEls[landedIndex].classList.add('used');
      state.shield = true;
      playerToken.classList.add('shielded');
      Sound.turbo();
      spawnSparkles(tileEls[landedIndex]);
      showToast('⚡ Shield up! Next bush catch is blocked.', 'good');
      await sleep(250);
    }

    if (state.poopTiles.has(landedIndex) && !state.wipedTiles.has(landedIndex)) {
      Sound.plop();
      var success = await startWipeQTE();
      if (success) {
        state.wipedTiles.add(landedIndex);
        state.wipes++;
        state.streak++;
        var bonus = Math.min(state.streak - 1, 4) * 10;
        var gained = 30 + bonus;
        state.score += gained;
        tileEls[landedIndex].classList.add('wiped');
        Sound.wipeSuccess();
        spawnSparkles(tileEls[landedIndex]);
        if (state.streak >= 2) {
          Sound.streakBonus();
          showToast('+' + gained + ' 🔥 ' + pick(WIPE_SUCCESS_MSGS) + ' (Streak x' + state.streak + ')', 'good');
        } else {
          showToast('+' + gained + ' ' + pick(WIPE_SUCCESS_MSGS), 'good');
        }
      } else {
        state.score = Math.max(0, state.score - 15);
        state.playerIndex = Math.max(0, state.playerIndex - 3);
        state.streak = 0;
        Sound.wipeFail();
        showToast(pick(WIPE_FAIL_MSGS) + ' -15, knocked back 3 tiles', 'bad');
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
    playerToken.classList.remove('shielded');
    for (var i = 0; i < bushTokens.length; i++) bushTokens[i].classList.remove('active', 'snarl', 'lunge');
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

  if (localStorage.getItem(INTRO_SEEN_KEY) !== '1') {
    openOverlay(introOverlay);
  }
})();
