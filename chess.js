// Filled glyphs (U+265A–265F) for both sides; white outline glyphs render hollow in most fonts.
const GLYPHS_FILLED = {
  w: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

const GLYPHS_OUTLINE = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

const BACKGROUND_SKINS = [
  { id: "forest", label: "Forest", light: "#eeeed2", dark: "#769656" },
  { id: "royal", label: "Royal", light: "#ede0f7", dark: "#7c5cbf" },
  { id: "ocean", label: "Ocean", light: "#dce8f0", dark: "#4a90b8" },
  { id: "sunset", label: "Sunset", light: "#f5e6d3", dark: "#c47840" },
  { id: "midnight", label: "Midnight", light: "#b8c0cc", dark: "#4a5568" },
  { id: "marble", label: "Marble", light: "#f8f6f2", dark: "#a09890" },
];

const PIECE_PREVIEW_COLORS = {
  classic: ["#fff", "#111"],
  outline: ["#fff", "#111"],
  gold: ["#ffd54f", "#3e2723"],
  neon: ["#00f5ff", "#ff2d95"],
  ivory: ["#fff8e7", "#2c2c2c"],
  ruby: ["#ff6b6b", "#1a1a2e"],
  emerald: ["#a8e6cf", "#1b4332"],
};

const PIECE_SKINS = [
  { id: "classic", label: "Classic", glyphSet: "filled", previewW: "♚", previewB: "♚" },
  { id: "outline", label: "Outline", glyphSet: "outline", previewW: "♔", previewB: "♚" },
  { id: "gold", label: "Gold", glyphSet: "filled", previewW: "♚", previewB: "♚" },
  { id: "neon", label: "Neon", glyphSet: "filled", previewW: "♚", previewB: "♚" },
  { id: "ivory", label: "Ivory", glyphSet: "outline", previewW: "♔", previewB: "♚" },
  { id: "ruby", label: "Ruby", glyphSet: "filled", previewW: "♚", previewB: "♚" },
  { id: "emerald", label: "Emerald", glyphSet: "outline", previewW: "♔", previewB: "♚" },
];

// Starting arrangement of the back rank.
const BACK_RANK = ["r", "n", "b", "q", "k", "b", "n", "r"];

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetEl = document.getElementById("reset");
const skinPickerToggleEl = document.getElementById("skin-picker-toggle");
const skinPickerEl = document.getElementById("skin-picker");
const skinPickerCloseEl = document.getElementById("skin-picker-close");
const skinPickerBackdropEl = document.getElementById("skin-picker-backdrop");
const backgroundSkinsEl = document.getElementById("background-skins");
const pieceSkinsEl = document.getElementById("piece-skins");
const moveListEl = document.getElementById("move-list");

const BG_SKIN_KEY = "chess-bg-skin";
const PIECE_SKIN_KEY = "chess-piece-skin";
const LEGACY_THEME_KEY = "chess-theme";

const PIECE_NAMES = { k: "K", q: "Q", r: "R", b: "B", n: "N", p: "" };

let activeGlyphs = GLYPHS_FILLED;
let backgroundSkin = "forest";
let pieceSkin = "classic";

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
        glyph.textContent = activeGlyphs[piece.color][piece.type];
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

function applyBackgroundSkin(id) {
  const skin = BACKGROUND_SKINS.find((s) => s.id === id) || BACKGROUND_SKINS[0];
  backgroundSkin = skin.id;
  document.body.classList.remove(...BACKGROUND_SKINS.map((s) => "bg-" + s.id));
  document.body.classList.add("bg-" + skin.id);
  localStorage.setItem(BG_SKIN_KEY, skin.id);
  backgroundSkinsEl.querySelectorAll(".skin-option").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.skinId === skin.id);
    btn.setAttribute("aria-checked", btn.dataset.skinId === skin.id ? "true" : "false");
  });
}

function applyPieceSkin(id) {
  const skin = PIECE_SKINS.find((s) => s.id === id) || PIECE_SKINS[0];
  pieceSkin = skin.id;
  activeGlyphs = skin.glyphSet === "outline" ? GLYPHS_OUTLINE : GLYPHS_FILLED;
  document.body.classList.remove(...PIECE_SKINS.map((s) => "pieces-" + s.id));
  document.body.classList.add("pieces-" + skin.id);
  localStorage.setItem(PIECE_SKIN_KEY, skin.id);
  pieceSkinsEl.querySelectorAll(".skin-option").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.skinId === skin.id);
    btn.setAttribute("aria-checked", btn.dataset.skinId === skin.id ? "true" : "false");
  });
  render();
}

function buildSkinPicker() {
  backgroundSkinsEl.innerHTML = BACKGROUND_SKINS.map((skin) => {
    const previewStyle =
      "background: linear-gradient(135deg, " + skin.light + " 50%, " + skin.dark + " 50%);";
    return (
      '<button type="button" class="skin-option" data-skin-id="' + skin.id + '" role="radio" aria-checked="false">' +
        '<span class="skin-option-preview bg-preview" style="' + previewStyle + '"></span>' +
        '<span class="skin-option-label">' + skin.label + "</span>" +
      "</button>"
    );
  }).join("");

  pieceSkinsEl.innerHTML = PIECE_SKINS.map((skin) => {
    const [whiteColor, blackColor] = PIECE_PREVIEW_COLORS[skin.id];
    return (
      '<button type="button" class="skin-option" data-skin-id="' + skin.id + '" role="radio" aria-checked="false">' +
        '<span class="skin-option-preview piece-preview">' +
          '<span style="color:' + whiteColor + '">' + skin.previewW + "</span>" +
          '<span style="color:' + blackColor + '">' + skin.previewB + "</span>" +
        "</span>" +
        '<span class="skin-option-label">' + skin.label + "</span>" +
      "</button>"
    );
  }).join("");

  backgroundSkinsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".skin-option");
    if (btn) applyBackgroundSkin(btn.dataset.skinId);
  });

  pieceSkinsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".skin-option");
    if (btn) applyPieceSkin(btn.dataset.skinId);
  });
}

function openSkinPicker() {
  skinPickerEl.hidden = false;
  skinPickerBackdropEl.hidden = false;
  skinPickerToggleEl.setAttribute("aria-expanded", "true");
}

function closeSkinPicker() {
  skinPickerEl.hidden = true;
  skinPickerBackdropEl.hidden = true;
  skinPickerToggleEl.setAttribute("aria-expanded", "false");
}

function loadSavedSkins() {
  const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
  const savedBg = localStorage.getItem(BG_SKIN_KEY);
  const bgId = savedBg ||
    (legacyTheme === "green" ? "forest" : legacyTheme === "purple" ? "royal" : "forest");
  const pieceId = localStorage.getItem(PIECE_SKIN_KEY) || "classic";
  applyBackgroundSkin(bgId);
  applyPieceSkin(pieceId);
}

skinPickerToggleEl.addEventListener("click", openSkinPicker);
skinPickerCloseEl.addEventListener("click", closeSkinPicker);
skinPickerBackdropEl.addEventListener("click", closeSkinPicker);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !skinPickerEl.hidden) closeSkinPicker();
});

buildSkinPicker();
setupBoard();
loadSavedSkins();
renderMoveHistory();
statusEl.textContent = "White to move";
