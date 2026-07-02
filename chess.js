// Filled glyphs (U+265A–265F) for both sides; white outline glyphs render hollow in most fonts.
const GLYPHS = {
  w: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

// Starting arrangement of the back rank.
const BACK_RANK = ["r", "n", "b", "q", "k", "b", "n", "r"];

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetEl = document.getElementById("reset");
const themeToggleEl = document.getElementById("theme-toggle");
const moveListEl = document.getElementById("move-list");
const THEME_KEY = "chess-theme";

const PIECE_NAMES = { k: "K", q: "Q", r: "R", b: "B", n: "N", p: "" };

let board = [];       // 8x8 array; each cell is null or { color, type }
let turn = "w";       // "w" or "b"
let selected = null;  // { row, col } of the currently selected piece
let legalMoves = [];  // list of { row, col } the selected piece may move to
let moveHistory = []; // list of { color, notation }
let lastMove = null;  // { toR, toC } for landing animation
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
  moveHistory = [];
  gameOver = false;
}

const squareName = (r, c) => "abcdefgh"[c] + (8 - r);

function formatMove(fromR, fromC, toR, toC, piece, captured, promoted) {
  const to = squareName(toR, toC);
  if (piece.type === "p") {
    const move = captured ? squareName(fromR, fromC)[0] + "x" + to : to;
    return promoted ? move + "=Q" : move;
  }
  return PIECE_NAMES[piece.type] + (captured ? "x" : "") + to;
}

function renderMoveHistory() {
  if (moveHistory.length === 0) {
    moveListEl.innerHTML = '<p class="move-empty">No moves yet</p>';
    return;
  }

  const rows = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const white = moveHistory[i].notation;
    const black = moveHistory[i + 1]?.notation || "";
    rows.push(
      '<div class="move-row">' +
        '<span class="move-num">' + moveNum + ".</span>" +
        '<span class="move-white">' + white + "</span>" +
        '<span class="move-black">' + black + "</span>" +
      "</div>"
    );
  }
  moveListEl.innerHTML = rows.join("");
  moveListEl.scrollTop = moveListEl.scrollHeight;
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
  const landedMove = lastMove;
  lastMove = null;
  boardEl.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement("div");
      sq.className = "square " + ((r + c) % 2 === 0 ? "light" : "dark");
      sq.dataset.row = r;
      sq.dataset.col = c;
      sq.setAttribute("aria-label", squareName(r, c));
      const squareTone = (r + c) % 2 === 0 ? "light" : "dark";

      const rankLabel = document.createElement("span");
      rankLabel.className = "coord coord-rank";
      rankLabel.textContent = 8 - r;
      sq.appendChild(rankLabel);

      const fileLabel = document.createElement("span");
      fileLabel.className = "coord coord-file";
      fileLabel.textContent = "abcdefgh"[c];
      sq.appendChild(fileLabel);

      const piece = board[r][c];
      if (piece) {
        const glyph = document.createElement("span");
        glyph.className = "piece piece-" + piece.color + " on-" + squareTone;
        glyph.textContent = GLYPHS[piece.color][piece.type];
        glyph.style.animationDelay = ((r * 8 + c) * 0.07) + "s";
        if (landedMove && landedMove.toR === r && landedMove.toC === c) {
          glyph.classList.add("piece-landed");
        }
        sq.appendChild(glyph);
      }
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
  const promoted = piece.type === "p" && (toR === 0 || toR === 7);
  const movingColor = turn;

  moveHistory.push({
    color: movingColor,
    notation: formatMove(fromR, fromC, toR, toC, piece, captured, promoted),
  });

  board[toR][toC] = piece;
  board[fromR][fromC] = null;

  if (promoted) {
    piece.type = "q";
  }

  lastMove = { toR, toC };
  selected = null;
  legalMoves = [];

  renderMoveHistory();

  // Capturing a king ends the game.
  if (captured && captured.type === "k") {
    gameOver = true;
    render();
    statusEl.textContent = (movingColor === "w" ? "White" : "Black") + " wins!";
    return;
  }

  turn = turn === "w" ? "b" : "w";
  render();
  statusEl.textContent = (turn === "w" ? "White" : "Black") + " to move";
}

resetEl.addEventListener("click", () => {
  setupBoard();
  render();
  renderMoveHistory();
  statusEl.textContent = "White to move";
});

function applyTheme(theme) {
  document.body.classList.remove("theme-green", "theme-purple");
  document.body.classList.add(theme === "purple" ? "theme-purple" : "theme-green");
  themeToggleEl.textContent = theme === "purple" ? "Green Theme" : "Purple Theme";
  localStorage.setItem(THEME_KEY, theme);
}

themeToggleEl.addEventListener("click", () => {
  const next = document.body.classList.contains("theme-purple") ? "green" : "purple";
  applyTheme(next);
});

applyTheme(localStorage.getItem(THEME_KEY) === "green" ? "green" : "purple");
setupBoard();
render();
renderMoveHistory();
statusEl.textContent = "White to move";
