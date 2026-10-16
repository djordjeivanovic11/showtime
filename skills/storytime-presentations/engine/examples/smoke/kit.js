// Smoke-test kit: a small "marker on paper" world. Exercises web fonts,
// chrome functions, an SVG prop helper with poses, and an idle CSS loop.
(() => {
  const INK = "#22252b";
  const css = `
  @font-face { font-family: "Caveat"; font-weight: 700; src: url(fonts/caveat-latin-700-normal.woff2) format("woff2"); }
  @font-face { font-family: "Patrick Hand"; font-weight: 400; src: url(fonts/patrick-hand-latin-400-normal.woff2) format("woff2"); }
  .smk-tag { display: inline-block; padding: 6px 30px 10px; background: #ffe066; color: ${INK};
    font: 700 64px/1.05 "Caveat", cursive; transform: rotate(-1deg); box-shadow: 4px 6px 0 rgba(0,0,0,.12); }
  .smk-stamp { text-align: right; }
  .smk-stamp span { display: inline-block; padding: 4px 18px; border: 4px solid #d6453d; border-radius: 8px;
    color: #d6453d; font: 400 34px/1.2 "Patrick Hand", cursive; letter-spacing: .12em; transform: rotate(2deg); }
  .smk-source { color: #3c4048; font: 400 24px/1.3 "Patrick Hand", cursive; white-space: nowrap; }
  .smk-title { color: ${INK}; font: 700 128px/1 "Caveat", cursive; }
  .smk-label { color: ${INK}; font: 400 44px/1.15 "Patrick Hand", cursive; }
  @keyframes smk-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  .smk-bob { animation: smk-bob 1.6s ease-in-out infinite; }
  `;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

  const POSE_COLORS = { ontime: "#3d8bfd", late: "#f08c2e", bunched: "#d6453d" };

  window.kit = {
    INK,
    chrome: {
      tag: (text) => `<div class="smk-tag">${text}</div>`,
      stamp: (text) => `<div class="smk-stamp"><span>${text}</span></div>`,
      source: (text) => `<div class="smk-source">${text}</div>`,
      tagBox: { x: 64, y: 40, w: 1240, h: 120 },
      stampBox: { x: 1456, y: 52, w: 400, h: 72 },
      sourceBox: { x: 64, y: 1000, w: 1500, h: 48 },
    },
    paper: () => `<svg viewBox="0 0 1920 1080" preserveAspectRatio="none">
      <rect width="1920" height="1080" fill="#f6f1e7"/>
      <g stroke="#dfe7f2" stroke-width="2">${Array.from({ length: 17 }, (_, i) => `<line x1="0" y1="${i * 64 + 40}" x2="1920" y2="${i * 64 + 40}"/>`).join("")}</g>
    </svg>`,
    // Bus prop; the pose changes only the body colour, so a pose change crossfades in place.
    bus: ({ pose = "ontime" } = {}) => `<svg viewBox="0 0 200 110">
      <g class="smk-bob">
        <rect x="6" y="8" width="188" height="78" rx="16" fill="${POSE_COLORS[pose]}" stroke="${INK}" stroke-width="5"/>
        <g fill="#e9f3ff" stroke="${INK}" stroke-width="4">
          <rect x="22" y="20" width="36" height="28" rx="4"/><rect x="68" y="20" width="36" height="28" rx="4"/>
          <rect x="114" y="20" width="36" height="28" rx="4"/><rect x="160" y="20" width="22" height="40" rx="4"/>
        </g>
        <circle cx="50" cy="90" r="14" fill="${INK}"/><circle cx="150" cy="90" r="14" fill="${INK}"/>
      </g></svg>`,
    route: () => `<svg viewBox="0 0 1400 600">
      <path class="st-draw" d="M120 300 C 120 80, 1280 80, 1280 300 S 120 520, 120 300" fill="none"
        stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
      <g fill="#fff" stroke="${INK}" stroke-width="6">
        <circle cx="120" cy="300" r="20"/><circle cx="700" cy="136" r="20"/>
        <circle cx="1280" cy="300" r="20"/><circle cx="700" cy="464" r="20"/>
      </g></svg>`,
  };
})();
