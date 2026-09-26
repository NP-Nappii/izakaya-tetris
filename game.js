const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

// 盤面データ (12列 x 20行)
const board = Array.from({ length: 20 }, () => Array(12).fill(0));

// テトリミノの形状定義
const PIECES = [
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[0, 1, 0], [1, 1, 1]], // T
  [[1, 0, 0], [1, 1, 1]], // L
  [[0, 0, 1], [1, 1, 1]], // J
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]]  // Z
];

let stock = 0;
let currentPiece = null;
let piecePos = { x: 0, y: 0 };

// 完食ボタンの処理
document.getElementById('eatBtn').addEventListener('click', () => {
  stock++;
  updateStockDisplay();
  if (!currentPiece) spawnPiece();
});

function updateStockDisplay() {
  document.getElementById('stockCount').innerText = stock;
}

// 新しいブロックの生成
function spawnPiece() {
  if (stock <= 0) return;
  const type = Math.floor(Math.random() * PIECES.length);
  currentPiece = PIECES[type];
  piecePos = { x: 4, y: 0 };
  draw();
}

// 衝突判定
function collide(b, p, offset) {
  for (let y = 0; y < p.length; ++y) {
    for (let x = 0; x < p[y].length; ++x) {
      if (p[y][x] !== 0 && (b[y + offset.y] && b[y + offset.y][x + offset.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

// 描画処理
function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // 設置済みブロックの描画
  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = '#888';
        context.fillRect(x, y, 1, 1);
      }
    });
  });

  // 操作中ブロックの描画
  if (currentPiece) {
    context.fillStyle = '#ffca28';
    currentPiece.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          context.fillRect(x + piecePos.x, y + piecePos.y, 1, 1);
        }
      });
    });
  }
}

// 固着＆ライン消去
function merge() {
  currentPiece.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        board[y + piecePos.y][x + piecePos.x] = 1;
      }
    });
  });

  // ライン判定
  for (let y = board.length - 1; y >= 0; --y) {
    if (board[y].every(value => value !== 0)) {
      board.splice(y, 1);
      board.unshift(Array(12).fill(0));
      y++;
    }
  }
}

// ボタン操作
document.getElementById('leftBtn').addEventListener('click', () => {
  if (!currentPiece) return;
  piecePos.x--;
  if (collide(board, currentPiece, piecePos)) piecePos.x++;
  draw();
});

document.getElementById('rightBtn').addEventListener('click', () => {
  if (!currentPiece) return;
  piecePos.x++;
  if (collide(board, currentPiece, piecePos)) piecePos.x--;
  draw();
});

document.getElementById('rotateBtn').addEventListener('click', () => {
  if (!currentPiece) return;
  const rotated = currentPiece[0].map((_, i) => currentPiece.map(row => row[i]).reverse());
  if (!collide(board, rotated, piecePos)) {
    currentPiece = rotated;
    draw();
  }
});

document.getElementById('dropBtn').addEventListener('click', () => {
  if (!currentPiece || stock <= 0) return;

  // 真下まで落とす
  while (!collide(board, currentPiece, { x: piecePos.x, y: piecePos.y + 1 })) {
    piecePos.y++;
  }
  
  merge();
  stock--;
  currentPiece = null;
  updateStockDisplay();
  
  if (stock > 0) {
    spawnPiece();
  } else {
    draw();
  }
});

draw();
