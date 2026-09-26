(function () {
  "use strict";

  var COLS = 10;
  var ROWS = 20;
  var BLOCK = 30;

  var STORAGE_KEY =
    "izakaya_tetris_save_v5";

  var LEGACY_STORAGE_KEY =
    "izakaya_tetris_save_v4";

  var MAX_TARGET_LINES = 20;


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


  var OUTCOMES =
    TYPES.concat([
      "MISS",
      "FREE"
    ]);


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


  var GARBAGE_COLOR =
    "#7d7466";


  var state = null;

  var chooseCallback = null;

  var ctx = null;

  var lastTime = 0;

  var acc = 0;


  // =========================================================
  // 状態
  // =========================================================

  function freshState() {

    var targetLines =
      state &&
      typeof state.targetLines === "number"
        ? state.targetLines
        : 3;

    targetLines =
      clampTarget(targetLines);


    return {

      board:
        makeGarbageBoard(
          targetLines
        ),

      active: null,

      stockCount: 0,

      excluded: [],

      targetLines:
        targetLines,

      linesCleared: 0,

      eatCount: 0,

      log: [],

      over: false,

      won: false,

      startedAt:
        Date.now(),

      elapsedMs: 0,

      endedAt: null,

      // 1段落ちるまでのミリ秒
      dropInterval: 700,

      // 重複設定
      duplicateMode: "allow",

      // 現在の店で登録済みの名前
      registeredItems: [],

      // 現在の店
      storeName: "最初の店"

    };

  }


  function clampTarget(v) {

    v = parseInt(v, 10);

    if (isNaN(v))
      v = 3;

    if (v < 1)
      v = 1;

    if (v > MAX_TARGET_LINES)
      v = MAX_TARGET_LINES;

    return v;
  }


  function makeEmptyBoard() {

    var board = [];

    for (
      var r = 0;
      r < ROWS;
      r++
    ) {

      board.push(
        new Array(COLS).fill(null)
      );

    }

    return board;
  }


  // =========================================================
  // 詰み盤面
  // =========================================================

  function makeGarbageBoard(
    garbageRows
  ) {

    var board =
      makeEmptyBoard();


    garbageRows = Math.min(
      ROWS,
      Math.max(
        1,
        garbageRows
      )
    );


    for (
      var gr =
        ROWS - garbageRows;

      gr < ROWS;

      gr++
    ) {

      // 2～3個の穴を作成
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
            Math.random() * COLS
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
        JSON.stringify(state)
      );

    } catch (e) {}

  }


  // =========================================================
  // 読み込み
  // =========================================================

  function load() {

    var parsed =
      tryLoad(
        STORAGE_KEY
      );


    var migrated = false;


    if (!parsed) {

      parsed =
        tryLoad(
          LEGACY_STORAGE_KEY
        );

      migrated =
        !!parsed;

    }


    if (
      !parsed ||
      !parsed.board ||
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
      !parsed.endedAt ||
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
      parsed.duplicateMode
      !== "deny" &&
      parsed.duplicateMode
      !== "allow"
    ) {

      parsed.duplicateMode =
        "allow";

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
      !Array.isArray(
        parsed.registeredItems
      )
    ) {

      parsed.registeredItems =
        [];

    }


    // v4からの移行
    if (
      migrated &&
      parsed.duplicateMode
      === "deny"
    ) {

      parsed.registeredItems =
        parsed.log

          .filter(
            function (entry) {

              return (
                !entry.store ||
                entry.store
                === parsed.storeName
              );

            }
          )

          .map(
            function (entry) {

              return normalizeItemName(
                entry.name || ""
              );

            }
          )

          .filter(Boolean);


      parsed.registeredItems =
        unique(
          parsed.registeredItems
        );

    }


    return parsed;
  }


  function tryLoad(key) {

    try {

      var raw =
        window.localStorage.getItem(
          key
        );


      if (!raw)
        return null;


      return JSON.parse(
        raw
      );

    } catch (e) {

      return null;

    }
  }


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
  // ミノ
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
        ) / 2
      );


    return {

      type: type,

      matrix: matrix,

      row: 0,

      col: col,

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
        ) continue;


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

    var res = [];


    for (
      var c = 0;
      c < cols;
      c++
    ) {

      var newRow = [];


      for (
        var r =
          rows - 1;

        r >= 0;

        r--
      ) {

        newRow.push(
          m[r][c]
        );

      }


      res.push(
        newRow
      );

    }


    return res;
  }


  function tryRotate() {

    if (!state.active)
      return;


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

        render();
        save();

        return;
      }
    }
  }


  function tryMove(dx) {

    if (!state.active)
      return;


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

      render();
      save();

    }

  }


  function softDrop() {

    if (!state.active)
      return;


    if (
      !collides(
        state.active.matrix,
        state.active.row + 1,
        state.active.col
      )
    ) {

      state.active.row += 1;

      render();

    } else {

      lockPiece();

    }

  }


  function hardDrop() {

    if (!state.active)
      return;


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


  function lockPiece() {

    var p =
      state.active;


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

        if (!p.matrix[r][c])
          continue;


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


    save();

    render();

  }


  // =========================================================
  // ライン
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

      freezeElapsed();

      save();

      showEnd(true);

    }
  }


  function triggerGameOver(msg) {

    state.over =
      true;

    state.active =
      null;

    freezeElapsed();

    showEnd(
      false,
      msg
    );

    save();
  }


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
  // ストック・除外
  // =========================================================

  function toggleExclude(
    outcome
  ) {

    if (
      state.over ||
      state.won ||
      state.active
    ) {

      return;
    }


    var idx =
      state.excluded.indexOf(
        outcome
      );


    // 除外解除
    if (idx !== -1) {

      state.excluded.splice(
        idx,
        1
      );


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


    var remaining =
      OUTCOMES.length -
      state.excluded.length;


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


  function requestSpawn() {

    if (
      state.over ||
      state.won
    ) {

      return;
    }


    if (state.active)
      return;


    if (
      state.stockCount <= 0
    ) {

      return;
    }


    // 押した瞬間に消費確定
    state.stockCount -= 1;


    var pool =
      OUTCOMES.filter(
        function (o) {

          return (
            state.excluded.indexOf(o)
            === -1
          );

        }
      );


    state.excluded = [];


    var outcome =
      pool[
        Math.floor(
          Math.random() *
          pool.length
        )
      ];


    // スカ以外だけスクロール
    if (
      outcome !== "MISS"
    ) {

      scrollBoardIntoView();

    }


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
        "スカ…ハズレでした。ストックを1消費しました。盤面はそのままです。"
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
        "自由選択：形を見てミノを選んでください。"
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


    // 通常ミノ
    trySpawnType(
      outcome
    );
  }


  function trySpawnType(
    type
  ) {

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


    setStatus(
      type +
      "ミノが出ました。落としてください。"
    );


    save();

    render();
  }


  // =========================================================
  // 間食・重複
  // =========================================================

  function normalizeItemName(
    name
  ) {

    return String(name)
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }


  function eatItem() {

    if (
      state.over ||
      state.won
    ) {

      return;
    }


    var name =
      document
        .getElementById(
          "itemName"
        )
        .value
        .trim();


    if (!name)
      name = "間食";


    var normalized =
      normalizeItemName(
        name
      );


    // 重複NG
    if (
      state.duplicateMode ===
      "deny" &&
      state.registeredItems
        .indexOf(
          normalized
        ) !== -1
    ) {

      setStatus(

        "「" +
        name +
        "」は現在の店ですでに登録済みです。重複NGのため登録できません。"

      );


      render();

      return;
    }


    // ストック追加
    state.stockCount += 1;

    state.eatCount += 1;


    if (
      state.duplicateMode ===
      "deny"
    ) {

      state.registeredItems.push(
        normalized
      );

    }


    // 店名も保存
    state.log.unshift({

      name:
        name,

      store:
        state.storeName,

      t:
        new Date()
          .toLocaleTimeString(
            "ja-JP",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          )

    });


    if (
      state.log.length > 30
    ) {

      state.log.pop();

    }


    document
      .getElementById(
        "itemName"
      )
      .value = "";


    if (!state.active) {

      setStatus(
        "「ミノを出す」を押して盤面に置こう"
      );

    }


    save();

    render();
  }


  // =========================================================
  // 店変更
  // =========================================================

  function changeStore() {

    if (
      state.over ||
      state.won
    ) {

      return;
    }


    var nextName =
      window.prompt(

        "変更先の店名を入力してください。\n" +
        "店を変えると、この店での重複NG判定はリセットされます。",

        state.storeName

      );


    // キャンセル
    if (
      nextName === null
    ) {

      return;

    }


    nextName =
      nextName.trim();


    if (!nextName) {

      setStatus(
        "店名が空欄のため、店は変更しませんでした。"
      );

      return;
    }


    if (
      nextName ===
      state.storeName
    ) {

      setStatus(
        "現在と同じ店です。重複判定もそのままです。"
      );

      return;
    }


    state.storeName =
      nextName;


    // 店を変えたので
    // 重複判定をリセット
    state.registeredItems =
      [];


    setStatus(

      "「" +
      nextName +
      "」に店を変更しました。重複NGの判定をリセットしました。"

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


    grid.innerHTML = "";


    TYPES.forEach(
      function (type) {

        var btn =
          document.createElement(
            "button"
          );


        btn.className =
          "choice-piece";


        btn.style.borderColor =
          COLORS[type];


        btn.type =
          "button";


        btn.setAttribute(
          "aria-label",
          type +
          "ミノを選ぶ"
        );


        // ミノの形をプレビュー
        var preview =
          document.createElement(
            "div"
          );


        preview.className =
          "mino-preview";


        var shape =
          SHAPES[type];


        preview.style
          .gridTemplateColumns =
            "repeat(" +
            shape[0].length +
            ", 12px)";


        preview.style
          .gridTemplateRows =
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
          type;


        btn.appendChild(
          preview
        );


        btn.appendChild(
          label
        );


        btn.addEventListener(
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
          btn
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
  // 描画
  // =========================================================

  function render() {

    if (!ctx) {

      ctx =
        document
          .getElementById(
            "board"
          )
          .getContext(
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


    ctx.fillStyle =
      emptyColor;


    ctx.fillRect(
      0,
      0,
      COLS * BLOCK,
      ROWS * BLOCK
    );


    ctx.strokeStyle =
      gridColor;


    ctx.lineWidth =
      1;


    // 縦線
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


    // 横線
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


    // 固定ブロック
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


    // 操作中ミノ
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


    // ストック
    document
      .getElementById(
        "stockCountEl"
      )
      .innerHTML =
        state.stockCount +
        "<span class='unit'>個</span>";


    // ミノ出現ボタン
    var spawnBtn =
      document.getElementById(
        "spawnBtn"
      );


    spawnBtn.disabled =
      state.stockCount <= 0 ||
      !!state.active ||
      state.over ||
      state.won;


    // 操作ボタン
    var moveDisabled =
      !state.active ||
      state.over ||
      state.won;


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


    // -------------------------------------------------------
    // 候補除外
    // -------------------------------------------------------

    var chipWrap =
      document.getElementById(
        "excludeChips"
      );


    chipWrap.innerHTML =
      "";


    var remaining =
      OUTCOMES.length -
      state.excluded.length;


    OUTCOMES.forEach(
      function (o) {

        var chip =
          document.createElement(
            "button"
          );


        var isExcluded =
          state.excluded.indexOf(
            o
          ) !== -1;


        chip.className =
          "chip" +
          (
            isExcluded
              ? " chip-excluded"
              : ""
          );


        chip.textContent =
          isExcluded
            ? OUTCOME_LABEL[o] +
              "（解除）"
            : OUTCOME_LABEL[o];


        chip.type =
          "button";


        // 除外済みは解除可能
        chip.disabled =
          (
            !isExcluded &&
            (
              state.stockCount <= 0 ||
              remaining <= 1
            )
          ) ||
          state.over ||
          state.won ||
          !!state.active;


        if (
          !isExcluded &&
          o in COLORS
        ) {

          chip.style.borderColor =
            COLORS[o];

        }


        chip.onclick =
          function () {

            toggleExclude(
              o
            );

          };


        chipWrap.appendChild(
          chip
        );

      }
    );


    // 店
    document
      .getElementById(
        "storeNameEl"
      )
      .textContent =
        state.storeName;


    // 重複表示
    document
      .getElementById(
        "duplicateNote"
      )
      .textContent =
        state.duplicateMode ===
        "deny"

          ? "重複：NG（同じ店・同じ名前は登録不可）"

          : "重複：許可";


    // 設定
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
        "duplicateModeInput"
      )
      .value =
        state.duplicateMode;


    // 食事ログ
    var logList =
      document.getElementById(
        "logList"
      );


    logList.innerHTML =
      "";


    state.log
      .slice(0, 8)
      .forEach(
        function (entry) {

          var li =
            document.createElement(
              "li"
            );


          var nameSpan =
            document.createElement(
              "span"
            );


          nameSpan.className =
            "name";


          nameSpan.textContent =
            "🍢 " +
            entry.name;


          var metaSpan =
            document.createElement(
              "span"
            );


          metaSpan.className =
            "meta";


          metaSpan.textContent =
            (
              entry.store ||
              "最初の店"
            ) +
            " / " +
            entry.t;


          li.appendChild(
            nameSpan
          );


          li.appendChild(
            metaSpan
          );


          logList.appendChild(
            li
          );

        }
      );


    // 戦績
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


    document
      .getElementById(
        "giveUpBtn"
      )
      .disabled =
        state.over ||
        state.won;
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


  function setStatus(
    msg
  ) {

    document
      .getElementById(
        "statusLine"
      )
      .textContent =
        msg;

  }


  // =========================================================
  // 経過時間
  // =========================================================

  function getElapsedMs() {

    if (
      state.over ||
      state.won
    ) {

      return Math.max(
        0,
        state.elapsedMs
      );

    }


    return Math.max(
      0,
      Date.now() -
      state.startedAt
    );
  }


  function freezeElapsed() {

    if (
      !state.endedAt
    ) {

      state.endedAt =
        Date.now();

    }


    state.elapsedMs =
      Math.max(
        0,
        state.endedAt -
        state.startedAt
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


  function pad2(n) {

    return String(n)
      .padStart(
        2,
        "0"
      );
  }


  // =========================================================
  // 落下速度
  // =========================================================

  function clampDropInterval(
    v
  ) {

    v = parseInt(
      v,
      10
    );


    if (isNaN(v))
      v = 700;


    if (v < 150)
      v = 150;


    if (v > 1200)
      v = 1200;


    return v;
  }


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
  // 終了画面
  // =========================================================

  function showEnd(
    won,
    msg
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
              msg ||
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


    if (!frame)
      return;


    window.requestAnimationFrame(
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
  // 落下ループ
  // =========================================================

  function loop(
    ts
  ) {

    if (!lastTime) {

      lastTime =
        ts;

    }


    var dt =
      ts -
      lastTime;


    lastTime =
      ts;


    if (
      !state.over &&
      !state.won &&
      state.active
    ) {

      acc += dt;


      var interval =
        Math.max(
          150,
          state.dropInterval -
          state.linesCleared *
          12
        );


      if (
        acc > interval
      ) {

        acc = 0;

        softDrop();

      }

    }


    renderTimerOnly();


    requestAnimationFrame(
      loop
    );
  }


  function renderTimerOnly() {

    var el =
      document.getElementById(
        "statTime"
      );


    if (el) {

      el.textContent =
        formatElapsed(
          getElapsedMs()
        );

    }
  }


  // =========================================================
  // 入力
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


  document
    .getElementById(
      "btnRotate"
    )
    .addEventListener(
      "click",
      tryRotate
    );


  document
    .getElementById(
      "btnDrop"
    )
    .addEventListener(
      "click",
      hardDrop
    );


  document
    .getElementById(
      "spawnBtn"
    )
    .addEventListener(
      "click",
      requestSpawn
    );


  document
    .getElementById(
      "btnEat"
    )
    .addEventListener(
      "click",
      eatItem
    );


  document
    .getElementById(
      "giveUpBtn"
    )
    .addEventListener(
      "click",
      giveUp
    );


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
    function (e) {

      // ESCで自由選択を閉じる
      if (
        e.key === "Escape" &&
        document
          .getElementById(
            "chooseOverlay"
          )
          .classList
          .contains(
            "show"
          )
      ) {

        document
          .getElementById(
            "chooseCancel"
          )
          .click();

        return;
      }


      if (
        state.over ||
        state.won
      ) {

        return;

      }


      if (
        e.key === "ArrowLeft"
      ) {

        tryMove(-1);

      } else if (
        e.key === "ArrowRight"
      ) {

        tryMove(1);

      } else if (
        e.key === "ArrowUp"
      ) {

        tryRotate();

      } else if (
        e.key === "ArrowDown"
      ) {

        softDrop();

      } else if (
        e.key === " "
      ) {

        e.preventDefault();

        hardDrop();

      }

    }
  );


  // =========================================================
  // 目標ライン数
  // =========================================================

  document
    .getElementById(
      "targetLinesInput"
    )
    .addEventListener(
      "change",
      function (e) {

        var v =
          clampTarget(
            e.target.value
          );


        var changed =
          v !==
          state.targetLines;


        state.targetLines =
          v;


        // 開始直後なら盤面も再生成
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
  // 落下速度
  // =========================================================

  document
    .getElementById(
      "dropSpeedInput"
    )
    .addEventListener(
      "change",
      function (e) {

        state.dropInterval =
          clampDropInterval(
            e.target.value
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
  // 重複モード
  // =========================================================

  document
    .getElementById(
      "duplicateModeInput"
    )
    .addEventListener(
      "change",
      function (e) {

        state.duplicateMode =
          e.target.value ===
          "deny"
            ? "deny"
            : "allow";


        if (
          state.duplicateMode
          ===
          "deny"
        ) {

          var currentStore =
            state.storeName;


          // 現在の店で既に登録されている
          // 名前を重複判定へ反映
          state.registeredItems =
            state.log

              .filter(
                function (entry) {

                  return (
                    !entry.store ||
                    entry.store ===
                    currentStore
                  );

                }
              )

              .map(
                function (entry) {

                  return normalizeItemName(
                    entry.name || ""
                  );

                }
              )

              .filter(Boolean);


          state.registeredItems =
            unique(
              state.registeredItems
            );


          setStatus(
            "重複NGに変更しました。現在の店ですでに登録済みの名前は登録できません。"
          );

        } else {

          setStatus(
            "重複OKに変更しました。"
          );

        }


        save();

        render();

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

        // ミノを出した時点で
        // ストック消費は確定している
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
  // リセット
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
  // テーマ
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


        var cur =
          root.getAttribute(
            "data-theme"
          );


        var next =
          cur === "light"
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

      var savedTheme =
        localStorage.getItem(
          "izakaya_tetris_theme"
        );


      if (
        savedTheme === "light" ||
        savedTheme === "dark"
      ) {

        document
          .documentElement
          .setAttribute(
            "data-theme",
            savedTheme
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


    if (
      !Array.isArray(
        state.registeredItems
      )
    ) {

      state.registeredItems =
        [];

    }


    if (
      !state.storeName
    ) {

      state.storeName =
        "最初の店";

    }


    state.dropInterval =
      clampDropInterval(
        state.dropInterval
      );


    if (
      !state.duplicateMode
    ) {

      state.duplicateMode =
        "allow";

    }


    render();


    requestAnimationFrame(
      loop
    );
  }


  boot();

})();
