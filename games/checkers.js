// American/English checkers (draughts) on an 8x8 board, as a Game module
// implementing the shared interface (see games/interface.md).
//
// Rules (ADR-0006): pieces live on dark squares, 12 per side. Men move/capture one
// square diagonally forward only; kings move/capture one square diagonally in any
// direction (non-flying). A man reaching the far row is promoted to king and its
// turn ends immediately (no post-promotion jump). Captures are mandatory: if any
// jump is available for the side to move, only jumps are legal, and a multi-jump
// must continue until the moving piece has no further jump (signalled to the shell
// via `continuation`). A side with no pieces or no legal move loses.

// Draughts glyphs: white man/king (U+26C0/26C1), black man/king (U+26C2/26C3).
const GLYPHS = {
  w: { m: "⛀", k: "⛁" },
  b: { m: "⛂", k: "⛃" },
};

const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const other = (color) => (color === "w" ? "b" : "w");

// Diagonal directions a piece may move/capture in.
function directionsFor(piece) {
  if (piece.type === "k") return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  // Men move "forward": white up the board (decreasing row), black down.
  return piece.color === "w" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

// Non-capturing moves for the piece at (r, c).
function simpleMovesFor(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];
  for (const [dr, dc] of directionsFor(piece)) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && !board[nr][nc]) moves.push({ row: nr, col: nc });
  }
  return moves;
}

// Capturing (jump) moves for the piece at (r, c): jump an adjacent opponent into
// the empty square beyond it.
function captureMovesFor(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];
  for (const [dr, dc] of directionsFor(piece)) {
    const mr = r + dr, mc = c + dc;        // the jumped square
    const lr = r + 2 * dr, lc = c + 2 * dc; // the landing square
    if (
      inBounds(lr, lc) &&
      !board[lr][lc] &&
      board[mr] && board[mr][mc] &&
      board[mr][mc].color === other(piece.color)
    ) {
      moves.push({ row: lr, col: lc });
    }
  }
  return moves;
}

// Does the given side have any capture available anywhere on the board?
function sideHasCapture(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && captureMovesFor(board, r, c).length) return true;
    }
  }
  return false;
}

function sideHasAnyMove(board, color) {
  if (sideHasCapture(board, color)) return true;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && simpleMovesFor(board, r, c).length) return true;
    }
  }
  return false;
}

// Standard 1..32 numbering of the dark squares (row 0: 1-4, row 1: 5-8, ...).
function squareNumber(r, c) {
  return r * 4 + Math.floor(c / 2) + 1;
}

// Row a man of `color` promotes on.
const promotionRow = (color) => (color === "w" ? 0 : 7);

export const checkers = {
  id: "checkers",
  label: "Checkers",
  boardSize: 8,
  colors: { w: "White", b: "Black" },

  setup() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 1) continue; // pieces only on dark squares
        if (r < 3) board[r][c] = { color: "b", type: "m" };
        else if (r > 4) board[r][c] = { color: "w", type: "m" };
      }
    }
    return board;
  },

  legalMoves(board, r, c, ctx) {
    const piece = board[r][c];
    if (!piece || piece.color !== ctx.turn) return [];
    // Mandatory capture: if any jump exists for the side to move, only jumps are
    // legal (and only for pieces that can jump).
    if (sideHasCapture(board, ctx.turn)) return captureMovesFor(board, r, c);
    return simpleMovesFor(board, r, c);
  },

  applyMove(board, from, to) {
    const piece = board[from.row][from.col];
    const isJump = Math.abs(to.row - from.row) === 2;

    let captured = null;
    if (isJump) {
      const mr = (from.row + to.row) / 2;
      const mc = (from.col + to.col) / 2;
      captured = board[mr][mc];
      board[mr][mc] = null;
    }

    board[to.row][to.col] = piece;
    board[from.row][from.col] = null;

    // Promotion: a man reaching the far row becomes a king; the turn then ends.
    let promoted = false;
    if (piece.type === "m" && to.row === promotionRow(piece.color)) {
      piece.type = "k";
      promoted = true;
    }

    // A multi-jump must continue with the same piece, unless it just promoted.
    let continuation = null;
    if (isJump && !promoted && captureMovesFor(board, to.row, to.col).length) {
      continuation = { row: to.row, col: to.col };
    }

    const sep = isJump ? "x" : "-";
    const notation = squareNumber(from.row, from.col) + sep + squareNumber(to.row, to.col);

    return { captured, promoted, notation, continuation };
  },

  // The side to move (ctx.turn) loses if it has no pieces or no legal move.
  isTerminal(board, ctx) {
    const side = ctx.turn;
    if (!sideHasAnyMove(board, side)) return { over: true, winner: other(side) };
    return null;
  },

  glyphFor(piece) {
    return GLYPHS[piece.color][piece.type];
  },

  // Score panel: pieces each side has captured, with a count.
  renderScore(el, board, capturedPieces) {
    const rowFor = (color) => {
      const label = this.colors[color];
      const foe = other(color);
      const taken = capturedPieces[color];
      const cells = taken.length
        ? taken.map((t) => '<span class="score-piece piece-' + foe + '">' + GLYPHS[foe][t] + "</span>").join("")
        : '<span class="score-none">—</span>';
      return (
        '<div class="score-row">' +
          '<span class="score-side">' + label + "</span>" +
          '<span class="score-captured">' + cells + "</span>" +
          '<span class="score-points">' + taken.length + "</span>" +
        "</div>"
      );
    };
    el.innerHTML = rowFor("w") + rowFor("b");
  },
};
