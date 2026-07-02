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

let board = [];   // 8x8 array; each cell is null or { color, type }
let turn = "w";   // "w" or "b"

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
      boardEl.appendChild(sq);
    }
  }
  statusEl.textContent = (turn === "w" ? "White" : "Black") + " to move";
}

setupBoard();
render();

resetEl.addEventListener("click", () => {
  setupBoard();
  render();
});
