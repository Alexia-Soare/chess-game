# Game interface

Each game module (`games/chess.js`, `games/checkers.js`) exports a `game` object
that the shell (`app.js`) drives. The shell owns the board array, turn, selection,
clock, panels, and rendering; the game owns the *rules* and per-game rendering hooks.

```js
export const game = {
  id,            // "chess" | "checkers"
  label,         // human label for the game selector
  boardSize,     // 8
  colors,        // { w: "White", b: "Black" } — labels per color

  // Initial position: an 8x8 array; each cell is null or { color, type }.
  setup(): Cell[8][8],

  // Legal moves for the piece at (r, c) given ctx.turn. MUST return [] if the
  // square is empty or not the side to move. May be constrained game-wide
  // (e.g. checkers mandatory capture returns only jumps when any jump exists).
  legalMoves(board, r, c, ctx): Array<{ row, col }>,

  // Apply a move in place. Returns:
  //   captured:      the captured piece object, or null
  //   promoted:      bool
  //   notation:      string for the move-history panel
  //   continuation:  { row, col } if the SAME player must move again
  //                  (checkers multi-jump), else null. When set, the shell
  //                  does not switch turns and the clock does not commit/increment.
  applyMove(board, from, to, ctx): { captured, promoted, notation, continuation },

  // Terminal check for the position with ctx.turn to move next.
  // Returns { over: true, winner } or null.
  isTerminal(board, ctx): { over, winner } | null,

  // Glyph for a piece. ctx carries game-agnostic appearance (e.g. pieceSkin);
  // games ignore what they don't use.
  glyphFor(piece, ctx): string,

  // Render the score panel for this game (game-aware). The shell passes the
  // running capturedPieces tally and appearance ctx.
  renderScore(el, board, capturedPieces, ctx): void,
};
```

`ctx` is a small object the shell passes through: `{ turn, pieceSkin }` (fields
present as relevant). Games read only what they need.
