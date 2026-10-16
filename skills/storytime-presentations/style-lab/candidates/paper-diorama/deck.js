/*
 * "Why do buses come in bunches?" told in the Paper Diorama world.
 * Five states; every persistent object (planes, route, buses, gauge, Pip)
 * is built once and moved between states by Paper.director.
 */
(function () {
  "use strict";

  const P = window.Paper;
  const C = P.PALETTE;
  const stageEl = document.getElementById("stage");

  /* ---------- talk content (exact words and numbers from the brief) ---------- */

  const TITLE_LINES = ["Why do buses", "come in bunches?"];
  // Wait for the title banner / gauge to clear before pressing on a new tag.
  const TAG_DELAY = [0, 500, 0, 0, 500];
  const TAGS = [
    null,
    "every 10 minutes, on paper",
    "one crowded stop",
    "late buses get later",
    "same buses, nearly double the wait",
  ];
  const SOURCE = "illustrative scenario · avg wait = Σ gap² ÷ (2 · Σ gap), riders arrive at random";
  const NOTES = [
    "You wait twenty minutes for a bus, and then three arrive together. It isn't bad luck. It's a feedback loop, and once you see it, you can't unsee it.",
    "Let's slow it down with two buses on a loop line: eight stops, one bus every ten minutes. This gauge tracks the gap between them. On paper, the gaps are equal: ten and ten.",
    "Now one stop gets crowded. Bus A takes longer to board everyone and falls two minutes behind. The gap in front of it grows to twelve; the gap behind shrinks to eight.",
    "Here's the loop. A late bus finds more people waiting, so it boards longer and gets later still. The bus behind finds empty stops and speeds up. Soon the gaps are nineteen and one. The buses have bunched.",
    "Same buses, same schedule. But if you arrive at a random moment, your average wait goes from five minutes to about nine. Nothing broke. The fix isn't more buses; it's holding the early bus for a minute.",
  ];
  // Gap ahead of A, gap ahead of B (minutes); they always sum to one 20-minute lap.
  const GAPS = [[10, 10], [10, 10], [12, 8], [19, 1], [19, 1]];
  const LOOP_LABELS = ["LATE BUS", "MORE RIDERS", "LONGER BOARDING", "LATER BUS"];

  /* ---------- scene geometry ---------- */

  const ROUTE = { cx: 880, cy: 668, rx: 600, ry: 196, width: 68, period: 20, theta0: 180, stops: 8 };
  const BUS_SCALE = 0.9;
  // State 0 / 4 distant road on the near hill (centreline as a cubic Bezier).
  const ROAD = [[-40, 800], [420, 700], [930, 690], [1420, 1000]];
  // Plane offsets: in the loop states the meadow lifts into view and the
  // hills slide up behind it (nearer planes move further: parallax).
  const PLANES_WIDE = { sky: 0, far: 0, near: 0, reveal: 0, meadow: 780, fg: 0 };
  const PLANES_LOOP = { sky: -60, far: -235, near: -330, reveal: -330, meadow: 0, fg: 420 };

  function roadAt(u) {
    const [p0, p1, p2, p3] = ROAD;
    const v = 1 - u;
    const a = v * v * v;
    const b = 3 * v * v * u;
    const c = 3 * v * u * u;
    const d = u * u * u;
    return {
      x: a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
      y: a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
      s: 0.36 + 0.5 * u,
    };
  }

  /* ---------- layers ---------- */

  function layer(name) {
    const svg = P.el("svg", { class: "layer layer-" + name, viewBox: "0 0 1920 1080", width: 1920, height: 1080 });
    stageEl.appendChild(svg);
    return svg;
  }

  function buildSky(svg) {
    P.installDefs(svg);
    const plane = P.group(svg);
    P.el("rect", { x: -40, y: -200, width: 2000, height: 1500, fill: C.sky }, plane);
    P.piece(plane, P.hillPath(-40, 1960, 470, { amp: 26, waves: 1.5, seed: 3, bottom: 1400 }), C.skyLow, { stroke: "none" });
    P.sun(plane, 1660, 360, 92);
    // The cloud is hung scenery: it is hoisted out of the bookend to clear the
    // sky for the reveal numerals.
    const cloudRig = P.group(plane);
    P.cloud(cloudRig, 1250, 214, 0.95, 5, -200);
    return {
      plane,
      render(p) {
        cloudRig.setAttribute("transform", `translate(0 ${((1 - p.fly) * -420).toFixed(1)})`);
      },
    };
  }

  function buildFar(svg) {
    const plane = P.group(svg, { filter: "url(#pd-lift-2-plane)" });
    P.piece(plane, P.hillPath(-40, 1960, 560, { amp: 34, waves: 1.6, seed: 11, bottom: 1500 }), C.hillFar);
    // Only the right-hand houses live on the far hill; the village on the
    // left sits on the near hill so the far hill stays clear behind the reveal.
    const houses = [[1720, 66, 70, C.house3], [1800, 54, 56, C.house2]];
    houses.forEach(([x, w, h, color], i) => P.house(plane, x, 590, w, h, color, 235 + i * 7));
    for (const [x, s] of [[560, 0.8], [620, 0.62], [1630, 0.7], [1880, 0.8]]) P.tree(plane, x, 600, s, "round", 300 + x, C.hillNear);
    return plane;
  }

  function buildNear(svg) {
    const plane = P.group(svg, { filter: "url(#pd-lift-2-plane)" });
    P.piece(plane, P.hillPath(-40, 1960, 690, { amp: 30, waves: 1.2, seed: 21, bottom: 1500 }), C.hillMid);
    const village = [[140, 70, 66, C.house1], [222, 56, 84, C.house3], [292, 80, 60, C.house2], [384, 60, 74, C.house4], [458, 74, 58, C.house1]];
    village.forEach(([x, w, h, color], i) => P.house(plane, x, 712, w, h, color, 200 + i * 7));
    const centre = P.bezierPoints(ROAD[0], ROAD[1], ROAD[2], ROAD[3], 48);
    P.piece(plane, P.ribbonPath(centre, (u) => 10 + 30 * u, { seed: 23 }), C.road, { lift: 1 });
    P.el("path", { d: P.pathFrom(centre, false), fill: "none", stroke: C.roadLine, "stroke-width": 3, "stroke-dasharray": "14 16", opacity: 0.75 }, plane);
    // Trees stay left of the gauge: in the loop states their tops peek over the meadow.
    for (const [x, y, s, kind] of [[740, 640, 0.9, "pine"], [800, 650, 0.7, "pine"], [60, 720, 0.8, "pine"]]) {
      P.tree(plane, x, y, s, kind, 400 + x, kind === "pine" ? C.forest : C.grass);
    }
    return plane;
  }

  function buildMeadow(svg) {
    const plane = P.group(svg);
    const sheet = P.group(plane, { filter: "url(#pd-lift-3-plane)" });
    P.piece(sheet, P.hillPath(-40, 1960, 384, { amp: 14, waves: 1.4, seed: 31, bottom: 1400 }), C.meadow);
    for (const [x, y, s] of [[120, 470, 0.8], [1800, 470, 0.9], [1700, 440, 0.6]]) P.tree(sheet, x, y, s, "round", 500 + x, C.grass);
    for (const [x, y] of [[150, 760], [210, 900], [1640, 560], [1760, 640], [1270, 990], [560, 470]]) {
      P.piece(sheet, P.cutPoly([[x - 26, y], [x - 14, y - 26], [x - 4, y - 6], [x + 6, y - 32], [x + 14, y - 6], [x + 26, y - 22], [x + 30, y]], { amp: 0.8, seed: x }), C.meadowDark, { stroke: "none" });
    }
    // The ring's infield is a little park; the feedback wheel covers it in state 3.
    P.pond(sheet, 812, 664, 160, 44, 520);
    // Hedges along the front edge fill the corners without touching the ring.
    P.hedge(sheet, 52, 994, 300, 64, 540);
    P.hedge(sheet, 330, 996, 220, 50, 560);
    P.hedge(sheet, 1712, 994, 190, 70, 580);
    for (const [x, color] of [[600, C.rose], [650, C.cream], [1300, C.sun], [1350, C.rose]]) P.flower(sheet, x, 992, 0.9, color, 940 + x);
    // The meadow is a raised card platform: its corrugated cut edge shows at the front.
    P.cardboardEdge(sheet, -40, 1960, 996, 44, 590);
    const route = P.loopRoute(plane, ROUTE);

    const wheel = P.feedbackWheel(plane, { cx: 800, cy: 628, rx: 300, ry: 116, labels: LOOP_LABELS });

    const stopsLayer = P.group(plane);
    const stops = [];
    for (let i = 0; i < ROUTE.stops; i++) {
      const sp = route.stopPoint(i);
      const g = P.group(stopsLayer);
      P.stopFlag(g, sp.x, sp.y, i + 1);
      stops.push({ g, x: sp.x, y: sp.y });
    }
    // Riders queue beside the door of the bus boarding at stop 3, then at stop 4.
    const crowdAt = (positions, seed) => {
      const g = P.group(plane);
      const people = positions.map(([x, y], i) => {
        const holder = P.group(g);
        P.rider(holder, x, y, 1.05, seed + i * 13);
        return { holder, x, y };
      });
      return { g, people };
    };
    const crowdStop3 = crowdAt([[948, 964], [990, 970], [1032, 962], [1074, 968], [1116, 962], [1158, 968]], 600);
    const crowdStop4 = crowdAt([[1384, 906], [1424, 924], [1464, 908], [1348, 934], [1500, 930]], 700);
    return { plane, route, wheel, stops, crowdStop3, crowdStop4 };
  }

  function buildReveal(svg) {
    // Giant cut-card numerals planted on the far hill behind the village, like
    // letters on a hillside: the near hill and houses hide their stake feet.
    const plane = P.group(svg);
    const pieces = [];
    const add = (g, x, base) => {
      pieces.push({ g, x, base });
      return g;
    };
    const ground = 606;
    const five = add(P.group(plane), 300, ground);
    P.cutNumber(five, { x: 132, y: 452, text: "5.0", size: 200, fill: C.fix, stake: ground - 452 });
    P.string(five, 300, 466, 300, 500);
    P.card(five, { cx: 300, cy: 526, lines: [{ text: "gaps 10 + 10", size: 30, weight: 700 }], pad: 12, seed: 141, lift: 1, rotate: 2 });
    const arrow = add(P.group(plane), 572, ground);
    P.piece(arrow, P.cutRect(565, 380, 14, ground - 380, { r: 2, seed: 143 }), C.kraftDark, { lift: 1 });
    P.arrowPiece(arrow, 494, 372, 652, 372, { w: 26, head: 62, fill: C.inkSoft });
    const nine = add(P.group(plane), 900, ground);
    P.cutNumber(nine, { x: 676, y: 470, text: "9.1", size: 300, fill: C.alarm, stake: ground - 470 });
    P.string(nine, 940, 484, 940, 506);
    P.card(nine, { cx: 940, cy: 532, lines: [{ text: "gaps 19 + 1", size: 30, weight: 700 }], pad: 12, seed: 142, lift: 1, rotate: -1.5 });
    const unit = add(P.group(plane), 1290, ground);
    P.cutNumber(unit, { x: 1176, y: 470, text: "min", size: 116, fill: C.ink, stake: ground - 470 });
    P.card(unit, { cx: 1290, cy: 530, lines: [{ text: "average wait", size: 44, weight: 800, font: "display" }], pad: 16, seed: 140, lift: 2, rotate: -2 });
    return {
      plane,
      render(p) {
        pieces.forEach(({ g, x, base }, i) => {
          const k = P.ease.outBack(P.stage(p.p, i * 0.16, i * 0.16 + 0.34));
          g.setAttribute("transform", P.popTransform(x, base, k));
          g.style.opacity = k > 0.01 ? "1" : "0";
        });
      },
    };
  }

  function buildForeground(svg) {
    const plane = P.group(svg);
    const ground = P.group(plane, { filter: "url(#pd-lift-3-plane)" });
    P.piece(ground, P.hillPath(-40, 1960, 958, { amp: 10, waves: 3, seed: 41, bottom: 1400 }), C.grass);
    P.piece(ground, P.cutRect(1060, 996, 760, 40, { r: 4, seed: 42 }), C.kraftLight);
    P.hedge(ground, 40, 1000, 280, 58, 610);
    P.hedge(ground, 290, 1002, 190, 44, 630);
    for (const [x, color] of [[640, C.rose], [700, C.cream], [1700, C.sun], [1760, C.rose], [1850, C.cream]]) {
      P.flower(ground, x, 1000, 1, color, 900 + x);
    }
    // Pip's stop: a pole with a round sign showing a little bus pictogram.
    const pole = P.group(plane, { filter: "url(#pd-lift-2)" });
    P.piece(pole, P.cutRect(1396, 752, 12, 260, { r: 3, seed: 43 }), C.kraftDeep);
    P.piece(pole, P.cutEllipse(1402, 736, 46, 46, { seed: 44 }), C.cream, { stroke: C.inkSoft, strokeWidth: 3 });
    P.piece(pole, P.cutRect(1378, 714, 48, 30, { r: 7, seed: 45 }), C.road);
    P.el("rect", { x: 1384, y: 719, width: 36, height: 11, rx: 2, fill: C.window }, pole);
    P.el("circle", { cx: 1388, cy: 746, r: 5, fill: C.ink }, pole);
    P.el("circle", { cx: 1416, cy: 746, r: 5, fill: C.ink }, pole);
    P.piece(pole, P.cutRect(1414, 830, 54, 70, { r: 3, seed: 46 }), C.cream);
    for (let i = 0; i < 4; i++) P.el("path", { d: `M1422 ${846 + i * 14}H1460`, stroke: C.kraftDark, "stroke-width": 3 }, pole);

    const hold = P.group(plane);
    P.string(hold, 1396, 790, 1290, 820, { sag: 8 });
    const tag = P.card(hold, {
      cx: 1170,
      cy: 838,
      lines: [{ text: "HOLD THE EARLY BUS", size: 32, weight: 800, font: "display", fill: C.fix }],
      pad: 14,
      fill: C.cream,
      edge: C.fix,
      hole: true,
      seed: 150,
      rotate: -3,
    });
    return {
      plane,
      render(p) {
        const k = P.ease.outBack(p.p);
        hold.setAttribute("transform", P.popTransform(1170, 838 - tag.h / 2 - 20, k));
        hold.style.opacity = k > 0.01 ? "1" : "0";
      },
    };
  }

  function buildTitle(svg) {
    const g = P.group(svg);
    const swing = P.group(g);
    P.string(swing, 260, -400, 260, 150);
    P.string(swing, 980, -400, 980, 150);
    const sheet = P.group(swing, { filter: "url(#pd-lift-3)" });
    P.piece(sheet, P.cutRect(110, 132, 1020, 330, { r: 4, amp: 2, seed: 160 }), C.cream);
    P.piece(sheet, P.cutRect(150, 405, 640, 20, { r: 3, seed: 161 }), C.busA, { stroke: "none" });
    P.text(sheet, { x: 162, y: 262, text: TITLE_LINES[0], size: 112, weight: 900, font: "display" });
    P.text(sheet, { x: 162, y: 384, text: TITLE_LINES[1], size: 112, weight: 900, font: "display" });
    P.splitPin(swing, 260, 154, 9);
    P.splitPin(swing, 980, 154, 9);
    return {
      render(p) {
        const lifted = (1 - p.fly) * -560;
        swing.setAttribute("transform", `translate(0 ${lifted.toFixed(1)}) rotate(${((1 - p.fly) * 3).toFixed(2)} 620 0)`);
        g.style.opacity = p.fly <= 0.001 ? "0" : "1";
      },
    };
  }

  /* ---------- build ---------- */

  function build() {
    const layers = {
      sky: layer("sky"),
      far: layer("far"),
      reveal: layer("reveal"),
      near: layer("near"),
      meadow: layer("meadow"),
      fg: layer("fg"),
      buses: layer("buses"),
      pip: layer("pip"),
      ui: layer("ui"),
      frame: layer("frame"),
    };
    const sky = buildSky(layers.sky);
    buildFar(layers.far);
    const reveal = buildReveal(layers.reveal);
    buildNear(layers.near);
    const meadow = buildMeadow(layers.meadow);
    const fg = buildForeground(layers.fg);

    const busA = P.bus(layers.buses, { color: C.busA, letter: "A", seed: 50 });
    const busB = P.bus(layers.buses, { color: C.busB, letter: "B", seed: 70 });
    const busC = P.bus(layers.buses, { color: C.busC, letter: "C", seed: 90 });
    const pip = P.puppet(layers.pip);

    const title = buildTitle(layers.ui);
    const gauge = P.ribbonGauge(layers.ui, {
      x: 860,
      y: 166,
      w: 740,
      h: 52,
      total: 20,
      unit: "min",
      header: "GAP BETWEEN BUSES",
      hangFrom: 48,
      segments: [
        { letter: "A", caption: "ahead of A", color: C.busA },
        { letter: "B", caption: "ahead of B", color: C.busB },
      ],
    });
    const headline = P.headlineTag(layers.ui, { x: 66, y: 60, size: 50 });
    P.stamp(layers.ui, { x: 1852, y: 86, text: "ILLUSTRATIVE" });
    const source = P.sourceLine(layers.ui, { x: 70, y: 1024, text: SOURCE, size: 24 });
    P.shadowBox(layers.frame, { inset: 20, depth: 24 });
    P.grainOverlay(stageEl);

    // Buses sit on the ring at `t` (minutes along the loop) or, when free = 1,
    // at a free position (fx, fy, fs) on the distant road of the wide shot.
    const buses = [busA, busB, busC];
    const busY = { A: 0, B: 0, C: 0 };
    function busRenderer(ctrl, key) {
      return (p) => {
        const onLoop = meadow.route.point(p.t);
        const k = p.free;
        const y = P.lerp(onLoop.y, p.fy, k);
        busY[key] = y;
        ctrl.render({
          x: P.lerp(onLoop.x, p.fx, k),
          y,
          s: P.lerp(onLoop.s * BUS_SCALE, p.fs, k),
          face: P.lerp(onLoop.face, p.fface, k),
          door: p.door,
          op: p.op,
        });
        // Nearer buses (larger y) are drawn last so they overlap correctly.
        const order = buses.slice().sort((a, b) => busY[a.key] - busY[b.key]);
        order.forEach((b) => layers.buses.appendChild(b.g));
      };
    }
    busA.key = "A";
    busB.key = "B";
    busC.key = "C";

    const planeLayers = ["sky", "far", "reveal", "near", "meadow", "fg"];
    const objects = {
      planes: {
        render(p) {
          for (const name of planeLayers) layers[name].style.transform = `translate3d(0, ${p[name].toFixed(1)}px, 0)`;
        },
      },
      title,
      cloud: { render: sky.render },
      gauge,
      reveal,
      hold: { render: fg.render },
      stops: {
        render(p) {
          meadow.stops.forEach((stop, i) => {
            const k = P.ease.outBack(P.stage(p.p, i * 0.09, i * 0.09 + 0.3));
            stop.g.setAttribute("transform", P.popTransform(stop.x, stop.y, k));
            stop.g.style.opacity = k > 0.01 ? "1" : "0";
          });
        },
      },
      crowd3: crowdRenderer(meadow.crowdStop3),
      crowd4: crowdRenderer(meadow.crowdStop4),
      wheel: { render: (p) => meadow.wheel.render(p.p) },
      busA: { render: busRenderer(busA, "A") },
      busB: { render: busRenderer(busB, "B") },
      busC: { render: busRenderer(busC, "C") },
      pip: { render: (p) => pip.render(p) },
      source: { render: (p) => source.set(p.on > 0.5) },
    };

    function crowdRenderer(crowd) {
      return {
        render(p) {
          const n = crowd.people.length;
          crowd.people.forEach((person, i) => {
            const k = P.ease.outBack(P.stage(p.p * (n + 2), i, i + 2.2));
            person.holder.setAttribute("transform", P.popTransform(person.x, person.y, k));
            person.holder.style.opacity = k > 0.01 ? "1" : "0";
          });
        },
      };
    }

    const road = (u) => roadAt(u);
    // Opening bunch: three buses nose to tail, cresting down toward Pip's stop.
    const r0A = road(0.8);
    const r0B = road(0.685);
    const r0C = road(0.575);
    const OPENING_BUS_ZOOM = 1.25;
    const r4A = road(0.2);
    const pose = (name, extra) => Object.assign({}, P.POSES[name], extra);
    const free = (pt, extra) => Object.assign({ free: 1, fx: pt.x, fy: pt.y + 6, fs: pt.s, fface: 1 }, extra);
    const onLoop = (t, extra) => Object.assign({ free: 0, t, door: 0, op: 1 }, extra);

    const states = [
      {
        planes: Object.assign({}, PLANES_WIDE),
        title: { fly: 1 },
        cloud: { fly: 1 },
        gauge: { fly: 0, values: GAPS[0], sway: 0 },
        reveal: { p: 0 },
        hold: { p: 0 },
        stops: { p: 0 },
        crowd3: { p: 0 },
        crowd4: { p: 0 },
        wheel: { p: 0 },
        busA: free(r0A, { fs: r0A.s * OPENING_BUS_ZOOM, t: 1.25, door: 0, op: 1 }),
        busB: free(r0B, { fs: r0B.s * OPENING_BUS_ZOOM, t: 11.25, door: 0, op: 1 }),
        busC: free(r0C, { fs: r0C.s * OPENING_BUS_ZOOM, t: 5, door: 0, op: 1 }),
        pip: pose("wait", { x: 1586, y: 1012, s: 0.96, hop: 0, blink: 0, look: -1, brows: 0.5, head: -4 }),
        source: { on: 0 },
      },
      {
        planes: Object.assign({ _dur: 1100, _ease: "inOut" }, PLANES_LOOP),
        title: { fly: 0, _dur: 600, _ease: "in" },
        gauge: { fly: 1, values: GAPS[1], _dur: 1300, _delay: 1300, _ease: { fly: "swing", default: "inOut" } },
        stops: { p: 1, _dur: 1300, _delay: 700, _ease: "linear" },
        crowd3: { p: 0 },
        crowd4: { p: 0 },
        wheel: { p: 0, _dur: 400 },
        // Half a stop past stops 1 and 5, so neither bus hides a stop number.
        busA: onLoop(1.25, { free: 0, _dur: 1200, _delay: 150 }),
        busB: onLoop(11.25, { free: 0, _dur: 1200, _delay: 150 }),
        busC: { op: 0, fy: r0C.y + 40, _dur: 500 },
        pip: pose("point", { x: 1612, y: 992, s: 0.86, hop: 1, _dur: 1100 }),
        source: { on: 1 },
      },
      {
        planes: Object.assign({}, PLANES_LOOP),
        crowd3: { p: 1, _dur: 1000, _ease: "linear" },
        crowd4: { p: 0 },
        busA: onLoop(5, { door: 1, _dur: 1400, _delay: 700 }),
        busB: onLoop(17, { _dur: 1400, _delay: 700 }),
        gauge: { fly: 1, values: GAPS[2], _dur: 1200, _delay: 1100 },
        wheel: { p: 0, _dur: 400 },
        pip: pose("watch", { x: 1612, y: 992, s: 0.86, hop: 2, _dur: 700, _delay: 1600 }),
        source: { on: 1 },
      },
      {
        planes: Object.assign({}, PLANES_LOOP),
        crowd3: { p: 0, _dur: 500, _ease: "linear" },
        crowd4: { p: 1, _dur: 900, _ease: "linear" },
        busA: onLoop(7, { door: 0, _dur: 1500, _delay: 200 }),
        busB: onLoop(26, { _dur: 1500, _delay: 200 }),
        gauge: { fly: 1, values: GAPS[3], _dur: 1400, _delay: 300 },
        wheel: { p: 1, _dur: 2600, _delay: 1500, _ease: "linear" },
        pip: pose("alarmed", { x: 1612, y: 992, s: 0.86, hop: 3, _dur: 600, _delay: 1300 }),
        source: { on: 1 },
      },
      {
        planes: Object.assign({ _dur: 1200, _delay: 300 }, PLANES_WIDE),
        gauge: { fly: 0, values: GAPS[4], _dur: 700, _ease: "in" },
        wheel: { p: 0, _dur: 500 },
        crowd4: { p: 0, _dur: 400 },
        stops: { p: 1 },
        reveal: { p: 1, _dur: 2000, _delay: 1300, _ease: "linear" },
        hold: { p: 1, _dur: 700, _delay: 3100 },
        cloud: { fly: 0, _dur: 700, _ease: "in" },
        busA: free(r4A, { fs: 0.62, door: 0, _dur: 1300, _delay: 300 }),
        busB: Object.assign(free({ x: 1222, y: 1000, s: 1.02 }), { door: 1, _dur: 1300, _delay: 300 }),
        pip: pose("hold", { x: 1600, y: 1012, s: 0.96, hop: 4, _dur: 1100, _delay: 400 }),
        source: { on: 1 },
      },
    ];

    // Carry every object's props forward so each state is complete on its own
    // (needed for ?state=N, which jumps straight to a state).
    for (let i = 1; i < states.length; i++) {
      for (const name of Object.keys(states[i - 1])) {
        const prev = states[i - 1][name];
        const cur = states[i][name] || {};
        const merged = {};
        for (const key of Object.keys(prev)) if (key[0] !== "_") merged[key] = prev[key];
        states[i][name] = Object.assign(merged, cur);
      }
    }

    const director = P.director(objects, states);
    // Idle life: Pip blinks now and then (never in reduced motion, and not
    // in the first seconds, so still captures are never mid-blink).
    setTimeout(() => {
      setInterval(() => {
        if (!P.Motion.reduced && !P.Motion.active.size) pip.blink();
      }, 4300);
    }, 3000);
    return { director, headline, states };
  }

  /* ---------- deck controller ---------- */

  function fitStage() {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    const dx = (window.innerWidth - 1920 * scale) / 2;
    const dy = (window.innerHeight - 1080 * scale) / 2;
    stageEl.style.left = "0";
    stageEl.style.top = "0";
    stageEl.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.opacity = "1";
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => (toast.style.opacity = "0"), 1400);
  }

  async function start() {
    fitStage();
    window.addEventListener("resize", fitStage);
    const faces = ['800 50px "Fraunces"', '900 50px "Fraunces"', '700 24px "Andika"', '400 24px "Andika"', '700 24px "Gentium Greek"'];
    await Promise.all(faces.map((f) => document.fonts.load(f, "AaΣ")));
    await document.fonts.ready;

    const { director, headline } = build();
    const notesEl = document.getElementById("notes");
    let index = 0;

    function show(n, animate) {
      index = Math.max(0, Math.min(NOTES.length - 1, n));
      director.goTo(index, !animate);
      headline.set(TAGS[index], animate, TAG_DELAY[index]);
      notesEl.innerHTML = `<b>${index + 1} / ${NOTES.length}</b> &nbsp; ${NOTES[index]}`;
    }

    const params = new URLSearchParams(location.search);
    const initial = parseInt(params.get("state") || "0", 10) || 0;
    show(initial, false);

    window.deck = {
      count: NOTES.length,
      goTo(n) {
        show(n, true);
      },
      get index() {
        return index;
      },
    };

    window.addEventListener("keydown", (event) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        if (index < NOTES.length - 1) show(index + 1, true);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        if (index > 0) show(index - 1, true);
      } else if (event.key === "n" || event.key === "N") {
        document.body.classList.toggle("show-notes");
      } else if (event.key === "m" || event.key === "M") {
        P.Motion.reduced = !P.Motion.reduced;
        showToast(P.Motion.reduced ? "reduced motion on" : "reduced motion off");
      }
    });

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.body.dataset.ready = "1";
      }),
    );
  }

  start();
})();
