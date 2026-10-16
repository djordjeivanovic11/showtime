/* "Why do buses come in bunches?" in the Signal Line world.
 * One street, one shelter, one camera. States are flat value maps tweened by
 * SignalLine.createMotion; persistent objects (route, tokens, gauge, rider)
 * are built once and only ever move or morph.
 */
(async function () {
  'use strict';
  const SL = window.SignalLine;
  const { C, el, text } = SL;

  await SL.loadFonts();

  const svg = document.getElementById('deck');
  SL.installDefs(svg);
  SL.fitStage(document.getElementById('stage'));

  const GROUND = 1040;
  const LAP_MIN = 20;

  /* ---------- fixed backdrop ---------- */
  SL.sky(svg, { w: 1920, h: 1080 });

  /* ---------- the world (moved by the camera) ---------- */
  const world = el('g', { id: 'world' }, svg);
  SL.skyline(world, { x0: -2700, x1: 2700, ground: GROUND, seed: 5, minH: 260, maxH: 760 });
  SL.street(world, { x0: -2700, x1: 2700, ground: GROUND, depth: 800 });

  const shelter = SL.shelter(world, { x0: 0, x1: 1920, boxTop: -330, boxBottom: 0, ground: GROUND });

  // Lightbox fascia: stop name in the opening, the reveal number at the end.
  const fasciaName = el('g', { id: 'fascia-name' }, shelter.fascia);
  SL.roundel(fasciaName, { x: 520, y: -150, r: 70, color: C.route, ring: C.ink });
  text(fasciaName, 'LOOP LINE', { x: 660, y: -88, size: 170, weight: 800, fill: C.ink, ls: 4 });

  const fasciaReveal = el('g', { id: 'fascia-reveal', opacity: 0 }, shelter.fascia);
  text(fasciaReveal, 'AVERAGE WAIT', { x: 960, y: -222, size: 64, weight: 700, fill: C.inkSoft, anchor: 'middle', ls: 8 });
  const revealLine = el('g', {}, fasciaReveal);
  const before = text(revealLine, '5.0', { x: 0, y: -36, size: 210, weight: 800, fill: C.inkSoft, ls: -4 });
  const after = text(revealLine, '9.1', { x: 0, y: -36, size: 210, weight: 800, fill: C.alarm, ls: -4 });
  const unit = text(revealLine, 'min', { x: 0, y: -36, size: 104, weight: 700, fill: C.ink });
  const arrow = el('path', { d: 'M 0 0 H 120 M 84 -40 L 128 0 L 84 40', fill: 'none', stroke: C.ink, 'stroke-width': 22, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, revealLine);
  {
    const gap = 46;
    const wB = before.getComputedTextLength();
    const wA = after.getComputedTextLength();
    const wU = unit.getComputedTextLength();
    const arrowW = 130;
    const total = wB + gap + arrowW + gap + wA + 30 + wU;
    let x = 960 - total / 2;
    before.setAttribute('x', x);
    x += wB + gap;
    arrow.setAttribute('transform', `translate(${x},-110)`);
    x += arrowW + gap;
    after.setAttribute('x', x);
    x += wA + 30;
    unit.setAttribute('x', x);
  }

  /* Route map: the scaffold. */
  const panel = SL.enamelPanel(shelter.wall, { x: 80, y: 156, w: 1180, h: 770 });
  const map = panel.content;
  SL.roundel(map, { x: 150, y: 214, r: 20, color: C.route, ring: C.ink });
  text(map, 'LOOP LINE', { x: 190, y: 225, size: 30, weight: 800, fill: C.ink, ls: 3 });
  text(map, `1 LAP = ${LAP_MIN} MIN`, { x: 1206, y: 225, size: 28, weight: 700, fill: C.inkSoft, anchor: 'end', ls: 2 });

  const LOOP = { x: 260, y: 300, w: 820, h: 500, c: 160 };
  const route = SL.routeLine(map, { d: SL.chamferLoop(LOOP), color: C.route, width: 30 });
  const bandAhead = route.band(C.bandA, 70);
  const bandBehind = route.band(C.bandB, 70);
  const bands = route.g.firstChild;

  // Station positions as loop fractions, derived from the octagon geometry.
  const L = route.length;
  const diag = LOOP.c * Math.SQRT2;
  const halfTop = LOOP.w / 2 - LOOP.c;
  const side = LOOP.h - 2 * LOOP.c;
  const STOPS = [
    0,
    (halfTop - 50) / L,
    (halfTop + diag + side / 2) / L,
    (halfTop + diag + side + diag + 50) / L,
    0.5,
    0.5 + (halfTop - 50) / L,
    0.75,
    1 - (halfTop - 50) / L,
  ];
  const THIS_STOP = 4;
  const CROWDED_STOP = 2;
  STOPS.forEach((t, i) => {
    if (i !== THIS_STOP) SL.stationTick(route, t, { len: 54, width: 14 });
  });
  const here = route.at(STOPS[THIS_STOP]);
  SL.interchange(route.ticks, { x: here.x, y: here.y, r: 24 });
  text(map, 'THIS STOP', { x: here.x, y: here.y + 70, size: 28, weight: 800, fill: C.ink, anchor: 'middle', ls: 2 });

  const crowdAt = route.at(STOPS[CROWDED_STOP]);
  const crowd = SL.crowd(map, {
    color: C.ink,
    size: 1.05,
    spots: [[0, -40], [-46, -28], [0, 30], [-46, 42], [0, 100], [-92, 6], [-92, 76]].map(([dx, dy]) => [crowdAt.x - 82 + dx, crowdAt.y + dy]),
  });

  const loop = SL.feedbackLoop(map, {
    cx: 670, cy: 550, r: 118,
    labels: ['LATE BUS', 'MORE RIDERS', 'LONGER BOARDING', 'LATER BUS'],
    center: ['FEEDBACK', 'LOOP'],
    color: C.alarm,
  });

  const tokens = el('g', { id: 'tokens' }, map);
  const tokB = SL.busToken(tokens, { letter: 'B', fill: C.busB, ink: '#fff' });
  const tokA = SL.busToken(tokens, { letter: 'A', fill: C.busA, ink: C.ink });

  /* Gap gauge: the shelter's backlit display. */
  const gauge = SL.gapGauge(shelter.wall, {
    x: 1296, y: 156, w: 584, h: 430, total: LAP_MIN,
    title: 'GAP BETWEEN BUSES',
    labels: ['IN FRONT OF A', 'BEHIND A'],
    tints: [C.busATint, C.busBTint],
    fills: [C.bandA, C.bandB],
  });

  SL.bench(shelter.wall, { x0: 1340, x1: 1860, seat: 880, ground: GROUND });
  // Dims the wall content during the reveal so the lightbox number leads.
  const wallDim = el('rect', { x: 20, y: 0, width: 1880, height: GROUND, fill: '#0b0f13', opacity: 0 }, shelter.wall);

  /* Street buses: the opening bunch, and the held bus at the end. */
  const streetBuses = el('g', { id: 'street-buses' }, world);
  const BUS_Y = 1222;
  const bus3 = SL.streetBus(streetBuses);
  const bus2 = SL.streetBus(streetBuses);
  const bus1 = SL.streetBus(streetBuses);
  const hold = SL.timingPost(world, { x: -900, ground: GROUND + 30, text: 'HOLD THE EARLY BUS', size: 56, height: 400 });

  const rider = SL.rider(world, { scale: 0.93 });

  /* ---------- chrome (never moves) ---------- */
  const chrome = el('g', { id: 'chrome' }, svg);
  const title = SL.titleBlock(chrome, { x: 84, y: 150, lines: ['Why do buses', 'come in bunches?'], size: 92 });
  const tag = SL.tagPlate(chrome, { x: 56, y: 40 });
  SL.stampPlate(chrome, { text: 'ILLUSTRATIVE', right: 1864, y: 46 });
  const source = SL.sourceLine(chrome, { text: 'illustrative scenario · avg wait = Σ gap² ÷ (2 · Σ gap), riders arrive at random' });

  const notes = SL.notesOverlay(document.getElementById('stage'));

  /* ---------- states ---------- */
  const CAM_STREET = { 'cam.s': 0.5, 'cam.x': 920, 'cam.y': 360 };
  const CAM_MAP = { 'cam.s': 1, 'cam.x': 0, 'cam.y': 0 };
  const CAM_REVEAL = { 'cam.s': 0.56, 'cam.x': 800, 'cam.y': 330 };
  const pose = (name) => SL.posePrefixed('rider', name);

  const BASE = {
    ...CAM_STREET,
    tA: 0.95, tB: 0.45, tok: 0, band: 0, power: 0,
    crowd: 0, crowdOp: 1, loop: 0,
    'rider.x': -120, 'rider.y': GROUND, 'rider.face': -1, 'rider.stride': 0, 'rider.badge': 1,
    ...pose('shrug'),
    bus1: -720, bus2: -1220, bus3: -1720, bus2Op: 1, hold: 0,
    reveal: 0, title: 1, src: 0, dim: 0,
  };

  const STATES = [
    {
      tag: null, badge: '?',
      values: {},
      timing: {},
      notes: 'You wait twenty minutes for a bus, and then three arrive together. It isn’t bad luck. It’s a feedback loop, and once you see it, you can’t unsee it.',
    },
    {
      tag: 'every 10 minutes, on paper', badge: '?',
      values: { ...CAM_MAP, 'rider.x': 1590, 'rider.badge': 0, ...pose('look'), tok: 1, band: 1, power: 1, title: 0, src: 1 },
      timing: {
        'cam.s': { dur: 1100 }, 'cam.x': { dur: 1100 }, 'cam.y': { dur: 1100 },
        'rider.x': { dur: 1100 }, 'rider.badge': { dur: 200 },
        title: { dur: 350 }, src: { delay: 900, dur: 400 },
        tok: { delay: 1000, dur: 350 }, band: { delay: 1250, dur: 450 }, power: { delay: 1450, dur: 450 },
        pose: { delay: 700, dur: 600 },
      },
      notes: 'Let’s slow it down with two buses on a loop line: eight stops, one bus every ten minutes. This gauge tracks the gap between them. On paper, the gaps are equal: ten and ten.',
    },
    {
      tag: 'one crowded stop', badge: '?',
      values: { crowd: 1, tA: 1.25, tB: 0.85, ...pose('watch') },
      timing: {
        crowd: { dur: 700, ease: 'linear' },
        tA: { delay: 600, dur: 1000 }, tB: { delay: 600, dur: 1000 },
        pose: { delay: 1300, dur: 500 },
      },
      notes: 'Now one stop gets crowded. Bus A takes longer to board everyone and falls two minutes behind. The gap in front of it grows to twelve; the gap behind shrinks to eight.',
    },
    {
      tag: 'late buses get later', badge: '!',
      values: { tA: 1.46, tB: 1.41, crowdOp: 0, ...pose('alarm'), 'rider.badge': 1, loop: 1 },
      timing: {
        tA: { dur: 1200 }, tB: { dur: 1200 },
        crowdOp: { delay: 200, dur: 600 },
        pose: { delay: 1000, dur: 420 }, 'rider.badge': { delay: 1100, dur: 250 },
        loop: { delay: 1300, dur: 1800, ease: 'linear' },
      },
      notes: 'Here’s the loop. A late bus finds more people waiting, so it boards longer and gets later still. The bus behind finds empty stops and speeds up. Soon the gaps are nineteen and one. The buses have bunched.',
    },
    {
      tag: 'same buses, nearly double the wait', badge: '!',
      values: { ...CAM_REVEAL, ...pose('point'), 'rider.badge': 0, reveal: 1, dim: 0.45, bus1: -520, bus2Op: 0, bus3: -1440, hold: 1 },
      timing: {
        'cam.s': { dur: 1100 }, 'cam.x': { dur: 1100 }, 'cam.y': { dur: 1100 },
        'rider.badge': { dur: 200 }, pose: { delay: 800, dur: 500 },
        reveal: { delay: 1000, dur: 600 }, dim: { delay: 600, dur: 600 },
        bus1: { delay: 300, dur: 900 }, bus3: { delay: 300, dur: 900 }, bus2Op: { delay: 300, dur: 500 },
        hold: { delay: 1500, dur: 500 },
      },
      notes: 'Same buses, same schedule. But if you arrive at a random moment, your average wait goes from five minutes to about nine. Nothing broke. The fix isn’t more buses; it’s holding the early bus for a minute.',
    },
  ];

  // Each state inherits everything from the one before, so every key is always defined.
  const FULL = [];
  STATES.forEach((s, i) => {
    FULL[i] = { ...(i ? FULL[i - 1] : BASE), ...s.values };
  });

  /* ---------- render ---------- */
  const busX = (x) => `translate(${x},${BUS_Y}) scale(1)`;
  function render(v) {
    world.setAttribute('transform', `translate(${v['cam.x'].toFixed(2)},${v['cam.y'].toFixed(2)}) scale(${v['cam.s'].toFixed(4)})`);

    const a = route.at(v.tA);
    const b = route.at(v.tB);
    tokA.place(a.x, a.y);
    tokB.place(b.x, b.y);
    tokens.setAttribute('opacity', v.tok);
    bandAhead.set(v.tA, v.tB);
    bandBehind.set(v.tB, v.tA);
    bands.setAttribute('opacity', v.band);

    // The gauge reads the map: the gap in front of A is the loop distance from A forward to B.
    const aheadFraction = (((v.tB - v.tA) % 1) + 1) % 1;
    gauge.set(aheadFraction * LAP_MIN, v.power);

    crowd.set(v.crowd);
    crowd.g.setAttribute('opacity', v.crowdOp);
    loop.set(v.loop);
    rider.update(v, 'rider');

    bus1.setAttribute('transform', busX(v.bus1));
    bus2.setAttribute('transform', busX(v.bus2));
    bus3.setAttribute('transform', busX(v.bus3));
    bus2.setAttribute('opacity', v.bus2Op);
    hold.setAttribute('opacity', v.hold);

    fasciaName.setAttribute('opacity', 1 - v.reveal);
    fasciaReveal.setAttribute('opacity', v.reveal);
    title.setAttribute('opacity', v.title);
    source.setAttribute('opacity', v.src);
    wallDim.setAttribute('opacity', v.dim);
  }

  const motion = SL.createMotion(render);
  let current = 0;

  function timedTarget(i, forward) {
    const full = FULL[i];
    const timing = forward ? STATES[i].timing : {};
    const out = {};
    for (const k in full) {
      const t = timing[k] || (k.startsWith('rider.') && !['rider.x', 'rider.badge', 'rider.face'].includes(k) ? timing.pose : null) || {};
      out[k] = { to: full[k], ...t };
    }
    // Walking: legs swing while the rider travels.
    const dx = Math.abs(full['rider.x'] - motion.values['rider.x']);
    if (dx > 50) out['rider.stride'] = { to: 0, bump: 1, dur: (timing['rider.x'] || {}).dur || 800 };
    return out;
  }

  function applyChrome(i, animate) {
    tag.set(STATES[i].tag, animate);
    rider.setBadge(STATES[i].badge);
    notes.set(STATES[i].notes, `${i + 1} / ${STATES.length}`);
  }

  function goTo(n, instant) {
    const i = Math.max(0, Math.min(STATES.length - 1, n));
    const forward = i === current + 1;
    applyChrome(i, !instant && !motion.reduced);
    current = i;
    if (instant) {
      motion.jump(FULL[i]);
      return Promise.resolve();
    }
    return motion.animate(timedTarget(i, forward), { duration: forward ? 850 : 700, noDelay: !forward });
  }

  // goTo returns nothing on purpose: callers (and the renderer's evaluate) must not wait for the tween.
  window.deck = { count: STATES.length, goTo: (n) => { goTo(n, false); } };

  SL.bindKeys({
    next: () => goTo(current + 1),
    prev: () => goTo(current - 1),
    notes: () => notes.toggle(),
    motion: () => {
      motion.setReduced(!motion.reduced);
      document.body.classList.toggle('reduced', motion.reduced);
    },
  });


  // Honour the OS setting; M still toggles it either way.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) motion.setReduced(true);

  const params = new URLSearchParams(location.search);
  const start = Math.max(0, Math.min(STATES.length - 1, parseInt(params.get('state') || '0', 10) || 0));
  motion.jump(FULL[0]);
  current = start;
  applyChrome(start, false);
  motion.jump(FULL[start]);

  // Tiny idle life: the rider blinks now and then (off under reduced motion).
  setTimeout(() => {
    setInterval(() => { if (!motion.reduced) rider.blink(); }, 4300);
  }, 3000);

  requestAnimationFrame(() => { document.body.dataset.ready = '1'; });
})().catch((err) => {
  console.error(err);
});
