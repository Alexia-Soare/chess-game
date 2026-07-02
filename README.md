# Chess & Checkers

A lightweight browser board-game app (chess and checkers) built with plain HTML, CSS, and JavaScript ES modules. No build step or dependencies required.

## Features

- **Two games** — chess and American 8×8 checkers — sharing one board shell
- **Blitz mode** — optional chess clock (Blitz 3+2 / 5+0) with Fischer increment, tenths under 10s, and a low-time warning; works in either game
- Click-to-move gameplay with legal move highlighting
- Move history panel (chess algebraic `e4`, `Nf3`; checkers `11-15`, `22x15x8`)
- Checkers enforces mandatory captures and multi-jumps
- Square coordinates, background/piece skins, animated pieces
- Auto pawn promotion to queen; checkers men promote to kings
- Responsive layout for desktop and mobile

## Getting Started

The app is built with ES modules, which browsers only load over HTTP (not from a
`file://` path), so serve the folder locally:

```bash
python3 -m http.server 8765
```

Then visit [http://localhost:8765](http://localhost:8765).

## How to Play

1. Pick a game and time control with the **Game** and **Mode** dropdowns.
2. Click one of your pieces to select it, then click a highlighted square to move.
3. Chess ends when a king is captured; checkers ends when a side has no pieces or no legal move. In a blitz mode, running out of time loses.
4. Use **New Game** to reset the board, and the **Skins** button to change appearance.

## Project Structure

```
chess-game/
├── index.html         # Page markup
├── style.css          # Themes, board styling, animations
├── app.js             # Game-agnostic shell: board, input, rendering, panels
├── clock.js           # Blitz chess clock (game-agnostic)
├── games/
│   ├── interface.md   # The game module contract
│   ├── chess.js       # Chess rules and rendering hooks
│   └── checkers.js    # Checkers rules and rendering hooks
├── ui/
│   ├── skins.js       # Appearance customization (background + piece skins)
│   └── panels.js      # Move-history panel
├── docs/              # Architecture plan, ADRs, glossary
└── README.md
```

## Notes

Both games are simplified for casual play. Chess does not enforce check, checkmate, stalemate, castling, or en passant (the game ends on king capture). Checkers uses American/English rules (8×8, non-flying kings) with no draw detection.
