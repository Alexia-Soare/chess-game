# Chess

A lightweight browser chess game built with plain HTML, CSS, and JavaScript. No build step or dependencies required.

## Features

- Click-to-move gameplay with legal move highlighting
- Move history panel with algebraic notation (`e4`, `Nf3`, `exd5`, etc.)
- Square coordinates on every square (files `a–h`, ranks `1–8`)
- Green and purple themes with a persistent theme toggle
- Animated pieces with selection and landing effects
- Auto pawn promotion to queen
- Responsive layout for desktop and mobile

## Getting Started

Open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8765
```

Then visit [http://localhost:8765](http://localhost:8765).

## How to Play

1. Click one of your pieces to select it.
2. Click a highlighted square to move.
3. Capturing the opponent's king ends the game.
4. Use **New Game** to reset the board.
5. Use the theme button in the top-right corner to switch between green and purple themes.

## Project Structure

```
chess-game/
├── index.html   # Page markup
├── style.css    # Themes, board styling, animations
├── chess.js     # Game logic and rendering
└── README.md
```

## Notes

This is a simplified chess implementation intended for casual play. It does not enforce check, checkmate, stalemate, castling, or en passant.
