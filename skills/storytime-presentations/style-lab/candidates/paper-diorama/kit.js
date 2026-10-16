/*
 * Paper Diorama style kit.
 *
 * A cut-paper shadow-box theatre: flat paper pieces with hand-cut edges, soft
 * drop shadows per plane, brass split pins, string, tape and rubber stamps.
 * Plain browser JS (no modules). Everything is exposed on window.Paper.
 *
 * Coordinates are stage pixels on a 1920x1080 canvas. Every drawing helper
 * takes a parent SVG element and returns the element (or a small controller
 * object with a render(props) method for animated components).
 */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  /* Palette tokens. Semantic roles are documented in DESIGN.md. */
  const PALETTE = {
    ink: "#2B2622",
    inkSoft: "#4E4238",
    cream: "#FFF8EA",
    paper: "#F7EBD5",
    kraft: "#C49A6C",
    kraftLight: "#D9B88F",
    kraftDark: "#8C6642",
    kraftDeep: "#5E4329",
    string: "#7A6550",
    sky: "#F6E7CB",
    skyLow: "#F3D3AA",
    sun: "#F2AE45",
    hillFar: "#C6D4A6",
    hillMid: "#A8C189",
    hillNear: "#8BAA71",
    grass: "#6F955B",
    forest: "#4E7350",
    meadow: "#AFC88C",
    meadowDark: "#97B577",
    road: "#5B5D6A",
    roadLine: "#F3E7CC",
    busA: "#EBA437",
    busB: "#6B8DC9",
    busC: "#9DB27F",
    alarm: "#C8442F",
    alarmInk: "#A3341F",
    fix: "#2A7C6C",
    plum: "#7B4F80",
    plumDark: "#633F69",
    rose: "#E39B8B",
    skin: "#F1C6A0",
    trousers: "#3E4A66",
    shoe: "#3A2E28",
    beanie: "#4F7A5B",
    brass: "#C9A13B",
    brassLight: "#F2DA94",
    window: "#FBF3DE",
    house1: "#DDA58F",
    house2: "#CB7B5F",
    house3: "#E9C99B",
    house4: "#B9876B",
    water: "#8DB7C2",
    waterDeep: "#6A98A9",
    hedge: "#5F8A4E",
    hedgeDark: "#4C7341",
  };

  const FONTS = {
    display: "'Fraunces', Georgia, serif",
    body: "'Andika', 'Gentium Greek', 'Trebuchet MS', sans-serif",
  };

  /* ---------- small utilities ---------- */

  /** el(tag, attrs, parent): create an SVG element with attributes. */
  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    if (attrs) {
      for (const key of Object.keys(attrs)) {
        if (attrs[key] !== null && attrs[key] !== undefined) {
          node.setAttribute(key, attrs[key]);
        }
      }
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  /** group(parent, attrs): shorthand for an SVG <g>. */
  function group(parent, attrs) {
    return el("g", attrs, parent);
  }

  /** rng(seed): deterministic mulberry32 random generator returning [0, 1). */
  function rng(seed) {
    let state = (seed * 2654435761) >>> 0;
    return function next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  /** stage(k, start, end): remap k so it runs 0..1 between start and end. */
  const stage = (k, start, end) => clamp((k - start) / (end - start), 0, 1);
  const rad = (deg) => (deg * Math.PI) / 180;

  /* ---------- hand-cut geometry ---------- */

  /**
   * jitterPoints(points, opts): subdivide a polygon and nudge each new vertex
   * perpendicular to its edge, so straight lines look scissor-cut.
   * opts: amp (px), step (px between vertices), seed, closed.
   */
  function jitterPoints(points, opts) {
    const o = Object.assign({ amp: 1.8, step: 16, seed: 1, closed: true }, opts);
    const rand = rng(o.seed);
    const out = [];
    const edgeCount = o.closed ? points.length : points.length - 1;
    // A damped random walk keeps neighbouring offsets correlated: a cut edge
    // wanders slowly instead of looking like sandpaper.
    let drift = 0;
    for (let i = 0; i < edgeCount; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      const dx = bx - ax;
      const dy = by - ay;
      const length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length;
      const ny = dx / length;
      const segments = Math.max(1, Math.round(length / o.step));
      for (let s = 0; s < segments; s++) {
        const t = s / segments;
        drift = drift * 0.55 + (rand() * 2 - 1) * o.amp;
        const offset = s === 0 ? drift * 0.4 : drift;
        out.push([ax + dx * t + nx * offset, ay + dy * t + ny * offset]);
      }
    }
    if (!o.closed) out.push(points[points.length - 1]);
    return out;
  }

  /** pathFrom(points, closed): points -> SVG path data. */
  function pathFrom(points, closed) {
    let d = "";
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return closed === false ? d : d + "Z";
  }

  /** cutPoly(points, opts): hand-cut closed polygon path data. */
  function cutPoly(points, opts) {
    return pathFrom(jitterPoints(points, opts), true);
  }

  /** roundRectPoints(x, y, w, h, r): perimeter points of a rounded rectangle. */
  function roundRectPoints(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    const corners = [
      [x + w - radius, y + radius, -90],
      [x + w - radius, y + h - radius, 0],
      [x + radius, y + h - radius, 90],
      [x + radius, y + radius, 180],
    ];
    const points = [];
    for (const [cx, cy, start] of corners) {
      const steps = radius < 3 ? 1 : 4;
      for (let i = 0; i <= steps; i++) {
        const a = rad(start + (90 * i) / steps);
        points.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
      }
    }
    return points;
  }

  /** cutRect(x, y, w, h, opts): hand-cut rounded rectangle (opts.r radius). */
  function cutRect(x, y, w, h, opts) {
    const o = Object.assign({ r: 6, amp: 1.4, step: 18, seed: 1 }, opts);
    return cutPoly(roundRectPoints(x, y, w, h, o.r), o);
  }

  /** cutEllipse(cx, cy, rx, ry, opts): hand-cut ellipse with radial wobble. */
  function cutEllipse(cx, cy, rx, ry, opts) {
    const o = Object.assign({ amp: 1.4, seed: 1, n: 0 }, opts);
    const perimeter = Math.PI * (rx + ry);
    const n = o.n || Math.max(18, Math.round(perimeter / 13));
    const rand = rng(o.seed);
    const points = [];
    let drift = 0;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      drift = drift * 0.6 + (rand() * 2 - 1) * o.amp;
      points.push([cx + (rx + drift) * Math.cos(a), cy + (ry + drift) * Math.sin(a)]);
    }
    return pathFrom(points, true);
  }

  /**
   * hillPath(x0, x1, crestY, opts): a paper hill whose crest rolls with a few
   * seeded sine waves, closed down to opts.bottom.
   * opts: amp (crest height variation px), waves, seed, bottom.
   */
  function hillPath(x0, x1, crestY, opts) {
    const o = Object.assign({ amp: 40, waves: 2, seed: 1, bottom: 1200 }, opts);
    const rand = rng(o.seed);
    const components = [];
    for (let i = 0; i < 3; i++) {
      components.push({
        freq: (o.waves * (i + 1) * (0.7 + rand() * 0.6)) / (x1 - x0),
        phase: rand() * Math.PI * 2,
        weight: 1 / (i + 1.4),
      });
    }
    const crest = [];
    for (let x = x0; x <= x1 + 0.1; x += 24) {
      let y = 0;
      for (const c of components) {
        y += Math.sin((x - x0) * c.freq * Math.PI * 2 + c.phase) * c.weight;
      }
      crest.push([x, crestY + y * o.amp]);
    }
    const jittered = jitterPoints(crest, { amp: 1.6, step: 12, seed: o.seed + 7, closed: false });
    return pathFrom(jittered.concat([[x1, o.bottom], [x0, o.bottom]]), true);
  }

  /**
   * ribbonPath(centerline, halfWidth, opts): a cut-paper strip that follows a
   * centerline of [x, y] points. halfWidth may be a number or a function of
   * the 0..1 position along the line (for perspective).
   */
  function ribbonPath(centerline, halfWidth, opts) {
    const left = [];
    const right = [];
    const n = centerline.length;
    for (let i = 0; i < n; i++) {
      const [x, y] = centerline[i];
      const [px, py] = centerline[Math.max(0, i - 1)];
      const [qx, qy] = centerline[Math.min(n - 1, i + 1)];
      const length = Math.hypot(qx - px, qy - py) || 1;
      const nx = -(qy - py) / length;
      const ny = (qx - px) / length;
      const w = typeof halfWidth === "function" ? halfWidth(i / (n - 1)) : halfWidth;
      left.push([x + nx * w, y + ny * w]);
      right.push([x - nx * w, y - ny * w]);
    }
    return cutPoly(left.concat(right.reverse()), Object.assign({ amp: 1.2, step: 14 }, opts));
  }

  /** bezierPoints(p0, p1, p2, p3, n): sample a cubic Bezier into n+1 points. */
  function bezierPoints(p0, p1, p2, p3, n) {
    const points = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      const a = u * u * u;
      const b = 3 * u * u * t;
      const c = 3 * u * t * t;
      const d = t * t * t;
      points.push([
        a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
        a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
      ]);
    }
    return points;
  }

  /* ---------- defs: shadows, stamp ink, textures ---------- */

  /**
   * installDefs(svg): add the shared filters to a (non-display:none) SVG.
   * Filters: pd-lift-1/2/3 (paper drop shadows, small to large),
   * pd-ink (rubber-stamp ink breakup), pd-soft (blurred contact shadow).
   */
  function installDefs(svg) {
    const defs = el("defs", null, svg);
    const lifts = [
      ["pd-lift-1", 2, 2.2, 0.32],
      ["pd-lift-2", 5, 5, 0.3],
      ["pd-lift-3", 10, 11, 0.28],
    ];
    for (const [id, dy, blur, opacity] of lifts) {
      const f = el("filter", {
        id,
        x: "-20%",
        y: "-20%",
        width: "140%",
        height: "150%",
        "color-interpolation-filters": "sRGB",
      }, defs);
      el("feDropShadow", {
        dx: (dy * 0.35).toFixed(1),
        dy,
        stdDeviation: blur,
        "flood-color": "#3B2715",
        "flood-opacity": opacity,
      }, f);
    }
    // Whole-plane variant: user-space region so huge groups are not clipped.
    for (const [id, dy, blur, opacity] of lifts) {
      const f = el("filter", {
        id: id + "-plane",
        filterUnits: "userSpaceOnUse",
        x: -200,
        y: -200,
        width: 2320,
        height: 1600,
        "color-interpolation-filters": "sRGB",
      }, defs);
      el("feDropShadow", {
        dx: (dy * 0.35).toFixed(1),
        dy,
        stdDeviation: blur,
        "flood-color": "#3B2715",
        "flood-opacity": opacity,
      }, f);
    }
    const ink = el("filter", { id: "pd-ink", x: "-5%", y: "-5%", width: "110%", height: "110%" }, defs);
    el("feTurbulence", { type: "fractalNoise", baseFrequency: "0.55", numOctaves: 2, seed: 7, result: "noise" }, ink);
    el("feColorMatrix", {
      in: "noise",
      type: "matrix",
      values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 3.4",
      result: "mask",
    }, ink);
    el("feComposite", { in: "SourceGraphic", in2: "mask", operator: "in" }, ink);
    const soft = el("filter", { id: "pd-soft", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
    el("feGaussianBlur", { stdDeviation: 6 }, soft);
    return defs;
  }

  /**
   * paperTextures(): build two tiling paper textures on canvas and return
   * their data URLs { grain, mottle }. Generated once; deterministic.
   */
  function paperTextures() {
    const rand = rng(42);
    const size = 256;
    const grainCanvas = document.createElement("canvas");
    grainCanvas.width = size;
    grainCanvas.height = size;
    const g = grainCanvas.getContext("2d");
    const image = g.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = 200 + rand() * 55;
      image.data[i * 4] = v;
      image.data[i * 4 + 1] = v - 4;
      image.data[i * 4 + 2] = v - 10;
      image.data[i * 4 + 3] = 255;
    }
    g.putImageData(image, 0, 0);
    // Fibres: short faint strokes, like pulp in craft paper.
    g.lineCap = "round";
    for (let i = 0; i < 220; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const a = rand() * Math.PI;
      const len = 4 + rand() * 14;
      g.strokeStyle = rand() < 0.5 ? "rgba(120,90,60,0.22)" : "rgba(255,255,255,0.5)";
      g.lineWidth = 0.6 + rand() * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
    const mottleCanvas = document.createElement("canvas");
    mottleCanvas.width = 512;
    mottleCanvas.height = 512;
    const m = mottleCanvas.getContext("2d");
    m.fillStyle = "rgb(128,128,128)";
    m.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const r = 30 + rand() * 90;
      const light = rand() < 0.5;
      const grad = m.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, light ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)");
      grad.addColorStop(1, "rgba(128,128,128,0)");
      m.fillStyle = grad;
      m.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return { grain: grainCanvas.toDataURL(), mottle: mottleCanvas.toDataURL() };
  }

  /**
   * grainOverlay(host): add multiply/soft-light paper texture overlays on top
   * of a stage element. Pure decoration; pointer-events off.
   */
  function grainOverlay(host) {
    const textures = paperTextures();
    const grain = document.createElement("div");
    grain.className = "pd-grain";
    grain.style.cssText =
      "position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;opacity:.42;" +
      "background-size:256px 256px;background-image:url(" + textures.grain + ")";
    const mottle = document.createElement("div");
    mottle.className = "pd-mottle";
    mottle.style.cssText =
      "position:absolute;inset:0;pointer-events:none;mix-blend-mode:soft-light;opacity:.9;" +
      "background-size:512px 512px;background-image:url(" + textures.mottle + ")";
    host.appendChild(mottle);
    host.appendChild(grain);
  }

  /* ---------- basic paper pieces ---------- */

  /** piece(parent, d, fill, opts): a paper piece; opts.lift = 1|2|3 shadow. */
  function piece(parent, d, fill, opts) {
    const o = opts || {};
    return el("path", {
      d,
      fill,
      stroke: o.stroke || "rgba(60,40,20,0.16)",
      "stroke-width": o.strokeWidth || 1.2,
      "stroke-linejoin": "round",
      filter: o.lift ? "url(#pd-lift-" + o.lift + ")" : null,
      opacity: o.opacity,
      class: o.className,
    }, parent);
  }

  /** text(parent, opts): DOM text in the kit fonts. opts.font = display|body. */
  function text(parent, opts) {
    const o = Object.assign({
      x: 0,
      y: 0,
      size: 30,
      weight: 700,
      font: "body",
      fill: PALETTE.ink,
      anchor: "start",
      baseline: "alphabetic",
      spacing: 0,
    }, opts);
    const node = el("text", {
      x: o.x,
      y: o.y,
      "font-family": FONTS[o.font] || o.font,
      "font-size": o.size,
      "font-weight": o.weight,
      fill: o.fill,
      "text-anchor": o.anchor,
      "dominant-baseline": o.baseline,
      "letter-spacing": o.spacing,
      stroke: o.stroke,
      "stroke-width": o.strokeWidth,
      "paint-order": o.stroke ? "stroke" : null,
      "stroke-linejoin": o.stroke ? "round" : null,
    }, parent);
    node.textContent = o.text;
    return node;
  }

  /** string(parent, x1, y1, x2, y2): a hanging thread with a slight sag. */
  function string(parent, x1, y1, x2, y2, opts) {
    const sag = (opts && opts.sag) || 0;
    const mx = (x1 + x2) / 2 + sag;
    const my = (y1 + y2) / 2;
    return el("path", {
      d: `M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`,
      fill: "none",
      stroke: PALETTE.string,
      "stroke-width": (opts && opts.width) || 2.2,
      opacity: (opts && opts.opacity) || 0.85,
      "stroke-linecap": "round",
    }, parent);
  }

  /** tape(parent, x, y, w, h, angle, seed): a translucent masking-tape strip centred at x, y. */
  function tape(parent, x, y, w, h, angle, seed) {
    const g = group(parent, { transform: `translate(${x} ${y}) rotate(${angle || 0})` });
    const rand = rng(seed || 3);
    // Torn ends: zig-zag on the short edges, straight long edges.
    const points = [[-w / 2, -h / 2], [w / 2, -h / 2]];
    for (let i = 1; i < 5; i++) points.push([w / 2 + (rand() - 0.5) * 5, -h / 2 + (h * i) / 5]);
    points.push([w / 2, h / 2], [-w / 2, h / 2]);
    for (let i = 4; i > 0; i--) points.push([-w / 2 + (rand() - 0.5) * 5, -h / 2 + (h * i) / 5]);
    el("path", { d: pathFrom(points, true), fill: "rgba(236,222,178,0.78)", stroke: "rgba(150,120,70,0.25)", "stroke-width": 1 }, g);
    return g;
  }

  /** splitPin(parent, x, y, r): a brass paper fastener head. */
  function splitPin(parent, x, y, r) {
    const radius = r || 6;
    const g = group(parent, { transform: `translate(${x} ${y})` });
    el("circle", { r: radius, fill: PALETTE.brass, stroke: "#8A6A1E", "stroke-width": Math.max(1, radius * 0.18) }, g);
    el("circle", { cx: -radius * 0.3, cy: -radius * 0.3, r: radius * 0.38, fill: PALETTE.brassLight, opacity: 0.9 }, g);
    return g;
  }

  /** contactShadow(parent, x, y, rx, ry, opacity): soft oval shadow on the ground. */
  function contactShadow(parent, x, y, rx, ry, opacity) {
    return el("ellipse", {
      cx: x,
      cy: y,
      rx,
      ry,
      fill: "#3B2715",
      opacity: opacity === undefined ? 0.22 : opacity,
      filter: "url(#pd-soft)",
    }, parent);
  }

  /**
   * card(parent, opts): a paper card holding 1+ lines of text, sized to fit.
   * opts: cx, cy (centre), lines [{text, size, font, weight, fill}], pad,
   * fill, edge (border colour), hole (luggage-tag punch), seed, rotate, lift.
   * Returns { g, w, h }.
   */
  function card(parent, opts) {
    const o = Object.assign({
      cx: 0,
      cy: 0,
      pad: 18,
      gap: 6,
      fill: PALETTE.cream,
      edge: null,
      hole: false,
      seed: 5,
      rotate: 0,
      lift: 2,
      minWidth: 0,
    }, opts);
    const g = group(parent, { transform: `translate(${o.cx} ${o.cy}) rotate(${o.rotate})` });
    const bodyLayer = group(g);
    const textLayer = group(g);
    const nodes = [];
    let width = 0;
    let height = 0;
    for (const line of o.lines) {
      const node = text(textLayer, Object.assign({ anchor: "middle", baseline: "alphabetic" }, line));
      const length = node.getComputedTextLength();
      width = Math.max(width, length);
      height += line.size * 1.0;
      nodes.push({ node, size: line.size });
    }
    height += o.gap * (o.lines.length - 1);
    const holeSpace = o.hole ? 26 : 0;
    const w = Math.max(o.minWidth, width + o.pad * 2 + holeSpace);
    const h = height + o.pad * 1.5;
    let y = -h / 2 + o.pad * 0.75;
    for (const { node, size } of nodes) {
      y += size * 0.8;
      node.setAttribute("x", holeSpace / 2);
      node.setAttribute("y", y.toFixed(1));
      y += size * 0.2 + o.gap;
    }
    const shape = o.hole
      ? [[-w / 2 + 16, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2 + 16, h / 2], [-w / 2, h / 2 - 14], [-w / 2, -h / 2 + 14]]
      : roundRectPoints(-w / 2, -h / 2, w, h, 6);
    piece(bodyLayer, cutPoly(shape, { amp: 1.1, step: 18, seed: o.seed }), o.fill, {
      lift: o.lift,
      stroke: o.edge || "rgba(60,40,20,0.18)",
      strokeWidth: o.edge ? 3 : 1.2,
    });
    if (o.hole) {
      el("circle", { cx: -w / 2 + 16, cy: 0, r: 6, fill: PALETTE.kraftDark, opacity: 0.7 }, bodyLayer);
      el("circle", { cx: -w / 2 + 16, cy: 0, r: 9, fill: "none", stroke: PALETTE.kraftLight, "stroke-width": 3 }, bodyLayer);
    }
    return { g, w, h };
  }

  /** arrowPiece(parent, x1, y1, x2, y2, opts): straight cut-paper arrow. opts: w, head, fill, seed, lift. */
  function arrowPiece(parent, x1, y1, x2, y2, opts) {
    const o = Object.assign({ w: 22, head: 46, fill: PALETTE.ink, seed: 9, lift: 2 }, opts);
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    const shaft = length - o.head;
    const points = [
      [0, -o.w / 2],
      [shaft, -o.w / 2],
      [shaft, -o.head * 0.62],
      [length, 0],
      [shaft, o.head * 0.62],
      [shaft, o.w / 2],
      [0, o.w / 2],
    ];
    const g = group(parent, { transform: `translate(${x1} ${y1}) rotate(${angle.toFixed(2)})` });
    piece(g, cutPoly(points, { amp: 1.2, step: 14, seed: o.seed }), o.fill, { lift: o.lift });
    return g;
  }

  /**
   * arcArrowPath(cx, cy, rx, ry, a0, a1, w, head): path data for a curved
   * cut-paper arrow along an ellipse from angle a0 to a1 (degrees, clockwise).
   */
  function arcArrowPath(cx, cy, rx, ry, a0, a1, w, head) {
    const steps = 16;
    const outer = [];
    const inner = [];
    const headAngle = a1 - (a1 - a0) * 0.28;
    for (let i = 0; i <= steps; i++) {
      const a = rad(lerp(a0, headAngle, i / steps));
      outer.push([cx + (rx + w / 2) * Math.cos(a), cy + (ry + w / 2 * (ry / rx)) * Math.sin(a)]);
      inner.push([cx + (rx - w / 2) * Math.cos(a), cy + (ry - w / 2 * (ry / rx)) * Math.sin(a)]);
    }
    const h = rad(headAngle);
    const tip = rad(a1);
    const spread = head / 2;
    const headPoints = [
      [cx + (rx + spread) * Math.cos(h), cy + (ry + spread * (ry / rx)) * Math.sin(h)],
      [cx + rx * Math.cos(tip), cy + ry * Math.sin(tip)],
      [cx + (rx - spread) * Math.cos(h), cy + (ry - spread * (ry / rx)) * Math.sin(h)],
    ];
    return cutPoly(outer.concat(headPoints, inner.reverse()), { amp: 1, step: 12, seed: Math.round(a0) });
  }

  /* ---------- scenery ---------- */

  /** sun(parent, x, y, r): paper sun with cut rays. */
  function sun(parent, x, y, r) {
    const g = group(parent, { filter: "url(#pd-lift-2)" });
    const rays = [];
    for (let i = 0; i < 12; i++) {
      const a = rad(i * 30 + 8);
      const b = rad(i * 30 + 22);
      rays.push([x + Math.cos(a) * r * 1.12, y + Math.sin(a) * r * 1.12]);
      rays.push([x + Math.cos((a + b) / 2) * r * 1.42, y + Math.sin((a + b) / 2) * r * 1.42]);
      rays.push([x + Math.cos(b) * r * 1.12, y + Math.sin(b) * r * 1.12]);
    }
    piece(g, cutPoly(rays, { amp: 1, seed: 21 }), "#F5C46A");
    piece(g, cutEllipse(x, y, r * 1.08, r * 1.08, { seed: 22 }), "#F8D58A");
    piece(g, cutEllipse(x, y, r, r, { seed: 23 }), PALETTE.sun);
    return g;
  }

  /** cloud(parent, x, y, s, seed, topY): a paper cloud hanging on two strings from topY. */
  function cloud(parent, x, y, s, seed, topY) {
    const g = group(parent);
    const top = topY === undefined ? 20 : topY;
    string(g, x - 50 * s, top, x - 50 * s, y - 30 * s, { width: 1.6 });
    string(g, x + 60 * s, top, x + 60 * s, y - 24 * s, { width: 1.6 });
    const puffs = group(g, { filter: "url(#pd-lift-2)" });
    const rand = rng(seed);
    const blobs = [[-70, 10, 48], [-20, -18, 60], [40, -6, 54], [88, 14, 40], [10, 22, 52]];
    const parts = [];
    for (const [bx, by, br] of blobs) {
      parts.push(cutEllipse(x + bx * s, y + by * s, br * s * (0.95 + rand() * 0.1), br * s * 0.82, { seed: seed + bx, amp: 1.2 }));
    }
    piece(puffs, parts.join(""), "#FFFDF6", { stroke: "none" });
    return g;
  }

  /** house(parent, x, baseY, w, h, color, seed): cut-paper house, origin bottom-left. */
  function house(parent, x, baseY, w, h, color, seed) {
    const g = group(parent);
    const roofH = h * 0.55;
    const rand = rng(seed);
    piece(g, cutRect(x, baseY - h, w, h + 40, { r: 2, seed }), color);
    piece(g, cutPoly([[x - 8, baseY - h + 4], [x + w / 2, baseY - h - roofH], [x + w + 8, baseY - h + 4]], { seed: seed + 1 }), rand() < 0.5 ? PALETTE.kraftDeep : "#8E4F3E");
    const cols = w > 60 ? 2 : 1;
    for (let c = 0; c < cols; c++) {
      const wx = x + (w / (cols + 1)) * (c + 1) - 8;
      piece(g, cutRect(wx, baseY - h + h * 0.28, 16, 18, { r: 2, seed: seed + 3 + c, amp: 0.6 }), PALETTE.window);
    }
    return g;
  }

  /** tree(parent, x, baseY, s, kind, seed, color): lollipop ('round') or 'pine' paper tree. */
  function tree(parent, x, baseY, s, kind, seed, color) {
    const g = group(parent);
    piece(g, cutRect(x - 5 * s, baseY - 60 * s, 10 * s, 64 * s, { r: 2, seed }), PALETTE.kraftDeep);
    if (kind === "pine") {
      const points = [[x, baseY - 170 * s], [x + 44 * s, baseY - 40 * s], [x - 44 * s, baseY - 40 * s]];
      piece(g, cutPoly(points, { seed: seed + 1 }), color || PALETTE.forest);
    } else {
      piece(g, cutEllipse(x, baseY - 96 * s, 44 * s, 52 * s, { seed: seed + 1, amp: 1.6 }), color || PALETTE.forest);
    }
    return g;
  }

  /** flower(parent, x, y, s, color, seed): little five-petal paper flower on a stem. */
  function flower(parent, x, y, s, color, seed) {
    const g = group(parent);
    el("path", { d: `M${x} ${y}L${x} ${y - 34 * s}`, stroke: PALETTE.forest, "stroke-width": 4 * s, "stroke-linecap": "round" }, g);
    const petals = [];
    for (let i = 0; i < 5; i++) {
      const a = rad(i * 72 - 90);
      petals.push(cutEllipse(x + Math.cos(a) * 9 * s, y - 40 * s + Math.sin(a) * 9 * s, 7 * s, 7 * s, { seed: seed + i, amp: 0.6, n: 10 }));
    }
    piece(g, petals.join(""), color, { lift: 1 });
    el("circle", { cx: x, cy: y - 40 * s, r: 5 * s, fill: PALETTE.sun }, g);
    return g;
  }

  /**
   * hedge(parent, x, baseY, w, h, seed, color): a bumpy cut-paper hedge,
   * origin bottom-left. Two tones so it reads as layered paper, not a blob.
   */
  function hedge(parent, x, baseY, w, h, seed, color) {
    const g = group(parent, { filter: "url(#pd-lift-1)" });
    const rand = rng(seed || 5);
    const bumps = Math.max(2, Math.round(w / (h * 0.9)));
    const back = [];
    const front = [];
    for (let i = 0; i < bumps; i++) {
      const bx = x + (w * (i + 0.5)) / bumps;
      const r = (w / bumps) * (0.62 + rand() * 0.18);
      back.push(cutEllipse(bx, baseY - h + r * 0.7, r, r * 0.85, { seed: seed + i, amp: 1.4 }));
      front.push(cutEllipse(bx + r * 0.25, baseY - h * 0.45, r * 0.8, r * 0.55, { seed: seed + 40 + i, amp: 1.2 }));
    }
    piece(g, back.join("") + cutRect(x, baseY - h * 0.75, w, h * 0.75, { r: 4, seed: seed + 90 }), PALETTE.hedgeDark, { stroke: "none" });
    piece(g, front.join(""), color || PALETTE.hedge, { stroke: "none" });
    return g;
  }

  /**
   * cardboardEdge(parent, x0, x1, y, h, seed): the cut front edge of a raised
   * cardboard platform (liner, corrugated flutes, liner), top at y. This is
   * what makes a flat ground sheet read as a built diorama base.
   */
  function cardboardEdge(parent, x0, x1, y, h, seed) {
    const g = group(parent);
    piece(g, cutRect(x0, y, x1 - x0, h, { r: 0.1, amp: 1.2, step: 22, seed: seed || 7 }), PALETTE.kraft, { stroke: "none" });
    // Flutes: a run of semicircles between two liners, like real corrugated card.
    const fluteTop = y + 7;
    const fluteBottom = y + h - 7;
    const pitch = 22;
    let d = `M${x0} ${fluteBottom}`;
    for (let fx = x0; fx < x1; fx += pitch) {
      d += `Q${fx + pitch / 2} ${fluteTop - (fluteBottom - fluteTop) * 0.6} ${fx + pitch} ${fluteBottom}`;
    }
    el("path", { d, fill: "none", stroke: PALETTE.kraftDark, "stroke-width": 3, opacity: 0.75 }, g);
    piece(g, cutRect(x0, y, x1 - x0, 6, { r: 0.1, amp: 0.8, step: 24, seed: (seed || 7) + 1 }), PALETTE.kraftLight, { stroke: "none" });
    piece(g, cutRect(x0, y + h - 6, x1 - x0, 6, { r: 0.1, amp: 0.8, step: 24, seed: (seed || 7) + 2 }), PALETTE.kraftLight, { stroke: "none" });
    el("path", { d: `M${x0} ${y}H${x1}`, stroke: "#3B2715", "stroke-width": 2, opacity: 0.25 }, g);
    return g;
  }

  /** pond(parent, cx, cy, rx, ry, seed): two-tone paper pond with reeds and a lily pad. */
  function pond(parent, cx, cy, rx, ry, seed) {
    const g = group(parent);
    piece(g, cutEllipse(cx, cy, rx + 10, ry + 6, { seed, amp: 1.6 }), PALETTE.meadowDark, { stroke: "none" });
    piece(g, cutEllipse(cx, cy, rx, ry, { seed: seed + 1, amp: 1.8 }), PALETTE.water);
    piece(g, cutEllipse(cx + rx * 0.12, cy + ry * 0.12, rx * 0.66, ry * 0.58, { seed: seed + 2, amp: 1.4 }), PALETTE.waterDeep, { stroke: "none" });
    piece(g, cutPoly([[cx - rx * 0.5, cy - 4], [cx - rx * 0.5 + 18, cy - 12], [cx - rx * 0.5 + 30, cy - 2], [cx - rx * 0.5 + 14, cy + 8]], { seed: seed + 3 }), PALETTE.grass);
    for (const [rxOff, h] of [[0.86, 46], [0.92, 34], [0.8, 30]]) {
      const x = cx + rx * rxOff;
      el("path", { d: `M${x} ${cy}Q${x - 4} ${cy - h / 2} ${x + 2} ${cy - h}`, stroke: PALETTE.forest, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, g);
    }
    piece(g, cutEllipse(cx + rx * 0.88, cy - 44, 5, 12, { seed: seed + 4, n: 10 }), PALETTE.kraftDeep);
    return g;
  }

  /**
   * shadowBox(parent, opts): the kraft-card box that frames every state.
   * Draws the outer frame plus inner side walls in perspective.
   * opts: inset (frame width px), depth (wall depth px).
   */
  function shadowBox(parent, opts) {
    const o = Object.assign({ inset: 22, depth: 26, width: 1920, height: 1080 }, opts);
    const g = group(parent);
    const W = o.width;
    const H = o.height;
    const a = o.inset;
    const b = o.inset + o.depth;
    // Walls: top darkest (lid casts shadow), sides mid, floor lip lightest.
    piece(g, pathFrom([[a, a], [W - a, a], [W - b, b], [b, b]]), "#7C5A39", { stroke: "none" });
    piece(g, pathFrom([[a, a], [b, b], [b, H - b], [a, H - a]]), "#94704C", { stroke: "none" });
    piece(g, pathFrom([[W - a, a], [W - a, H - a], [W - b, H - b], [W - b, b]]), "#94704C", { stroke: "none" });
    piece(g, pathFrom([[a, H - a], [b, H - b], [W - b, H - b], [W - a, H - a]]), "#A88259", { stroke: "none" });
    // Inner lid shadow falling on the scene.
    el("rect", { x: b, y: b - 6, width: W - 2 * b, height: 16, fill: "#2A1A0C", opacity: 0.22, filter: "url(#pd-soft)" }, g);
    // Outer frame with even-odd hole.
    const outer = `M0 0H${W}V${H}H0Z`;
    const inner = cutRect(a, a, W - 2 * a, H - 2 * a, { r: 0.1, amp: 0.8, step: 30, seed: 77 });
    el("path", { d: outer + inner, "fill-rule": "evenodd", fill: PALETTE.kraft }, g);
    el("path", { d: inner, fill: "none", stroke: "#6B4C2E", "stroke-width": 2, opacity: 0.6 }, g);
    return g;
  }

  /* ---------- fixed furniture: headline tag, stamp, source line ---------- */

  /**
   * headlineTag(parent, opts): the one headline per state, on a taped paper
   * strip at a fixed top-left position. Returns { set(text, animate) }.
   * opts: x, y (top-left of strip), size (font px, >= 40).
   */
  function headlineTag(parent, opts) {
    const o = Object.assign({ x: 70, y: 62, size: 50 }, opts);
    const root = group(parent, { class: "pd-headline" });
    let current = null;
    function build(label) {
      const g = group(root, { transform: `translate(${o.x} ${o.y}) rotate(-1.3)` });
      const strip = group(g);
      const words = text(g, { x: 30, y: o.size * 1.02, text: label, size: o.size, weight: 800, font: "display", fill: PALETTE.ink });
      const w = words.getComputedTextLength() + 60;
      const h = o.size * 1.5;
      piece(strip, cutRect(0, 0, w, h, { r: 3, amp: 1.6, step: 20, seed: label.length + 3 }), PALETTE.cream, { lift: 2 });
      tape(g, 8, 10, 70, 28, -38, 4);
      tape(g, w - 8, h - 8, 70, 28, -38, 5);
      g.style.transformBox = "fill-box";
      g.style.transformOrigin = "0 0";
      return g;
    }
    return {
      set(label, animate, delay) {
        const previous = current;
        if (!label) {
          current = null;
          if (previous) previous.remove();
          return;
        }
        if (previous && previous.dataset.label === label) return;
        current = build(label);
        current.dataset.label = label;
        if (!animate || Motion.reduced) {
          if (previous) previous.remove();
          return;
        }
        // Signature beat: the old strip is peeled away, the new one is pressed on.
        const fresh = current;
        fresh.style.opacity = "0";
        if (previous) {
          Motion.tween({
            dur: 220,
            delay: delay || 0,
            ease: "in",
            update(k) {
              previous.style.opacity = String(1 - k);
              previous.style.translate = `0 ${-18 * k}px`;
            },
            done() {
              previous.remove();
            },
          });
        }
        Motion.tween({
          dur: 420,
          delay: (delay || 0) + (previous ? 160 : 0),
          ease: "outBack",
          update(k) {
            fresh.style.opacity = String(clamp(k * 2, 0, 1));
            fresh.style.scale = `${0.9 + 0.1 * k} ${0.9 + 0.1 * k}`;
          },
        });
      },
    };
  }

  /**
   * stamp(parent, opts): rubber-stamp evidence label (e.g. ILLUSTRATIVE),
   * right-aligned at opts.x. opts: x, y, text, color, angle.
   */
  function stamp(parent, opts) {
    const o = Object.assign({ x: 1850, y: 74, text: "ILLUSTRATIVE", color: PALETTE.alarmInk, angle: -4, size: 28 }, opts);
    const g = group(parent, { class: "pd-stamp" });
    const inkLayer = group(g, { filter: "url(#pd-ink)" });
    const label = text(inkLayer, { x: 0, y: 0, text: o.text, size: o.size, weight: 800, font: "display", fill: o.color, spacing: 4, anchor: "middle", baseline: "central" });
    const w = label.getComputedTextLength() + 44;
    const h = o.size + 30;
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 8, fill: "none", stroke: o.color, "stroke-width": 4 }, inkLayer);
    el("rect", { x: -w / 2 + 7, y: -h / 2 + 7, width: w - 14, height: h - 14, rx: 5, fill: "none", stroke: o.color, "stroke-width": 1.8 }, inkLayer);
    g.setAttribute("transform", `translate(${o.x - w / 2} ${o.y}) rotate(${o.angle})`);
    return g;
  }

  /**
   * sourceLine(parent, opts): the honest small print on masking tape at the
   * bottom-left. Returns { g, set(visible) }. opts: x, y (text baseline), text, size (>= 20).
   */
  function sourceLine(parent, opts) {
    const o = Object.assign({ x: 74, y: 1022, size: 24 }, opts);
    const g = group(parent, { class: "pd-source" });
    const tapeLayer = group(g);
    const words = text(g, { x: o.x + 16, y: o.y, text: o.text, size: o.size, weight: 700, font: "body", fill: PALETTE.inkSoft });
    const w = words.getComputedTextLength() + 32;
    const h = o.size * 1.6;
    const rand = rng(11);
    const points = [[o.x, o.y - h * 0.72], [o.x + w, o.y - h * 0.72]];
    for (let i = 1; i < 6; i++) points.push([o.x + w + (rand() - 0.5) * 6, o.y - h * 0.72 + (h * i) / 6]);
    points.push([o.x + w, o.y + h * 0.28], [o.x, o.y + h * 0.28]);
    for (let i = 5; i > 0; i--) points.push([o.x + (rand() - 0.5) * 6, o.y - h * 0.72 + (h * i) / 6]);
    el("path", { d: pathFrom(points, true), fill: "rgba(240,228,192,0.93)", stroke: "rgba(150,120,70,0.3)", "stroke-width": 1 }, tapeLayer);
    return {
      g,
      set(visible) {
        g.style.opacity = visible ? "1" : "0";
      },
    };
  }

  /* ---------- character: Pip, a split-pin paper puppet ---------- */

  /**
   * POSES: named puppet poses. Angles are degrees; positive shoulder/elbow
   * angles swing that limb outward (away from the body) on either side.
   * head = tilt, lean = body tilt, brows -1 cross .. 0 calm .. 1 raised,
   * eyes/mouth are named shapes, watch 0/1 shows the wristwatch.
   */
  const POSES = {
    wait: { lSh: 6, lEl: -10, rSh: 6, rEl: -10, head: 0, lean: 0, brows: 0, eyes: "open", mouth: "smile", look: 0 },
    watch: { lSh: -22, lEl: -92, rSh: 8, rEl: -6, head: 9, lean: 2, brows: -0.6, eyes: "down", mouth: "flat", look: 1 },
    annoyed: { lSh: 42, lEl: -88, rSh: 42, rEl: -88, head: -5, lean: 0, brows: -1, eyes: "open", mouth: "frown", look: 0 },
    alarmed: { lSh: 150, lEl: 18, rSh: 150, rEl: 18, head: 0, lean: 0, brows: 1, eyes: "wide", mouth: "o", look: 0 },
    point: { lSh: 96, lEl: 4, rSh: 10, rEl: -8, head: -6, lean: -3, brows: 0.4, eyes: "open", mouth: "smile", look: -1 },
    relieved: { lSh: 22, lEl: 14, rSh: 22, rEl: 14, head: 6, lean: 0, brows: 0.5, eyes: "happy", mouth: "grin", look: 0 },
    // Arm out, palm up toward something on the left: "hold on", "wait here".
    hold: { lSh: 84, lEl: -4, rSh: 16, rEl: 10, head: -5, lean: -2, brows: 0.5, eyes: "open", mouth: "grin", look: -1, palm: 1 },
  };
  // Every pose names every key, so tweening between any two poses is complete.
  for (const pose of Object.values(POSES)) if (pose.palm === undefined) pose.palm = 0;

  /**
   * puppet(parent, opts): build Pip. Returns { g, render(props) } where props
   * = { x, y, s, hop, ...pose }. Origin is between the feet. ~360 px tall at s = 1.
   * opts: coat, beanie (colours).
   */
  function puppet(parent, opts) {
    const o = Object.assign({ coat: PALETTE.plum, sleeve: PALETTE.plumDark, beanie: PALETTE.beanie }, opts);
    const root = group(parent, { class: "pd-puppet" });
    const shadow = contactShadow(root, 0, 0, 70, 12, 0.3);
    const figure = group(root, { filter: "url(#pd-lift-2)" });

    const legs = group(figure);
    piece(legs, cutRect(-30, -124, 23, 116, { r: 8, seed: 31 }), PALETTE.trousers);
    piece(legs, cutRect(7, -124, 23, 116, { r: 8, seed: 32 }), PALETTE.trousers);
    piece(legs, cutEllipse(-24, -9, 25, 11, { seed: 33 }), PALETTE.shoe);
    piece(legs, cutEllipse(24, -9, 25, 11, { seed: 34 }), PALETTE.shoe);

    function arm(side) {
      const shoulder = group(figure);
      piece(shoulder, cutRect(-12, -8, 24, 72, { r: 11, seed: side === "l" ? 41 : 42 }), o.sleeve);
      const elbow = group(shoulder, { transform: "translate(0 60)" });
      piece(elbow, cutRect(-11, -8, 22, 62, { r: 10, seed: side === "l" ? 43 : 44 }), o.sleeve);
      const hand = piece(elbow, cutEllipse(0, 60, 13, 13, { seed: side === "l" ? 45 : 46 }), PALETTE.skin);
      // Open palm for "hold / wait" gestures: fingers point away from the
      // forearm's side so, with the arm held out, the palm stands upright.
      const palm = group(elbow);
      // Local -x is "up" when the arm is held out sideways, so the mitten
      // extends that way; the slits mark the fingers.
      piece(palm, cutEllipse(0, 60, 13, 13, { seed: side === "l" ? 48 : 49 }), PALETTE.skin);
      piece(palm, cutRect(-42, 46, 40, 28, { r: 12, seed: side === "l" ? 50 : 51 }), PALETTE.skin);
      for (const fy of [53.5, 60, 66.5]) el("path", { d: `M-41 ${fy}H-29`, stroke: "#C99877", "stroke-width": 2.2, "stroke-linecap": "round" }, palm);
      let watch = null;
      if (side === "l") {
        watch = group(elbow);
        el("circle", { cx: 0, cy: 42, r: 10, fill: PALETTE.cream, stroke: PALETTE.ink, "stroke-width": 2.5 }, watch);
        el("path", { d: "M0 42V35M0 42L5 44", stroke: PALETTE.ink, "stroke-width": 2, "stroke-linecap": "round" }, watch);
      }
      splitPin(elbow, 0, 0, 6);
      splitPin(shoulder, 0, 0, 7);
      return { shoulder, elbow, watch, hand, palm };
    }

    // Paper puppets wear their arms on top of the coat, pinned at the shoulder,
    // so every gesture (crossing the chest to check a watch) stays visible.
    const body = group(figure);
    piece(body, cutPoly([[-46, -232], [46, -232], [66, -112], [-66, -112]], { seed: 35, amp: 1.4 }), o.coat);
    el("path", { d: "M0 -226L0 -116", stroke: o.sleeve, "stroke-width": 3 }, body);
    for (const by of [-200, -172, -144]) el("circle", { cx: 9, cy: by, r: 4.5, fill: PALETTE.cream }, body);
    piece(body, cutRect(-46, -246, 92, 24, { r: 10, seed: 36 }), PALETTE.rose);
    piece(body, cutRect(16, -232, 20, 50, { r: 6, seed: 37 }), PALETTE.rose);
    el("path", { d: "M17 -196H35M17 -206H35", stroke: PALETTE.cream, "stroke-width": 3 }, body);
    const left = arm("l");
    const right = arm("r");

    const head = group(figure);
    piece(head, cutEllipse(0, -292, 54, 56, { seed: 38 }), PALETTE.skin);
    el("circle", { cx: -33, cy: -262, r: 9, fill: PALETTE.rose, opacity: 0.65 }, head);
    el("circle", { cx: 33, cy: -262, r: 9, fill: PALETTE.rose, opacity: 0.65 }, head);
    const face = group(head);
    piece(head, cutPoly([[-58, -302], [-50, -334], [-24, -352], [0, -356], [24, -352], [50, -334], [58, -302]], { seed: 39 }), o.beanie);
    piece(head, cutRect(-61, -314, 122, 20, { r: 8, seed: 40 }), "#3F6449");
    piece(head, cutEllipse(0, -360, 14, 14, { seed: 47 }), PALETTE.cream);

    function drawFace(p) {
      while (face.firstChild) face.firstChild.remove();
      const eyeY = -276 + (p.eyes === "down" ? 4 : 0);
      const lookX = (p.look || 0) * 3;
      for (const side of [-1, 1]) {
        const ex = side * 19 + lookX;
        if (p.eyes === "happy") {
          el("path", { d: `M${ex - 8} ${eyeY + 2}Q${ex} ${eyeY - 8} ${ex + 8} ${eyeY + 2}`, fill: "none", stroke: PALETTE.ink, "stroke-width": 4, "stroke-linecap": "round" }, face);
        } else if (p.eyes === "wide") {
          el("circle", { cx: ex, cy: eyeY, r: 10, fill: PALETTE.cream, stroke: PALETTE.ink, "stroke-width": 2 }, face);
          el("circle", { cx: ex, cy: eyeY, r: 5, fill: PALETTE.ink }, face);
        } else {
          el("ellipse", { cx: ex, cy: eyeY, rx: 5.5, ry: p.blink ? 1.2 : 6.5, fill: PALETTE.ink }, face);
          if (!p.blink) el("circle", { cx: ex + 1.8, cy: eyeY - 2.4, r: 1.8, fill: PALETTE.cream }, face);
        }
        // Brows: inner end drops when cross (-1), whole brow lifts when raised (+1).
        const inner = side * 9;
        const outer = side * 28;
        const lift = (p.brows || 0) * 6;
        const innerY = eyeY - 15 - lift + Math.min(0, p.brows) * -8;
        const outerY = eyeY - 15 - lift + Math.max(0, p.brows) * 3;
        const midX = (inner + outer) / 2;
        const midY = Math.min(innerY, outerY) - 4 - Math.max(0, p.brows) * 2;
        el("path", { d: `M${inner} ${innerY.toFixed(1)}Q${midX} ${midY.toFixed(1)} ${outer} ${outerY.toFixed(1)}`, fill: "none", stroke: PALETTE.ink, "stroke-width": 4.2, "stroke-linecap": "round" }, face);
      }
      const my = -252;
      const mouths = {
        smile: `M-12 ${my}Q0 ${my + 10} 12 ${my}`,
        flat: `M-10 ${my + 3}L10 ${my + 3}`,
        frown: `M-12 ${my + 6}Q0 ${my - 4} 12 ${my + 6}`,
      };
      if (p.mouth === "o") {
        el("ellipse", { cx: 0, cy: my + 3, rx: 8, ry: 10, fill: PALETTE.ink }, face);
      } else if (p.mouth === "grin") {
        el("path", { d: `M-16 ${my - 2}Q0 ${my + 18} 16 ${my - 2}Z`, fill: PALETTE.ink, "stroke-linejoin": "round" }, face);
        el("path", { d: `M-8 ${my + 6}Q0 ${my + 11} 8 ${my + 6}`, fill: "none", stroke: PALETTE.rose, "stroke-width": 3 }, face);
      } else {
        el("path", { d: mouths[p.mouth] || mouths.smile, fill: "none", stroke: PALETTE.ink, "stroke-width": 4.2, "stroke-linecap": "round" }, face);
      }
    }

    let lastFaceKey = "";
    let lastProps = null;
    return {
      g: root,
      /** blink(): close the eyes for ~130 ms (idle life; caller checks reduced motion). */
      blink() {
        if (!lastProps || lastProps.eyes === "happy" || lastProps.eyes === "wide") return;
        const open = lastProps;
        this.render(Object.assign({}, open, { blink: 1 }));
        setTimeout(() => this.render(open), 130);
      },
      render(p) {
        lastProps = p;
        // Puppets on sticks hop when they react; hop runs 0..1 per transition.
        const hopFrac = (p.hop || 0) % 1;
        const hop = Math.abs(Math.sin(hopFrac * Math.PI * 2)) * 16 * (1 - hopFrac);
        root.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.s.toFixed(3)})`);
        figure.setAttribute("transform", `translate(0 ${(-hop).toFixed(1)}) rotate(${p.lean.toFixed(2)} 0 -120)`);
        shadow.setAttribute("rx", (70 - hop).toFixed(1));
        left.shoulder.setAttribute("transform", `translate(-44 -222) rotate(${p.lSh.toFixed(2)})`);
        left.elbow.setAttribute("transform", `translate(0 60) rotate(${p.lEl.toFixed(2)})`);
        right.shoulder.setAttribute("transform", `translate(44 -222) rotate(${(-p.rSh).toFixed(2)})`);
        right.elbow.setAttribute("transform", `translate(0 60) rotate(${(-p.rEl).toFixed(2)})`);
        left.watch.style.opacity = p.lEl < -40 && p.lSh < 0 ? "1" : "0";
        const palmUp = (p.palm || 0) > 0.5;
        left.palm.style.opacity = palmUp ? "1" : "0";
        left.hand.style.opacity = palmUp ? "0" : "1";
        right.palm.style.opacity = "0";
        head.setAttribute("transform", `rotate(${p.head.toFixed(2)} 0 -240)`);
        const faceKey = [p.eyes, p.mouth, p.brows.toFixed(2), p.look, p.blink].join("|");
        if (faceKey !== lastFaceKey) {
          drawFace(p);
          lastFaceKey = faceKey;
        }
      },
    };
  }

  /* ---------- vehicles and people ---------- */

  /**
   * bus(parent, opts): a flat paper bus seen side-on, origin at the middle of
   * its wheels' ground line, facing +x. Returns { g, render({x, y, s, face, door, op}) }.
   * face in [-1, 1] mirrors it (0 = edge-on, mid-turn). door 0..1 opens the door.
   * opts: color, letter, seed.
   */
  function bus(parent, opts) {
    const o = Object.assign({ color: PALETTE.busA, letter: "A", seed: 50 }, opts);
    const root = group(parent, { class: "pd-bus" });
    const shadow = contactShadow(root, 0, 0, 96, 10, 0.3);
    const body = group(root);
    const art = group(body, { filter: "url(#pd-lift-1)" });
    piece(art, cutRect(-92, -96, 184, 80, { r: 16, seed: o.seed }), o.color);
    piece(art, cutRect(-82, -104, 160, 14, { r: 6, seed: o.seed + 1 }), "rgba(255,248,234,0.55)");
    for (let i = 0; i < 4; i++) {
      piece(art, cutRect(-78 + i * 34, -86, 26, 24, { r: 4, seed: o.seed + 2 + i, amp: 0.7 }), PALETTE.window);
    }
    piece(art, cutRect(70, -86, 17, 34, { r: 5, seed: o.seed + 8, amp: 0.7 }), PALETTE.window);
    const doorway = group(art);
    el("rect", { x: 44, y: -60, width: 22, height: 44, rx: 3, fill: "#3A2E28" }, doorway);
    const door = piece(art, cutRect(44, -60, 22, 44, { r: 3, seed: o.seed + 9, amp: 0.6 }), PALETTE.window);
    piece(art, cutRect(-92, -26, 184, 8, { r: 3, seed: o.seed + 10 }), "rgba(43,38,34,0.35)", { stroke: "none" });
    el("circle", { cx: 88, cy: -34, r: 5, fill: PALETTE.cream }, art);
    for (const wx of [-56, 56]) {
      piece(art, cutEllipse(wx, -14, 17, 17, { seed: o.seed + wx }), "#352C27");
      splitPin(art, wx, -14, 6);
    }
    const letterGroup = group(art);
    el("circle", { cx: -28, cy: -42, r: 24, fill: PALETTE.cream, stroke: PALETTE.ink, "stroke-width": 2.5 }, letterGroup);
    text(letterGroup, { x: -28, y: -41, text: o.letter, size: 40, weight: 900, font: "display", anchor: "middle", baseline: "central" });
    return {
      g: root,
      render(p) {
        const face = Math.abs(p.face) < 0.02 ? 0.02 * Math.sign(p.face || 1) : p.face;
        root.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.s.toFixed(3)})`);
        body.setAttribute("transform", `scale(${face.toFixed(3)} 1)`);
        // Keep the letter readable whichever way the bus faces.
        letterGroup.setAttribute("transform", face < 0 ? "translate(-56 0) scale(-1 1)" : "");
        door.setAttribute("transform", `translate(44 0) scale(${(1 - (p.door || 0) * 0.85).toFixed(3)} 1) translate(-44 0)`);
        root.style.opacity = String(p.op === undefined ? 1 : p.op);
      },
    };
  }

  /** rider(parent, x, y, s, seed): a small paper passenger, origin at feet. */
  function rider(parent, x, y, s, seed) {
    const rand = rng(seed);
    const coats = ["#D9774F", "#5E8F9B", "#B5606E", "#7C8F4E", "#8A6BA8", "#D2A03C", "#4F6C9A", "#A0704D"];
    const skins = ["#F1C6A0", "#D9A27A", "#B07850", "#8A5A3C"];
    const g = group(parent, { transform: `translate(${x} ${y}) scale(${s})` });
    const inner = group(g, { filter: "url(#pd-lift-1)" });
    piece(inner, cutRect(-11, -24, 9, 24, { r: 3, seed }), "#3C3530");
    piece(inner, cutRect(2, -24, 9, 24, { r: 3, seed: seed + 1 }), "#3C3530");
    piece(inner, cutRect(-15, -60, 30, 40, { r: 9, seed: seed + 2 }), coats[Math.floor(rand() * coats.length)]);
    piece(inner, cutEllipse(0, -72, 13, 14, { seed: seed + 3, n: 14 }), skins[Math.floor(rand() * skins.length)]);
    if (rand() < 0.55) {
      piece(inner, cutRect(-14, -90, 28, 10, { r: 5, seed: seed + 4 }), coats[Math.floor(rand() * coats.length)]);
    }
    return g;
  }

  /** stopFlag(parent, x, y, number): a numbered bus-stop flag on a pin, origin at its foot. */
  function stopFlag(parent, x, y, number) {
    const g = group(parent, { transform: `translate(${x} ${y})` });
    contactShadow(g, 0, 0, 14, 4, 0.3);
    el("path", { d: "M0 0V-62", stroke: PALETTE.kraftDeep, "stroke-width": 5, "stroke-linecap": "round" }, g);
    const head = group(g, { filter: "url(#pd-lift-1)" });
    piece(head, cutEllipse(0, -84, 24, 24, { seed: 60 + number, n: 18 }), PALETTE.cream, { stroke: PALETTE.inkSoft, strokeWidth: 2.5 });
    text(head, { x: 0, y: -83, text: String(number), size: 30, weight: 800, font: "display", anchor: "middle", baseline: "central" });
    return g;
  }

  /* ---------- mechanism scaffolds ---------- */

  /**
   * loopRoute(parent, opts): a slate paper road ring laid flat on the ground,
   * seen at an angle. Returns { g, point(t), stopPoint(i) }.
   * point(t) maps time-along-loop t (minutes, 0..period) to { x, y, s, face }.
   * opts: cx, cy, rx, ry (road centreline), width, period, theta0 (deg where t = 0),
   * stops (count), seed.
   */
  function loopRoute(parent, opts) {
    const o = Object.assign({ cx: 880, cy: 670, rx: 600, ry: 200, width: 70, period: 20, theta0: 180, stops: 8, seed: 70 }, opts);
    const g = group(parent, { class: "pd-route" });
    const half = o.width / 2;
    const squash = o.ry / o.rx;
    const outer = cutEllipse(o.cx, o.cy, o.rx + half, o.ry + half * squash * 1.6, { seed: o.seed, amp: 1.2 });
    const inner = cutEllipse(o.cx, o.cy, o.rx - half, o.ry - half * squash * 1.6, { seed: o.seed + 1, amp: 1.2 });
    el("path", { d: outer + inner, "fill-rule": "evenodd", fill: PALETTE.road, stroke: "rgba(40,30,20,0.25)", "stroke-width": 1.5, filter: "url(#pd-lift-1)" }, g);
    el("ellipse", { cx: o.cx, cy: o.cy, rx: o.rx, ry: o.ry, fill: "none", stroke: PALETTE.roadLine, "stroke-width": 4, "stroke-dasharray": "22 20", opacity: 0.8 }, g);

    function angleAt(t) {
      return o.theta0 - (360 * t) / o.period;
    }
    function point(t) {
      const theta = rad(angleAt(t));
      const depth = (1 + Math.sin(theta)) / 2;
      // Side-on sprites flip as they round each end; the 20 degree offset puts
      // the flip on the far side of each bend so buses at the ends face the
      // way they are travelling.
      const face = clamp(Math.sin(theta - rad(20)) * 4, -1, 1);
      return { x: o.cx + o.rx * Math.cos(theta), y: o.cy + o.ry * Math.sin(theta), s: 0.8 + 0.2 * depth, face };
    }
    function stopPoint(i) {
      const t = (i * o.period) / o.stops;
      const theta = rad(angleAt(t));
      return {
        x: o.cx + (o.rx + half + 18) * Math.cos(theta),
        y: o.cy + (o.ry + half * squash * 1.6 + 10) * Math.sin(theta),
        t,
      };
    }
    return { g, point, stopPoint, opts: o };
  }

  /**
   * ribbonGauge(parent, opts): a kraft ribbon of `total` notches split into
   * coloured paper segments by sliding brass pins, hung on strings, with a
   * luggage tag under each segment. Returns { g, render({ values, fly }) }.
   * fly 0 = hoisted out of view above the stage, 1 = hanging in place.
   * opts: x, y (strip top-left), w, h, total, unit, header, hangFrom (y of the
   * box lid), segments [{ letter, caption, color }].
   */
  function ribbonGauge(parent, opts) {
    const o = Object.assign({ x: 840, y: 170, w: 760, h: 54, total: 20, unit: "min", header: "GAP BETWEEN BUSES", hangFrom: 46, segments: [] }, opts);
    const root = group(parent, { class: "pd-gauge" });
    const swing = group(root);
    // Hung like a shop sign: a V of string to one hook, so the strings never
    // cross the stamp or headline corners.
    const hookX = o.x + o.w / 2;
    string(swing, hookX, o.hangFrom - 400, hookX, o.hangFrom);
    string(swing, o.x + 12, o.y + 6, hookX, o.hangFrom);
    string(swing, o.x + o.w - 12, o.y + 6, hookX, o.hangFrom);
    const backing = group(swing, { filter: "url(#pd-lift-2)" });
    piece(backing, cutRect(o.x - 8, o.y - 8, o.w + 16, o.h + 16, { r: 4, seed: 80 }), PALETTE.kraftLight);
    for (let i = 0; i <= o.total; i++) {
      const tx = o.x + (o.w * i) / o.total;
      el("path", { d: `M${tx} ${o.y - 8}V${o.y + (i % 5 === 0 ? 8 : 2)}`, stroke: PALETTE.kraftDeep, "stroke-width": 2.5 }, swing);
    }
    const segmentLayer = group(swing, { filter: "url(#pd-lift-1)" });
    const pinLayer = group(swing);
    const tagLayer = group(swing);
    const header = card(swing, { cx: o.x + o.w / 2, cy: o.y - 34, lines: [{ text: o.header, size: 28, weight: 700, font: "body", spacing: 2 }], pad: 28, fill: PALETTE.cream, seed: 81, lift: 1 });
    splitPin(swing, o.x + o.w / 2 - header.w / 2 + 9, o.y - 34, 5);
    splitPin(swing, o.x + o.w / 2 + header.w / 2 - 9, o.y - 34, 5);

    const segs = o.segments.map((seg, i) => {
      const shape = piece(segmentLayer, "", seg.color);
      const disc = group(segmentLayer);
      el("circle", { r: 19, fill: PALETTE.cream, stroke: PALETTE.ink, "stroke-width": 2.5 }, disc);
      text(disc, { x: 0, y: 1, text: seg.letter, size: 28, weight: 900, font: "display", anchor: "middle", baseline: "central" });
      const tagGroup = group(tagLayer);
      const thread = el("path", { fill: "none", stroke: PALETTE.string, "stroke-width": 2.2 }, tagGroup);
      const tagHolder = group(tagGroup);
      const tag = card(tagHolder, {
        cx: 0,
        cy: 0,
        lines: [
          { text: seg.caption, size: 28, weight: 700, font: "body", fill: PALETTE.inkSoft },
          { text: "00 " + o.unit, size: 46, weight: 900, font: "display" },
        ],
        pad: 14,
        gap: 4,
        seed: 90 + i,
        lift: 2,
        minWidth: 190,
      });
      const valueNode = tag.g.querySelectorAll("text")[1];
      return { shape, disc, thread, tagHolder, tag, valueNode, seed: 85 + i };
    });

    return {
      g: root,
      render(p) {
        const lifted = (1 - p.fly) * -420;
        swing.setAttribute("transform", `translate(0 ${lifted.toFixed(1)}) rotate(${(p.sway || 0).toFixed(2)} ${o.x + o.w / 2} ${o.hangFrom})`);
        root.style.opacity = p.fly <= 0.001 ? "0" : "1";
        let cursor = o.x;
        const centres = [];
        p.values.forEach((value, i) => {
          const w = (o.w * value) / o.total;
          const seg = segs[i];
          seg.shape.setAttribute("d", cutRect(cursor, o.y, Math.max(2, w), o.h, { r: 3, seed: seg.seed, amp: 1 }));
          seg.disc.setAttribute("transform", `translate(${(cursor + w / 2).toFixed(1)} ${o.y + o.h / 2})`);
          seg.disc.style.opacity = w > 64 ? "1" : "0";
          centres.push(cursor + w / 2);
          cursor += w;
        });
        while (pinLayer.firstChild) pinLayer.firstChild.remove();
        let edge = o.x;
        for (let i = 0; i < p.values.length - 1; i++) {
          edge += (o.w * p.values[i]) / o.total;
          splitPin(pinLayer, edge, o.y + o.h / 2, 9);
        }
        // Tags hang under their segment but are nudged apart so a thin
        // segment's tag never collides with its neighbour's.
        const tagCentres = centres.slice();
        for (let i = 1; i < tagCentres.length; i++) {
          const minGap = (segs[i - 1].tag.w + segs[i].tag.w) / 2 + 16;
          if (tagCentres[i] - tagCentres[i - 1] < minGap) tagCentres[i] = tagCentres[i - 1] + minGap;
        }
        segs.forEach((seg, i) => {
          const tagY = o.y + o.h + 30 + seg.tag.h / 2;
          seg.tagHolder.setAttribute("transform", `translate(${tagCentres[i].toFixed(1)} ${tagY.toFixed(1)})`);
          seg.thread.setAttribute("d", `M${centres[i].toFixed(1)} ${o.y + o.h - 4}L${tagCentres[i].toFixed(1)} ${(tagY - seg.tag.h / 2 + 4).toFixed(1)}`);
          seg.valueNode.textContent = Math.round(p.values[i]) + " " + o.unit;
        });
      },
    };
  }

  /**
   * feedbackWheel(parent, opts): a cardboard disc lying flat on the ground with
   * labelled pop-up tags around its rim, joined clockwise by curved paper
   * arrows. Returns { g, render(p) } where p 0..1 builds it piece by piece.
   * opts: cx, cy, rx, ry, labels (clockwise from the top), arrowColor.
   */
  function feedbackWheel(parent, opts) {
    const o = Object.assign({ cx: 820, cy: 630, rx: 300, ry: 125, labels: [], arrowColor: PALETTE.alarm }, opts);
    const root = group(parent, { class: "pd-wheel" });
    const disc = group(root);
    // Visible card thickness: a darker copy of the disc just below it.
    piece(disc, cutEllipse(o.cx, o.cy + 12, o.rx, o.ry, { seed: 100, amp: 1.5 }), PALETTE.kraftDark, { lift: 2 });
    piece(disc, cutEllipse(o.cx, o.cy, o.rx, o.ry, { seed: 101, amp: 1.5 }), PALETTE.kraftLight);
    piece(disc, cutEllipse(o.cx, o.cy, o.rx * 0.78, o.ry * 0.78, { seed: 102, amp: 1.2 }), PALETTE.kraft);
    const count = o.labels.length;
    const step = 360 / count;
    const arrows = [];
    for (let i = 0; i < count; i++) {
      const a0 = -90 + i * step + step * 0.2;
      const a1 = -90 + (i + 1) * step - step * 0.2;
      const arrow = piece(disc, arcArrowPath(o.cx, o.cy, o.rx * 0.82, o.ry * 0.82, a0, a1, 20, 50), o.arrowColor, { lift: 1 });
      arrows.push(arrow);
    }
    splitPin(disc, o.cx, o.cy, 16);
    const tags = o.labels.map((label, i) => {
      const a = rad(-90 + i * step);
      const holder = group(root);
      const tx = o.cx + o.rx * Math.cos(a);
      const ty = o.cy + o.ry * Math.sin(a);
      const c = card(holder, { cx: 0, cy: 0, lines: [{ text: label, size: 32, weight: 800, font: "display" }], pad: 14, seed: 110 + i, lift: 2 });
      return { holder, tx, ty, h: c.h };
    });
    return {
      g: root,
      render(p) {
        root.style.opacity = p <= 0.001 ? "0" : "1";
        const discK = stage(p, 0, 0.25);
        disc.setAttribute("transform", `translate(${o.cx} ${o.cy}) scale(${(0.6 + 0.4 * discK).toFixed(3)} ${discK.toFixed(3)}) translate(${-o.cx} ${-o.cy})`);
        tags.forEach((tag, i) => {
          const k = ease.outBack(stage(p, 0.2 + i * 0.18, 0.38 + i * 0.18));
          // Pop-up: the tag folds up from the disc around its bottom edge.
          tag.holder.setAttribute("transform", `translate(${tag.tx} ${tag.ty + tag.h / 2}) scale(1 ${Math.max(0.001, k).toFixed(3)}) translate(0 ${-tag.h / 2})`);
          tag.holder.style.opacity = k > 0.01 ? "1" : "0";
          arrows[i].style.opacity = String(stage(p, 0.3 + i * 0.18, 0.42 + i * 0.18));
        });
      },
    };
  }

  /**
   * cutNumber(parent, opts): a big cut-card numeral (or word) mounted on a
   * cream backing card, standing on a kraft stake. Returns the group.
   * opts: x, y (baseline), text, size, fill, anchor, stake (px below baseline).
   */
  function cutNumber(parent, opts) {
    const o = Object.assign({ x: 0, y: 0, text: "0", size: 200, fill: PALETTE.ink, anchor: "start", stake: 0, backing: PALETTE.cream }, opts);
    const g = group(parent);
    const textGroup = group(g, { filter: "url(#pd-lift-3)" });
    const node = text(textGroup, {
      x: o.x,
      y: o.y,
      text: o.text,
      size: o.size,
      weight: 900,
      font: "display",
      fill: o.fill,
      anchor: o.anchor,
      stroke: o.backing,
      strokeWidth: Math.round(o.size * 0.11),
    });
    const box = node.getBBox();
    if (o.stake) {
      const stakes = group(g);
      g.insertBefore(stakes, textGroup);
      for (const sx of [box.x + box.width * 0.28, box.x + box.width * 0.72]) {
        piece(stakes, cutRect(sx - 7, o.y - 24, 14, 24 + o.stake, { r: 2, seed: Math.round(sx) }), PALETTE.kraftDark, { lift: 1 });
      }
    }
    return { g, box };
  }

  /* ---------- motion ---------- */

  const ease = {
    linear: (k) => k,
    inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    out: (k) => 1 - Math.pow(1 - k, 3),
    in: (k) => k * k * k,
    outBack: (k) => {
      const c1 = 1.5;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    },
    // Damped swing for things hung on strings: overshoots, settles.
    swing: (k) => 1 - Math.cos(k * Math.PI * 2.5) * Math.exp(-k * 5.5) * (1 - k),
  };

  /**
   * Motion: a tiny rAF tween runner. Motion.tween({dur, delay, ease, update(k), done})
   * returns a handle with cancel(). Motion.reduced turns every tween into a jump.
   */
  const Motion = {
    reduced: false,
    active: new Set(),
    tween(spec) {
      const t = {
        start: performance.now() + (spec.delay || 0),
        dur: spec.dur || 600,
        easeFn: typeof spec.ease === "function" ? spec.ease : ease[spec.ease || "inOut"],
        update: spec.update,
        done: spec.done,
        cancelled: false,
        cancel() {
          this.cancelled = true;
          Motion.active.delete(this);
        },
      };
      if (Motion.reduced) {
        t.update(1, 1);
        if (t.done) t.done();
        return t;
      }
      Motion.active.add(t);
      Motion.kick();
      return t;
    },
    kick() {
      if (Motion.running) return;
      Motion.running = true;
      const frame = (now) => {
        for (const t of Array.from(Motion.active)) {
          if (t.cancelled || now < t.start) continue;
          const raw = clamp((now - t.start) / t.dur, 0, 1);
          t.update(t.easeFn(raw), raw);
          if (raw >= 1) {
            Motion.active.delete(t);
            if (t.done) t.done();
          }
        }
        if (Motion.active.size) requestAnimationFrame(frame);
        else Motion.running = false;
      };
      requestAnimationFrame(frame);
    },
  };

  /** mixProps(a, b, k): interpolate numbers; non-numbers switch at k = 0.5. */
  function mixProps(a, b, k) {
    const out = {};
    for (const key of Object.keys(b)) {
      const from = a[key];
      const to = b[key];
      if (typeof to === "number" && typeof from === "number") out[key] = lerp(from, to, k);
      else if (Array.isArray(to) && Array.isArray(from)) out[key] = to.map((v, i) => lerp(from[i] ?? v, v, k));
      else out[key] = k < 0.5 && from !== undefined ? from : to;
    }
    return out;
  }

  /**
   * director(objects, states): drive persistent objects through numbered
   * states. objects = { name: { render(props) } }; states[n][name] = target
   * props plus optional _dur, _delay, _ease (string, or { key: ease, default }).
   * Returns { goTo(n, instant), index }.
   */
  function director(objects, states) {
    const current = {};
    const handles = {};
    let index = -1;
    function goTo(n, instant) {
      const state = states[n];
      for (const name of Object.keys(objects)) {
        const target = state[name];
        if (!target) continue;
        const props = {};
        for (const key of Object.keys(target)) if (key[0] !== "_") props[key] = target[key];
        if (handles[name]) handles[name].cancel();
        const from = current[name] || props;
        if (instant || Motion.reduced || !current[name]) {
          current[name] = Object.assign({}, from, props);
          objects[name].render(current[name]);
          continue;
        }
        const easeSpec = target._ease || "inOut";
        const start = Object.assign({}, from);
        const end = Object.assign({}, from, props);
        handles[name] = Motion.tween({
          dur: target._dur || 800,
          delay: target._delay || 0,
          ease: "linear",
          update(k) {
            const mixed = {};
            for (const key of Object.keys(end)) {
              const name2 = typeof easeSpec === "string" ? easeSpec : easeSpec[key] || easeSpec.default || "inOut";
              const one = {};
              one[key] = end[key];
              const from1 = {};
              from1[key] = start[key];
              Object.assign(mixed, mixProps(from1, one, ease[name2](k)));
            }
            current[name] = mixed;
            objects[name].render(mixed);
          },
        });
      }
      index = n;
    }
    return {
      goTo,
      get index() {
        return index;
      },
    };
  }

  /** popTransform(x, baseY, k): pop-up-book transform string folding a piece up from its base line. */
  function popTransform(x, baseY, k) {
    const sy = Math.max(0.001, k);
    return `translate(${x} ${baseY}) scale(${(0.7 + 0.3 * Math.min(1, k)).toFixed(3)} ${sy.toFixed(3)}) translate(${-x} ${-baseY})`;
  }

  window.Paper = {
    PALETTE,
    FONTS,
    POSES,
    el,
    group,
    rng,
    clamp,
    lerp,
    stage,
    rad,
    jitterPoints,
    pathFrom,
    cutPoly,
    cutRect,
    cutEllipse,
    hillPath,
    ribbonPath,
    bezierPoints,
    installDefs,
    paperTextures,
    grainOverlay,
    piece,
    text,
    string,
    tape,
    splitPin,
    contactShadow,
    card,
    arrowPiece,
    arcArrowPath,
    sun,
    cloud,
    house,
    tree,
    flower,
    hedge,
    cardboardEdge,
    pond,
    shadowBox,
    headlineTag,
    stamp,
    sourceLine,
    puppet,
    bus,
    rider,
    stopFlag,
    loopRoute,
    ribbonGauge,
    feedbackWheel,
    cutNumber,
    ease,
    Motion,
    mixProps,
    director,
    popTransform,
  };
})();
