(function () {
  'use strict';

  var COLS = 6;
  var ROWS = 8;
  var TOTAL = COLS * ROWS;
  var FINISH = TOTAL - 1;
  var STEP_MS = 170;
  var WIPE_TIME_MS = 2400;
  var WIPE_TAPS_NEEDED = 3;
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

  var wipeOverlay = document.getElementById('wipeOverlay');
  var wipeTimerFill = document.getElementById('wipeTimerFill');
  var wipeProgressFill = document.getElementById('wipeProgressFill');
  var wipeBtn = document.getElementById('wipeBtn');

  var caughtOverlay = document.getElementById('caughtOverlay');
  var caughtText = document.getElementById('caughtText');

  var winOverlay = document.getElementById('winOverlay');
  var finalScoreEl = document.getElementById('finalScore');
  var newBestText = document.getElementById('newBestText');
  var playAgainBtn = document.getElementById('playAgainBtn');

  var tileEls = [];
  var playerToken, bushTokens = [];

  var state = null;
  var toastTimer = null;

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

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
  }

  function pickPoopTiles() {
    var poop = new Set();
    var count = 9;
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
  }

  function showToast(text, kind) {
    toastEl.textContent = text;
    toastEl.className = 'toast show' + (kind ? ' ' + kind : '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = 'toast'; }, 1500);
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
  }

  async function stepPlayerTo(target) {
    while (state.playerIndex < target) {
      state.playerIndex++;
      positionToken(playerToken, state.playerIndex, 0.72);
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
      wipeTimerFill.style.transition = 'none';
      wipeTimerFill.style.width = '100%';
      wipeOverlay.classList.remove('hidden');

      void wipeTimerFill.offsetWidth;
      wipeTimerFill.style.transition = 'width ' + WIPE_TIME_MS + 'ms linear';
      wipeTimerFill.style.width = '0%';

      var timeout = setTimeout(function () { finish(false); }, WIPE_TIME_MS);

      function onTap() {
        if (done) return;
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
      state.gameOver = true;
      return true;
    }
    return false;
  }

  async function handleRoll() {
    if (state.busy || state.gameOver) return;
    state.busy = true;
    rollBtn.disabled = true;

    var roll = randInt(1, 4);
    dieFace.textContent = '(' + roll + ')';

    var target = Math.min(state.playerIndex + roll, FINISH);
    await stepPlayerTo(target);

    if (checkWin()) { state.busy = false; return; }

    var landedIndex = state.playerIndex;
    if (state.poopTiles.has(landedIndex) && !state.wipedTiles.has(landedIndex)) {
      var success = await startWipeQTE();
      if (success) {
        state.wipedTiles.add(landedIndex);
        state.wipes++;
        state.score += 30;
        tileEls[landedIndex].classList.add('wiped');
        showToast('+30 Nice wipe!', 'good');
      } else {
        state.score = Math.max(0, state.score - 15);
        state.playerIndex = Math.max(0, state.playerIndex - 3);
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
