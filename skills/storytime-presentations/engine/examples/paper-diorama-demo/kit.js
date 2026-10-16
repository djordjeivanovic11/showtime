/* An engine adapter for the hand-cut paper kit in paper-kit.js. */
(() => {
  "use strict";

  const P = window.Paper;
  const C = P.PALETTE;
  const FONT_STYLE = `
    @font-face { font-family: "Fraunces"; font-weight: 800;
      src: url("fonts/fraunces-latin-800-normal.woff2") format("woff2"); }
    @font-face { font-family: "Fraunces"; font-weight: 900;
      src: url("fonts/fraunces-latin-900-normal.woff2") format("woff2"); }
    @font-face { font-family: "Andika"; font-weight: 400;
      src: url("fonts/andika-latin-400-normal.woff2") format("woff2"); }
    @font-face { font-family: "Andika"; font-weight: 700;
      src: url("fonts/andika-latin-700-normal.woff2") format("woff2"); }
    .pd-tag { display:inline-block; position:relative; padding:10px 30px 16px;
      background:${C.cream}; color:${C.ink};
      font:800 51px/1.05 "Fraunces",Georgia,serif;
      box-shadow:7px 9px 0 rgba(69,43,22,.2); transform:rotate(-1deg); }
    .pd-tag:before, .pd-tag:after { content:""; position:absolute;
      width:54px; height:18px; background:#ead9b7; opacity:.84; top:-8px; }
    .pd-tag:before { left:-13px; transform:rotate(-25deg); }
    .pd-tag:after { right:-13px; transform:rotate(22deg); }
    .pd-stamp { text-align:right; }
    .pd-stamp span { display:inline-block; padding:8px 20px;
      border:4px double ${C.alarmInk}; border-radius:5px;
      color:${C.alarmInk}; transform:rotate(-4deg);
      font:800 29px/1 "Fraunces",Georgia,serif; letter-spacing:.08em; }
    .pd-source { display:inline-block; padding:5px 15px;
      background:rgba(248,236,202,.93); color:${C.inkSoft};
      font:700 23px/1.15 "Andika",sans-serif; white-space:nowrap; }
  `;
  document.head.insertAdjacentHTML("beforeend", `<style>${FONT_STYLE}</style>`);

  function svgRoot(width, height) {
    const root = P.el("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: `0 0 ${width} ${height}`,
    });
    P.installDefs(root);
    return root;
  }

  function world() {
    const svg = svgRoot(1920, 1080);
    P.el("rect", { width: 1920, height: 1080, fill: C.sky }, svg);
    P.piece(svg, P.hillPath(0, 1920, 414, {
      amp: 26, waves: 1.6, seed: 10, bottom: 1080,
    }), C.skyLow, { stroke: "none" });
    P.sun(svg, 1715, 196, 68);
    P.cloud(svg, 1180, 160, 0.65, 34, -30);

    const far = P.group(svg, { filter: "url(#pd-lift-2-plane)" });
    P.piece(far, P.hillPath(0, 1920, 508, {
      amp: 34, waves: 1.4, seed: 21, bottom: 1080,
    }), C.hillFar, { stroke: "none" });
    for (const [x, y, color] of [
      [92, 522, C.house1], [185, 510, C.house3], [267, 525, C.house2],
      [353, 516, C.house4], [1638, 501, C.house3], [1730, 524, C.house2],
      [1817, 511, C.house1],
    ]) {
      P.house(far, x, y, 70, 70, color, x);
    }
    for (const [x, y] of [[540, 566], [618, 550], [1516, 560], [1584, 547]]) {
      P.tree(far, x, y, 0.77, "round", x, C.hillNear);
    }

    const meadow = P.group(svg, { filter: "url(#pd-lift-3-plane)" });
    P.piece(meadow, P.hillPath(0, 1920, 574, {
      amp: 22, waves: 1.7, seed: 31, bottom: 1080,
    }), C.meadow, { stroke: "none" });
    P.pond(meadow, 875, 668, 116, 40, 70);
    for (const [x, y, kind] of [[100, 660, "pine"], [1640, 628, "round"],
      [1800, 681, "pine"]]) {
      P.tree(meadow, x, y, 0.7, kind, x, C.forest);
    }

    const route = P.loopRoute(svg, {
      cx: 865, cy: 699, rx: 565, ry: 176,
      width: 64, period: 20, theta0: 180, stops: 8,
    });
    for (let index = 0; index < 8; index += 1) {
      const stop = route.stopPoint(index);
      P.stopFlag(svg, stop.x, stop.y, index + 1);
    }

    const foreground = P.group(svg, { filter: "url(#pd-lift-2-plane)" });
    P.piece(foreground, P.hillPath(0, 1920, 982, {
      amp: 10, waves: 2.8, seed: 41, bottom: 1080,
    }), C.grass, { stroke: "none" });
    P.cardboardEdge(foreground, 20, 1900, 1027, 35, 59);
    P.hedge(foreground, 34, 1020, 240, 62, 51);
    P.hedge(foreground, 1720, 1020, 170, 58, 52);
    for (const [x, color] of [[420, C.rose], [470, C.cream],
      [1510, C.rose], [1810, C.sun]]) {
      P.flower(foreground, x, 1000, 0.9, color, x);
    }

    // The recurring stop and puppet are separate engine layers. The frame
    // stays in this fixed scenic layer while the buses travel over the route.
    P.shadowBox(svg, { inset: 21, depth: 25 });
    return svg.outerHTML;
  }

  function bus(letter) {
    const svg = svgRoot(250, 150);
    const subject = P.bus(svg, {
      letter,
      color: letter === "A" ? C.busA : C.busB,
      seed: letter === "A" ? 51 : 64,
    });
    subject.render({ x: 125, y: 141, s: 1, face: 1, door: 0, op: 1 });
    return svg.outerHTML;
  }

  function puppet(pose) {
    const svg = svgRoot(300, 430);
    const subject = P.puppet(svg, {});
    subject.render({ x: 150, y: 419, s: 1, hop: 0, ...P.POSES[pose] });
    return svg.outerHTML;
  }

  function stop() {
    const svg = svgRoot(180, 290);
    P.piece(svg, P.cutRect(85, 54, 10, 225, { r: 3, seed: 85 }), C.kraftDeep);
    P.piece(svg, P.cutEllipse(90, 55, 42, 42, { seed: 86 }), C.cream,
      { stroke: C.inkSoft, strokeWidth: 3, lift: 2 });
    P.piece(svg, P.cutRect(67, 39, 46, 28, { r: 7, seed: 87 }), C.road);
    P.el("rect", { x: 72, y: 44, width: 36, height: 11, rx: 2, fill: C.window }, svg);
    P.piece(svg, P.cutRect(94, 130, 67, 92, { r: 2, seed: 88 }), C.cream,
      { lift: 1 });
    for (const y of [148, 165, 182, 199]) {
      P.el("path", { d: `M103 ${y}H149`, stroke: C.kraftDark, "stroke-width": 3 }, svg);
    }
    return svg.outerHTML;
  }

  function riders(count) {
    const svg = svgRoot(300, 160);
    for (let index = 0; index < count; index += 1) {
      P.rider(svg, 25 + index * 42, 150, 0.82, 100 + index * 11);
    }
    return svg.outerHTML;
  }

  function gapGauge(aheadA, aheadB) {
    const svg = svgRoot(760, 238);
    const left = 710 * aheadA / 20;
    P.string(svg, 60, -90, 60, 37);
    P.string(svg, 700, -90, 700, 37);
    P.piece(svg, P.cutRect(18, 32, 724, 72, { r: 4, seed: 90 }),
      C.kraftLight, { lift: 2 });
    P.piece(svg, P.cutRect(25, 40, left, 56, { r: 2, seed: 91 }), C.busA);
    P.piece(svg, P.cutRect(25 + left, 40, 710 - left, 56,
      { r: 2, seed: 92 }), C.busB);
    P.splitPin(svg, 25 + left, 68, 10);
    for (let minute = 0; minute <= 20; minute += 1) {
      const x = 25 + minute * 35.5;
      P.el("path", { d: `M${x} 29V${minute % 5 === 0 ? 42 : 36}`,
        stroke: C.kraftDeep, "stroke-width": 2.5 }, svg);
    }
    P.el("circle", { cx: 65, cy: 68, r: 21, fill: C.cream,
      stroke: C.ink, "stroke-width": 2.5 }, svg);
    P.el("circle", { cx: 696, cy: 68, r: 21, fill: C.cream,
      stroke: C.ink, "stroke-width": 2.5 }, svg);
    P.text(svg, { x: 65, y: 69, text: "A", size: 30, weight: 900,
      font: "display", anchor: "middle", baseline: "central" });
    P.text(svg, { x: 696, y: 69, text: "B", size: 30, weight: 900,
      font: "display", anchor: "middle", baseline: "central" });

    P.piece(svg, P.cutRect(38, 133, 270, 88, { r: 3, seed: 93 }), C.cream,
      { lift: 2 });
    P.piece(svg, P.cutRect(452, 133, 270, 88, { r: 3, seed: 94 }), C.cream,
      { lift: 2 });
    P.string(svg, 130, 96, 130, 133);
    P.string(svg, 630, 96, 630, 133);
    P.text(svg, { x: 173, y: 166, text: "ahead of A", size: 30,
      weight: 700, font: "body", anchor: "middle" });
    P.text(svg, { x: 587, y: 166, text: "ahead of B", size: 30,
      weight: 700, font: "body", anchor: "middle" });
    P.text(svg, { x: 173, y: 204, text: `${aheadA} min`, size: 43,
      weight: 900, font: "display", anchor: "middle" });
    P.text(svg, { x: 587, y: 204, text: `${aheadB} min`, size: 43,
      weight: 900, font: "display", anchor: "middle" });
    return svg.outerHTML;
  }

  function titleCard() {
    const svg = svgRoot(1090, 380);
    P.string(svg, 170, -50, 170, 58);
    P.string(svg, 902, -50, 902, 58);
    P.piece(svg, P.cutRect(26, 48, 1030, 286, { r: 5, seed: 100 }),
      C.cream, { lift: 3 });
    P.piece(svg, P.cutRect(80, 300, 586, 16, { r: 2, seed: 101 }), C.busA);
    P.splitPin(svg, 170, 55, 9);
    P.splitPin(svg, 902, 55, 9);
    P.text(svg, { x: 88, y: 162, text: "Why do buses", size: 104,
      weight: 900, font: "display" });
    P.text(svg, { x: 88, y: 281, text: "come in bunches?", size: 104,
      weight: 900, font: "display" });
    return svg.outerHTML;
  }

  function feedbackWheel() {
    const svg = svgRoot(620, 260);
    P.piece(svg, P.cutEllipse(310, 132, 282, 110, { seed: 102 }), C.kraftLight,
      { lift: 2 });
    P.splitPin(svg, 310, 132, 12);
    const labels = [
      ["LATE", 310, 50], ["RIDERS", 480, 128],
      ["BOARDING", 310, 216], ["LATER", 140, 128],
    ];
    for (const [label, x, y] of labels) {
      P.piece(svg, P.cutRect(x - 98, y - 24, 196, 49,
        { r: 3, seed: x + y }), C.cream, { lift: 2 });
      P.text(svg, { x, y: y + 8, text: label, size: 30,
        weight: 800, font: "display", anchor: "middle" });
    }
    P.el("path", { d: "M403 53Q492 51 506 92M495 161Q474 211 407 215M213 211Q127 209 116 165M123 91Q145 46 210 47",
      fill: "none", stroke: C.alarm, "stroke-width": 11,
      "stroke-linecap": "round", "marker-end": "url(#arrow)" }, svg);
    const defs = svg.querySelector("defs");
    const marker = P.el("marker", { id: "arrow", markerWidth: 8, markerHeight: 8,
      refX: 5, refY: 4, orient: "auto" }, defs);
    P.el("path", { d: "M0 0L8 4L0 8Z", fill: C.alarm }, marker);
    return svg.outerHTML;
  }

  function waitReveal() {
    const svg = svgRoot(1150, 360);
    P.piece(svg, P.cutRect(22, 36, 1104, 286, { r: 6, seed: 111 }),
      C.cream, { lift: 3 });
    P.text(svg, { x: 80, y: 185, text: "5.0", size: 190,
      weight: 900, font: "display", fill: C.fix });
    P.text(svg, { x: 451, y: 175, text: "→", size: 148,
      weight: 800, font: "display", fill: C.inkSoft });
    P.text(svg, { x: 615, y: 185, text: "9.1", size: 190,
      weight: 900, font: "display", fill: C.alarm });
    P.text(svg, { x: 925, y: 185, text: "min", size: 86,
      weight: 900, font: "display" });
    P.text(svg, { x: 110, y: 260, text: "10 + 10", size: 37,
      weight: 700, font: "body", fill: C.inkSoft });
    P.text(svg, { x: 632, y: 260, text: "19 + 1", size: 37,
      weight: 700, font: "body", fill: C.inkSoft });
    return svg.outerHTML;
  }

  window.kit = {
    C,
    chrome: {
      tag: (value) => `<div class="pd-tag">${value}</div>`,
      stamp: (value) => `<div class="pd-stamp"><span>${value}</span></div>`,
      source: (value) => `<div class="pd-source">${value}</div>`,
      tagBox: { x: 72, y: 60, w: 1180, h: 108, pad: 36 },
      stampBox: { x: 1490, y: 64, w: 360, h: 78 },
      sourceBox: { x: 74, y: 1006, w: 1720, h: 43 },
    },
    world,
    bus,
    puppet,
    stop,
    riders,
    gapGauge,
    titleCard,
    feedbackWheel,
    waitReveal,
  };
})();
