// Chess rules, packaged as a Game module implementing the shared interface
// (see games/interface.md). Behavior is preserved from the original single-file
// implementation: pseudo-legal move generation (no check/checkmate), king capture
// ends the game, pawns auto-promote to queen, and there is no castling or en passant.

// Filled glyphs (U+265A–265F) for both sides; white outline glyphs render hollow.
const GLYPHS_FILLED = {
  w: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

const GLYPHS_OUTLINE = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

// Piece skins that render with the outline glyph set; all others use filled.
const OUTLINE_SKINS = new Set(["outline", "ivory", "emerald"]);

// Starting arrangement of the back rank.
const BACK_RANK = ["r", "n", "b", "q", "k", "b", "n", "r"];

const PIECE_NAMES = { k: "K", q: "Q", r: "R", b: "B", n: "N", p: "" };

// Standard material values used for the score table.
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const squareName = (r, c) => "abcdefgh"[c] + (8 - r);

function glyphSetFor(pieceSkin) {
  return OUTLINE_SKINS.has(pieceSkin) ? GLYPHS_OUTLINE : GLYPHS_FILLED;
}

// Slide along the given directions until blocked; captures stop the slide.
function slidingMoves(board, r, c, color, dirs) {
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
function stepMoves(board, r, c, color, offsets) {
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
function pawnMoves(board, r, c, color) {
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
function movesFor(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const { color, type } = piece;
  const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const straights = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  switch (type) {
    case "p": return pawnMoves(board, r, c, color);
    case "n": return stepMoves(board, r, c, color, [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
    ]);
    case "b": return slidingMoves(board, r, c, color, diagonals);
    case "r": return slidingMoves(board, r, c, color, straights);
    case "q": return slidingMoves(board, r, c, color, [...diagonals, ...straights]);
    case "k": return stepMoves(board, r, c, color, [...diagonals, ...straights]);
    default: return [];
  }
}

function formatMove(fromR, fromC, toR, toC, piece, captured, promoted) {
  const to = squareName(toR, toC);
  if (piece.type === "p") {
    const move = captured ? squareName(fromR, fromC)[0] + "x" + to : to;
    return promoted ? move + "=Q" : move;
  }
  return PIECE_NAMES[piece.type] + (captured ? "x" : "") + to;
}

// Total material value of a list of captured piece types.
function materialValue(types) {
  return types.reduce((sum, t) => sum + (PIECE_VALUES[t] || 0), 0);
}

export const chess = {
  id: "chess",
  label: "Chess",
  boardSize: 8,
  colors: { w: "White", b: "Black" },

  setup() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let c = 0; c < 8; c++) {
      board[0][c] = { color: "b", type: BACK_RANK[c] };
      board[1][c] = { color: "b", type: "p" };
      board[6][c] = { color: "w", type: "p" };
      board[7][c] = { color: "w", type: BACK_RANK[c] };
    }
    return board;
  },

  legalMoves(board, r, c, ctx) {
    const piece = board[r][c];
    if (!piece || piece.color !== ctx.turn) return [];
    return movesFor(board, r, c);
  },

  applyMove(board, from, to) {
    const captured = board[to.row][to.col];
    const piece = board[from.row][from.col];
    const promoted = piece.type === "p" && (to.row === 0 || to.row === 7);
    const notation = formatMove(from.row, from.col, to.row, to.col, piece, captured, promoted);

    board[to.row][to.col] = piece;
    board[from.row][from.col] = null;
    if (promoted) piece.type = "q";

    return { captured, promoted, notation, continuation: null };
  },

  // King capture ends the game: whichever king is missing, that side loses.
  isTerminal(board) {
    let whiteKing = false, blackKing = false;
    for (const row of board) {
      for (const cell of row) {
        if (cell && cell.type === "k") {
          if (cell.color === "w") whiteKing = true;
          else blackKing = true;
        }
      }
    }
    if (!whiteKing) return { over: true, winner: "b" };
    if (!blackKing) return { over: true, winner: "w" };
    return null;
  },

  glyphFor(piece, ctx) {
    return glyphSetFor(ctx.pieceSkin)[piece.color][piece.type];
  },

  // Render the score table: captured pieces and material points per side.
  renderScore(el, board, capturedPieces, ctx) {
    const glyphs = glyphSetFor(ctx.pieceSkin);
    const order = { q: 0, r: 1, b: 2, n: 3, p: 4, k: 5 };
    const scoreW = materialValue(capturedPieces.w);
    const scoreB = materialValue(capturedPieces.b);
    const lead = scoreW - scoreB;

    const rowFor = (color) => {
      const label = color === "w" ? "White" : "Black";
      const taken = capturedPieces[color].slice().sort((a, b) => order[a] - order[b]);
      // Captured pieces belong to the opponent, so show them in that color.
      const foe = color === "w" ? "b" : "w";
      const cells = taken.length
        ? taken
            .map((t) => '<span class="score-piece piece-' + foe + '">' + glyphs[foe][t] + "</span>")
            .join("")
        : '<span class="score-none">—</span>';
      const points = materialValue(capturedPieces[color]);
      const advantage = color === "w" ? lead : -lead;
      const advText = advantage > 0 ? "+" + advantage : "";
      return (
        '<div class="score-row">' +
          '<span class="score-side">' + label + "</span>" +
          '<span class="score-captured">' + cells + "</span>" +
          '<span class="score-points">' + points +
            (advText ? ' <span class="score-lead">' + advText + "</span>" : "") +
          "</span>" +
        "</div>"
      );
    };

    el.innerHTML = rowFor("w") + rowFor("b");
  },
};
