# Implementation Plan — Multi-game (Chess + Checkers) with Blitz

Status: **Accepted design, ready to implement.** Produced via `grill-with-docs`;
all major forks decided with the user and recorded as ADRs.

Covers **Issue #1 (checkers)** and **Issue #2 (blitz)** on a shared architecture.

See: [Glossary](GLOSSARY.md) · ADRs
[0001](adr/0001-blitz-as-opt-in-mode.md) · [0002](adr/0002-time-control-model.md) ·
[0003](adr/0003-timing-mechanism.md) · [0004](adr/0004-clock-start-and-lifecycle.md) ·
[0005](adr/0005-multi-game-architecture.md) · [0006](adr/0006-checkers-ruleset.md)

## Confirmed decisions

| Area | Decision |
|------|----------|
| Scope | Both games on a **shared architecture** |
| Modules | **ES modules**, no bundler (serve over http) — ADR-0005 |
| Games coexist | Game-agnostic **shell** + a **game interface** — ADR-0005 |
| Blitz | Opt-in mode; **Fischer** increment; presets **3+2**, **5+0** — ADR-0001/0002 |
| Clock | Wall-clock accounting; ticks update clock text only; **starts on first move** — ADR-0003/0004 |
| Clock scope | **Game-agnostic** — works for chess *and* checkers |
| Blitz polish | Sub-10s **tenths**, **persist last mode**, **low-time warning** |
| Checkers | **American/English 8×8**; men forward-only, non-flying kings — ADR-0006 |
| Captures | **Mandatory**, with mandatory **multi-jump** (continuation) — ADR-0006 |
| Panels | Skins + clock game-agnostic; history + score **game-aware** |

## Phased build

### Phase 0 — Refactor to the shared shell (no behavior change)
Extract the game-agnostic shell from today's `chess.js` and reshape chess as the
first `Game` implementation. Ship this working and identical to today before adding
anything new.
- `app.js` (shell): board render, input/selection, turn, panels wiring, game+mode
  selection. `<script type="module">` in `index.html`.
- `games/chess.js`: implement the interface (`setup/legalMoves/applyMove/isTerminal/
  glyphFor/notation/material`); preserve current simplified rules (king-capture win).
- `ui/`: move-history, score, skins extracted; made **game-aware** where they read
  `notation()`/`material()`.
- README: note "serve over http" (modules don't load from `file://`).
- **Done when:** chess plays exactly as before, now through the shell.

### Phase 1 — Blitz clock (game-agnostic) — Issue #2
- `clock.js`: `initClocks(tc)`, `startClock(color)`, `commitElapsed()`,
  `remaining(color)`, `stopClock()`; wall-clock accounting (`turnStartedAt` + stored
  ms per side). ADR-0003.
- Shell hooks: on a **turn-ending** move commit elapsed, add increment, start
  opponent's clock. **Skip on a `continuation` hop** (checkers multi-jump).
- Ticker (~100 ms): update clock **text only**; on `<=0` → flag → `gameOver`,
  "<opponent> wins on time!", stop clock. Sub-10s shows **tenths**; low-time
  **warning** style.
- Mode selector (Casual / 3+2 / 5+0), applied on New Game; **persist** last choice in
  `localStorage` (mirrors skin persistence). Clocks hidden in Casual.
- **Done when:** chess is playable timed; bullet flags, 3+2 accrues increment,
  king-capture and reset both stop/re-arm the clock.

### Phase 2 — Checkers — Issue #1
- `games/checkers.js`: 8×8 dark-square setup, 12/side; men forward diagonal, kings
  both directions; promotion on far row.
- **Mandatory capture**: `legalMoves` detects any available jump for the side to move
  and, if present, returns only jumps. **Multi-jump** returns `continuation: true`
  from `applyMove` when the landed piece can jump again; shell keeps the same player
  on-move and forces that piece (and, per Phase 1, the clock does not switch/increment).
- `isTerminal`: side to move loses with no pieces or no legal move.
- Game-aware panels: checkers `notation()` (1–32 dark-square numbering, `11-15` /
  `18x11`) and `material()` (piece counts; men 1, king ~1.5 — or plain counts).
- Game selector in the shell (Chess / Checkers), applied on New Game; blitz modes
  available for both.
- **Done when:** a full legal checkers game plays, forced/multi-jumps enforced,
  win detection correct, and blitz works over checkers.

## Files (final shape)
```
index.html          (module entry; game + mode selectors; clock DOM)
app.js              shell
clock.js            blitz clock (game-agnostic)
games/chess.js      chess rules  (refactor of today's chess.js)
games/checkers.js   checkers rules (new)
ui/*.js             history, score (game-aware), skins
style.css           + clock, selectors, checkers piece styling
```

## Explicit non-goals (MVP)
No check/checkmate/castling/en passant (chess unchanged), no draw logic in either
game, no 10×10 / flying kings, no pause/resume, no custom time entry, no AI/opponent,
no persistence of in-progress games.

## Risks / watch-items
- **Continuation ↔ clock coupling**: the clock must treat a multi-jump as one turn —
  commit/increment only when the turn truly ends. Single most bug-prone seam.
- **Perf**: never call full board `render()` from the clock ticker.
- **Timer leaks**: `stopClock()` on every terminal path, game switch, and reset.
- **Refactor regressions (Phase 0)**: preserve chess behavior exactly before layering
  features; this is the riskiest phase precisely because it should change nothing.
- **file:// modules**: must be served over http; document it.

## Open (non-blocking) question
- Checkers score panel: piece counts vs hiding the chess-style material bar
  (plan assumes piece counts). — ADR-0006
```
