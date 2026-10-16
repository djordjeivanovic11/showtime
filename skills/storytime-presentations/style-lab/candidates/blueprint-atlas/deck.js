/* "Why do buses come in bunches?" — five states built from kit.js (BP). */
(function () {
  "use strict";
  const T = BP.T;

  /* ---------- the world ---------- */

  // Stadium loop: 8 stops, one lap = 20 minutes, so 1 minute = length / 20.
  const ROUTE = BP.stadium(260, 210);
  const LAP = ROUTE.length;
  const MIN = LAP / 20;
  const STOP_S = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => (k * LAP) / 8);
  const CHAR_AT = [74, 264]; // the Surveyor stands beside stop 1
  const BUS = { L: 96, W: 34, H: 44 };

  const BUILDINGS = [
    { x: -130, y: -36, L: 150, W: 104, H: 44 },
    { x: 120, y: 22, L: 168, W: 112, H: 66 },
    { x: -40, y: 110, L: 96, W: 40, H: 24 },
    { x: -560, y: -330, L: 120, W: 70, H: 140 },
    { x: -420, y: -340, L: 110, W: 60, H: 96 },
    { x: -280, y: -330, L: 120, W: 70, H: 170 },
    { x: -130, y: -345, L: 110, W: 60, H: 110 },
    { x: 20, y: -330, L: 130, W: 70, H: 150 },
    { x: 170, y: -345, L: 110, W: 60, H: 90 },
    { x: 310, y: -330, L: 120, W: 70, H: 160 },
    { x: 460, y: -340, L: 120, W: 60, H: 110 },
    { x: 600, y: -330, L: 110, W: 70, H: 136 },
  ];
  const TREES = [
    [-390, 300, 26], [-262, 336, 22], [300, 318, 24], [430, 296, 28], [575, 120, 24],
    [-610, -40, 26], [630, -150, 22], [-580, 170, 22], [-205, 96, 20], [236, -108, 20],
  ];

  const CAM_CLOSE = { camX: 1240, camY: 566, camS: 2.0 };
  const CAM_WIDE = { camX: 960, camY: 722, camS: 1.1 };
  const CAM_PLAN = { camX: 1322, camY: 734, camS: 0.94 };

  const TITLE = ["Why do buses", "come in bunches?"];
  const TAGS = [
    "",
    "every 10 minutes, on paper",
    "one crowded stop",
    "late buses get later",
    "same buses, nearly double the wait",
  ];
  const NOTES = [
    "You wait twenty minutes for a bus, and then three arrive together. It isn't bad luck. It's a feedback loop, and once you see it, you can't unsee it.",
    "Let's slow it down with two buses on a loop line: eight stops, one bus every ten minutes. This gauge tracks the gap between them. On paper, the gaps are equal: ten and ten.",
    "Now one stop gets crowded. Bus A takes longer to board everyone and falls two minutes behind. The gap in front of it grows to twelve; the gap behind shrinks to eight.",
    "Here's the loop. A late bus finds more people waiting, so it boards longer and gets later still. The bus behind finds empty stops and speeds up. Soon the gaps are nineteen and one. The buses have bunched.",
    "Same buses, same schedule. But if you arrive at a random moment, your average wait goes from five minutes to about nine. Nothing broke. The fix isn't more buses; it's holding the early bus for a minute.",
  ];
  const SOURCE = "illustrative scenario · avg wait = Σ gap² ÷ (2 · Σ gap), riders arrive at random";
  const FEEDBACK = ["LATE BUS", "MORE RIDERS", "LONGER BOARDING", "LATER BUS"];
  const INSET = { x: 56, y: 166, w: 740, h: 610 };

  /* ---------- state parameters ---------- */

  const POSE_KEYS = Object.keys(BP.POSES.wait);
  function pose(name) {
    const out = {};
    POSE_KEYS.forEach((k) => (out["p_" + k] = BP.POSES[name][k]));
    return out;
  }
  function riders(counts) {
    const out = {};
    counts.forEach((c, i) => (out["r" + i] = c));
    return out;
  }

  const BASE = Object.assign(
    {
      aS: 0, bS: 0, cS: 0, cO: 0,
      flagO: 0, aFO: 1, bFO: 1, aFx: -70, aFy: -78, bFx: 70, bFy: -78,
      stopsO: 0, gapO: 0, farO: 0, charK: 0.88,
      gaugeO: 0, gaugeV: 10, gaugeX: 570, gaugeY: 214,
      titleO: 0, tagO: 1, tagMix: 1,
      detailO: 0, dRiders: 6, dwellO: 0, markO: 0,
      ringP: 0, fb0: 0, fb1: 0, fb2: 0, fb3: 0,
      revealO: 0, dim1O: 0, dim2O: 0, revO: 0,
    },
    riders([1, 1, 1, 1, 1, 1, 1, 1]),
    pose("wait"),
  );

  // Stop indices are 0-based here; labels on screen are 1-based (stop 7 = index 6).
  const CROWDED = 7;
  const STATES = [
    Object.assign({}, BASE, CAM_CLOSE, pose("peer"), riders([2, 1, 1, 1, 1, 1, 1, 1]), {
      // Three buses nose to tail on the approach to stop 1 (s = LAP + x).
      bS: LAP - 112, aS: LAP - 226, cS: LAP - 340, cO: 1,
      titleO: 1, tagO: 0, farO: 0.5, charK: 0.98,
    }),
    Object.assign({}, BASE, CAM_WIDE, {
      // Scheduled: B is exactly 10 min (half a lap) ahead of A.
      aS: 0.2 * LAP, bS: 0.2 * LAP + 10 * MIN, cS: LAP - 340, cO: 0,
      flagO: 1, stopsO: 1, gapO: 1, gaugeO: 1, gaugeV: 10, gaugeX: 570,
    }),
    Object.assign({}, BASE, CAM_PLAN, pose("watch"), riders([1, 1, 1, 1, 1, 1, 1, 6]), {
      // A is stuck boarding at crowded stop 8 and has fallen 2 min behind:
      // B is now 12 min ahead of A.
      // (A halts just upstream of the shelter so the shelter does not hide it.)
      aS: STOP_S[CROWDED] - 64, bS: STOP_S[CROWDED] - 64 + 12 * MIN, cS: LAP - 340,
      aFx: 40, aFy: -96, bFx: -40, bFy: -86,
      flagO: 1, stopsO: 1, gapO: 1, gaugeO: 1, gaugeV: 12, gaugeX: 930,
      detailO: 1, dRiders: 6, dwellO: 1, markO: 1,
    }),
    Object.assign({}, BASE, CAM_PLAN, pose("alarm"), riders([4, 2, 2, 1, 1, 0, 0, 0]), {
      // A crawls toward stop 1 where riders pile up; B raced round the empty
      // stops and is now 1 min behind A, so the gap ahead of A is 19 min.
      aS: LAP - 119, bS: LAP - 119 - 1 * MIN, cS: LAP - 340,
      aFx: 10, aFy: -104, bFx: -70, bFy: -104,
      flagO: 1, stopsO: 1, gapO: 1, gaugeO: 1, gaugeV: 19, gaugeX: 930,
      detailO: 1, dRiders: 9, dwellO: 0, markO: 1,
      ringP: 1, fb0: 1, fb1: 1, fb2: 1, fb3: 1,
    }),
    Object.assign({}, BASE, CAM_CLOSE, pose("present"), riders([0, 1, 1, 1, 1, 1, 1, 1]), {
      aS: 40, bS: LAP + 40 - 1 * MIN, cS: LAP - 340,
      flagO: 1, aFO: 0, bFx: -10, bFy: -96, farO: 0.5, charK: 0.98,
      revealO: 1, dim1O: 1, dim2O: 1, revO: 1,
    }),
  ];

  // Per-key [delay ms, duration ms] when advancing INTO state n.
  const TIMING = [
    { "*": [0, 700] },
    {
      "*": [0, 900], titleO: [0, 350], tagMix: [250, 500], tagO: [250, 400], farO: [0, 600],
      camX: [0, 1000], camY: [0, 1000], camS: [0, 1000], charK: [0, 1000], aS: [0, 1150], bS: [0, 1150], cO: [0, 500],
      stopsO: [700, 400], flagO: [800, 400], gaugeO: [900, 500], gapO: [1100, 400],
    },
    {
      "*": [0, 800], tagMix: [0, 500],
      camX: [0, 800], camY: [0, 800], camS: [0, 800], gaugeX: [0, 800], aS: [0, 1000], bS: [0, 1000], gaugeV: [150, 850],
      r7: [250, 700], detailO: [800, 450], markO: [900, 400], dwellO: [1250, 400],
    },
    {
      "*": [0, 900], tagMix: [0, 500], aS: [0, 1000], bS: [0, 1000], gaugeV: [0, 1000],
      bFy: [0, 1000], ringP: [900, 600], fb0: [1350, 280], fb1: [1600, 280], fb2: [1850, 280], fb3: [2100, 280],
      dRiders: [300, 600], dwellO: [0, 300],
    },
    {
      "*": [0, 900], tagMix: [0, 500], gaugeO: [0, 400], detailO: [0, 400], markO: [0, 300],
      ringP: [0, 300], fb0: [0, 300], fb1: [0, 300], fb2: [0, 300], fb3: [0, 300], stopsO: [0, 300], gapO: [0, 300],
      camX: [100, 1100], camY: [100, 1100], camS: [100, 1100], aS: [0, 1200], bS: [0, 1200],
      charK: [100, 1100], farO: [300, 800],
      revealO: [1100, 450], dim1O: [1400, 400], dim2O: [1650, 450], revO: [2000, 450],
    },
  ];

  /* ---------- scene graph (persistent ids) ---------- */

  let L = {}; // layers
  let tagApi = null;
  let tagFrom = "", tagTo = "";
  let widths = {};

  function build() {
    const svg = document.getElementById("sheet");
    BP.buildSheet(svg);
    L.ground = BP.el("g", { id: "ground" }, svg);
    L.route = BP.el("g", { id: "route" }, L.ground);
    L.gaps = BP.el("g", { id: "gap-arcs" }, L.ground);
    L.world = BP.el("g", { id: "world" }, svg);
    // Persistent world objects: one <g> each, reordered by depth per frame.
    L.objs = {};
    BUILDINGS.forEach((b, i) => (L.objs["bldg" + i] = BP.el("g", { id: "bldg" + i }, L.world)));
    TREES.forEach((t, i) => (L.objs["tree" + i] = BP.el("g", { id: "tree" + i }, L.world)));
    STOP_S.forEach((s, i) => {
      L.objs["stop" + i] = BP.el("g", { id: "stop" + (i + 1) }, L.world);
      L.objs["riders" + i] = BP.el("g", { id: "riders-stop" + (i + 1) }, L.world);
    });
    L.objs.busA = BP.el("g", { id: "busA" }, L.world);
    L.objs.busB = BP.el("g", { id: "busB" }, L.world);
    L.objs.busC = BP.el("g", { id: "busC" }, L.world);
    L.objs.character = BP.el("g", { id: "character" }, L.world);
    L.labels = BP.el("g", { id: "labels" }, svg);
    L.key = BP.el("g", { id: "plan-key" }, svg);
    L.gauge = BP.el("g", { id: "gauge" }, svg);
    L.detail = BP.el("g", { id: "detail" }, svg);
    L.reveal = BP.el("g", { id: "reveal" }, svg);
    L.chrome = BP.el("g", { id: "chrome" }, svg);
    BP.plateFrame(L.chrome);
    BP.stamp(L.chrome, "ILLUSTRATIVE");
    L.source = BP.sourceLine(L.chrome, SOURCE);
    L.titleBlock = BP.el("g", { id: "titleblock-wrap" }, L.chrome);
    tagApi = BP.tag(L.chrome);
    TAGS.forEach((t) => (widths[t] = t ? tagApi.measure(t) : 0));
    L.title = BP.el("g", { id: "title" }, svg);
    // Title cartouche: a drawing's title panel, so the title reads over the plan.
    BP.el("rect", { x: 40, y: 56, width: 900, height: 386, fill: T.groundDeep, "fill-opacity": 0.86, stroke: T.ink, "stroke-width": 2.4 }, L.title);
    BP.el("rect", { x: 48, y: 64, width: 884, height: 370, fill: "none", stroke: T.ink, "stroke-width": 1 }, L.title);
    BP.text(L.title, 76, 112, "PLATE 0 · TRANSIT LOOP STUDY", "bp-small", { fill: T.inkSoft, "font-size": 24 });
    BP.el("line", { x1: 76, y1: 132, x2: 904, y2: 132, stroke: T.ink, "stroke-width": 2 }, L.title);
    BP.text(L.title, 70, 256, TITLE[0], "bp-title");
    BP.text(L.title, 70, 380, TITLE[1], "bp-title");
  }

  /* ---------- drawing ---------- */

  function busPose(s) {
    const p = ROUTE.at(s);
    return { x: p.x, y: p.y, tx: p.tx, ty: p.ty };
  }

  function drawRoute(cam) {
    BP.clear(L.route);
    const outer = BP.projectAll(cam, ROUTE.sample(0, LAP, 20, 10));
    const inner = BP.projectAll(cam, ROUTE.sample(0, LAP, -20, 10));
    BP.el("path", { d: BP.d(outer, true) + BP.d(inner, true), "fill-rule": "evenodd", fill: T.groundLift, "fill-opacity": 0.75 }, L.route);
    BP.el("path", { d: BP.d(outer, true), fill: "none", stroke: T.ink, "stroke-width": 2.2 }, L.route);
    BP.el("path", { d: BP.d(inner, true), fill: "none", stroke: T.ink, "stroke-width": 2.2 }, L.route);
    const curb = BP.projectAll(cam, ROUTE.sample(0, LAP, 32, 10));
    BP.el("path", { d: BP.d(curb, true), fill: "none", stroke: T.inkSoft, "stroke-width": 1, opacity: 0.6 }, L.route);
    const centre = BP.projectAll(cam, ROUTE.sample(0, LAP, 0, 10));
    BP.el("path", { d: BP.d(centre, true), fill: "none", stroke: T.inkSoft, "stroke-width": 1.4, "stroke-dasharray": "10 10", opacity: 0.8 }, L.route);
  }

  function drawGapArcs(cam, p) {
    BP.clear(L.gaps);
    if (p.gapO < 0.01) return;
    // Solid arc = gap from A forward to B; dashed = B forward to A (same as gauge).
    let a = p.aS, b = p.bS;
    while (b < a) b += LAP;
    while (b - a > LAP) b -= LAP;
    const g = BP.el("g", { opacity: p.gapO }, L.gaps);
    const solid = BP.projectAll(cam, ROUTE.sample(a + 50, b - 50, -34, 8));
    const dashed = BP.projectAll(cam, ROUTE.sample(b + 50, a + LAP - 50, -34, 8));
    if (b - a > 110) BP.el("path", { d: BP.d(solid), fill: "none", stroke: T.data, "stroke-width": 4.5, "stroke-linecap": "round" }, g);
    if (a + LAP - b > 110) BP.el("path", { d: BP.d(dashed), fill: "none", stroke: T.data, "stroke-width": 4.5, "stroke-dasharray": "14 10" }, g);
  }

  function drawWorld(cam, p) {
    const items = [];
    // Back-row buildings are context only: faded in the plan views.
    BUILDINGS.forEach((b, i) => items.push({ id: "bldg" + i, depth: b.y + b.W / 2, opacity: b.y < -250 ? p.farO : 0.8, draw: (g) => BP.building(g, cam, b) }));
    TREES.forEach((t, i) => items.push({ id: "tree" + i, depth: t[1] + t[2], draw: (g) => BP.tree(g, cam, t[0], t[1], t[2]) }));
    // In the close-ups the far side of the loop recedes so the headline
    // annotations read cleanly over it.
    const far = BP.lerp(1, 0.35, BP.clamp((p.camS - 1.1) / 0.9, 0, 1));
    STOP_S.forEach((s, i) => {
      const r = ROUTE.at(s);
      const sx = r.x + r.nx * 42, sy = r.y + r.ny * 42;
      const o = sy < -150 ? far : 1;
      items.push({ id: "stop" + i, depth: sy, opacity: o, draw: (g) => BP.shelter(g, cam, sx, sy, r.tx, r.ty) });
      items.push({ id: "riders" + i, depth: sy + 20, opacity: o, draw: (g) => drawRiders(g, cam, i, p["r" + i]) });
    });
    [["busA", p.aS, "A", 1, true], ["busB", p.bS, "B", 1, false], ["busC", p.cS, "", p.cO, false]].forEach((bus) => {
      const bp = busPose(bus[1]);
      items.push({
        id: bus[0], depth: bp.y + 18, opacity: bus[3],
        draw: (g) => BP.planBus(g, cam, Object.assign({}, bp, BUS, { letter: bus[2], hatch: bus[4] })),
      });
    });
    const cp = BP.project(cam, CHAR_AT[0], CHAR_AT[1], 0);
    const charPose = {};
    POSE_KEYS.forEach((k) => (charPose[k] = p["p_" + k]));
    items.push({ id: "character", depth: CHAR_AT[1] + 4, draw: (g) => BP.figure(g, cp[0], cp[1], cam.s * p.charK, charPose) });
    items.sort((u, v) => u.depth - v.depth);
    items.forEach((it) => {
      const g = L.objs[it.id];
      BP.clear(g);
      g.setAttribute("opacity", it.opacity === undefined ? 1 : it.opacity.toFixed(3));
      if (it.opacity === undefined || it.opacity > 0.01) it.draw(g);
      L.world.appendChild(g); // re-append = painter's order
    });
  }

  function drawRiders(g, cam, stopIndex, count) {
    if (count <= 0.01) return;
    const r = ROUTE.at(STOP_S[stopIndex]);
    // A crowd of 4+ gets a hatched "crowding zone" on the pavement.
    const zoneO = BP.clamp((count - 3) / 2, 0, 1);
    if (zoneO > 0.01) {
      const pts = [];
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const u = -66 + Math.cos(a) * 74, v = 70 + Math.sin(a) * 34;
        pts.push(BP.project(cam, r.x + r.tx * u + r.nx * v, r.y + r.ty * u + r.ny * v, 0));
      }
      BP.el("path", { d: BP.d(pts, true), fill: "url(#bp-hatch-alarm)", stroke: T.alarm, "stroke-width": 2.6, opacity: zoneO }, g);
    }
    const n = Math.ceil(count - 1e-6);
    for (let i = 0; i < n; i++) {
      const o = BP.clamp(count - i, 0, 1);
      // Two-deep queue along the kerb, beside the shelter.
      const row = i % 2, col = Math.floor(i / 2);
      let u = -44 - col * 22 + row * 8;
      if (stopIndex === 0) u = -50 - i * 20;
      const off = 58 + row * 18;
      const wx = r.x + r.tx * u + r.nx * off;
      const wy = r.y + r.ty * u + r.ny * off;
      const sp = BP.project(cam, wx, wy, 0);
      const rg = BP.el("g", { opacity: o.toFixed(3) }, g);
      BP.rider(rg, sp[0], sp[1], cam.s * 0.29, i + stopIndex);
    }
  }

  function drawLabels(cam, p) {
    BP.clear(L.labels);
    if (p.stopsO > 0.01) {
      STOP_S.forEach((s, i) => {
        const r = ROUTE.at(s);
        // Near-side stops put their bubble on the kerb in front of the shelter
        // so it never sits on top of a bus; far-side bubbles float above.
        const nearSide = r.ny > 0.5;
        const sp = nearSide
          ? BP.project(cam, r.x + r.nx * 100, r.y + r.ny * 100, 0)
          : BP.project(cam, r.x + r.nx * 42, r.y + r.ny * 42, 74);
        const stem = nearSide
          ? BP.project(cam, r.x + r.nx * 50, r.y + r.ny * 50, 0)
          : BP.project(cam, r.x + r.nx * 42, r.y + r.ny * 42, 34);
        const g = BP.el("g", { opacity: p.stopsO }, L.labels);
        BP.el("line", { x1: stem[0], y1: stem[1], x2: sp[0], y2: sp[1] + (nearSide ? -22 : 22), stroke: T.inkSoft, "stroke-width": 1.4 }, g);
        BP.bubble(g, sp[0], sp[1], String(i + 1), { r: 22, fontSize: 28 });
      });
    }
    if (p.flagO > 0.01) {
      [["BUS A", p.aS, p.aFx, p.aFy, p.aFO], ["BUS B", p.bS, p.bFx, p.bFy, p.bFO]].forEach((f) => {
        if (f[4] < 0.01) return;
        const bp = busPose(f[1]);
        const roof = BP.project(cam, bp.x, bp.y, BUS.H + 6);
        const lx = roof[0] + f[2], ly = roof[1] + f[3];
        const g = BP.el("g", { opacity: p.flagO * f[4] }, L.labels);
        BP.leader(g, [roof, [lx, ly + 8]], { color: T.ink, sw: 1.8 });
        BP.boxLabel(g, lx, ly, f[0], { fontSize: 30, fill: T.groundDeep, sw: 2 });
      });
    }
    if (p.markO > 0.01) {
      // Detail callout on the plan: dashed circle on Bus A, leader to the inset.
      const bp = busPose(p.aS);
      const c = BP.project(cam, bp.x, bp.y, BUS.H / 2);
      const g = BP.el("g", { opacity: p.markO }, L.labels);
      BP.el("circle", { cx: c[0], cy: c[1], r: 70, fill: "none", stroke: T.ink, "stroke-width": 2.2, "stroke-dasharray": "10 7" }, g);
      // Leader from the callout circle to the inset's bottom-right corner.
      const cx = INSET.x + INSET.w, cy = INSET.y + INSET.h;
      const ang = Math.atan2(cy - c[1], cx - c[0]);
      BP.el("path", { d: `M${c[0] + 70 * Math.cos(ang)} ${c[1] + 70 * Math.sin(ang)}L${cx} ${cy}`, stroke: T.ink, "stroke-width": 1.8, fill: "none" }, g);
      BP.el("circle", { cx: cx, cy: cy, r: 5, fill: T.ink }, g);
    }
  }

  function drawPlanKey(cam, p) {
    BP.clear(L.key);
    if (p.stopsO < 0.01) return;
    const g = BP.el("g", { opacity: p.stopsO }, L.key);
    BP.northArrow(g, 92, 928, 28);
    BP.scaleBar(g, 160, 944, MIN * cam.s, 2, "min");
  }

  function drawGauge(p) {
    BP.clear(L.gauge);
    if (p.gaugeO < 0.01) return;
    BP.caliper(L.gauge, {
      x: p.gaugeX, y: p.gaugeY, width: 780, total: 20, value: p.gaugeV,
      labels: ["A", "B", "A"], title: "GAP GAUGE", sumLabel: "Σ gap = 20 min (one lap)",
      alarm: p.gaugeV > 15.5, opacity: p.gaugeO,
    });
  }

  function drawDetail(p) {
    BP.clear(L.detail);
    if (p.detailO < 0.01) return;
    const X = INSET.x, Y = INSET.y, W = INSET.w, H = INSET.h;
    const inset = BP.inset(L.detail, X, Y, W, H, "DETAIL · BUS A", p.detailO);
    const g = inset.content;
    const groundY = Y + 440;
    // Kerb and ground line.
    BP.el("line", { x1: X + 30, y1: groundY, x2: X + W - 30, y2: groundY, stroke: T.ink, "stroke-width": 2.4 }, g);
    BP.el("rect", { x: X + 30, y: groundY, width: W - 60, height: 14, fill: "url(#bp-hatch-soft)" }, g);
    const bus = BP.elevationBus(g, X + 56, groundY, 380, { letter: "A", doorOpen: 1, hatch: true });
    // Shelter on the right.
    const shx = X + 500;
    BP.el("path", { d: `M${shx} ${groundY}V${groundY - 190}H${shx + 160}V${groundY - 176}H${shx + 14}V${groundY}`, fill: "none", stroke: T.inkSoft, "stroke-width": 2 }, g);
    // Queue of riders walking to the door.
    const n = Math.ceil(p.dRiders - 1e-6);
    for (let i = 0; i < n; i++) {
      const o = BP.clamp(p.dRiders - i, 0, 1);
      // Front row of up to 5, the rest queue behind (smaller, higher).
      const row = i < 5 ? 0 : 1;
      const col = row ? i - 5 : i;
      const x = X + 484 + col * 46 + row * 23;
      const y = groundY - row * 16;
      const rg = BP.el("g", { opacity: o.toFixed(3) }, row ? g : g);
      BP.rider(rg, x, y, 0.54 - row * 0.06, i + 1);
    }
    if (p.dwellO > 0.01) {
      const dg = BP.el("g", { opacity: p.dwellO }, g);
      const dx = bus.doorX + bus.doorW / 2;
      BP.leader(dg, [[dx, bus.top + 20], [dx, Y + 190], [dx + 30, Y + 190]], { color: T.data });
      BP.boxLabel(dg, dx + 38, Y + 201, "BOARDING +2 MIN", { anchor: "start", fontSize: 32, color: T.data, stroke: T.data });
    }
    if (p.ringP > 0.01) {
      BP.feedbackRing(g, {
        cx: X + 370, cy: Y + 350, rx: 318, ry: 232, color: T.alarm,
        ringOpacity: 1, ringProgress: p.ringP,
        labels: FEEDBACK.map((t, i) => ({ text: t, o: p["fb" + i] })),
      });
    }
  }

  function drawReveal(cam, p) {
    BP.clear(L.reveal);
    if (p.revealO > 0.01) {
      const g = BP.el("g", { opacity: p.revealO }, L.reveal);
      // The headline number, lettered onto the sheet like a drawing callout.
      const t1 = BP.text(g, 64, 360, "5.0", "bp-giant halo-deep", { fill: T.inkSoft });
      const w1 = t1.getComputedTextLength();
      BP.arrowGlyph(g, 64 + w1 + 30, 300, 120, T.ink, 10);
      const t2 = BP.text(g, 64 + w1 + 180, 360, "9.1", "bp-giant halo-deep", { fill: T.data });
      const w2 = t2.getComputedTextLength();
      BP.text(g, 64 + w1 + 180 + w2 + 22, 360, "min", "bp-unit halo-deep", { fill: T.data });
      BP.text(g, 70, 424, "average wait", "bp-tag halo-deep", { fill: T.ink });
    }
    // Proportional dimension bars: 92 px per minute of average wait.
    const pxMin = 92, x0 = 70;
    if (p.dim1O > 0.01) {
      BP.dimension(L.reveal, x0, x0 + 5.0 * pxMin, 500, { dashed: true, color: T.inkSoft, ext: 26, opacity: p.dim1O, sw: 3 });
      BP.text(L.reveal, x0 + 5.0 * pxMin + 24, 510, "5.0 min · gaps 10 + 10", "bp-small halo-deep", { fill: T.inkSoft, "font-size": 28, opacity: p.dim1O });
    }
    if (p.dim2O > 0.01) {
      BP.dimension(L.reveal, x0, x0 + 9.05 * pxMin, 566, { color: T.data, ext: 26, opacity: p.dim2O, sw: 4 });
      BP.text(L.reveal, x0 + 9.05 * pxMin + 24, 576, "9.05 min · gaps 19 + 1", "bp-small halo-deep", { fill: T.data, "font-size": 28, opacity: p.dim2O });
    }
    if (p.revO > 0.01) {
      // Revision cloud around the early bus (B) with a revision delta.
      const bp = busPose(p.bS);
      const c = BP.project(cam, bp.x, bp.y, BUS.H / 2);
      const w = BUS.L * cam.s + 60, h = 150;
      const g = BP.el("g", { opacity: p.revO }, L.reveal);
      BP.revisionCloud(g, c[0] - w / 2, c[1] - h / 2 - 4, w, h, { bump: 30, sw: 3.4 });
      const lx = c[0] - w / 2 - 20, ly = c[1] + h / 2 + 66;
      BP.revDelta(g, lx - 30, ly - 11, "1");
      BP.boxLabel(g, lx + 6, ly, "HOLD THE EARLY BUS", { anchor: "start", fontSize: 34, color: T.fix, stroke: T.fix, sw: 2.4 });
    }
  }

  function drawChrome(p, state) {
    // Tag strip: text crossfades at the midpoint, width morphs.
    const mix = p.tagMix;
    const text = mix < 0.5 ? tagFrom : tagTo;
    const op = mix < 0.5 ? 1 - mix * 2 : mix * 2 - 1;
    const w = BP.lerp(widths[tagFrom] || widths[tagTo], widths[tagTo] || widths[tagFrom], BP.ease(BP.clamp(mix, 0, 1)));
    tagApi.set(text, state, w, op);
    tagApi.g.setAttribute("opacity", p.tagO.toFixed(3));
    L.title.setAttribute("opacity", p.titleO.toFixed(3));
    L.source.setAttribute("opacity", (1 - p.titleO).toFixed(3));
  }

  function drawTitleBlock(state) {
    BP.clear(L.titleBlock);
    BP.titleBlock(L.titleBlock, [
      ["SHEET", state + 1 + " / 5"],
      ["LOOP", "8 STOPS · 2 BUSES · LAP 20 MIN"],
    ], 520);
  }

  let last = null;
  let shownState = 0;
  function draw(p) {
    last = p;
    const cam = { x: p.camX, y: p.camY, s: p.camS };
    drawRoute(cam);
    drawGapArcs(cam, p);
    drawWorld(cam, p);
    drawLabels(cam, p);
    drawPlanKey(cam, p);
    drawGauge(p);
    drawDetail(p);
    drawReveal(cam, p);
    drawChrome(p, shownState);
  }

  /* ---------- navigation ---------- */

  let current = 0;
  let anim = null;
  let reduced = false;

  function target(n, from, forward) {
    const to = Object.assign({}, STATES[n]);
    // Buses always travel along the loop in the direction of the click.
    ["aS", "bS", "cS"].forEach((k) => {
      if (!from) return;
      let v = to[k];
      if (forward) { while (v < from[k] - 1) v += LAP; while (v - LAP >= from[k] - 1) v -= LAP; }
      else { while (v > from[k] + 1) v -= LAP; while (v + LAP <= from[k] + 1) v += LAP; }
      to[k] = v;
    });
    return to;
  }

  function show(n) {
    current = n;
    shownState = n;
    tagFrom = tagTo = TAGS[n];
    drawTitleBlock(n);
    draw(Object.assign({}, STATES[n], { tagMix: 1 }));
    updateNotes();
  }

  function goTo(n) {
    n = BP.clamp(Math.round(n), 0, STATES.length - 1);
    if (n === current && !anim) return;
    const forward = n > current;
    const from = Object.assign({}, last, { tagMix: 0 });
    const to = target(n, last, forward);
    to.tagMix = 1;
    tagFrom = TAGS[current] || TAGS[n];
    tagTo = TAGS[n] || TAGS[current];
    if (!TAGS[n]) { tagTo = tagFrom; }
    let timing = forward && n === current + 1 ? TIMING[n] : { "*": [0, 750] };
    if (reduced) timing = { "*": [0, 280] };
    if (anim) anim.cancel();
    current = n;
    shownState = n;
    drawTitleBlock(n);
    updateNotes();
    anim = BP.tween(from, to, timing, draw, { done: () => { anim = null; tagFrom = tagTo = TAGS[n]; } });
  }

  function updateNotes() {
    const el = document.getElementById("notes");
    if (el) el.querySelector("p").textContent = NOTES[current];
    const c = document.getElementById("notes-count");
    if (c) c.textContent = `state ${current} / ${STATES.length - 1}`;
  }

  function onKey(e) {
    if (["ArrowRight", " ", "PageDown", "Enter"].includes(e.key)) { e.preventDefault(); goTo(current + 1); }
    else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); goTo(current - 1); }
    else if (e.key === "n" || e.key === "N") document.getElementById("notes").classList.toggle("open");
    else if (e.key === "m" || e.key === "M") {
      reduced = !reduced;
      document.body.classList.toggle("reduced", reduced);
    }
  }

  async function start() {
    BP.fitStage(document.getElementById("stage"));
    await Promise.all([
      document.fonts.load("600 50px 'Barlow Condensed'"),
      document.fonts.load("700 50px 'Barlow Condensed'"),
      document.fonts.load("400 20px 'Plate Mono'", "Σ0"),
      document.fonts.load("700 20px 'Plate Mono'"),
    ]);
    await document.fonts.ready;
    reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.classList.toggle("reduced", reduced);
    build();
    const q = new URLSearchParams(location.search).get("state");
    show(q === null ? 0 : BP.clamp(parseInt(q, 10) || 0, 0, STATES.length - 1));
    window.addEventListener("keydown", onKey);
    document.getElementById("stage").addEventListener("click", () => goTo(current + 1));
    document.body.dataset.ready = "1";
  }

  window.deck = { count: STATES.length, goTo: goTo };
  start();
})();
