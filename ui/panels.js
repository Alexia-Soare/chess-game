// Side-panel rendering that is game-agnostic. The move-history list only renders
// notation strings the active game produced, so it works for any game. The score
// panel is game-aware and rendered by the active game itself (game.renderScore).

// Render the move history as numbered pairs (White move / Black move).
export function renderMoveHistory(moveListEl, moveHistory) {
  if (moveHistory.length === 0) {
    moveListEl.innerHTML = '<p class="move-empty">No moves yet</p>';
    return;
  }

  const rows = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const white = moveHistory[i].notation;
    const black = moveHistory[i + 1]?.notation || "";
    rows.push(
      '<div class="move-row">' +
        '<span class="move-num">' + moveNum + ".</span>" +
        '<span class="move-white">' + white + "</span>" +
        '<span class="move-black">' + black + "</span>" +
      "</div>"
    );
  }
  moveListEl.innerHTML = rows.join("");
  moveListEl.scrollTop = moveListEl.scrollHeight;
}
