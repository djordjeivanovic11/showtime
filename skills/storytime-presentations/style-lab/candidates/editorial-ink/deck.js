/* "Why do buses come in bunches?" — five states in the Editorial Ink world.
 * Built only from kit.js primitives. Persistent objects: #character, #busA,
 * #busB, #route, #gauge, #shelter (with its poster).
 */
(async function () {
  "use strict";
  const I = window.Ink;
  const T = I.TOKENS;
  const stage = document.getElementById("stage");
  const svg = document.getElementById("art");
  const notesBox = document.getElementById("notes");

  I.fitStage(stage);
  I.paperTexture(stage);
  I.installDefs(svg);

  await Promise.all([
    document.fonts.load("600 100px Fraunces"),
    document.fonts.load("italic 400 56px Fraunces"),
    document.fonts.load("400 56px Fraunces"),
    document.fonts.load("600 28px 'Source Serif 4'"),
    document.fonts.load("italic 400 22px 'Source Serif 4'", "Σ gap² ÷"),
    document.fonts.load("700 40px Caveat"),
  ]);

  const SOURCE = "illustrative scenario · avg wait = Σ gap² ÷ (2 · Σ gap), riders arrive at random";
  const GROUND = 995;
  const MAP_BUS_SCALE = 0.5;

  // Layer stack, back to front.
  const L = {};
  for (const name of ["street", "map", "buses", "fore", "marks", "chrome"]) {
    L[name] = I.el("g", { id: "layer-" + name }, svg);
  }
  const layers = {};
  function layer(name, parent, opts = {}) {
    const g = I.el("g", { id: name }, parent);
    g.style.opacity = 0;
    layers[name] = { g, visible: false, ...opts };
    return g;
  }

  // ------------------------------------------------------------ street
  const street = layer("street", L.street);
  I.avenue(street, {
    vp: { x: 600, y: 590 },
    k: 2.2,
    kerbLeft: { x: -160, y: 1080 },
    kerbRight: { x: 1130, y: 1080 },
    lane: { x: 485, y: 1080 },
    left: {
      base0: { x: 0, y: 905 },
      top0: { x: 0, y: 340 },
      kerb: { x: -160, y: 1080 },
      edges: [0, 0.6, 1.3, 2.0, 2.9, 4, 5.5, 7.5, 10, 14, 20],
      heights: [1, 0.8, 0.95, 0.72, 1.05, 0.85, 0.9, 1.1, 0.8],
      rows: 5,
      lamps: [1.0, 3.4, 8],
      lampDir: 1,
      lampH: 420,
    },
    right: {
      base0: { x: 1920, y: 940 },
      top0: { x: 1920, y: 130 },
      kerb: { x: 1130, y: 1080 },
      edges: [0, 0.8, 1.7, 2.6, 3.8, 5.2, 7, 10, 14, 20],
      heights: [1, 0.86, 1.08, 0.8, 0.95, 1.1, 0.85, 1],
      rows: 7,
      shade: true,
    },
  });

  // ------------------------------------------------------------ map
  const map = layer("map", L.map);
  const R = { x0: 200, y0: 262, x1: 1060, y1: 712, r: 120 };
  const mapArt = I.el("g", { filter: "url(#rough)" }, map);
  I.river(mapArt, [
    { x: 92, y: 130 }, { x: 70, y: 300 }, { x: 104, y: 480 }, { x: 76, y: 660 }, { x: 98, y: 860 },
  ], 74, { id: "map-river", waves: 34 });
  // Park inside the loop: lawn, footpaths, fountain, pond, benches. It keeps
  // states 1-2 illustrated; state 3 dims it so the feedback loop reads on top.
  const lawn = { x: R.x0 + 40, y: R.y0 + 40, w: R.x1 - R.x0 - 80, h: R.y1 - R.y0 - 80 };
  I.el("rect", { x: lawn.x, y: lawn.y, width: lawn.w, height: lawn.h, rx: 70, fill: "url(#lawn)", stroke: T.ink, "stroke-width": 2, opacity: 0.8 }, mapArt);
  const parkG = I.el("g", {}, mapArt);
  I.parkPlan(parkG, lawn, {
    pond: { x: 430, y: 600 },
    trees: [[520, 360, 20], [770, 610, 22], [850, 560, 16], [470, 420, 14]],
  });
  [
    [282, 340, 34], [338, 316, 24], [980, 340, 32], [930, 312, 22],
    [282, 636, 32], [342, 664, 22], [980, 636, 34], [924, 664, 22],
    [176, 186, 26], [178, 780, 22], [1070, 160, 20],
  ].forEach(([x, y, r], i) => I.treeTop(mapArt, x, y, r, 40 + i));
  const routeCtl = I.route(map, { ...R, stops: 8, roadWidth: 46 });
  const cartoucheG = layer("cartouche", map, { enter: "fade" });
  I.cartouche(cartoucheG, 760, 372, ["the loop line", "8 stops · 20-min lap"], { size: 28 });
  // Her stop (stop 2 of 8, the one after the crowded stop): wordless
  // portrait marker instead of a "you are here" label.
  const herStop = routeCtl.stops[1];
  I.el("line", { x1: herStop.x, y1: herStop.y - 11, x2: herStop.x, y2: herStop.y - 40, stroke: T.ink, "stroke-width": 4 }, map);
  I.portrait(map, herStop.x, herStop.y - 74, 34);

  // Gap gauge = the loop unrolled, drawn as a map scale bar.
  const gaugeCtl = I.gauge(L.map, { id: "gauge", x: 230, y: 862, w: 800, total: 20, value: 10, caption: "minutes between buses" });
  gaugeCtl.g.style.opacity = 0;
  layers.gauge = { g: gaugeCtl.g, visible: false };

  // Crowd at stop 1 (top centre); riders appear one at a time.
  const crowdStop = routeCtl.stops[0];
  const crowdG = layer("crowd", L.map, { enter: "stagger" });
  // Lifted clear of the stop marker so the stop itself stays visible.
  I.crowd(crowdG, crowdStop.x, crowdStop.y - 34, 9, { spread: 300, h: 62, seed: 8 });

  // ------------------------------------------------------------ foreground
  const fore = L.fore;
  I.el("line", { x1: 1150, y1: GROUND + 2, x2: 1920, y2: GROUND + 2, stroke: T.ink, "stroke-width": 4 }, fore);
  I.el("rect", { x: 1150, y: GROUND + 4, width: 770, height: 90, fill: "url(#hatch-faint)" }, fore);
  const shelterCtl = I.shelter(fore, {
    id: "shelter",
    x: 1478,
    ground: GROUND,
    w: 392,
    h: 690,
    poster: { x: 1498, y: 360, w: 352, h: 500 },
  });
  I.stopPole(fore, 1530, GROUND - 690, 62, { box: false });
  const poster = shelterCtl.poster;
  const pcx = poster.x + poster.w / 2;

  const timetable = layer("timetable", poster.g, { enter: "fade" });
  I.caption(timetable, pcx, poster.y + 56, "timetable", { anchor: "middle", ls: 6, size: 28 });
  I.el("line", { x1: poster.x + 40, y1: poster.y + 80, x2: poster.x + poster.w - 40, y2: poster.y + 80, stroke: T.ink, "stroke-width": 2 }, timetable);
  I.text(timetable, pcx, poster.y + 160, "every", { size: 64, italic: true, anchor: "middle" });
  I.text(timetable, pcx, poster.y + 350, "10", { size: 230, weight: 600, anchor: "middle" });
  I.text(timetable, pcx, poster.y + 420, "min", { size: 64, anchor: "middle" });
  for (let i = 0; i < 3; i++) {
    I.el("line", { x1: poster.x + 60, y1: poster.y + 448 + i * 14, x2: poster.x + poster.w - 60, y2: poster.y + 448 + i * 14, stroke: T.ink, "stroke-width": 1.5, opacity: 0.4 }, timetable);
  }

  const reveal = layer("reveal", poster.g);
  I.caption(reveal, pcx, poster.y + 56, "average wait", { anchor: "middle", ls: 5, size: 30 });
  I.el("line", { x1: poster.x + 40, y1: poster.y + 80, x2: poster.x + poster.w - 40, y2: poster.y + 80, stroke: T.ink, "stroke-width": 2 }, reveal);
  I.text(reveal, pcx, poster.y + 162, "5.0 min", { size: 76, anchor: "middle", fill: T.inkSoft });
  I.el("path", { d: `M${pcx},${poster.y + 184} L${pcx},${poster.y + 236} M${pcx - 16},${poster.y + 220} L${pcx},${poster.y + 238} L${pcx + 16},${poster.y + 220}`, fill: "none", stroke: T.ink, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, reveal);
  I.text(reveal, pcx, poster.y + 412, "9.1", { size: 200, weight: 600, anchor: "middle" });
  I.text(reveal, pcx, poster.y + 474, "min", { size: 54, anchor: "middle" });

  // ------------------------------------------------------------ buses
  const buses = {
    A: I.bus(L.buses, { id: "busA", label: "A", fill: T.ink }),
    B: I.bus(L.buses, { id: "busB", label: "B", fill: T.blueWash }),
    C: I.bus(L.buses, { id: "busC", label: "", fill: T.paperLight }),
  };
  // Draw order: the nearer bus on top in street scenes.
  L.buses.appendChild(buses.C.g);
  L.buses.appendChild(buses.B.g);
  L.buses.appendChild(buses.A.g);
  buses.C.g.style.opacity = 0;
  layers.busC = { g: buses.C.g, visible: false, enter: "fade" };

  const character = I.character(L.fore, { id: "character", x: 1292, y: GROUND, scale: 1, pose: "wait" });

  // ------------------------------------------------------------ red pencil marks
  const marks = L.marks;
  const ringTen = layer("ringTen", marks);
  I.pencilRing(ringTen, pcx, poster.y + 270, 160, 96, { seed: 3 });

  const ringCrowd = layer("ringCrowd", marks);
  I.pencilRing(ringCrowd, crowdStop.x, crowdStop.y - 22, 220, 100, { seed: 5 });

  // Feedback loop, drawn in the park: four inked vignettes, red labels, red arrows.
  const loop = layer("loop", marks, { enter: "sequence" });
  const LC = { x: 630, y: 487, rx: 282, ry: 152 };
  const node = (a) => ({ x: LC.x + Math.cos(a) * LC.rx, y: LC.y + Math.sin(a) * LC.ry });
  function miniBus(parent, x, y, fill) {
    const g = I.el("g", { transform: `translate(${x} ${y}) scale(0.34)` }, parent);
    I.el("rect", { x: -110, y: -48, width: 220, height: 84, rx: 14, fill, stroke: T.ink, "stroke-width": 8 }, g);
    for (let i = 0; i < 5; i++) I.el("rect", { x: -98 + i * 40, y: -34, width: 28, height: 28, fill: T.paperLight, stroke: T.ink, "stroke-width": 5 }, g);
    I.el("circle", { cx: -66, cy: 38, r: 20, fill: T.ink }, g);
    I.el("circle", { cx: 64, cy: 38, r: 20, fill: T.ink }, g);
    return g;
  }
  const nTop = node(-Math.PI / 2);
  const nRight = node(0);
  const nBottom = node(Math.PI / 2);
  const nLeft = node(Math.PI);
  const vignettes = [];
  const boxes = [];
  function vignette(draw) {
    const g = I.el("g", {}, loop);
    draw(g);
    boxes.push(I.backCard(g, 14));
    vignettes.push(g);
  }
  vignette((g) => {
    miniBus(g, nTop.x - 92, nTop.y - 2, T.ink);
    I.clockIcon(g, nTop.x - 30, nTop.y - 6, 17, 10);
    I.pencilNote(g, nTop.x, nTop.y + 12, "LATE BUS", { size: 42, rotate: 0 });
  });
  vignette((g) => {
    I.crowd(g, nRight.x, nRight.y - 6, 5, { spread: 110, h: 42, seed: 2 });
    I.pencilNote(g, nRight.x, nRight.y + 38, "MORE RIDERS", { size: 38, rotate: 0, anchor: "middle" });
  });
  vignette((g) => {
    I.hourglassIcon(g, nBottom.x - 150, nBottom.y - 2, 0.7);
    I.pencilNote(g, nBottom.x - 118, nBottom.y + 12, "LONGER BOARDING", { size: 40, rotate: 0 });
  });
  vignette((g) => {
    miniBus(g, nLeft.x - 32, nLeft.y - 16, T.ink);
    I.clockIcon(g, nLeft.x + 52, nLeft.y - 20, 18, 25);
    I.pencilNote(g, nLeft.x, nLeft.y + 38, "LATER BUS", { size: 38, rotate: 0, anchor: "middle" });
  });
  // Arrows ride a slightly larger ellipse than the vignettes so they bow
  // outward and stay long enough to read as a cycle.
  const arrows = I.cycleArrows(loop, { ...LC, rx: LC.rx + 46, ry: LC.ry + 26 }, boxes, { gap: 12 });
  // Draw the loop in reading order: vignette, arrow, vignette, arrow...
  layers.loop.parts = vignettes.flatMap((v, i) => [v, arrows[i]].filter(Boolean));

  // Fix hint (state 4): margin note on a paper slip, arrow at the early bus.
  const fix = layer("fix", marks);
  const slip = I.el("g", {}, fix);
  I.pencilNote(slip, 96, 522, "HOLD THE EARLY BUS", { size: 46, rotate: -2 });
  I.backCard(slip, 18, { rx: 2, rotate: -2 });
  I.pencilArrow(fix, [{ x: 380, y: 556 }, { x: 410, y: 612 }, { x: 440, y: 650 }], { width: 6 });
  const ringNine = layer("ringNine", marks);
  I.pencilRing(ringNine, pcx, poster.y + 340, 176, 82, { seed: 9 });

  // ------------------------------------------------------------ chrome
  const chrome = L.chrome;
  const title = layer("title", chrome, { enter: "fade" });
  I.text(title, 80, 200, "Why do buses come", { size: 112, weight: 600 });
  const line2 = I.text(title, 80, 322, "in bunches?", { size: 112, weight: 600 });
  {
    const start = line2.getStartPositionOfChar(3).x;
    const width = line2.getSubStringLength(3, 7);
    I.pencil(title, `M${start - 6},344 C${start + width * 0.3},336 ${start + width * 0.7},350 ${start + width + 8},338`, { width: 7 });
  }
  const tagCtl = I.tag(chrome, { x: 80, y: 104 });
  I.stamp(chrome, "Illustrative");
  const sourceCtl = I.sourceLine(chrome);

  // ------------------------------------------------------------ states
  const STATES = [
    {
      tag: "",
      pose: "wait",
      show: ["street", "title", "timetable", "busC"],
      bus: { A: { x: 676, y: 770, s: 0.85 }, B: { x: 596, y: 720, s: 0.64 }, C: { x: 532, y: 684, s: 0.48 } },
      gap: 10,
      notes: "You wait twenty minutes for a bus, and then three arrive together. It isn't bad luck. It's a feedback loop, and once you see it, you can't unsee it.",
    },
    {
      tag: "every 10 minutes, on paper",
      pose: "read",
      show: ["map", "cartouche", "gauge", "timetable", "ringTen"],
      bus: { A: { f: -0.06 }, B: { f: 0.44 } },
      gap: 10,
      notes: "Let's slow it down with two buses on a loop line: eight stops, one bus every ten minutes. This gauge tracks the gap between them. On paper, the gaps are equal: ten and ten.",
    },
    {
      tag: "one crowded stop",
      pose: "watch",
      show: ["map", "cartouche", "gauge", "timetable", "crowd", "ringCrowd"],
      bus: { A: { f: 0 }, B: { f: 0.6 } },
      gap: 12,
      notes: "Now one stop gets crowded. Bus A takes longer to board everyone and falls two minutes behind. The gap in front of it grows to twelve; the gap behind shrinks to eight.",
    },
    {
      tag: "late buses get later",
      pose: "alarmed",
      show: ["map", "gauge", "timetable", "crowd", "loop"],
      park: 0.2,
      bus: { A: { f: 0.04 }, B: { f: 0.99 } },
      gap: 19,
      notes: "Here's the loop. A late bus finds more people waiting, so it boards longer and gets later still. The bus behind finds empty stops and speeds up. Soon the gaps are nineteen and one. The buses have bunched.",
    },
    {
      tag: "same buses, nearly double the wait",
      pose: "point",
      show: ["street", "reveal", "ringNine", "fix"],
      bus: { A: { x: 792, y: 1000, s: 1.9 }, B: { x: 540, y: 905, s: 1.42 } },
      gap: 19,
      notes: "Same buses, same schedule. But if you arrive at a random moment, your average wait goes from five minutes to about nine. Nothing broke. The fix isn't more buses; it's holding the early bus for a minute.",
    },
  ];

  // Bus placement: on the map a bus travels along the loop by fraction; in a
  // street scene it is a front view at (x, y, s).
  const busF = { A: null, B: null, C: null };
  function mapPlacement(f) {
    const p = routeCtl.at(f);
    return { x: p.x, y: p.y, s: MAP_BUS_SCALE, view: 1, flip: p.tx < -0.3 ? -1 : 1 };
  }
  function updateArcs() {
    if (busF.A !== null && busF.B !== null) routeCtl.setArcs(busF.A, busF.B);
  }
  function moveBus(name, spec, ms) {
    const ctl = buses[name];
    if (!spec) return Promise.resolve();
    const fromF = busF[name];
    if (spec.f !== undefined && fromF !== null) {
      return I.tween(ms, (t) => {
        busF[name] = I.lerp(fromF, spec.f, t);
        ctl.place(mapPlacement(busF[name]));
        updateArcs();
      });
    }
    const from = ctl.get();
    const to = spec.f !== undefined ? mapPlacement(spec.f) : { ...spec, view: 0, flip: 1 };
    busF[name] = spec.f !== undefined ? spec.f : null;
    updateArcs();
    return I.tween(ms, (t) =>
      ctl.place({
        x: I.lerp(from.x, to.x, t),
        y: I.lerp(from.y, to.y, t),
        s: I.lerp(from.s, to.s, t),
        view: I.lerp(from.view, to.view, t),
        flip: to.flip,
      }),
    );
  }

  function enter(item, delay) {
    if (item.enter === "fade") return I.show(item.g, { mode: "fade", ms: 500, delay });
    if (item.enter === "stagger") {
      item.g.style.opacity = 1;
      const kids = [...item.g.querySelector(".crowd").children];
      kids.forEach((k) => (k.style.opacity = 0));
      return Promise.all(kids.map((k, i) => I.fadeTo(k, 1, { ms: 260, delay: delay + i * 110 })));
    }
    if (item.enter === "sequence") {
      item.g.style.opacity = 1;
      item.parts.forEach((p) => (p.style.opacity = 0));
      return Promise.all(item.parts.map((p, i) => I.inkIn(p, { ms: 520, delay: delay + i * 260 })));
    }
    return I.inkIn(item.g, { ms: 1000, delay });
  }

  function reveal_instantly(item) {
    item.g.style.opacity = 1;
    if (item.parts) item.parts.forEach((p) => (p.style.opacity = 1));
    if (item.enter === "stagger") [...item.g.querySelector(".crowd").children].forEach((k) => (k.style.opacity = 1));
  }

  let current = -1;
  function apply(n, instant) {
    I.finishAll();
    const s = STATES[n];
    const ms = (v) => (instant ? 0 : v);

    for (const [name, item] of Object.entries(layers)) {
      if (item.visible && !s.show.includes(name)) {
        item.visible = false;
        I.hide(item.g, { instant, ms: 420 });
      }
    }
    tagCtl.set(s.tag, !instant);
    sourceCtl.set(n === 0 ? "" : SOURCE);
    character.setPose(s.pose, ms(800));
    for (const name of ["A", "B", "C"]) moveBus(name, s.bus[name], ms(950));
    gaugeCtl.set(s.gap, ms(950));
    I.fadeTo(parkG, s.park ?? 1, { ms: ms(500) });

    let order = 0;
    for (const name of s.show) {
      const item = layers[name];
      if (!item || item.visible) continue;
      item.visible = true;
      if (instant) reveal_instantly(item);
      else enter(item, 250 + order++ * 320);
    }
    notesBox.innerHTML = `<b>NOTES · ${n + 1} / ${STATES.length}</b>${s.notes}`;
    current = n;
  }

  window.deck = {
    count: STATES.length,
    goTo(n) {
      const target = Math.max(0, Math.min(STATES.length - 1, n));
      if (target !== current) apply(target, false);
    },
  };

  document.addEventListener("keydown", (e) => {
    if (["ArrowRight", " ", "PageDown", "Enter"].includes(e.key)) {
      e.preventDefault();
      window.deck.goTo(current + 1);
    } else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) {
      e.preventDefault();
      window.deck.goTo(current - 1);
    } else if (e.key === "n" || e.key === "N") {
      notesBox.classList.toggle("on");
    } else if (e.key === "m" || e.key === "M") {
      I.setReduced(!I.isReduced());
    }
  });

  // Idle life: an occasional blink (skipped under reduced motion).
  setInterval(() => {
    if (!I.isReduced()) character.blink();
  }, 4700);

  const params = new URLSearchParams(location.search);
  const start = Math.max(0, Math.min(STATES.length - 1, parseInt(params.get("state") || "0", 10) || 0));
  apply(start, true);
  requestAnimationFrame(() => (document.body.dataset.ready = "1"));
})();
