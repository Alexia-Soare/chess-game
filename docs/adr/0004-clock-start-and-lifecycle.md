# ADR-0004: Clock start, flagging, and interaction with existing end states

- Status: **Accepted** — clock starts on first move (confirmed); tenths under 10s
  and low-time warning confirmed in scope (see ADR-0003 / plan)
- Date: 2026-07-02
- Issue: #2

## Context

The game already ends on **king capture** (`gameOver`). Adding a clock introduces
a second way to end (**flagging**) and a question of *when* the clock starts.

## Decision

- **Start:** the clock is idle until the **first move is made**; White's clock
  starts counting when the game becomes live on White's first move commit. (Common
  online convention; avoids penalizing setup time.) Black's clock starts when
  White's move completes and it becomes Black's turn.
- **Switch:** on each completed move, commit elapsed to the mover, add increment,
  swap the active clock to the opponent.
- **Flag:** when the active clock hits `0`, the *active* player loses; set
  `gameOver`, stop the timer, status = "<opponent> wins on time". Flag detection
  happens on tick.
- **King capture still wins immediately** and stops the clock; the two end states
  share the single `gameOver` flag.
- **Reset / New Game** re-initializes clocks from the selected time control and
  returns to idle.
- **Promotion, selection, illegal clicks** do not affect the clock; only a
  completed move does.

## Consequences

- One consolidated "game over" path; the timer must be stopped in every terminal
  branch (king capture, flag, reset).
- No draw-on-timeout / insufficient-material rule (game has no draw logic today) —
  flagging is always a loss. Consistent with the simplified ruleset.

## Open questions for the user

- Should White's clock start on game load instead of on first move?
- Any need for pause/resume? (Assumed **no** for MVP.)
