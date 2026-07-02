# ADR-0002: Time control model — base + Fischer increment, via presets

- Status: **Accepted** — Fischer increment; core presets 3+2 and 5+0 confirmed by user
- Date: 2026-07-02
- Issue: #2

## Context

"Blitz" needs a concrete time-control representation. Options range from a single
fixed sudden-death timer to full tournament controls (multiple stages, delay vs
increment, Bronstein, etc.).

## Decision

Model a time control as **`{ base, increment }`** in seconds, applying **Fischer
increment** (increment added *after* a completed move). Expose a small set of
**presets**:

| Label   | base+inc | Notes                     |
|---------|----------|---------------------------|
| Bullet  | 1+0      | 1 min, no increment       |
| Blitz   | 3+2      | classic blitz             |
| Blitz   | 5+0      | 5 min sudden death        |
| Rapid   | 10+0     | borderline, nice-to-have  |

(Exact preset list is easily tuned; `3+2` and `5+0` are the core blitz cases.)

## Consequences

- One data shape covers sudden death (`increment: 0`) and incremented play.
- Presets keep the UI trivial (no custom-time form for MVP).
- Fischer is the most common online blitz convention, so behavior matches
  players' expectations.

## Alternatives considered

- **Sudden death only** (no increment): simplest, but `3+2` is *the* canonical
  blitz control; omitting increment feels incomplete. Rejected for MVP core.
- **Bronstein / simple delay**: more rules, marginal value here. Deferred.
- **Custom time input**: nice later; adds validation + UI. Deferred.

## Open questions for the user

- Which presets do you actually want? Is a custom-time entry needed?
- Fischer increment, or plain sudden death?
