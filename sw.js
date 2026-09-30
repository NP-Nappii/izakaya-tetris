:root {
  --bg: #17100c;
  --bg-panel: #241914;
  --bg-panel-2: #302119;
  --paper: #f4ead8;
  --paper-dim: #cbbda4;
  --lantern: #e85a32;
  --lantern-dim: #a94429;
  --gold: #d7ad5b;
  --jade: #4f9b7f;
  --line: rgba(244, 234, 216, .14);
  --danger: #d9483a;
  --board-empty: #211711;
  --board-grid: rgba(244, 234, 216, .065);
  --shadow: rgba(0, 0, 0, .52);
}

:root[data-theme="light"] {
  --bg: #eee5d6;
  --bg-panel: #fffdfa;
  --bg-panel-2: #f3eadb;
  --paper: #2d2118;
  --paper-dim: #6e614f;
  --line: rgba(45, 33, 24, .14);
  --board-empty: #e6dbc9;
  --board-grid: rgba(45, 33, 24, .08);
  --shadow: rgba(50, 35, 20, .18);
  color-scheme: light;
}

:root:not([data-theme="light"]) { color-scheme: dark; }

* { box-sizing: border-box; }

html,
body {
  margin: 0;
  min-height: 100%;
}

html {
  scroll-padding-top: 16px;
  -webkit-text-size-adjust: 100%;
  touch-action: manipulation;
}

body {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--bg);
  color: var(--paper);
  font-family: "Hiragino Sans", "Yu Gothic", "Segoe UI", system-ui, -apple-system, sans-serif;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  overscroll-behavior-y: contain;
  touch-action: manipulation;
}

button,
input,
select,
canvas {
  touch-action: manipulation;
}

button,
input,
select { font: inherit; }

button { -webkit-tap-highlight-color: transparent; }

body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  background:
    radial-gradient(circle at 13% 3%, rgba(246, 170, 70, .16) 0 2%, transparent 14%),
    radial-gradient(circle at 87% 5%, rgba(240, 102, 53, .13) 0 2%, transparent 13%),
    radial-gradient(circle at 50% 100%, rgba(130, 76, 33, .10), transparent 42%),
    repeating-linear-gradient(90deg, rgba(255,255,255,.018) 0 2px, transparent 2px 44px),
    repeating-linear-gradient(0deg, rgba(0,0,0,.035) 0 2px, transparent 2px 32px),
    linear-gradient(180deg, #21140f 0%, #17100c 52%, #130d0a 100%);
}

:root[data-theme="light"] body::before {
  background:
    radial-gradient(circle at 13% 3%, rgba(214,136,46,.12) 0 2%, transparent 14%),
    radial-gradient(circle at 87% 5%, rgba(200,81,41,.08) 0 2%, transparent 13%),
    repeating-linear-gradient(90deg, rgba(85,50,20,.025) 0 2px, transparent 2px 44px),
    linear-gradient(180deg, #f5eddf 0%, #eee5d6 100%);
}

body::after {
  content: "";
  position: fixed;
  top: 0;
  left: 50%;
  width: 240px;
  height: 100vh;
  transform: translateX(-50%);
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,231,181,.03), transparent);
}

.wrap {
  width: min(1100px, calc(100% - 24px));
  margin: 0 auto;
  padding: 18px 0 28px;
}

.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.title-kana {
  font-size: 11px;
  letter-spacing: .18em;
  color: var(--lantern);
  font-weight: 800;
  margin-bottom: 2px;
}

.title-block h1 {
  margin: 0;
  font-size: clamp(24px, 4vw, 34px);
  line-height: 1.15;
}

.title-block p {
  max-width: 760px;
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--paper-dim);
  line-height: 1.55;
}

.top-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 7px;
}

.theme-toggle,
.pause-btn {
  min-height: 44px;
  border: 1px solid var(--line);
  background: var(--bg-panel);
  color: var(--paper);
  border-radius: 999px;
  padding: 7px 13px;
  cursor: pointer;
  white-space: nowrap;
}

.pause-btn {
  border-color: rgba(215,173,91,.42);
  color: var(--gold);
}

.pause-btn:active,
.theme-toggle:active { transform: translateY(1px); }

.pause-badge {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(232,90,50,.12);
  border: 1px solid rgba(232,90,50,.35);
  color: var(--lantern);
  font-size: 12px;
  font-weight: 800;
}

.hidden { display: none !important; }

.layout {
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.board-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 11px;
  position: sticky;
  top: 12px;
}

.board-frame {
  width: 100%;
  max-width: 300px;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--bg-panel);
  box-shadow: 0 12px 30px var(--shadow);
  scroll-margin-top: 16px;
}

#board {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
  background: var(--board-empty);
}

.controls {
  width: 100%;
  max-width: 300px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.ctrl-btn {
  min-height: 48px;
  padding: 10px 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg-panel-2);
  color: var(--paper);
  font-size: 18px;
  cursor: pointer;
}

.ctrl-btn:active { background: var(--lantern-dim); }

.ctrl-btn:disabled {
  opacity: .3;
  cursor: not-allowed;
}

.status-line {
  width: 100%;
  min-height: 42px;
  padding: 7px 9px;
  text-align: center;
  font-size: 13px;
  color: var(--paper-dim);
  line-height: 1.45;
  border-radius: 9px;
  background: color-mix(in srgb, var(--bg-panel) 85%, transparent);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  padding: 15px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-panel) 93%, #2a160f 7%);
  box-shadow: 0 8px 24px rgba(0,0,0,.10);
}

.card h2 {
  margin: 0 0 11px;
  color: var(--gold);
  font-size: 14px;
  font-weight: 800;
}

.stock-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.stock-count {
  font-size: 31px;
  font-weight: 900;
  line-height: 1;
}

.stock-count .unit {
  margin-left: 4px;
  color: var(--paper-dim);
  font-size: 13px;
  font-weight: 400;
}

.spawn-btn {
  min-height: 50px;
  flex-shrink: 0;
  border: 0;
  border-radius: 10px;
  padding: 12px 18px;
  background: var(--lantern);
  color: #241109;
  font-size: 14.5px;
  font-weight: 800;
  cursor: pointer;
}

.spawn-btn:disabled {
  background: var(--bg-panel-2);
  opacity: .35;
  cursor: not-allowed;
}

.stock-hint,
.setting-note {
  color: var(--paper-dim);
  font-size: 11.5px;
  line-height: 1.6;
}

.exclude-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: 13px;
  margin-bottom: 7px;
  font-size: 12.5px;
  font-weight: 800;
}

.exclude-note {
  color: var(--paper-dim);
  font-size: 11px;
  font-weight: 600;
}

/* 除外候補：小さく固定し、状態変更で一切レイアウトを動かさない */
.chip-grid {
  width: min(100%, 330px);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  margin: 8px 0 9px;
}

.chip {
  position: relative;
  width: 100%;
  height: 58px;
  min-width: 0;
  padding: 4px 3px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg-panel-2);
  color: var(--chip-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  overflow: hidden;
  transition: opacity .12s, background .12s, border-color .12s, transform .12s;
}

.chip:not(:disabled):active { transform: translateY(1px); }

.chip-excluded {
  background: transparent;
  border: 1.5px solid var(--chip-color);
  color: var(--chip-color);
}

/* 状態表示は固定位置の×だけ。文字は増やさない。 */
.chip-excluded::after {
  content: "×";
  position: absolute;
  top: 2px;
  right: 3px;
  width: 13px;
  height: 13px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--chip-color);
  color: #21140f;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
}

.chip:disabled:not(.chip-excluded) { opacity: .34; cursor: not-allowed; }
.chip-excluded:not(:disabled) { opacity: 1; }
.chip-excluded:disabled { opacity: .48; cursor: not-allowed; }

.mino-preview {
  display: grid;
  justify-content: center;
  align-content: center;
  gap: 2px;
  min-height: 18px;
}

.mino-cell {
  width: 8px;
  height: 8px;
  border-radius: 1.5px;
  flex: 0 0 auto;
}

.mino-label {
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: .03em;
}

.special-preview {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  font-size: 27px;
  font-weight: 900;
  line-height: 1;
}

.chip-special .mino-label { font-size: 12px; }

.current-store-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 13px;
}

.store-caption {
  color: var(--paper-dim);
  font-size: 10.5px;
}

.store-name {
  margin-top: 2px;
  font-size: 15px;
  font-weight: 900;
}

.store-btn,
.btn {
  min-height: 44px;
  border-radius: 9px;
  padding: 9px 12px;
  font-weight: 800;
  cursor: pointer;
}

.store-btn {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--paper);
}

.category-form {
  display: grid;
  grid-template-columns: auto minmax(0,1fr);
  gap: 7px;
  margin-top: 10px;
}

.category-label {
  display: flex;
  align-items: center;
  min-width: 82px;
  font-size: 12px;
  font-weight: 900;
}

.category-form input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--board-empty);
  color: var(--paper);
  padding: 8px 10px;
  font-size: 16px;
}

.category-form .btn { grid-column: 2; }


/* 定番メニュー：タップすると入力欄へセットするクイック入力 */
.preset-menu {
  margin-top: 9px;
  border: 1px dashed var(--line);
  border-radius: 9px;
  background: color-mix(in srgb, var(--bg-panel-2) 72%, transparent);
  overflow: hidden;
}

.preset-menu summary {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  color: var(--paper);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  list-style: none;
}

.preset-menu summary::-webkit-details-marker { display: none; }
.preset-menu summary::after {
  content: "＋";
  color: var(--paper-dim);
  font-size: 16px;
  line-height: 1;
}
.preset-menu[open] summary::after { content: "－"; }

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
  max-height: 250px;
  overflow-y: auto;
  padding: 0 7px 7px;
}

.preset-btn {
  min-width: 0;
  min-height: 37px;
  padding: 5px 5px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--board-empty);
  color: var(--paper);
  font-size: 11.5px;
  font-weight: 800;
  line-height: 1.15;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-btn:active:not(:disabled) { transform: translateY(1px); }

.food-preset {
  border-color: rgba(215,173,91,.40);
}

.drink-preset {
  border-color: rgba(79,155,127,.42);
}

.preset-btn:disabled {
  opacity: .32;
  cursor: not-allowed;
}

.food-btn {
  background: var(--gold);
  border: 1px solid var(--gold);
  color: #21140f;
}

.drink-btn {
  background: var(--jade);
  border: 1px solid var(--jade);
  color: #0d1f19;
}

.btn:disabled,
.store-btn:disabled {
  opacity: .35;
  cursor: not-allowed;
}

.duplicate-note {
  margin-top: 10px;
  color: var(--paper-dim);
  font-size: 11px;
  line-height: 1.5;
}

.log-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.log-list li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 12px;
}

.log-list li .name { word-break: break-word; }
.log-list li .meta { color: var(--paper-dim); white-space: nowrap; font-size: 10.5px; }

.setting-row {
  min-height: 43px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13.5px;
  padding: 5px 0;
}

.setting-row + .setting-row {
  margin-top: 5px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}

.setting-row-stack > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-row small {
  color: var(--paper-dim);
  font-size: 11px;
  line-height: 1.35;
}

.number-input,
.select-input {
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--board-empty);
  color: var(--paper);
  padding: 7px 8px;
  font-size: 16px;
}

.number-input { width: 64px; text-align: center; }
.select-input { min-width: 136px; }

.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 54px;
  min-height: 34px;
  cursor: pointer;
}

.switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-track {
  position: relative;
  width: 54px;
  height: 30px;
  border-radius: 999px;
  background: var(--bg-panel-2);
  border: 1px solid var(--line);
  transition: background .15s, border-color .15s;
}

.switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--paper-dim);
  transition: transform .15s, background .15s;
}

.switch input:checked + .switch-track {
  background: rgba(232,90,50,.30);
  border-color: rgba(232,90,50,.58);
}

.switch input:checked + .switch-track .switch-thumb {
  transform: translateX(24px);
  background: var(--lantern);
}

.giveup-btn,
.reset-btn {
  width: 100%;
  min-height: 46px;
  border-radius: 8px;
  padding: 9px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.giveup-btn {
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
}

.giveup-btn:hover:not(:disabled) { background: rgba(217,72,58,.12); }

.giveup-btn:disabled,
.reset-btn:disabled {
  opacity: .35;
  cursor: not-allowed;
}

.reset-btn {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--paper-dim);
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(10,7,5,.74);
}

.overlay.show { display: flex; }

.modal {
  width: min(410px, 100%);
  max-height: min(92vh, 740px);
  overflow-y: auto;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--bg-panel);
  box-shadow: 0 20px 50px var(--shadow);
  text-align: center;
}

.modal h3 {
  margin: 0 0 8px;
  font-size: 20px;
}

.modal p {
  margin: 0 0 14px;
  color: var(--paper-dim);
  font-size: 13px;
  line-height: 1.6;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 13px;
}

.modal-btn,
.modal-secondary {
  width: 100%;
  min-height: 46px;
  margin-top: 12px;
  border-radius: 9px;
  padding: 10px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.modal-btn {
  border: 0;
  background: var(--lantern);
  color: #241109;
}

.modal-btn:disabled {
  opacity: .35;
  cursor: not-allowed;
}

.modal-secondary {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--paper-dim);
}

.choice-modal {
  /* 自由選択はポップアップ内もページ側もスクロールさせない */
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: min(410px, calc(100vw - 24px));
  max-height: calc(100dvh - 20px);
  padding: 12px;
}

.choice-modal h3 {
  margin: 0 0 4px;
  font-size: 18px;
  line-height: 1.2;
}

.choice-modal > p {
  margin: 0 0 7px;
  font-size: 11.5px;
  line-height: 1.35;
}

.choice-content {
  flex: 0 0 auto;
  min-height: 0;
  overflow: hidden;
}

.choice-actions {
  flex: 0 0 auto;
  padding-top: 4px;
  background: var(--bg-panel);
}

.choice-actions .modal-btn,
.choice-actions .modal-secondary {
  margin-top: 5px;
  min-height: 40px;
  padding: 7px 9px;
  font-size: 13px;
}

.choice-board-wrap {
  width: 150px;
  max-width: 100%;
  margin: 0 auto 6px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--board-empty);
  overflow: hidden;
}

#choiceBoardPreview {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 3px;
}

.selected-choice-text {
  min-height: 18px;
  margin-bottom: 3px;
  color: var(--gold);
  font-size: 11.5px;
  font-weight: 800;
  line-height: 1.25;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  margin: 3px 0 0;
}

.choice-piece {
  min-width: 0;
  min-height: 62px;
  padding: 4px 2px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--board-empty);
  color: var(--paper);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
}

.choice-piece .mino-preview {
  gap: 1px;
}

.choice-piece .mino-cell {
  width: 6px;
  height: 6px;
  border-radius: 1px;
}

.choice-piece.selected {
  border: 2px solid var(--gold);
  background: var(--bg-panel-2);
}

.choice-label {
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
}

/* 高さの低い端末でも全要素を画面内に収める */
@media (max-height: 650px) {
  .choice-modal {
    padding: 9px;
  }

  .choice-modal > p {
    margin-bottom: 4px;
    font-size: 10.5px;
  }

  .choice-board-wrap {
    width: 125px;
    margin-bottom: 4px;
  }

  .selected-choice-text {
    min-height: 16px;
    font-size: 10.5px;
  }

  .choice-piece {
    min-height: 55px;
    padding-top: 3px;
    padding-bottom: 3px;
  }

  .choice-piece .mino-cell {
    width: 5px;
    height: 5px;
  }

  .choice-label {
    font-size: 10px;
  }

  .choice-actions .modal-btn,
  .choice-actions .modal-secondary {
    min-height: 36px;
    margin-top: 4px;
    padding: 6px 8px;
    font-size: 12px;
  }
}

@media (max-height: 520px) {
  .choice-modal {
    width: min(390px, calc(100vw - 14px));
    padding: 6px;
  }

  .choice-modal h3 {
    font-size: 16px;
  }

  .choice-modal > p {
    display: none;
  }

  .choice-board-wrap {
    width: 105px;
  }

  .choice-piece {
    min-height: 50px;
  }

  .choice-actions .modal-btn,
  .choice-actions .modal-secondary {
    min-height: 34px;
    margin-top: 3px;
    padding: 5px 7px;
  }
}

/* 横画面：縦画面より盤面を大きくし、右側パネルとのバランスを取る */
@media (orientation: landscape) and (min-width: 851px) {
  .wrap {
    width: min(1180px, calc(100% - 24px));
  }

  .layout {
    grid-template-columns: minmax(360px, 400px) minmax(0, 1fr);
    gap: 24px;
  }

  .board-col {
    position: sticky;
    top: 10px;
  }

  .board-frame,
  .controls {
    max-width: 390px;
  }

  .board-frame {
    padding: 10px;
  }

  .controls {
    gap: 9px;
  }

  .ctrl-btn {
    min-height: 50px;
    font-size: 19px;
  }

  .status-line {
    max-width: 390px;
  }

  .panel {
    gap: 14px;
  }
}

@media (max-width: 850px) {
  .layout { grid-template-columns: 1fr; }
  .board-col { position: static; }
  .board-frame, .controls { max-width: 430px; }
}

@media (orientation: landscape) and (max-width: 850px) {
  .wrap {
    width: min(100% - 14px, 1100px);
  }

  .board-frame,
  .controls,
  .status-line {
    max-width: min(78vw, 500px);
  }

  .board-frame {
    padding: 8px;
  }

  .ctrl-btn {
    min-height: 46px;
  }
}

@media (max-width: 560px) {
  .wrap { width: min(100% - 14px, 1100px); padding-top: 12px; }
  .top { flex-direction: column; }
  .top-actions { width: 100%; justify-content: flex-start; }
  .chip-grid { gap: 5px; }
  .chip { height: 56px; }
  .choice-grid { grid-template-columns: repeat(4, 1fr); }
  .category-form { grid-template-columns: 1fr; }
  .category-form .btn { grid-column: auto; }
  .category-label { min-height: 26px; }

  .preset-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .preset-btn { min-height: 36px; font-size: 11px; }
}

@media (max-width: 380px) {
  .chip-grid { width: 100%; gap: 4px; }
  .chip { height: 54px; }
  .mino-cell { width: 7px; height: 7px; }
  .mino-label { font-size: 11px; }
  .preset-grid { gap: 4px; padding-left: 6px; padding-right: 6px; }
  .preset-btn { min-height: 34px; padding-left: 3px; padding-right: 3px; }
}
