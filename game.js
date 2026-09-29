(function () {
  "use strict";

  var COLS = 10;
  var ROWS = 20;
  var BLOCK = 30;

  var MAX_TARGET_LINES = 18;
  var DEFAULT_DROP_INTERVAL = 700;

  var STORAGE_KEY = "izakaya_tetris_save_v7";

  var LEGACY_KEYS = [
    "izakaya_tetris_save_v6",
    "izakaya_tetris_save_v5",
    "izakaya_tetris_save_v4",
    "izakaya_tetris_save_v3"
  ];


  // =========================================================
  // ミノ
  // =========================================================

  var SHAPES = {

    I: [
      [1,1,1,1]
    ],

    O: [
      [1,1],
      [1,1]
    ],

    T: [
      [0,1,0],
      [1,1,1]
    ],

    S: [
      [0,1,1],
      [1,1,0]
    ],

    Z: [
      [1,1,0],
      [0,1,1]
    ],

    J: [
      [1,0,0],
      [1,1,1]
    ],

    L: [
      [0,0,1],
      [1,1,1]
    ]

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


  var TYPES =
    Object.keys(
      SHAPES
    );


  var OUTCOMES =
    TYPES.concat([
      "MISS",
      "FREE"
    ]);


  var OUTCOME_LABEL = {

    I: "棒ミノ",
    O: "四角ミノ",
    T: "T字ミノ",
    S: "S字ミノ",
    Z: "Z字ミノ",
    J: "J字ミノ",
    L: "L字ミノ",

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

    FREE: "#d3ad5b"

  };


  var GARBAGE_COLOR =
    "#7d7466";


  // =========================================================
  // グローバル
  // =========================================================

  var state = null;

  var ctx = null;

  var choiceCtx = null;

  var chooseCallback = null;

  var selectedChoiceType = null;

  var lastTime = 0;

  var acc = 0;

  var touchLastEnd = 0;

  var lastActions = {};


  // =========================================================
  // 新規状態
  // =========================================================

  function freshState(base) {

    var target =
      clampTarget(
        base &&
        base.targetLines
      );


    var now =
      Date.now();


    return {

      board:
        makeGarbageBoard(
          target
        ),

      active:
        null,

      stockCount:
        0,

      excluded:
        [],

      targetLines:
        target,

      linesCleared:
        0,

      eatCount:
        0,

      log:
        [],

      over:
        false,

      won:
        false,

      startedAt:
        now,

      elapsedMs:
        0,

      endedAt:
        null,

      dropInterval:
        clampDropInterval(
          base &&
          base.dropInterval
        ),

      foodDuplicateMode:
        base &&
        base.foodDuplicateMode === "deny"
          ? "deny"
          : "allow",

      drinkDuplicateMode:
        base &&
        base.drinkDuplicateMode === "deny"
          ? "deny"
          : "allow",

      registeredFoods:
        [],

      registeredDrinks:
        [],

      storeName:
        base &&
        base.storeName
          ? base.storeName
          : "最初の店",

      paused:
        false,

      timerStartedAt:
        now

    };

  }


  // =========================================================
  // 数値
  // =========================================================

  function clampTarget(value) {

    var v =
      parseInt(
        value,
        10
      );


    if (isNaN(v)) {

      v = 3;

    }


    return Math.max(
      1,
      Math.min(
        MAX_TARGET_LINES,
        v
      )
    );

  }


  function clampDropInterval(value) {

    var v =
      parseInt(
        value,
        10
      );


    if (isNaN(v)) {

      v =
        DEFAULT_DROP_INTERVAL;

    }


    return Math.max(
      150,
      Math.min(
        1200,
        v
      )
    );

  }


  // =========================================================
  // 盤面
  // =========================================================

  function makeEmptyBoard() {

    var board = [];


    for (
      var r = 0;
      r < ROWS;
      r++
    ) {

      board.push(
        new Array(
          COLS
        ).fill(null)
      );

    }


    return board;

  }


  function makeGarbageBoard(rows) {

    var board =
      makeEmptyBoard();


    /*
     * 最大18段。
     * 上2段は常に空ける。
     */

    rows =
      Math.min(
        ROWS - 2,
        Math.max(
          1,
          rows
        )
      );


    for (
      var r =
        ROWS - rows;

      r < ROWS;

      r++
    ) {

      var gaps =
        2 +
        Math.floor(
          Math.random() * 2
        );


      var gapCols = [];


      while (
        gapCols.length < gaps
      ) {

        var c =
          Math.floor(
            Math.random() *
            COLS
          );


        if (
          gapCols.indexOf(c)
          === -1
        ) {

          gapCols.push(c);

        }

      }


      for (
        var col = 0;
        col < COLS;
        col++
      ) {

        if (
          gapCols.indexOf(col)
          === -1
        ) {

          board[r][col] =
            GARBAGE_COLOR;

        }

      }

    }


    return board;

  }


  function validBoard(board) {

    if (
      !Array.isArray(board) ||
      board.length !== ROWS
    ) {

      return false;

    }


    for (
      var r = 0;
      r < ROWS;
      r++
    ) {

      if (
        !Array.isArray(board[r]) ||
        board[r].length !== COLS
      ) {

        return false;

      }

    }


    return true;

  }


  // =========================================================
  // 保存
  // =========================================================

  function save() {

    if (!state) {

      return;

    }


    if (
      !state.paused &&
      !state.over &&
      !state.won
    ) {

      updateElapsed();

    }


    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

    } catch (e) {}

  }


  // =========================================================
  // 読み込み
  // =========================================================

  function tryLoad(key) {

    try {

      var raw =
        localStorage.getItem(
          key
        );


      return raw
        ? JSON.parse(raw)
        : null;

    } catch (e) {

      return null;

    }

  }


  function load() {

    var parsed =
      tryLoad(
        STORAGE_KEY
      );


    if (!parsed) {

      for (
        var i = 0;
        i < LEGACY_KEYS.length;
        i++
      ) {

        parsed =
          tryLoad(
            LEGACY_KEYS[i]
          );


        if (parsed) {

          break;

        }

      }

    }


    return normalizeLoadedState(
      parsed
    );

  }


  function normalizeLoadedState(
    parsed
  ) {

    if (
      !parsed ||
      !validBoard(
        parsed.board
      )
    ) {

      return null;

    }


    parsed.targetLines =
      clampTarget(
        parsed.targetLines
      );


    parsed.dropInterval =
      clampDropInterval(
        parsed.dropInterval
      );


    parsed.stockCount =
      Math.max(
        0,
        Number(
          parsed.stockCount
        ) || 0
      );


    parsed.linesCleared =
      Math.max(
        0,
        Number(
          parsed.linesCleared
        ) || 0
      );


    parsed.eatCount =
      Math.max(
        0,
        Number(
          parsed.eatCount
        ) || 0
      );


    parsed.elapsedMs =
      Math.max(
        0,
        Number(
          parsed.elapsedMs
        ) || 0
      );


    parsed.log =
      Array.isArray(
        parsed.log
      )
        ? parsed.log
        : [];


    parsed.excluded =
      Array.isArray(
        parsed.excluded
      )
        ? parsed.excluded.filter(
            function (x) {

              return (
                OUTCOMES.indexOf(x)
                !== -1
              );

            }
          )
        : [];


    parsed.over =
      !!parsed.over;


    parsed.won =
      !!parsed.won;


    parsed.endedAt =
      typeof parsed.endedAt === "number"
        ? parsed.endedAt
        : null;


    parsed.foodDuplicateMode =
      parsed.foodDuplicateMode === "deny" ||
      parsed.duplicateMode === "deny"
        ? "deny"
        : "allow";


    parsed.drinkDuplicateMode =
      parsed.drinkDuplicateMode === "deny" ||
      parsed.duplicateMode === "deny"
        ? "deny"
        : "allow";


    parsed.registeredFoods =
      Array.isArray(
        parsed.registeredFoods
      )
        ? parsed.registeredFoods
        : [];


    parsed.registeredDrinks =
      Array.isArray(
        parsed.registeredDrinks
      )
        ? parsed.registeredDrinks
        : [];


    parsed.storeName =
      typeof parsed.storeName === "string" &&
      parsed.storeName.trim()
        ? parsed.storeName
        : "最初の店";


    parsed.paused =
      !!parsed.paused;


    parsed.timerStartedAt =
      Date.now();


    /*
     * 旧データから補完
     */

    if (
      parsed.registeredFoods.length === 0
    ) {

      parsed.registeredFoods =
        rebuildItemsFromLog(
          parsed,
          "food"
        );

    }


    if (
      parsed.registeredDrinks.length === 0
    ) {

      parsed.registeredDrinks =
        rebuildItemsFromLog(
          parsed,
          "drink"
        );

    }


    /*
     * 壊れたactiveを排除
     */

    if (parsed.active) {

      if (
        !parsed.active.matrix ||
        !Array.isArray(
          parsed.active.matrix
        ) ||
        !parsed.active.matrix.length
      ) {

        parsed.active = null;

      }

    }


    return parsed;

  }


  function rebuildItemsFromLog(
    data,
    category
  ) {

    var result = [];


    if (
      !Array.isArray(
        data.log
      )
    ) {

      return result;

    }


    data.log.forEach(
      function (entry) {

        if (
          entry.category !== category
        ) {

          return;

        }


        if (
          (entry.store || "最初の店")
          !==
          data.storeName
        ) {

          return;

        }


        var name =
          normalizeItemName(
            entry.name || ""
          );


        if (
          name &&
          result.indexOf(name) === -1
        ) {

          result.push(name);

        }

      }
    );


    return result;

  }


  // =========================================================
  // 名前
  // =========================================================

  function normalizeItemName(name) {

    return String(name)

      .normalize("NFKC")

      .trim()

      .toLowerCase()

      .replace(
        /\s+/g,
        ""
      );

  }


  // =========================================================
  // ミノ生成
  // =========================================================

  function cloneMatrix(matrix) {

    return matrix.map(
      function (row) {

        return row.slice();

      }
    );

  }


  function spawnPieceOfType(type) {

    var matrix =
      cloneMatrix(
        SHAPES[type]
      );


    return {

      type:
        type,

      matrix:
        matrix,

      row:
        0,

      col:
        Math.floor(
          (
            COLS -
            matrix[0].length
          ) / 2
        ),

      color:
        COLORS[type]

    };

  }


  function collides(
    matrix,
    row,
    col
  ) {

    for (
      var r = 0;
      r < matrix.length;
      r++
    ) {

      for (
        var c = 0;
        c < matrix[r].length;
        c++
      ) {

        if (
          !matrix[r][c]
        ) {

          continue;

        }


        var br =
          row + r;

        var bc =
          col + c;


        if (
          bc < 0 ||
          bc >= COLS ||
          br >= ROWS
        ) {

          return true;

        }


        if (
          br >= 0 &&
          state.board[br][bc]
        ) {

          return true;

        }

      }

    }


    return false;

  }


  // =========================================================
  // ゴースト位置
  // =========================================================

  function ghostRow(piece) {

    var row =
      piece.row;


    while (
      !collides(
        piece.matrix,
        row + 1,
        piece.col
      )
    ) {

      row++;

    }


    return row;

  }


  // =========================================================
  // 回転
  // =========================================================

  function rotateMatrix(m) {

    var rows =
      m.length;

    var cols =
      m[0].length;


    var result = [];


    for (
      var c = 0;
      c < cols;
      c++
    ) {

      var row = [];


      for (
        var r =
          rows - 1;

        r >= 0;

        r--
      ) {

        row.push(
          m[r][c]
        );

      }


      result.push(
        row
      );

    }


    return result;

  }


  // =========================================================
  // 操作
  // =========================================================

  function tryMove(dx) {

    if (
      !state.active ||
      state.paused
    ) {

      return;

    }


    var newCol =
      state.active.col +
      dx;


    if (
      !collides(
        state.active.matrix,
        state.active.row,
        newCol
      )
    ) {

      state.active.col =
        newCol;

      save();
      render();

    }

  }


  function tryRotate() {

    if (
      !state.active ||
      state.paused
    ) {

      return;

    }


    var rotated =
      rotateMatrix(
        state.active.matrix
      );


    var kicks =
      [
        0,
        -1,
        1,
        -2,
        2
      ];


    for (
      var i = 0;
      i < kicks.length;
      i++
    ) {

      var newCol =
        state.active.col +
        kicks[i];


      if (
        !collides(
          rotated,
          state.active.row,
          newCol
        )
      ) {

        state.active.matrix =
          rotated;


        state.active.col =
          newCol;


        save();
        render();

        return;

      }

    }

  }


  function softDrop() {

    if (
      !state.active ||
      state.paused
    ) {

      return;

    }


    if (
      !collides(
        state.active.matrix,
        state.active.row + 1,
        state.active.col
      )
    ) {

      state.active.row++;


      save();
      render();

    } else {

      lockPiece();

    }

  }


  function hardDrop() {

    if (
      !state.active ||
      state.paused
    ) {

      return;

    }


    state.active.row =
      ghostRow(
        state.active
      );


    lockPiece();

  }


  // =========================================================
  // 固定
  // =========================================================

  function lockPiece() {

    var piece =
      state.active;


    if (!piece) {

      return;

    }


    for (
      var r = 0;
      r < piece.matrix.length;
      r++
    ) {

      for (
        var c = 0;
        c < piece.matrix[r].length;
        c++
      ) {

        if (
          !piece.matrix[r][c]
        ) {

          continue;

        }


        var br =
          piece.row + r;

        var bc =
          piece.col + c;


        if (
          br < 0
        ) {

          triggerGameOver(
            "盤面からミノが溢れました。ゲームオーバーです。"
          );


          return;

        }


        state.board[br][bc] =
          piece.color;

      }

    }


    state.active =
      null;


    clearLines();

    checkWin();


    if (
      !state.over &&
      !state.won
    ) {

      setStatus(

        state.stockCount > 0

          ? "「ミノを出す」を押して続けよう"

          : "間食してストックを貯めよう"

      );

    }


    save();
    render();

  }


  // =========================================================
  // ライン消去
  // =========================================================

  function clearLines() {

    var cleared =
      0;


    for (
      var r = ROWS - 1;
      r >= 0;
      r--
    ) {

      var full =
        true;


      for (
        var c = 0;
        c < COLS;
        c++
      ) {

        if (
          !state.board[r][c]
        ) {

          full =
            false;

          break;

        }

      }


      if (full) {

        state.board.splice(
          r,
          1
        );


        state.board.unshift(
          new Array(
            COLS
          ).fill(null)
        );


        cleared++;

        r++;

      }

    }


    if (cleared) {

      state.linesCleared +=
        cleared;


      setStatus(

        cleared +
        "ライン消去！ (" +
        state.linesCleared +
        " / " +
        state.targetLines +
        ")"

      );

    }

  }


  // =========================================================
  // 勝利
  // =========================================================

  function checkWin() {

    if (
      state.linesCleared >=
      state.targetLines &&
      !state.won
    ) {

      state.won =
        true;


      updateElapsed();


      state.endedAt =
        Date.now();


      save();


      showEnd(true);

    }

  }


  // =========================================================
  // ゲームオーバー
  // =========================================================

  function triggerGameOver(
    message
  ) {

    state.over =
      true;


    state.active =
      null;


    updateElapsed();


    state.endedAt =
      Date.now();


    save();


    showEnd(
      false,
      message
    );

  }


  // =========================================================
  // ギブアップ
  // =========================================================

  function giveUp() {

    if (
      state.over ||
      state.won ||
      state.paused
    ) {

      return;

    }


    if (
      !window.confirm(
        "本当にギブアップしますか？もう食べられない／飲めない、ということで終了します。"
      )
    ) {

      return;

    }


    triggerGameOver(
      "ギブアップ…満腹・酔いの限界でリタイアしました。"
    );

  }


  // =========================================================
  // 除外
  // =========================================================

  function toggleExclude(
    outcome
  ) {

    if (
      state.over ||
      state.won ||
      state.paused ||
      state.active
    ) {

      return;

    }


    var index =
      state.excluded.indexOf(
        outcome
      );


    // 除外解除
    if (index !== -1) {

      state.excluded.splice(
        index,
        1
      );


      state.stockCount++;


      setStatus(

        OUTCOME_LABEL[outcome] +
        "の除外を取り消しました。ストック＋1"

      );


      save();
      render();

      return;

    }


    var remaining =
      OUTCOMES.length -
      state.excluded.length;


    if (
      remaining <= 1 ||
      state.stockCount <= 0
    ) {

      return;

    }


    state.stockCount--;

    state.excluded.push(
      outcome
    );


    setStatus(

      OUTCOME_LABEL[outcome] +
      "を次の抽選から除外しました。ストック－1"

    );


    save();
    render();

  }


  // =========================================================
  // 抽選
  // =========================================================

  function requestSpawn() {

    if (
      state.over ||
      state.won ||
      state.paused ||
      state.active ||
      state.stockCount <= 0
    ) {

      return;

    }


    /*
     * 「ミノを出す」を押した瞬間に
     * ストック消費を確定
     */

    state.stockCount--;


    var pool =
      OUTCOMES.filter(
        function (outcome) {

          return (
            state.excluded.indexOf(
              outcome
            ) === -1
          );

        }
      );


    /*
     * 今回の抽選開始時点で
     * 除外状態をリセット
     */

    state.excluded = [];


    var outcome =
      pool[
        Math.floor(
          Math.random() *
          pool.length
        )
      ];


    /*
     * スカだけスクロールしない
     */

    if (
      outcome !== "MISS"
    ) {

      scrollBoardIntoView();

    }


    /*
     * ストック消費を先に保存
     */

    save();


    handleOutcome(
      outcome
    );

  }


  function handleOutcome(
    outcome
  ) {

    // スカ
    if (
      outcome === "MISS"
    ) {

      setStatus(
        "スカ…ハズレでした。ストックを1消費しました。"
      );


      save();
      render();

      return;

    }


    // 自由選択
    if (
      outcome === "FREE"
    ) {

      setStatus(
        "自由選択：現在の盤面とミノの形を確認してください。"
      );


      openChooseModal(
        function (type) {

          trySpawnType(
            type
          );

        }
      );


      save();
      render();

      return;

    }


    // 通常
    trySpawnType(
      outcome
    );

  }


  // =========================================================
  // ミノ出現
  // =========================================================

  function trySpawnType(
    type
  ) {

    if (
      state.over ||
      state.won ||
      state.paused
    ) {

      return;

    }


    var piece =
      spawnPieceOfType(
        type
      );


    if (
      collides(
        piece.matrix,
        piece.row,
        piece.col
      )
    ) {

      triggerGameOver(
        "盤面が埋まっていてミノを出せません。ゲームオーバーです。"
      );


      return;

    }


    state.active =
      piece;


    acc = 0;


    setStatus(
      OUTCOME_LABEL[type] +
      "が出ました。落としてください。"
    );


    save();

    render();

  }


  // =========================================================
  // 食べ物・飲み物登録
  // =========================================================

  function registerItem(
    category
  ) {

    if (
      state.over ||
      state.won ||
      state.paused
    ) {

      return;

    }


    var inputId =
      category === "food"
        ? "foodName"
        : "drinkName";


    var input =
      document.getElementById(
        inputId
      );


    var name =
      input.value.trim();


    /*
     * 空欄は禁止
     */

    if (!name) {

      setStatus(

        category === "food"

          ? "食べ物の名前を入力してください。"

          : "飲み物の名前を入力してください。"

      );


      input.focus();

      return;

    }


    var normalized =
      normalizeItemName(
        name
      );


    var list =
      category === "food"

        ? state.registeredFoods

        : state.registeredDrinks;


    var mode =
      category === "food"

        ? state.foodDuplicateMode

        : state.drinkDuplicateMode;


    /*
     * 重複NG
     */

    if (
      mode === "deny" &&
      list.indexOf(
        normalized
      ) !== -1
    ) {

      setStatus(
        "「" +
        name +
        "」は現在の店ですでに登録されています。重複NGです。"
      );


      return;

    }


    state.stockCount++;

    state.eatCount++;


    /*
     * 重複判定用に登録
     */

    if (
      list.indexOf(
        normalized
      ) === -1
    ) {

      list.push(
        normalized
      );

    }


    /*
     * ログ
     */

    state.log.unshift({

      name:
        name,

      category:
        category,

      store:
        state.storeName,

      t:
        new Date()
          .toLocaleTimeString(
            "ja-JP",
            {
              hour:
                "2-digit",
              minute:
                "2-digit"
            }
          )

    });


    if (
      state.log.length > 50
    ) {

      state.log.pop();

    }


    input.value =
      "";


    setStatus(

      "「" +
      name +
      "」を登録しました。ストック＋1"

    );


    save();
    render();

  }


  // =========================================================
  // 店変更
  // =========================================================

  function changeStore() {

    if (
      state.over ||
      state.won ||
      state.paused
    ) {

      return;

    }


    var nextName =
      window.prompt(

        "変更先の店名を入力してください。\n" +
        "店を変えると食べ物・飲み物の重複判定がリセットされます。",

        state.storeName

      );


    if (
      nextName === null
    ) {

      return;

    }


    nextName =
      nextName.trim();


    if (!nextName) {

      setStatus(
        "店名が空欄のため変更しませんでした。"
      );


      return;

    }


    if (
      nextName ===
      state.storeName
    ) {

      setStatus(
        "現在と同じ店です。重複判定はそのままです。"
      );


      return;

    }


    state.storeName =
      nextName;


    /*
     * 店変更で
     * 食べ物・飲み物の判定をリセット
     */

    state.registeredFoods =
      [];


    state.registeredDrinks =
      [];


    setStatus(

      "「" +
      nextName +
      "」に店を変更しました。重複判定をリセットしました。"

    );


    save();
    render();

  }


  // =========================================================
  // 自由選択
  // =========================================================

  function openChooseModal(
    callback
  ) {

    var overlay =
      document.getElementById(
        "chooseOverlay"
      );


    var grid =
      document.getElementById(
        "choiceGrid"
      );


    chooseCallback =
      callback;


    selectedChoiceType =
      null;


    grid.innerHTML =
      "";


    document.getElementById(
      "choiceSelected"
    ).textContent =
      "ミノを選択してください";


    TYPES.forEach(
      function (type) {

        var button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "choice-piece";


        button.style.borderColor =
          COLORS[type];


        button.dataset.type =
          type;


        /*
         * ミノの形
         */

        var preview =
          document.createElement(
            "div"
          );


        preview.className =
          "mino-preview";


        var shape =
          SHAPES[type];


        preview.style.gridTemplateColumns =
          "repeat(" +
          shape[0].length +
          ", 12px)";


        preview.style.gridTemplateRows =
          "repeat(" +
          shape.length +
          ", 12px)";


        for (
          var r = 0;
          r < shape.length;
          r++
        ) {

          for (
            var c = 0;
            c < shape[r].length;
            c++
          ) {

            var cell =
              document.createElement(
                "span"
              );


            cell.className =
              "mino-cell";


            cell.style.background =
              shape[r][c]
                ? COLORS[type]
                : "transparent";


            preview.appendChild(
              cell
            );

          }

        }


        var label =
          document.createElement(
            "span"
          );


        label.className =
          "choice-label";


        label.textContent =
          OUTCOME_LABEL[type];


        button.appendChild(
          preview
        );


        button.appendChild(
          label
        );


        button.addEventListener(
          "click",
          function () {

            selectChoiceType(
              type
            );

          }
        );


        grid.appendChild(
          button
        );

      }
    );


    renderChoiceBoardPreview();


    overlay.classList.add(
      "show"
    );


    overlay.setAttribute(
      "aria-hidden",
      "false"
    );

  }


  function selectChoiceType(
    type
  ) {

    selectedChoiceType =
      type;


    document
      .querySelectorAll(
        ".choice-piece"
      )
      .forEach(
        function (button) {

          button.classList.toggle(

            "choice-selected",

            button.dataset.type ===
            type

          );

        }
      );


    document.getElementById(
      "choiceSelected"
    ).textContent =

      OUTCOME_LABEL[type] +
      "を選択中。盤面の仮置きを確認してください。";


    var confirm =
      document.getElementById(
        "chooseConfirm"
      );


    if (confirm) {

      confirm.disabled =
        false;

    }


    renderChoiceBoardPreview();

  }


  function closeChooseModal() {

    var overlay =
      document.getElementById(
        "chooseOverlay"
      );


    overlay.classList.remove(
      "show"
    );


    overlay.setAttribute(
      "aria-hidden",
      "true"
    );


    selectedChoiceType =
      null;


    var confirm =
      document.getElementById(
        "chooseConfirm"
      );


    if (confirm) {

      confirm.disabled =
        true;

    }

  }


  function confirmChoice() {

    if (
      !selectedChoiceType ||
      !chooseCallback
    ) {

      return;

    }


    var cb =
      chooseCallback;


    chooseCallback =
      null;


    var selected =
      selectedChoiceType;


    closeChooseModal();


    cb(
      selected
    );

  }


  // =========================================================
  // 自由選択の盤面
  // =========================================================

  function renderChoiceBoardPreview() {

    var canvas =
      document.getElementById(
        "choiceBoardPreview"
      );


    if (!canvas) {

      return;

    }


    if (!choiceCtx) {

      choiceCtx =
        canvas.getContext(
          "2d"
        );

    }


    var styles =
      getComputedStyle(
        document.documentElement
      );


    var empty =
      styles
        .getPropertyValue(
          "--board-empty"
        )
        .trim();


    var grid =
      styles
        .getPropertyValue(
          "--board-grid"
        )
        .trim();


    var b =
      22;


    choiceCtx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    choiceCtx.fillStyle =
      empty;


    choiceCtx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    choiceCtx.strokeStyle =
      grid;


    choiceCtx.lineWidth =
      1;


    // 縦グリッド

    for (
      var c = 0;
      c <= COLS;
      c++
    ) {

      choiceCtx.beginPath();


      choiceCtx.moveTo(
        c * b,
        0
      );


      choiceCtx.lineTo(
        c * b,
        canvas.height
      );


      choiceCtx.stroke();

    }


    // 横グリッド

    for (
      var r = 0;
      r <= ROWS;
      r++
    ) {

      choiceCtx.beginPath();


      choiceCtx.moveTo(
        0,
        r * b
      );


      choiceCtx.lineTo(
        canvas.width,
        r * b
      );


      choiceCtx.stroke();

    }


    // 固定ブロック

    for (
      var br = 0;
      br < ROWS;
      br++
    ) {

      for (
        var bc = 0;
        bc < COLS;
        bc++
      ) {

        if (
          !state.board[br][bc]
        ) {

          continue;

        }


        choiceCtx.fillStyle =
          state.board[br][bc];


        choiceCtx.fillRect(
          bc * b + 1,
          br * b + 1,
          b - 2,
          b - 2
        );

      }

    }


    /*
     * 選択中ミノの
     * 仮置き位置
     */

    if (
      selectedChoiceType
    ) {

      var piece =
        spawnPieceOfType(
          selectedChoiceType
        );


      if (
        !collides(
          piece.matrix,
          piece.row,
          piece.col
        )
      ) {

        piece.row =
          ghostRow(
            piece
          );


        drawChoiceGhost(
          piece,
          b
        );

      }

    }

  }


  function drawChoiceGhost(
    piece,
    block
  ) {

    choiceCtx.save();


    choiceCtx.globalAlpha =
      0.45;


    choiceCtx.strokeStyle =
      piece.color;


    choiceCtx.lineWidth =
      2;


    choiceCtx.setLineDash(
      [4, 3]
    );


    for (
      var r = 0;
      r < piece.matrix.length;
      r++
    ) {

      for (
        var c = 0;
        c < piece.matrix[r].length;
        c++
      ) {

        if (
          !piece.matrix[r][c]
        ) {

          continue;

        }


        var x =
          (piece.col + c) *
          block;


        var y =
          (piece.row + r) *
          block;


        choiceCtx.strokeRect(
          x + 3,
          y + 3,
          block - 6,
          block - 6
        );

      }

    }


    choiceCtx.restore();

  }


  // =========================================================
  // 描画
  // =========================================================

  function render() {

    var canvas =
      document.getElementById(
        "board"
      );


    if (!canvas) {

      return;

    }


    if (!ctx) {

      ctx =
        canvas.getContext(
          "2d"
        );

    }


    var styles =
      getComputedStyle(
        document.documentElement
      );


    var empty =
      styles
        .getPropertyValue(
          "--board-empty"
        )
        .trim();


    var grid =
      styles
        .getPropertyValue(
          "--board-grid"
        )
        .trim();


    ctx.fillStyle =
      empty;


    ctx.fillRect(
      0,
      0,
      COLS * BLOCK,
      ROWS * BLOCK
    );


    ctx.strokeStyle =
      grid;


    ctx.lineWidth =
      1;


    // 縦
    for (
      var c = 0;
      c <= COLS;
      c++
    ) {

      ctx.beginPath();


      ctx.moveTo(
        c * BLOCK,
        0
      );


      ctx.lineTo(
        c * BLOCK,
        ROWS * BLOCK
      );


      ctx.stroke();

    }


    // 横
    for (
      var r = 0;
      r <= ROWS;
      r++
    ) {

      ctx.beginPath();


      ctx.moveTo(
        0,
        r * BLOCK
      );


      ctx.lineTo(
        COLS * BLOCK,
        r * BLOCK
      );


      ctx.stroke();

    }


    // 固定ブロック

    for (
      var br = 0;
      br < ROWS;
      br++
    ) {

      for (
        var bc = 0;
        bc < COLS;
        bc++
      ) {

        if (
          state.board[br][bc]
        ) {

          drawBlock(
            bc,
            br,
            state.board[br][bc]
          );

        }

      }

    }


    // ゴースト＋操作中

    if (
      state.active
    ) {

      drawGhost(
        state.active
      );


      drawActive(
        state.active
      );

    }


    // ストック

    document.getElementById(
      "stockCountEl"
    ).innerHTML =

      state.stockCount +
      "<span class='unit'>個</span>";


    // ミノを出す

    document.getElementById(
      "spawnBtn"
    ).disabled =

      state.stockCount <= 0 ||
      !!state.active ||
      state.over ||
      state.won ||
      state.paused;


    // 操作

    var disabled =
      !state.active ||
      state.over ||
      state.won ||
      state.paused;


    document.getElementById(
      "btnLeft"
    ).disabled =
      disabled;


    document.getElementById(
      "btnRight"
    ).disabled =
      disabled;


    document.getElementById(
      "btnRotate"
    ).disabled =
      disabled;


    document.getElementById(
      "btnDrop"
    ).disabled =
      disabled;


    renderExcludeChips();

    renderLog();


    // 店

    document.getElementById(
      "storeNameEl"
    ).textContent =
      state.storeName;


    // 重複設定

    document.getElementById(
      "duplicateNote"
    ).textContent =

      "食べ物：" +
      (
        state.foodDuplicateMode === "deny"
          ? "重複NG"
          : "重複OK"
      ) +

      "　／　飲み物：" +

      (
        state.drinkDuplicateMode === "deny"
          ? "重複NG"
          : "重複OK"
      );


    // 設定

    document.getElementById(
      "targetLinesInput"
    ).value =
      state.targetLines;


    document.getElementById(
      "dropSpeedInput"
    ).value =
      String(
        state.dropInterval
      );


    document.getElementById(
      "dropSpeedLabel"
    ).textContent =
      getDropSpeedLabel(
        state.dropInterval
      );


    document.getElementById(
      "foodDuplicateModeInput"
    ).value =
      state.foodDuplicateMode;


    document.getElementById(
      "drinkDuplicateModeInput"
    ).value =
      state.drinkDuplicateMode;


    // 戦績

    document.getElementById(
      "statLines"
    ).textContent =

      state.linesCleared +
      " / " +
      state.targetLines;


    document.getElementById(
      "statEat"
    ).textContent =
      state.eatCount;


    document.getElementById(
      "statTime"
    ).textContent =
      formatElapsed(
        getElapsedMs()
      );


    // 一時停止表示

    var paused =
      state.paused;


    document.getElementById(
      "pausedBadge"
    ).classList.toggle(
      "show",
      paused
    );


    document.getElementById(
      "pauseBtn"
    ).textContent =
      paused
        ? "再開する"
        : "一時停止";


    document.getElementById(
      "pauseBtn"
    ).disabled =
      state.over ||
      state.won;


    document.getElementById(
      "giveUpBtn"
    ).disabled =
      state.over ||
      state.won ||
      state.paused;


    if (
      document
        .getElementById(
          "chooseOverlay"
        )
        .classList
        .contains("show")
    ) {

      renderChoiceBoardPreview();

    }

  }


  function drawBlock(
    col,
    row,
    color
  ) {

    var x =
      col * BLOCK;


    var y =
      row * BLOCK;


    ctx.fillStyle =
      color;


    ctx.fillRect(
      x + 1,
      y + 1,
      BLOCK - 2,
      BLOCK - 2
    );


    ctx.strokeStyle =
      "rgba(0,0,0,0.25)";


    ctx.strokeRect(
      x + 1,
      y + 1,
      BLOCK - 2,
      BLOCK - 2
    );

  }


  function drawActive(
    piece
  ) {

    for (
      var r = 0;
      r < piece.matrix.length;
      r++
    ) {

      for (
        var c = 0;
        c < piece.matrix[r].length;
        c++
      ) {

        if (
          piece.matrix[r][c] &&
          piece.row + r >= 0
        ) {

          drawBlock(
            piece.col + c,
            piece.row + r,
            piece.color
          );

        }

      }

    }

  }


  function drawGhost(
    piece
  ) {

    var row =
      ghostRow(
        piece
      );


    ctx.save();


    ctx.globalAlpha =
      0.42;


    ctx.strokeStyle =
      piece.color;


    ctx.lineWidth =
      2;


    ctx.setLineDash(
      [5, 4]
    );


    for (
      var r = 0;
      r < piece.matrix.length;
      r++
    ) {

      for (
        var c = 0;
        c < piece.matrix[r].length;
        c++
      ) {

        if (
          !piece.matrix[r][c]
        ) {

          continue;

        }


        var br =
          row + r;


        if (
          br < 0
        ) {

          continue;

        }


        var x =
          (piece.col + c) *
          BLOCK;


        var y =
          br * BLOCK;


        ctx.strokeRect(
          x + 3,
          y + 3,
          BLOCK - 6,
          BLOCK - 6
        );

      }

    }


    ctx.restore();

  }


  // =========================================================
  // 除外チップ描画
  // =========================================================

  function renderExcludeChips() {

    var wrap =
      document.getElementById(
        "excludeChips"
      );


    wrap.innerHTML =
      "";


    var remaining =
      OUTCOMES.length -
      state.excluded.length;


    OUTCOMES.forEach(
      function (outcome) {

        var button =
          document.createElement(
            "button"
          );


        var excluded =
          state.excluded.indexOf(
            outcome
          ) !== -1;


        button.type =
          "button";


        button.className =
          "chip" +
          (
            excluded
              ? " chip-excluded"
              : ""
          );


        button.textContent =

          excluded

            ? OUTCOME_LABEL[outcome] +
              "（解除）"

            : OUTCOME_LABEL[outcome];


        button.style.setProperty(
          "--chip-color",
          OUTCOME_COLOR[outcome]
        );


        button.disabled =

          state.over ||
          state.won ||
          state.paused ||
          !!state.active ||

          (
            !excluded &&
            (
              state.stockCount <= 0 ||
              remaining <= 1
            )
          );


        button.addEventListener(
          "click",
          function () {

            toggleExclude(
              outcome
            );

          }
        );


        wrap.appendChild(
          button
        );

      }
    );

  }


  // =========================================================
  // ログ
  // =========================================================

  function renderLog() {

    var list =
      document.getElementById(
        "logList"
      );


    list.innerHTML =
      "";


    state.log
      .slice(
        0,
        10
      )
      .forEach(
        function (entry) {

          var li =
            document.createElement(
              "li"
            );


          var name =
            document.createElement(
              "span"
            );


          var meta =
            document.createElement(
              "span"
            );


          name.className =
            "name";


          meta.className =
            "meta";


          name.textContent =

            (
              entry.category === "drink"
                ? "🍺 "
                : "🍢 "
            ) +
            entry.name;


          meta.textContent =

            (
              entry.store ||
              "最初の店"
            ) +
            " / " +
            (
              entry.t ||
              ""
            );


          li.appendChild(
            name
          );


          li.appendChild(
            meta
          );


          list.appendChild(
            li
          );

        }
      );

  }


  // =========================================================
  // ステータス
  // =========================================================

  function setStatus(
    message
  ) {

    document.getElementById(
      "statusLine"
    ).textContent =
      message;

  }


  // =========================================================
  // 時間
  // =========================================================

  function updateElapsed() {

    if (
      !state ||
      state.paused ||
      state.over ||
      state.won
    ) {

      return;

    }


    var now =
      Date.now();


    state.elapsedMs +=

      Math.max(
        0,
        now -
        state.timerStartedAt
      );


    state.timerStartedAt =
      now;

  }


  function getElapsedMs() {

    if (!state) {

      return 0;

    }


    if (
      state.paused ||
      state.over ||
      state.won
    ) {

      return Math.max(
        0,
        state.elapsedMs
      );

    }


    return (

      state.elapsedMs +

      Math.max(
        0,
        Date.now() -
        state.timerStartedAt
      )

    );

  }


  function formatElapsed(
    ms
  ) {

    var total =
      Math.floor(
        ms / 1000
      );


    var sec =
      total % 60;


    var min =
      Math.floor(
        total / 60
      ) % 60;


    var hour =
      Math.floor(
        total / 3600
      );


    if (
      hour > 0
    ) {

      return (

        pad2(hour) +
        ":" +
        pad2(min) +
        ":" +
        pad2(sec)

      );

    }


    return (

      pad2(min) +
      ":" +
      pad2(sec)

    );

  }


  function pad2(n) {

    return String(
      n
    ).padStart(
      2,
      "0"
    );

  }


  // =========================================================
  // 落下速度ラベル
  // =========================================================

  function getDropSpeedLabel(
    interval
  ) {

    if (
      interval >= 950
    ) {

      return "とても遅い";

    }


    if (
      interval >= 775
    ) {

      return "遅い";

    }


    if (
      interval >= 600
    ) {

      return "標準";

    }


    if (
      interval >= 425
    ) {

      return "速い";

    }


    return "とても速い";

  }


  // =========================================================
  // 一時停止
  // =========================================================

  function togglePause() {

    if (
      state.over ||
      state.won
    ) {

      return;

    }


    if (
      !state.paused
    ) {

      updateElapsed();


      state.paused =
        true;


      acc =
        0;


      lastTime =
        0;


      setStatus(
        "ゲームを一時停止しました"
      );


      save();
      render();

      return;

    }


    state.paused =
      false;


    state.timerStartedAt =
      Date.now();


    acc =
      0;


    lastTime =
      0;


    setStatus(
      "ゲームを再開しました"
    );


    save();
    render();

  }


  // =========================================================
  // スリープ
  // =========================================================

  document.addEventListener(
    "visibilitychange",
    function () {

      if (!state) {

        return;

      }


      if (
        document.hidden
      ) {

        if (
          !state.paused &&
          !state.over &&
          !state.won
        ) {

          updateElapsed();


          state.paused =
            true;


          acc =
            0;


          lastTime =
            0;

        }


        save();


        return;

      }


      /*
       * 復帰しても自動では再開しない
       *
       * 「再開する」を押すまで停止
       */

      if (
        state.paused
      ) {

        setStatus(
          "一時停止中です。「再開する」でゲームを続けられます。"
        );


        acc =
          0;


        lastTime =
          0;


        render();

      }

    }
  );


  // =========================================================
  // ページ離脱
  // =========================================================

  window.addEventListener(
    "pagehide",
    function () {

      if (!state) {

        return;

      }


      if (
        !state.paused &&
        !state.over &&
        !state.won
      ) {

        updateElapsed();

      }


      save();

    }
  );


  window.addEventListener(
    "beforeunload",
    function () {

      if (!state) {

        return;

      }


      if (
        !state.paused &&
        !state.over &&
        !state.won
      ) {

        updateElapsed();

      }


      save();

    }
  );


  // =========================================================
  // ダブルタップ拡大防止
  // =========================================================

  document.addEventListener(
    "touchend",
    function (event) {

      var now =
        Date.now();


      if (
        now -
        touchLastEnd
        <=
        300
      ) {

        var target =
          event.target;


        var tag =
          target &&
          target.tagName
            ? target.tagName
            : "";


        var editable =

          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          (
            target &&
            target.isContentEditable
          );


        if (
          !editable
        ) {

          event.preventDefault();

        }

      }


      touchLastEnd =
        now;

    },
    {
      passive:
        false
    }
  );


  // =========================================================
  // 操作デバウンス
  // =========================================================

  function guarded(
    key,
    action,
    interval
  ) {

    var now =
      Date.now();


    var delay =
      interval || 280;


    if (
      (
        lastActions[key] ||
        0
      ) +
      delay >
      now
    ) {

      return;

    }


    lastActions[key] =
      now;


    action();

  }


  // =========================================================
  // イベント
  // =========================================================

  document
    .getElementById(
      "btnLeft"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "left",
          function () {

            tryMove(-1);

          }
        );

      }
    );


  document
    .getElementById(
      "btnRight"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "right",
          function () {

            tryMove(1);

          }
        );

      }
    );


  document
    .getElementById(
      "btnRotate"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "rotate",
          tryRotate
        );

      }
    );


  document
    .getElementById(
      "btnDrop"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "drop",
          hardDrop
        );

      }
    );


  document
    .getElementById(
      "spawnBtn"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "spawn",
          requestSpawn,
          350
        );

      }
    );


  document
    .getElementById(
      "btnEatFood"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "eatFood",
          function () {

            registerItem(
              "food"
            );

          },
          350
        );

      }
    );


  document
    .getElementById(
      "btnEatDrink"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "eatDrink",
          function () {

            registerItem(
              "drink"
            );

          },
          350
        );

      }
    );


  document
    .getElementById(
      "changeStoreBtn"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "store",
          changeStore,
          500
        );

      }
    );


  document
    .getElementById(
      "pauseBtn"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "pause",
          togglePause,
          350
        );

      }
    );


  document
    .getElementById(
      "giveUpBtn"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "giveup",
          giveUp,
          500
        );

      }
    );


  // =========================================================
  // 自由選択キャンセル
  // =========================================================

  document
    .getElementById(
      "chooseCancel"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "chooseCancel",
          function () {

            /*
             * ストック消費は確定済み。
             * キャンセルしても戻さない。
             */

            chooseCallback =
              null;


            closeChooseModal();


            setStatus(
              "自由選択をキャンセルしました。今回のストック消費は確定しています。"
            );


            save();
            render();

          },
          350
        );

      }
    );


  // =========================================================
  // 自由選択確定ボタン
  // =========================================================

  var confirmButton =
    document.createElement(
      "button"
    );


  confirmButton.className =
    "modal-btn choice-confirm";


  confirmButton.id =
    "chooseConfirm";


  confirmButton.type =
    "button";


  confirmButton.textContent =
    "このミノを出す";


  confirmButton.disabled =
    true;


  confirmButton.addEventListener(
    "click",
    function () {

      guarded(
        "chooseConfirm",
        confirmChoice,
        350
      );

    }
  );


  document
    .querySelector(
      ".choice-modal"
    )
    .insertBefore(
      confirmButton,
      document.getElementById(
        "chooseCancel"
      )
    );


  // =========================================================
  // キーボード
  // =========================================================

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        document
          .getElementById(
            "chooseOverlay"
          )
          .classList
          .contains("show")
      ) {

        if (
          event.key ===
          "Escape"
        ) {

          document
            .getElementById(
              "chooseCancel"
            )
            .click();

        }


        if (
          event.key ===
          "Enter" &&
          selectedChoiceType
        ) {

          document
            .getElementById(
              "chooseConfirm"
            )
            .click();

        }


        return;

      }


      if (
        state.over ||
        state.won ||
        state.paused
      ) {

        return;

      }


      if (
        event.key ===
        "ArrowLeft"
      ) {

        tryMove(-1);

      } else if (
        event.key ===
        "ArrowRight"
      ) {

        tryMove(1);

      } else if (
        event.key ===
        "ArrowUp"
      ) {

        tryRotate();

      } else if (
        event.key ===
        "ArrowDown"
      ) {

        softDrop();

      } else if (
        event.key ===
        " "
      ) {

        event.preventDefault();

        hardDrop();

      }

    }
  );


  // =========================================================
  // 目標ライン
  // =========================================================

  document
    .getElementById(
      "targetLinesInput"
    )
    .addEventListener(
      "change",
      function (event) {

        var value =
          clampTarget(
            event.target.value
          );


        var changed =
          value !==
          state.targetLines;


        state.targetLines =
          value;


        /*
         * ゲーム開始直後は
         * 詰み盤面も再生成
         */

        if (
          changed &&
          state.linesCleared === 0 &&
          !state.active &&
          state.stockCount === 0 &&
          state.eatCount === 0
        ) {

          state.board =
            makeGarbageBoard(
              value
            );

        }


        checkWin();

        save();
        render();

      }
    );


  // =========================================================
  // 落下速度
  // =========================================================

  document
    .getElementById(
      "dropSpeedInput"
    )
    .addEventListener(
      "change",
      function (event) {

        state.dropInterval =
          clampDropInterval(
            event.target.value
          );


        setStatus(

          "ミノの落下速度を「" +
          getDropSpeedLabel(
            state.dropInterval
          ) +
          "」に変更しました。"

        );


        save();
        render();

      }
    );


  // =========================================================
  // 食べ物重複
  // =========================================================

  document
    .getElementById(
      "foodDuplicateModeInput"
    )
    .addEventListener(
      "change",
      function (event) {

        state.foodDuplicateMode =

          event.target.value ===
          "deny"

            ? "deny"

            : "allow";


        if (
          state.foodDuplicateMode ===
          "deny"
        ) {

          state.registeredFoods =
            rebuildItemsFromLog(
              state,
              "food"
            );


          setStatus(
            "食べ物の重複をNGにしました。現在の店で登録済みの名前は登録できません。"
          );

        } else {

          setStatus(
            "食べ物の重複をOKにしました。"
          );

        }


        save();
        render();

      }
    );


  // =========================================================
  // 飲み物重複
  // =========================================================

  document
    .getElementById(
      "drinkDuplicateModeInput"
    )
    .addEventListener(
      "change",
      function (event) {

        state.drinkDuplicateMode =

          event.target.value ===
          "deny"

            ? "deny"

            : "allow";


        if (
          state.drinkDuplicateMode ===
          "deny"
        ) {

          state.registeredDrinks =
            rebuildItemsFromLog(
              state,
              "drink"
            );


          setStatus(
            "飲み物の重複をNGにしました。現在の店で登録済みの名前は登録できません。"
          );

        } else {

          setStatus(
            "飲み物の重複をOKにしました。"
          );

        }


        save();
        render();

      }
    );


  // =========================================================
  // リセット
  // =========================================================

  document
    .getElementById(
      "resetBtn"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "reset",
          function () {

            if (
              window.confirm(
                "進行状況をリセットして最初からやり直しますか？"
              )
            ) {

              startNew();

            }

          },
          500
        );

      }
    );


  // =========================================================
  // 終了画面から再挑戦
  // =========================================================

  document
    .getElementById(
      "endRestart"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "endRestart",
          function () {

            document
              .getElementById(
                "endOverlay"
              )
              .classList
              .remove("show");


            document
              .getElementById(
                "endOverlay"
              )
              .setAttribute(
                "aria-hidden",
                "true"
              );


            startNew();

          },
          500
        );

      }
    );


  // =========================================================
  // テーマ
  // =========================================================

  document
    .getElementById(
      "themeToggle"
    )
    .addEventListener(
      "click",
      function () {

        guarded(
          "theme",
          function () {

            var root =
              document.documentElement;


            var next =
              root.getAttribute(
                "data-theme"
              ) === "light"
                ? "dark"
                : "light";


            root.setAttribute(
              "data-theme",
              next
            );


            try {

              localStorage.setItem(
                "izakaya_tetris_theme",
                next
              );

            } catch (e) {}


            render();

          },
          350
        );

      }
    );


  // =========================================================
  // 新規ゲーム
  // =========================================================

  function startNew() {

    /*
     * 設定だけ保持
     */

    var settings = {

      targetLines:
        state.targetLines,

      dropInterval:
        state.dropInterval,

      foodDuplicateMode:
        state.foodDuplicateMode,

      drinkDuplicateMode:
        state.drinkDuplicateMode,

      /*
       * 新しいゲームでは
       * 店を最初の店に戻す
       */

      storeName:
        "最初の店"

    };


    state =
      freshState(
        settings
      );


    lastTime =
      0;


    acc =
      0;


    setStatus(
      "間食してストックを貯めよう"
    );


    closeChooseModal();


    document
      .getElementById(
        "endOverlay"
      )
      .classList
      .remove(
        "show"
      );


    document
      .getElementById(
        "endOverlay"
      )
      .setAttribute(
        "aria-hidden",
        "true"
      );


    save();

    render();

  }


  // =========================================================
  // スクロール
  // =========================================================

  function scrollBoardIntoView() {

    var frame =
      document.getElementById(
        "boardFrame"
      );


    if (!frame) {

      return;

    }


    requestAnimationFrame(
      function () {

        try {

          frame.scrollIntoView({

            behavior:
              "smooth",

            block:
              "center",

            inline:
              "nearest"

          });

        } catch (e) {

          frame.scrollIntoView();

        }

      }
    );

  }


  // =========================================================
  // 終了
  // =========================================================

  function showEnd(
    won,
    message
  ) {

    var overlay =
      document.getElementById(
        "endOverlay"
      );


    document.getElementById(
      "endTitle"
    ).textContent =

      won
        ? "クリア成功！"
        : "ゲームオーバー";


    document.getElementById(
      "endMessage"
    ).textContent =

      won

        ? (
            "目標の" +
            state.targetLines +
            "ライン消去を達成しました。お会計、お願いします。"
          )

        : (
            message ||
            "戦線離脱です。"
          );


    document.getElementById(
      "endLines"
    ).textContent =

      state.linesCleared +
      " / " +
      state.targetLines;


    document.getElementById(
      "endEat"
    ).textContent =
      state.eatCount;


    document.getElementById(
      "endTime"
    ).textContent =

      formatElapsed(
        getElapsedMs()
      );


    overlay.classList.add(
      "show"
    );


    overlay.setAttribute(
      "aria-hidden",
      "false"
    );

  }


  // =========================================================
  // テーマ復元
  // =========================================================

  function restoreTheme() {

    try {

      var theme =
        localStorage.getItem(
          "izakaya_tetris_theme"
        );


      if (
        theme === "light" ||
        theme === "dark"
      ) {

        document
          .documentElement
          .setAttribute(
            "data-theme",
            theme
          );

      }

    } catch (e) {}

  }


  // =========================================================
  // ゲームループ
  // =========================================================

  function loop(
    timestamp
  ) {

    if (!lastTime) {

      lastTime =
        timestamp;

    }


    /*
     * 大きすぎるdeltaを
     * 最大100msまでに制限
     */

    var delta =
      Math.min(
        100,
        Math.max(
          0,
          timestamp -
          lastTime
        )
      );


    lastTime =
      timestamp;


    if (
      !state.paused &&
      !state.over &&
      !state.won &&
      state.active
    ) {

      acc +=
        delta;


      var interval =
        Math.max(
          150,
          state.dropInterval -
          state.linesCleared *
          12
        );


      while (
        acc >= interval &&
        state.active &&
        !state.paused &&
        !state.over &&
        !state.won
      ) {

        acc -=
          interval;


        softDrop();

      }

    }


    var timerEl =
      document.getElementById(
        "statTime"
      );


    if (timerEl) {

      timerEl.textContent =
        formatElapsed(
          getElapsedMs()
        );

    }


    requestAnimationFrame(
      loop
    );

  }


  // =========================================================
  // 起動
  // =========================================================

  function boot() {

    restoreTheme();


    state =
      load() ||
      freshState();


    /*
     * 保存時に一時停止状態だった場合、
     * そのまま一時停止を保持。
     *
     * プレイ中だった場合だけ、
     * ここから再開計測。
     */

    if (
      !state.paused
    ) {

      state.timerStartedAt =
        Date.now();

    }


    render();


    requestAnimationFrame(
      loop
    );

  }


  boot();

})();
