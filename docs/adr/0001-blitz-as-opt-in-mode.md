# ADR-0001: Blitz is an opt-in mode; Casual stays the default

- Status: **Accepted** — Casual stays default; blitz opt-in. Now generalized: the
  clock is a shell-level, **game-agnostic** feature (applies to chess and checkers)
  per [ADR-0005](0005-multi-game-architecture.md).
- Date: 2026-07-02
- Issue: #2 "Add blitz"

## Context

The current game is fully untimed. Issue #2 asks to "add support for blitz chess."
Blitz specifically means fast, clocked play. We must decide whether adding a clock
*replaces* the current experience or *coexists* with it.

## Decision

Add a **mode selector** with `Casual` (no clock, current behavior, **default**) and
one or more blitz time controls. The clock only exists when a blitz mode is active.
Mode is chosen before/at "New Game" and applies for that game.

## Consequences

- Existing users lose nothing; untimed play is preserved.
- All clock code can early-return when mode is Casual, keeping the untimed path
  untouched and low-risk.
- Adds one UI control and a branch in the move/lifecycle logic.

## Alternatives considered

- **Always-on clock**: simpler code, but silently changes the existing game and
  contradicts the "add" (additive) framing of the issue. Rejected.
- **Separate page/app for blitz**: over-engineered for a single-file app. Rejected.

## Open questions for the user

- Is preserving an untimed mode desired, or should the game always be timed now?
