// "Why do buses come in bunches?" in the Pixel Quest world, five states.
//
// Persistent objects (same id in every state they appear in): route, busA,
// busB, gauge, pip. Route positions are params a and b (laps; each stop is
// 1/8 lap = 2.5 min), so a move between states drives the badges along the
// road and recolours the gap arcs and gauge cells frame by frame.
//
// Numbers (illustrative, from the lab brief): gaps 10/10, 12/8, 19/1 min;
// average wait 5.0 -> 9.1 min.

(function () {
  "use strict";

  const LAP_MIN = 20;
  const SOURCE = "illustrative scenario · avg wait = Σ gap² ÷ (2 · Σ gap), riders arrive at random";

  // Shelter close-up framing: the lightbox map panel and its small twin on
  // the street. The camera maps one onto the other (signature "Map Dive").
  const PANEL = [104, 30, 276, 198];
  const LIGHTBOX = [60, 178, 44, 32];

  const ROUTE = PQ.makeRoute({
    x: 132,
    y: 62,
    w: 216,
    h: 136,
    r: 26,
    stops: [
      [174, 62], [240, 62], [306, 62], [348, 130],
      [306, 198], [240, 198], [174, 198], [132, 130],
    ],
  });

  /** Minutes from Bus A forward to Bus B (the gap in front of A). */
  function gapAhead(p) {
    const lap = (((p.b - p.a) % 1) + 1) % 1;
    return lap * LAP_MIN;
  }

  // -------------------------------------------------------------- scenes

  function drawStreet(g) {
    PQ.drawNightSky(g, { seed: 4, horizon: 192, moon: [432, 64] });
    PQ.drawSkyline(g, { seed: 21, baseY: 190 });
    PQ.drawLamp(g, 176, 192, 92, 232);
    PQ.drawLamp(g, 344, 192, 92, 232);
    PQ.drawRoad(g, 196, 234);
    PQ.drawSidewalk(g, 234);
  }

  function drawShelterFront(g) {
    // Layer box origin is (10, 150).
    PQ.drawShelter(g, 6, 8, 108, 112);
    PQ.drawStopPole(g, 128, 108, 92);
  }

  function drawCloseUp(g) {
    g.rect(0, 0, 480, 270, "N");
    g.rect(0, 150, 480, 86, "n");
    // The street behind the glass: window-less silhouettes and out-of-focus
    // lights, kept dim so the map stays the brightest thing on screen.
    const rand = PQ.rng(17);
    for (let x = 0; x < 100; ) {
      const w = 16 + Math.floor(rand() * 20);
      const top = 70 + Math.floor(rand() * 80);
      g.rect(x, top, w, 236 - top, "u");
      g.rect(x, top, w, 1, "v");
      x += w + 2;
    }
    for (const [bx, by, r, key] of [[18, 120, 7, "y"], [62, 96, 5, "v"], [40, 168, 9, "y"], [80, 150, 4, "l"], [10, 196, 5, "v"]]) {
      g.ditherEllipse(bx, by, r, r, key);
    }
    for (const gx of [8, 30]) g.line(gx, 230, gx + 50, 30, "v");
    // Shelter roof underside with a light tube.
    g.rect(0, 0, 480, 26, "K");
    g.rect(0, 0, 480, 20, "c");
    g.rect(0, 18, 480, 2, "m");
    g.rect(24, 21, 432, 3, "l");
    g.rect(24, 24, 432, 1, "Y");
    // Glow around the lightbox.
    g.dither(PANEL[0] - 4, PANEL[1] - 2, PANEL[2] + 8, PANEL[3] + 6, "u", ".");
    // Posts.
    g.rect(92, 26, 8, 210, "K");
    g.rect(94, 26, 4, 210, "m");
    g.rect(94, 26, 1, 210, "w");
    PQ.drawSidewalk(g, 236);
  }

  function drawMiniMap(g) {
    PQ.drawLightbox(g, 0, 0, 44, 32);
    g.rect(9, 8, 26, 1, "W");
    g.rect(9, 23, 26, 1, "W");
    g.rect(8, 9, 1, 14, "W");
    g.rect(35, 9, 1, 14, "W");
    g.rect(12, 7, 3, 3, "O");
    g.rect(28, 22, 3, 3, "C");
  }

  function drawMap(g, p) {
    const [ox, oy] = PANEL;
    PQ.drawLightbox(g, 0, 0, PANEL[2], PANEL[3]);
    PQ.drawMapBlocks(g, 6, 6, PANEL[2] - 12, PANEL[3] - 12, 12);
    // Road, then the two gaps lit along it: amber from A forward to B, cyan
    // from B forward to A. They always add up to one lap (20 min).
    ROUTE.drawSpan(g, 0, 1, 13, "K", ox, oy);
    ROUTE.drawSpan(g, 0, 1, 11, "a", ox, oy);
    const ahead = gapAhead(p) / LAP_MIN;
    ROUTE.drawSpan(g, p.a, p.a + ahead, 5, "O", ox, oy);
    ROUTE.drawSpan(g, p.b, p.b + (1 - ahead), 5, "C", ox, oy);
    for (const [sx, sy] of ROUTE.stops) {
      g.rect(sx - ox - 4, sy - oy - 4, 9, 9, "K");
      g.rect(sx - ox - 3, sy - oy - 3, 7, 7, "W");
      g.rect(sx - ox - 1, sy - oy - 1, 3, 3, "w");
    }
  }

  function drawMiniGauge(g, p) {
    const cells = Math.round(gapAhead(p));
    g.rect(0, 0, 44, 8, "K");
    for (let i = 0; i < 20; i++) g.rect(2 + i * 2, 2, 1, 4, i < cells ? "O" : "C");
  }

  function drawGauge(g, p) {
    const cells = Math.round(gapAhead(p));
    g.rect(0, 0, 90, 198, "K");
    g.frame(1, 1, 88, 196, "m");
    g.rect(2, 2, 86, 1, "w");
    g.rect(4, 22, 82, 1, "m");
    // Bolts.
    for (const [bx, by] of [[4, 4], [83, 4], [4, 191], [83, 191]]) g.rect(bx, by, 3, 3, "m");
    PQ.drawLedColumn(g, 10, 26, 18, 7, 20, (i) => (i < cells ? "O" : "C"));
    // Five-minute ticks and the split marker.
    for (let i = 0; i <= 20; i += 5) g.rect(5, 25 + i * 8, 3, 1, "w");
    const split = 25 + cells * 8;
    g.rect(6, split, 26, 1, "W");
  }

  function gaugeGroupY(p) {
    const cells = gapAhead(p);
    const top = 56;
    const midA = top + cells * 4;
    const midB = top + cells * 8 + (20 - cells) * 4;
    const yA = Math.max(54, Math.min(midA - 13, 160));
    const yB = Math.max(yA + 30, Math.min(midB - 13, 198));
    return [yA, yB];
  }

  function gaugeHtml(label, minutes, colorKey) {
    const c = PQ.color(colorKey);
    return (
      `<div style="font:600 32px/34px 'Pixelify Sans';color:${PQ.palette.W}">${PQ.rich(label)}</div>` +
      `<div style="font:700 64px/64px Silkscreen;color:${c}">${Math.round(minutes)}` +
      `<span style="font:600 28px/28px 'Pixelify Sans';color:${PQ.palette.w};margin-left:6px">min</span></div>`
    );
  }

  // -------------------------------------------------------------- layers

  const L = {
    street: () => ({ id: "bg-street", x: 0, y: 0, w: 480, h: 270, draw: drawStreet, scene: true, z: 0 }),
    closeUp: () => ({ id: "bg-closeup", x: 0, y: 0, w: 480, h: 270, draw: drawCloseUp, scene: true, z: 0 }),
    shelter: () => ({ id: "shelter", x: 10, y: 150, w: 140, h: 112, draw: drawShelterFront, scene: true, z: 30 }),
    miniMap: () => ({ id: "route", look: "mini", x: LIGHTBOX[0], y: LIGHTBOX[1], w: 44, h: 32, draw: drawMiniMap, z: 31 }),
    map: () => ({ id: "route", look: "map", x: PANEL[0], y: PANEL[1], w: PANEL[2], h: PANEL[3], draw: drawMap, live: true, z: 10 }),
    miniGauge: () => ({ id: "gauge", look: "mini", x: 62, y: 168, w: 44, h: 8, draw: drawMiniGauge, z: 31 }),
    gauge: () => ({ id: "gauge", look: "pillar", x: 386, y: 30, w: 90, h: 198, draw: drawGauge, live: true, z: 10 }),
    gaugeTitle: () => ({ id: "gauge-title", x: 386, y: 34, w: 90, align: "center", text: "GAP", cls: "pq-gauge-title", z: 12, delay: 500 }),
    gaugeA: () => ({
      id: "gauge-a", x: 418, look: "ga",
      place: (p) => ({ x: 418, y: gaugeGroupY(p)[0] }),
      html: (p) => gaugeHtml("A → B", gapAhead(p), "O"),
      live: true, z: 12, delay: 650,
    }),
    gaugeB: () => ({
      id: "gauge-b", x: 418, look: "gb",
      place: (p) => ({ x: 418, y: gaugeGroupY(p)[1] }),
      html: (p) => gaugeHtml("B → A", LAP_MIN - gapAhead(p), "C"),
      live: true, z: 12, delay: 800,
    }),
    busSide: (id, x, o = {}) => ({
      id, look: o.letter ? `side-${o.letter}` : "side", x: x - 26, y: 191, w: 102, h: 38,
      draw: (g) => PQ.drawBusSide(g, 26, 3, { beam: o.beam, doorOpen: o.doorOpen, letter: o.letter }),
      badges: o.letter ? [{ x: 79, y: 23, w: 12, text: o.letter }] : null,
      z: o.z || 20, enter: o.enter, delay: o.delay,
    }),
    busBadge: (id, letter, key) => ({
      id, look: "badge", w: 22, h: 16,
      place: (p) => {
        const [x, y] = ROUTE.point(p[key]);
        return { x: x - 11, y: y - 8 };
      },
      draw: (g) => PQ.drawBusBadge(g, 0, 0),
      badges: [{ x: 0, y: 3, w: 22, text: letter }],
      z: 14,
    }),
    pip: (pose, x, y, extra = {}) => Object.assign({
      id: "pip", look: pose, x, y, w: 56, h: 56, idle: true,
      draw: (g, p, tick) => PQ.drawPip(g, pose, tick), z: 40,
    }, extra),
    youPin: () => ({ id: "you-pin", x: 126, y: 113, w: 11, h: 15, draw: (g) => PQ.drawYouPin(g, 0, 0), z: 15, enter: "drop" }),
    tag: (t) => PQ.tag(t),
    stamp: () => PQ.stamp("ILLUSTRATIVE"),
    source: () => PQ.source(SOURCE),
  };

  const CLOSE_UP_PIP = [22, 181];
  const notes = [
    "You wait twenty minutes for a bus, and then three arrive together. It isn't bad luck. It's a feedback loop, and once you see it, you can't unsee it.",
    "Let's slow it down with two buses on a loop line: eight stops, one bus every ten minutes. This gauge tracks the gap between them. On paper, the gaps are equal: ten and ten.",
    "Now one stop gets crowded. Bus A takes longer to board everyone and falls two minutes behind. The gap in front of it grows to twelve; the gap behind shrinks to eight.",
    "Here's the loop. A late bus finds more people waiting, so it boards longer and gets later still. The bus behind finds empty stops and speeds up. Soon the gaps are nineteen and one. The buses have bunched.",
    "Same buses, same schedule. But if you arrive at a random moment, your average wait goes from five minutes to about nine. Nothing broke. The fix isn't more buses; it's holding the early bus for a minute.",
  ];

  const states = [
    // 0: title card and bookend: Pip waits; three buses arrive nose to tail.
    {
      notes: notes[0],
      params: { a: 0, b: 0.5 },
      layers: [
        L.street(),
        L.busSide("busA", 238, { beam: true }),
        L.busSide("busB", 318, { beam: true, z: 19 }),
        L.busSide("busC", 398, { beam: true, z: 18 }),
        L.shelter(),
        L.miniMap(),
        L.miniGauge(),
        L.pip("neutral", 26, 203),
        { id: "fx", look: "ask", x: 86, y: 211, w: 12, h: 15, draw: (g) => PQ.drawBubble(g, 0, 0, "?"), z: 41, camera: false },
        {
          id: "title", x: 16, y: 26, text: "Why do buses\ncome in bunches?", cls: "pq-title",
          z: 800, camera: true,
        },
        L.stamp(),
      ],
    },
    // 1: dive into the lightbox: route, two buses, gauge at 10 / 10.
    {
      notes: notes[1],
      params: { a: 0, b: 0.5 },
      transition: { camera: { from: LIGHTBOX, to: PANEL } },
      layers: [
        L.closeUp(),
        L.map(),
        L.youPin(),
        L.busBadge("busA", "A", "a"),
        L.busBadge("busB", "B", "b"),
        L.gauge(),
        L.gaugeTitle(),
        L.gaugeA(),
        L.gaugeB(),
        L.pip("point", ...CLOSE_UP_PIP),
        L.tag("every 10 minutes, on paper"),
        L.stamp(),
        L.source(),
      ],
    },
    // 2: one crowded stop holds Bus A; gauge 12 / 8; Pip checks the watch.
    {
      notes: notes[2],
      params: { a: 0.25, b: 0.85 },
      layers: [
        L.closeUp(),
        L.map(),
        L.youPin(),
        {
          id: "crowd-2", x: 262, y: 34, w: 54, h: 23,
          draw: (g) => PQ.drawCrowd(g, 1, 1, 16, 8, 3), z: 13, enter: "rise", delay: 0,
        },
        L.busBadge("busA", "A", "a"),
        L.busBadge("busB", "B", "b"),
        {
          id: "dwell", w: 7, h: 9, z: 16, enter: "pop",
          place: (p) => {
            const [x, y] = ROUTE.point(p.a);
            return { x: x + 9, y: y - 16 };
          },
          draw: (g) => PQ.drawHourglass(g, 0, 0),
        },
        L.gauge(),
        L.gaugeTitle(),
        L.gaugeA(),
        L.gaugeB(),
        L.pip("watch", ...CLOSE_UP_PIP),
        { id: "fx", look: "grumble", x: 64, y: 174, w: 12, h: 9, draw: (g) => PQ.drawGrumble(g, 0, 0), z: 41, enter: "pop" },
        L.tag("one crowded stop"),
        L.stamp(),
        L.source(),
      ],
    },
    // 3: late buses get later: 19 / 1, the roundabout loop is labelled.
    {
      notes: notes[3],
      params: { a: 0.375, b: 1.325 },
      layers: [
        L.closeUp(),
        L.map(),
        L.youPin(),
        {
          id: "loop", x: 164, y: 78, w: 152, h: 104,
          draw: (g) => PQ.drawRoundabout(g, 76, 52, 66, 42), z: 11, enter: "pop", delay: 700,
        },
        {
          id: "crowd-3", x: 354, y: 138, w: 22, h: 62,
          draw: (g) => PQ.drawCrowd(g, 1, 1, 18, 3, 8), z: 13, enter: "rise", delay: 0,
        },
        L.busBadge("busA", "A", "a"),
        L.busBadge("busB", "B", "b"),
        {
          id: "dwell", w: 7, h: 9, z: 16,
          place: (p) => {
            const [x, y] = ROUTE.point(p.a);
            return { x: x + 9, y: y - 16 };
          },
          draw: (g) => PQ.drawHourglass(g, 0, 0),
        },
        L.gauge(),
        L.gaugeTitle(),
        L.gaugeA(),
        L.gaugeB(),
        PQ.label("loop-1", 180, 81, "LATE BUS", { w: 120, align: "center", accent: "R", z: 20, delay: 1100, enter: "pop" }),
        PQ.label("loop-2", 246, 123, "MORE RIDERS", { w: 120, align: "center", accent: "O", z: 20, delay: 1400, enter: "pop" }),
        PQ.label("loop-3", 180, 165, "LONGER BOARDING", { w: 120, align: "center", accent: "O", z: 20, delay: 1700, enter: "pop" }),
        PQ.label("loop-4", 114, 123, "LATER BUS", { w: 120, align: "center", accent: "R", z: 20, delay: 2000, enter: "pop" }),
        L.pip("alarmed", ...CLOSE_UP_PIP),
        { id: "fx", look: "alarm", x: 70, y: 160, w: 12, h: 15, draw: (g) => PQ.drawBubble(g, 0, 0, "!"), z: 41, enter: "pop", camera: false },
        L.tag("late buses get later"),
        L.stamp(),
        L.source(),
      ],
    },
    // 4: back on the street: the reveal on the marquee; Pip holds Bus B.
    {
      notes: notes[4],
      params: { a: 0.375, b: 1.325 },
      transition: { camera: { from: PANEL, to: LIGHTBOX, exitOnTop: true } },
      layers: [
        L.street(),
        {
          id: "marquee", x: 172, y: 34, w: 280, h: 156, idle: true,
          draw: (g, p, tick) => PQ.drawMarquee(g, 0, 0, 280, 84, tick, 156),
          z: 5, enter: "drop", delay: 700,
        },
        {
          id: "reveal", x: 172, y: 57, w: 280, align: "center", z: 6, delay: 1000, enter: "pop",
          html:
            `<div style="font:700 96px/96px Silkscreen;color:${PQ.palette.W};text-shadow:8px 8px 0 ${PQ.palette.K}">` +
            `<span style="color:${PQ.palette.C}">5.0</span>${PQ.rich(" → ")}` +
            `<span style="color:${PQ.palette.R}">9.1</span>` +
            `<span style="font-size:48px"> min</span></div>` +
            `<div style="font:600 40px/52px 'Pixelify Sans';color:${PQ.palette.l};margin-top:8px">average wait</div>`,
        },
        L.busSide("busA", 54, { letter: "A" }),
        L.busSide("busB", 134, { letter: "B", doorOpen: true }),
        L.shelter(),
        L.miniMap(),
        L.miniGauge(),
        { id: "paddle", x: 178, y: 197, w: 15, h: 36, draw: (g) => PQ.drawPaddle(g, 0, 0), z: 39, enter: "rise", delay: 1300 },
        L.pip("hold", 132, 203),
        PQ.label("fix", 200, 238, "HOLD THE EARLY BUS", { accent: "G", z: 50, delay: 1600, enter: "slide" }),
        L.tag("same buses, nearly double the wait"),
        L.stamp(),
        L.source(),
      ],
    },
  ];

  PQ.boot(states, { fontDir: "fonts" });
})();
