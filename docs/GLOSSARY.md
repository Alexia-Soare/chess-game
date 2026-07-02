# Glossary

Ubiquitous language for the chess game. Terms are defined as the *code* uses
them, not necessarily as FIDE defines them — where they differ, that is noted.

## Architecture (new — see [ADR-0005](adr/0005-multi-game-architecture.md))

- **Shell** — the game-agnostic host (`app.js`): board rendering, input, turn,
  selection, clock, panels, and game/mode selection. Delegates rules to a Game.
- **Game** — a module (`games/chess.js`, `games/checkers.js`) implementing the
  common **game interface** (`setup`, `legalMoves`, `applyMove`, `isTerminal`,
  `glyphFor`, `notation`, `material`).
- **Continuation** — an `applyMove` result flag meaning *the same player must move
  again* (checkers multi-jump). The shell does **not** switch turns — and the clock
  does **not** commit/increment — on a continuation hop.
- **Game-agnostic vs game-aware** — skins and the clock are game-agnostic; the
  move-history and score panels are game-aware (via `notation()` / `material()`).

## Existing domain

- **Board** — the 8×8 model: `board[row][col]`, each cell `null` or `{ color, type }`.
  Row 0 is Black's back rank (top), row 7 is White's (bottom).
- **Color** — `"w"` (White) or `"b"` (Black).
- **Type** — piece kind: `p n b r q k`.
- **Turn** — whose move it is; global `turn`, `"w"` or `"b"`.
- **Pseudo-legal move** — a move that respects piece movement but is *not*
  checked against leaving one's own king in check. This game only computes
  pseudo-legal moves; there is no check/checkmate detection.
- **Game over** — reached only by **king capture** (see below), not checkmate.
- **King capture** — the win condition. Because check isn't enforced, taking the
  opposing king literally ends the game. `movePiece` sets `gameOver` when a `k`
  is captured.
- **Move history** — `moveHistory`, list of `{ color, notation }`; rendered as
  numbered pairs.
- **Captured pieces / material** — `capturedPieces{w,b}`, scored via `PIECE_VALUES`.
- **Skin** — cosmetic theme; **background skin** (board colors) and **piece skin**
  (glyph set + colors), persisted in `localStorage`.

## Blitz domain (new — proposed)

- **Clock** — a per-player countdown of remaining thinking time, in milliseconds.
  Proposed state: `clocks = { w: <ms>, b: <ms> }`.
- **Time control** — the rule set for the clocks, expressed as
  **`base + increment`** (both in seconds), e.g. `3+2` = 3 min base, 2 s added
  per move. See [ADR-0002](adr/0002-time-control-model.md).
- **Base time** — starting time on each player's clock.
- **Increment** — time added to a player's clock *after* they complete a move
  (Fischer increment). `0` means sudden death.
- **Active clock** — the clock currently counting down; belongs to the player
  whose `turn` it is, and only runs once the game is *live*.
- **Live** — the game has started counting time. The clock is idle before the
  first move (see [ADR-0004](adr/0004-clock-start-and-lifecycle.md)).
- **Flag / flagging** — a clock reaching `0`. The flagged player **loses on time**
  immediately; game ends with "wins on time".
- **Casual mode** — no clock; the current untimed behavior. Blitz is opt-in via a
  mode selector; Casual remains the default. See [ADR-0001](adr/0001-blitz-as-opt-in-mode.md).
- **Tick** — a timer event that recomputes the active clock's remaining time from
  wall-clock elapsed (not by subtracting a fixed step) to avoid drift.
  See [ADR-0003](adr/0003-timing-mechanism.md).

## Checkers domain (new — see [ADR-0006](adr/0006-checkers-ruleset.md))

- **Man** — a normal checker; moves one square diagonally **forward** only.
- **King** — a promoted checker; moves one square diagonally **either** direction
  (non-flying, single step). Made by a man reaching the far row.
- **Mandatory capture** — if any jump is available for the side to move, a jump
  *must* be played; non-capturing moves are illegal that turn.
- **Multi-jump** — a chain of captures by one piece in a single turn; once begun it
  **must** continue while further jumps exist (see **Continuation**).
- **Dark-square numbering** — standard 1–32 labeling of the playable (dark) squares,
  used for checkers move notation (`11-15` move, `18x11` jump).
