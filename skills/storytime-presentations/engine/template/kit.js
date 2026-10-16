// Placeholder style kit. A real kit (from the skill's style references)
// replaces this file: it injects the world's CSS and fonts, supplies the
// chrome (tag, stamp, source) and their boxes, and exports SVG helpers.
// Every helper returns a plain string so deck.js stays declarative.
(() => {
  const css = `
  /* Fonts: put .woff2 files in fonts/ and declare them here, for example
     @font-face { font-family: "Kit Display"; src: url(fonts/kit-display.woff2) format("woff2"); }
     The bundler inlines every url(...) it can find as a data URI. */
  .kit-tag { display: inline-block; padding: 14px 28px; background: #ffd447; color: #14131f;
    font: 700 52px/1.1 system-ui, sans-serif; border-radius: 10px; }
  .kit-stamp { text-align: right; }
  .kit-stamp span { display: inline-block; padding: 8px 18px; border: 4px solid #ff6b6b;
    color: #ff6b6b; font: 800 30px/1.2 system-ui, sans-serif; letter-spacing: .1em; }
  .kit-source { color: #c9cbe0; font: 22px/1.3 system-ui, sans-serif; white-space: nowrap; }
  .kit-title { color: #f4f1e8; font: 800 96px/1.05 system-ui, sans-serif; }
  .kit-label { color: #f4f1e8; font: 700 40px/1.2 system-ui, sans-serif; }
  `;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

  window.kit = {
    chrome: {
      tag: (text) => `<div class="kit-tag">${text}</div>`,
      stamp: (text) => `<div class="kit-stamp"><span>${text}</span></div>`,
      source: (text) => `<div class="kit-source">${text}</div>`,
      tagBox: { x: 64, y: 48, w: 1240, h: 104 },
      stampBox: { x: 1456, y: 52, w: 400, h: 72 },
      sourceBox: { x: 64, y: 1004, w: 1600, h: 44 },
    },
    // A tiny prop helper: one persistent object, drawn in the kit's style.
    dot: ({ color = "#4fd6e8" } = {}) =>
      `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="${color}" stroke="#14131f" stroke-width="6"/></svg>`,
  };
})();
