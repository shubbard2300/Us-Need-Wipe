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
  var FINISH_SPARKLE_DISTANCE = 6;
  var THIRD_BUSH_TILE = 26;
  var LEADERBOARD_KEY = 'usNeedWipeLeaderboard';
  var LEADERBOARD_SIZE = 5;
  var INTRO_SEEN_KEY = 'usNeedWipeSeenIntro';
  var WIN_COUNT_KEY = 'usNeedWipeWinCount';
  var MERCH_WIN_GOAL = 3;
  // TODO: set the real Spreadshop discount code here once available, e.g. 'WIPE25'.
  var MERCH_DISCOUNT_CODE = '';

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
  var globalLeaderboardList = document.getElementById('globalLeaderboardList');
  var signInPrompt = document.getElementById('signInPrompt');

  var authBtn = document.getElementById('authBtn');
  var authOverlay = document.getElementById('authOverlay');
  var authSignedOut = document.getElementById('authSignedOut');
  var authSignedIn = document.getElementById('authSignedIn');
  var authForm = document.getElementById('authForm');
  var authUsername = document.getElementById('authUsername');
  var authEmailWrap = document.getElementById('authEmailWrap');
  var authEmail = document.getElementById('authEmail');
  var authPassword = document.getElementById('authPassword');
  var authError = document.getElementById('authError');
  var authSubmitBtn = document.getElementById('authSubmitBtn');
  var authStatusName = document.getElementById('authStatusName');
  var authLogoutBtn = document.getElementById('authLogoutBtn');
  var authDeleteBtn = document.getElementById('authDeleteBtn');
  var authTabs = document.querySelectorAll('.auth-tab');
  var authMode = 'signin';

  var leaderboardBtn = document.getElementById('leaderboardBtn');
  var globalBoardOverlay = document.getElementById('globalBoardOverlay');
  var globalBoardList = document.getElementById('globalBoardList');

  var currentUser = null;

  var wipeOverlay = document.getElementById('wipeOverlay');
  var wipeCard = document.getElementById('wipeCard');
  var wipeTimerFill = document.getElementById('wipeTimerFill');
  var wipeProgressFill = document.getElementById('wipeProgressFill');
  var wipeBtn = document.getElementById('wipeBtn');

  var caughtOverlay = document.getElementById('caughtOverlay');
  var caughtText = document.getElementById('caughtText');

  var winOverlay = document.getElementById('winOverlay');
  var winCard = document.getElementById('winCard');
  var kingLogPopup = document.getElementById('kingLogPopup');
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
    var musicIntervalMs = 118;
    var intensity = 0;

    // Four procedural "radio stations" rotate per run — each with its own tempo,
    // scale, drum pattern, and lead voice, so back-to-back runs don't sound like
    // one bar repeating forever. stepsPerBar lets the waltz play in 3/4 time.
    // Toggling the 🎵 button off and on also skips to the next station.
    var SONGS = [
      {
        name: 'Bubblegum Sprint',
        interval: 118, stepsPerBar: 16, barsPerPhrase: 4,
        melodies: [
          [659, 0, 784, 659, 0, 880, 784, 0, 659, 587, 0, 659, 784, 880, 0, 1046],
          [523, 659, 0, 784, 659, 0, 880, 0, 587, 698, 0, 880, 698, 0, 784, 0],
          [659, 0, 784, 659, 0, 880, 784, 0, 659, 587, 0, 659, 784, 880, 0, 1046],
          [784, 0, 659, 0, 587, 659, 0, 784, 880, 0, 784, 659, 0, 587, 0, 659]
        ],
        bass: [131, 0, 262, 0, 196, 0, 392, 0, 110, 0, 220, 0, 175, 0, 350, 0],
        bassType: 'sawtooth',
        kick: [0, 4, 8, 12], snare: [4, 12], hat: [1, 3, 5, 7, 9, 11, 13, 15],
        leadTypes: ['triangle', 'square']
      },
      {
        name: 'Castle Chiptune',
        interval: 130, stepsPerBar: 16, barsPerPhrase: 4,
        melodies: [
          [523, 0, 659, 784, 0, 659, 523, 0, 587, 0, 698, 587, 659, 0, 523, 0],
          [784, 0, 880, 1046, 0, 880, 784, 0, 659, 0, 784, 659, 587, 0, 659, 0],
          [523, 0, 659, 784, 0, 659, 523, 0, 587, 0, 698, 587, 659, 0, 523, 0],
          [1046, 0, 880, 784, 880, 0, 784, 659, 698, 0, 659, 587, 523, 0, 0, 0]
        ],
        bass: [131, 131, 0, 131, 196, 0, 131, 0, 175, 175, 0, 175, 196, 0, 196, 0],
        bassType: 'square',
        kick: [0, 8], snare: [4, 12], hat: [2, 6, 10, 14],
        leadTypes: ['square', 'square']
      },
      {
        name: 'Swamp Funk',
        interval: 132, stepsPerBar: 16, barsPerPhrase: 4,
        melodies: [
          [440, 0, 0, 523, 0, 587, 440, 0, 0, 659, 587, 0, 523, 0, 440, 0],
          [659, 0, 587, 0, 784, 0, 659, 587, 0, 440, 0, 523, 587, 659, 0, 0],
          [440, 0, 0, 523, 0, 587, 440, 0, 0, 659, 587, 0, 523, 0, 440, 0],
          [880, 0, 784, 659, 0, 784, 0, 587, 659, 0, 587, 523, 0, 440, 0, 0]
        ],
        bass: [110, 0, 110, 165, 0, 110, 0, 131, 110, 0, 110, 165, 0, 147, 131, 0],
        bassType: 'sawtooth',
        kick: [0, 6, 10], snare: [4, 12], hat: [2, 5, 8, 11, 14],
        leadTypes: ['sawtooth', 'triangle']
      },
      {
        name: 'Royal Waltz',
        interval: 150, stepsPerBar: 12, barsPerPhrase: 4,
        melodies: [
          [698, 0, 0, 880, 0, 0, 784, 0, 698, 659, 0, 0],
          [587, 0, 0, 698, 0, 0, 659, 0, 587, 523, 0, 0],
          [698, 0, 0, 880, 0, 0, 1046, 0, 880, 784, 0, 0],
          [784, 0, 659, 587, 0, 0, 523, 0, 0, 587, 0, 0]
        ],
        bass: [175, 0, 0, 0, 349, 262, 0, 349, 262, 0, 0, 0],
        bassType: 'triangle',
        kick: [0], snare: [4, 8], hat: [],
        leadTypes: ['triangle', 'triangle']
      }
    ];
    var SONG_KEY = 'usNeedWipeSongIdx';
    var songIndex = (parseInt(localStorage.getItem(SONG_KEY) || '0', 10) || 0) % SONGS.length;
    var song = SONGS[songIndex];
    var melodyIndex = 0;

    function intensityFactor() {
      return intensity >= 2 ? 0.75 : (intensity === 1 ? 0.86 : 1);
    }

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
      var i = musicStep % song.stepsPerBar;
      if (i === 0 && musicStep > 0) {
        var bar = musicStep / song.stepsPerBar;
        if (bar % song.barsPerPhrase === 0) melodyIndex = (melodyIndex + 1) % song.melodies.length;
      }
      var MELODY = song.melodies[melodyIndex];
      var pitchUp = intensity >= 2 ? 1.12 : 1;

      if (song.kick.indexOf(i) !== -1) {
        tone(150, 0.12, { type: 'triangle', slideTo: 42, gain: 0.22 + intensity * 0.02 });
      }
      if (song.snare.indexOf(i) !== -1) {
        noiseBurst(0.09, { freq: 2600, freqTo: 700, gain: 0.16 + intensity * 0.02 });
        tone(190, 0.06, { type: 'square', gain: 0.08 });
      }
      if (song.hat.indexOf(i) !== -1) {
        noiseBurst(0.035, { freq: 7000, freqTo: 5000, gain: 0.05 });
      }
      if (MELODY[i]) {
        tone(MELODY[i] * pitchUp, 0.1, { type: song.leadTypes[i % 4 === 2 ? 1 : 0], gain: 0.06 + intensity * 0.01 });
      }
      if (song.bass[i]) {
        tone(song.bass[i] * pitchUp, 0.13, { type: song.bassType, gain: 0.06 + intensity * 0.01 });
      }
      musicStep++;
    }

    function restartMusicTimer() {
      if (!musicTimer) return;
      clearInterval(musicTimer);
      musicTimer = setInterval(playMusicStep, musicIntervalMs);
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
        song = SONGS[songIndex];
        songIndex = (songIndex + 1) % SONGS.length;
        localStorage.setItem(SONG_KEY, String(songIndex));
        musicStep = 0;
        melodyIndex = 0;
        musicIntervalMs = Math.round(song.interval * intensityFactor());
        musicTimer = setInterval(playMusicStep, musicIntervalMs);
      },
      currentSongName: function () { return song.name; },
      stopMusic: function () {
        if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      },
      setIntensity: function (level) {
        if (intensity === level) return;
        intensity = level;
        musicIntervalMs = Math.round(song.interval * intensityFactor());
        restartMusicTimer();
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
      legionArrive: function () {
        tone(440, 0.12, { type: 'square', gain: 0.14 });
        tone(554, 0.12, { type: 'square', gain: 0.14, delay: 0.09 });
        tone(659, 0.22, { type: 'square', gain: 0.16, delay: 0.18 });
        noiseBurst(0.18, { freq: 1400, freqTo: 400, gain: 0.1, delay: 0.02 });
      },
      reaperSting: function () {
        tone(220, 0.4, { type: 'sawtooth', slideTo: 55, gain: 0.16 });
        tone(233, 0.4, { type: 'sawtooth', slideTo: 58, gain: 0.12, delay: 0.03 });
        noiseBurst(0.3, { freq: 2000, freqTo: 300, gain: 0.09, delay: 0.05 });
      },
      reaperClean: function () {
        tone(300, 0.12, { type: 'sine', slideTo: 700, gain: 0.14 });
        tone(500, 0.14, { type: 'triangle', slideTo: 900, gain: 0.1, delay: 0.05 });
        noiseBurst(0.2, { freq: 1800, freqTo: 3500, gain: 0.08, delay: 0.02 });
      },
      poof: function () {
        noiseBurst(0.15, { freq: 900, freqTo: 200, gain: 0.12 });
        tone(180, 0.12, { type: 'sine', slideTo: 60, gain: 0.08 });
      },
      crowdChant: function () {
        // Stadium-style "US! NEED! WIPE!" chant, built from noise (crowd murmur)
        // plus rhythmic hits on the chant's 3-syllable cadence, played twice.
        noiseBurst(1.6, { freq: 1200, freqTo: 2200, gain: 0.1 });
        noiseBurst(1.6, { freq: 600, freqTo: 1400, gain: 0.08, delay: 0.05 });
        var beats = [0, 0.32, 0.64, 1.1, 1.42, 1.74];
        beats.forEach(function (t, i) {
          var wipeSyllable = i % 3 === 2;
          tone(wipeSyllable ? 330 : 220, 0.18, { type: 'square', gain: 0.16, delay: t });
          noiseBurst(0.12, { freq: 2500, freqTo: 1000, gain: 0.07, delay: t });
        });
      },
      catchSfx: function () {
        noiseBurst(0.2, { freq: 1000, freqTo: 150, gain: 0.2 });
        tone(140, 0.28, { type: 'sawtooth', slideTo: 50, gain: 0.22 });
        tone(90, 0.3, { type: 'square', gain: 0.16, delay: 0.05 });
      },
      closeCall: function () {
        tone(392, 0.1, { type: 'sine', gain: 0.12 });
        tone(587, 0.16, { type: 'sine', gain: 0.14, delay: 0.09 });
      },
      win: function () {
        var notes = [523, 659, 784, 1046];
        notes.forEach(function (n, i) { tone(n, 0.22, { type: 'triangle', gain: 0.16, delay: i * 0.14 }); });
      },
      kingCelebration: function () {
        var fanfare = [392, 494, 587, 784, 988, 1176];
        fanfare.forEach(function (n, i) {
          tone(n, 0.16, { type: 'square', gain: 0.13, delay: i * 0.085 });
          tone(n / 2, 0.16, { type: 'triangle', gain: 0.07, delay: i * 0.085 });
        });
        var tail = fanfare.length * 0.085;
        tone(1568, 0.5, { type: 'triangle', gain: 0.2, delay: tail });
        tone(1976, 0.5, { type: 'sine', gain: 0.12, delay: tail + 0.03 });
        noiseBurst(0.6, { freq: 3200, freqTo: 900, gain: 0.09, delay: tail });
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

  var dismissableOverlayIds = ['introOverlay', 'supportOverlay', 'privacyOverlay', 'faqOverlay', 'authOverlay', 'globalBoardOverlay', 'promoOverlay'];
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

  // Deep links so other pages (e.g. /thereturn) can open these panels directly.
  function openOverlayFromHash() {
    var map = { '#support': 'supportOverlay', '#privacy': 'privacyOverlay', '#faq': 'faqOverlay' };
    var h = (location.hash || '').toLowerCase();
    var id = map[h];
    if (id) { openOverlay(document.getElementById(id)); return; }
    if (h === '#updates') { document.getElementById('promoBtn').click(); }
  }
  window.addEventListener('hashchange', openOverlayFromHash);

  var promoOverlay = document.getElementById('promoOverlay');
  var promoFormWrap = document.getElementById('promoForm-wrap');
  var promoForm = document.getElementById('promoForm');
  var promoEmail = document.getElementById('promoEmail');
  var promoError = document.getElementById('promoError');
  var promoSubmitBtn = document.getElementById('promoSubmitBtn');
  var promoSuccess = document.getElementById('promoSuccess');

  document.getElementById('promoBtn').addEventListener('click', function () {
    promoError.classList.add('hidden');
    promoFormWrap.classList.remove('hidden');
    promoSuccess.classList.add('hidden');
    openOverlay(promoOverlay);
  });

  promoForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    promoError.classList.add('hidden');
    var email = promoEmail.value.trim();
    promoSubmitBtn.disabled = true;
    try {
      var res = await fetch('/api/promo-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      var data = await res.json();
      if (!res.ok) {
        promoError.textContent = data.error || 'Something went wrong.';
        promoError.classList.remove('hidden');
        return;
      }
      promoForm.reset();
      promoFormWrap.classList.add('hidden');
      promoSuccess.classList.remove('hidden');
    } catch (err) {
      promoError.textContent = 'Network error — try again.';
      promoError.classList.remove('hidden');
    } finally {
      promoSubmitBtn.disabled = false;
    }
  });

  // ---------- Accounts & global leaderboard ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function updateAuthUI() {
    authSignedOut.classList.toggle('hidden', !!currentUser);
    authSignedIn.classList.toggle('hidden', !currentUser);
    authStatusName.textContent = currentUser || '';
    authBtn.title = currentUser ? ('Signed in as ' + currentUser) : 'Sign in / Sign up';
  }

  async function fetchMe() {
    try {
      var res = await fetch('/api/auth/me');
      var data = await res.json();
      currentUser = data.username || null;
    } catch (e) {
      currentUser = null;
    }
    updateAuthUI();
  }

  function setAuthMode(mode) {
    authMode = mode;
    authTabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    authSubmitBtn.textContent = mode === 'signup' ? 'Sign Up' : 'Sign In';
    authPassword.autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
    authEmailWrap.classList.toggle('hidden', mode !== 'signup');
    authError.classList.add('hidden');
  }

  authTabs.forEach(function (tab) {
    tab.addEventListener('click', function () { setAuthMode(tab.dataset.mode); });
  });

  authBtn.addEventListener('click', function () {
    authError.classList.add('hidden');
    if (!currentUser) setAuthMode('signin');
    openOverlay(authOverlay);
  });

  authForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    authError.classList.add('hidden');
    var username = authUsername.value.trim();
    var password = authPassword.value;
    var endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
    var payload = { username: username, password: password };
    if (authMode === 'signup') payload.email = authEmail.value.trim();
    authSubmitBtn.disabled = true;
    try {
      var res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      if (!res.ok) {
        authError.textContent = data.error || 'Something went wrong.';
        authError.classList.remove('hidden');
        return;
      }
      currentUser = data.username;
      authForm.reset();
      updateAuthUI();
      closeOverlay(authOverlay);
      showToast('👋 Signed in as ' + currentUser, 'good');
    } catch (err) {
      authError.textContent = 'Network error — try again.';
      authError.classList.remove('hidden');
    } finally {
      authSubmitBtn.disabled = false;
    }
  });

  authLogoutBtn.addEventListener('click', async function () {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    currentUser = null;
    updateAuthUI();
    closeOverlay(authOverlay);
    showToast('Signed out', 'good');
  });

  authDeleteBtn.addEventListener('click', async function () {
    if (!window.confirm('Delete your account and all your global leaderboard scores? This can\'t be undone.')) return;
    try {
      await fetch('/api/auth/delete', { method: 'POST' });
    } catch (e) { /* ignore */ }
    currentUser = null;
    updateAuthUI();
    closeOverlay(authOverlay);
    showToast('Account deleted', 'good');
  });

  async function fetchGlobalLeaderboard(targetEl) {
    targetEl.innerHTML = '<li>Loading…</li>';
    try {
      var res = await fetch('/api/leaderboard');
      var data = await res.json();
      var list = data.leaderboard || [];
      if (!list.length) {
        targetEl.innerHTML = '<li>No scores yet — be the first!</li>';
        return;
      }
      targetEl.innerHTML = '';
      list.forEach(function (entry, i) {
        var li = document.createElement('li');
        if (currentUser && entry.username === currentUser) li.classList.add('current');
        li.innerHTML = '<span class="rank">#' + (i + 1) + '</span><span>' + escapeHtml(entry.username) + ' — ' + entry.score + '</span>';
        targetEl.appendChild(li);
      });
    } catch (e) {
      targetEl.innerHTML = '<li>Could not load leaderboard.</li>';
    }
  }

  leaderboardBtn.addEventListener('click', function () {
    openOverlay(globalBoardOverlay);
    fetchGlobalLeaderboard(globalBoardList);
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
          tile.innerHTML = '<img class="finish-icon" src="finish-tile.png" alt="">';
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
      var bushSprite = i === 2 ? 'sprite-bush-2' : 'sprite-bush';
      b.innerHTML = '<svg viewBox="0 0 100 100"><use href="#' + bushSprite + '"/></svg>';
      board.appendChild(b);
      bushTokens.push(b);
    }

    waiterToken = document.createElement('div');
    waiterToken.className = 'token bush-waiter';
    waiterToken.innerHTML = '<svg viewBox="0 0 100 100"><use href="#sprite-bush-waiter"/></svg>';
    board.appendChild(waiterToken);
  }


  // Cartoon stink lines wafting off every un-wiped poop tile.
  function addStinkWaft(el) {
    if (el.querySelector('.stink-waft')) return;
    var w = document.createElement('div');
    w.className = 'stink-waft';
    for (var s = 0; s < 3; s++) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 20 44');
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#sprite-stink');
      svg.appendChild(use);
      w.appendChild(svg);
    }
    el.appendChild(w);
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
      legionShown: false,
      legionUsedThisTurn: false,
      reaperUsedThisTurn: false,
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
      el.classList.remove('poop', 'wiped', 'turbo', 'used', 'spawn-in');
      var waft = el.querySelector('.stink-waft');
      if (waft && !state.poopTiles.has(i)) waft.remove();
      if (state.poopTiles.has(i)) {
        el.classList.add('poop', 'spawn-in');
        addStinkWaft(el);
        el.style.setProperty('--spawn-delay', (i * 0.015) + 's');
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
    announce(text);
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

  function spawnCleanPop(tileEl) {
    var boardRect = board.getBoundingClientRect();
    var r = tileEl.getBoundingClientRect();
    var cx = r.left - boardRect.left + r.width / 2;
    var cy = r.top - boardRect.top + r.height / 2;
    var img = document.createElement('img');
    img.className = 'clean-pop';
    img.src = 'wipe-clean.png';
    img.alt = '';
    img.style.left = cx + 'px';
    img.style.top = cy + 'px';
    board.appendChild(img);
    img.addEventListener('animationend', function () { this.remove(); });
  }

  function spawnFailPop(tileEl) {
    var boardRect = board.getBoundingClientRect();
    var r = tileEl.getBoundingClientRect();
    var cx = r.left - boardRect.left + r.width / 2;
    var cy = r.top - boardRect.top + r.height / 2;
    var img = document.createElement('img');
    img.className = 'clean-pop fail-pop';
    img.src = 'wipe-fail.png';
    img.alt = '';
    img.style.left = cx + 'px';
    img.style.top = cy + 'px';
    board.appendChild(img);
    img.addEventListener('animationend', function () { this.remove(); });
  }

  function spawnLegionPop(anchorEl) {
    var boardRect = board.getBoundingClientRect();
    var r = anchorEl.getBoundingClientRect();
    var cx = r.left - boardRect.left + r.width / 2;
    var cy = r.top - boardRect.top + r.height / 2;
    var img = document.createElement('img');
    img.className = 'legion-pop';
    img.src = 'legion.png';
    img.alt = '';
    img.style.left = cx + 'px';
    img.style.top = cy + 'px';
    board.appendChild(img);
    img.addEventListener('animationend', function () { this.remove(); });
  }

  function spawnPoopCloud(cx, cy) {
    var symbols = ['💨', '💩', '💨', '💨'];
    for (var i = 0; i < 6; i++) {
      var s = document.createElement('span');
      s.className = 'poop-puff';
      s.textContent = symbols[randInt(0, symbols.length - 1)];
      var angle = Math.random() * Math.PI * 2;
      var dist = 24 + Math.random() * 34;
      s.style.left = cx + 'px';
      s.style.top = cy + 'px';
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      board.appendChild(s);
      s.addEventListener('animationend', function () { this.remove(); });
    }
  }

  function spawnAbilityCharacter(anchorEl, src, extraClass) {
    var boardRect = board.getBoundingClientRect();
    var r = anchorEl.getBoundingClientRect();
    var cx = r.left - boardRect.left + r.width / 2;
    var cy = r.top - boardRect.top + r.height / 2;
    var img = document.createElement('img');
    img.className = 'ability-pop ' + extraClass;
    img.src = src;
    img.alt = '';
    img.style.left = cx + 'px';
    img.style.top = cy + 'px';
    board.appendChild(img);
    setTimeout(function () {
      img.classList.add('poof-out');
      Sound.poof();
      spawnPoopCloud(cx, cy);
      img.addEventListener('animationend', function () { img.remove(); });
    }, 2200);
  }

  function useLegionAbility() {
    if (state.gameOver) return;
    if (state.legionUsedThisTurn) {
      showToast('⚔️ Legion needs to rest — try again next turn.', 'bad');
      return;
    }
    state.legionUsedThisTurn = true;
    state.shield = true;
    playerToken.classList.add('shielded');
    Sound.legionArrive();
    spawnAbilityCharacter(playerToken, 'legion.png', 'legion-ability-pop');
    showToast('⚔️ Legion is protecting you from the bushes!', 'good');
  }

  function useReaperAbility() {
    if (state.gameOver) return;
    if (state.reaperUsedThisTurn) {
      showToast('💀 Reaper needs to rest — try again next turn.', 'bad');
      return;
    }
    var targetIdx = null;
    for (var i = state.playerIndex; i < Math.min(FINISH, state.playerIndex + 8); i++) {
      if (state.poopTiles.has(i) && !state.wipedTiles.has(i)) { targetIdx = i; break; }
    }
    if (targetIdx == null) {
      showToast('💀 No poop zones nearby for Reaper to clean.', 'bad');
      return;
    }
    state.reaperUsedThisTurn = true;
    state.wipedTiles.add(targetIdx);
    tileEls[targetIdx].classList.add('wiped');
    Sound.reaperClean();
    spawnSparkles(tileEls[targetIdx]);
    spawnAbilityCharacter(tileEls[targetIdx], 'reaper.png', 'reaper-ability-pop');
    showToast('💀 Reaper cleaned a poop zone ahead!', 'good');
  }

  function spawnTpStreamers(container) {
    var count = 16;
    for (var i = 0; i < count; i++) {
      var s = document.createElement('div');
      s.className = 'tp-streamer';
      var angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      var dist = 110 + Math.random() * 150;
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      s.style.setProperty('--rot', (Math.random() * 360 - 180) + 'deg');
      s.style.animationDelay = (Math.random() * 0.15) + 's';
      container.appendChild(s);
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

  function nearestBushDistance() {
    var nearest = Infinity;
    for (var i = 0; i < state.bushes.length; i++) {
      var b = state.bushes[i];
      if (b.index >= 0) {
        var dist = state.playerIndex - b.index;
        if (dist < nearest) nearest = dist;
      }
    }
    return nearest;
  }

  function getWinCount() {
    return parseInt(localStorage.getItem(WIN_COUNT_KEY) || '0', 10);
  }

  function incrementWinCount() {
    var n = getWinCount() + 1;
    localStorage.setItem(WIN_COUNT_KEY, String(n));
    return n;
  }

  var SEQUEL_WIN_GOAL = 3;

  // Three cleared rounds earns the sequel at /thereturn.
  function updateSequelUnlock() {
    var box = document.getElementById('sequelUnlock');
    var tease = document.getElementById('sequelTease');
    if (!box) return;
    var wins = getWinCount();
    if (wins >= SEQUEL_WIN_GOAL) {
      box.classList.remove('hidden');
      if (tease) tease.classList.add('hidden');
    } else {
      box.classList.add('hidden');
      if (tease) {
        var left = SEQUEL_WIN_GOAL - wins;
        tease.textContent = 'Win ' + left + ' more round' + (left === 1 ? '' : 's') +
          ' to unlock the sequel...';
        tease.classList.remove('hidden');
      }
    }
  }

  function updateMerchCta() {
    var progressEl = document.getElementById('merchCtaProgress');
    if (!progressEl) return;
    var wins = getWinCount();
    if (wins >= MERCH_WIN_GOAL) {
      if (MERCH_DISCOUNT_CODE) {
        progressEl.innerHTML = '🎉 Unlocked! Use code <strong>' + escapeHtml(MERCH_DISCOUNT_CODE) + '</strong> for 25% off.';
      } else {
        progressEl.innerHTML = '🎉 25% off unlocked after ' + wins + ' wins — code coming soon!';
      }
      progressEl.classList.add('unlocked');
    } else {
      var remaining = MERCH_WIN_GOAL - wins;
      progressEl.innerHTML = '🏆 Win ' + remaining + ' more round' + (remaining === 1 ? '' : 's') + ' to unlock <strong>25% off</strong> merch!';
      progressEl.classList.remove('unlocked');
    }
  }

  function updateHud() {
    scoreEl.textContent = state.score;
    wipesEl.textContent = state.wipes;
    streakEl.textContent = state.streak;
    streakHud.classList.toggle('streak-hot', state.streak >= 2);
    var leaderboard = getLeaderboard();
    var best = leaderboard.length ? leaderboard[0] : 0;
    bestEl.textContent = Math.max(best, state.score);

    var nearest = nearestBushDistance();
    if (nearest === Infinity) {
      proximityEl.textContent = 'far';
      proximityHud.classList.remove('danger');
      Sound.setIntensity(0);
    } else if (nearest <= 4) {
      proximityEl.textContent = 'DANGER!';
      proximityHud.classList.add('danger');
      Sound.setIntensity(2);
    } else if (nearest <= 10) {
      proximityEl.textContent = 'near';
      proximityHud.classList.remove('danger');
      Sound.setIntensity(1);
    } else {
      proximityEl.textContent = 'far';
      proximityHud.classList.remove('danger');
      Sound.setIntensity(0);
    }

    var toFinish = FINISH - state.playerIndex;
    waiterToken.classList.toggle('active', toFinish > 0 && toFinish <= WAITER_DISTANCE);
    tileEls[FINISH].classList.toggle('close', toFinish > 0 && toFinish <= FINISH_SPARKLE_DISTANCE);
  }

  function scrollPlayerIntoView() {
    playerToken.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }

  function spawnFloatingScore(el, text, kind) {
    var boardRect = board.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    var cx = r.left - boardRect.left + r.width / 2;
    var cy = r.top - boardRect.top;
    var s = document.createElement('span');
    s.className = 'floating-score ' + (kind || '');
    s.textContent = text;
    s.style.left = cx + 'px';
    s.style.top = cy + 'px';
    board.appendChild(s);
    s.addEventListener('animationend', function () { this.remove(); });
  }

  var ariaLive = document.getElementById('ariaLive');
  function announce(text) {
    if (ariaLive) ariaLive.textContent = text;
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
    vibrateTile(state.playerIndex);
  }

  function vibrateTile(idx) {
    var el = tileEls[idx];
    if (!el) return;
    el.classList.remove('landed');
    void el.offsetWidth;
    el.classList.add('landed');
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

      var urgentTimeout = setTimeout(function () {
        wipeCard.classList.add('urgent');
        Sound.reaperSting();
      }, WIPE_TIME_MS * 0.55);
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
      if (b.index >= 0) {
        if (!state.legionShown && !bushTokens[i].classList.contains('active')) {
          state.legionShown = true;
          spawnLegionPop(playerToken);
          Sound.legionArrive();
          showToast('⚔️ Legion arrives to help you outrun the bushes!', 'good');
        }
        bushTokens[i].classList.add('active');
      }
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
      spawnFloatingScore(tileEls[state.playerIndex], 'BLOCKED!', 'good');
      showToast('🛡️ Shield blocked the bush!', 'good');
      return false;
    }

    Sound.catchSfx();
    screenShake();
    spawnFloatingScore(tileEls[state.playerIndex], '-20', 'bad');

    state.score = Math.max(0, state.score - 20);
    state.playerIndex = Math.max(0, state.playerIndex - 5);
    state.streak = 0;
    positionToken(playerToken, state.playerIndex, 0.72);
    updateHud();

    await showCaught(pick(CATCH_MSGS) + ' -20 points, knocked back 5 tiles.');
    scrollPlayerIntoView();

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
      spawnFloatingScore(tileEls[FINISH], '+100', 'good');
      updateHud();
      winOverlay.classList.remove('hidden');
      Sound.win();
      Sound.kingCelebration();
      spawnConfetti(winCard);
      kingLogPopup.classList.remove('show');
      void kingLogPopup.offsetWidth;
      kingLogPopup.classList.add('show');
      incrementWinCount();
      updateMerchCta();
      updateSequelUnlock();
      state.gameOver = true;
      submitAndShowGlobalLeaderboard(state.score, state.wipes);
      return true;
    }
    return false;
  }

  function submitAndShowGlobalLeaderboard(score, wipes) {
    if (currentUser) {
      signInPrompt.classList.add('hidden');
      fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: score, wipes: wipes })
      }).catch(function () { /* ignore */ }).then(function () {
        fetchGlobalLeaderboard(globalLeaderboardList);
      });
    } else {
      signInPrompt.classList.remove('hidden');
      fetchGlobalLeaderboard(globalLeaderboardList);
    }
  }

  async function handleRoll() {
    if (state.busy || state.gameOver) return;
    state.busy = true;
    state.legionUsedThisTurn = false;
    state.reaperUsedThisTurn = false;
    rollBtn.disabled = true;
    Sound.unlock();
    Sound.startMusic();
    showToast('\ud83c\udfb5 Now playing: ' + Sound.currentSongName(), 'good');

    rollBtn.classList.add('rolling');
    Sound.roll();
    await sleep(320);
    rollBtn.classList.remove('rolling');

    var roll = randInt(1, 4);
    dieFace.textContent = '(' + roll + ')';

    var target = Math.min(state.playerIndex + roll, FINISH);
    await stepPlayerTo(target);
    scrollPlayerIntoView();

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
      var poopEl = tileEls[landedIndex];
      poopEl.classList.add('poop-hit');
      setTimeout(function () { poopEl.classList.remove('poop-hit'); }, 700);
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
        spawnCleanPop(tileEls[landedIndex]);
        spawnFloatingScore(tileEls[landedIndex], '+' + gained, 'good');
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
        spawnFailPop(tileEls[landedIndex]);
        spawnFloatingScore(tileEls[landedIndex], '-15', 'bad');
        showToast(pick(WIPE_FAIL_MSGS) + ' -15, knocked back 3 tiles', 'bad');
        await stepBackAnimation();
        scrollPlayerIntoView();
      }
      updateHud();
    }

    var hadShieldBeforeBushMove = state.shield;
    await moveBushes();
    updateHud();

    var wasCaught = await checkCatch();
    if (!wasCaught) {
      var shieldConsumedThisTurn = hadShieldBeforeBushMove && !state.shield;
      if (!shieldConsumedThisTurn && nearestBushDistance() <= 3) {
        state.score += 15;
        Sound.closeCall();
        spawnFloatingScore(playerToken, '+15', 'good');
        showToast('😅 Close call! +15', 'good');
        updateHud();
      }
      if (checkWin()) { state.busy = false; return; }
    }

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
    } else if (e.code === 'KeyL' || e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      useLegionAbility();
    } else if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      useReaperAbility();
    }
  });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(repositionAll, 100);
  });

  buildBoard();
  resetGame();
  fetchMe();
  updateMerchCta();
  updateSequelUnlock();
  openOverlayFromHash();

  if (localStorage.getItem(INTRO_SEEN_KEY) !== '1') {
    openOverlay(introOverlay);
  }

  // ---------- Grand entrance: logo pop, TP streamers, and a crowd chant on game start ----------
  (function () {
    var siteLogo = document.getElementById('siteLogo');
    var gameHeader = document.getElementById('gameHeader');
    if (siteLogo && gameHeader) {
      siteLogo.classList.add('intro-pop');
      spawnTpStreamers(gameHeader);
    }
    var chantPlayed = false;
    function playCrowdChantOnce() {
      if (chantPlayed) return;
      chantPlayed = true;
      Sound.unlock();
      Sound.crowdChant();
      document.removeEventListener('click', playCrowdChantOnce);
      document.removeEventListener('touchend', playCrowdChantOnce);
      document.removeEventListener('keydown', playCrowdChantOnce);
    }
    // 'click'/'touchend' are the gesture types mobile browsers reliably treat as
    // audio-unlocking; 'pointerdown' fires too early on iOS Safari to count.
    document.addEventListener('click', playCrowdChantOnce);
    document.addEventListener('touchend', playCrowdChantOnce);
    document.addEventListener('keydown', playCrowdChantOnce);
  })();

  // ---------- Day/night tint over the painted background, based on the visitor's local time ----------
  (function () {
    var tint = document.getElementById('dayNightTint');
    if (!tint) return;

    function hexToRgb(hex) {
      var n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function lerpRgb(c1, c2, t) {
      var a = hexToRgb(c1), b = hexToRgb(c2);
      return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    }

    // Keyframes across a 24h day for the tint color/opacity washed over the artwork:
    // dark navy at night, warm glow at sunrise/sunset, fully transparent at midday.
    var TINT_KEYFRAMES = [
      { h: 0, color: '#0a0a2a', opacity: 0.62 },
      { h: 5, color: '#141438', opacity: 0.5 },
      { h: 6.5, color: '#ff9d5c', opacity: 0.26 },
      { h: 9, color: '#ffffff', opacity: 0 },
      { h: 17, color: '#ffffff', opacity: 0 },
      { h: 18.5, color: '#ff7e5c', opacity: 0.28 },
      { h: 20, color: '#141438', opacity: 0.5 },
      { h: 24, color: '#0a0a2a', opacity: 0.62 }
    ];

    function getTint(hour) {
      for (var i = 0; i < TINT_KEYFRAMES.length - 1; i++) {
        var a = TINT_KEYFRAMES[i], b = TINT_KEYFRAMES[i + 1];
        if (hour >= a.h && hour <= b.h) {
          var t = (hour - a.h) / (b.h - a.h || 1);
          return {
            rgb: lerpRgb(a.color, b.color, t),
            opacity: lerp(a.opacity, b.opacity, t)
          };
        }
      }
      return { rgb: hexToRgb(TINT_KEYFRAMES[0].color), opacity: TINT_KEYFRAMES[0].opacity };
    }

    function updateTimeOfDay() {
      var now = new Date();
      var hour = now.getHours() + now.getMinutes() / 60;
      var tv = getTint(hour);
      tint.style.backgroundColor = 'rgba(' + Math.round(tv.rgb[0]) + ',' + Math.round(tv.rgb[1]) + ',' + Math.round(tv.rgb[2]) + ',' + tv.opacity.toFixed(2) + ')';
    }

    updateTimeOfDay();
    setInterval(updateTimeOfDay, 60000);
  })();
})();
