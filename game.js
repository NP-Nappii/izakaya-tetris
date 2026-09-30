(function () {
  "use strict";

  /* =========================================================
     居酒屋テトリス v9
     - 詰み盤面固定
     - 目標ライン 1～18
     - ストックはミノ抽選時に即時消費
     - 除外は1個につきストック1消費、解除で1返却
     - 除外ボタンは固定サイズ。状態変更で文字幅を変えない
     - 7ミノは「実際の形＋I/O/T/S/Z/J/L」表示
     - ゴースト表示 ON/OFF
     - 自動一時停止＋手動一時停止
     - スリープ中の時間・落下を加算しない
     - FREEは盤面プレビュー＋着地予定ゴースト付き
     ========================================================= */

  var COLS = 10;
  var ROWS = 20;
  var BLOCK = 30;
  var CHOICE_BLOCK = 22;

  var STORAGE_KEY = "izakaya_tetris_save_v9";
  var LEGACY_KEYS = [
    "izakaya_tetris_save_v8",
    "izakaya_tetris_save_v7",
    "izakaya_tetris_save_v6",
    "izakaya_tetris_save_v5",
    "izakaya_tetris_save_v4",
    "izakaya_tetris_save_v3"
  ];

  var THEME_KEY = "izakaya_tetris_theme";
  var MAX_TARGET_LINES = 18;
  var DEFAULT_DROP_INTERVAL = 700;
  var DEFAULT_GHOST_ENABLED = true;
  var GARBAGE_COLOR = "#7d7466";

  var SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
  };

  var COLORS = {
    I: "#3fb7c9",
    O: "#e8c14a",
    T: "#b478d6",
    S: "#5fbf7a",
    Z: "#e0574c",
    J: "#5b83e0",
    L: "#e8942e"
  };

  var OUTCOME_LABEL = {
    I: "I",
    O: "O",
    T: "T",
    S: "S",
    Z: "Z",
    J: "J",
    L: "L",
    MISS: "スカ",
    FREE: "自由選択"
  };

  var OUTCOME_COLOR = {
    I: COLORS.I,
    O: COLORS.O,
    T: COLORS.T,
    S: COLORS.S,
    Z: COLORS.Z,
    J: COLORS.J,
    L: COLORS.L,
    MISS: "#8d8172",
    FREE: "#d3a24d"
  };

  var TYPES = Object.keys(SHAPES);
  var OUTCOMES = TYPES.concat(["MISS", "FREE"]);

  var state = null;
  var chooseCallback = null;
  var selectedChoiceType = null;
  var ctx = null;
  var choiceCtx = null;
  var lastTime = 0;
  var acc = 0;
  var lastTouchTarget = null;
  var lastTouchTime = 0;
  var lastClockSave = 0;
  var guardTimes = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function guarded(key, action, interval) {
    var now = Date.now();
    var wait = interval || 300;
    if (guardTimes[key] && now - guardTimes[key] < wait) return;
    guardTimes[key] = now;
    action();
  }

  function clampTarget(v) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = 3;
    return Math.max(1, Math.min(MAX_TARGET_LINES, v));
  }

  function clampDropInterval(v) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = DEFAULT_DROP_INTERVAL;
    return Math.max(150, Math.min(1200, v));
  }

  function makeEmptyBoard() {
    var board = [];
    for (var r = 0; r < ROWS; r++) {
      board.push(new Array(COLS).fill(null));
    }
    return board;
  }

  function makeGarbageBoard(garbageRows) {
    var board = makeEmptyBoard();
    garbageRows = Math.max(1, Math.min(ROWS - 2, clampTarget(garbageRows)));

    for (var r = ROWS - garbageRows; r < ROWS; r++) {
      var gaps = 2 + Math.floor(Math.random() * 2);
      var gapCols = [];

      while (gapCols.length < gaps) {
        var c = Math.floor(Math.random() * COLS);
        if (gapCols.indexOf(c) === -1) gapCols.push(c);
      }

      for (var col = 0; col < COLS; col++) {
        if (gapCols.indexOf(col) === -1) {
          board[r][col] = GARBAGE_COLOR;
        }
      }
    }

    return board;
  }

  function freshState() {
    var target = state && typeof state.targetLines === "number" ? clampTarget(state.targetLines) : 3;
    var now = Date.now();

    return {
      board: makeGarbageBoard(target),
      active: null,
      stockCount: 0,
      excluded: [],
      targetLines: target,
      linesCleared: 0,
      eatCount: 0,
      log: [],
      over: false,
      won: false,
      startedAt: now,
      elapsedMs: 0,
      endedAt: null,
      dropInterval: DEFAULT_DROP_INTERVAL,
      foodDuplicateMode: "allow",
      drinkDuplicateMode: "allow",
      registeredFoods: [],
      registeredDrinks: [],
      storeName: "最初の店",
      paused: false,
      timerStartedAt: now,
      ghostEnabled: DEFAULT_GHOST_ENABLED
    };
  }

  function normalizeLoadedState(parsed) {
    if (!parsed || !Array.isArray(parsed.board)) return null;

    parsed.targetLines = clampTarget(parsed.targetLines);
    parsed.board = normalizeBoard(parsed.board);
    parsed.excluded = Array.isArray(parsed.excluded) ? parsed.excluded.filter(function (v) { return OUTCOMES.indexOf(v) !== -1; }) : [];
    parsed.log = Array.isArray(parsed.log) ? parsed.log : [];
    parsed.stockCount = typeof parsed.stockCount === "number" ? Math.max(0, Math.floor(parsed.stockCount)) : 0;
    parsed.linesCleared = typeof parsed.linesCleared === "number" ? Math.max(0, Math.floor(parsed.linesCleared)) : 0;
    parsed.eatCount = typeof parsed.eatCount === "number" ? Math.max(0, Math.floor(parsed.eatCount)) : 0;
    parsed.over = typeof parsed.over === "boolean" ? parsed.over : false;
    parsed.won = typeof parsed.won === "boolean" ? parsed.won : false;
    parsed.startedAt = typeof parsed.startedAt === "number" ? parsed.startedAt : Date.now();
    parsed.elapsedMs = typeof parsed.elapsedMs === "number" ? Math.max(0, parsed.elapsedMs) : 0;
    parsed.endedAt = typeof parsed.endedAt === "number" ? parsed.endedAt : null;
    parsed.dropInterval = clampDropInterval(parsed.dropInterval);

    if (parsed.foodDuplicateMode !== "allow" && parsed.foodDuplicateMode !== "deny") {
      parsed.foodDuplicateMode = parsed.duplicateMode === "deny" ? "deny" : "allow";
    }
    if (parsed.drinkDuplicateMode !== "allow" && parsed.drinkDuplicateMode !== "deny") {
      parsed.drinkDuplicateMode = parsed.duplicateMode === "deny" ? "deny" : "allow";
    }

    parsed.registeredFoods = Array.isArray(parsed.registeredFoods) ? parsed.registeredFoods : [];
    parsed.registeredDrinks = Array.isArray(parsed.registeredDrinks) ? parsed.registeredDrinks : [];

    parsed.storeName = typeof parsed.storeName === "string" && parsed.storeName.trim() ? parsed.storeName.trim() : "最初の店";
    parsed.ghostEnabled = typeof parsed.ghostEnabled === "boolean" ? parsed.ghostEnabled : DEFAULT_GHOST_ENABLED;

    if (parsed.active && (!parsed.active.matrix || !Array.isArray(parsed.active.matrix) || !parsed.active.type)) {
      parsed.active = null;
    } else if (parsed.active) {
      parsed.active.matrix = normalizeMatrix(parsed.active.matrix);
      parsed.active.col = typeof parsed.active.col === "number" ? parsed.active.col : 3;
      parsed.active.row = typeof parsed.active.row === "number" ? parsed.active.row : 0;
      parsed.active.type = TYPES.indexOf(parsed.active.type) !== -1 ? parsed.active.type : "T";
      parsed.active.color = COLORS[parsed.active.type];
    }

    /*
     * 起動直後は必ず停止状態にする。
     * 保存時刻と現在時刻の差を経過時間に加算しない。
     */
    parsed.paused = true;
    parsed.timerStartedAt = 0;

    if (parsed.registeredFoods.length === 0) {
      parsed.registeredFoods = rebuildRegisteredItems(parsed, "food");
    }
    if (parsed.registeredDrinks.length === 0) {
      parsed.registeredDrinks = rebuildRegisteredItems(parsed, "drink");
    }

    return parsed;
  }

  function normalizeBoard(board) {
    var result = makeEmptyBoard();
    for (var r = 0; r < Math.min(ROWS, board.length); r++) {
      if (!Array.isArray(board[r])) continue;
      for (var c = 0; c < Math.min(COLS, board[r].length); c++) {
        result[r][c] = board[r][c] || null;
      }
    }
    return result;
  }

  function normalizeMatrix(matrix) {
    if (!Array.isArray(matrix) || !matrix.length) return cloneMatrix(SHAPES.T);
    return matrix.map(function (row) {
      return Array.isArray(row) ? row.map(function (v) { return v ? 1 : 0; }) : [0];
    });
  }

  function tryLoad(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function load() {
    var parsed = tryLoad(STORAGE_KEY);
    if (parsed) return normalizeLoadedState(parsed);

    for (var i = 0; i < LEGACY_KEYS.length; i++) {
      parsed = tryLoad(LEGACY_KEYS[i]);
      if (parsed) return normalizeLoadedState(parsed);
    }

    return null;
  }

  function save() {
    if (!state) return;
    updateElapsed();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* 保存できない環境でもゲームは継続 */
    }
  }

  function rebuildRegisteredItems(loaded, category) {
    var result = [];
    if (!Array.isArray(loaded.log)) return result;

    loaded.log.forEach(function (entry) {
      if (!entry || entry.category !== category) return;
      if (entry.store && entry.store !== loaded.storeName) return;
      var n = normalizeItemName(entry.name || "");
      if (n) result.push(n);
    });

    return unique(result);
  }

  function unique(arr) {
    return arr.filter(function (value, index) {
      return arr.indexOf(value) === index;
    });
  }

  function normalizeItemName(name) {
    return String(name)
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function cloneMatrix(matrix) {
    return matrix.map(function (row) { return row.slice(); });
  }

  function rotateMatrix(matrix) {
    var rows = matrix.length;
    var cols = matrix[0].length;
    var result = [];

    for (var c = 0; c < cols; c++) {
      var row = [];
      for (var r = rows - 1; r >= 0; r--) row.push(matrix[r][c]);
      result.push(row);
    }
    return result;
  }

  function spawnPieceOfType(type) {
    var matrix = cloneMatrix(SHAPES[type]);
    var col = Math.floor((COLS - matrix[0].length) / 2);

    return {
      type: type,
      matrix: matrix,
      row: 0,
      col: col,
      color: COLORS[type]
    };
  }

  function collides(matrix, row, col) {
    for (var r = 0; r < matrix.length; r++) {
      for (var c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        var br = row + r;
        var bc = col + c;

        if (bc < 0 || bc >= COLS || br >= ROWS) return true;
        if (br >= 0 && state.board[br][bc]) return true;
      }
    }
    return false;
  }

  function ghostRow(piece) {
    var row = piece.row;
    while (!collides(piece.matrix, row + 1, piece.col)) row++;
    return row;
  }

  function mergePiece(piece) {
    for (var r = 0; r < piece.matrix.length; r++) {
      for (var c = 0; c < piece.matrix[r].length; c++) {
        if (!piece.matrix[r][c]) continue;
        var br = piece.row + r;
        var bc = piece.col + c;
        if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
          state.board[br][bc] = piece.color;
        }
      }
    }
  }

  function clearLines() {
    var cleared = 0;

    for (var r = ROWS - 1; r >= 0; r--) {
      var full = true;
      for (var c = 0; c < COLS; c++) {
        if (!state.board[r][c]) {
          full = false;
          break;
        }
      }

      if (full) {
        state.board.splice(r, 1);
        state.board.unshift(new Array(COLS).fill(null));
        cleared++;
        r++;
      }
    }

    if (cleared > 0) {
      state.linesCleared += cleared;
      setStatus(cleared + "ライン消去！ (" + state.linesCleared + " / " + state.targetLines + ")");
    }
  }

  function lockPiece() {
    if (!state.active || state.over || state.won || state.paused) return;

    var piece = state.active;
    mergePiece(piece);
    state.active = null;

    clearLines();
    checkWin();

    if (!state.won) {
      save();
      render();
    }
  }

  function checkWin() {
    if (state.linesCleared >= state.targetLines && !state.won) {
      updateElapsed();
      state.won = true;
      state.active = null;
      freezeElapsed();
      save();
      showEnd(true);
      render();
    }
  }

  function triggerGameOver(message) {
    updateElapsed();
    state.over = true;
    state.active = null;
    state.excluded = [];
    state.paused = true;
    freezeElapsed();
    save();
    showEnd(false, message);
    render();
  }

  function tryMove(dx) {
    if (!state.active || state.paused || state.over || state.won) return;
    var nextCol = state.active.col + dx;
    if (!collides(state.active.matrix, state.active.row, nextCol)) {
      state.active.col = nextCol;
      save();
      render();
    }
  }

  function tryRotate() {
    if (!state.active || state.paused || state.over || state.won) return;

    var rotated = rotateMatrix(state.active.matrix);
    var kicks = [0, -1, 1, -2, 2];

    for (var i = 0; i < kicks.length; i++) {
      var newCol = state.active.col + kicks[i];
      if (!collides(rotated, state.active.row, newCol)) {
        state.active.matrix = rotated;
        state.active.col = newCol;
        save();
        render();
        return;
      }
    }
  }

  function softDrop() {
    if (!state.active || state.paused || state.over || state.won) return;

    if (!collides(state.active.matrix, state.active.row + 1, state.active.col)) {
      state.active.row++;
      save();
      render();
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (!state.active || state.paused || state.over || state.won) return;
    state.active.row = ghostRow(state.active);
    lockPiece();
  }

  function setStatus(text) {
    byId("statusLine").textContent = text;
  }

  function scrollBoardIntoView() {
    var frame = byId("boardFrame");
    if (!frame) return;

    window.requestAnimationFrame(function () {
      frame.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* =========================================================
     抽選・除外
     ========================================================= */

  function toggleExclude(outcome) {
    if (state.over || state.won || state.paused || state.active) return;

    var index = state.excluded.indexOf(outcome);

    if (index !== -1) {
      state.excluded.splice(index, 1);
      state.stockCount++;
      setStatus(OUTCOME_LABEL[outcome] + "の除外を解除しました。ストック＋1");
      save();
      render();
      return;
    }

    var remaining = OUTCOMES.length - state.excluded.length;
    if (remaining <= 1 || state.stockCount <= 0) return;

    state.stockCount--;
    state.excluded.push(outcome);
    setStatus(OUTCOME_LABEL[outcome] + "を次の抽選から除外しました。ストック－1");
    save();
    render();
  }

  function requestSpawn() {
    if (state.over || state.won || state.paused || state.active || state.stockCount <= 0) return;

    /* 抽選ボタンを押した時点でストック消費を確定 */
    state.stockCount--;

    var pool = OUTCOMES.filter(function (outcome) {
      return state.excluded.indexOf(outcome) === -1;
    });

    /* 今回の抽選開始で除外状態をリセット */
    state.excluded = [];

    var outcome = pool[Math.floor(Math.random() * pool.length)];

    save();

    if (outcome !== "MISS") scrollBoardIntoView();

    handleOutcome(outcome);
  }

  function handleOutcome(outcome) {
    if (outcome === "MISS") {
      setStatus("スカ…ハズレでした。ストックを1消費しました。盤面はそのままです。");
      save();
      render();
      return;
    }

    if (outcome === "FREE") {
      setStatus("自由選択：現在の盤面を確認してミノを選んでください。");
      openChooseModal(function (type) {
        trySpawnType(type, true);
      });
      save();
      render();
      return;
    }

    trySpawnType(outcome, false);
  }

  function trySpawnType(type, fromFreeChoice) {
    if (state.over || state.won) return;
    if (state.paused && !fromFreeChoice) return;

    var piece = spawnPieceOfType(type);

    if (collides(piece.matrix, piece.row, piece.col)) {
      triggerGameOver("盤面が完全に埋まりました。KO...");
      return;
    }

    state.active = piece;
    setStatus(OUTCOME_LABEL[type] + "が出ました。落としてください。");
    save();
    render();
  }

  /* =========================================================
     FREE 自由選択
     ========================================================= */

  function openChooseModal(callback) {
    chooseCallback = callback;
    selectedChoiceType = null;

    renderChoiceGrid();
    renderChoiceBoardPreview();

    byId("selectedChoiceText").textContent = "ミノを選択してください";
    byId("chooseConfirm").disabled = true;

    var overlay = byId("chooseOverlay");
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
  }

  function closeChooseModal() {
    chooseCallback = null;
    selectedChoiceType = null;
    var overlay = byId("chooseOverlay");
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
  }

  function selectChoiceType(type) {
    if (state.over || state.won) return;

    selectedChoiceType = type;
    byId("selectedChoiceText").textContent = type + " を選択中。下のボタンで確定してください。";
    byId("chooseConfirm").disabled = false;
    renderChoiceGrid();
    renderChoiceBoardPreview();
  }

  function renderChoiceGrid() {
    var grid = byId("choiceGrid");
    grid.innerHTML = "";

    TYPES.forEach(function (type) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "choice-piece" + (selectedChoiceType === type ? " selected" : "");
      button.setAttribute("aria-label", type + "ミノを選択");
      button.addEventListener("click", function () {
        guarded("choice-" + type, function () {
          selectChoiceType(type);
        }, 220);
      });

      button.appendChild(createMiniMino(type, false, false));

      var label = document.createElement("div");
      label.className = "choice-label";
      label.textContent = type;
      button.appendChild(label);
      grid.appendChild(button);
    });
  }

  function renderChoiceBoardPreview() {
    if (!choiceCtx) choiceCtx = byId("choiceBoardPreview").getContext("2d");

    var styles = getComputedStyle(document.documentElement);
    var empty = styles.getPropertyValue("--board-empty").trim();
    var gridColor = styles.getPropertyValue("--board-grid").trim();

    choiceCtx.fillStyle = empty;
    choiceCtx.fillRect(0, 0, COLS * CHOICE_BLOCK, ROWS * CHOICE_BLOCK);

    choiceCtx.strokeStyle = gridColor;
    choiceCtx.lineWidth = 1;

    for (var c = 0; c <= COLS; c++) {
      choiceCtx.beginPath();
      choiceCtx.moveTo(c * CHOICE_BLOCK, 0);
      choiceCtx.lineTo(c * CHOICE_BLOCK, ROWS * CHOICE_BLOCK);
      choiceCtx.stroke();
    }

    for (var r = 0; r <= ROWS; r++) {
      choiceCtx.beginPath();
      choiceCtx.moveTo(0, r * CHOICE_BLOCK);
      choiceCtx.lineTo(COLS * CHOICE_BLOCK, r * CHOICE_BLOCK);
      choiceCtx.stroke();
    }

    for (var br = 0; br < ROWS; br++) {
      for (var bc = 0; bc < COLS; bc++) {
        if (state.board[br][bc]) drawMiniBoardBlock(choiceCtx, bc, br, state.board[br][bc]);
      }
    }

    if (selectedChoiceType && state.ghostEnabled) {
      var previewPiece = spawnPieceOfType(selectedChoiceType);
      if (!collides(previewPiece.matrix, previewPiece.row, previewPiece.col)) {
        var row = ghostRow(previewPiece);
        drawMiniGhost(choiceCtx, previewPiece, row);
      }
    }
  }

  function drawMiniBoardBlock(context, col, row, color) {
    context.fillStyle = color;
    context.fillRect(col * CHOICE_BLOCK + 1, row * CHOICE_BLOCK + 1, CHOICE_BLOCK - 2, CHOICE_BLOCK - 2);
  }

  function drawMiniGhost(context, piece, row) {
    context.save();
    context.strokeStyle = withAlpha(piece.color, .8);
    context.fillStyle = withAlpha(piece.color, .10);
    context.lineWidth = 1.5;
    context.setLineDash([3, 2]);

    for (var r = 0; r < piece.matrix.length; r++) {
      for (var c = 0; c < piece.matrix[r].length; c++) {
        if (!piece.matrix[r][c]) continue;
        var x = (piece.col + c) * CHOICE_BLOCK;
        var y = (row + r) * CHOICE_BLOCK;
        context.fillRect(x + 2, y + 2, CHOICE_BLOCK - 4, CHOICE_BLOCK - 4);
        context.strokeRect(x + 2.5, y + 2.5, CHOICE_BLOCK - 5, CHOICE_BLOCK - 5);
      }
    }
    context.restore();
  }

  function confirmChoice() {
    if (!selectedChoiceType || !chooseCallback) return;

    var type = selectedChoiceType;
    var callback = chooseCallback;
    closeChooseModal();
    callback(type);
  }

  /* =========================================================
     ミノ小アイコン
     ========================================================= */

  function createMiniMino(type, excluded, isChip) {
    if (type === "MISS") {
      return createSpecialPreview("×", "スカ", excluded, isChip, type);
    }

    if (type === "FREE") {
      return createSpecialPreview("★", "自由選択", excluded, isChip, type);
    }

    var matrix = SHAPES[type];
    var wrap = document.createElement("div");
    wrap.className = "mino-preview";
    wrap.style.gridTemplateColumns = "repeat(" + matrix[0].length + ", 8px)";
    wrap.style.gridTemplateRows = "repeat(" + matrix.length + ", 8px)";

    /* 0 のセルはDOMに作らず、実際にブロックがある場所だけ描画。
       これにより除外時でも本来のミノ形状がはっきり見える。 */
    for (var r = 0; r < matrix.length; r++) {
      for (var c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;

        var cell = document.createElement("span");
        cell.className = "mino-cell";
        cell.style.gridColumn = String(c + 1);
        cell.style.gridRow = String(r + 1);
        cell.style.background = excluded ? "transparent" : COLORS[type];
        cell.style.border = excluded ? "1.5px solid " + COLORS[type] : "none";
        wrap.appendChild(cell);
      }
    }

    return wrap;
  }

  function createSpecialPreview(symbol, labelText, excluded, isChip, type) {
    var wrap = document.createElement("div");
    wrap.className = "mino-preview special-preview";
    wrap.textContent = symbol;
    wrap.style.color = OUTCOME_COLOR[type] || "#fff";
    return wrap;
  }

  /* =========================================================
     除外チップ
     ========================================================= */

  function renderExcludeChips() {
    var wrap = byId("excludeChips");
    wrap.innerHTML = "";

    var remaining = OUTCOMES.length - state.excluded.length;

    OUTCOMES.forEach(function (outcome) {
      var excluded = state.excluded.indexOf(outcome) !== -1;
      var chip = document.createElement("button");

      chip.type = "button";
      chip.className = "chip" + (excluded ? " chip-excluded" : "");
      chip.style.setProperty("--chip-color", OUTCOME_COLOR[outcome]);
      chip.setAttribute("aria-label", excluded
        ? OUTCOME_LABEL[outcome] + "を除外中。タップで解除"
        : OUTCOME_LABEL[outcome] + "を次の抽選から除外");
      chip.setAttribute("aria-pressed", excluded ? "true" : "false");

      chip.disabled = state.over || state.won || state.paused || !!state.active ||
        (!excluded && (state.stockCount <= 0 || remaining <= 1));

      var preview = createMiniMino(outcome, excluded, true);
      chip.appendChild(preview);

      var label = document.createElement("div");
      label.className = "mino-label";
      label.textContent = OUTCOME_LABEL[outcome];
      chip.appendChild(label);

      chip.addEventListener("click", function () {
        guarded("exclude-" + outcome, function () {
          toggleExclude(outcome);
        }, 260);
      });

      wrap.appendChild(chip);
    });
  }

  /* =========================================================
     食べ物・飲み物・店
     ========================================================= */

  function registerItem(category) {
    if (state.over || state.won || state.paused || state.active) return;

    var inputId = category === "food" ? "foodName" : "drinkName";
    var input = byId(inputId);
    var name = input.value.trim();

    if (!name) {
      setStatus(category === "food" ? "食べ物の名前を入力してください。" : "飲み物の名前を入力してください。");
      return;
    }

    var normalized = normalizeItemName(name);
    var list = category === "food" ? state.registeredFoods : state.registeredDrinks;
    var duplicateMode = category === "food" ? state.foodDuplicateMode : state.drinkDuplicateMode;

    if (duplicateMode === "deny" && list.indexOf(normalized) !== -1) {
      setStatus((category === "food" ? "食べ物" : "飲み物") + "「" + name + "」は、この店ですでに登録されています。重複NGです。");
      return;
    }

    list.push(normalized);
    state.stockCount++;
    state.eatCount++;
    state.log.unshift({
      category: category,
      name: name,
      store: state.storeName,
      t: nowLabel()
    });

    input.value = "";
    setStatus((category === "food" ? "🍢 " : "🍺 ") + name + "を記録。ストック＋1！");
    save();
    render();
  }

  function changeStore() {
    if (state.over || state.won || state.paused || state.active) return;

    var name = window.prompt("新しい店の名前を入力してください。", state.storeName);
    if (name === null) return;

    name = name.trim();
    if (!name) {
      setStatus("店名が空なので変更しませんでした。");
      return;
    }

    state.storeName = name;
    state.registeredFoods = [];
    state.registeredDrinks = [];

    setStatus("店を「" + name + "」に変更しました。食べ物・飲み物の重複判定をリセットしました。");
    save();
    render();
  }

  function nowLabel() {
    var d = new Date();
    var hh = String(d.getHours()).padStart(2, "0");
    var mm = String(d.getMinutes()).padStart(2, "0");
    var ss = String(d.getSeconds()).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  }

  /* =========================================================
     経過時間・一時停止
     ========================================================= */

  function updateElapsed() {
    if (!state) return;
    if (state.paused || state.over || state.won) return;
    if (!state.timerStartedAt) {
      state.timerStartedAt = Date.now();
      return;
    }

    var now = Date.now();
    var delta = now - state.timerStartedAt;
    if (delta > 0) state.elapsedMs += delta;
    state.timerStartedAt = now;
  }

  function getElapsedMs() {
    if (!state) return 0;
    if (state.paused || state.over || state.won || !state.timerStartedAt) return state.elapsedMs;
    return state.elapsedMs + Math.max(0, Date.now() - state.timerStartedAt);
  }

  function freezeElapsed() {
    updateElapsed();
    state.timerStartedAt = 0;
    state.endedAt = Date.now();
  }

  function togglePause() {
    if (state.over || state.won) return;

    if (state.paused) {
      state.paused = false;
      state.timerStartedAt = Date.now();
      lastTime = 0;
      acc = 0;
      lastClockSave = 0;
      setStatus("再開しました。ミノを操作できます。");
    } else {
      updateElapsed();
      state.paused = true;
      state.timerStartedAt = 0;
      lastTime = 0;
      acc = 0;
      lastClockSave = 0;
      setStatus("一時停止しました。再開するまで時間もミノの落下も止まります。");
    }

    save();
    render();
  }

  /* =========================================================
     描画
     ========================================================= */

  function withAlpha(hex, alpha) {
    if (!hex || hex.charAt(0) !== "#") return hex;
    var h = hex.slice(1);
    if (h.length === 3) {
      h = h.split("").map(function (ch) { return ch + ch; }).join("");
    }
    var n = parseInt(h, 16);
    if (isNaN(n)) return hex;
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
  }

  function drawBlock(col, row, color) {
    var x = col * BLOCK;
    var y = row * BLOCK;

    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);

    ctx.fillStyle = "rgba(255,255,255,.13)";
    ctx.fillRect(x + 3, y + 3, BLOCK - 6, 3);

    ctx.strokeStyle = "rgba(0,0,0,.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1.5, y + 1.5, BLOCK - 3, BLOCK - 3);
  }

  function drawGhost(piece) {
    if (!state.ghostEnabled) return;

    var row = ghostRow(piece);
    if (row === piece.row) return;

    ctx.save();
    ctx.strokeStyle = withAlpha(piece.color, .82);
    ctx.fillStyle = withAlpha(piece.color, .08);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    for (var r = 0; r < piece.matrix.length; r++) {
      for (var c = 0; c < piece.matrix[r].length; c++) {
        if (!piece.matrix[r][c]) continue;
        var x = (piece.col + c) * BLOCK;
        var y = (row + r) * BLOCK;
        ctx.fillRect(x + 3, y + 3, BLOCK - 6, BLOCK - 6);
        ctx.strokeRect(x + 3, y + 3, BLOCK - 6, BLOCK - 6);
      }
    }
    ctx.restore();
  }

  function renderBoard() {
    if (!ctx) ctx = byId("board").getContext("2d");

    var styles = getComputedStyle(document.documentElement);
    var emptyColor = styles.getPropertyValue("--board-empty").trim();
    var gridColor = styles.getPropertyValue("--board-grid").trim();

    ctx.fillStyle = emptyColor;
    ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    for (var c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }

    for (var r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }

    for (var br = 0; br < ROWS; br++) {
      for (var bc = 0; bc < COLS; bc++) {
        if (state.board[br][bc]) drawBlock(bc, br, state.board[br][bc]);
      }
    }

    if (state.active) {
      drawGhost(state.active);

      for (var mr = 0; mr < state.active.matrix.length; mr++) {
        for (var mc = 0; mc < state.active.matrix[mr].length; mc++) {
          if (state.active.matrix[mr][mc]) {
            drawBlock(state.active.col + mc, state.active.row + mr, state.active.color);
          }
        }
      }
    }
  }

  function renderLog() {
    var list = byId("logList");
    list.innerHTML = "";

    state.log.slice(0, 8).forEach(function (entry) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      var meta = document.createElement("span");

      name.className = "name";
      name.textContent = (entry.category === "drink" ? "🍺 " : "🍢 ") + (entry.name || "");

      meta.className = "meta";
      meta.textContent = (entry.store || "最初の店") + " / " + (entry.t || "");

      li.appendChild(name);
      li.appendChild(meta);
      list.appendChild(li);
    });
  }

  function render() {
    if (!state) return;

    renderBoard();
    renderExcludeChips();
    renderLog();

    byId("stockCountEl").innerHTML = state.stockCount + "<span class='unit'>個</span>";
    byId("storeNameEl").textContent = state.storeName;

    var canInteract = !state.over && !state.won && !state.paused;

    byId("spawnBtn").disabled = !canInteract || !!state.active || state.stockCount <= 0;
    byId("btnLeft").disabled = !canInteract || !state.active;
    byId("btnRotate").disabled = !canInteract || !state.active;
    byId("btnRight").disabled = !canInteract || !state.active;
    byId("btnDrop").disabled = !canInteract || !state.active;

    byId("btnEatFood").disabled = !canInteract || !!state.active;
    byId("btnEatDrink").disabled = !canInteract || !!state.active;
    byId("changeStoreBtn").disabled = !canInteract || !!state.active;
    byId("giveUpBtn").disabled = state.over || state.won || state.paused;

    byId("pauseBtn").disabled = state.over || state.won;
    byId("pauseBtn").textContent = state.paused ? "再開する" : "一時停止";
    byId("pauseBadge").classList.toggle("hidden", !state.paused || state.over || state.won);

    byId("targetLinesInput").value = state.targetLines;
    byId("dropSpeedInput").value = String(state.dropInterval);
    byId("dropSpeedLabel").textContent = getDropSpeedLabel(state.dropInterval);
    byId("foodDuplicateModeInput").value = state.foodDuplicateMode;
    byId("drinkDuplicateModeInput").value = state.drinkDuplicateMode;
    byId("ghostToggle").checked = state.ghostEnabled;

    byId("duplicateNote").textContent =
      "食べ物：" + (state.foodDuplicateMode === "deny" ? "重複NG" : "重複OK") +
      "　／　飲み物：" + (state.drinkDuplicateMode === "deny" ? "重複NG" : "重複OK");

    byId("statLines").textContent = state.linesCleared + " / " + state.targetLines;
    byId("statEat").textContent = String(state.eatCount);
    byId("statTime").textContent = formatElapsed(getElapsedMs());

    if (state.over || state.won) showEnd(state.won, state.over ? "ゲームオーバー" : "クリアしました！");
  }

  function getDropSpeedLabel(interval) {
    if (interval >= 950) return "とても遅い";
    if (interval >= 775) return "遅い";
    if (interval >= 600) return "標準";
    if (interval >= 425) return "速い";
    return "とても速い";
  }

  function formatElapsed(ms) {
    var total = Math.floor(Math.max(0, ms) / 1000);
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var seconds = total % 60;

    if (hours > 0) {
      return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    }
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  /* =========================================================
     終了画面
     ========================================================= */

  function showEnd(won, message) {
    var overlay = byId("endOverlay");
    byId("endTitle").textContent = won ? "クリア！" : "ゲームオーバー";
    byId("endMessage").textContent = message || (won ? "目標ライン数を消去しました。" : "ゲーム終了です。");
    byId("endLines").textContent = state.linesCleared + " / " + state.targetLines;
    byId("endEat").textContent = String(state.eatCount);
    byId("endTime").textContent = formatElapsed(getElapsedMs());
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
  }

  function hideEnd() {
    var overlay = byId("endOverlay");
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
  }

  function giveUp() {
    if (state.over || state.won || state.paused) return;

    if (!window.confirm("本当にギブアップしますか？もう食べられない／飲めない、ということで終了します。")) return;

    triggerGameOver("ギブアップ…満腹・酔いの限界でリタイアしました。");
  }

  /* =========================================================
     新規ゲーム
     ========================================================= */

  function startNew() {
    var target = state ? state.targetLines : 3;
    var speed = state ? state.dropInterval : DEFAULT_DROP_INTERVAL;
    var foodMode = state ? state.foodDuplicateMode : "allow";
    var drinkMode = state ? state.drinkDuplicateMode : "allow";
    var ghost = state ? state.ghostEnabled : DEFAULT_GHOST_ENABLED;

    state = freshState();
    state.targetLines = clampTarget(target);
    state.dropInterval = clampDropInterval(speed);
    state.foodDuplicateMode = foodMode;
    state.drinkDuplicateMode = drinkMode;
    state.ghostEnabled = ghost;
    state.board = makeGarbageBoard(state.targetLines);
    state.paused = false;
    state.timerStartedAt = Date.now();
    lastClockSave = 0;

    hideEnd();
    closeChooseModal();
    setStatus("間食してストックを貯めよう");
    lastTime = 0;
    acc = 0;
    save();
    render();
  }

  /* =========================================================
     テーマ
     ========================================================= */

  function loadTheme() {
    try {
      var theme = localStorage.getItem(THEME_KEY);
      document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    } catch (e) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }

  function toggleTheme() {
    var root = document.documentElement;
    var light = root.getAttribute("data-theme") === "light";
    root.setAttribute("data-theme", light ? "dark" : "light");
    try {
      localStorage.setItem(THEME_KEY, light ? "dark" : "light");
    } catch (e) { /* 無視 */ }
    render();
  }

  /* =========================================================
     メインループ
     ========================================================= */

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;

    if (state && !state.paused && !state.over && !state.won && timestamp - lastClockSave >= 1000) {
      lastClockSave = timestamp;
      updateElapsed();
      byId("statTime").textContent = formatElapsed(state.elapsedMs);
      save();
    }

    if (state && !state.paused && !state.over && !state.won) {
      var delta = Math.min(100, timestamp - lastTime);
      lastTime = timestamp;
      acc += delta;

      var steps = 0;
      while (acc >= state.dropInterval && steps < 4) {
        acc -= state.dropInterval;
        if (!state.active) break;
        softDrop();
        steps++;
      }
    } else {
      lastTime = timestamp;
    }

    requestAnimationFrame(loop);
  }

  /* =========================================================
     イベント
     ========================================================= */

  function installEvents() {
    byId("btnLeft").addEventListener("click", function () { guarded("left", function () { tryMove(-1); }, 180); });
    byId("btnRight").addEventListener("click", function () { guarded("right", function () { tryMove(1); }, 180); });
    byId("btnRotate").addEventListener("click", function () { guarded("rotate", tryRotate, 180); });
    byId("btnDrop").addEventListener("click", function () { guarded("drop", hardDrop, 280); });
    byId("spawnBtn").addEventListener("click", function () { guarded("spawn", requestSpawn, 350); });
    byId("pauseBtn").addEventListener("click", function () { guarded("pause", togglePause, 300); });
    byId("themeToggle").addEventListener("click", function () { guarded("theme", toggleTheme, 300); });

    byId("btnEatFood").addEventListener("click", function () { guarded("eat-food", function () { registerItem("food"); }, 400); });
    byId("btnEatDrink").addEventListener("click", function () { guarded("eat-drink", function () { registerItem("drink"); }, 400); });
    byId("changeStoreBtn").addEventListener("click", function () { guarded("store", changeStore, 500); });
    byId("giveUpBtn").addEventListener("click", function () { guarded("giveup", giveUp, 500); });
    byId("resetBtn").addEventListener("click", function () {
      guarded("reset", function () {
        if (window.confirm("進行状況をリセットして最初からやり直しますか？")) startNew();
      }, 500);
    });

    byId("endRestart").addEventListener("click", function () {
      guarded("end-restart", startNew, 500);
    });

    byId("chooseConfirm").addEventListener("click", function () { guarded("choose-confirm", confirmChoice, 300); });
    byId("chooseCancel").addEventListener("click", function () { guarded("choose-cancel", closeChooseModal, 250); });

    byId("targetLinesInput").addEventListener("change", function (e) {
      guarded("target-change", function () {
        state.targetLines = clampTarget(e.target.value);
        setStatus("目標ライン数を「" + state.targetLines + "」にしました。新しいゲームでもこの設定を使います。");
        checkWin();
        save();
        render();
      }, 300);
    });

    byId("dropSpeedInput").addEventListener("change", function (e) {
      state.dropInterval = clampDropInterval(e.target.value);
      setStatus("ミノの落下速度を「" + getDropSpeedLabel(state.dropInterval) + "」に変更しました。");
      save();
      render();
    });

    byId("foodDuplicateModeInput").addEventListener("change", function (e) {
      state.foodDuplicateMode = e.target.value === "deny" ? "deny" : "allow";
      save();
      render();
    });

    byId("drinkDuplicateModeInput").addEventListener("change", function (e) {
      state.drinkDuplicateMode = e.target.value === "deny" ? "deny" : "allow";
      save();
      render();
    });

    byId("ghostToggle").addEventListener("change", function (e) {
      state.ghostEnabled = !!e.target.checked;
      setStatus(state.ghostEnabled ? "ゴースト表示をONにしました。" : "ゴースト表示をOFFにしました。");
      save();
      render();
    });

    byId("foodName").addEventListener("keydown", function (e) {
      if (e.key === "Enter") guarded("enter-food", function () { registerItem("food"); }, 400);
    });

    byId("drinkName").addEventListener("keydown", function (e) {
      if (e.key === "Enter") guarded("enter-drink", function () { registerItem("drink"); }, 400);
    });

    document.addEventListener("keydown", function (e) {
      var target = e.target;
      var tag = target && target.tagName ? target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); tryMove(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); tryMove(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); tryRotate(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); softDrop(); }
      else if (e.key === " ") { e.preventDefault(); hardDrop(); }
      else if (e.key === "p" || e.key === "P") { e.preventDefault(); togglePause(); }
    });

    /* 同じ要素への短い連続タップだけを抑制してダブルタップ拡大を防ぐ */
    document.addEventListener("touchend", function (e) {
      var target = e.target && e.target.closest ? e.target.closest("button, [role='button']") : null;
      if (!target) return;
      var now = Date.now();

      if (target === lastTouchTarget && now - lastTouchTime < 320) {
        e.preventDefault();
      }

      lastTouchTarget = target;
      lastTouchTime = now;
    }, { passive: false });

    document.addEventListener("visibilitychange", function () {
      if (!state) return;

      if (document.visibilityState === "hidden") {
        updateElapsed();
        state.paused = true;
        state.timerStartedAt = 0;
        lastTime = 0;
        acc = 0;
        save();
        render();
      } else {
        /* 復帰時は自動再開しない */
        state.paused = true;
        state.timerStartedAt = 0;
        lastTime = 0;
        acc = 0;
        save();
        render();
      }
    });

    window.addEventListener("pagehide", function () {
      save();
    });

    window.addEventListener("beforeunload", function () {
      save();
    });
  }

  function boot() {
    loadTheme();
    state = load() || freshState();

    /* 初回起動はそのまま開始。保存データはnormalizeで停止中 */
    render();
    installEvents();
    requestAnimationFrame(loop);
  }

  boot();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {
        /* オフライン機能が使えなくてもゲーム自体は動作 */
      });
    });
  }
})();
