# ADR-0003: Timing mechanism — wall-clock accounting, not fixed decrements

- Status: **Proposed**
- Date: 2026-07-02
- Issue: #2

## Context

We need to count down the active player's clock and detect flagging. The naive
approach — `setInterval(… , 100)` that does `clock -= 100` — accumulates drift
(intervals fire late/coalesce when the tab is backgrounded) and can under- or
over-count seconds.

## Decision

Track **`turnStartedAt`** (a timestamp) when the active clock starts, plus each
player's **stored remaining ms**. On each tick, `displayed = stored - (now - turnStartedAt)`.
When a move completes, commit `stored -= elapsed`, then add increment, then set the
other player active. Tick with `setInterval(…, ~100ms)` **only to refresh the
display and check for flag**, not to mutate the source of truth.

Rendering: the tick updates **only the clock text nodes**, never calls the full
`render()` (which rebuilds all 64 squares). Flag detection sets `gameOver` and
stops the timer.

## Consequences

- Accurate to wall-clock even if ticks are irregular or the tab is throttled.
- No perf regression: board DOM is untouched between moves.
- Slightly more state (`turnStartedAt`, stored ms per side) than a naive counter.

## Alternatives considered

- **Fixed-decrement interval**: simplest but drifts; a flag could fire at the
  wrong real time. Rejected.
- **`requestAnimationFrame`**: smoother but pauses when backgrounded and updates
  far more often than needed for MM:SS display. Rejected for MVP.

## Open questions for the user

- Display granularity: MM:SS always, or show tenths under ~10 s (common in blitz)?
