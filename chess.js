// Chess piece glyphs by color and type.
const GLYPHS = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

// Starting arrangement of the back rank.
const BACK_RANK = ["r", "n", "b", "q", "k", "b", "n", "r"];

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetEl = document.getElementById("reset");

let board = [];       // 8x8 array; each cell is null or { color, type }
let turn = "w";       // "w" or "b"
let selected = null;  // { row, col } of the currently selected piece
let legalMoves = [];  // list of { row, col } the selected piece may move to
let gameOver = false;

// Build the initial position.
function setupBoard() {
  board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { color: "b", type: BACK_RANK[c] };
    board[1][c] = { color: "b", type: "p" };
    board[6][c] = { color: "w", type: "p" };
    board[7][c] = { color: "w", type: BACK_RANK[c] };
  }
  turn = "w";
  selected = null;
  legalMoves = [];
  gameOver = false;
}

const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

// Slide along the given directions until blocked; captures stop the slide.
function slidingMoves(r, c, color, dirs) {
  const moves = [];
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const target = board[nr][nc];
      if (!target) {
        moves.push({ row: nr, col: nc });
      } else {
        if (target.color !== color) moves.push({ row: nr, col: nc });
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

// Step moves for knight/king: single hops to fixed offsets.
function stepMoves(r, c, color, offsets) {
  const moves = [];
  for (const [dr, dc] of offsets) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc].color !== color)) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

// Pseudo-legal moves for a pawn (no en passant).
function pawnMoves(r, c, color) {
  const moves = [];
  const dir = color === "w" ? -1 : 1;
  const startRow = color === "w" ? 6 : 1;
  // Forward one.
  if (inBounds(r + dir, c) && !board[r + dir][c]) {
    moves.push({ row: r + dir, col: c });
    // Forward two from the starting rank.
    if (r === startRow && !board[r + 2 * dir][c]) {
      moves.push({ row: r + 2 * dir, col: c });
    }
  }
  // Diagonal captures.
  for (const dc of [-1, 1]) {
    const nr = r + dir, nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc].color !== color) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

// All pseudo-legal moves for the piece at (r, c).
function movesFor(r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const { color, type } = piece;
  const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const straights = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  switch (type) {
    case "p": return pawnMoves(r, c, color);
    case "n": return stepMoves(r, c, color, [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
    ]);
    case "b": return slidingMoves(r, c, color, diagonals);
    case "r": return slidingMoves(r, c, color, straights);
    case "q": return slidingMoves(r, c, color, [...diagonals, ...straights]);
    case "k": return stepMoves(r, c, color, [...diagonals, ...straights]);
    default: return [];
  }
}

// Render the board state into the DOM.
function render() {
  boardEl.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement("div");
      sq.className = "square " + ((r + c) % 2 === 0 ? "light" : "dark");
      sq.dataset.row = r;
      sq.dataset.col = c;
      const piece = board[r][c];
      if (piece) sq.textContent = GLYPHS[piece.color][piece.type];
      if (selected && selected.row === r && selected.col === c) {
        sq.classList.add("selected");
      }
      if (legalMoves.some((m) => m.row === r && m.col === c)) {
        sq.classList.add("legal");
        if (piece) sq.classList.add("occupied");
      }
      sq.addEventListener("click", () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }
}

// Handle a click on the square at (r, c).
function onSquareClick(r, c) {
  if (gameOver) return;
  const piece = board[r][c];

  // Completing a move to a highlighted square.
  if (selected && legalMoves.some((m) => m.row === r && m.col === c)) {
    movePiece(selected.row, selected.col, r, c);
    return;
  }

  // Selecting one of your own pieces.
  if (piece && piece.color === turn) {
    selected = { row: r, col: c };
    legalMoves = movesFor(r, c);
  } else {
    selected = null;
    legalMoves = [];
  }
  render();
}

// Move a piece and advance the turn.
function movePiece(fromR, fromC, toR, toC) {
  const captured = board[toR][toC];
  const piece = board[fromR][fromC];
  board[toR][toC] = piece;
  board[fromR][fromC] = null;

  // Auto-promote pawns reaching the far rank.
  if (piece.type === "p" && (toR === 0 || toR === 7)) {
    piece.type = "q";
  }

  selected = null;
  legalMoves = [];

  // Capturing a king ends the game.
  if (captured && captured.type === "k") {
    gameOver = true;
    render();
    statusEl.textContent = (turn === "w" ? "White" : "Black") + " wins!";
    return;
  }

  turn = turn === "w" ? "b" : "w";
  render();
  statusEl.textContent = (turn === "w" ? "White" : "Black") + " to move";
}

resetEl.addEventListener("click", () => {
  setupBoard();
  render();
  statusEl.textContent = "White to move";
});

setupBoard();
render();
statusEl.textContent = "White to move";
