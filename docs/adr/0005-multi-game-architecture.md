# ADR-0005: Multi-game architecture — ES modules + a game interface

- Status: **Accepted** (user chose "Both" + ES modules)
- Date: 2026-07-02
- Issues: #1, #2

## Context

We must host **two games** (chess, checkers) and an orthogonal **blitz clock** in a
codebase that is currently one file of globals loaded via a plain `<script>`. The
board is 8×8 for both games, and rendering/input/history/score/skins/clock are all
reusable across games.

## Decision

Split into **ES modules** (`<script type="module">`, no bundler) around a
game-agnostic **shell** and a common **game interface**:

```
index.html          <script type="module" src="app.js">
app.js              shell: board render, input, game+mode selection, wiring
clock.js            game-agnostic blitz clock (ADR-0002/0003/0004)
ui/                 panels: moveHistory, score, skins (game-aware where needed)
games/
  interface.md      the contract below (doc)
  chess.js          exports a Game
  checkers.js       exports a Game
```

**Game interface** each game module exports:

```js
export const game = {
  id, label,                      // "chess" | "checkers"
  boardSize: 8,
  setup(): Cell[8][8],            // initial position
  legalMoves(board, r, c, ctx),  // legal (not just pseudo) moves for a square,
                                 //   honoring game-wide constraints (e.g. mandatory jump)
  applyMove(board, from, to, ctx): { board, captured, promoted, continuation },
                                 //   continuation = same player must keep moving (multi-jump)
  isTerminal(board, ctx): { over, winner } | null,
  glyphFor(piece, skin),         // rendering hook
  notation(move, ctx),           // for the history panel
  material(board),               // for the score panel (or null to hide)
};
```

The shell owns turn, selection, the clock, and calls into the active game. Skins and
the clock are game-agnostic; move-history and score panels are **game-aware** via
`notation()` / `material()`.

## Consequences

- The current `chess.js` is refactored to implement the interface (behavior
  preserved, incl. the simplified "king capture ends game" rule for now).
- Blitz becomes a shell-level feature that works for **any** game automatically.
- Checkers slots in by implementing the same interface — including a
  **`continuation`** signal the shell already understands, which multi-jump needs.
- No build step; modules load natively. Requires serving over `http://`
  (file:// blocks module loading) — a simple `python3 -m http.server` note in README.

## Alternatives considered

- **Ordered globals / namespace**: no syntax change but weak boundaries; the shell↔game
  seam is exactly what we want enforced. Rejected.
- **Bundler (Vite/esbuild)**: most tooling, contradicts the zero-build ethos for a
  project this size. Rejected.

## Follow-ups

- README: add the "serve over http" note (modules don't load from file://).
