# ADR-0006: Checkers ruleset — American/English 8×8, mandatory multi-jump

- Status: **Accepted** (user choices)
- Date: 2026-07-02
- Issue: #1

## Context

Checkers has several regional variants. We must fix one ruleset to implement.

## Decision

**American/English draughts on 8×8:**

- 8×8 board (reuses the existing board/rendering), pieces only on **dark squares**.
- **12 pieces per side**, set up on the three nearest dark-square rows.
- **Men** move one square diagonally **forward**; **kings** move one square
  diagonally in **either** direction (**non-flying** — single step, not long-range).
- **Promotion**: a man reaching the far row becomes a **king**.
- **Captures are mandatory**: if any capture is available for the side to move, a
  capturing move *must* be chosen. **Multi-jumps** are mandatory too — after a jump,
  if the same piece can jump again it **must continue** (modeled via the interface's
  `continuation` signal; the shell keeps the same player on-move and forces the
  jumping piece).
- **Win**: a player with **no pieces** or **no legal move** loses. (No draw logic for
  MVP — consistent with chess having none today.)

## Consequences

- `legalMoves` is board-global for checkers: it must first detect whether *any*
  capture exists for the side to move, and if so return only captures.
- The shell's existing turn-switch must respect `continuation` (don't switch sides
  mid multi-jump). This is the one genuinely new control-flow addition; blitz's
  clock only commits/increments when the turn actually **ends** (not on a
  continuation hop).
- Panels: checkers **notation** uses standard 1–32 dark-square numbering
  (`11-15`, `18x11`); **material** = piece counts (men 1, king ~1.5) or simple
  counts — see plan.

## Alternatives considered

- **International 10×10 / flying kings**: different board size, breaks the 8×8
  reuse; more move-gen. Rejected for MVP.
- **Optional captures**: simpler but non-standard; rejected in favor of tournament rule.

## Open questions (non-blocking)

- Score panel for checkers: show piece counts, or hide the chess-style material bar?
  (Plan assumes piece counts.)
