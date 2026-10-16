/* Signal Line style kit  ->  window.SignalLine
 *
 * A quiet, museum-grade transit world: enamel route maps in steel frames,
 * backlit displays, lightbox signage, and one pictogram rider whose posture
 * carries the emotion. Every primitive draws inline SVG with the Inter font;
 * nothing touches the network. Reuse it for any talk that has a "system":
 * draw the system as a line, its actors as tokens, its readings on a display.
 *
 * Conventions: all functions take (parent, options) and return either the
 * created <g> or a small handle { g, set(...) }. Coordinates are SVG user
 * units on a 1920x1080 stage. Angles are degrees.
 */
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";

  /* Semantic colour tokens. Light-on-dark "Tint" variants are for backlit text. */
  const C = {
    ink: '#161b20', // text and linework on enamel
    inkSoft: '#4a545e', // secondary text on enamel
    enamel: '#eee7d8', // map and sign faces
    enamelShade: '#ded5c3',
    paper: '#f2ede3', // light text and the rider on dark surfaces
    paperShade: '#cfc8ba', // far-side limbs of the rider
    mutedOnDark: '#b3bdc6', // small print on dark surfaces
    sky0: '#0f161e', sky1: '#1b2733', sky2: '#33414e',
    city: '#18222c', cityFar: '#1e2a35', cityWindow: '#24313e', cityLit: '#e0b86a',
    cabinLit: '#d9c9a0', // lit bus interior seen through the windows
    wall: '#242a31', wallSeam: '#2d343c',
    steel: '#8c959e', steelDark: '#4c555d', steelLight: '#c9d0d6',
    display: '#0c1115', displayRail: '#1c242b',
    pavement: '#343c44', kerb: '#59626b', road: '#191e23', lane: '#c8ced4',
    route: '#11775d', // the system itself (the line)
    routeBright: '#2fa483', // the line's colour on dark surfaces
    busA: '#e8a032', busATint: '#ffc062', // "ours"/subject actor (late bus)
    busB: '#2b5ca6', busBTint: '#93b8f6', // "theirs"/counterpart actor (early bus)
    alarm: '#c0342a', alarmTint: '#ff7a6b', // feedback, bunching, the bad number
    bandA: '#f2c46e', bandB: '#a7c0e8', // map bands that echo the gauge
  };

  /* ---------- core helpers ---------- */

  /** el(tag, attrs, parent): create an SVG element, set attributes, append it. */
  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    if (attrs) {
      for (const k in attrs) if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  /** text(parent, str, o): SVG text in the kit font; o = {x,y,size,weight,fill,anchor,ls}. */
  function text(parent, str, o = {}) {
    const node = el('text', {
      x: o.x || 0,
      y: o.y || 0,
      'font-family': FONT,
      'font-size': o.size || 28,
      'font-weight': o.weight || 600,
      fill: o.fill || C.ink,
      'text-anchor': o.anchor || 'start',
      'letter-spacing': o.ls || 0,
      style: "font-feature-settings: 'tnum' 1, 'case' 1;",
      opacity: o.opacity,
      filter: o.filter,
    }, parent);
    node.textContent = str;
    return node;
  }

  /** loadFonts(): resolve once every Inter weight the kit uses is ready. */
  async function loadFonts() {
    const weights = [400, 500, 600, 700, 800];
    await Promise.all(weights.map((w) => document.fonts.load(`${w} 40px Inter`, 'AΣ0')));
    await document.fonts.ready;
  }

  /** installDefs(svg): add the kit's gradients, textures and filters (call once). */
  function installDefs(svg) {
    const defs = el('defs', {}, svg);
    defs.innerHTML = `
      <linearGradient id="sl-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${C.sky0}"/><stop offset="0.62" stop-color="${C.sky1}"/>
        <stop offset="1" stop-color="${C.sky2}"/></linearGradient>
      <radialGradient id="sl-horizon" cx="0.5" cy="1" r="0.75">
        <stop offset="0" stop-color="#5a5650" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#5a5650" stop-opacity="0"/></radialGradient>
      <linearGradient id="sl-steel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a7b0b8"/><stop offset="0.45" stop-color="#737c85"/>
        <stop offset="1" stop-color="#8f98a0"/></linearGradient>
      <linearGradient id="sl-steel-h" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#5f6870"/><stop offset="0.5" stop-color="#a3acb4"/>
        <stop offset="1" stop-color="#5f6870"/></linearGradient>
      <linearGradient id="sl-sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/>
        <stop offset="0.38" stop-color="#fff" stop-opacity="0.16"/>
        <stop offset="0.46" stop-color="#fff" stop-opacity="0"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="sl-walllight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffe9c2" stop-opacity="0.16"/>
        <stop offset="0.45" stop-color="#ffe9c2" stop-opacity="0.03"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.18"/></linearGradient>
      <radialGradient id="sl-lightbox" cx="0.5" cy="0.5" r="0.7">
        <stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="${C.enamel}"/></radialGradient>
      <linearGradient id="sl-display" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#121a20"/><stop offset="1" stop-color="${C.display}"/></linearGradient>
      <radialGradient id="sl-lampglow" cx="0.5" cy="0" r="1">
        <stop offset="0" stop-color="#ffd58a" stop-opacity="0.32"/>
        <stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></radialGradient>
      <pattern id="sl-scan" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="1" fill="#fff" opacity="0.025"/></pattern>
      <filter id="sl-grain" x="0" y="0" width="1" height="1">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.12  0.7 0 0 0 -0.28"/>
      </filter>
      <filter id="sl-brush" x="0" y="0" width="1" height="1">
        <feTurbulence type="fractalNoise" baseFrequency="0.003 0.7" numOctaves="1" seed="2"/>
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.5 0 0 0 -0.2"/>
      </filter>
      <filter id="sl-shadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.45"/>
      </filter>
      <filter id="sl-shadow-sm" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.35"/>
      </filter>
      <filter id="sl-outline" x="-15%" y="-10%" width="130%" height="120%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="3.5" result="d"/>
        <feFlood flood-color="${C.ink}"/>
        <feComposite in2="d" operator="in" result="o"/>
        <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="sl-glow" x="-20%" y="-30%" width="140%" height="160%">
        <feGaussianBlur stdDeviation="7" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`;
    return defs;
  }

  /* ---------- motion ---------- */

  const EASE = {
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    out: (p) => 1 - Math.pow(1 - p, 3),
    linear: (p) => p,
  };

  /** tween(ms, fn(p), ease): run fn from 0..1 over ms; returns a Promise. */
  function tween(ms, fn, ease = EASE.inOut) {
    if (ms <= 0) {
      fn(1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / ms);
        fn(ease(p));
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  /**
   * createMotion(render): a keyed tween engine. States are flat maps of
   * key -> number or {to, delay, dur, ease, bump}; `bump` adds an arc
   * (sin pi*p) for hops and strides. render(values) is called every frame.
   */
  function createMotion(render) {
    const values = {};
    let raf = 0;
    let reduced = false;
    const norm = (s) => (s !== null && typeof s === 'object' ? s : { to: s });

    function jump(target) {
      cancelAnimationFrame(raf);
      for (const k in target) values[k] = norm(target[k]).to;
      render(values);
    }

    function animate(target, opts = {}) {
      cancelAnimationFrame(raf);
      if (reduced) {
        jump(target);
        return Promise.resolve();
      }
      const base = opts.duration || 850;
      const noDelay = !!opts.noDelay;
      const tracks = [];
      for (const k in target) {
        const s = norm(target[k]);
        tracks.push({
          k,
          from: k in values ? values[k] : s.to,
          to: s.to,
          delay: noDelay ? 0 : s.delay || 0,
          dur: s.dur || base,
          bump: s.bump || 0,
          ease: EASE[s.ease || 'inOut'],
        });
      }
      const total = Math.max(0, ...tracks.map((t) => t.delay + t.dur));
      const t0 = performance.now();
      return new Promise((resolve) => {
        const step = (now) => {
          const elapsed = now - t0;
          for (const t of tracks) {
            const p = Math.min(1, Math.max(0, (elapsed - t.delay) / t.dur));
            values[t.k] = t.from + (t.to - t.from) * t.ease(p) + t.bump * Math.sin(Math.PI * p);
          }
          render(values);
          if (elapsed < total) raf = requestAnimationFrame(step);
          else resolve();
        };
        raf = requestAnimationFrame(step);
      });
    }

    return {
      jump,
      animate,
      values,
      setReduced(b) { reduced = !!b; },
      get reduced() { return reduced; },
    };
  }

  /* ---------- stage, keys, notes ---------- */

  /** fitStage(node, w, h): letterbox-scale a fixed-size stage element to the window. */
  function fitStage(node, w = 1920, h = 1080) {
    const fit = () => {
      const s = Math.min(window.innerWidth / w, window.innerHeight / h);
      const dx = (window.innerWidth - w * s) / 2;
      const dy = (window.innerHeight - h * s) / 2;
      node.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    };
    window.addEventListener('resize', fit);
    fit();
  }

  /** bindKeys({next, prev, notes, motion}): arrows/space/PageUp/Down, N notes, M motion. */
  function bindKeys(h) {
    window.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'ArrowDown') { e.preventDefault(); h.next(); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp') { e.preventDefault(); h.prev(); }
      else if (k === 'n' || k === 'N') h.notes();
      else if (k === 'm' || k === 'M') h.motion();
    });
  }

  /** notesOverlay(container): HTML speaker-notes panel; returns {set(text, label), toggle()}. */
  function notesOverlay(container) {
    const box = document.createElement('div');
    box.className = 'sl-notes';
    box.innerHTML = '<div class="sl-notes-label"></div><div class="sl-notes-text"></div>';
    container.appendChild(box);
    return {
      set(t, label) {
        box.querySelector('.sl-notes-text').textContent = t;
        box.querySelector('.sl-notes-label').textContent = label || '';
      },
      toggle() { box.classList.toggle('on'); },
    };
  }

  /* ---------- chrome: tag, stamp, source line, title ---------- */

  /** tagPlate(parent, {x,y}): station-name plate for the one headline tag; returns {g, set(text, animate)}. */
  function tagPlate(parent, o = {}) {
    const h = 84;
    const g = el('g', { class: 'sl-tag', transform: `translate(${o.x || 56},${o.y || 40})` }, parent);
    const plate = el('rect', { x: 0, y: 0, width: 400, height: h, rx: 6, fill: C.enamel, filter: 'url(#sl-shadow-sm)' }, g);
    el('rect', { x: 0, y: 0, width: 16, height: h, rx: 3, fill: C.route }, g);
    const screws = el('g', {}, g);
    const label = text(g, '', { x: 44, y: 57, size: 46, weight: 700, fill: C.ink, ls: -0.4 });
    let current;
    const widthFor = () => label.getComputedTextLength() + 44 + 40;
    const layout = (w) => {
      plate.setAttribute('width', w);
      screws.innerHTML = '';
      screw(screws, w - 18, 18, 5);
      screw(screws, w - 18, h - 18, 5);
    };
    async function set(str, animate) {
      if (str === current) return;
      current = str;
      if (!str) {
        g.setAttribute('opacity', 0);
        return;
      }
      if (!animate || g.getAttribute('opacity') === '0') {
        label.textContent = str;
        layout(widthFor());
        g.setAttribute('opacity', 1);
        label.setAttribute('opacity', 1);
        return;
      }
      const w0 = Number(plate.getAttribute('width'));
      await tween(120, (p) => label.setAttribute('opacity', 1 - p));
      label.textContent = str;
      const w1 = widthFor();
      await tween(320, (p) => {
        layout(w0 + (w1 - w0) * p);
        label.setAttribute('opacity', p);
      });
    }
    return { g, set };
  }

  /** stampPlate(parent, {text, right, y}): red-bordered enamel status plate (e.g. ILLUSTRATIVE). */
  function stampPlate(parent, o = {}) {
    const g = el('g', { class: 'sl-stamp' }, parent);
    const label = text(g, o.text || 'ILLUSTRATIVE', { size: 22, weight: 800, fill: C.alarm, ls: 3 });
    const w = label.getComputedTextLength() + 44;
    const right = o.right || 1864;
    const y = o.y || 46;
    g.setAttribute('transform', `translate(${right - w},${y})`);
    const plate = el('rect', { x: 0, y: 0, width: w, height: 46, rx: 4, fill: C.enamel, stroke: C.alarm, 'stroke-width': 3, filter: 'url(#sl-shadow-sm)' });
    g.insertBefore(plate, label);
    label.setAttribute('x', 22);
    label.setAttribute('y', 31);
    return g;
  }

  /** sourceLine(parent, {x,y,text,fill}): engraved-looking small print, bottom-left. */
  function sourceLine(parent, o = {}) {
    return text(parent, o.text || '', { x: o.x || 56, y: o.y || 1054, size: 22, weight: 500, fill: o.fill || '#c9d1d8', ls: 0.2 });
  }

  /** titleBlock(parent, {x,y,lines,size}): Swiss title: route rule + roundel + stacked lines. */
  function titleBlock(parent, o) {
    const g = el('g', { class: 'sl-title', transform: `translate(${o.x},${o.y})` }, parent);
    const size = o.size || 96;
    roundel(g, { x: 30, y: 0, r: 26, color: C.routeBright, ring: C.paper });
    el('rect', { x: 72, y: -6, width: 220, height: 12, rx: 6, fill: C.routeBright }, g);
    o.lines.forEach((ln, i) => {
      text(g, ln, { x: 0, y: 40 + size * (i + 1) * 1.02, size, weight: 800, fill: C.paper, ls: -2 });
    });
    return g;
  }

  /* ---------- sky, city, street ---------- */

  /** sky(parent, {w,h}): fixed dusk sky with a low warm horizon glow. */
  function sky(parent, o = {}) {
    const g = el('g', { class: 'sl-sky' }, parent);
    el('rect', { x: 0, y: 0, width: o.w || 1920, height: o.h || 1080, fill: 'url(#sl-sky)' }, g);
    el('rect', { x: 0, y: (o.h || 1080) * 0.35, width: o.w || 1920, height: (o.h || 1080) * 0.65, fill: 'url(#sl-horizon)' }, g);
    return g;
  }

  /**
   * skyline(parent, {x0,x1,ground,seed,maxH,minH,fill,windows,litRate}): flat block
   * city. Each block picks its own window rhythm (grid, ribbon or none) and a few
   * get a roof plant box, so the street never reads as wallpaper. Call twice for
   * depth: a far layer (fill: C.cityFar, windows: false) then a near layer.
   */
  function skyline(parent, o) {
    const g = el('g', { class: 'sl-skyline' }, parent);
    let seed = o.seed || 11;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const fill = o.fill || C.city;
    const litRate = o.litRate ?? 0.07;
    let x = o.x0;
    while (x < o.x1) {
      const w = 160 + Math.floor(rnd() * 220);
      const hgt = (o.minH || 260) + Math.floor(rnd() * ((o.maxH || 700) - (o.minH || 260)));
      const top = o.ground - hgt;
      el('rect', { x, y: top, width: w - 14, height: hgt, fill }, g);
      if (rnd() < 0.35) el('rect', { x: x + w * 0.25, y: top - 34, width: w * 0.3, height: 34, fill }, g);
      const rhythm = o.windows === false ? 'none' : ['grid', 'grid', 'ribbon', 'none'][Math.floor(rnd() * 4)];
      for (let wy = top + 40; rhythm !== 'none' && wy < o.ground - 60; wy += 64) {
        if (rhythm === 'ribbon') {
          // Office-block ribbon glazing: one long strip per floor, rarely lit.
          const lit = rnd() < litRate * 0.6;
          el('rect', { x: x + 22, y: wy + 6, width: w - 58, height: 16, fill: lit ? C.cityLit : C.cityWindow, opacity: lit ? 0.45 : 0.6 }, g);
          continue;
        }
        for (let wx = x + 26; wx < x + w - 50; wx += 52) {
          const lit = rnd() < litRate;
          el('rect', { x: wx, y: wy, width: 22, height: 30, fill: lit ? C.cityLit : C.cityWindow, opacity: lit ? 0.55 : 0.7 }, g);
        }
      }
      x += w;
    }
    return g;
  }

  /** street(parent, {x0,x1,ground,depth}): pavement, kerb, road and lane dashes below `ground`. */
  function street(parent, o) {
    const g = el('g', { class: 'sl-street' }, parent);
    const w = o.x1 - o.x0;
    el('rect', { x: o.x0, y: o.ground, width: w, height: 64, fill: C.pavement }, g);
    for (let x = o.x0; x < o.x1; x += 180) el('rect', { x, y: o.ground, width: 2, height: 64, fill: '#2c333a' }, g);
    el('rect', { x: o.x0, y: o.ground + 64, width: w, height: 12, fill: C.kerb }, g);
    el('rect', { x: o.x0, y: o.ground + 76, width: w, height: o.depth || 600, fill: C.road }, g);
    for (let x = o.x0; x < o.x1; x += 260) {
      el('rect', { x, y: o.ground + 330, width: 130, height: 10, fill: C.lane, opacity: 0.3 }, g);
    }
    return g;
  }

  /** streetLamp(parent, {x,ground,height}): slim steel lamp with a warm pool of light. */
  function streetLamp(parent, o) {
    const g = el('g', { class: 'sl-lamp' }, parent);
    const top = o.ground - (o.height || 760);
    el('ellipse', { cx: o.x + 70, cy: o.ground + 30, rx: 260, ry: 40, fill: '#ffd58a', opacity: 0.08 }, g);
    el('path', { d: `M ${o.x + 70} ${top + 20} L ${o.x - 120} ${o.ground + 40} L ${o.x + 260} ${o.ground + 40} Z`, fill: 'url(#sl-lampglow)' }, g);
    el('rect', { x: o.x - 7, y: top, width: 14, height: o.height || 760, fill: C.steelDark }, g);
    el('path', { d: `M ${o.x} ${top} q 0 -30 40 -30 h 50`, fill: 'none', stroke: C.steelDark, 'stroke-width': 12 }, g);
    el('rect', { x: o.x + 40, y: top - 36, width: 80, height: 18, rx: 4, fill: C.steelDark }, g);
    el('rect', { x: o.x + 48, y: top - 20, width: 64, height: 6, rx: 3, fill: '#ffe2a8' }, g);
    return g;
  }

  /**
   * streetBus(parent, {dest, passengers}): side-elevation municipal bus, origin
   * bottom-left, 480x230, facing right. The cabin is lit; `passengers` (0-8) puts
   * that many silhouettes in the windows, so a full bus and an empty bus can tell
   * a story on their own.
   */
  function streetBus(parent, o = {}) {
    const g = el('g', { class: 'sl-bus' }, parent);
    el('ellipse', { cx: 240, cy: 4, rx: 250, ry: 12, fill: '#000', opacity: 0.35 }, g);
    el('rect', { x: 0, y: -230, width: 480, height: 196, rx: 22, fill: C.enamel }, g);
    el('rect', { x: 0, y: -60, width: 480, height: 26, rx: 0, fill: '#2a3036' }, g);
    el('rect', { x: 0, y: -100, width: 480, height: 18, fill: C.route }, g);
    el('rect', { x: 18, y: -206, width: 394, height: 74, rx: 8, fill: C.cabinLit }, g);
    // Seats fill front to back in a fixed order so the silhouettes look seated, not tiled.
    const SEATS = [372, 168, 270, 64, 330, 120, 228, 34];
    for (let i = 0; i < Math.min(8, o.passengers || 0); i++) {
      const px = SEATS[i];
      const tall = i % 3 === 1 ? -6 : 0;
      el('circle', { cx: px, cy: -170 + tall, r: 13, fill: '#2f3840' }, g);
      el('path', { d: `M ${px - 20} -132 v -12 q 0 -14 20 -14 q 20 0 20 14 v 12 Z`, fill: '#2f3840' }, g);
    }
    el('rect', { x: 18, y: -206, width: 394, height: 18, rx: 6, fill: '#000', opacity: 0.12 }, g);
    for (let x = 116; x < 412; x += 98) el('rect', { x, y: -206, width: 8, height: 74, fill: C.enamelShade }, g);
    el('path', { d: 'M 424 -206 h 30 q 14 0 16 14 l 4 70 h -50 Z', fill: '#26333d' }, g);
    el('rect', { x: 30, y: -202, width: 160, height: 10, rx: 5, fill: '#fff', opacity: 0.08 }, g);
    el('rect', { x: 300, y: -226, width: 160, height: 18, rx: 3, fill: '#1a1f24' }, g);
    text(g, o.dest || 'LOOP', { x: 380, y: -211, size: 16, weight: 800, fill: C.busATint, anchor: 'middle', ls: 3 });
    el('rect', { x: 424, y: -128, width: 40, height: 66, rx: 4, fill: '#26333d' }, g);
    el('rect', { x: 462, y: -78, width: 16, height: 14, rx: 3, fill: '#ffe6b0' }, g);
    el('rect', { x: 2, y: -78, width: 10, height: 14, rx: 3, fill: C.alarm, opacity: 0.85 }, g);
    for (const cx of [92, 384]) {
      el('path', { d: `M ${cx - 46} -34 a 46 46 0 0 1 92 0 Z`, fill: '#2a3036' }, g);
      el('circle', { cx, cy: -30, r: 32, fill: '#121518' }, g);
      el('circle', { cx, cy: -30, r: 13, fill: '#6c757d' }, g);
    }
    return g;
  }

  /** shelter(parent, o): canopy lightbox, posts, back wall with seams, bench; returns {g, fascia, wall}. */
  function shelter(parent, o) {
    const g = el('g', { class: 'sl-shelter' }, parent);
    const { x0, x1, boxTop, boxBottom, ground } = o;
    // back wall
    el('rect', { x: x0 + 20, y: boxBottom, width: x1 - x0 - 40, height: ground - boxBottom, fill: C.wall }, g);
    for (let x = x0 + 20; x < x1 - 20; x += 320) el('rect', { x, y: boxBottom, width: 3, height: ground - boxBottom, fill: C.wallSeam }, g);
    el('rect', { x: x0 + 20, y: boxBottom, width: x1 - x0 - 40, height: ground - boxBottom, fill: 'url(#sl-walllight)' }, g);
    const wall = el('g', {}, g); // content mounted on the wall
    // posts
    for (const px of [x0, x1 - 40]) {
      el('rect', { x: px, y: boxBottom, width: 40, height: ground - boxBottom, fill: 'url(#sl-steel-h)' }, g);
    }
    // canopy lightbox
    el('rect', { x: x0 - 40, y: boxTop - 24, width: x1 - x0 + 80, height: 24, fill: C.steelDark }, g);
    el('rect', { x: x0 - 40, y: boxTop, width: x1 - x0 + 80, height: boxBottom - boxTop, fill: '#30373e' }, g);
    el('rect', { x: x0 - 22, y: boxTop + 18, width: x1 - x0 + 44, height: boxBottom - boxTop - 36, fill: 'url(#sl-lightbox)' }, g);
    el('rect', { x: x0 - 40, y: boxBottom - 4, width: x1 - x0 + 80, height: 22, fill: '#1c2126' }, g);
    const fascia = el('g', { class: 'sl-fascia' }, g);
    // soft light falling from the lightbox onto the pavement in front
    el('rect', { x: x0 - 40, y: ground, width: x1 - x0 + 80, height: 64, fill: '#ffe9c2', opacity: 0.05 }, g);
    return { g, wall, fascia };
  }

  /** bench(parent, {x0,x1,seat,ground}): steel slat bench. */
  function bench(parent, o) {
    const g = el('g', { class: 'sl-bench' }, parent);
    el('rect', { x: o.x0, y: o.seat - 70, width: o.x1 - o.x0, height: 14, rx: 6, fill: C.steelDark }, g);
    el('rect', { x: o.x0, y: o.seat, width: o.x1 - o.x0, height: 18, rx: 6, fill: C.steel }, g);
    for (const x of [o.x0 + 40, o.x1 - 60]) el('rect', { x, y: o.seat, width: 20, height: o.ground - o.seat, fill: C.steelDark }, g);
    return g;
  }

  /** stopLine(parent, {x,ground,label}): painted kerbside stop bar on the road plus a stencilled word (e.g. HOLD). */
  function stopLine(parent, o) {
    const g = el('g', { class: 'sl-stopline' }, parent);
    const top = o.ground + 82;
    el('rect', { x: o.x - 9, y: top, width: 18, height: 230, fill: C.lane, opacity: 0.85 }, g);
    for (let y = top + 250; y < top + 420; y += 44) el('rect', { x: o.x - 9, y, width: 18, height: 24, fill: C.lane, opacity: 0.5 }, g);
    if (o.label) text(g, o.label, { x: o.x + 30, y: top + 300, size: 64, weight: 800, fill: C.lane, opacity: 0.55, ls: 10 });
    return g;
  }

  /** timingPost(parent, {x,ground,text,height}): pole carrying a HOLD-style enamel plate with pause icon. */
  function timingPost(parent, o) {
    const g = el('g', { class: 'sl-post' }, parent);
    const top = o.ground - (o.height || 470);
    el('rect', { x: o.x - 8, y: top, width: 16, height: o.ground - top + 20, fill: C.steel }, g);
    const plate = el('g', { transform: `translate(${o.x},${top})` }, g);
    const label = text(plate, o.text, { x: 0, y: 0, size: o.size || 56, weight: 800, fill: C.ink, ls: 0 });
    const tw = label.getComputedTextLength();
    const pad = 36;
    const icon = 70;
    const w = tw + icon + pad * 2 + 20;
    const hgt = (o.size || 56) * 1.9;
    const bx = -w / 2;
    const backing = el('rect', { x: bx, y: -hgt / 2, width: w, height: hgt, rx: 8, fill: C.enamel, stroke: C.ink, 'stroke-width': 5, filter: 'url(#sl-shadow-sm)' });
    plate.insertBefore(backing, label);
    el('rect', { x: bx + pad, y: -26, width: 20, height: 52, rx: 4, fill: C.alarm }, plate);
    el('rect', { x: bx + pad + 34, y: -26, width: 20, height: 52, rx: 4, fill: C.alarm }, plate);
    label.setAttribute('x', bx + pad + icon + 20);
    label.setAttribute('y', (o.size || 56) * 0.36);
    return g;
  }

  /* ---------- map primitives ---------- */

  /** enamelPanel(parent, {x,y,w,h,frame}): steel-framed vitreous-enamel panel with grain, sheen and screws. */
  function enamelPanel(parent, o) {
    const f = o.frame || 18;
    const g = el('g', { class: 'sl-panel' }, parent);
    el('rect', { x: o.x, y: o.y, width: o.w, height: o.h, rx: 10, fill: 'url(#sl-steel)', filter: 'url(#sl-shadow)' }, g);
    el('rect', { x: o.x + f, y: o.y + f, width: o.w - 2 * f, height: o.h - 2 * f, rx: 6, fill: o.fill || C.enamel }, g);
    el('rect', { x: o.x + f, y: o.y + f, width: o.w - 2 * f, height: o.h - 2 * f, rx: 6, fill: '#000', filter: 'url(#sl-grain)', opacity: 0.55 }, g);
    el('rect', { x: o.x + f, y: o.y + f, width: o.w - 2 * f, height: o.h - 2 * f, rx: 6, fill: 'url(#sl-sheen)' }, g);
    el('rect', { x: o.x + f + 1, y: o.y + f + 1, width: o.w - 2 * f - 2, height: o.h - 2 * f - 2, rx: 6, fill: 'none', stroke: '#000', 'stroke-opacity': 0.12, 'stroke-width': 2 }, g);
    for (const [sx, sy] of [[o.x + f / 2, o.y + f / 2], [o.x + o.w - f / 2, o.y + f / 2], [o.x + f / 2, o.y + o.h - f / 2], [o.x + o.w - f / 2, o.y + o.h - f / 2]]) {
      screw(g, sx, sy);
    }
    const content = el('g', {}, g);
    return { g, content, inner: { x: o.x + f, y: o.y + f, w: o.w - 2 * f, h: o.h - 2 * f } };
  }

  let clipCount = 0;
  /**
   * mapGeography(parent, {x,y,w,h,river,parks}): the faint printed city under a
   * route map: street grid, an optional river (cubic path d) and park blocks
   * ([[x,y,w,h]...]). Kept at ~1.2:1 contrast so it never competes with data.
   */
  function mapGeography(parent, o) {
    const id = `sl-geo-${++clipCount}`;
    const defs = el('clipPath', { id }, parent);
    el('rect', { x: o.x, y: o.y, width: o.w, height: o.h, rx: 6 }, defs);
    const g = el('g', { class: 'sl-geo', 'clip-path': `url(#${id})` }, parent);
    for (const [px, py, pw, ph] of o.parks || []) {
      el('rect', { x: px, y: py, width: pw, height: ph, rx: 18, fill: '#dfe2cc' }, g);
    }
    const step = o.step || 104;
    for (let gx = o.x + step / 2; gx < o.x + o.w; gx += step) {
      el('line', { x1: gx, y1: o.y, x2: gx, y2: o.y + o.h, stroke: '#e3dac8', 'stroke-width': 5 }, g);
    }
    for (let gy = o.y + step / 2; gy < o.y + o.h; gy += step) {
      el('line', { x1: o.x, y1: gy, x2: o.x + o.w, y2: gy, stroke: '#e3dac8', 'stroke-width': 5 }, g);
    }
    if (o.river) {
      el('path', { d: o.river, fill: 'none', stroke: '#d6ddda', 'stroke-width': 58, 'stroke-linecap': 'round' }, g);
    }
    return g;
  }

  /** screw(parent, x, y, r): slotted steel screw head. */
  function screw(parent, x, y, r = 6) {
    el('circle', { cx: x, cy: y, r, fill: C.steelLight, stroke: C.steelDark, 'stroke-width': 1.5 }, parent);
    el('line', { x1: x - r * 0.6, y1: y + r * 0.3, x2: x + r * 0.6, y2: y - r * 0.3, stroke: C.steelDark, 'stroke-width': 1.6 }, parent);
  }

  /** roundel(parent, {x,y,r,color,ring}): transit roundel mark (ring + bar), generic and unbranded. */
  function roundel(parent, o) {
    const g = el('g', { transform: `translate(${o.x},${o.y})` }, parent);
    el('circle', { r: o.r, fill: 'none', stroke: o.color, 'stroke-width': o.r * 0.38 }, g);
    el('rect', { x: -o.r * 1.35, y: -o.r * 0.2, width: o.r * 2.7, height: o.r * 0.4, fill: o.ring || C.ink }, g);
    return g;
  }

  /** chamferLoop({x,y,w,h,c}): closed 45-degree octagon path, starting top-centre, clockwise. */
  function chamferLoop(o) {
    const { x, y, w, h, c } = o;
    const cx = x + w / 2;
    return `M ${cx} ${y} L ${x + w - c} ${y} L ${x + w} ${y + c} L ${x + w} ${y + h - c} ` +
      `L ${x + w - c} ${y + h} L ${x + c} ${y + h} L ${x} ${y + h - c} L ${x} ${y + c} L ${x + c} ${y} Z`;
  }

  /** routeLine(parent, {d,color,width}): thick route line; returns {path, length, at(t), band(color,width)}. */
  function routeLine(parent, o) {
    const g = el('g', { class: 'sl-route' }, parent);
    const bands = el('g', {}, g);
    const path = el('path', { d: o.d, fill: 'none', stroke: o.color || C.route, 'stroke-width': o.width || 30, 'stroke-linejoin': 'round' }, g);
    const length = path.getTotalLength();
    const ticks = el('g', {}, g);
    /** at(t): point {x,y,nx,ny} at loop fraction t (wraps); n = outward normal for a clockwise loop. */
    function at(t) {
      const s = (((t % 1) + 1) % 1) * length;
      const p = path.getPointAtLength(s);
      const q = path.getPointAtLength(Math.min(length, s + 1));
      const p0 = path.getPointAtLength(Math.max(0, s - 1));
      const dx = q.x - p0.x;
      const dy = q.y - p0.y;
      const m = Math.hypot(dx, dy) || 1;
      return { x: p.x, y: p.y, nx: dy / m, ny: -dx / m };
    }
    /** band(color, width): translucent highlight under the line; returns {set(t0,t1), node}. */
    function band(color, width) {
      const node = el('path', { d: o.d, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'butt' }, bands);
      return {
        node,
        set(t0, t1) {
          const span = ((((t1 - t0) % 1) + 1) % 1) * length;
          node.setAttribute('stroke-dasharray', `${span} ${length - span}`);
          node.setAttribute('stroke-dashoffset', -((((t0 % 1) + 1) % 1) * length));
        },
      };
    }
    return { g, path, length, at, band, ticks };
  }

  /** stationTick(route, t, {len,width,color}): outward station tick on a routeLine at fraction t. */
  function stationTick(route, t, o = {}) {
    const p = route.at(t);
    const len = o.len || 30;
    return el('line', {
      x1: p.x, y1: p.y, x2: p.x + p.nx * len, y2: p.y + p.ny * len,
      stroke: o.color || C.route, 'stroke-width': o.width || 14, 'stroke-linecap': 'butt',
    }, route.ticks);
  }

  /** interchange(parent, {x,y,r}): white ring stop with ink outline (your stop / key stop). */
  function interchange(parent, o) {
    const g = el('g', {}, parent);
    el('circle', { cx: o.x, cy: o.y, r: o.r || 24, fill: '#fff', stroke: C.ink, 'stroke-width': 9 }, g);
    return g;
  }

  /** busToken(parent, {letter,fill,ink}): enamel magnet token with bus pictogram; returns {g, place(x,y,scale)}. */
  function busToken(parent, o) {
    const g = el('g', { class: 'sl-token' }, parent);
    const w = 104;
    const h = 62;
    el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: o.fill, stroke: '#fff', 'stroke-width': 5, filter: 'url(#sl-shadow-sm)' }, g);
    // mini bus pictogram
    const ic = el('g', { transform: 'translate(-40,-15)' }, g);
    el('rect', { x: 0, y: 0, width: 34, height: 24, rx: 5, fill: o.ink }, ic);
    el('rect', { x: 4, y: 4, width: 26, height: 8, rx: 2, fill: o.fill }, ic);
    el('circle', { cx: 8, cy: 26, r: 4, fill: o.ink }, ic);
    el('circle', { cx: 26, cy: 26, r: 4, fill: o.ink }, ic);
    text(g, o.letter, { x: 20, y: 15, size: 42, weight: 800, fill: o.ink, anchor: 'middle' });
    return { g, place(x, y, s = 1) { g.setAttribute('transform', `translate(${x},${y}) scale(${s})`); } };
  }

  /** crowd(parent, {spots:[[x,y]...], color, size}): pictogram queue; returns {g, set(p)} where p reveals one figure at a time. */
  function crowd(parent, o) {
    const g = el('g', { class: 'sl-crowd' }, parent);
    const s = o.size || 1;
    const figures = o.spots.map(([x, y]) => {
      const base = `translate(${x},${y}) scale(${s})`;
      const f = el('g', { transform: base }, g);
      el('circle', { cx: 0, cy: -50, r: 10.5, fill: o.color || C.ink }, f);
      el('rect', { x: -13, y: -36, width: 26, height: 30, rx: 12, fill: o.color || C.ink }, f);
      el('rect', { x: -9, y: -14, width: 7, height: 16, rx: 3.5, fill: o.color || C.ink }, f);
      el('rect', { x: 2, y: -14, width: 7, height: 16, rx: 3.5, fill: o.color || C.ink }, f);
      return { f, base };
    });
    return {
      g,
      set(p) {
        const n = figures.length;
        figures.forEach(({ f, base }, i) => {
          const local = Math.min(1, Math.max(0, p * n - i));
          f.setAttribute('opacity', local);
          f.setAttribute('transform', `${base} translate(0,${((1 - local) * 10).toFixed(2)})`);
        });
      },
    };
  }

  /** feedbackLoop(parent, {cx,cy,r,labels[4],center[2],color}): a second, red loop line with 4 labelled stations; set(p) draws it then labels one by one. */
  function feedbackLoop(parent, o) {
    const g = el('g', { class: 'sl-feedback' }, parent);
    const { cx, cy, r } = o;
    const color = o.color || C.alarm;
    const d = `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`;
    const line = el('path', { d, fill: 'none', stroke: color, 'stroke-width': 16 }, g);
    const L = 2 * Math.PI * r;
    line.setAttribute('stroke-dasharray', `${L} ${L}`);
    const chevrons = [45, 135, 225, 315].map((deg) => {
      const a = (deg * Math.PI) / 180;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      return el('path', {
        d: 'M -13 -17 L 17 0 L -13 17 Z', fill: color, stroke: C.enamel, 'stroke-width': 4, 'stroke-linejoin': 'round',
        transform: `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${deg + 90})`,
      }, g);
    });
    const spots = [
      { a: -90, dx: 0, dy: -36, anchor: 'middle' },
      { a: 0, dx: 34, dy: 10, anchor: 'start' },
      { a: 90, dx: 0, dy: 58, anchor: 'middle' },
      { a: 180, dx: -34, dy: 10, anchor: 'end' },
    ];
    const stations = spots.map((s, i) => {
      const a = (s.a * Math.PI) / 180;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      const sg = el('g', {}, g);
      el('circle', { cx: x, cy: y, r: 16, fill: '#fff', stroke: color, 'stroke-width': 7 }, sg);
      text(sg, o.labels[i], { x: x + s.dx, y: y + s.dy, size: 30, weight: 800, fill: C.ink, anchor: s.anchor, ls: 0.5 });
      return sg;
    });
    const center = el('g', {}, g);
    (o.center || []).forEach((ln, i, arr) => {
      text(center, ln, { x: cx, y: cy + 11 + (i - (arr.length - 1) / 2) * 34, size: 28, weight: 800, fill: color, anchor: 'middle', ls: 2 });
    });
    const ramp = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
    return {
      g,
      set(p) {
        g.setAttribute('opacity', p > 0 ? 1 : 0);
        line.setAttribute('stroke-dashoffset', L * (1 - ramp(p, 0, 0.4)));
        chevrons.forEach((c) => c.setAttribute('opacity', ramp(p, 0.3, 0.45)));
        stations.forEach((s, i) => s.setAttribute('opacity', ramp(p, 0.2 + i * 0.17, 0.3 + i * 0.17)));
        center.setAttribute('opacity', ramp(p, 0.9, 1));
      },
    };
  }

  /* ---------- display / gauge ---------- */

  /** displayHousing(parent, {x,y,w,h}): steel-framed backlit display; returns {g, face:{x,y,w,h}}. */
  function displayHousing(parent, o) {
    const g = el('g', { class: 'sl-display' }, parent);
    el('rect', { x: o.x, y: o.y, width: o.w, height: o.h, rx: 12, fill: 'url(#sl-steel)', filter: 'url(#sl-shadow)' }, g);
    const f = { x: o.x + 16, y: o.y + 16, w: o.w - 32, h: o.h - 32 };
    el('rect', { x: f.x, y: f.y, width: f.w, height: f.h, rx: 6, fill: 'url(#sl-display)' }, g);
    el('rect', { x: f.x, y: f.y, width: f.w, height: f.h, rx: 6, fill: 'url(#sl-scan)' }, g);
    for (const [sx, sy] of [[o.x + 8, o.y + 8], [o.x + o.w - 8, o.y + 8], [o.x + 8, o.y + o.h - 8], [o.x + o.w - 8, o.y + o.h - 8]]) screw(g, sx, sy, 4.5);
    return { g, face: f };
  }

  /**
   * gapGauge(parent, {x,y,w,h,total,title,labels[2],tints[2],fills[2]}): backlit split
   * readout over one fixed rail, so the two parts visibly sum to `total`.
   * Returns {g, set(leftValue, power)}; power 0 = display off.
   */
  function gapGauge(parent, o) {
    const housing = displayHousing(parent, o);
    const g = housing.g;
    const f = housing.face;
    const total = o.total || 20;
    const pad = 30;
    text(g, o.title || '', { x: f.x + pad, y: f.y + 48, size: 28, weight: 700, fill: C.mutedOnDark, ls: 3 });
    const rx = f.x + pad;
    const rw = f.w - pad * 2;
    const ry = f.y + f.h - 116;
    const rh = 36;
    el('rect', { x: rx, y: ry, width: rw, height: rh, rx: 4, fill: C.displayRail }, g);
    el('line', { x1: f.x + f.w / 2, y1: f.y + 76, x2: f.x + f.w / 2, y2: f.y + 236, stroke: '#2b353e', 'stroke-width': 3 }, g);
    const lit = el('g', {}, g);
    text(lit, o.labels[0], { x: f.x + pad, y: f.y + 104, size: 28, weight: 700, fill: o.tints[0], ls: 0.5 });
    text(lit, o.labels[1], { x: f.x + f.w - pad, y: f.y + 104, size: 28, weight: 700, fill: o.tints[1], anchor: 'end', ls: 0.5 });
    const mk = (x, anchor, tint) => {
      const t = text(lit, '', { x, y: f.y + 226, size: 116, weight: 800, fill: tint, anchor, ls: -3, filter: 'url(#sl-glow)' });
      const num = el('tspan', {}, t);
      const unit = el('tspan', { 'font-size': 38, 'font-weight': 600, 'letter-spacing': 0, dx: 12 }, t);
      unit.textContent = 'min';
      return num;
    };
    const numL = mk(f.x + pad, 'start', o.tints[0]);
    const numR = mk(f.x + f.w - pad, 'end', o.tints[1]);
    const fillL = el('rect', { x: rx, y: ry, width: rw / 2, height: rh, fill: o.fills[0] }, lit);
    const fillR = el('rect', { x: rx + rw / 2, y: ry, width: rw / 2, height: rh, fill: o.fills[1] }, lit);
    for (let i = 0; i <= total; i++) {
      const tx = rx + (rw * i) / total;
      const major = i % 10 === 0;
      el('line', { x1: tx, y1: ry + rh + 6, x2: tx, y2: ry + rh + (major ? 26 : 16), stroke: C.mutedOnDark, 'stroke-width': major ? 3 : 2 }, g);
    }
    text(g, '0', { x: rx, y: ry + rh + 58, size: 28, weight: 600, fill: C.mutedOnDark, anchor: 'start' });
    text(g, String(total / 2), { x: rx + rw / 2, y: ry + rh + 58, size: 28, weight: 600, fill: C.mutedOnDark, anchor: 'middle' });
    text(g, `${total} min`, { x: rx + rw, y: ry + rh + 58, size: 28, weight: 600, fill: C.mutedOnDark, anchor: 'end' });
    const needle = el('g', {}, lit);
    el('rect', { x: -5, y: ry - 16, width: 10, height: rh + 32, rx: 3, fill: '#fff' }, needle);
    el('circle', { cx: 0, cy: ry - 18, r: 10, fill: '#fff' }, needle);
    return {
      g,
      set(left, power) {
        const L = Math.round(left);
        numL.textContent = String(L);
        numR.textContent = String(total - L);
        const wl = (rw * left) / total;
        fillL.setAttribute('width', Math.max(0, wl));
        fillR.setAttribute('x', rx + wl);
        fillR.setAttribute('width', Math.max(0, rw - wl));
        needle.setAttribute('transform', `translate(${rx + wl},0)`);
        lit.setAttribute('opacity', power);
      },
    };
  }

  /* ---------- the rider ---------- */

  /**
   * RIDER_POSES: joint angles (deg). lean = torso from vertical (+ forward);
   * head = head tilt relative to torso (+ nods down); uF/eF, uB/eB = front/back
   * arm upper angle from straight down (+ forward) and elbow bend; hF/kF, hB/kB =
   * hip and knee; bob = lift in px; watch = wristwatch visibility; mouth =
   * -1 frown .. +1 smile; open = 0..1 open "o" mouth (alarm). `present` is the
   * resolved pose: open arm held out toward the fix, smiling.
   */
  const RIDER_POSES = {
    wait: { lean: 0, head: 6, uF: 6, eF: 10, uB: -6, eB: 8, hF: 5, kF: 2, hB: -5, kB: 2, bob: 0, watch: 0, mouth: 0, open: 0 },
    look: { lean: -1, head: -10, uF: 14, eF: 34, uB: -10, eB: 8, hF: 6, kF: 0, hB: -6, kB: 4, bob: 0, watch: 0, mouth: 0.1, open: 0 },
    shrug: { lean: -4, head: -12, uF: 24, eF: 82, uB: 16, eB: 86, hF: 8, kF: 0, hB: -8, kB: 0, bob: 0, watch: 0, mouth: -0.6, open: 0 },
    watch: { lean: 3, head: 28, uF: 32, eF: 96, uB: -30, eB: 104, hF: 5, kF: 2, hB: -5, kB: 2, bob: 0, watch: 1, mouth: -0.8, open: 0 },
    alarm: { lean: -11, head: -12, uF: 150, eF: 112, uB: 138, eB: 122, hF: 14, kF: 6, hB: -12, kB: 4, bob: 6, watch: 0, mouth: 0, open: 1 },
    point: { lean: -1, head: -26, uF: 146, eF: -6, uB: -8, eB: 14, hF: 5, kF: 2, hB: -5, kB: 2, bob: 0, watch: 0, mouth: 0.8, open: 0 },
    present: { lean: -3, head: -14, uF: 112, eF: -10, uB: -8, eB: 16, hF: 7, kF: 2, hB: -6, kB: 3, bob: 0, watch: 0, mouth: 1, open: 0 },
  };

  /** posePrefixed(prefix, name, timing): a pose as flat motion keys `${prefix}.${joint}`. */
  function posePrefixed(prefix, name, timing) {
    const out = {};
    const pose = RIDER_POSES[name];
    for (const k in pose) out[`${prefix}.${k}`] = timing ? { to: pose[k], ...timing } : pose[k];
    return out;
  }

  /**
   * rider(parent, {color, accent, scale}): the pictogram rider (flat cap, scarf,
   * one eye, a small mouth). Returns {g, update(values, prefix), setBadge(glyph), blink()}.
   * update() reads `${prefix}.x/.y/.s/.face/.stride/.badge` plus every pose joint;
   * `.s` (default o.scale) lets the rider step toward the camera in wide shots.
   * The body carries a thin ink outline (#sl-outline) so the cream figure still
   * separates when it walks in front of cream enamel.
   */
  function rider(parent, o = {}) {
    const col = o.color || C.paper;
    const back = o.backColor || C.paperShade;
    const accent = o.accent || C.routeBright;
    const root = el('g', { class: 'sl-rider' }, parent);
    el('ellipse', { cx: 0, cy: 4, rx: 70, ry: 10, fill: '#000', opacity: 0.3 }, root);
    const flip = el('g', { filter: 'url(#sl-outline)' }, root);
    const limb = (c, w) => el('path', { fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, flip);
    const legB = limb(back, 32);
    const armB = limb(back, 26);
    const legF = limb(col, 32);
    const scarfTail = limb(accent, 16);
    const torso = limb(col, 78);
    const strap = limb('#5b6772', 7);
    const bag = el('rect', { width: 46, height: 40, rx: 8, fill: '#5b6772' }, flip);
    const scarf = limb(accent, 18);
    const head = el('g', {}, flip);
    el('circle', { cx: 0, cy: 0, r: 34, fill: col }, head);
    el('path', { d: 'M -36 -10 A 36 33 0 0 1 36 -10 L 66 -6 Q 70 -1 64 2 L -36 2 Z', fill: accent }, head);
    const eye = el('ellipse', { cx: 17, cy: 12, rx: 4.5, ry: 4.5, fill: C.ink }, head);
    const mouth = el('path', { fill: 'none', stroke: C.ink, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, head);
    const mouthO = el('ellipse', { cx: 20, cy: 25, rx: 4, ry: 0, fill: C.ink }, head);
    const armF = limb(col, 26);
    const watch = el('circle', { r: 9, fill: C.ink, stroke: accent, 'stroke-width': 3 }, flip);
    const badgeG = el('g', { opacity: 0 }, root);
    el('circle', { cx: 0, cy: 0, r: 36, fill: C.enamel, stroke: C.alarm, 'stroke-width': 6, filter: 'url(#sl-shadow-sm)' }, badgeG);
    const badgeText = text(badgeG, '!', { x: 0, y: 17, size: 50, weight: 800, fill: C.alarm, anchor: 'middle' });

    const rad = (d) => (d * Math.PI) / 180;
    const down = (p, len, deg) => ({ x: p.x + len * Math.sin(rad(deg)), y: p.y + len * Math.cos(rad(deg)) });
    const pt = (p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

    function update(v, prefix = 'rider') {
      const g = (k, d = 0) => (v[`${prefix}.${k}`] ?? d);
      const x = g('x');
      const y = g('y');
      const face = g('face', 1);
      const scale = g('s', o.scale || 1);
      const stride = g('stride');
      const phase = x * 0.028;
      const swing = Math.sin(phase) * 24 * stride;
      root.setAttribute('transform', `translate(${x},${y}) scale(${scale})`);
      flip.setAttribute('transform', `scale(${face},1)`);

      const bob = g('bob') + Math.abs(Math.sin(phase)) * 6 * stride;
      const hip = { x: 0, y: -172 - bob };
      const knee = (h) => down(hip, 88, h);
      const leg = (h, k) => {
        const kn = knee(h);
        const ft = down(kn, 88, h - k);
        return `M ${pt(hip)} L ${pt(kn)} L ${pt(ft)} l 20 0`;
      };
      legF.setAttribute('d', leg(g('hF') + swing, g('kF') + Math.max(0, swing) * 0.6));
      legB.setAttribute('d', leg(g('hB') - swing, g('kB') + Math.max(0, -swing) * 0.6));

      const lean = g('lean');
      const shoulder = { x: hip.x + 150 * Math.sin(rad(lean)), y: hip.y - 150 * Math.cos(rad(lean)) };
      const hipTop = { x: hip.x + 14 * Math.sin(rad(lean)), y: hip.y - 14 * Math.cos(rad(lean)) };
      torso.setAttribute('d', `M ${pt(hipTop)} L ${pt(shoulder)}`);
      // Commuter satchel: strap across the chest, bag at the back hip.
      const bagAt = { x: hip.x - 44 + 10 * Math.sin(rad(lean)), y: hip.y - 10 };
      strap.setAttribute('d', `M ${pt({ x: shoulder.x + 22, y: shoulder.y + 8 })} L ${pt({ x: bagAt.x + 20, y: bagAt.y })}`);
      bag.setAttribute('x', (bagAt.x - 18).toFixed(1));
      bag.setAttribute('y', (bagAt.y - 8).toFixed(1));

      const neck = { x: shoulder.x + 30 * Math.sin(rad(lean)), y: shoulder.y - 30 * Math.cos(rad(lean)) };
      const across = { x: Math.cos(rad(lean)), y: Math.sin(rad(lean)) };
      scarf.setAttribute('d', `M ${pt({ x: neck.x - across.x * 30, y: neck.y - across.y * 30 })} L ${pt({ x: neck.x + across.x * 30, y: neck.y + across.y * 30 })}`);
      const tailStart = { x: neck.x - across.x * 26, y: neck.y - across.y * 26 };
      scarfTail.setAttribute('d', `M ${pt(tailStart)} l ${-18 - stride * 20} ${62 - stride * 18}`);

      const headAngle = lean + g('head');
      const hc = { x: shoulder.x + 82 * Math.sin(rad(lean)), y: shoulder.y - 82 * Math.cos(rad(lean)) };
      const m = g('mouth');
      const open = g('open');
      mouth.setAttribute('d', `M 11 24 Q 19 ${(24 + 7 * m).toFixed(1)} 27 ${(22 - m).toFixed(1)}`);
      mouth.setAttribute('opacity', 1 - open);
      mouthO.setAttribute('ry', (6 * open).toFixed(2));
      head.setAttribute('transform', `translate(${pt(hc).replace(' ', ',')}) rotate(${headAngle.toFixed(2)})`);

      const sh = { x: shoulder.x - 6 * Math.sin(rad(lean)), y: shoulder.y + 6 };
      const arm = (u, e) => {
        const el1 = down(sh, 72, u);
        const hand = down(el1, 66, u + e);
        return { d: `M ${pt(sh)} L ${pt(el1)} L ${pt(hand)}`, el1, hand };
      };
      const af = arm(g('uF') - swing * 0.7, g('eF'));
      const ab = arm(g('uB') + swing * 0.7, g('eB'));
      armF.setAttribute('d', af.d);
      armB.setAttribute('d', ab.d);
      const wp = { x: af.el1.x + (af.hand.x - af.el1.x) * 0.72, y: af.el1.y + (af.hand.y - af.el1.y) * 0.72 };
      watch.setAttribute('cx', wp.x);
      watch.setAttribute('cy', wp.y);
      watch.setAttribute('opacity', g('watch'));

      badgeG.setAttribute('opacity', g('badge'));
      badgeG.setAttribute('transform', `translate(${(hc.x - 96) * face},${hc.y - 46})`);
    }

    return {
      g: root,
      update,
      setBadge(glyph) { badgeText.textContent = glyph; },
      blink() {
        tween(140, (p) => eye.setAttribute('ry', 4.5 * Math.abs(1 - 2 * p) + 0.6), EASE.linear);
      },
    };
  }

  global.SignalLine = {
    C, FONT, EASE, RIDER_POSES,
    el, text, loadFonts, installDefs, tween, createMotion,
    fitStage, bindKeys, notesOverlay,
    tagPlate, stampPlate, sourceLine, titleBlock,
    sky, skyline, street, streetLamp, streetBus, shelter, bench, stopLine, timingPost,
    enamelPanel, mapGeography, screw, roundel, chamferLoop, routeLine, stationTick, interchange,
    busToken, crowd, feedbackLoop, displayHousing, gapGauge,
    rider, posePrefixed,
  };
})(window);
