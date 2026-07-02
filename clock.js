// Game-agnostic blitz clock. Owns its own DOM (the .clocks panel) and the timing
// state; the shell only tells it when a turn ends and when the game halts.
//
// Timing uses wall-clock accounting: each side stores its remaining ms, and the
// active side's displayed time is `stored - (now - startedAt)`. The ~100ms ticker
// only refreshes the display and checks for a flag — it never mutates the source
// of truth — so the clock stays accurate even if ticks fire irregularly.
//
// Lifecycle (ADR-0004): clocks are idle until the first move. A completed move
// (not a multi-jump continuation) commits the mover's elapsed time, adds the
// Fischer increment, and starts the opponent's clock. Reaching zero flags: the
// side whose clock ran out loses.

export const TIME_CONTROLS = [
  { id: "casual", label: "Casual (untimed)", tc: null },
  { id: "3+2", label: "Blitz — 3+2", tc: { base: 180, increment: 2 } },
  { id: "5+0", label: "Blitz — 5+0", tc: { base: 300, increment: 0 } },
];

const LOW_TIME_MS = 15000;   // low-time warning threshold
const TENTHS_MS = 10000;     // show tenths of a second below this

let control = null;              // { base, increment } in seconds, or null (casual)
let remaining = { w: 0, b: 0 };  // stored remaining ms per side
let active = null;               // "w" | "b" | null (idle / halted)
let startedAt = 0;               // timestamp the active clock began this turn
let timer = null;                // setInterval handle
let flagCb = null;               // called with the flagged color

let clocksEl = null;
let timeEls = { w: null, b: null };
let sideEls = { w: null, b: null };

export function isTimed() {
  return control !== null;
}

// Select a time control by its id (see TIME_CONTROLS). Returns the resolved id.
export function setControl(id) {
  const found = TIME_CONTROLS.find((t) => t.id === id) || TIME_CONTROLS[0];
  control = found.tc ? { ...found.tc } : null;
  return found.id;
}

function stopTimer() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function ensureTimer() {
  if (timer === null) {
    timer = setInterval(tick, 100);
  }
}

// Live remaining ms for a color, accounting for the currently running clock.
function liveRemaining(color) {
  let ms = remaining[color];
  if (active === color) ms -= Date.now() - startedAt;
  return Math.max(0, ms);
}

// Fold the active side's elapsed time back into its stored remaining.
function commit(color) {
  if (active === color) {
    remaining[color] = Math.max(0, remaining[color] - (Date.now() - startedAt));
  }
}

function startTurn(color) {
  active = color;
  startedAt = Date.now();
  ensureTimer();
  updateDisplay();
}

// Re-arm to the selected control and return to idle (no clock running).
export function reset() {
  stopTimer();
  active = null;
  startedAt = 0;
  remaining = control
    ? { w: control.base * 1000, b: control.base * 1000 }
    : { w: 0, b: 0 };
  updateDisplay();
}

// A turn ended (mover completed a move; `next` is now to move). No-op when
// untimed. Not called on a multi-jump continuation, so a whole multi-jump counts
// as one turn on the mover's clock.
export function onTurnEnd(mover, next) {
  if (!control) return;
  const wasRunning = active === mover;
  commit(mover);
  // Fischer increment: only when the mover's clock was actually running (the
  // free first move, played from idle, earns no increment).
  if (wasRunning) remaining[mover] += control.increment * 1000;
  startTurn(next);
}

// Freeze the clocks (game over / flag). Commits the running side so the display
// reflects the true final time.
export function halt() {
  commit(active);
  stopTimer();
  active = null;
  updateDisplay();
}

function tick() {
  if (active === null) return;
  updateDisplay();
  if (liveRemaining(active) <= 0) {
    const flagged = active;
    halt();
    if (flagCb) flagCb(flagged);
  }
}

function formatClock(ms) {
  if (ms >= TENTHS_MS) {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }
  // Under ten seconds: show tenths (blitz convention).
  return (Math.ceil(ms / 100) / 10).toFixed(1);
}

function updateDisplay() {
  if (!clocksEl) return;
  clocksEl.hidden = !control;
  if (!control) return;
  for (const color of ["w", "b"]) {
    const ms = liveRemaining(color);
    timeEls[color].textContent = formatClock(ms);
    const el = timeEls[color].closest(".clock");
    el.classList.toggle("active", active === color);
    el.classList.toggle("low", ms <= LOW_TIME_MS);
    el.classList.toggle("flagged", ms <= 0);
  }
}

// Wire up the clock panel. `onFlag(color)` is called when a side runs out of time.
export function initClock({ onFlag }) {
  flagCb = onFlag;
  clocksEl = document.getElementById("clocks");
  for (const color of ["w", "b"]) {
    const el = document.getElementById("clock-" + color);
    timeEls[color] = el.querySelector(".clock-time");
    sideEls[color] = el.querySelector(".clock-side");
  }
}
