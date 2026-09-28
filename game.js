(function () {
  "use strict";


  // =========================================================
  // 基本設定
  // =========================================================

  var COLS = 10;
  var ROWS = 20;
  var BLOCK = 30;

  var STORAGE_KEY =
    "izakaya_tetris_save_v6";

  var LEGACY_KEYS = [
    "izakaya_tetris_save_v5",
    "izakaya_tetris_save_v4",
    "izakaya_tetris_save_v3"
  ];

  var MAX_TARGET_LINES = 18;


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
    Object.keys(SHAPES);


  /*
   * ここは指定どおり
   * アルファベット表記のまま
   */
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


  /*
   * 除外チップの色
   */
  var OUTCOME_COLOR = {

    I: "#3fb7c9",
    O: "#e8c14a",
    T: "#b478d6",
    S: "#5fbf7a",
    Z: "#e0574c",
    J: "#5b83e0",
    L: "#e8942e",

    MISS: "#8d8172",

    FREE: "#d3a24d"

  };


  /*
   * 7ミノ + スカ + 自由選択
   */
  var OUTCOMES =
    TYPES.concat([
      "MISS",
      "FREE"
    ]);


  var GARBAGE_COLOR =
    "#7d7466";


  var DEFAULT_DROP_INTERVAL =
    700;


  // =========================================================
  // 状態
  // =========================================================

  var state = null;

  var chooseCallback = null;

  var ctx = null;

  var choiceCtx = null;

  var lastTime = 0;

  var acc = 0;

  var touchLastEnd = 0;


  // =========================================================
  // 新規状態
  // =========================================================

  function freshState() {

    var targetLines =
      state &&
      typeof state.targetLines === "number"
        ? state.targetLines
        : 3;


    targetLines =
      clampTarget(targetLines);


    var now =
      Date.now();


    return {

      board:
        makeGarbageBoard(
          targetLines
        ),


      active:
        null,


      stockCount:
        0,


      excluded:
        [],


      targetLines:
        targetLines,


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
        DEFAULT_DROP_INTERVAL,


      foodDuplicateMode:
        "allow",


      drinkDuplicateMode:
        "allow",


      registeredFoods:
        [],


      registeredDrinks:
        [],


      storeName:
        "最初の店",


      paused:
        false,


      timerStartedAt:
        now

    };

  }


  // =========================================================
  // 数値
  // =========================================================

  function clampTarget(v) {

    v =
      parseInt(
        v,
        10
      );


    if (isNaN(v)) {
      v = 3;
    }


    if (v < 1) {
      v = 1;
    }


    if (
      v > MAX_TARGET_LINES
    ) {
      v = MAX_TARGET_LINES;
    }


    return v;
  }


  function clampDropInterval(v) {

    v =
      parseInt(
        v,
        10
      );


    if (isNaN(v)) {
      v =
        DEFAULT_DROP_INTERVAL;
    }


    if (v < 150) {
      v = 150;
    }


    if (v > 1200) {
      v = 1200;
    }


    return v;
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


  function makeGarbageBoard(
    garbageRows
  ) {

    var board =
      makeEmptyBoard();


    garbageRows =
      Math.min(
        ROWS - 2,
        Math.max(
          1,
          garbageRows
        )
      );


    /*
     * 18ラインなら下18段が埋まり、
     * 上2段が空く。
     *
     * これにより初手で
     * いきなり出現できない状態を防ぐ。
     */
    for (
      var gr =
        ROWS - garbageRows;

      gr < ROWS;

      gr++
    ) {

      /*
       * 2～3個の穴
       */
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

          board[gr][col] =
            GARBAGE_COLOR;

        }

      }

    }


    return board;
  }


  // =========================================================
  // 保存
  // =========================================================

  function save() {

    try {

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          state
        )
      );

    } catch (e) {
      // localStorageが使えない環境でも
      // ゲームそのものは継続
    }

  }


  // =========================================================
  // 読み込み
  // =========================================================

  function load() {

    var parsed =
      tryLoad(
        STORAGE_KEY
      );


    if (parsed) {

      return normalizeLoadedState(
        parsed
      );

    }


    /*
     * 旧バージョンからの移行
     */
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

        return normalizeLoadedState(
          parsed
        );

      }

    }


    return null;
  }


  function tryLoad(key) {

    try {

      var raw =
        window.localStorage.getItem(
          key
        );


      if (!raw) {
        return null;
      }


      return JSON.parse(
        raw
      );

    } catch (e) {

      return null;

    }

  }


  function normalizeLoadedState(
    parsed
  ) {

    if (
      !parsed ||
      !Array.isArray(
        parsed.board
      )
    ) {

      return null;

    }


    parsed.targetLines =
      clampTarget(
        parsed.targetLines
      );


    if (
      !Array.isArray(
        parsed.excluded
      )
    ) {

      parsed.excluded = [];

    }


    if (
      !Array.isArray(
        parsed.log
      )
    ) {

      parsed.log = [];

    }


    if (
      typeof parsed.stockCount
      !== "number"
    ) {

      parsed.stockCount = 0;

    }


    if (
      typeof parsed.linesCleared
      !== "number"
    ) {

      parsed.linesCleared = 0;

    }


    if (
      typeof parsed.eatCount
      !== "number"
    ) {

      parsed.eatCount = 0;

    }


    if (
      typeof parsed.over
      !== "boolean"
    ) {

      parsed.over = false;

    }


    if (
      typeof parsed.won
      !== "boolean"
    ) {

      parsed.won = false;

    }


    if (
      typeof parsed.startedAt
      !== "number"
    ) {

      parsed.startedAt =
        Date.now();

    }


    if (
      typeof parsed.elapsedMs
      !== "number"
    ) {

      parsed.elapsedMs = 0;

    }


    if (
      typeof parsed.endedAt
      !== "number"
    ) {

      parsed.endedAt =
        null;

    }


    parsed.dropInterval =
      clampDropInterval(
        parsed.dropInterval
      );


    if (
      parsed.foodDuplicateMode
      !== "deny" &&
      parsed.foodDuplicateMode
      !== "allow"
    ) {

      /*
       * 旧版のduplicateModeを
       * 食べ物へ移行
       */
      parsed.foodDuplicateMode =
        parsed.duplicateMode === "deny"
          ? "deny"
          : "allow";

    }


    if (
      parsed.drinkDuplicateMode
      !== "deny" &&
      parsed.drinkDuplicateMode
      !== "allow"
    ) {

      /*
       * 旧版では飲食共通設定だったため
       * その設定を引き継ぐ
       */
      parsed.drinkDuplicateMode =
        parsed.duplicateMode === "deny"
          ? "deny"
          : "allow";

    }


    if (
      !Array.isArray(
        parsed.registeredFoods
      )
    ) {

      parsed.registeredFoods = [];

    }


    if (
      !Array.isArray(
        parsed.registeredDrinks
      )
    ) {

      parsed.registeredDrinks = [];

    }


    if (
      typeof parsed.storeName
      !== "string" ||
      !parsed.storeName.trim()
    ) {

      parsed.storeName =
        "最初の店";

    }


    if (
      typeof parsed.paused
      !== "boolean"
    ) {

      parsed.paused = false;

    }


    /*
     * 保存データ読み込み直後は
     * タイマーを現在時刻から再開。
     *
     * 前回終了時刻との差分を
     * 勝手に加算しない。
     */
    parsed.paused = false;

    parsed.timerStartedAt =
      Date.now();


    /*
     * 旧版データから
     * 重複判定配列を再構築
     */
    if (
      parsed.registeredFoods.length === 0
    ) {

      parsed.registeredFoods =
        rebuildRegisteredItems(
          parsed,
          "food"
        );

    }


    if (
      parsed.registeredDrinks.length === 0
    ) {

      parsed.registeredDrinks =
        rebuildRegisteredItems(
          parsed,
          "drink"
        );

    }


    /*
     * activeが壊れている場合は解除
     */
    if (
      parsed.active &&
      (
        !parsed.active.matrix ||
        !Array.isArray(
          parsed.active.matrix
        )
      )
    ) {

      parsed.active = null;

    }


    return parsed;
  }


  function rebuildRegisteredItems(
    loaded,
    category
  ) {

    var result = [];


    if (!Array.isArray(loaded.log)) {
      return result;
    }


    loaded.log.forEach(
      function (entry) {

        if (
          category === "food" &&
          entry.category !== "food"
        ) {

          return;

        }


        if (
          category === "drink" &&
          entry.category !== "drink"
        ) {

          return;

        }


        /*
         * 旧データでcategoryが
         * 存在しない場合
         */
        if (
          !entry.category &&
          category === "food"
        ) {

          result.push(
            normalizeItemName(
              entry.name || ""
            )
          );

        }


        if (
          entry.category === category
        ) {

          if (
            !entry.store ||
            entry.store ===
              loaded.storeName
          ) {

            result.push(
              normalizeItemName(
                entry.name || ""
              )
            );

          }

        }

      }
    );


    return unique(
      result.filter(Boolean)
    );
  }


  // =========================================================
  // 配列
  // =========================================================

  function unique(arr) {

    return arr.filter(
      function (
        value,
        index
      ) {

        return (
          arr.indexOf(value)
          === index
        );

      }
    );

  }


  // =========================================================
  // ミノ生成
  // =========================================================

  function cloneMatrix(m) {

    return m.map(
      function (row) {

        return row.slice();

      }
    );

  }


  function spawnPieceOfType(
    type
  ) {

    var matrix =
      cloneMatrix(
        SHAPES[type]
      );


    var col =
      Math.floor(
        (
          COLS -
          matrix[0].length
        ) /
        2
      );


    return {

      type:
        type,

      matrix:
        matrix,

      row:
        0,

      col:
        col,

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


    var kicks = [
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


      /*
       * 操作直後にも保存
       */
      save();

      render();

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

      state.active.row += 1;


      /*
       * スリープ直前などで
       * 状態を失わないように保存
       */
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


    while (
      !collides(
        state.active.matrix,
        state.active.row + 1,
        state.active.col
      )
    ) {

      state.active.row += 1;

    }


    lockPiece();
  }


  // =========================================================
  // ミノ固定
  // =========================================================

  function lockPiece() {

    var p =
      state.active;


    if (!p) {
      return;
    }


    for (
      var r = 0;
      r < p.matrix.length;
      r++
    ) {

      for (
        var c = 0;
        c < p.matrix[r].length;
        c++
      ) {

        if (
          !p.matrix[r][c]
        ) {

          continue;

        }


        var br =
          p.row + r;

        var bc =
          p.col + c;


        if (br < 0) {

          triggerGameOver(
            "盤面から溢れました。もう戻れません。"
          );


          return;

        }


        state.board[br][bc] =
          p.color;

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


    /*
     * ミノ固定後は必ず保存
     */
    save();

    render();

  }


  // =========================================================
  // ライン消去
  // =========================================================

  function clearLines() {

    var cleared = 0;


    for (
      var r = ROWS - 1;
      r >= 0;
      r--
    ) {

      var full = true;


      for (
        var c = 0;
        c < COLS;
        c++
      ) {

        if (
          !state.board[r][c]
        ) {

          full = false;

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


    if (cleared > 0) {

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


  function checkWin() {

    if (
      state.linesCleared
      >=
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


    showEnd(
      false,
      message
    );


    save();

  }


  // =========================================================
  // ギブアップ
  // =========================================================

  function giveUp() {

    if (
      state.over ||
      state.won
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
  // ストック候補除外
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


    /*
     * ===========================
     * 除外済み → 取り消し
     * ===========================
     */

    if (index !== -1) {

      state.excluded.splice(
        index,
        1
      );


      /*
       * 除外に使ったストックを返却
       */
      state.stockCount +=
        1;


      setStatus(

        OUTCOME_LABEL[outcome] +
        "の除外を取り消しました。ストック＋1"

      );


      save();

      render();

      return;

    }


    /*
     * ===========================
     * 新しく除外
     * ===========================
     */

    var remaining =
      OUTCOMES.length -
      state.excluded.length;


    /*
     * 少なくとも1候補は残す
     */
    if (
      remaining <= 1
    ) {

      return;

    }


    if (
      state.stockCount <= 0
    ) {

      return;

    }


    state.stockCount -=
      1;


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
  // ミノ抽選
  // =========================================================

  function requestSpawn() {

    if (
      state.over ||
      state.won ||
      state.paused
    ) {

      return;

    }


    if (state.active) {

      return;

    }


    if (
      state.stockCount <= 0
    ) {

      return;

    }


    /*
     * 「ミノを出す」を押した瞬間に
     * ストック消費を確定
     */
    state.stockCount -=
      1;


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
     * 今回の抽選を開始したら
     * 除外状態はリセット
     */
    state.excluded =
      [];


    var outcome =
      pool[
        Math.floor(
          Math.random() *
          pool.length
        )
      ];


    /*
     * スカのときはスクロールしない
     */
    if (
      outcome !== "MISS"
    ) {

      scrollBoardIntoView();

    }


    /*
     * ストック消費はこの時点で保存
     */
    save();


    handleOutcome(
      outcome
    );

  }


  function handleOutcome(
    outcome
  ) {

    /*
     * ===========================
     * スカ
     * ===========================
     */

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


    /*
     * ===========================
     * 自由選択
     * ===========================
     */

    if (
      outcome === "FREE"
    ) {

      setStatus(
        "自由選択：現在の盤面を確認してミノを選んでください。"
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


    /*
     * ===========================
     * 通常ミノ
     * ===========================
     */

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
        "盤面が完全に埋まりました。KO..."
      );


      return;

    }


    state.active =
      piece;


    /*
     * 新しいミノが出た時点でも保存
     */
    save();


    setStatus(
      OUTCOME_LABEL[type] +
      "が出ました。落としてください。"
    );


    render();

  }


  // =========================================================
  // 名前正規化
  // =========================================================

  function normalizeItemName(
    name
  ) {

    return String(name)

      .normalize("NFKC")

      .trim()

      .toLowerCase()

      /*
       * 全角・半角を整理したうえで
       * 空白を無視
       */
      .replace(/\s+/g, "");
  }


  // =========================================================
  // 食べ物登録
  // =========================================================

  function eatFood() {

    if (
      state.over ||
      state.won ||
      state.paused
    ) {

      return;

    }


    var input =
      document.getElementById(
        "foodName"
      );


    var name =
      input.value.trim();


    if (!name) {

      name =
        "食べ物";

    }


    var normalized =
      normalizeItemName(
        name
      );


    /*
     * 重複NG
     */
    if (
      state.foodDuplicateMode
      ===
      "deny" &&
      state.registeredFoods.indexOf(
        normalized
      ) !== -1
    ) {

      setStatus(

        "「" +
        name +
        "」は現在の店ですでに登録されています。食べ物は重複NGです。"

      );


      render();

      return;

    }


    /*
     * ストック追加
     */
    state.stockCount +=
      1;


    state.eatCount +=
      1;


    /*
     * 重複判定用へ登録
     */
    if (
      state.registeredFoods.indexOf(
        normalized
      ) === -1
    ) {

      state.registeredFoods.push(
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
        "food",

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
      state.log.length > 30
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
  // 飲み物登録
  // =========================================================

  function eatDrink() {

    if (
      state.over ||
      state.won ||
      state.paused
    ) {

      return;

    }


    var input =
      document.getElementById(
        "drinkName"
      );


    var name =
      input.value.trim();


    if (!name) {

      name =
        "飲み物";

    }


    var normalized =
      normalizeItemName(
        name
      );


    /*
     * 重複NG
     */
    if (
      state.drinkDuplicateMode
      ===
      "deny" &&
      state.registeredDrinks.indexOf(
        normalized
      ) !== -1
    ) {

      setStatus(

        "「" +
        name +
        "」は現在の店ですでに登録されています。飲み物は重複NGです。"

      );


      render();

      return;

    }


    /*
     * ストック追加
     */
    state.stockCount +=
      1;


    state.eatCount +=
      1;


    /*
     * 重複判定用へ登録
     */
    if (
      state.registeredDrinks.indexOf(
        normalized
      ) === -1
    ) {

      state.registeredDrinks.push(
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
        "drink",

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
      state.log.length > 30
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
  // 店を変更
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
        "店を変えると、食べ物・飲み物の重複判定がリセットされます。",

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


    /*
     * 店変更
     */
    state.storeName =
      nextName;


    /*
     * 食べ物と飲み物の
     * 重複判定を両方リセット
     */
    state.registeredFoods =
      [];


    state.registeredDrinks =
      [];


    setStatus(

      "「" +
      nextName +
      "」に店を変更しました。食べ物・飲み物の重複判定をリセットしました。"

    );


    save();

    render();

  }


  // =========================================================
  // 自由選択モーダル
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


    grid.innerHTML =
      "";


    /*
     * 先に現在盤面を描画
     */
    renderChoiceBoardPreview();


    /*
     * 7ミノ
     */
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


        /*
         * 実際のミノ形プレビュー
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

            var cb =
              chooseCallback;


            chooseCallback =
              null;


            closeChooseModal();


            if (cb) {

              cb(type);

            }

          }
        );


        grid.appendChild(
          button
        );

      }
    );


    overlay.classList.add(
      "show"
    );


    overlay.setAttribute(
      "aria-hidden",
      "false"
    );

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

  }


  // =========================================================
  // 自由選択の盤面プレビュー
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


    var emptyColor =
      styles
        .getPropertyValue(
          "--board-empty"
        )
        .trim();


    var gridColor =
      styles
        .getPropertyValue(
          "--board-grid"
        )
        .trim();


    /*
     * 10列 × 20行
     * 220 × 440
     * = 22px
     */
    var previewBlock =
      22;


    choiceCtx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    choiceCtx.fillStyle =
      emptyColor;


    choiceCtx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    /*
     * グリッド
     */
    choiceCtx.strokeStyle =
      gridColor;


    choiceCtx.lineWidth =
      1;


    for (
      var c = 0;
      c <= COLS;
      c++
    ) {

      choiceCtx.beginPath();


      choiceCtx.moveTo(
        c * previewBlock,
        0
      );


      choiceCtx.lineTo(
        c * previewBlock,
        canvas.height
      );


      choiceCtx.stroke();

    }


    for (
      var r = 0;
      r <= ROWS;
      r++
    ) {

      choiceCtx.beginPath();


      choiceCtx.moveTo(
        0,
        r * previewBlock
      );


      choiceCtx.lineTo(
        canvas.width,
        r * previewBlock
      );


      choiceCtx.stroke();

    }


    /*
     * 現在の盤面
     */
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
          bc * previewBlock + 1,
          br * previewBlock + 1,
          previewBlock - 2,
          previewBlock - 2
        );

      }

    }

  }


  // =========================================================
  // メイン描画
  // =========================================================

  function render() {

    if (!ctx) {

      var canvas =
        document.getElementById(
          "board"
        );


      if (!canvas) {

        return;

      }


      ctx =
        canvas.getContext(
          "2d"
        );

    }


    var styles =
      getComputedStyle(
        document.documentElement
      );


    var emptyColor =
      styles
        .getPropertyValue(
          "--board-empty"
        )
        .trim();


    var gridColor =
      styles
        .getPropertyValue(
          "--board-grid"
        )
        .trim();


    /*
     * 背景
     */
    ctx.fillStyle =
      emptyColor;


    ctx.fillRect(
      0,
      0,
      COLS * BLOCK,
      ROWS * BLOCK
    );


    /*
     * グリッド
     */
    ctx.strokeStyle =
      gridColor;


    ctx.lineWidth =
      1;


    for (
      var gc = 0;
      gc <= COLS;
      gc++
    ) {

      ctx.beginPath();


      ctx.moveTo(
        gc * BLOCK,
        0
      );


      ctx.lineTo(
        gc * BLOCK,
        ROWS * BLOCK
      );


      ctx.stroke();

    }


    for (
      var gr = 0;
      gr <= ROWS;
      gr++
    ) {

      ctx.beginPath();


      ctx.moveTo(
        0,
        gr * BLOCK
      );


      ctx.lineTo(
        COLS * BLOCK,
        gr * BLOCK
      );


      ctx.stroke();

    }


    /*
     * 固定ブロック
     */
    for (
      var r = 0;
      r < ROWS;
      r++
    ) {

      for (
        var c = 0;
        c < COLS;
        c++
      ) {

        if (
          state.board[r][c]
        ) {

          drawBlock(
            c,
            r,
            state.board[r][c]
          );

        }

      }

    }


    /*
     * 操作中ミノ
     */
    if (
      state.active
    ) {

      var p =
        state.active;


      for (
        var mr = 0;
        mr < p.matrix.length;
        mr++
      ) {

        for (
          var mc = 0;
          mc < p.matrix[mr].length;
          mc++
        ) {

          if (
            p.matrix[mr][mc]
          ) {

            drawBlock(
              p.col + mc,
              p.row + mr,
              p.color
            );

          }

        }

      }

    }


    /*
     * ストック
     */
    document
      .getElementById(
        "stockCountEl"
      )
      .innerHTML =

        state.stockCount +
        "<span class='unit'>個</span>";


    /*
     * ミノを出す
     */
    var spawnBtn =
      document.getElementById(
        "spawnBtn"
      );


    spawnBtn.disabled =
      state.stockCount <= 0 ||
      !!state.active ||
      state.over ||
      state.won ||
      state.paused;


    /*
     * 操作ボタン
     */
    var moveDisabled =
      !state.active ||
      state.over ||
      state.won ||
      state.paused;


    document
      .getElementById(
        "btnLeft"
      )
      .disabled =
        moveDisabled;


    document
      .getElementById(
        "btnRight"
      )
      .disabled =
        moveDisabled;


    document
      .getElementById(
        "btnRotate"
      )
      .disabled =
        moveDisabled;


    document
      .getElementById(
        "btnDrop"
      )
      .disabled =
        moveDisabled;


    /*
     * 除外候補
     */
    renderExcludeChips();


    /*
     * 店
     */
    document
      .getElementById(
        "storeNameEl"
      )
      .textContent =
        state.storeName;


    /*
     * 重複設定表示
     */
    document
      .getElementById(
        "duplicateNote"
      )
      .textContent =

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


    /*
     * 設定
     */
    document
      .getElementById(
        "targetLinesInput"
      )
      .value =
        state.targetLines;


    document
      .getElementById(
        "dropSpeedInput"
      )
      .value =
        String(
          state.dropInterval
        );


    document
      .getElementById(
        "dropSpeedLabel"
      )
      .textContent =
        getDropSpeedLabel(
          state.dropInterval
        );


    document
      .getElementById(
        "foodDuplicateModeInput"
      )
      .value =
        state.foodDuplicateMode;


    document
      .getElementById(
        "drinkDuplicateModeInput"
      )
      .value =
        state.drinkDuplicateMode;


    /*
     * ログ
     */
    renderLog();


    /*
     * 戦績
     */
    document
      .getElementById(
        "statLines"
      )
      .textContent =
        state.linesCleared +
        " / " +
        state.targetLines;


    document
      .getElementById(
        "statEat"
      )
      .textContent =
        state.eatCount;


    document
      .getElementById(
        "statTime"
      )
      .textContent =
        formatElapsed(
          getElapsedMs()
        );


    /*
     * ギブアップ
     */
    document
      .getElementById(
        "giveUpBtn"
      )
      .disabled =
        state.over ||
        state.won ||
        state.paused;

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

        var chip =
          document.createElement(
            "button"
          );


        var excluded =
          state.excluded.indexOf(
            outcome
          ) !== -1;


        chip.type =
          "button";


        chip.className =
          "chip" +
          (
            excluded
              ? " chip-excluded"
              : ""
          );


        chip.textContent =
          excluded
            ? OUTCOME_LABEL[outcome] +
              "（解除）"
            : OUTCOME_LABEL[outcome];


        chip.style.setProperty(
          "--chip-color",
          OUTCOME_COLOR[outcome]
        );


        /*
         * 新規除外
         */
        chip.disabled =
          (
            !excluded &&
            (
              state.stockCount <= 0 ||
              remaining <= 1
            )
          ) ||
          state.over ||
          state.won ||
          state.paused ||
          !!state.active;


        /*
         * 除外済みは解除できる
         */
        if (
          excluded &&
          !state.over &&
          !state.won &&
          !state.paused &&
          !state.active
        ) {

          chip.disabled =
            false;

        }


        chip.addEventListener(
          "click",
          function () {

            toggleExclude(
              outcome
            );

          }
        );


        wrap.appendChild(
          chip
        );

      }
    );

  }


  // =========================================================
  // ログ描画
  // =========================================================

  function renderLog() {

    var logList =
      document.getElementById(
        "logList"
      );


    logList.innerHTML =
      "";


    state.log
      .slice(
        0,
        8
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


          name.className =
            "name";


          var icon =
            entry.category === "drink"
              ? "🍺 "
              : "🍢 ";


          name.textContent =
            icon +
            entry.name;


          var meta =
            document.createElement(
              "span"
            );


          meta.className =
            "meta";


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


          logList.appendChild(
            li
          );

        }
      );

  }


  // =========================================================
  // ブロック描画
  // =========================================================

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


  function setStatus(
    message
  ) {

    document
      .getElementById(
        "statusLine"
      )
      .textContent =
        message;

  }


  // =========================================================
  // 経過時間
  // =========================================================

  function updateElapsed() {

    if (
      state.paused ||
      state.over ||
      state.won
    ) {

      return;

    }


    var now =
      Date.now();


    var delta =
      Math.max(
        0,
        now -
        state.timerStartedAt
      );


    state.elapsedMs +=
      delta;


    state.timerStartedAt =
      now;

  }


  function getElapsedMs() {

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

    var totalSec =
      Math.floor(
        ms / 1000
      );


    var sec =
      totalSec % 60;


    var min =
      Math.floor(
        totalSec / 60
      ) % 60;


    var hour =
      Math.floor(
        totalSec / 3600
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


  function pad2(
    number
  ) {

    return String(
      number
    ).padStart(
      2,
      "0"
    );

  }


  // =========================================================
  // 落下速度
  // =========================================================

  function getDropSpeedLabel(
    interval
  ) {

    interval =
      clampDropInterval(
        interval
      );


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
  // 終了表示
  // =========================================================

  function showEnd(
    won,
    message
  ) {

    var overlay =
      document.getElementById(
        "endOverlay"
      );


    document
      .getElementById(
        "endTitle"
      )
      .textContent =

        won
          ? "クリア成功！"
          : "ゲームオーバー";


    document
      .getElementById(
        "endMessage"
      )
      .textContent =

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


    document
      .getElementById(
        "endLines"
      )
      .textContent =
        state.linesCleared +
        " / " +
        state.targetLines;


    document
      .getElementById(
        "endEat"
      )
      .textContent =
        state.eatCount;


    document
      .getElementById(
        "endTime"
      )
      .textContent =
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
  // 盤面スクロール
  // =========================================================

  function scrollBoardIntoView() {

    var frame =
      document.getElementById(
        "boardFrame"
      );


    if (!frame) {

      return;

    }


    window.requestAnimationFrame(
      function () {

        /*
         * フォーカス中の入力欄などを
         * なるべく崩さない
         */
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
  // ゲームループ
  // =========================================================

  function loop(
    timestamp
  ) {

    if (!lastTime) {

      lastTime =
        timestamp;

    }


    var delta =
      timestamp -
      lastTime;


    lastTime =
      timestamp;


    /*
     * paused中は落下させない
     */
    if (
      !state.over &&
      !state.won &&
      !state.paused &&
      state.active
    ) {

      /*
       * 万一巨大なdeltaが来ても
       * 一気に何十段も落とさない
       */
      delta =
        Math.min(
          delta,
          100
        );


      acc +=
        delta;


      var interval =
        Math.max(
          150,
          state.dropInterval -
          state.linesCleared * 12
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


    renderTimerOnly();


    requestAnimationFrame(
      loop
    );

  }


  function renderTimerOnly() {

    var element =
      document.getElementById(
        "statTime"
      );


    if (!element) {

      return;

    }


    element.textContent =
      formatElapsed(
        getElapsedMs()
      );

  }


  // =========================================================
  // スリープ・バックグラウンド対策
  // =========================================================

  document.addEventListener(
    "visibilitychange",
    function () {

      if (!state) {
        return;
      }


      /*
       * 画面が消えた・別アプリへ移動した
       */
      if (document.hidden) {

        if (
          !state.paused &&
          !state.over &&
          !state.won
        ) {

          /*
           * スリープ直前までの時間を確定
           */
          updateElapsed();


          state.paused =
            true;


          /*
           * 復帰時に過去時間分の
           * ミノ落下が発生しないようにする
           */
          acc =
            0;


          lastTime =
            0;


          save();

        }


        return;

      }


      /*
       * 復帰
       */
      if (
        state.paused &&
        !state.over &&
        !state.won
      ) {

        state.paused =
          false;


        /*
         * 復帰時刻を新しい
         * 時間計測開始点にする
         */
        state.timerStartedAt =
          Date.now();


        /*
         * スリープ時間を落下時間に
         * 使わない
         */
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

    }
  );


  // =========================================================
  // ページ離脱時保存
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
  // ダブルタップ拡大対策
  // =========================================================

  document.addEventListener(
    "touchend",
    function (event) {

      var now =
        Date.now();


      /*
       * 300ms以内の連続touchendを
       * ダブルタップとして扱う
       */
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


        /*
         * 入力欄では通常の
         * タッチ操作を残す
         */
        if (!editable) {

          event.preventDefault();

        }

      }


      touchLastEnd =
        now;

    },
    {
      passive: false
    }
  );


  // =========================================================
  // 左
  // =========================================================

  document
    .getElementById(
      "btnLeft"
    )
    .addEventListener(
      "click",
      function () {

        tryMove(-1);

      }
    );


  // =========================================================
  // 右
  // =========================================================

  document
    .getElementById(
      "btnRight"
    )
    .addEventListener(
      "click",
      function () {

        tryMove(1);

      }
    );


  // =========================================================
  // 回転
  // =========================================================

  document
    .getElementById(
      "btnRotate"
    )
    .addEventListener(
      "click",
      tryRotate
    );


  // =========================================================
  // ハードドロップ
  // =========================================================

  document
    .getElementById(
      "btnDrop"
    )
    .addEventListener(
      "click",
      hardDrop
    );


  // =========================================================
  // ミノを出す
  // =========================================================

  document
    .getElementById(
      "spawnBtn"
    )
    .addEventListener(
      "click",
      requestSpawn
    );


  // =========================================================
  // 食べ物
  // =========================================================

  document
    .getElementById(
      "btnEatFood"
    )
    .addEventListener(
      "click",
      eatFood
    );


  // =========================================================
  // 飲み物
  // =========================================================

  document
    .getElementById(
      "btnEatDrink"
    )
    .addEventListener(
      "click",
      eatDrink
    );


  // =========================================================
  // 店変更
  // =========================================================

  document
    .getElementById(
      "changeStoreBtn"
    )
    .addEventListener(
      "click",
      changeStore
    );


  // =========================================================
  // キーボード
  // =========================================================

  document.addEventListener(
    "keydown",
    function (event) {

      /*
       * 自由選択モーダル中
       */
      if (
        document
          .getElementById(
            "chooseOverlay"
          )
          .classList
          .contains("show")
      ) {

        if (
          event.key === "Escape"
        ) {

          document
            .getElementById(
              "chooseCancel"
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
  // 目標ライン変更
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
         * ゲーム開始直後なら
         * 詰み盤面も再構築
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
              state.targetLines
            );

        }


        checkWin();

        save();

        render();

      }
    );


  // =========================================================
  // 落下速度変更
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
  // 食べ物重複設定
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


        /*
         * 重複NGへ変更した場合、
         * 現在の店のログを元に
         * 判定対象を作り直す。
         */
        if (
          state.foodDuplicateMode
          ===
          "deny"
        ) {

          state.registeredFoods =
            rebuildCurrentStoreItems(
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
  // 飲み物重複設定
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


        /*
         * 重複NGへ変更した場合、
         * 現在の店のログを元に
         * 判定対象を作り直す。
         */
        if (
          state.drinkDuplicateMode
          ===
          "deny"
        ) {

          state.registeredDrinks =
            rebuildCurrentStoreItems(
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
  // 現在の店の登録済みアイテム
  // =========================================================

  function rebuildCurrentStoreItems(
    category
  ) {

    var result = [];


    state.log.forEach(
      function (entry) {

        if (
          entry.category !==
          category
        ) {

          return;

        }


        /*
         * 現在の店だけ
         */
        if (
          entry.store !==
          state.storeName
        ) {

          return;

        }


        var normalized =
          normalizeItemName(
            entry.name || ""
          );


        if (
          normalized &&
          result.indexOf(
            normalized
          ) === -1
        ) {

          result.push(
            normalized
          );

        }

      }
    );


    return result;
  }


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

        /*
         * 「ミノを出す」で
         * ストック消費はすでに確定。
         *
         * キャンセルしても
         * ストックは戻さない。
         */
        chooseCallback =
          null;


        closeChooseModal();


        setStatus(
          "自由選択をキャンセルしました。今回のストック消費は確定しています。"
        );


        save();

        render();

      }
    );


  // =========================================================
  // 最初からやり直す
  // =========================================================

  document
    .getElementById(
      "resetBtn"
    )
    .addEventListener(
      "click",
      function () {

        if (
          window.confirm(
            "進行状況をリセットして最初からやり直しますか？"
          )
        ) {

          startNew();

        }

      }
    );


  // =========================================================
  // 終了後再挑戦
  // =========================================================

  document
    .getElementById(
      "endRestart"
    )
    .addEventListener(
      "click",
      function () {

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


        startNew();

      }
    );


  // =========================================================
  // テーマ切替
  // =========================================================

  document
    .getElementById(
      "themeToggle"
    )
    .addEventListener(
      "click",
      function () {

        var root =
          document.documentElement;


        var current =
          root.getAttribute(
            "data-theme"
          );


        var next =
          current === "light"
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

      }
    );


  // =========================================================
  // 新規ゲーム
  // =========================================================

  function startNew() {

    state =
      freshState();


    lastTime =
      0;


    acc =
      0;


    setStatus(
      "間食してストックを貯めよう"
    );


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
        "chooseOverlay"
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


    document
      .getElementById(
        "chooseOverlay"
      )
      .setAttribute(
        "aria-hidden",
        "true"
      );


    save();

    render();

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
  // 起動
  // =========================================================

  function boot() {

    restoreTheme();


    var loaded =
      load();


    state =
      loaded ||
      freshState();


    /*
     * 念のためデータ整合性を補正
     */
    state.targetLines =
      clampTarget(
        state.targetLines
      );


    state.dropInterval =
      clampDropInterval(
        state.dropInterval
      );


    if (
      state.foodDuplicateMode !== "deny" &&
      state.foodDuplicateMode !== "allow"
    ) {

      state.foodDuplicateMode =
        "allow";

    }


    if (
      state.drinkDuplicateMode !== "deny" &&
      state.drinkDuplicateMode !== "allow"
    ) {

      state.drinkDuplicateMode =
        "allow";

    }


    if (
      !Array.isArray(
        state.registeredFoods
      )
    ) {

      state.registeredFoods =
        [];

    }


    if (
      !Array.isArray(
        state.registeredDrinks
      )
    ) {

      state.registeredDrinks =
        [];

    }


    /*
     * 起動時は
     * 現在時刻からタイマー再開
     */
    state.paused =
      false;


    state.timerStartedAt =
      Date.now();


    render();


    requestAnimationFrame(
      loop
    );

  }


  boot();

})();
