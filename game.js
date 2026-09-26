(function () {
  "use strict";

  var COLS = 10, ROWS = 20, BLOCK = 30;
  var STORAGE_KEY = "izakaya_tetris_save_v2";

  var SHAPES = {
    I: [[1,1,1,1]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1]],
    S: [[0,1,1],[1,1,0]],
    Z: [[1,1,0],[0,1,1]],
    J: [[1,0,0],[1,1,1]],
    L: [[0,0,1],[1,1,1]]
  };
  var COLORS = {
    I: "#3fb7c9", O: "#e8c14a", T: "#b478d6",
    S: "#5fbf7a", Z: "#e0574c", J: "#5b83e0", L: "#e8942e"
  };
  var TYPES = Object.keys(SHAPES);
  var GARBAGE_COLOR = "#7d7466";
  var DROP_INTERVAL_BASE = 700;

  var state = null;

  function freshState() {
    return {
      board: makeGarbageBoard(),
      active: null,
      stockCount: 0,
      chooseMode: false,
      linesCleared: 0,
      eatCount: 0,
      log: [],
      over: false,
      won: false
    };
  }

  function makeGarbageBoard() {
    var board = [];
    for (var r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(null));
    var garbageRows = 9;
    for (var gr = ROWS - garbageRows; gr < ROWS; gr++) {
      var gaps = 2 + Math.floor(Math.random() * 2);
      var gapCols = [];
      while (gapCols.length < gaps) {
        var c = Math.floor(Math.random() * COLS);
        if (gapCols.indexOf(c) === -1) gapCols.push(c);
      }
      for (var col = 0; col < COLS; col++) {
        if (gapCols.indexOf(col) === -1) board[gr][col] = GARBAGE_COLOR;
      }
    }
    return board;
  }

  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.board) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function randomType() { return TYPES[Math.floor(Math.random() * TYPES.length)]; }
  function cloneMatrix(m) { return m.map(function (row) { return row.slice(); }); }
  function spawnPieceOfType(type) {
    var matrix = cloneMatrix(SHAPES[type]);
    var col = Math.floor((COLS - matrix[0].length) / 2);
    return { type: type, matrix: matrix, row: 0, col: col, color: COLORS[type] };
  }

  function collides(matrix, row, col) {
    for (var r = 0; r < matrix.length; r++) {
      for (var c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        var br = row + r, bc = col + c;
        if (bc < 0 || bc >= COLS || br >= ROWS) return true;
        if (br >= 0 && state.board[br][bc]) return true;
      }
    }
    return false;
  }

  function rotateMatrix(m) {
    var rows = m.length, cols = m[0].length, res = [];
    for (var c = 0; c < cols; c++) {
      var newRow = [];
      for (var r = rows - 1; r >= 0; r--) newRow.push(m[r][c]);
      res.push(newRow);
    }
    return res;
  }

  function tryRotate() {
    if (!state.active) return;
    var rotated = rotateMatrix(state.active.matrix);
    var kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++) {
      var newCol = state.active.col + kicks[i];
      if (!collides(rotated, state.active.row, newCol)) {
        state.active.matrix = rotated;
        state.active.col = newCol;
        render();
        return;
      }
    }
  }

  function tryMove(dx) {
    if (!state.active) return;
    var newCol = state.active.col + dx;
    if (!collides(state.active.matrix, state.active.row, newCol)) {
      state.active.col = newCol;
      render();
    }
  }

  function softDrop() {
    if (!state.active) return;
    if (!collides(state.active.matrix, state.active.row + 1, state.active.col)) {
      state.active.row += 1;
      render();
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (!state.active) return;
    while (!collides(state.active.matrix, state.active.row + 1, state.active.col)) {
      state.active.row += 1;
    }
    lockPiece();
  }

  function lockPiece() {
    var p = state.active;
    for (var r = 0; r < p.matrix.length; r++) {
      for (var c = 0; c < p.matrix[r].length; c++) {
        if (!p.matrix[r][c]) continue;
        var br = p.row + r, bc = p.col + c;
        if (br < 0) { triggerGameOver("盤面から溢れました。もう戻れません。"); return; }
        state.board[br][bc] = p.color;
      }
    }
    state.active = null;
    clearLines();
    checkWin();
    if (!state.over && !state.won) {
      setStatus(state.stockCount > 0 ? "「ミノを出す」を押して続けよう" : "間食してストックを貯めよう");
    }
    save();
    render();
  }

  function clearLines() {
    var cleared = 0;
    for (var r = ROWS - 1; r >= 0; r--) {
      var full = true;
      for (var c = 0; c < COLS; c++) { if (!state.board[r][c]) { full = false; break; } }
      if (full) {
        state.board.splice(r, 1);
        state.board.unshift(new Array(COLS).fill(null));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      state.linesCleared += cleared;
      setStatus(cleared + "ライン消去！");
    }
  }

  function boardIsClear() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (state.board[r][c]) return false;
    return true;
  }

  function checkWin() {
    if (boardIsClear()) { state.won = true; showEnd(true); }
  }

  function triggerGameOver(msg) {
    state.over = true;
    state.active = null;
    showEnd(false, msg);
    save();
  }

  // ---------- stock / spawn ----------
  function requestSpawn() {
    if (state.over || state.won) return;
    if (state.active) return;
    if (state.stockCount <= 0) return;

    if (state.chooseMode) {
      openChooseModal(function (type) { doSpawn(type); });
    } else {
      doSpawn(randomType());
    }
  }

  function doSpawn(type) {
    state.stockCount -= 1;
    var piece = spawnPieceOfType(type);
    if (collides(piece.matrix, piece.row, piece.col)) {
      triggerGameOver("盤面が完全に埋まりました。KO...");
      return;
    }
    state.active = piece;
    setStatus("");
    save();
    render();
  }

  function eatItem() {
    if (state.over || state.won) return;
    var name = document.getElementById("itemName").value.trim();
    if (!name) name = "間食";
    state.stockCount += 1;
    state.eatCount += 1;
    state.log.unshift({
      name: name,
      t: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
    });
    if (state.log.length > 30) state.log.pop();
    document.getElementById("itemName").value = "";
    if (!state.active) setStatus("「ミノを出す」を押して盤面に置こう");
    save();
    render();
  }

  function openChooseModal(callback) {
    var overlay = document.getElementById("chooseOverlay");
    var grid = document.getElementById("choiceGrid");
    grid.innerHTML = "";
    TYPES.forEach(function (type) {
      var btn = document.createElement("button");
      btn.className = "choice-piece";
      btn.style.color = COLORS[type];
      btn.style.borderColor = COLORS[type];
      btn.textContent = type;
      btn.onclick = function () {
        overlay.classList.remove("show");
        callback(type);
      };
      grid.appendChild(btn);
    });
    overlay.classList.add("show");
  }

  // ---------- rendering ----------
  var ctx = null;
  function render() {
    if (!ctx) ctx = document.getElementById("board").getContext("2d");
    var styles = getComputedStyle(document.documentElement);
    var emptyColor = styles.getPropertyValue("--board-empty").trim();
    var gridColor = styles.getPropertyValue("--board-grid").trim();

    ctx.fillStyle = emptyColor;
    ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (var gc = 0; gc <= COLS; gc++) {
      ctx.beginPath(); ctx.moveTo(gc * BLOCK, 0); ctx.lineTo(gc * BLOCK, ROWS * BLOCK); ctx.stroke();
    }
    for (var gr = 0; gr <= ROWS; gr++) {
      ctx.beginPath(); ctx.moveTo(0, gr * BLOCK); ctx.lineTo(COLS * BLOCK, gr * BLOCK); ctx.stroke();
    }

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (state.board[r][c]) drawBlock(c, r, state.board[r][c]);
      }
    }

    if (state.active) {
      var p = state.active;
      for (var mr = 0; mr < p.matrix.length; mr++) {
        for (var mc = 0; mc < p.matrix[mr].length; mc++) {
          if (p.matrix[mr][mc]) drawBlock(p.col + mc, p.row + mr, p.color);
        }
      }
    }

    document.getElementById("stockCountEl").innerHTML = state.stockCount + "<span class='unit'>個</span>";
    var spawnBtn = document.getElementById("spawnBtn");
    spawnBtn.disabled = state.stockCount <= 0 || !!state.active || state.over || state.won;

    var moveDisabled = !state.active || state.over || state.won;
    document.getElementById("btnLeft").disabled = moveDisabled;
    document.getElementById("btnRight").disabled = moveDisabled;
    document.getElementById("btnRotate").disabled = moveDisabled;
    document.getElementById("btnDrop").disabled = moveDisabled;

    var logList = document.getElementById("logList");
    logList.innerHTML = "";
    state.log.slice(0, 8).forEach(function (entry) {
      var li = document.createElement("li");
      li.innerHTML = "<span class='name'>🍢 " + escapeHtml(entry.name) + "</span><span>" + entry.t + "</span>";
      logList.appendChild(li);
    });

    document.getElementById("statLines").textContent = state.linesCleared;
    document.getElementById("statEat").textContent = state.eatCount;

    document.getElementById("chooseModeToggle").checked = state.chooseMode;
  }

  function drawBlock(col, row, color) {
    var x = col * BLOCK, y = row * BLOCK;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.strokeRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function setStatus(msg) { document.getElementById("statusLine").textContent = msg; }

  function showEnd(won, msg) {
    var overlay = document.getElementById("endOverlay");
    document.getElementById("endTitle").textContent = won ? "生還成功！" : "ゲームオーバー";
    document.getElementById("endMessage").textContent = won
      ? "積み上がった盤面を完全に消し切りました。お会計、お願いします。"
      : (msg || "戦線離脱です。");
    document.getElementById("endLines").textContent = state.linesCleared;
    document.getElementById("endEat").textContent = state.eatCount;
    overlay.classList.add("show");
  }

  // ---------- gravity loop ----------
  var lastTime = 0, acc = 0;
  function loop(ts) {
    if (!lastTime) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (!state.over && !state.won && state.active) {
      acc += dt;
      var interval = Math.max(300, DROP_INTERVAL_BASE - state.linesCleared * 12);
      if (acc > interval) { acc = 0; softDrop(); }
    }
    requestAnimationFrame(loop);
  }

  // ---------- input ----------
  document.getElementById("btnLeft").addEventListener("click", function () { tryMove(-1); });
  document.getElementById("btnRight").addEventListener("click", function () { tryMove(1); });
  document.getElementById("btnRotate").addEventListener("click", tryRotate);
  document.getElementById("btnDrop").addEventListener("click", hardDrop);
  document.getElementById("spawnBtn").addEventListener("click", requestSpawn);
  document.getElementById("btnEat").addEventListener("click", eatItem);

  document.addEventListener("keydown", function (e) {
    if (state.over || state.won) return;
    if (e.key === "ArrowLeft") tryMove(-1);
    else if (e.key === "ArrowRight") tryMove(1);
    else if (e.key === "ArrowUp") tryRotate();
    else if (e.key === "ArrowDown") softDrop();
    else if (e.key === " ") { e.preventDefault(); hardDrop(); }
  });

  document.getElementById("chooseModeToggle").addEventListener("change", function (e) {
    state.chooseMode = e.target.checked;
    save();
  });

  document.getElementById("resetBtn").addEventListener("click", function () {
    if (window.confirm("進行状況をリセットして最初からやり直しますか？")) startNew();
  });
  document.getElementById("endRestart").addEventListener("click", function () {
    document.getElementById("endOverlay").classList.remove("show");
    startNew();
  });

  document.getElementById("themeToggle").addEventListener("click", function () {
    var root = document.documentElement;
    var cur = root.getAttribute("data-theme");
    root.setAttribute("data-theme", cur === "light" ? "dark" : "light");
    render();
  });

  function startNew() {
    state = freshState();
    setStatus("間食してストックを貯めよう");
    save();
    render();
  }

  function boot() {
    var loaded = load();
    state = loaded || freshState();
    render();
    requestAnimationFrame(loop);
  }

  boot();
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js").catch(function () {
      /* offline install just won't be available; the game still works fine */
    });
  });
}
