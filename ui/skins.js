// Appearance customization (background + piece skins). Game-agnostic: it manages
// body CSS classes and persists the choice. When the piece skin changes it invokes
// an onChange callback so the shell can re-render the board with the new glyphs.

const BACKGROUND_SKINS = [
  { id: "forest", label: "Forest", light: "#eeeed2", dark: "#769656" },
  { id: "royal", label: "Royal", light: "#ede0f7", dark: "#7c5cbf" },
  { id: "ocean", label: "Ocean", light: "#dce8f0", dark: "#4a90b8" },
  { id: "sunset", label: "Sunset", light: "#f5e6d3", dark: "#c47840" },
  { id: "midnight", label: "Midnight", light: "#b8c0cc", dark: "#4a5568" },
  { id: "marble", label: "Marble", light: "#f8f6f2", dark: "#a09890" },
];

const PIECE_PREVIEW_COLORS = {
  classic: ["#fff", "#111"],
  outline: ["#fff", "#111"],
  gold: ["#ffd54f", "#3e2723"],
  neon: ["#00f5ff", "#ff2d95"],
  ivory: ["#fff8e7", "#2c2c2c"],
  ruby: ["#ff6b6b", "#1a1a2e"],
  emerald: ["#a8e6cf", "#1b4332"],
};

const PIECE_SKINS = [
  { id: "classic", label: "Classic", previewW: "♚", previewB: "♚" },
  { id: "outline", label: "Outline", previewW: "♔", previewB: "♚" },
  { id: "gold", label: "Gold", previewW: "♚", previewB: "♚" },
  { id: "neon", label: "Neon", previewW: "♚", previewB: "♚" },
  { id: "ivory", label: "Ivory", previewW: "♔", previewB: "♚" },
  { id: "ruby", label: "Ruby", previewW: "♚", previewB: "♚" },
  { id: "emerald", label: "Emerald", previewW: "♔", previewB: "♚" },
];

const BG_SKIN_KEY = "chess-bg-skin";
const PIECE_SKIN_KEY = "chess-piece-skin";
const LEGACY_THEME_KEY = "chess-theme";

let backgroundSkin = "forest";
let pieceSkin = "classic";
let onChange = null;

let skinPickerToggleEl, skinPickerEl, skinPickerCloseEl, skinPickerBackdropEl;
let backgroundSkinsEl, pieceSkinsEl;

export function getPieceSkin() {
  return pieceSkin;
}

export function getBackgroundSkin() {
  return backgroundSkin;
}

function applyBackgroundSkin(id) {
  const skin = BACKGROUND_SKINS.find((s) => s.id === id) || BACKGROUND_SKINS[0];
  backgroundSkin = skin.id;
  document.body.classList.remove(...BACKGROUND_SKINS.map((s) => "bg-" + s.id));
  document.body.classList.add("bg-" + skin.id);
  localStorage.setItem(BG_SKIN_KEY, skin.id);
  backgroundSkinsEl.querySelectorAll(".skin-option").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.skinId === skin.id);
    btn.setAttribute("aria-checked", btn.dataset.skinId === skin.id ? "true" : "false");
  });
}

function applyPieceSkin(id) {
  const skin = PIECE_SKINS.find((s) => s.id === id) || PIECE_SKINS[0];
  pieceSkin = skin.id;
  document.body.classList.remove(...PIECE_SKINS.map((s) => "pieces-" + s.id));
  document.body.classList.add("pieces-" + skin.id);
  localStorage.setItem(PIECE_SKIN_KEY, skin.id);
  pieceSkinsEl.querySelectorAll(".skin-option").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.skinId === skin.id);
    btn.setAttribute("aria-checked", btn.dataset.skinId === skin.id ? "true" : "false");
  });
  if (onChange) onChange();
}

function buildSkinPicker() {
  backgroundSkinsEl.innerHTML = BACKGROUND_SKINS.map((skin) => {
    const previewStyle =
      "background: linear-gradient(135deg, " + skin.light + " 50%, " + skin.dark + " 50%);";
    return (
      '<button type="button" class="skin-option" data-skin-id="' + skin.id + '" role="radio" aria-checked="false">' +
        '<span class="skin-option-preview bg-preview" style="' + previewStyle + '"></span>' +
        '<span class="skin-option-label">' + skin.label + "</span>" +
      "</button>"
    );
  }).join("");

  pieceSkinsEl.innerHTML = PIECE_SKINS.map((skin) => {
    const [whiteColor, blackColor] = PIECE_PREVIEW_COLORS[skin.id];
    return (
      '<button type="button" class="skin-option" data-skin-id="' + skin.id + '" role="radio" aria-checked="false">' +
        '<span class="skin-option-preview piece-preview">' +
          '<span style="color:' + whiteColor + '">' + skin.previewW + "</span>" +
          '<span style="color:' + blackColor + '">' + skin.previewB + "</span>" +
        "</span>" +
        '<span class="skin-option-label">' + skin.label + "</span>" +
      "</button>"
    );
  }).join("");

  backgroundSkinsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".skin-option");
    if (btn) applyBackgroundSkin(btn.dataset.skinId);
  });

  pieceSkinsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".skin-option");
    if (btn) applyPieceSkin(btn.dataset.skinId);
  });
}

function openSkinPicker() {
  skinPickerEl.hidden = false;
  skinPickerBackdropEl.hidden = false;
  skinPickerToggleEl.setAttribute("aria-expanded", "true");
}

function closeSkinPicker() {
  skinPickerEl.hidden = true;
  skinPickerBackdropEl.hidden = true;
  skinPickerToggleEl.setAttribute("aria-expanded", "false");
}

function loadSavedSkins() {
  const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
  const savedBg = localStorage.getItem(BG_SKIN_KEY);
  const bgId = savedBg ||
    (legacyTheme === "green" ? "forest" : legacyTheme === "purple" ? "royal" : "forest");
  const pieceId = localStorage.getItem(PIECE_SKIN_KEY) || "classic";
  applyBackgroundSkin(bgId);
  applyPieceSkin(pieceId);
}

// Wire up the skin picker. `onChangeCb` runs whenever the piece skin changes so
// the shell can re-render the board with the new glyph set.
export function initSkins(onChangeCb) {
  onChange = onChangeCb;
  skinPickerToggleEl = document.getElementById("skin-picker-toggle");
  skinPickerEl = document.getElementById("skin-picker");
  skinPickerCloseEl = document.getElementById("skin-picker-close");
  skinPickerBackdropEl = document.getElementById("skin-picker-backdrop");
  backgroundSkinsEl = document.getElementById("background-skins");
  pieceSkinsEl = document.getElementById("piece-skins");

  buildSkinPicker();

  skinPickerToggleEl.addEventListener("click", openSkinPicker);
  skinPickerCloseEl.addEventListener("click", closeSkinPicker);
  skinPickerBackdropEl.addEventListener("click", closeSkinPicker);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !skinPickerEl.hidden) closeSkinPicker();
  });

  loadSavedSkins();
}
