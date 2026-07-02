// Game-agnostic shell. Owns the board array, turn, selection, rendering, input,
// and side panels; delegates all rules to the active game module (see
// games/interface.md). Today the only game is chess; the shell is structured so
// additional games (checkers) and cross-cutting features (a blitz clock) slot in
// without touching the rules.

import { chess } from "./games/chess.js";
import { initSkins, getPieceSkin } from "./ui/skins.js";
import { renderMoveHistory } from "./ui/panels.js";

const GAMES = { chess };
let activeGame = chess;

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetEl = document.getElementById("reset");
const moveListEl = document.getElementById("move-list");
const scoreEl = document.getElementById("score");

let board = [];       // 8x8 array; each cell is null or { color, type }
let turn = "w";       // "w" or "b"
let selected = null;  // { row, col } of the currently selected piece
let legalMoves = [];  // list of { row, col } the selected piece may move to
let moveHistory = []; // list of { color, notation }
let capturedPieces = { w: [], b: [] }; // piece types each color has captured
let lastMove = null;  // { toR, toC } for landing animation
let gameOver = false;

// Appearance context passed to game rendering hooks.
const appearanceCtx = () => ({ pieceSkin: getPieceSkin() });

// Build the initial position for the active game.
function setupBoard() {
  board = activeGame.setup();
  turn = "w";
  selected = null;
  legalMoves = [];
  moveHistory = [];
  capturedPieces = { w: [], b: [] };
  lastMove = null;
  gameOver = false;
}

const squareName = (r, c) => "abcdefgh"[c] + (8 - r);

// Render the board state into the DOM.
function render() {
  if (!board.length) return; // nothing to draw until the first game is set up
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
        glyph.textContent = activeGame.glyphFor(piece, appearanceCtx());
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
    movePiece(selected, { row: r, col: c });
    return;
  }

  // Selecting one of your own pieces.
  const moves = activeGame.legalMoves(board, r, c, { turn });
  if (piece && piece.color === turn && moves.length) {
    selected = { row: r, col: c };
    legalMoves = moves;
  } else {
    selected = null;
    legalMoves = [];
  }
  render();
}

// Move a piece and advance the turn (or continue a multi-move turn).
function movePiece(from, to) {
  const mover = turn;
  const result = activeGame.applyMove(board, from, to, { turn });

  moveHistory.push({ color: mover, notation: result.notation });
  if (result.captured) {
    capturedPieces[mover].push(result.captured.type);
  }

  lastMove = { toR: to.row, toC: to.col };
  selected = null;
  legalMoves = [];

  renderMoveHistory(moveListEl, moveHistory);
  activeGame.renderScore(scoreEl, board, capturedPieces, appearanceCtx());

  // Terminal position for the player who would move next.
  const next = mover === "w" ? "b" : "w";
  const terminal = activeGame.isTerminal(board, { turn: next });
  if (terminal && terminal.over) {
    gameOver = true;
    render();
    statusEl.textContent = terminal.winner
      ? activeGame.colors[terminal.winner] + " wins!"
      : "Draw";
    return;
  }

  // A continuation keeps the same player on move (e.g. checkers multi-jump).
  if (result.continuation) {
    selected = result.continuation;
    legalMoves = activeGame.legalMoves(board, result.continuation.row, result.continuation.col, { turn });
    render();
    statusEl.textContent = activeGame.colors[turn] + " must continue jumping";
    return;
  }

  turn = next;
  render();
  statusEl.textContent = activeGame.colors[turn] + " to move";
}

function newGame() {
  setupBoard();
  render();
  renderMoveHistory(moveListEl, moveHistory);
  activeGame.renderScore(scoreEl, board, capturedPieces, appearanceCtx());
  statusEl.textContent = activeGame.colors[turn] + " to move";
}

resetEl.addEventListener("click", newGame);

initSkins(render);
newGame();
