/* "Why do buses come in bunches?" in the Cinema world.
 *
 * Two camera set-ups, one city:
 *   STREET (states 0 and 4): eye level at a rain-wet bus stop, buses coming
 *     out of the vanishing point. The bookend.
 *   LOOP (states 1-3): the camera cranes up; the same city seen from a
 *     rooftop, the loop line drawn as a lit road ring with eight stops.
 * Persistent actors (rider, Bus A, Bus B, the film-strip gap gauge) are
 * single SVG groups whose numbers are tweened, so they travel between
 * set-ups instead of being redrawn.
 */
(function () {
  "use strict";
  const { C, el, text, lerp, clamp } = Cine;

  const SOURCE = "illustrative scenario · avg wait = Σ gap² ÷ (2 · Σ gap), riders arrive at random";
  const LAP_MINUTES = 20;

  const STATES = [
    {
      tag: "",
      scene: "OPENING",
      notes: "You wait twenty minutes for a bus, and then three arrive together. It isn't bad luck. It's a feedback loop, and once you see it, you can't unsee it.",
    },
    {
      tag: "every 10 minutes, on paper",
      scene: "SCENE 1",
      notes: "Let's slow it down with two buses on a loop line: eight stops, one bus every ten minutes. This gauge tracks the gap between them. On paper, the gaps are equal: ten and ten.",
    },
    {
      tag: "one crowded stop",
      scene: "SCENE 2",
      notes: "Now one stop gets crowded. Bus A takes longer to board everyone and falls two minutes behind. The gap in front of it grows to twelve; the gap behind shrinks to eight.",
    },
    {
      tag: "late buses get later",
      scene: "SCENE 3",
      notes: "Here's the loop. A late bus finds more people waiting, so it boards longer and gets later still. The bus behind finds empty stops and speeds up. Soon the gaps are nineteen and one. The buses have bunched.",
    },
    {
      tag: "same buses, nearly double the wait",
      scene: "SCENE 4",
      notes: "Same buses, same schedule. But if you arrive at a random moment, your average wait goes from five minutes to about nine. Nothing broke. The fix isn't more buses; it's holding the early bus for a minute.",
    },
  ];

  // Street set-up geometry: one-point perspective toward VP.
  const HORIZON = 470;
  const VP = [1180, HORIZON];
  // Oncoming lane centre, from the bottom of the frame to the VP.
  const laneAt = (y) => [VP[0] - 470 * ((y - HORIZON) / 490), y];
  const depthScale = (y) => ((y - HORIZON) / 490) * 1.5;

  // Loop set-up geometry. Bus positions are minutes along the 20-minute lap.
  const ROUTE = Cine.ellipseRoute({ cx: 1000, cy: 600, rx: 680, ry: 165, theta0: 110, lap: LAP_MINUTES });
  const STOP_COUNT = 8;
  // The rider waits two stops down the line from the crowded stop, at the
  // ring's right end: the only place a hero-scale figure overlaps neither
  // bus nor the far side of the ring in any state.
  const RIDER_STOP_POS = 5;
  const RIDER_LOOP_SCALE = 1.15;
  const CROWDED_STOP_POS = 0;
  const CROWD_FIRST = 9; // riders waiting in state 2
  const CROWD_TOTAL = 14; // riders waiting in state 3 ("more riders")
  // Feedback-loop sign geometry (top-left rooftop, above the bunching).
  const NEON = { x: 150, y: 156, w: 760, h: 210 };

  /** Point beside the road on its far side (where stops and people stand). */
  function kerb(pos, extra) {
    const p = ROUTE.point(pos);
    return { x: p.x, y: p.y - p.halfWidth - (extra || 4), s: p.s };
  }

  function buildStreet(parent) {
    const g = el("g", { id: "street" }, parent);
    const clip = el("clipPath", { id: "streetCones" }, document.querySelector("defs"));
    Cine.sky(g, HORIZON);
    Cine.skyline(g, HORIZON + 4, { x0: 640, x1: 1700, minH: 30, maxH: 170, seed: 21, windowRate: 0.16, beacons: false });

    // Road and pavements.
    el("path", { d: `M${VP[0] - 40},${HORIZON} L${VP[0] + 40},${HORIZON} L1920,880 L1920,960 L300,960 Z`, fill: "url(#roadGrad)" }, g);
    el("path", { d: `M0,760 L${VP[0] - 50},${HORIZON + 6} L${VP[0] - 40},${HORIZON} L300,960 L0,960 Z`, fill: "#0e1119" }, g);
    el("path", { d: `M300,960 L${VP[0] - 40},${HORIZON}`, stroke: "#4a5063", "stroke-width": 3 }, g);
    el("path", { d: `M1920,880 L${VP[0] + 40},${HORIZON}`, stroke: "#3a4052", "stroke-width": 3 }, g);
    for (let i = 0; i < 9; i++) {
      const t0 = Math.pow(i / 9, 1.8);
      const t1 = Math.pow((i + 0.45) / 9, 1.8);
      const y0 = HORIZON + 490 * t0;
      const y1 = HORIZON + 490 * t1;
      const x0 = VP[0] + 230 * t0;
      const x1 = VP[0] + 230 * t1;
      el("path", { d: `M${x0},${y0} L${x1},${y1}`, stroke: "#8a8f9c", "stroke-width": 2 + 8 * t1, opacity: 0.4 }, g);
    }

    // Facades either side, receding to the VP.
    Cine.facade(g, [[0, 250], [VP[0] - 120, HORIZON - 42], [VP[0] - 120, HORIZON + 14], [0, 760]], { cols: 16, rows: 7, seed: 4, fill: "#06080e", windowRate: 0.28 });
    Cine.facade(g, [[1920, 260], [VP[0] + 90, HORIZON - 40], [VP[0] + 90, HORIZON + 4], [1920, 700]], { cols: 12, rows: 7, seed: 9, fill: "#070910", windowRate: 0.3 });

    // Lamps along the near kerb, receding.
    [0.94, 0.5, 0.27, 0.12].forEach((t, i) => {
      const y = HORIZON + 490 * t;
      const x = VP[0] - 40 - (VP[0] - 40 - 300) * t;
      Cine.lamp(g, x + 30 * t, y, 0.25 + t * 1.15, { height: 320, side: 1, coneClip: clip, bright: i === 0 ? 1.1 : 0.85 });
    });

    // Bus shelter in the left foreground.
    const shelter = el("g", { id: "shelter" }, g);
    el("rect", { x: 70, y: 470, width: 470, height: 14, fill: "#11141c" }, shelter);
    el("rect", { x: 80, y: 484, width: 8, height: 440, fill: "#0b0d13" }, shelter);
    el("rect", { x: 520, y: 484, width: 8, height: 440, fill: "#0b0d13" }, shelter);
    el("rect", { x: 92, y: 500, width: 424, height: 330, fill: "#9cc3ff", opacity: 0.06 }, shelter);
    el("rect", { x: 136, y: 520, width: 200, height: 300, rx: 4, fill: "#f6dfae", opacity: 0.9 }, shelter);
    el("rect", { x: 136, y: 520, width: 200, height: 300, rx: 4, fill: "url(#haloGrad)", opacity: 0.6 }, shelter);
    el("ellipse", { cx: 236, cy: 930, rx: 280, ry: 30, fill: "#f6dfae", opacity: 0.12, filter: "url(#softer)" }, shelter);
    Cine.reflection(shelter, 236, 900, 60, 180, "#f6dfae", 0.18);

    // Opening title card (state 0).
    const title = el("g", { id: "titleCard", opacity: 0 }, g);
    text(title, "Why do buses come in bunches?", {
      x: 1040, y: 262, "text-anchor": "middle", fill: C.paper,
      "font-family": Cine.FONT.display, "font-weight": 600, "font-style": "italic",
      "font-size": 112, "letter-spacing": 1,
    });

    // The reveal (state 4): a film title in the sky, reflected in the road.
    const reveal = buildReveal(g);
    const hint = buildHint(g);

    const rain = Cine.rainLayer(g, 0.42, "streetCones");
    return { g, title, reveal, hint, rain };
  }

  function buildReveal(parent) {
    const g = el("g", { id: "reveal" }, parent);
    // Dark scrim so the title reads over the distant skyline.
    el("ellipse", { cx: 1040, cy: 300, rx: 640, ry: 210, fill: "url(#scrimGrad)" }, g);
    const size = 200;
    const baseY = 300;
    const fontAttrs = { "font-family": Cine.FONT.display, "font-weight": 700, "font-size": size, style: "font-variant-numeric: lining-nums" };
    const parts = [];

    const before = el("g", {}, g);
    const tBefore = text(before, "5.0", Object.assign({ x: 0, y: baseY, fill: C.moon }, fontAttrs));
    const after = el("g", {}, g);
    const tAfter = text(after, "9.1", Object.assign({ x: 0, y: baseY, fill: C.sodium }, fontAttrs));
    const wB = tBefore.getComputedTextLength();
    const wA = tAfter.getComputedTextLength();
    const gap = 170;
    const total = wB + gap + wA;
    const left = 1040 - total / 2;
    tBefore.setAttribute("x", left);
    tAfter.setAttribute("x", left + wB + gap);
    const capAttrs = { "text-anchor": "middle", "font-family": Cine.FONT.ui, "font-weight": 500, "font-size": 30, "letter-spacing": 2 };
    text(before, "gaps 10 / 10", Object.assign({ x: left + wB / 2, y: baseY + 52, fill: C.moon }, capAttrs));
    text(after, "gaps 19 / 1", Object.assign({ x: left + wB + gap + wA / 2, y: baseY + 52, fill: C.sodium }, capAttrs));

    const arrowG = el("g", {}, g);
    Cine.arrow(arrowG, left + wB + 34, baseY - 64, gap - 68, C.paper, 6);

    const line = el("g", {}, g);
    text(line, "MIN AVERAGE WAIT", {
      x: 1040, y: baseY + 118, "text-anchor": "middle", fill: C.paper,
      "font-family": Cine.FONT.ui, "font-weight": 600, "font-size": 44, "letter-spacing": 14,
    });

    parts.push(before, arrowG, after, line);
    return {
      g,
      set(n) {
        parts.forEach((p, i) => p.setAttribute("opacity", clamp(n - i, 0, 1)));
        g.setAttribute("opacity", clamp(n * 2, 0, 1));
      },
    };
  }

  function buildHint(parent) {
    const g = el("g", { id: "hint", opacity: 0 }, parent);
    // A stop pole at mid distance carrying the instruction plate.
    el("rect", { x: 788, y: 585, width: 7, height: 125, fill: "#5a5f6e" }, g);
    el("rect", { x: 786, y: 585, width: 3, height: 125, fill: C.sodium, opacity: 0.6 }, g);
    Cine.pausePlate(g, 610, 556, "HOLD THE EARLY BUS", { size: 30 });
    return g;
  }

  function buildLoop(parent) {
    const g = el("g", { id: "loop" }, parent);
    const clip = el("clipPath", { id: "loopCones" }, document.querySelector("defs"));
    Cine.sky(g, 440);
    // A station clock above the skyline: quiet "time passes while you wait".
    Cine.clockTower(g, 1470, 444, { height: 300, time: "21:50" });
    Cine.skyline(g, 444, { x0: 0, x1: 1920, minH: 60, maxH: 300, seed: 7, windowRate: 0.14 });
    // The building whose roof carries the feedback-loop sign (unlit until
    // state 3). It sits over the left of the city, above where the buses
    // bunch, and fills what was dead sky in states 1-2.
    const roof = Cine.rooftop(g, NEON.x - 30, NEON.x + NEON.w + 30, 398, NEON.y + NEON.h + 14, { struts: 6, baseY: 444 });

    // Ground plane with faint perspective street grid.
    el("rect", { x: 0, y: 440, width: 1920, height: 520, fill: "url(#roadGrad)" }, g);
    for (let i = -8; i <= 8; i++) {
      el("path", { d: `M${1000 + i * 120},440 L${1000 + i * 420},960`, stroke: "#1c2130", "stroke-width": 2 }, g);
    }
    [470, 520, 600, 720, 880].forEach((y) =>
      el("path", { d: `M0,${y} L1920,${y}`, stroke: "#1c2130", "stroke-width": 2 }, g));

    Cine.roadRing(g, ROUTE);
    const arcA = el("path", { fill: "none", stroke: C.sodium, "stroke-width": 7, "stroke-linecap": "round", filter: "url(#glow)", opacity: 0 }, g);
    const arcB = el("path", { fill: "none", stroke: C.moon, "stroke-width": 7, "stroke-linecap": "round", filter: "url(#glow)", opacity: 0 }, g);

    // Eight stops: lamp + pole on the far kerb of the road.
    for (let i = 0; i < STOP_COUNT; i++) {
      const pos = (i * LAP_MINUTES) / STOP_COUNT;
      const k = kerb(pos, 6);
      const isRider = pos === RIDER_STOP_POS;
      const isCrowded = pos === CROWDED_STOP_POS;
      Cine.lamp(g, k.x - 26 * k.s, k.y, k.s * 0.62, { height: 260, side: 1, coneClip: clip, bright: isRider || isCrowded ? 1.25 : 0.8, reflect: false });
      Cine.stopSign(g, k.x + (isRider ? -44 : 20) * k.s, k.y, k.s * 0.9, { lit: isRider || isCrowded });
    }

    // Bus B's speed: a long-exposure light trail behind it (state 3).
    const trail = el("g", { opacity: 0 }, g);
    const trailSegs = [];
    for (let i = 0; i < 8; i++) {
      trailSegs.push(el("path", { fill: "none", stroke: C.moon, "stroke-width": 4 + i, "stroke-linecap": "round", opacity: 0.12 + i * 0.1, filter: "url(#glow)" }, trail));
    }

    // Crowd at the crowded stop, entering one person at a time: the front
    // row (CROWD_FIRST) in state 2, a back row in state 3 ("more riders").
    // Back-row riders stand further up the kerb, so they are painted first.
    const crowd = [];
    const cr = Cine.rng(17);
    const spots = [];
    for (let i = 0; i < CROWD_FIRST; i++) spots.push([0.55 + i * 0.16, 2 + (i % 2) * 7]);
    for (let i = 0; i < CROWD_TOTAL - CROWD_FIRST; i++) spots.push([0.62 + i * 0.3, 20]);
    const order = spots.map((sp, i) => i).sort((a, b) => spots[b][1] - spots[a][1]);
    const crowdNodes = [];
    for (let i = 0; i < spots.length; i++) {
      const [pos, extra] = spots[i];
      const k = kerb(pos, extra);
      const s = k.s * (0.4 + cr() * 0.07);
      const f = Cine.figure(g, { scarf: false, poses: [i % 3 === 1 ? "watch" : "wait"] });
      f.g.setAttribute("transform", `translate(${k.x},${k.y}) scale(${i % 2 ? -s : s},${s})`);
      f.g.setAttribute("opacity", 0);
      crowdNodes.push(f.g);
    }
    // Paint order: back row (further from camera) first.
    order.forEach((i) => g.appendChild(crowdNodes[i]));
    crowd.push(...crowdNodes);

    const neon = Cine.neonLoop(g, Object.assign({
      id: "feedbackLoop", legs: 0, unlitBoard: true,
      labels: ["LATE BUS", "MORE RIDERS", "LONGER BOARDING", "LATER BUS"],
    }, NEON));

    const rain = Cine.rainLayer(g, 0.36, "loopCones");
    return { g, arcA, arcB, crowd, neon, rain, roof, trail, trailSegs };
  }

  function buildActors(parent) {
    const g = el("g", { id: "actors" }, parent);
    const busA = Cine.bus(g, { id: "busA", letter: "A", livery: C.sodium });
    const busB = Cine.bus(g, { id: "busB", letter: "B", livery: C.moon });
    const busC = Cine.bus(g, { id: "busC", letter: "", livery: "#6f7686" });
    // Bus A's open front door spills light while it boards (state 2+).
    const door = el("g", { opacity: 0 }, busA.body);
    el("rect", { x: 66, y: -50, width: 18, height: 38, fill: C.window }, door);
    el("path", { d: "M66,-12 L84,-12 L110,10 L54,10 Z", fill: C.window, opacity: 0.35, filter: "url(#soft)" }, door);
    const rider = Cine.figure(g, { id: "rider", poses: ["wait", "watch", "alarm", "resolved"] });
    return { g, busA, busB, busC, door, rider };
  }

  // Numeric state of every tweened value. One object per deck state.
  const street0 = {
    A: { ...laneAt(566), s: depthScale(566) * 1.15 },
    B: { ...laneAt(606), s: depthScale(606) * 1.15 },
    C: { ...laneAt(672), s: depthScale(672) * 1.15 },
  };
  // State 4 shows the fix: Bus B (the early bus) held at our stop, close to
  // camera with its route letter readable; Bus A a full gap away in the
  // distance. They are no longer nose to tail.
  const street4 = {
    A: { ...laneAt(528), s: depthScale(528) * 1.1 },
    B: { ...laneAt(770), s: depthScale(770) },
  };
  const riderStreet = { riderX: 300, riderY: 912, riderS: 2.05, riderFace: 1 };
  const riderLoop = (() => {
    const k = kerb(RIDER_STOP_POS, 4);
    // +60 px: stand just right of the ring's end so the stop behind
    // (pos 7.5) stays visible and all eight stops can be counted.
    return { riderX: k.x + 60, riderY: k.y + 4, riderS: RIDER_LOOP_SCALE, riderFace: -1 };
  })();
  const pose = (name) => ({
    pWait: name === "wait" ? 1 : 0,
    pWatch: name === "watch" ? 1 : 0,
    pAlarm: name === "alarm" ? 1 : 0,
    pResolved: name === "resolved" ? 1 : 0,
  });
  const busFree = (key, p, view, op) => ({
    [key + "Free"]: 1, [key + "X"]: p[0] ?? p.x, [key + "Y"]: p[1] ?? p.y,
    [key + "S"]: p.s, [key + "View"]: view, [key + "Op"]: op,
  });
  const busRoute = (key, pos) => ({ [key + "Free"]: 0, [key + "Pos"]: pos, [key + "View"]: 0, [key + "Op"]: 1 });
  const freeFrom = (v) => ({ x: v[0], y: v[1], s: v.s });

  const VALUES = [
    Object.assign(
      { streetOp: 1, streetY: 0, loopOp: 0, loopY: -220, titleOp: 1, revealN: 0, hintOp: 0, rainOp: 1,
        gaugeOp: 0, gaugeG: 10, arcsOp: 0, crowdN: 0, doorOp: 0, neonN: 0, trailOp: 0, APos: 0, BPos: 10 },
      riderStreet, pose("wait"),
      busFree("A", freeFrom(street0.A), 1, 1), busFree("B", freeFrom(street0.B), 1, 1), busFree("C", freeFrom(street0.C), 1, 1)),
    Object.assign(
      { streetOp: 0, streetY: 260, loopOp: 1, loopY: 0, titleOp: 0, revealN: 0, hintOp: 0, rainOp: 1,
        gaugeOp: 1, gaugeG: 10, arcsOp: 1, crowdN: 0, doorOp: 0, neonN: 0, trailOp: 0, CFree: 1, COp: 0 },
      riderLoop, pose("wait"), busRoute("A", 0), busRoute("B", 10)),
    Object.assign(
      { streetOp: 0, streetY: 260, loopOp: 1, loopY: 0, titleOp: 0, revealN: 0, hintOp: 0, rainOp: 1,
        gaugeOp: 1, gaugeG: 12, arcsOp: 1, crowdN: CROWD_FIRST, doorOp: 1, neonN: 0, trailOp: 0, CFree: 1, COp: 0 },
      riderLoop, pose("watch"), busRoute("A", 0), busRoute("B", 12)),
    Object.assign(
      { streetOp: 0, streetY: 260, loopOp: 1, loopY: 0, titleOp: 0, revealN: 0, hintOp: 0, rainOp: 1,
        gaugeOp: 1, gaugeG: 19, arcsOp: 1, crowdN: CROWD_TOTAL, doorOp: 1, neonN: 4, trailOp: 1, CFree: 1, COp: 0 },
      riderLoop, pose("alarm"), busRoute("A", 0), busRoute("B", 19)),
    Object.assign(
      { streetOp: 1, streetY: 0, loopOp: 0, loopY: -220, titleOp: 0, revealN: 4, hintOp: 1, rainOp: 0.15,
        gaugeOp: 0, gaugeG: 19, arcsOp: 0, crowdN: 0, doorOp: 0, neonN: 0, trailOp: 0, APos: 0, BPos: 19 },
      riderStreet, pose("resolved"),
      busFree("A", freeFrom(street4.A), 1, 1), busFree("B", freeFrom(street4.B), 1, 1),
      busFree("C", freeFrom(street0.C), 1, 0)),
  ];

  // Per-target-state timing windows [delayMs, durationMs]. New objects enter
  // after the persistent ones have settled, one at a time.
  // The crane: the old set-up sinks and darkens first, the new one settles
  // in after it, so the two never sit as a muddy double exposure. Actors
  // travel through the whole move; facing flips late so nobody is a sliver
  // for long.
  const CRANE = [0, 1200];
  const actorMove = {
    riderX: [100, 1000], riderY: [100, 1000], riderS: [100, 1000], riderFace: [800, 300],
    pWait: [550, 250], pWatch: [550, 250], pAlarm: [550, 250], pResolved: [550, 250],
  };
  const busMove = (k) => ({ [k + "X"]: [100, 1000], [k + "Y"]: [100, 1000], [k + "S"]: [100, 1000], [k + "Free"]: [100, 1000], [k + "View"]: [350, 350] });
  const TIMING = [
    { default: [0, 900] },
    Object.assign({ default: [0, 900], streetOp: [0, 550], streetY: CRANE, loopOp: [450, 700], loopY: CRANE, titleOp: [0, 300], gaugeOp: [1200, 500], arcsOp: [1400, 500], COp: [0, 400] },
      actorMove, busMove("A"), busMove("B"), busMove("C")),
    { default: [0, 800], crowdN: [0, 900], doorOp: [700, 300], BPos: [900, 900], gaugeG: [900, 900], pWait: [500, 300], pWatch: [500, 300] },
    { default: [0, 900], BPos: [0, 1100], gaugeG: [0, 1100], trailOp: [100, 600], crowdN: [700, 900], pWatch: [500, 300], pAlarm: [500, 300], neonN: [1700, 1800] },
    Object.assign({ default: [0, 900], loopOp: [0, 550], loopY: CRANE, streetOp: [450, 700], streetY: CRANE, gaugeOp: [0, 300], arcsOp: [0, 300], neonN: [0, 300], crowdN: [0, 400], trailOp: [0, 300], revealN: [1300, 1800], hintOp: [3200, 600], rainOp: [400, 1500] },
      actorMove, busMove("A"), busMove("B")),
  ];

  function busPlacement(cur, key) {
    const route = ROUTE.point(cur[key + "Pos"] ?? 0);
    const f = cur[key + "Free"];
    return {
      x: lerp(route.x, cur[key + "X"] ?? route.x, f),
      y: lerp(route.y, cur[key + "Y"] ?? route.y, f),
      s: lerp(route.s, cur[key + "S"] ?? route.s, f),
      rot: lerp(route.rot, 0, f),
      flip: lerp(route.flip, 1, f),
      view: cur[key + "View"] ?? 0,
      opacity: cur[key + "Op"] ?? 1,
    };
  }

  async function main() {
    await Promise.all([
      document.fonts.load("600 italic 60px 'Cormorant Garamond'"),
      document.fonts.load("700 200px 'Cormorant Garamond'"),
      document.fonts.load("400 24px 'Fira Sans Condensed'", "Σ"),
      document.fonts.load("400 24px 'Fira Sans Condensed'"),
      document.fonts.load("600 30px 'Fira Sans Condensed'"),
      document.fonts.load("700 40px 'Fira Sans Condensed'"),
    ]);

    const svg = document.getElementById("world");
    Cine.defs(svg);
    const frame = Cine.frame(svg, { stamp: "ILLUSTRATIVE" });
    frame.layoutStamp();

    const street = buildStreet(frame.picture);
    const loop = buildLoop(frame.picture);
    const actors = buildActors(frame.picture);
    const gauge = Cine.filmStrip(frame.picture, {
      id: "gapGauge", x: 120, y: 836, frames: LAP_MINUTES, fw: 46, fh: 44,
      namesA: ["A", "B"], namesB: ["B", "A"],
      format: (v) => `${Math.round(v)} min`,
    });
    const key = text(gauge.g, "1 frame = 1 min", { x: 1070, y: 868, fill: C.muted, "font-family": Cine.FONT.ui, "font-size": 24 });
    void key;
    Cine.grainAndVignette(frame.overlay);

    const weather = Cine.weather();

    const apply = (cur) => {
      street.g.setAttribute("opacity", cur.streetOp);
      street.g.setAttribute("transform", `translate(0,${cur.streetY})`);
      loop.g.setAttribute("opacity", cur.loopOp);
      loop.g.setAttribute("transform", `translate(0,${cur.loopY})`);
      street.title.setAttribute("opacity", cur.titleOp);
      street.reveal.set(cur.revealN);
      street.hint.setAttribute("opacity", cur.hintOp);
      street.rain.setAttribute("opacity", cur.rainOp);
      loop.rain.setAttribute("opacity", cur.rainOp);

      // Actors live outside the scene groups, so they follow the crane
      // offset of whichever scene they are standing in.
      const sceneShift = cur.streetY * cur.streetOp + cur.loopY * cur.loopOp;
      const r = actors.rider;
      r.g.setAttribute("transform", `translate(${cur.riderX},${cur.riderY + sceneShift * 0.3}) scale(${cur.riderS * cur.riderFace},${cur.riderS})`);
      r.poses.wait.setAttribute("opacity", cur.pWait);
      r.poses.watch.setAttribute("opacity", cur.pWatch);
      r.poses.alarm.setAttribute("opacity", cur.pAlarm);
      r.poses.resolved.setAttribute("opacity", cur.pResolved);

      const placements = [
        [actors.busA, busPlacement(cur, "A")],
        [actors.busB, busPlacement(cur, "B")],
        [actors.busC, busPlacement(cur, "C")],
      ];
      placements.forEach(([b, p]) => Cine.placeBus(b, p));
      actors.door.setAttribute("opacity", cur.doorOp);

      // Draw order by screen depth: lower on screen is nearer the camera.
      const order = [
        [actors.rider.g, cur.riderY],
        ...placements.map(([b, p]) => [b.g, p.y]),
      ].sort((a, b) => a[1] - b[1]);
      order.forEach(([node]) => actors.g.appendChild(node));

      gauge.g.setAttribute("opacity", cur.gaugeOp);
      gauge.set(cur.gaugeG);
      const aPos = cur.APos;
      const bPos = aPos + cur.gaugeG;
      loop.arcA.setAttribute("d", ROUTE.arcPath(aPos, bPos));
      loop.arcB.setAttribute("d", ROUTE.arcPath(bPos, aPos + LAP_MINUTES));
      loop.arcA.setAttribute("opacity", cur.arcsOp * 0.9);
      loop.arcB.setAttribute("opacity", cur.arcsOp * 0.9);
      loop.crowd.forEach((c, i) => c.setAttribute("opacity", clamp(cur.crowdN - i, 0, 1)));
      loop.neon.set(cur.neonN);
      loop.roof.spill.setAttribute("opacity", 0.3 * clamp(cur.neonN, 0, 1));
      loop.trail.setAttribute("opacity", cur.trailOp);
      if (cur.trailOp > 0) {
        loop.trailSegs.forEach((seg, i) => {
          const p1 = bPos - 0.4 - (7 - i) * 0.55;
          seg.setAttribute("d", ROUTE.arcPath(p1, p1 + 0.6, -14));
        });
      }
    };

    const director = new Cine.Director(apply);
    let reduced = false;
    let current = 0;
    const show = (n, instant) => {
      const st = STATES[n];
      frame.setTag(st.tag, instant);
      frame.setScene(st.scene);
      frame.setSource(n === 0 ? "" : SOURCE);
      if (instant) director.set(VALUES[n]);
      else director.to(VALUES[n], TIMING[n], reduced ? 0.25 : 1);
      current = n;
    };

    Cine.fitStage(document.getElementById("stage"));
    Cine.deckControls({
      count: STATES.length,
      show,
      notes: STATES.map((s) => s.notes),
      toggleReduced() {
        reduced = !reduced;
        weather.setReduced(reduced);
        show(current, true);
      },
    });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.dataset.ready = "1";
    }));
  }

  main().catch((err) => {
    console.error(err);
  });
})();
