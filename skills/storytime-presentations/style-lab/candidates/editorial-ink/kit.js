/* Editorial Ink — reusable style kit for storytime decks.
 *
 * Plain browser JS (no modules). Load with <script src="kit.js"> and use the
 * global `Ink`. Everything draws into inline SVG on a 1920x1080 stage.
 * World rules this kit enforces: black confident line on cotton paper, hatch and
 * stipple instead of gradients, ONE claim colour (the editor's red pencil), one
 * data colour (Prussian blue), warm ochre only on the character.
 */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  /** Palette tokens; each has one semantic job. Contrast quoted against paper. */
  const TOKENS = {
    paper: "#F1EADB", // ground: cotton paper
    paperLight: "#F9F5EC", // printed matter lying on the paper (posters, news)
    ink: "#1C1A17", // all linework and primary text (14.5:1)
    inkSoft: "#4D463E", // secondary text and small print (7.7:1)
    inkFaint: "#A39886", // receding background linework, never text
    red: "#B02E1C", // editor's red pencil: marks THE claim only (5.6:1)
    blue: "#1F4A66", // data ink: the measured quantity (7.9:1)
    blueWash: "#A9C1CF", // data wash fill
    ochre: "#B07E3A", // character shadow
    ochreWash: "#DCBE8A", // character coat
    skin: "#EFD6BC",
  };

  /** Font stacks: Fraunces = voice, Source Serif 4 = captions, Caveat = pencil. */
  const FONTS = {
    display: "'Fraunces', Georgia, serif",
    text: "'Source Serif 4', Georgia, serif",
    hand: "'Caveat', 'Bradley Hand', cursive",
  };

  const state = { reduced: false };

  // ---------------------------------------------------------------- basics

  /** Create an SVG element with attributes and append it to `parent`. */
  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === undefined || value === null) continue;
      if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  /** Draw real SVG text. o: size, font (display|text|hand), weight, italic, fill, anchor, ls, caps. */
  function text(parent, x, y, str, o = {}) {
    const node = el(
      "text",
      {
        x,
        y,
        "font-family": FONTS[o.font || "display"],
        "font-size": o.size || 32,
        "font-weight": o.weight || 400,
        "font-style": o.italic ? "italic" : "normal",
        fill: o.fill || TOKENS.ink,
        "text-anchor": o.anchor || "start",
        "letter-spacing": o.ls || 0,
        transform: o.rotate ? `rotate(${o.rotate} ${x} ${y})` : undefined,
      },
      parent,
    );
    node.textContent = o.caps ? String(str).toUpperCase() : str;
    return node;
  }

  /** Deterministic RNG (mulberry32) so drawings are identical on every render. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Linear interpolation between numbers. */
  const lerp = (a, b, t) => a + (b - a) * t;
  /** Clamp to [lo, hi]. */
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  /** Interpolate between two points. */
  const lerpPt = (p, q, t) => ({ x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t) });

  /** Smooth Catmull-Rom path through points (closed if `closed`). */
  function smoothPath(points, closed = false) {
    const p = points;
    if (p.length < 2) return "";
    let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
    const n = p.length;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = p[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      const p1 = p[i];
      const p2 = p[closed ? (i + 1) % n : i + 1];
      const p3 = p[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
      const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
      d +=
        ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},` +
        `${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return closed ? d + "Z" : d;
  }

  /** Polygon "points" attribute from an array of {x,y}. */
  const pts = (arr) => arr.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

  // ---------------------------------------------------------- defs & paper

  function hatchPattern(defs, id, o) {
    const size = o.spacing;
    const pat = el(
      "pattern",
      {
        id,
        width: size,
        height: size,
        patternUnits: "userSpaceOnUse",
        patternTransform: `rotate(${o.angle || 45})`,
      },
      defs,
    );
    if (o.bg) el("rect", { width: size, height: size, fill: o.bg }, pat);
    el(
      "line",
      { x1: 0, y1: 0, x2: 0, y2: size, stroke: o.color, "stroke-width": o.width, opacity: o.opacity || 1 },
      pat,
    );
    if (o.cross) {
      el(
        "line",
        { x1: 0, y1: size / 2, x2: size, y2: size / 2, stroke: o.color, "stroke-width": o.width * 0.8, opacity: o.opacity || 1 },
        pat,
      );
    }
  }

  function stipplePattern(defs, id, o) {
    const size = o.size || 26;
    const pat = el("pattern", { id, width: size, height: size, patternUnits: "userSpaceOnUse" }, defs);
    if (o.bg) el("rect", { width: size, height: size, fill: o.bg }, pat);
    const rand = rng(o.seed || 7);
    for (let i = 0; i < o.dots; i++) {
      el("circle", { cx: rand() * size, cy: rand() * size, r: o.r * (0.6 + rand() * 0.7), fill: o.color }, pat);
    }
  }

  /** Install hatch/stipple patterns and ink/pencil filters into an <svg>. */
  function installDefs(svg) {
    const defs = el("defs", {}, svg);
    const T = TOKENS;
    hatchPattern(defs, "hatch", { spacing: 8, width: 1.6, color: T.ink, opacity: 0.75 });
    hatchPattern(defs, "hatch-faint", { spacing: 10, width: 1.2, color: T.ink, opacity: 0.32 });
    hatchPattern(defs, "hatch-dense", { spacing: 4.5, width: 1.6, color: T.ink });
    hatchPattern(defs, "crosshatch", { spacing: 7, width: 1.4, color: T.ink, cross: true, opacity: 0.8 });
    hatchPattern(defs, "hatch-blue", { spacing: 8, width: 2.4, color: T.blue, bg: T.blueWash, angle: -45 });
    hatchPattern(defs, "hatch-coat", { spacing: 6, width: 1.6, color: T.ochre, angle: 60 });
    hatchPattern(defs, "glass", { spacing: 22, width: 1.3, color: T.ink, opacity: 0.25, angle: 30 });
    stipplePattern(defs, "stipple", { dots: 26, r: 1.3, color: T.ink });
    stipplePattern(defs, "stipple-faint", { dots: 10, r: 1.1, color: T.ink, seed: 3 });
    stipplePattern(defs, "lawn", { size: 120, dots: 26, r: 1.2, color: T.ink, seed: 5 });
    stipplePattern(defs, "stipple-gap", { dots: 34, r: 1.6, color: T.ink, bg: T.paperLight, seed: 11 });

    // Hand-inked wobble: a low-frequency displacement keeps lines alive
    // without blurring them.
    const rough = el("filter", { id: "rough", x: "-2%", y: "-2%", width: "104%", height: "104%" }, defs);
    el("feTurbulence", { type: "fractalNoise", baseFrequency: 0.035, numOctaves: 2, seed: 4, result: "n" }, rough);
    el("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: 2.6, xChannelSelector: "R", yChannelSelector: "G" }, rough);

    // Red pencil: grainy alpha (paper tooth) plus wobble.
    const pencil = el("filter", { id: "pencil", x: "-5%", y: "-5%", width: "110%", height: "110%" }, defs);
    el("feTurbulence", { type: "fractalNoise", baseFrequency: 0.9, numOctaves: 2, seed: 9, result: "grain" }, pencil);
    el(
      "feColorMatrix",
      { in: "grain", type: "matrix", values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.4 1.45", result: "tooth" },
      pencil,
    );
    el("feComposite", { in: "SourceGraphic", in2: "tooth", operator: "in", result: "grained" }, pencil);
    el("feTurbulence", { type: "fractalNoise", baseFrequency: 0.02, numOctaves: 1, seed: 2, result: "w" }, pencil);
    el("feDisplacementMap", { in: "grained", in2: "w", scale: 4, xChannelSelector: "R", yChannelSelector: "G" }, pencil);
    return defs;
  }

  /** Paint a cotton-paper texture (fibres, tooth, faint foxing) as a CSS background on `node`. */
  function paperTexture(node, seed = 5) {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = TOKENS.paper;
    ctx.fillRect(0, 0, 960, 540);
    const rand = rng(seed);
    for (let i = 0; i < 26; i++) {
      const gx = rand() * 960;
      const gy = rand() * 540;
      const gr = 80 + rand() * 220;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      const tone = rand() > 0.5 ? "120,96,60" : "255,252,244";
      grad.addColorStop(0, `rgba(${tone},${0.035 + rand() * 0.03})`);
      grad.addColorStop(1, `rgba(${tone},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 960, 540);
    }
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(60,48,30,${rand() * 0.07})`;
      ctx.fillRect(rand() * 960, rand() * 540, 1, 1);
    }
    ctx.strokeStyle = "rgba(90,70,40,0.05)";
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 260; i++) {
      const fx = rand() * 960;
      const fy = rand() * 540;
      const a = rand() * Math.PI;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + 6, fy + 4, fx + Math.cos(a) * 18, fy + Math.sin(a) * 18);
      ctx.stroke();
    }
    node.style.backgroundColor = TOKENS.paper;
    node.style.backgroundImage = `url(${canvas.toDataURL("image/png")})`;
    node.style.backgroundSize = "100% 100%";
  }

  // ---------------------------------------------------------------- motion

  /** Easing curves. */
  const EASE = {
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    linear: (t) => t,
  };
  const activeJobs = new Set();

  /** Run update(t in 0..1) over `ms` (opt.delay, opt.ease); finishAll() snaps it to 1. */
  function tween(ms, update, opt = {}) {
    return new Promise((resolve) => {
      if (state.reduced || (ms <= 0 && !opt.delay)) {
        update(1);
        resolve();
        return;
      }
      const ease = opt.ease || EASE.inOut;
      const job = { done: false };
      job.finish = () => {
        if (job.done) return;
        job.done = true;
        activeJobs.delete(job);
        update(1);
        resolve();
      };
      activeJobs.add(job);
      const start = performance.now() + (opt.delay || 0);
      const frame = (now) => {
        if (job.done) return;
        const t = (now - start) / Math.max(1, ms);
        if (t < 0) {
          requestAnimationFrame(frame);
          return;
        }
        if (t >= 1) {
          job.finish();
          return;
        }
        update(ease(t));
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  /** Snap every running tween to its end state (call before starting a new transition). */
  function finishAll() {
    for (const job of [...activeJobs]) job.finish();
  }

  /** Toggle/read reduced motion (transitions become instant; idle life stops). */
  function setReduced(on) {
    state.reduced = !!on;
    document.documentElement.classList.toggle("reduced", state.reduced);
  }

  const GEOMETRY = "path,line,polyline,polygon,rect,circle,ellipse";

  /** Signature entrance: strokes draw themselves with the pen, then washes and text settle in. */
  function inkIn(group, o = {}) {
    const ms = o.ms ?? 900;
    group.style.opacity = 1;
    const strokes = [];
    const fills = [];
    const washes = [];
    group.querySelectorAll(GEOMETRY).forEach((node) => {
      const stroke = node.getAttribute("stroke");
      const dashed = node.getAttribute("stroke-dasharray") || node.dataset.noink;
      if (stroke && stroke !== "none" && !dashed && node.getTotalLength) {
        const len = node.getTotalLength();
        if (len > 1) {
          strokes.push({ node, len });
          node.style.strokeDasharray = `${len} ${len}`;
          node.style.strokeDashoffset = len;
        }
      }
      const fill = node.getAttribute("fill");
      if (fill && fill !== "none") {
        fills.push(node);
        node.style.fillOpacity = 0;
      }
      if (dashed) {
        // Washes (data-noink) and dashed lines fade in early, under the pen,
        // so a half-inked road never reads as a solid black bar.
        washes.push(node);
        node.style.opacity = 0;
      }
    });
    const texts = [...group.querySelectorAll("text")];
    texts.forEach((node) => (node.style.opacity = 0));
    return tween(
      ms,
      (t) => {
        const done = t >= 1;
        for (const s of strokes) {
          s.node.style.strokeDashoffset = s.len * (1 - clamp(t * 1.25));
          if (done) {
            s.node.style.strokeDasharray = "";
            s.node.style.strokeDashoffset = "";
          }
        }
        const late = clamp((t - 0.35) / 0.65);
        for (const node of fills) {
          node.style.fillOpacity = done ? "" : late;
          if (node.style.opacity !== "") node.style.opacity = done ? "" : late;
        }
        const early = clamp(t * 2.2);
        for (const node of washes) node.style.opacity = done ? "" : early;
        texts.forEach((node) => (node.style.opacity = done ? "" : late));
      },
      { delay: o.delay, ease: EASE.out },
    );
  }

  /** Fade a group's opacity to `to` (instant when ms = 0). */
  function fadeTo(group, to, o = {}) {
    const from = parseFloat(group.style.opacity === "" ? 1 : group.style.opacity);
    return tween(o.ms ?? 450, (t) => (group.style.opacity = lerp(from, to, t)), { delay: o.delay });
  }

  /** Show instantly or with inkIn / fade, depending on opt.mode. */
  function show(group, o = {}) {
    if (o.instant) {
      group.style.opacity = 1;
      return Promise.resolve();
    }
    if (o.mode === "fade") {
      group.style.opacity = 0;
      return fadeTo(group, 1, o);
    }
    return inkIn(group, o);
  }

  /** Hide (fade out) a group. */
  function hide(group, o = {}) {
    if (o.instant) {
      group.style.opacity = 0;
      return Promise.resolve();
    }
    return fadeTo(group, 0, { ms: o.ms ?? 380, delay: o.delay });
  }

  // ------------------------------------------------------ chrome components

  /**
   * Headline tag: the ONLY sentence-like text on a state. Fixed top-left: a short
   * ink rule, a red square, italic Fraunces. Returns {set(text, animate)}.
   */
  function tag(parent, o = {}) {
    const x = o.x ?? 80;
    const y = o.y ?? 104;
    const g = el("g", { id: o.id || "tag" }, parent);
    el("rect", { x, y: y - 74, width: 64, height: 5, fill: TOKENS.ink }, g);
    el("rect", { x, y: y - 36, width: 16, height: 16, fill: TOKENS.red }, g);
    const label = text(g, x + 34, y - 14, "", { size: o.size || 56, italic: true, weight: 400 });
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("y", y - 26);
    let current = null;
    return {
      g,
      set(str, animate) {
        if (str === current) return Promise.resolve();
        current = str;
        if (!animate || state.reduced) {
          label.textContent = str;
          g.style.opacity = str ? 1 : 0;
          return Promise.resolve();
        }
        return fadeTo(g, 0, { ms: 180 }).then(() => {
          label.textContent = str;
          if (str) return fadeTo(g, 1, { ms: 320 });
        });
      },
    };
  }

  /** Honesty stamp (e.g. ILLUSTRATIVE): letterpress box in red ink, top-right, slightly askew. */
  function stamp(parent, label, o = {}) {
    const x = o.x ?? 1840;
    const y = o.y ?? 66;
    const g = el("g", { id: o.id || "stamp", transform: `rotate(-2.5 ${x} ${y})` }, parent);
    const t = text(g, x - 22, y + 11, label, { size: 26, font: "text", weight: 600, ls: 5, fill: TOKENS.red, anchor: "end", caps: true });
    const w = (t.getComputedTextLength ? t.getComputedTextLength() : 220) + 5;
    el("rect", { x: x - w - 42, y: y - 26, width: w + 40, height: 50, fill: "none", stroke: TOKENS.red, "stroke-width": 3 }, g);
    el("rect", { x: x - w - 36, y: y - 20, width: w + 28, height: 38, fill: "none", stroke: TOKENS.red, "stroke-width": 1.2 }, g);
    g.setAttribute("filter", "url(#pencil)");
    return g;
  }

  /** Source line: bottom-left small print, italic caption serif. Returns {g, set(text)}. */
  function sourceLine(parent, o = {}) {
    const g = el("g", { id: o.id || "source" }, parent);
    const back = el("rect", { fill: TOKENS.paper, opacity: 0.94, rx: 4 }, g);
    const t = text(g, o.x ?? 80, o.y ?? 1046, "", { size: 22, font: "text", italic: true, fill: TOKENS.inkSoft });
    return {
      g,
      set(str) {
        t.textContent = str || "";
        back.style.display = str ? "" : "none";
        if (!str) return;
        const box = t.getBBox();
        back.setAttribute("x", box.x - 12);
        back.setAttribute("y", box.y - 6);
        back.setAttribute("width", box.width + 24);
        back.setAttribute("height", box.height + 12);
      },
    };
  }

  /** Caption label in printed small caps (≥28px); opt.backing paints paper behind it. */
  function caption(parent, x, y, str, o = {}) {
    const g = el("g", {}, parent);
    const t = text(g, x, y, str, {
      size: o.size || 28,
      font: "text",
      weight: o.weight || 600,
      ls: o.ls ?? 3,
      fill: o.fill || TOKENS.ink,
      anchor: o.anchor || "start",
      caps: true,
    });
    if (o.backing) {
      const box = t.getBBox();
      const pad = 8;
      const r = el(
        "rect",
        { x: box.x - pad, y: box.y - pad / 2, width: box.width + pad * 2, height: box.height + pad, fill: TOKENS.paper },
        null,
      );
      g.insertBefore(r, t);
    }
    return g;
  }

  // ---------------------------------------------------------- red pencil

  /** Red-pencil stroke along an SVG path `d` (two passes, grainy). Returns the group. */
  function pencil(parent, d, o = {}) {
    const g = el("g", { filter: "url(#pencil)", class: "pencil" }, parent);
    const w = o.width || 6;
    el("path", { d, fill: "none", stroke: TOKENS.red, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    if (o.double !== false) {
      el(
        "path",
        { d, fill: "none", stroke: TOKENS.red, "stroke-width": w * 0.45, "stroke-linecap": "round", opacity: 0.7, transform: "translate(2.5 -2)" },
        g,
      );
    }
    return g;
  }

  /** Hand-drawn red ring around (cx,cy): overshooting loop like an editor circling a claim. */
  function pencilRing(parent, cx, cy, rx, ry, o = {}) {
    const rand = rng(o.seed || 21);
    const points = [];
    const start = o.start ?? -2.4;
    const turns = o.turns ?? 1.15;
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const a = start + (i / steps) * Math.PI * 2 * turns;
      const k = 1 + (i / steps) * 0.08 + (rand() - 0.5) * 0.025;
      points.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
    }
    return pencil(parent, smoothPath(points), { width: o.width || 6 });
  }

  /** Red-pencil arrow through points [{x,y},...] with a two-stroke head at the end. */
  function pencilArrow(parent, points, o = {}) {
    const d = smoothPath(points);
    const g = el("g", {}, parent);
    pencil(g, d, { width: o.width || 6 });
    const a = points[points.length - 2];
    const b = points[points.length - 1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const head = o.head || 22;
    const h1 = { x: b.x - head * Math.cos(ang - 0.45), y: b.y - head * Math.sin(ang - 0.45) };
    const h2 = { x: b.x - head * Math.cos(ang + 0.45), y: b.y - head * Math.sin(ang + 0.45) };
    pencil(g, `M${h1.x},${h1.y} L${b.x},${b.y} L${h2.x},${h2.y}`, { width: o.width || 6, double: false });
    return g;
  }

  /** Red-pencil handwritten note (Caveat). Exact words only; keep it to a few. */
  function pencilNote(parent, x, y, str, o = {}) {
    return text(parent, x, y, str, {
      size: o.size || 40,
      font: "hand",
      weight: 700,
      fill: TOKENS.red,
      anchor: o.anchor || "start",
      rotate: o.rotate ?? -2,
      ls: o.ls ?? 1,
    });
  }

  // -------------------------------------------------------------- props

  /** Wall clock / watch face icon. */
  function clockIcon(parent, x, y, r, minutes = 10) {
    const g = el("g", {}, parent);
    el("circle", { cx: x, cy: y, r, fill: TOKENS.paperLight, stroke: TOKENS.ink, "stroke-width": 3 }, g);
    const a = (minutes / 60) * Math.PI * 2 - Math.PI / 2;
    el("line", { x1: x, y1: y, x2: x + Math.cos(a) * r * 0.75, y2: y + Math.sin(a) * r * 0.75, stroke: TOKENS.ink, "stroke-width": 3, "stroke-linecap": "round" }, g);
    el("line", { x1: x, y1: y, x2: x, y2: y - r * 0.5, stroke: TOKENS.ink, "stroke-width": 3, "stroke-linecap": "round" }, g);
    return g;
  }

  /** Small ink rider figure (head + shoulders) for crowds; h is its height. */
  function rider(parent, x, y, h, seed) {
    const rand = rng(seed);
    const g = el("g", { transform: `translate(${x} ${y})` }, parent);
    const w = h * 0.62;
    const body = `M${-w / 2},0 C${-w / 2},${-h * 0.5} ${-w * 0.3},${-h * 0.62} 0,${-h * 0.62} C${w * 0.3},${-h * 0.62} ${w / 2},${-h * 0.5} ${w / 2},0 Z`;
    el("path", { d: body, fill: rand() > 0.5 ? "url(#hatch)" : TOKENS.paperLight, stroke: TOKENS.ink, "stroke-width": 2.6 }, g);
    el("circle", { cx: 0, cy: -h * 0.78, r: h * 0.17, fill: rand() > 0.6 ? TOKENS.ink : TOKENS.paperLight, stroke: TOKENS.ink, "stroke-width": 2.6 }, g);
    return g;
  }

  /** Cluster of `n` riders around (cx, cy); each child <g> can be revealed one at a time. */
  function crowd(parent, cx, cy, n, o = {}) {
    const g = el("g", { class: "crowd" }, parent);
    const rand = rng(o.seed || 31);
    const spread = o.spread || 140;
    const h = o.h || 46;
    const slots = [];
    for (let i = 0; i < n; i++) {
      const row = i % 2;
      slots.push({
        x: cx + (i / (n - 1) - 0.5) * spread + (rand() - 0.5) * 8,
        y: cy + row * 10 - (rand() * 4),
        h: h * (0.85 + rand() * 0.3),
      });
    }
    slots.sort((a, b) => a.y - b.y);
    slots.forEach((s, i) => rider(g, s.x, s.y, s.h, 100 + i));
    return g;
  }

  /** Ink tree seen from above: stippled canopy with a hatched shadow crescent. */
  function treeTop(parent, x, y, r, seed = 1) {
    const g = el("g", {}, parent);
    el("circle", { cx: x + r * 0.25, cy: y + r * 0.25, r, fill: "url(#hatch-dense)", opacity: 0.55 }, g);
    const rand = rng(seed);
    const lobes = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const k = 0.88 + rand() * 0.18;
      lobes.push({ x: x + Math.cos(a) * r * k, y: y + Math.sin(a) * r * k });
    }
    el("path", { d: smoothPath(lobes, true), fill: "url(#stipple-gap)", stroke: TOKENS.ink, "stroke-width": 2.4 }, g);
    return g;
  }

  /** Simple hourglass icon (time stretching). */
  function hourglassIcon(parent, x, y, s = 1) {
    const g = el("g", { transform: `translate(${x} ${y}) scale(${s})` }, parent);
    el("rect", { x: -26, y: -38, width: 52, height: 7, fill: TOKENS.ink }, g);
    el("rect", { x: -26, y: 31, width: 52, height: 7, fill: TOKENS.ink }, g);
    el("path", { d: "M-20,-31 C-20,-8 -4,-6 -4,0 C-4,6 -20,8 -20,31 L20,31 C20,8 4,6 4,0 C4,-6 20,-8 20,-31 Z", fill: TOKENS.paperLight, stroke: TOKENS.ink, "stroke-width": 3 }, g);
    el("path", { d: "M-15,31 Q0,12 15,31 Z M-10,-20 L10,-20 L2,-6 L-2,-6 Z", fill: "url(#hatch-dense)" }, g);
    return g;
  }

  // ---------------------------------------------------------------- bus

  /**
   * Bus with two drawings in one persistent element: a front view (street scenes)
   * and a side pictogram (maps). Controller: place({x,y,s,view,flip}).
   * view 0 = front view, origin bottom-centre; view 1 = side pictogram, origin centre.
   */
  function bus(parent, o = {}) {
    const T = TOKENS;
    const body = o.fill || T.ink;
    const onBody = o.onBody || T.paperLight;
    const g = el("g", { id: o.id }, parent);
    const front = el("g", {}, g);
    const side = el("g", {}, g);

    // Front view, 200 wide x 220 tall.
    el("ellipse", { cx: 0, cy: 2, rx: 118, ry: 10, fill: "url(#hatch-dense)", opacity: 0.6 }, front);
    el("rect", { x: -92, y: -24, width: 30, height: 24, rx: 5, fill: T.ink }, front);
    el("rect", { x: 62, y: -24, width: 30, height: 24, rx: 5, fill: T.ink }, front);
    el("path", { d: "M-100,-26 L-100,-196 Q-100,-222 -74,-222 L74,-222 Q100,-222 100,-196 L100,-26 Z", fill: body, stroke: T.ink, "stroke-width": 4 }, front);
    el("rect", { x: -60, y: -214, width: 120, height: 28, fill: T.paperLight, stroke: T.ink, "stroke-width": 3 }, front);
    text(front, 0, -191, o.label || "", { size: 26, weight: 600, anchor: "middle" });
    el("rect", { x: -86, y: -176, width: 172, height: 84, rx: 6, fill: T.paperLight, stroke: T.ink, "stroke-width": 3 }, front);
    el("rect", { x: -86, y: -176, width: 172, height: 84, rx: 6, fill: "url(#glass)" }, front);
    el("line", { x1: 0, y1: -176, x2: 0, y2: -92, stroke: T.ink, "stroke-width": 3 }, front);
    el("circle", { cx: -70, cy: -56, r: 12, fill: T.paperLight, stroke: T.ink, "stroke-width": 3 }, front);
    el("circle", { cx: 70, cy: -56, r: 12, fill: T.paperLight, stroke: T.ink, "stroke-width": 3 }, front);
    for (let i = 0; i < 4; i++) {
      el("line", { x1: -36, y1: -72 + i * 9, x2: 36, y2: -72 + i * 9, stroke: o.fill === T.ink ? T.paperLight : T.ink, "stroke-width": 2.4 }, front);
    }
    el("rect", { x: -104, y: -36, width: 208, height: 12, rx: 3, fill: T.ink }, front);
    el("path", { d: "M-100,-170 L-116,-176 L-116,-140", fill: "none", stroke: T.ink, "stroke-width": 4 }, front);
    el("path", { d: "M100,-170 L116,-176 L116,-140", fill: "none", stroke: T.ink, "stroke-width": 4 }, front);

    // Side pictogram, 220 x ~120, faces +x. Letter badge stays unflipped.
    const sideBody = el("g", {}, side);
    el("ellipse", { cx: 0, cy: 54, rx: 112, ry: 7, fill: "url(#hatch-dense)", opacity: 0.55 }, sideBody);
    el("rect", { x: -110, y: -48, width: 220, height: 84, rx: 14, fill: body, stroke: T.ink, "stroke-width": 4 }, sideBody);
    for (let i = 0; i < 5; i++) {
      if (i === 2) continue;
      el("rect", { x: -98 + i * 34, y: -36, width: 25, height: 28, rx: 3, fill: onBody, stroke: T.ink, "stroke-width": 2.5 }, sideBody);
    }
    el("path", { d: "M80,-36 L100,-36 Q106,-36 106,-28 L106,4 L80,4 Z", fill: onBody, stroke: T.ink, "stroke-width": 2.5 }, sideBody);
    el("rect", { x: 66, y: -36, width: 12, height: 66, fill: onBody, stroke: T.ink, "stroke-width": 2.5 }, sideBody);
    for (const wx of [-66, 64]) {
      el("circle", { cx: wx, cy: 36, r: 18, fill: T.ink }, sideBody);
      el("circle", { cx: wx, cy: 36, r: 7, fill: T.paperLight }, sideBody);
    }
    const badge = el("g", { transform: "translate(-28 -4)" }, side);
    el("circle", { cx: 0, cy: 0, r: 34, fill: T.paperLight, stroke: T.ink, "stroke-width": 4 }, badge);
    const letter = text(badge, 0, 2, o.label || "", { size: 58, weight: 600, anchor: "middle" });
    letter.setAttribute("dominant-baseline", "middle");

    const cur = { x: 0, y: 0, s: 1, view: 0, flip: 1 };
    function place(p) {
      Object.assign(cur, p);
      g.setAttribute("transform", `translate(${cur.x.toFixed(2)} ${cur.y.toFixed(2)}) scale(${cur.s.toFixed(4)})`);
      front.style.opacity = clamp(1 - cur.view * 2);
      side.style.opacity = clamp(cur.view * 2 - 1);
      sideBody.setAttribute("transform", `scale(${cur.flip} 1)`);
      badge.setAttribute("transform", `translate(${-28 * cur.flip} -4)`);
    }
    place(cur);
    return { g, place, get: () => ({ ...cur }) };
  }

  // ---------------------------------------------------------- character

  /**
   * Named poses for the commuter. Angles: 0 = arm hangs down, +90 = screen right,
   * 180 = up. `front` = 1 draws the hands over the head (for hands-on-head poses).
   */
  const POSES = {
    wait: { aL1: -2, aL2: 172, fL: 0.46, aR1: 2, aR2: -172, fR: 0.46, tilt: -4, lookX: -1, lookY: 0, brow: 0, browTilt: 0, mouth: 0.15, open: 0, paper: 1, ground: 0, alarm: 0, point: 0, tick: 0, front: 0 },
    read: { aL1: -2, aL2: 172, fL: 0.46, aR1: 2, aR2: -172, fR: 0.46, tilt: -7, lookX: -0.3, lookY: 1, brow: 0, browTilt: 0, mouth: 0.2, open: 0, paper: 1, ground: 0, alarm: 0, point: 0, tick: 0, front: 0 },
    watch: { aL1: -12, aL2: 163, fL: 1, aR1: 34, aR2: -40, fR: 0.8, tilt: -9, lookX: -1, lookY: 1, brow: -2, browTilt: -1, mouth: -0.7, open: 0, paper: 0, ground: 0, alarm: 0, point: 0, tick: 1, front: 0 },
    // Hands clutching the head, elbows out: reads as "oh no" (arms straight up reads as "hooray").
    alarmed: { aL1: -121, aL2: 117, fL: 1.0, aR1: 121, aR2: -116, fR: 1.03, tilt: 3, lookX: -1, lookY: 0, brow: 7, browTilt: 1, mouth: -0.4, open: 1, paper: 0, ground: 1, alarm: 1, point: 0, tick: 0, front: 1 },
    cheer: { aL1: -138, aL2: -162, fL: 1, aR1: 146, aR2: 166, fR: 1, tilt: 3, lookX: -1, lookY: 0, brow: 5, browTilt: 0, mouth: 1, open: 0.6, paper: 0, ground: 0, alarm: 0, point: 0, tick: 0, front: 0 },
    point: { aL1: -6, aL2: -3, fL: 1, aR1: 55, aR2: 45, fR: 1, tilt: 3, lookX: 0.6, lookY: 0, brow: 3, browTilt: 0, mouth: 1, open: 0, paper: 0, ground: 0, alarm: 0, point: 1, tick: 0, front: 0 },
    relaxed: { aL1: -6, aL2: -3, fL: 1, aR1: 6, aR2: 3, fR: 1, tilt: 0, lookX: 0, lookY: 0, brow: 0, browTilt: 0, mouth: 0.6, open: 0, paper: 0, ground: 0, alarm: 0, point: 0, tick: 0, front: 0 },
  };

  function newspaper(parent) {
    const g = el("g", {}, parent);
    el("rect", { x: -66, y: -44, width: 132, height: 88, fill: TOKENS.paperLight, stroke: TOKENS.ink, "stroke-width": 3 }, g);
    el("line", { x1: 0, y1: -44, x2: 0, y2: 44, stroke: TOKENS.ink, "stroke-width": 1.5 }, g);
    el("rect", { x: -56, y: -34, width: 46, height: 11, fill: TOKENS.ink }, g);
    el("rect", { x: 10, y: -34, width: 46, height: 30, fill: "url(#hatch)", stroke: TOKENS.ink, "stroke-width": 1.5 }, g);
    for (let i = 0; i < 6; i++) {
      el("line", { x1: -56, y1: -12 + i * 9, x2: -10, y2: -12 + i * 9, stroke: TOKENS.ink, "stroke-width": 1.5, opacity: 0.6 }, g);
      if (i < 4) el("line", { x1: 10, y1: 6 + i * 9, x2: 56, y2: 6 + i * 9, stroke: TOKENS.ink, "stroke-width": 1.5, opacity: 0.6 }, g);
    }
    return g;
  }

  /**
   * The commuter: original ink-line figure, feet at (x, y), ~600px tall at scale 1.
   * Controller: setPose(name | params, ms) tweens every joint and expression.
   */
  function character(parent, o = {}) {
    const T = TOKENS;
    const g = el("g", { id: o.id || "character", transform: `translate(${o.x} ${o.y}) scale(${o.scale || 1})` }, parent);

    el("ellipse", { cx: -6, cy: 2, rx: 84, ry: 10, fill: "url(#hatch-dense)", opacity: 0.55 }, g);
    const groundPaper = newspaper(el("g", { transform: "translate(-128 -10) rotate(-10) scale(0.9 0.45)" }, g));

    // Legs and shoes (facing screen-left).
    el("path", { d: "M-36,-214 L-34,-14 L-14,-14 L-10,-214 Z", fill: T.ink }, g);
    el("path", { d: "M10,-214 L14,-14 L34,-14 L38,-214 Z", fill: T.ink }, g);
    el("path", { d: "M-58,0 Q-58,-16 -40,-17 L-12,-17 L-10,0 Z", fill: T.ink }, g);
    el("path", { d: "M-6,0 L-4,-17 L28,-17 Q38,-16 38,0 Z", fill: T.ink }, g);

    // Trench coat with hatched shade on the far side.
    const coatD = "M-60,-462 C-70,-440 -73,-400 -71,-360 L-86,-198 Q0,-184 84,-198 L69,-360 C71,-400 70,-440 60,-462 Q0,-478 -60,-462 Z";
    el("path", { d: coatD, fill: T.ochreWash }, g);
    const clip = el("clipPath", { id: (o.id || "character") + "-coatclip" }, g);
    el("path", { d: coatD }, clip);
    el("rect", { x: 22, y: -480, width: 80, height: 300, fill: "url(#hatch-coat)", "clip-path": `url(#${(o.id || "character")}-coatclip)` }, g);
    el("path", { d: coatD, fill: "none", stroke: T.ink, "stroke-width": 4.5, "stroke-linejoin": "round" }, g);
    el("path", { d: "M-71,-356 Q0,-344 69,-356 L68,-340 Q0,-328 -72,-340 Z", fill: T.ochre, stroke: T.ink, "stroke-width": 3 }, g);
    el("path", { d: "M2,-446 L8,-192", stroke: T.ink, "stroke-width": 3, fill: "none" }, g);
    el("path", { d: "M-8,-470 L-34,-414 L-4,-392 M8,-470 L30,-414 L6,-394", stroke: T.ink, "stroke-width": 3.5, fill: "none", "stroke-linejoin": "round" }, g);
    for (const by of [-310, -270, -230]) {
      el("circle", { cx: -18, cy: by, r: 4.5, fill: T.ink }, g);
      el("circle", { cx: 24, cy: by, r: 4.5, fill: T.ink }, g);
    }
    // Striped scarf.
    el("path", { d: "M-24,-470 L-40,-394 L-18,-390 L-6,-466 Z", fill: T.ink }, g);
    for (const sy of [-440, -420, -404]) {
      el("line", { x1: -40, y1: sy, x2: -10, y2: sy + 2, stroke: T.paperLight, "stroke-width": 3 }, g);
    }
    el("path", { d: "M-36,-476 Q0,-458 36,-476 L33,-497 Q0,-482 -33,-497 Z", fill: T.ink }, g);

    // Arms: sleeves (outline + coat colour), then the held newspaper, then hands.
    const sleeves = el("g", {}, g);
    const arms = {};
    for (const side of ["L", "R"]) {
      arms[side] = {
        outline: el("path", { fill: "none", stroke: T.ink, "stroke-width": 32, "stroke-linecap": "round", "stroke-linejoin": "round" }, sleeves),
        fill: el("path", { fill: "none", stroke: T.ochreWash, "stroke-width": 24, "stroke-linecap": "round", "stroke-linejoin": "round" }, sleeves),
      };
    }
    const heldPaper = el("g", {}, g);
    newspaper(heldPaper);
    const hands = el("g", {}, g);
    for (const side of ["L", "R"]) {
      arms[side].finger = el("path", { fill: "none", stroke: T.ink, "stroke-width": 9, "stroke-linecap": "round" }, hands);
      arms[side].fingerFill = el("path", { fill: "none", stroke: T.skin, "stroke-width": 4, "stroke-linecap": "round" }, hands);
      arms[side].hand = el("circle", { r: 13, fill: T.skin, stroke: T.ink, "stroke-width": 3 }, hands);
    }
    const watch = el("rect", { width: 12, height: 18, rx: 3, fill: T.ink }, hands);
    const ticks = el("g", { fill: "none", stroke: T.ink, "stroke-width": 3, "stroke-linecap": "round" }, g);
    const tickArcs = [el("path", {}, ticks), el("path", {}, ticks), el("path", {}, ticks)];

    // Head (tilts around the neck).
    el("rect", { x: -11, y: -508, width: 22, height: 34, fill: T.skin, stroke: T.ink, "stroke-width": 3 }, g);
    const head = el("g", {}, g);
    el("ellipse", { cx: 28, cy: -546, rx: 8, ry: 12, fill: T.skin, stroke: T.ink, "stroke-width": 3 }, head);
    el("ellipse", { cx: -2, cy: -548, rx: 36, ry: 45, fill: T.skin, stroke: T.ink, "stroke-width": 4 }, head);
    el("path", { d: "M-44,-540 C-50,-612 44,-616 40,-548 L42,-512 C36,-505 26,-508 25,-520 L22,-566 C6,-570 -14,-566 -30,-552 L-32,-520 C-34,-508 -46,-508 -46,-516 Z", fill: T.ink }, head);
    el("path", { d: "M-14,-590 C0,-598 18,-594 28,-582", fill: "none", stroke: T.paperLight, "stroke-width": 2.4, opacity: 0.8 }, head);
    const blush = el("ellipse", { rx: 9, ry: 5, fill: T.ochre, opacity: 0.35 }, head);
    const face = el("g", {}, head);
    const glassL = el("circle", { r: 12, fill: "none", stroke: T.ink, "stroke-width": 3 }, face);
    const glassR = el("circle", { r: 12, fill: "none", stroke: T.ink, "stroke-width": 3 }, face);
    const bridge = el("path", { fill: "none", stroke: T.ink, "stroke-width": 3 }, face);
    const eyeL = el("ellipse", { rx: 3.6, ry: 4.2, fill: T.ink }, face);
    const eyeR = el("ellipse", { rx: 3.6, ry: 4.2, fill: T.ink }, face);
    const browL = el("path", { fill: "none", stroke: T.ink, "stroke-width": 3.5, "stroke-linecap": "round" }, face);
    const browR = el("path", { fill: "none", stroke: T.ink, "stroke-width": 3.5, "stroke-linecap": "round" }, face);
    const nose = el("path", { fill: "none", stroke: T.ink, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, face);
    const mouth = el("path", { fill: T.ink, stroke: T.ink, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, face);
    const alarm = el("g", { fill: "none", stroke: T.ink, "stroke-width": 4, "stroke-linecap": "round" }, g);
    el("path", { d: "M-78,-604 L-98,-622 M-50,-628 L-58,-654 M60,-604 L80,-622 M34,-630 L42,-656" }, alarm);

    const SH = { L: { x: -58, y: -452 }, R: { x: 56, y: -452 } };
    const UPPER = 118;
    const FORE = 106;
    const dir = (deg) => ({ x: Math.sin((deg * Math.PI) / 180), y: Math.cos((deg * Math.PI) / 180) });

    const cur = { ...POSES[o.pose || "wait"] };

    function render(p) {
      const wrists = {};
      for (const side of ["L", "R"]) {
        const s = SH[side];
        const d1 = dir(p["a" + side + "1"]);
        const d2 = dir(p["a" + side + "2"]);
        const e = { x: s.x + d1.x * UPPER, y: s.y + d1.y * UPPER };
        const w = { x: e.x + d2.x * FORE * p["f" + side], y: e.y + d2.y * FORE * p["f" + side] };
        wrists[side] = { w, d2 };
        const d = `M${s.x},${s.y} L${e.x.toFixed(1)},${e.y.toFixed(1)} L${w.x.toFixed(1)},${w.y.toFixed(1)}`;
        arms[side].outline.setAttribute("d", d);
        arms[side].fill.setAttribute("d", d);
        const hx = w.x + d2.x * 10;
        const hy = w.y + d2.y * 10;
        arms[side].hand.setAttribute("cx", hx.toFixed(1));
        arms[side].hand.setAttribute("cy", hy.toFixed(1));
        const fingerOn = side === "R" ? p.point : 0;
        const fd = `M${hx.toFixed(1)},${hy.toFixed(1)} l${(d2.x * 30 * fingerOn).toFixed(1)},${(d2.y * 30 * fingerOn).toFixed(1)}`;
        arms[side].finger.setAttribute("d", fd);
        arms[side].fingerFill.setAttribute("d", fd);
        arms[side].finger.style.opacity = fingerOn > 0.05 ? 1 : 0;
        arms[side].fingerFill.style.opacity = fingerOn > 0.05 ? 1 : 0;
      }
      const wl = wrists.L.w;
      const ang = (Math.atan2(wrists.L.d2.y, wrists.L.d2.x) * 180) / Math.PI;
      watch.setAttribute("transform", `translate(${wl.x.toFixed(1)} ${wl.y.toFixed(1)}) rotate(${(ang - 90).toFixed(1)}) translate(-6 -12)`);
      const mid = lerpPt(wrists.L.w, wrists.R.w, 0.5);
      heldPaper.setAttribute("transform", `translate(${mid.x.toFixed(1)} ${(mid.y + 4).toFixed(1)}) rotate(-3)`);
      heldPaper.style.opacity = p.paper;
      groundPaper.parentNode.style.opacity = p.ground;
      ticks.style.opacity = p.tick;
      tickArcs.forEach((arc, i) => {
        const r = 30 + i * 12;
        arc.setAttribute("d", `M${(wl.x - r * 0.7).toFixed(1)},${(wl.y - r * 0.7).toFixed(1)} A${r},${r} 0 0 0 ${(wl.x - r).toFixed(1)},${(wl.y + r * 0.1).toFixed(1)}`);
      });

      // Head drawn 12% larger than the body's proportions so the face still
      // reads from the back row; scaled about the neck so it stays attached.
      head.setAttribute("transform", `rotate(${p.tilt.toFixed(2)} 0 -500) translate(0 -500) scale(1.12) translate(0 500)`);
      const wantFront = (p.front || 0) > 0.5;
      if (wantFront && hands.nextSibling !== null && g.lastChild !== hands) g.appendChild(hands);
      if (!wantFront && g.lastChild === hands) g.insertBefore(hands, ticks);
      const lx = p.lookX * 7;
      const ly = p.lookY * 3;
      const eL = { x: -18 + lx, y: -550 + ly };
      const eR = { x: 10 + lx, y: -550 + ly };
      eyeL.setAttribute("cx", eL.x);
      eyeL.setAttribute("cy", eL.y);
      eyeR.setAttribute("cx", eR.x);
      eyeR.setAttribute("cy", eR.y);
      eyeL.setAttribute("ry", 4.2 + p.open * 1.5);
      eyeR.setAttribute("ry", 4.2 + p.open * 1.5);
      glassL.setAttribute("cx", -18 + lx * 0.7);
      glassL.setAttribute("cy", -550);
      glassR.setAttribute("cx", 11 + lx * 0.7);
      glassR.setAttribute("cy", -550);
      bridge.setAttribute("d", `M${-6 + lx * 0.7},-552 Q${-3.5 + lx * 0.7},-556 ${-1 + lx * 0.7},-552`);
      blush.setAttribute("cx", -24 + lx);
      blush.setAttribute("cy", -526);
      const by = -566 - p.brow;
      const tiltB = p.browTilt * 4;
      browL.setAttribute("d", `M${eL.x - 11},${by + tiltB} L${eL.x + 9},${by - tiltB}`);
      browR.setAttribute("d", `M${eR.x - 9},${by - tiltB} L${eR.x + 11},${by + tiltB}`);
      const nx = -4 + lx * 1.2;
      nose.setAttribute("d", `M${nx + 2},-544 L${nx - 6},-528 L${nx + 2},-526`);
      const mx = -4 + lx * 1.1;
      const my = -514;
      const curve = p.mouth * 7;
      const openH = p.open * 12;
      mouth.setAttribute(
        "d",
        `M${mx - 11},${my - curve * 0.3} Q${mx},${my + curve} ${mx + 11},${my - curve * 0.3} Q${mx},${my + curve + openH} ${mx - 11},${my - curve * 0.3} Z`,
      );
      mouth.setAttribute("fill", p.open > 0.2 ? T.ink : "none");
      alarm.style.opacity = p.alarm;
    }

    function setPose(target, ms = 650) {
      const to = typeof target === "string" ? POSES[target] : target;
      const from = { ...cur };
      return tween(ms, (t) => {
        for (const k of Object.keys(to)) cur[k] = lerp(from[k], to[k], t);
        render(cur);
      });
    }
    function blink() {
      eyeL.setAttribute("ry", 0.8);
      eyeR.setAttribute("ry", 0.8);
      setTimeout(() => render(cur), 140);
    }
    render(cur);
    return { g, setPose, blink, pose: cur };
  }

  /** Tiny portrait medallion of the commuter: a wordless "you are here" marker for maps. */
  function portrait(parent, x, y, r = 34) {
    const T = TOKENS;
    const g = el("g", { transform: `translate(${x} ${y})` }, parent);
    el("circle", { r, fill: T.paperLight, stroke: T.ink, "stroke-width": 4 }, g);
    const k = (r / 34) * 0.56;
    const hg = el("g", { transform: `scale(${k}) translate(2 560)` }, g);
    el("ellipse", { cx: -2, cy: -548, rx: 36, ry: 45, fill: T.skin, stroke: T.ink, "stroke-width": 5 }, hg);
    el("path", { d: "M-44,-540 C-50,-612 44,-616 40,-548 L42,-512 C36,-505 26,-508 25,-520 L22,-566 C6,-570 -14,-566 -30,-552 L-32,-520 C-34,-508 -46,-508 -46,-516 Z", fill: T.ink }, hg);
    el("circle", { cx: -18, cy: -550, r: 12, fill: "none", stroke: T.ink, "stroke-width": 4.5 }, hg);
    el("circle", { cx: 11, cy: -550, r: 12, fill: "none", stroke: T.ink, "stroke-width": 4.5 }, hg);
    el("path", { d: "M-14,-516 Q-5,-509 4,-516", fill: "none", stroke: T.ink, "stroke-width": 4.5, "stroke-linecap": "round" }, hg);
    return g;
  }

  // -------------------------------------------------------- map scaffold

  /**
   * Loop route drawn as an inked road (rounded rectangle) starting top-centre and
   * running clockwise. Controller: at(f) -> {x,y,tx,ty,nx,ny}; setArcs(fAhead0, fAhead1).
   */
  function route(parent, o) {
    const { x0, y0, x1, y1, r } = o;
    const cx = (x0 + x1) / 2;
    const d =
      `M${cx},${y0} H${x1 - r} A${r},${r} 0 0 1 ${x1},${y0 + r} V${y1 - r} ` +
      `A${r},${r} 0 0 1 ${x1 - r},${y1} H${x0 + r} A${r},${r} 0 0 1 ${x0},${y1 - r} ` +
      `V${y0 + r} A${r},${r} 0 0 1 ${x0 + r},${y0} Z`;
    const g = el("g", { id: o.id || "route" }, parent);
    const roadW = o.roadWidth || 46;
    el("path", { d, fill: "none", stroke: TOKENS.ink, "stroke-width": roadW + 8 }, g);
    const surface = el("path", { d, fill: "none", stroke: TOKENS.paperLight, "stroke-width": roadW, "data-noink": 1 }, g);
    surface.dataset.noink = 1;
    const arcAhead = el("path", { d, fill: "none", stroke: "url(#hatch-blue)", "stroke-width": roadW - 12 }, g);
    const arcBehind = el("path", { d, fill: "none", stroke: "url(#stipple)", "stroke-width": roadW - 12 }, g);
    arcAhead.dataset.noink = 1;
    arcBehind.dataset.noink = 1;
    el("path", { d, fill: "none", stroke: TOKENS.ink, "stroke-width": 2, "stroke-dasharray": "14 12", opacity: 0.55 }, g);
    const P = surface.getTotalLength();

    function at(f) {
      const ff = (((f % 1) + 1) % 1) * P;
      const p = surface.getPointAtLength(ff);
      const q = surface.getPointAtLength(Math.min(P, ff + 1));
      let tx = q.x - p.x;
      let ty = q.y - p.y;
      const n = Math.hypot(tx, ty) || 1;
      tx /= n;
      ty /= n;
      return { x: p.x, y: p.y, tx, ty, nx: ty, ny: -tx };
    }

    function arc(node, f0, f1) {
      const len = clamp((f1 - f0) * P, 0, P);
      const start = (((f0 % 1) + 1) % 1) * P;
      node.style.strokeDasharray = `${len.toFixed(1)} ${(P - len + 0.5).toFixed(1)}`;
      node.style.strokeDashoffset = `${(-start).toFixed(1)}`;
    }

    const stops = el("g", {}, g);
    const stopPts = [];
    for (let i = 0; i < (o.stops || 8); i++) {
      const p = at(i / (o.stops || 8));
      const sx = p.x + p.nx * (roadW / 2 + 16);
      const sy = p.y + p.ny * (roadW / 2 + 16);
      el("line", { x1: p.x + p.nx * (roadW / 2 + 4), y1: p.y + p.ny * (roadW / 2 + 4), x2: sx, y2: sy, stroke: TOKENS.ink, "stroke-width": 4 }, stops);
      el("circle", { cx: sx, cy: sy, r: 11, fill: TOKENS.paperLight, stroke: TOKENS.ink, "stroke-width": 4 }, stops);
      stopPts.push({ x: sx, y: sy, road: p });
    }
    return {
      g,
      d,
      P,
      at,
      stops: stopPts,
      setArcs(fA, fB) {
        arc(arcAhead, fA, fB);
        arc(arcBehind, fB, fA + 1);
      },
    };
  }

  /**
   * Aerial city blocks: a hatched grid of roofs with cast shadows, skipping any
   * cell for which skip(rect) is true. Background linework; recedes behind data.
   */
  function cityBlocks(parent, o) {
    const g = el("g", { class: "blocks" }, parent);
    const rand = rng(o.seed || 12);
    const { x, y, w, h } = o.area;
    const cw = o.cell?.w || 150;
    const ch = o.cell?.h || 104;
    const gap = o.cell?.gap || 30;
    for (let yy = y; yy < y + h; yy += ch + gap) {
      for (let xx = x; xx < x + w; xx += cw + gap) {
        const rect = { x: xx, y: yy, w: cw, h: ch };
        if (o.skip && o.skip(rect)) continue;
        const split = rand() > 0.55;
        const parts = split
          ? [
              { x: xx, y: yy, w: cw * 0.48, h: ch },
              { x: xx + cw * 0.52, y: yy, w: cw * 0.48, h: ch },
            ]
          : [rect];
        for (const b of parts) {
          el("path", { d: `M${b.x + b.w},${b.y + 8} l10,8 v${b.h - 8} h${-b.w + 8} l-10,-8 Z`, fill: "url(#hatch-dense)", opacity: 0.5 }, g);
          el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, fill: rand() > 0.5 ? "url(#hatch-faint)" : TOKENS.paperLight, stroke: TOKENS.ink, "stroke-width": 2.2, opacity: 0.85 }, g);
          if (rand() > 0.5) {
            el("rect", { x: b.x + b.w * 0.2, y: b.y + b.h * 0.25, width: b.w * 0.3, height: b.h * 0.3, fill: "none", stroke: TOKENS.ink, "stroke-width": 1.6, opacity: 0.6 }, g);
          }
        }
      }
    }
    return g;
  }

  /**
   * Gap gauge drawn as a map scale bar: the loop unrolled from A to A over a fixed
   * total (minutes). Segment textures match the arcs painted on the route.
   * Controller: set(gapAhead, ms) moves the B marker and retypes both values.
   */
  function gauge(parent, o) {
    const T = TOKENS;
    const g = el("g", { id: o.id || "gauge" }, parent);
    const { x, y, w, total } = o;
    const H = 30;
    const px = w / total;
    const seg1 = el("rect", { x, y, height: H, fill: "url(#hatch-blue)", stroke: T.ink, "stroke-width": 3 }, g);
    const seg2 = el("rect", { y, height: H, fill: "url(#stipple-gap)", stroke: T.ink, "stroke-width": 3 }, g);
    for (let m = 0; m <= total; m++) {
      const major = m % 5 === 0;
      el("line", { x1: x + m * px, y1: y + H, x2: x + m * px, y2: y + H + (major ? 16 : 8), stroke: T.ink, "stroke-width": major ? 3 : 2 }, g);
      if (major) {
        text(g, x + m * px, y + H + 42, m === total ? `${m} min lap` : String(m), { size: 22, font: "text", fill: T.inkSoft, anchor: m === total ? "end" : "middle" });
      }
    }
    function badge(letter, fill, onFill, dashed) {
      const b = el("g", {}, g);
      // r = 17 so two badges 1 minute apart (w/total px) still show daylight.
      el("circle", { r: 17, fill, stroke: T.ink, "stroke-width": 3, "stroke-dasharray": dashed ? "5 4" : undefined }, b);
      const t = text(b, 0, 2, letter, { size: 28, weight: 600, anchor: "middle", fill: onFill });
      t.setAttribute("dominant-baseline", "middle");
      return b;
    }
    const bA0 = badge("A", T.ink, T.paperLight);
    const bB = badge("B", T.blueWash, T.ink);
    const bA1 = badge("A", T.paperLight, T.ink, true);
    bA0.setAttribute("transform", `translate(${x} ${y + H / 2})`);
    bA1.setAttribute("transform", `translate(${x + w} ${y + H / 2})`);
    const v1 = text(g, 0, y - 26, "", { size: 54, weight: 600, anchor: "middle", fill: T.blue });
    const v2 = text(g, 0, y - 26, "", { size: 54, weight: 600, anchor: "middle", fill: T.ink });
    if (o.caption) caption(g, x - 25, y + H + 92, o.caption, { size: 28, fill: T.inkSoft });

    let cur = o.value ?? total / 2;
    const fmt = (v) => `${Math.round(v)}`;
    function render(v) {
      const w1 = v * px;
      seg1.setAttribute("width", Math.max(0, w1));
      seg2.setAttribute("x", x + w1);
      seg2.setAttribute("width", Math.max(0, w - w1));
      bB.setAttribute("transform", `translate(${x + w1} ${y + H / 2})`);
      setValue(v1, fmt(v), x + w1 / 2);
      setValue(v2, fmt(total - v), x + w1 + (w - w1) / 2);
    }
    function setValue(node, num, cx) {
      node.setAttribute("x", cx);
      node.textContent = "";
      el("tspan", { text: num }, node);
      el("tspan", { text: " min", "font-size": 32, "font-weight": 400 }, node);
    }
    render(cur);
    return {
      g,
      valueX: (v) => ({ ahead: x + (v * px) / 2, behind: x + v * px + (w - v * px) / 2, y: y - 26 }),
      set(v, ms = 800) {
        const from = cur;
        cur = v;
        return tween(ms, (t) => render(lerp(from, v, t)));
      },
    };
  }

  // ---------------------------------------------------------- street scene

  /**
   * One-point avenue: facades with windows on both sides receding to vp, kerbs,
   * lane dashes and street lamps. o: vp, left/right {top0, base0, x0}, kerbs.
   */
  function avenue(parent, o) {
    const T = TOKENS;
    const g = el("g", { class: "avenue", filter: "url(#rough)" }, parent);
    const vp = o.vp;
    const rand = rng(o.seed || 3);
    const depth = (z) => z / (z + (o.k || 2.2));
    const toward = (p, u) => lerpPt(p, vp, u);

    // Distant city at the vanishing point.
    for (let i = 0; i < 9; i++) {
      const bx = vp.x - 120 + i * 28 + rand() * 10;
      const bh = 30 + rand() * 50;
      el("rect", { x: bx, y: vp.y - bh, width: 22 + rand() * 10, height: bh, fill: "url(#hatch-faint)", stroke: T.inkFaint, "stroke-width": 1.5 }, g);
    }

    // Road surface with sparse asphalt lines, kerbs and lane dashes.
    const kerbL = o.kerbLeft;
    const kerbR = o.kerbRight;
    el("polygon", { points: pts([vp, kerbL, kerbR]), fill: T.paperLight, stroke: "none" }, g);
    for (let i = 0; i < 14; i++) {
      const u = 0.12 + i * 0.06;
      const a = toward(kerbL, 1 - u);
      const b = toward(kerbR, 1 - u);
      el("line", { x1: lerp(a.x, b.x, 0.1 + rand() * 0.3), y1: a.y + (b.y - a.y) * 0.2, x2: lerp(a.x, b.x, 0.5 + rand() * 0.4), y2: a.y + (b.y - a.y) * 0.7, stroke: T.ink, "stroke-width": 1.2, opacity: 0.25 }, g);
    }
    el("line", { x1: vp.x, y1: vp.y, x2: kerbL.x, y2: kerbL.y, stroke: T.ink, "stroke-width": 4 }, g);
    el("line", { x1: vp.x, y1: vp.y, x2: kerbR.x, y2: kerbR.y, stroke: T.ink, "stroke-width": 4 }, g);
    const laneEnd = o.lane;
    for (let z = 0.15; z < 14; z += 1.1) {
      const a = toward(laneEnd, depth(z));
      const b = toward(laneEnd, depth(z + 0.5));
      el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: T.ink, "stroke-width": Math.max(1.5, 8 * (1 - depth(z))), "stroke-linecap": "butt" }, g);
    }

    // Facade rows.
    for (const side of [o.left, o.right]) {
      if (!side) continue;
      const sidewalk = [toward(side.base0, 0), vp, toward(side.kerb, 0)];
      el("polygon", { points: pts(sidewalk), fill: "url(#hatch-faint)" }, g);
      const zs = side.edges;
      for (let i = 0; i < zs.length - 1; i++) {
        const ua = depth(zs[i]);
        const ub = depth(zs[i + 1]);
        const hA = side.heights[i % side.heights.length];
        const baseA = toward(side.base0, ua);
        const baseB = toward(side.base0, ub);
        const topFull = (u) => toward(side.top0, u);
        const tA = lerpPt(baseA, topFull(ua), hA);
        const tB = lerpPt(baseB, topFull(ub), hA);
        const shade = side.shade && i % 2 === 0 ? "url(#hatch-faint)" : T.paperLight;
        el("polygon", { points: pts([baseA, tA, tB, baseB]), fill: shade, stroke: T.ink, "stroke-width": Math.max(1.6, 4.5 * (1 - ua)) }, g);
        // Cornice.
        const cA = lerpPt(baseA, tA, 0.95);
        const cB = lerpPt(baseB, tB, 0.95);
        el("line", { x1: cA.x, y1: cA.y, x2: cB.x, y2: cB.y, stroke: T.ink, "stroke-width": Math.max(1.2, 3 * (1 - ua)) }, g);
        // Windows: columns in depth, rows in height.
        const cols = 3;
        const rows = side.rows;
        const widthPx = Math.abs(baseB.x - baseA.x);
        if (widthPx < 14) continue;
        for (let c = 0; c < cols; c++) {
          const za = lerp(zs[i], zs[i + 1], (c + 0.22) / cols);
          const zb = lerp(zs[i], zs[i + 1], (c + 0.78) / cols);
          const u0 = depth(za);
          const u1 = depth(zb);
          for (let r = 0; r < rows; r++) {
            const v0 = 0.12 + (r / rows) * 0.78;
            const v1 = v0 + 0.5 / rows;
            const corner = (u, v) => lerpPt(toward(side.base0, u), lerpPt(toward(side.base0, u), topFull(u), hA), v);
            const quad = [corner(u0, v0), corner(u0, v1), corner(u1, v1), corner(u1, v0)];
            if (Math.abs(quad[0].y - quad[1].y) < 4) continue;
            const lit = rand() > 0.72;
            el("polygon", { points: pts(quad), fill: lit ? T.paperLight : "url(#crosshatch)", stroke: T.ink, "stroke-width": Math.max(1, 2.2 * (1 - u0)) }, g);
          }
        }
      }
      // Street lamps along this sidewalk.
      for (const z of side.lamps || []) {
        const u = depth(z);
        const foot = lerpPt(toward(side.base0, u), toward(side.kerb, u), 0.7);
        const hpx = (side.lampH || 300) * (1 - u);
        el("line", { x1: foot.x, y1: foot.y, x2: foot.x, y2: foot.y - hpx, stroke: T.ink, "stroke-width": Math.max(1.5, 7 * (1 - u)) }, g);
        el("path", { d: `M${foot.x},${foot.y - hpx} q${side.lampDir * hpx * 0.12},${-hpx * 0.06} ${side.lampDir * hpx * 0.2},0`, fill: "none", stroke: T.ink, "stroke-width": Math.max(1.5, 6 * (1 - u)) }, g);
        el("ellipse", { cx: foot.x + side.lampDir * hpx * 0.2, cy: foot.y - hpx + 6 * (1 - u), rx: 14 * (1 - u) + 2, ry: 7 * (1 - u) + 1, fill: T.ink }, g);
      }
    }
    return g;
  }

  /** Bus shelter (front elevation) with a poster frame; returns {g, poster: {x,y,w,h,g}}. */
  function shelter(parent, o) {
    const T = TOKENS;
    const g = el("g", { id: o.id || "shelter" }, parent);
    const art = el("g", { filter: "url(#rough)" }, g);
    const { x, ground, w, h } = o;
    const top = ground - h;
    el("rect", { x: x + 12, y: top + 40, width: w - 24, height: h - 90, fill: "url(#glass)", stroke: T.inkFaint, "stroke-width": 2 }, art);
    el("rect", { x: x - 6, y: top + 26, width: 14, height: h - 26, fill: T.ink }, art);
    el("rect", { x: x + w - 8, y: top + 26, width: 14, height: h - 26, fill: T.ink }, art);
    el("path", { d: `M${x - 34},${top + 30} L${x - 22},${top} L${x + w + 22},${top} L${x + w + 34},${top + 30} Z`, fill: T.ink }, art);
    el("rect", { x: x - 30, y: top + 30, width: w + 60, height: 12, fill: "url(#hatch-dense)" }, art);
    // Bench.
    el("rect", { x: x + w * 0.52, y: ground - 128, width: w * 0.42, height: 14, fill: T.ink }, art);
    el("rect", { x: x + w * 0.56, y: ground - 114, width: 8, height: 114, fill: T.ink }, art);
    el("rect", { x: x + w * 0.88, y: ground - 114, width: 8, height: 114, fill: T.ink }, art);
    const p = o.poster;
    el("rect", { x: p.x - 14, y: p.y - 14, width: p.w + 28, height: p.h + 28, fill: T.ink }, art);
    el("rect", { x: p.x, y: p.y, width: p.w, height: p.h, fill: T.paperLight }, g);
    const posterG = el("g", { id: (o.id || "shelter") + "-poster" }, g);
    return { g, poster: { ...p, g: posterG } };
  }

  /** Bus-stop pole with a round sign carrying a small bus pictogram (o.box=false drops the timetable box). */
  function stopPole(parent, x, ground, h, o = {}) {
    const T = TOKENS;
    const g = el("g", { filter: "url(#rough)" }, parent);
    el("rect", { x: x - 6, y: ground - h, width: 12, height: h, fill: T.ink }, g);
    el("rect", { x: x - 20, y: ground - 8, width: 40, height: 8, fill: T.ink }, g);
    el("circle", { cx: x, cy: ground - h, r: 52, fill: T.paperLight, stroke: T.ink, "stroke-width": 7 }, g);
    el("circle", { cx: x, cy: ground - h, r: 40, fill: "none", stroke: T.ink, "stroke-width": 2 }, g);
    const pic = el("g", { transform: `translate(${x} ${ground - h + 2}) scale(0.24)` }, g);
    el("rect", { x: -110, y: -48, width: 220, height: 84, rx: 14, fill: T.ink }, pic);
    for (let i = 0; i < 5; i++) el("rect", { x: -98 + i * 40, y: -34, width: 28, height: 28, fill: T.paperLight }, pic);
    el("circle", { cx: -66, cy: 38, r: 20, fill: T.ink }, pic);
    el("circle", { cx: 64, cy: 38, r: 20, fill: T.ink }, pic);
    if (o.box === false) return g;
    el("rect", { x: x - 30, y: ground - h + 90, width: 60, height: 90, fill: T.paperLight, stroke: T.ink, "stroke-width": 4 }, g);
    for (let i = 0; i < 5; i++) el("line", { x1: x - 20, y1: ground - h + 108 + i * 14, x2: x + 20, y2: ground - h + 108 + i * 14, stroke: T.ink, "stroke-width": 2 }, g);
    return g;
  }

  /** Paint a paper card behind everything already in `group` (pad px); returns its bbox. */
  function backCard(group, pad = 14, o = {}) {
    const box = group.getBBox();
    const card = el("rect", {
      x: box.x - pad,
      y: box.y - pad * 0.7,
      width: box.width + pad * 2,
      height: box.height + pad * 1.4,
      rx: o.rx ?? 10,
      fill: TOKENS.paperLight,
      stroke: TOKENS.ink,
      "stroke-width": o.stroke ?? 2,
      transform: o.rotate ? `rotate(${o.rotate} ${box.x + box.width / 2} ${box.y + box.height / 2})` : undefined,
    });
    group.insertBefore(card, group.firstChild);
    return { x: box.x - pad, y: box.y - pad * 0.7, w: box.width + pad * 2, h: box.height + pad * 1.4 };
  }

  /**
   * Red-pencil cycle arrows around an ellipse {x,y,rx,ry}, clockwise, skipping
   * any part of the ellipse that falls inside `boxes` (+gap). Returns one <g> per run.
   */
  function cycleArrows(parent, ell, boxes, o = {}) {
    const gap = o.gap ?? 16;
    const inside = (p) => boxes.some((b) => p.x > b.x - gap && p.x < b.x + b.w + gap && p.y > b.y - gap && p.y < b.y + b.h + gap);
    const runs = [];
    let run = [];
    for (let d = o.start ?? -90; d <= (o.start ?? -90) + 360; d += 2) {
      const a = (d * Math.PI) / 180;
      const p = { x: ell.x + Math.cos(a) * ell.rx, y: ell.y + Math.sin(a) * ell.ry };
      if (inside(p)) {
        if (run.length > 3) runs.push(run);
        run = [];
      } else run.push(p);
    }
    if (run.length > 3) runs.push(run);
    return runs.map((r) => {
      const g = el("g", {}, parent);
      pencilArrow(g, r.filter((_, i) => i % 3 === 0 || i === r.length - 1), { width: o.width || 6 });
      return g;
    });
  }

  /** Inked river for maps: two banks along a centreline and short wave strokes; fades at the ends. */
  function river(parent, centre, width, o = {}) {
    const T = TOKENS;
    const g = el("g", { class: "river" }, parent);
    const id = o.id || "river-mask";
    const ys = centre.map((p) => p.y);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const defs = el("defs", {}, g);
    const grad = el("linearGradient", { id: id + "-g", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: 0, "stop-color": "#000" }, grad);
    el("stop", { offset: 0.12, "stop-color": "#fff" }, grad);
    el("stop", { offset: 0.88, "stop-color": "#fff" }, grad);
    el("stop", { offset: 1, "stop-color": "#000" }, grad);
    const mask = el("mask", { id, maskUnits: "userSpaceOnUse", x: -200, y: y0, width: 4000, height: y1 - y0 }, defs);
    el("rect", { x: -200, y: y0, width: 4000, height: y1 - y0, fill: `url(#${id}-g)` }, mask);
    const art = el("g", { mask: `url(#${id})` }, g);
    const left = centre.map((p) => ({ x: p.x - width / 2, y: p.y }));
    const right = centre.map((p) => ({ x: p.x + width / 2, y: p.y }));
    el("path", { d: smoothPath(left) + " L" + smoothPath(right.slice().reverse()).slice(1) + "Z", fill: T.blueWash, opacity: 0.35 }, art);
    el("path", { d: smoothPath(left), fill: "none", stroke: T.ink, "stroke-width": 3 }, art);
    el("path", { d: smoothPath(right), fill: "none", stroke: T.ink, "stroke-width": 3 }, art);
    const rand = rng(o.seed || 17);
    for (let i = 0; i < (o.waves || 40); i++) {
      const t = rand();
      const yy = lerp(y0, y1, t);
      let k = 0;
      while (k < centre.length - 2 && centre[k + 1].y < yy) k++;
      const a = centre[k];
      const b = centre[k + 1];
      const cx = lerp(a.x, b.x, clamp((yy - a.y) / (b.y - a.y || 1))) + (rand() - 0.5) * width * 0.5;
      el("path", { d: `M${cx - 12},${yy} q6,-5 12,0 t12,0`, fill: "none", stroke: T.blue, "stroke-width": 2, opacity: 0.8 }, art);
    }
    return g;
  }

  /** Doubled-edge footpath along points (ink kerb lines with a paper walk between). */
  function footpath(parent, points, o = {}) {
    const d = smoothPath(points);
    const w = o.width || 18;
    el("path", { d, fill: "none", stroke: TOKENS.ink, "stroke-width": w + 5, "stroke-linecap": "round", opacity: 0.75 }, parent);
    const walk = el("path", { d, fill: "none", stroke: TOKENS.paperLight, "stroke-width": w, "stroke-linecap": "round" }, parent);
    walk.dataset.noink = 1;
    return d;
  }

  /** Small park bench seen from above (slats), centred at (x, y), rotated `deg`. */
  function benchTop(parent, x, y, deg = 0) {
    const g = el("g", { transform: `translate(${x} ${y}) rotate(${deg})` }, parent);
    el("rect", { x: -20, y: -6, width: 40, height: 12, fill: TOKENS.paperLight, stroke: TOKENS.ink, "stroke-width": 2.2 }, g);
    el("line", { x1: -20, y1: 0, x2: 20, y2: 0, stroke: TOKENS.ink, "stroke-width": 1.4 }, g);
    return g;
  }

  /**
   * Aerial park plan inside rect {x, y, w, h}: footpaths meeting at a fountain
   * plaza, a pond, benches. Background art that keeps a map from reading as an
   * empty plan; dim it (opacity ~0.25) when a diagram is drawn on top.
   */
  function parkPlan(parent, r, o = {}) {
    const T = TOKENS;
    const g = el("g", { class: "park" }, parent);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2 + (o.plazaDy || 0);
    const rand = rng(o.seed || 41);
    // Footpaths: an S-curve across, one spur down, one diagonal up-right.
    footpath(g, [{ x: r.x, y: cy + 40 }, { x: r.x + r.w * 0.2, y: cy + 10 }, { x: cx - 120, y: cy - 6 }, { x: cx, y: cy }], o);
    footpath(g, [{ x: cx, y: cy }, { x: cx + 130, y: cy + 8 }, { x: r.x + r.w * 0.8, y: cy - 16 }, { x: r.x + r.w, y: cy + 20 }], o);
    footpath(g, [{ x: cx, y: cy }, { x: cx - 20, y: cy + r.h * 0.25 }, { x: cx + 10, y: r.y + r.h }], o);
    footpath(g, [{ x: cx, y: cy }, { x: cx + r.w * 0.16, y: cy - r.h * 0.22 }, { x: r.x + r.w * 0.8, y: r.y }], o);
    // Fountain plaza: paving ring, basin, water with wave strokes.
    const pr = o.plazaR || 58;
    el("circle", { cx, cy, r: pr, fill: T.paperLight, stroke: T.ink, "stroke-width": 3 }, g);
    el("circle", { cx, cy, r: pr - 10, fill: "none", stroke: T.ink, "stroke-width": 1.2, "stroke-dasharray": "3 6", opacity: 0.7 }, g);
    el("circle", { cx, cy, r: pr * 0.52, fill: T.blueWash, stroke: T.ink, "stroke-width": 3 }, g);
    el("circle", { cx, cy, r: pr * 0.14, fill: T.paperLight, stroke: T.ink, "stroke-width": 2.4 }, g);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const wx = cx + Math.cos(a) * pr * 0.34;
      const wy = cy + Math.sin(a) * pr * 0.34;
      el("path", { d: `M${(wx - 6).toFixed(1)},${wy.toFixed(1)} q3,-3 6,0 t6,0`, fill: "none", stroke: T.blue, "stroke-width": 1.8 }, g);
    }
    // Pond: an irregular blob with a hatched shadow bank and ripples.
    const pc = o.pond || { x: r.x + r.w * 0.26, y: r.y + r.h * 0.74 };
    const lobes = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const k = 0.85 + rand() * 0.25;
      lobes.push({ x: pc.x + Math.cos(a) * 96 * k, y: pc.y + Math.sin(a) * 40 * k });
    }
    const pondD = smoothPath(lobes, true);
    el("path", { d: pondD, fill: "url(#hatch-dense)", opacity: 0.45, transform: "translate(7 6)" }, g);
    el("path", { d: pondD, fill: T.blueWash, stroke: T.ink, "stroke-width": 3 }, g);
    for (let i = 0; i < 7; i++) {
      const wx = pc.x + (rand() - 0.5) * 120;
      const wy = pc.y + (rand() - 0.5) * 36;
      el("path", { d: `M${(wx - 9).toFixed(1)},${wy.toFixed(1)} q4.5,-4 9,0 t9,0`, fill: "none", stroke: T.blue, "stroke-width": 2 }, g);
    }
    // Benches facing the plaza.
    for (const [bx, by, deg] of o.benches || [[cx - pr - 30, cy - 34, 0], [cx + pr + 30, cy + 36, 0], [cx + 34, cy + pr + 26, 90]]) {
      benchTop(g, bx, by, deg);
    }
    // A few extra trees along the paths.
    for (const [tx, ty, tr] of o.trees || []) treeTop(g, tx, ty, tr, 60 + Math.round(tx));
    return g;
  }

  /** Map cartouche: a ruled paper title plate with small-caps lines, centred at (x, y). */
  function cartouche(parent, x, y, lines, o = {}) {
    const g = el("g", { class: "cartouche" }, parent);
    const size = o.size || 28;
    lines.forEach((line, i) => caption(g, x, y + i * (size + 12), line, { anchor: "middle", size, ls: o.ls ?? 4, fill: i === 0 ? TOKENS.ink : TOKENS.inkSoft, weight: i === 0 ? 600 : 400 }));
    const box = g.getBBox();
    const pad = 20;
    const outer = { x: box.x - pad, y: box.y - pad * 0.6, width: box.width + pad * 2, height: box.height + pad * 1.2 };
    const back = el("rect", { ...outer, fill: TOKENS.paperLight, stroke: TOKENS.ink, "stroke-width": 3 });
    const inner = el("rect", { x: outer.x + 6, y: outer.y + 6, width: outer.width - 12, height: outer.height - 12, fill: "none", stroke: TOKENS.ink, "stroke-width": 1.2 });
    g.insertBefore(inner, g.firstChild);
    g.insertBefore(back, g.firstChild);
    return g;
  }

  /** Scale the fixed 1920x1080 stage to fit the window (letterboxed). */
  function fitStage(stage) {
    const fit = () => {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      stage.style.transform = `translate(${(window.innerWidth - 1920 * s) / 2}px, ${(window.innerHeight - 1080 * s) / 2}px) scale(${s})`;
    };
    window.addEventListener("resize", fit);
    fit();
  }

  window.Ink = {
    TOKENS,
    FONTS,
    POSES,
    el,
    text,
    rng,
    lerp,
    clamp,
    lerpPt,
    smoothPath,
    pts,
    installDefs,
    paperTexture,
    EASE,
    tween,
    finishAll,
    setReduced,
    isReduced: () => state.reduced,
    inkIn,
    fadeTo,
    show,
    hide,
    tag,
    stamp,
    sourceLine,
    caption,
    pencil,
    pencilRing,
    pencilArrow,
    pencilNote,
    clockIcon,
    hourglassIcon,
    rider,
    crowd,
    treeTop,
    bus,
    character,
    portrait,
    route,
    cityBlocks,
    gauge,
    avenue,
    shelter,
    stopPole,
    backCard,
    cycleArrows,
    river,
    footpath,
    benchTop,
    parkPlan,
    cartouche,
    fitStage,
  };
})();
