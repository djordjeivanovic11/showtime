/* Blueprint Atlas style kit.
 *
 * A cyanotype drawing-sheet world: tilted planometric plans, extruded boxes,
 * grid bubbles, leaders, dimension lines, caliper gauges, detail insets,
 * revision clouds and a parametric scale-figure character with poses.
 * Plain browser JS, no modules. Everything hangs off window.BP.
 *
 * Conventions
 *   - The stage is one 1920x1080 SVG. Screen units are SVG px.
 *   - World units live on a ground plane (x right, y toward viewer, z up) and
 *     are drawn with BP.project(cam, x, y, z); cam = {x, y, s} is a 2D camera.
 *   - Draw functions take a parent <g>, clear nothing, and append children.
 *     Persistent objects keep one <g id> and are redrawn in place each frame
 *     with BP.clear(g), so ids survive across states.
 */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const BP = {};

  /* ---------- tokens ---------- */

  /** Palette tokens with semantic meanings (see DESIGN.md). */
  BP.T = {
    ground: "#0f3b6e", // sheet
    groundDeep: "#0a2b54", // vignette edge, knockouts on dark areas
    groundLift: "#16477d", // panels, raised surfaces
    faceSide: "#174a82", // extruded side faces
    faceTop: "#22609f", // extruded top faces
    ink: "#eef5ff", // primary linework and text
    inkSoft: "#a3c6ea", // secondary linework, small print (5.9:1 on ground)
    inkFaint: "rgba(214,232,255,0.30)", // context linework (city)
    data: "#ffd166", // measured values, the quantity being tracked
    alarm: "#ff8f80", // red-pencil corrections: things going wrong
    fix: "#8ef0c6", // revision / remedy
  };

  /** Font stacks: display (tags, labels), mono (numbers, small print). */
  BP.FONT = {
    display: "'Barlow Condensed', 'Arial Narrow', sans-serif",
    mono: "'Plate Mono', 'B612 Mono', ui-monospace, monospace",
  };

  /* ---------- svg plumbing ---------- */

  /** Create an SVG element with attributes, optionally appended to parent. */
  BP.el = function (tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    if (attrs) BP.attrs(node, attrs);
    if (parent) parent.appendChild(node);
    return node;
  };

  /** Set attributes on a node (null/undefined values are skipped). */
  BP.attrs = function (node, attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined) continue;
      if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
    return node;
  };

  /** Get an element by id under root, creating it (with attrs) if missing. */
  BP.keep = function (id, tag, parent, attrs) {
    let node = document.getElementById(id);
    if (!node) node = BP.el(tag, Object.assign({ id: id }, attrs || {}), parent);
    return node;
  };

  /** Remove all children of a group (used for per-frame redraws). */
  BP.clear = function (g) {
    while (g.firstChild) g.removeChild(g.firstChild);
    return g;
  };

  /** Points array [[x,y],...] to an SVG path d string. */
  BP.d = function (pts, closed) {
    let s = "";
    for (let i = 0; i < pts.length; i++) {
      s += (i ? "L" : "M") + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1);
    }
    return closed ? s + "Z" : s;
  };

  /** SVG text with the kit's type classes; cls e.g. "bp-label halo". */
  BP.text = function (parent, x, y, str, cls, attrs) {
    return BP.el("text", Object.assign({ x: x, y: y, class: cls || "", text: str }, attrs || {}), parent);
  };

  /* ---------- math + motion ---------- */

  /** Linear interpolation. */
  BP.lerp = (a, b, t) => a + (b - a) * t;
  /** Clamp to [lo, hi]. */
  BP.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  /** Smooth ease-in-out (cubic). */
  BP.ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  /** Ease-out (cubic) for objects that "ink in". */
  BP.easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------- projection ---------- */

  /** View constants of the tilted planometric: depth and height foreshortening. */
  BP.VIEW = { tiltY: 0.62, tiltZ: 0.86 };

  /** Project world (x, y, z) to screen [sx, sy] through cam {x, y, s}. */
  BP.project = function (cam, x, y, z) {
    return [cam.x + cam.s * x, cam.y + cam.s * (BP.VIEW.tiltY * y - BP.VIEW.tiltZ * (z || 0))];
  };

  /** A stadium loop (half-straight a, radius r) parameterised by arc length s. */
  BP.stadium = function (a, r) {
    const arc = Math.PI * r;
    const length = 4 * a + 2 * arc;
    function at(sRaw) {
      let s = ((sRaw % length) + length) % length;
      let x, y, tx, ty;
      if (s < a) {
        x = s; y = r; tx = 1; ty = 0;
      } else if (s < a + arc) {
        const th = (s - a) / r;
        x = a + r * Math.sin(th); y = r * Math.cos(th); tx = Math.cos(th); ty = -Math.sin(th);
      } else if (s < 3 * a + arc) {
        x = a - (s - a - arc); y = -r; tx = -1; ty = 0;
      } else if (s < 3 * a + 2 * arc) {
        const th = (s - 3 * a - arc) / r;
        x = -a - r * Math.sin(th); y = -r * Math.cos(th); tx = -Math.cos(th); ty = Math.sin(th);
      } else {
        x = -a + (s - 3 * a - 2 * arc); y = r; tx = 1; ty = 0;
      }
      // Outward normal of a counter-clockwise (on screen) loop.
      return { x: x, y: y, tx: tx, ty: ty, nx: -ty, ny: tx };
    }
    /** World points from s0 to s1 (s1 may exceed length), offset along normal. */
    function sample(s0, s1, offset, step) {
      const pts = [];
      const n = Math.max(2, Math.ceil(Math.abs(s1 - s0) / (step || 8)));
      for (let i = 0; i <= n; i++) {
        const p = at(BP.lerp(s0, s1, i / n));
        pts.push([p.x + p.nx * (offset || 0), p.y + p.ny * (offset || 0)]);
      }
      return pts;
    }
    return { a: a, r: r, length: length, at: at, sample: sample };
  };

  /** Project a list of world [x,y] ground points to screen. */
  BP.projectAll = function (cam, pts, z) {
    return pts.map((p) => BP.project(cam, p[0], p[1], z || 0));
  };

  /* ---------- sheet: ground, grid, frame ---------- */

  /** Build defs (grid, hatch, paper noise) and the sheet background. */
  BP.buildSheet = function (svg) {
    const T = BP.T;
    const defs = BP.el("defs", null, svg);
    defs.innerHTML = `
      <radialGradient id="bp-exposure" cx="46%" cy="44%" r="75%">
        <stop offset="0" stop-color="#174a83"/>
        <stop offset="0.62" stop-color="${T.ground}"/>
        <stop offset="1" stop-color="${T.groundDeep}"/>
      </radialGradient>
      <pattern id="bp-grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" stroke="rgba(214,232,255,0.055)" stroke-width="1"/>
      </pattern>
      <pattern id="bp-grid-major" width="120" height="120" patternUnits="userSpaceOnUse">
        <path d="M120 0H0V120" fill="none" stroke="rgba(214,232,255,0.10)" stroke-width="1"/>
      </pattern>
      <pattern id="bp-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="9" stroke="${T.ink}" stroke-width="1.4" opacity="0.55"/>
      </pattern>
      <pattern id="bp-hatch-soft" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="10" stroke="${T.inkSoft}" stroke-width="1" opacity="0.45"/>
      </pattern>
      <pattern id="bp-hatch-alarm" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <line x1="0" y1="0" x2="0" y2="10" stroke="${T.alarm}" stroke-width="2" opacity="0.8"/>
      </pattern>
      <filter id="bp-paper" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.92  0 0 0 0 1  0 0 0 0.09 0"/>
      </filter>
      <filter id="bp-blotch" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.0025" numOctaves="3" seed="3"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.03  0 0 0 0 0.12  0 0 0 0 0.26  0 0 0 0.55 -0.12"/>
      </filter>`;
    BP.el("rect", { width: 1920, height: 1080, fill: "url(#bp-exposure)" }, svg);
    BP.el("rect", { width: 1920, height: 1080, filter: "url(#bp-blotch)" }, svg);
    BP.el("rect", { width: 1920, height: 1080, fill: "url(#bp-grid)" }, svg);
    BP.el("rect", { width: 1920, height: 1080, fill: "url(#bp-grid-major)" }, svg);
    BP.el("rect", { width: 1920, height: 1080, filter: "url(#bp-paper)", opacity: 0.9 }, svg);
    return defs;
  };

  /** Double plate frame with zone ticks, drawn on top of the scene. */
  BP.plateFrame = function (parent) {
    const g = BP.el("g", { class: "bp-frame" }, parent);
    BP.el("rect", { x: 14, y: 14, width: 1892, height: 1052, fill: "none", stroke: BP.T.inkSoft, "stroke-width": 1.2 }, g);
    BP.el("rect", { x: 24, y: 24, width: 1872, height: 1032, fill: "none", stroke: BP.T.ink, "stroke-width": 2.4 }, g);
    for (let i = 1; i < 8; i++) {
      const x = 24 + (1872 / 8) * i;
      BP.el("line", { x1: x, y1: 14, x2: x, y2: 24, stroke: BP.T.inkSoft, "stroke-width": 1.2 }, g);
      BP.el("line", { x1: x, y1: 1056, x2: x, y2: 1066, stroke: BP.T.inkSoft, "stroke-width": 1.2 }, g);
    }
    for (let i = 1; i < 4; i++) {
      const y = 24 + (1032 / 4) * i;
      BP.el("line", { x1: 14, y1: y, x2: 24, y2: y, stroke: BP.T.inkSoft, "stroke-width": 1.2 }, g);
      BP.el("line", { x1: 1896, y1: y, x2: 1906, y2: y, stroke: BP.T.inkSoft, "stroke-width": 1.2 }, g);
    }
    // Registration crosses in the corners, like a reproduction plate.
    [[44, 44], [1876, 44], [44, 1036], [1876, 1036]].forEach((p) => {
      BP.el("path", { d: `M${p[0] - 8} ${p[1]}H${p[0] + 8}M${p[0]} ${p[1] - 8}V${p[1] + 8}`, stroke: BP.T.inkSoft, "stroke-width": 1.2 }, g);
    });
    return g;
  };

  /* ---------- honest print components ---------- */

  /** Headline tag: fixed title strip top-left with a FIG. cell. Returns {set}. */
  BP.tag = function (parent) {
    const g = BP.el("g", { id: "tag", transform: "translate(56 50)" }, parent);
    const box = BP.el("rect", { x: 0, y: 0, height: 78, fill: BP.T.groundDeep, stroke: BP.T.ink, "stroke-width": 2.4 }, g);
    const cell = BP.el("rect", { x: 0, y: 0, width: 92, height: 78, fill: "none", stroke: BP.T.ink, "stroke-width": 2.4 }, g);
    const fig = BP.text(g, 46, 32, "FIG.", "bp-small", { "text-anchor": "middle", fill: BP.T.inkSoft });
    const num = BP.text(g, 46, 64, "1", "bp-num", { "text-anchor": "middle", "font-size": 30, fill: BP.T.ink });
    const txt = BP.text(g, 116, 55, "", "bp-tag");
    const api = {
      g: g,
      /** Set text and figure number; returns the strip width in px. */
      measure(text) {
        txt.textContent = text;
        return 116 + txt.getComputedTextLength() + 28;
      },
      set(text, figNo, width, textOpacity) {
        txt.textContent = text;
        num.textContent = String(figNo);
        box.setAttribute("width", width);
        txt.setAttribute("opacity", textOpacity === undefined ? 1 : textOpacity);
      },
    };
    void cell; void fig;
    return api;
  };

  /** Approval-style stamp top-right (e.g. ILLUSTRATIVE, SCHEMATIC, OUR DATA). */
  BP.stamp = function (parent, label, sub) {
    const g = BP.el("g", { id: "stamp", transform: "translate(1864 50)" }, parent);
    const t = BP.text(g, -24, 44, label, "bp-stamp", { "text-anchor": "end" });
    const w = Math.max(240, t.getComputedTextLength() + 48);
    BP.el("rect", { x: -w, y: 0, width: w, height: 66, fill: BP.T.groundDeep, stroke: BP.T.ink, "stroke-width": 2.4 }, g, null);
    BP.el("rect", { x: -w + 6, y: 6, width: w - 12, height: 54, fill: "none", stroke: BP.T.ink, "stroke-width": 1 }, g);
    g.appendChild(t);
    if (sub) BP.text(g, -w / 2, 92, sub, "bp-small", { "text-anchor": "middle", fill: BP.T.inkSoft });
    return g;
  };

  /** Source line bottom-left in small mono. */
  BP.sourceLine = function (parent, text) {
    return BP.text(parent, 56, 1030, text, "bp-small", { id: "source", fill: BP.T.inkSoft });
  };

  /** Title block bottom-right: rows of [label, value] cells. Returns group. */
  BP.titleBlock = function (parent, rows, width) {
    const w = width || 470;
    const rowH = 34;
    const h = rows.length * rowH;
    const g = BP.el("g", { id: "titleblock", transform: `translate(${1872 - w} ${1032 - h})` }, parent);
    BP.el("rect", { x: 0, y: 0, width: w, height: h, fill: BP.T.groundDeep, stroke: BP.T.ink, "stroke-width": 2 }, g);
    rows.forEach((row, i) => {
      if (i) BP.el("line", { x1: 0, y1: i * rowH, x2: w, y2: i * rowH, stroke: BP.T.inkSoft, "stroke-width": 1 }, g);
      BP.text(g, 12, i * rowH + 24, row[0], "bp-small", { fill: BP.T.inkSoft });
      BP.text(g, w - 12, i * rowH + 24, row[1], "bp-small", { "text-anchor": "end", fill: BP.T.ink, class: "bp-small bp-small-ink" });
    });
    return g;
  };

  /* ---------- drafting primitives ---------- */

  /** Architectural grid bubble: circle with a label (stop numbers, detail keys). */
  BP.bubble = function (parent, x, y, label, opts) {
    const o = opts || {};
    const r = o.r || 22;
    const g = BP.el("g", { opacity: o.opacity === undefined ? 1 : o.opacity }, parent);
    BP.el("circle", { cx: x, cy: y, r: r, fill: o.fill || BP.T.groundDeep, stroke: o.stroke || BP.T.ink, "stroke-width": o.sw || 2 }, g);
    BP.text(g, x, y + (o.fontSize || 28) * 0.35, label, "bp-num", { "text-anchor": "middle", "font-size": o.fontSize || 28, fill: o.color || BP.T.ink });
    return g;
  };

  /** Arrowhead (filled, drafting style) at (x, y) pointing along angle (rad). */
  BP.arrowhead = function (parent, x, y, angle, size, color) {
    const s = size || 16;
    const a = angle;
    const p1 = [x - s * Math.cos(a) + s * 0.34 * Math.sin(a), y - s * Math.sin(a) - s * 0.34 * Math.cos(a)];
    const p2 = [x - s * Math.cos(a) - s * 0.34 * Math.sin(a), y - s * Math.sin(a) + s * 0.34 * Math.cos(a)];
    return BP.el("path", { d: BP.d([[x, y], p1, p2], true), fill: color || BP.T.ink }, parent);
  };

  /** Text-replacement arrow glyph (→) drawn as a vector, width w, centred on y. */
  BP.arrowGlyph = function (parent, x, y, w, color, weight) {
    const c = color || BP.T.ink;
    const sw = weight || Math.max(3, w * 0.09);
    BP.el("line", { x1: x, y1: y, x2: x + w - sw * 1.6, y2: y, stroke: c, "stroke-width": sw, "stroke-linecap": "butt" }, parent);
    return BP.arrowhead(parent, x + w, y, 0, sw * 4.2, c);
  };

  /**
   * Dimension line between (x1,y) and (x2,y) with extension ticks and a label.
   * opts: {label, dashed, color, labelColor, ext (extension length), fontSize,
   * labelSide: "above"|"below"|"outside-right", cls}.
   */
  BP.dimension = function (parent, x1, x2, y, opts) {
    const o = opts || {};
    const c = o.color || BP.T.ink;
    const g = BP.el("g", { opacity: o.opacity === undefined ? 1 : o.opacity }, parent);
    const ext = o.ext === undefined ? 22 : o.ext;
    BP.el("line", { x1: x1, y1: y - ext, x2: x1, y2: y + 10, stroke: c, "stroke-width": 1.6 }, g);
    BP.el("line", { x1: x2, y1: y - ext, x2: x2, y2: y + 10, stroke: c, "stroke-width": 1.6 }, g);
    const wide = Math.abs(x2 - x1) > 40;
    BP.el("line", { x1: x1 + (wide ? 4 : 0), y1: y, x2: x2 - (wide ? 4 : 0), y2: y, stroke: c, "stroke-width": o.sw || 3, "stroke-dasharray": o.dashed ? "14 9" : null }, g);
    if (wide) {
      BP.arrowhead(g, x1, y, Math.PI, 16, c);
      BP.arrowhead(g, x2, y, 0, 16, c);
    } else {
      BP.arrowhead(g, x1, y, 0, 14, c);
      BP.arrowhead(g, x2, y, Math.PI, 14, c);
    }
    if (o.label) {
      const fs = o.fontSize || 30;
      let tx = (x1 + x2) / 2;
      let ty = y - 14;
      let anchor = "middle";
      if (o.labelSide === "below") ty = y + fs + 6;
      if (o.labelSide === "outside-right") { tx = Math.max(x1, x2) + 24; ty = y + fs * 0.34; anchor = "start"; }
      BP.text(g, tx, ty, o.label, o.cls || "bp-num halo", { "text-anchor": anchor, "font-size": fs, fill: o.labelColor || c });
    }
    return g;
  };

  /** Leader: polyline from a target point to a label anchor, dot at the target. */
  BP.leader = function (parent, pts, opts) {
    const o = opts || {};
    const c = o.color || BP.T.ink;
    const g = BP.el("g", { opacity: o.opacity === undefined ? 1 : o.opacity }, parent);
    BP.el("path", { d: BP.d(pts), fill: "none", stroke: c, "stroke-width": o.sw || 1.8, "stroke-dasharray": o.dashed ? "6 5" : null }, g);
    BP.el("circle", { cx: pts[0][0], cy: pts[0][1], r: o.dot || 4.5, fill: c }, g);
    return g;
  };

  /** Label in a knockout box (ground-filled rect behind text). */
  BP.boxLabel = function (parent, x, y, str, opts) {
    const o = opts || {};
    const g = BP.el("g", { opacity: o.opacity === undefined ? 1 : o.opacity }, parent);
    const fs = o.fontSize || 30;
    const rect = BP.el("rect", { y: y - fs * 0.86, height: fs * 1.28, fill: o.fill || BP.T.groundDeep, stroke: o.stroke || BP.T.ink, "stroke-width": o.sw === undefined ? 2 : o.sw }, g);
    const t = BP.text(g, x, y, str, o.cls || "bp-label", { "text-anchor": o.anchor || "middle", "font-size": fs, fill: o.color || BP.T.ink });
    const w = t.getComputedTextLength() + (o.pad || 16) * 2;
    let rx = x - w / 2;
    if (o.anchor === "start") rx = x - (o.pad || 16);
    if (o.anchor === "end") rx = x - w + (o.pad || 16);
    BP.attrs(rect, { x: rx, width: w });
    g._w = w;
    return g;
  };

  /** Revision cloud (scalloped outline) around a rectangle. */
  BP.revisionCloud = function (parent, x, y, w, h, opts) {
    const o = opts || {};
    const bump = o.bump || 26;
    const pts = [];
    const per = 2 * (w + h);
    const n = Math.max(8, Math.round(per / bump));
    function edge(t) {
      const d = t * per;
      if (d < w) return [x + d, y];
      if (d < w + h) return [x + w, y + (d - w)];
      if (d < 2 * w + h) return [x + w - (d - w - h), y + h];
      return [x, y + h - (d - 2 * w - h)];
    }
    for (let i = 0; i <= n; i++) pts.push(edge(i / n));
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const r = (Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) / 2) * 1.05;
      d += `A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
    }
    return BP.el("path", { d: d, fill: "none", stroke: o.color || BP.T.fix, "stroke-width": o.sw || 3, opacity: o.opacity === undefined ? 1 : o.opacity }, parent);
  };

  /** Revision delta: triangle with a revision letter. */
  BP.revDelta = function (parent, x, y, letter, color) {
    const c = color || BP.T.fix;
    const g = BP.el("g", null, parent);
    BP.el("path", { d: `M${x} ${y - 26}L${x + 25} ${y + 17}L${x - 25} ${y + 17}Z`, fill: BP.T.groundDeep, stroke: c, "stroke-width": 2.6 }, g);
    BP.text(g, x, y + 11, letter, "bp-num", { "text-anchor": "middle", "font-size": 22, fill: c });
    return g;
  };

  /** Detail inset: framed viewport with corner brackets and a title tab. */
  BP.inset = function (parent, x, y, w, h, title, opacity) {
    const g = BP.el("g", { opacity: opacity === undefined ? 1 : opacity }, parent);
    BP.el("rect", { x: x, y: y, width: w, height: h, fill: BP.T.groundDeep, "fill-opacity": 0.82, stroke: BP.T.ink, "stroke-width": 2.2 }, g);
    BP.el("rect", { x: x, y: y, width: w, height: h, fill: "url(#bp-grid)" }, g);
    const k = 26;
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach((c) => {
      BP.el("path", { d: `M${c[0] + c[2] * k} ${c[1] - c[3] * 0}H${c[0] - c[2] * 8}M${c[0]} ${c[1] + c[3] * k}V${c[1] - c[3] * 8}`, stroke: BP.T.ink, "stroke-width": 4, fill: "none" }, g);
    });
    if (title) BP.boxLabel(g, x + 20, y + 4, title, { anchor: "start", fontSize: 30, fill: BP.T.ground });
    const content = BP.el("g", null, g);
    return { g: g, content: content };
  };

  /** North arrow: circle, half-filled arrow and an N, centred at (x, y). */
  BP.northArrow = function (parent, x, y, r) {
    const g = BP.el("g", null, parent);
    BP.el("circle", { cx: x, cy: y, r: r, fill: "none", stroke: BP.T.ink, "stroke-width": 1.6 }, g);
    BP.el("path", { d: `M${x} ${y - r - 8}L${x + r * 0.42} ${y + r * 0.6}L${x} ${y + r * 0.25}Z`, fill: BP.T.ink }, g);
    BP.el("path", { d: `M${x} ${y - r - 8}L${x - r * 0.42} ${y + r * 0.6}L${x} ${y + r * 0.25}Z`, fill: "none", stroke: BP.T.ink, "stroke-width": 1.4 }, g);
    BP.text(g, x, y - r - 14, "N", "bp-num", { "text-anchor": "middle", "font-size": 22, fill: BP.T.ink });
    return g;
  };

  /** Alternating-block scale bar: `units` blocks of `unitPx` each, with a unit label. */
  BP.scaleBar = function (parent, x, y, unitPx, units, unitLabel) {
    const g = BP.el("g", null, parent);
    for (let i = 0; i < units; i++) {
      BP.el("rect", { x: x + i * unitPx, y: y - 8, width: unitPx, height: 12, fill: i % 2 ? "none" : BP.T.ink, stroke: BP.T.ink, "stroke-width": 1.6 }, g);
    }
    for (let i = 0; i <= units; i++) BP.text(g, x + i * unitPx, y - 18, String(i), "bp-small", { "text-anchor": "middle", fill: BP.T.ink });
    BP.text(g, x + units * unitPx + 16, y + 4, unitLabel, "bp-small", { fill: BP.T.inkSoft });
    return g;
  };

  /* ---------- world objects (planometric) ---------- */

  /**
   * Extruded box in the planometric view. spec: {x, y, tx, ty (heading unit),
   * L (along heading), W, H, z0, fillTop, fillSide, stroke, sw, hatch}.
   * Returns the projected face polygons so callers can decorate them.
   */
  BP.box = function (parent, cam, spec) {
    const L = spec.L / 2, W = spec.W / 2, z0 = spec.z0 || 0, z1 = z0 + spec.H;
    const tx = spec.tx === undefined ? 1 : spec.tx, ty = spec.ty || 0;
    const nx = -ty, ny = tx;
    const c = (u, v) => [spec.x + tx * u + nx * v, spec.y + ty * u + ny * v];
    const base = [c(L, W), c(L, -W), c(-L, -W), c(-L, W)];
    const P = (p, z) => BP.project(cam, p[0], p[1], z);
    const faces = [];
    for (let i = 0; i < 4; i++) {
      const a = base[i], b = base[(i + 1) % 4];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      // Outward normal of this vertical face; visible when it faces +y (viewer).
      const fnx = ey, fny = -ex;
      const mid = [(a[0] + b[0]) / 2 - spec.x, (a[1] + b[1]) / 2 - spec.y];
      const sign = fnx * mid[0] + fny * mid[1] > 0 ? 1 : -1;
      if (fny * sign > 1e-6) faces.push({ i: i, a: a, b: b, poly: [P(a, z0), P(b, z0), P(b, z1), P(a, z1)] });
    }
    const top = base.map((p) => P(p, z1));
    const stroke = spec.stroke || BP.T.ink;
    const sw = spec.sw || 1.6;
    faces.forEach((f) => {
      BP.el("path", { d: BP.d(f.poly, true), fill: spec.fillSide || BP.T.faceSide, stroke: stroke, "stroke-width": sw, "stroke-linejoin": "round" }, parent);
      if (spec.hatch) BP.el("path", { d: BP.d(f.poly, true), fill: spec.hatch, stroke: "none" }, parent);
    });
    BP.el("path", { d: BP.d(top, true), fill: spec.fillTop || BP.T.faceTop, stroke: stroke, "stroke-width": sw, "stroke-linejoin": "round" }, parent);
    return { faces: faces, top: top, base: base, z1: z1, P: P };
  };

  /** Point on a vertical face of a box: u in [0,1] along a->b, z height. */
  BP.facePoint = function (cam, face, u, z) {
    const x = BP.lerp(face.a[0], face.b[0], u);
    const y = BP.lerp(face.a[1], face.b[1], u);
    return BP.project(cam, x, y, z);
  };

  /**
   * Bus in planometric: box with window band, door, wheels and roof letter.
   * opts: {x, y, tx, ty, L, W, H, letter, hatch, accent}.
   */
  BP.planBus = function (parent, cam, o) {
    const T = BP.T;
    const res = BP.box(parent, cam, {
      x: o.x, y: o.y, tx: o.tx, ty: o.ty, L: o.L, W: o.W, H: o.H, z0: 4,
      fillSide: T.faceSide, fillTop: T.faceTop, stroke: o.accent || T.ink, sw: 2,
      hatch: o.hatch ? "url(#bp-hatch)" : null,
    });
    res.faces.forEach((f) => {
      const len = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]);
      const long = len > o.W * 1.5;
      if (long) {
        // Window band and two wheels on the long side.
        const band = [BP.facePoint(cam, f, 0.08, o.H * 0.5), BP.facePoint(cam, f, 0.92, o.H * 0.5), BP.facePoint(cam, f, 0.92, o.H * 0.86), BP.facePoint(cam, f, 0.08, o.H * 0.86)];
        BP.el("path", { d: BP.d(band, true), fill: T.groundDeep, stroke: o.accent || T.ink, "stroke-width": 1.4 }, parent);
        for (let k = 1; k < 5; k++) {
          const p0 = BP.facePoint(cam, f, 0.08 + 0.168 * k, o.H * 0.5);
          const p1 = BP.facePoint(cam, f, 0.08 + 0.168 * k, o.H * 0.86);
          BP.el("line", { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: o.accent || T.ink, "stroke-width": 1.2 }, parent);
        }
        [0.2, 0.8].forEach((u) => {
          const pts = [];
          for (let k = 0; k <= 14; k++) {
            const a = (k / 14) * Math.PI * 2;
            const uu = u + (Math.cos(a) * o.H * 0.17) / len;
            pts.push(BP.facePoint(cam, f, uu, o.H * 0.12 + Math.sin(a) * o.H * 0.17));
          }
          BP.el("path", { d: BP.d(pts, true), fill: T.groundDeep, stroke: o.accent || T.ink, "stroke-width": 1.6 }, parent);
        });
      } else {
        const ws = [BP.facePoint(cam, f, 0.14, o.H * 0.48), BP.facePoint(cam, f, 0.86, o.H * 0.48), BP.facePoint(cam, f, 0.86, o.H * 0.86), BP.facePoint(cam, f, 0.14, o.H * 0.86)];
        BP.el("path", { d: BP.d(ws, true), fill: T.groundDeep, stroke: o.accent || T.ink, "stroke-width": 1.2 }, parent);
      }
    });
    // Roof unit and letter, so buses are distinguished by shape and text.
    const cx = (res.top[0][0] + res.top[2][0]) / 2;
    const cy = (res.top[0][1] + res.top[2][1]) / 2;
    if (o.letter) {
      BP.text(parent, cx, cy + 9 * Math.min(1.6, cam.s), o.letter, "bp-num", { "text-anchor": "middle", "font-size": 28 * Math.min(1.5, cam.s), fill: o.accent || T.ink });
    }
    return { top: res.top, cx: cx, cy: cy };
  };

  /** Bus shelter + stop pole in planometric at ground point with heading. */
  BP.shelter = function (parent, cam, x, y, tx, ty) {
    BP.box(parent, cam, { x: x, y: y, tx: tx, ty: ty, L: 46, W: 6, H: 30, fillSide: BP.T.groundLift, fillTop: BP.T.faceTop, sw: 1.4 });
    BP.box(parent, cam, { x: x, y: y, tx: tx, ty: ty, L: 54, W: 18, H: 4, z0: 30, fillSide: BP.T.faceSide, fillTop: BP.T.faceTop, sw: 1.4 });
    const pole = [x + tx * 34, y + ty * 34];
    const p0 = BP.project(cam, pole[0], pole[1], 0);
    const p1 = BP.project(cam, pole[0], pole[1], 44);
    BP.el("line", { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: BP.T.ink, "stroke-width": 1.6 }, parent);
    BP.el("rect", { x: p1[0] - 5 * cam.s, y: p1[1] - 6 * cam.s, width: 10 * cam.s, height: 10 * cam.s, fill: BP.T.groundDeep, stroke: BP.T.ink, "stroke-width": 1.4 }, parent);
  };

  /** Plan-symbol tree: projected circle canopy with cross and trunk. */
  BP.tree = function (parent, cam, x, y, r) {
    const pts = [];
    for (let k = 0; k <= 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      const wob = 1 + 0.08 * Math.sin(a * 5);
      pts.push(BP.project(cam, x + Math.cos(a) * r * wob, y + Math.sin(a) * r * wob, 34));
    }
    const base = BP.project(cam, x, y, 0);
    const top = BP.project(cam, x, y, 34);
    BP.el("line", { x1: base[0], y1: base[1], x2: top[0], y2: top[1], stroke: BP.T.inkFaint, "stroke-width": 1.6 }, parent);
    BP.el("path", { d: BP.d(pts, true), fill: BP.T.ground, "fill-opacity": 0.7, stroke: BP.T.inkSoft, "stroke-width": 1.2, opacity: 0.75 }, parent);
    BP.el("path", { d: `M${top[0] - r * cam.s * 0.5} ${top[1]}H${top[0] + r * cam.s * 0.5}M${top[0]} ${top[1] - r * cam.s * 0.3}V${top[1] + r * cam.s * 0.3}`, stroke: BP.T.inkSoft, "stroke-width": 1, opacity: 0.6 }, parent);
  };

  /** Faint context building (wireframe block with hatched roof). */
  BP.building = function (parent, cam, b) {
    BP.box(parent, cam, { x: b.x, y: b.y, L: b.L, W: b.W, H: b.H, fillSide: "rgba(10,43,84,0.35)", fillTop: "url(#bp-hatch-soft)", stroke: BP.T.inkFaint, sw: 1.2 });
  };

  /* ---------- people ---------- */

  /** Named poses for BP.figure: joint angles in degrees (0 = arm hanging down,
   * +90 = pointing screen-right, 180 = straight up), face controls in [-1, 1.6]. */
  BP.POSES = {
    wait: { lu: -8, lf: -4, ru: 16, rf: 74, lean: 0, tilt: 0, turn: 0, browL: 0, browR: 0, smile: 0.25, mouth: 0, eye: 1 },
    peer: { lu: -160, lf: 108, ru: 16, rf: 50, lean: -3, tilt: -4, turn: -1, browL: 0.6, browR: -0.4, smile: -0.1, mouth: 0, eye: 1 },
    watch: { lu: -20, lf: 113, ru: 30, rf: -30, lean: 2, tilt: -10, turn: -0.4, browL: -1, browR: -1, smile: -0.7, mouth: 0, eye: 0.8 },
    alarm: { lu: -145, lf: -168, ru: 145, rf: 168, lean: -2, tilt: 0, turn: -0.2, browL: 1.2, browR: 1.2, smile: 0, mouth: 1, eye: 1.6 },
    present: { lu: -128, lf: -122, ru: 12, rf: 34, lean: -3, tilt: -5, turn: -0.6, browL: 0.4, browR: 0.4, smile: 1, mouth: 0, eye: 1 },
    point: { lu: -96, lf: -92, ru: 14, rf: 40, lean: -2, tilt: 0, turn: -0.8, browL: 0.2, browR: 0.2, smile: 0.4, mouth: 0, eye: 1 },
  };

  /** Interpolate two pose objects. */
  BP.lerpPose = function (a, b, t) {
    const out = {};
    for (const k in a) out[k] = BP.lerp(a[k], b[k] === undefined ? a[k] : b[k], t);
    return out;
  };

  /**
   * The Surveyor: lab-coated scale figure with glasses and a stopwatch.
   * Feet at (x, y) screen; k = px per figure unit (figure is ~200 units tall).
   */
  BP.figure = function (parent, x, y, k, pose) {
    const T = BP.T;
    const p = pose;
    const sw = Math.max(1.6, 2.2 * Math.sqrt(k));
    const g = BP.el("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(3)})` }, parent);
    const line = (attrs) => BP.el("path", Object.assign({ fill: "none", stroke: T.ink, "stroke-width": sw / k, "stroke-linecap": "round", "stroke-linejoin": "round" }, attrs), g);
    // Ground shadow + dash-dot centre line: the figure is a drafted object.
    BP.el("ellipse", { cx: 0, cy: 2, rx: 40, ry: 8, fill: "url(#bp-hatch-soft)", stroke: T.inkSoft, "stroke-width": 1 / k }, g);
    // Legs.
    line({ d: "M-10 -90L-15 -2M10 -90L15 -2", "stroke-width": 15, stroke: T.ink });
    line({ d: "M-10 -90L-15 -2M10 -90L15 -2", "stroke-width": 10, stroke: T.groundDeep });
    BP.el("path", { d: "M-27 -1Q-27 -9 -15 -9L-8 -9L-8 -1Z M27 -1Q27 -9 15 -9L8 -9L8 -1Z", fill: T.ink }, g);
    const upper = BP.el("g", { transform: `rotate(${p.lean} 0 -90)` }, g);
    const uline = (attrs) => BP.el("path", Object.assign({ fill: "none", stroke: T.ink, "stroke-width": sw / k, "stroke-linecap": "round", "stroke-linejoin": "round" }, attrs), upper);
    const arm = (sx, sy, a1, a2, side) => {
      const r1 = (a1 * Math.PI) / 180, r2 = (a2 * Math.PI) / 180;
      const ex = sx + Math.sin(r1) * 36, ey = sy + Math.cos(r1) * 36;
      const hx = ex + Math.sin(r2) * 34, hy = ey + Math.cos(r2) * 34;
      const dd = `M${sx} ${sy}L${ex.toFixed(1)} ${ey.toFixed(1)}L${hx.toFixed(1)} ${hy.toFixed(1)}`;
      uline({ d: dd, "stroke-width": 15 });
      uline({ d: dd, "stroke-width": 10, stroke: T.faceSide });
      BP.el("circle", { cx: hx, cy: hy, r: 6, fill: T.ink }, upper);
      return { hx: hx, hy: hy, ex: ex, ey: ey, side: side };
    };
    // Coat (lab coat) with seam, collar and pocket.
    BP.el("path", { d: "M-24 -152Q0 -160 24 -152L33 -80Q0 -74 -33 -80Z", fill: T.faceSide, stroke: T.ink, "stroke-width": sw / k, "stroke-linejoin": "round" }, upper);
    BP.el("path", { d: "M-24 -152Q0 -160 24 -152L33 -80Q0 -74 -33 -80Z", fill: "url(#bp-hatch-soft)", stroke: "none", "clip-path": null, opacity: 0.6 }, upper);
    uline({ d: "M0 -150L0 -78M-12 -154L0 -136L12 -154", "stroke-width": 1.6 / k + 1.2 });
    uline({ d: "M10 -118H22V-104H10Z M14 -122V-112", "stroke-width": 1.4 / k + 1 });
    // Arms are drawn over the coat so gestures across the chest (checking a
    // wristwatch) stay visible.
    const left = arm(-22, -146, p.lu, p.lf, -1);
    // Neck + head group (tilt around neck).
    const head = BP.el("g", { transform: `rotate(${p.tilt} 0 -158)` }, upper);
    BP.el("rect", { x: -6, y: -166, width: 12, height: 12, fill: T.groundDeep, stroke: T.ink, "stroke-width": sw / k }, head);
    BP.el("circle", { cx: 0, cy: -184, r: 23, fill: T.groundLift, stroke: T.ink, "stroke-width": sw / k }, head);
    // Hair cap, offset toward the facing direction.
    const tx = p.turn * 6;
    BP.el("path", { d: `M${-23} -186Q${-22 + tx * 0.2} -212 ${2 - tx} -209Q${24 - tx * 0.3} -206 ${23} -188Q${10 - tx} -198 ${-6 - tx} -196Q${-16} -194 ${-23} -186Z`, fill: T.ink }, head);
    // Glasses, eyes, brows, mouth.
    const ex1 = -9 + tx, ex2 = 9 + tx, ey = -182;
    BP.el("circle", { cx: ex1, cy: ey, r: 7.5, fill: T.groundDeep, stroke: T.ink, "stroke-width": 2 }, head);
    BP.el("circle", { cx: ex2, cy: ey, r: 7.5, fill: T.groundDeep, stroke: T.ink, "stroke-width": 2 }, head);
    BP.el("path", { d: `M${ex1 + 7.5} ${ey}L${ex2 - 7.5} ${ey}`, stroke: T.ink, "stroke-width": 2 }, head);
    const eyes = BP.el("g", { class: "bp-eyes" }, head);
    const er = 2.4 * p.eye;
    BP.el("ellipse", { cx: ex1 + p.turn * 1.5, cy: ey, rx: er, ry: er * 1.15, fill: T.ink }, eyes);
    BP.el("ellipse", { cx: ex2 + p.turn * 1.5, cy: ey, rx: er, ry: er * 1.15, fill: T.ink }, eyes);
    const bl = p.browL * 3, br = p.browR * 3;
    BP.el("path", { d: `M${ex1 - 7} ${ey - 12 - bl * 0.6}L${ex1 + 6} ${ey - 12 - bl * 1.3 + (p.browL < 0 ? 3 : 0)}M${ex2 - 6} ${ey - 12 - br * 1.3 + (p.browR < 0 ? 3 : 0)}L${ex2 + 7} ${ey - 12 - br * 0.6}`, stroke: T.ink, "stroke-width": 2.6, "stroke-linecap": "round" }, head);
    const my = -167, mx = tx * 0.8;
    if (p.mouth > 0.05) {
      BP.el("ellipse", { cx: mx, cy: my, rx: 3 + 2 * p.mouth, ry: 2 + 3.6 * p.mouth, fill: T.groundDeep, stroke: T.ink, "stroke-width": 2 }, head);
    } else {
      BP.el("path", { d: `M${mx - 7} ${my}Q${mx} ${my + p.smile * 7} ${mx + 7} ${my - p.smile * 0.5}`, fill: "none", stroke: T.ink, "stroke-width": 2.4, "stroke-linecap": "round" }, head);
    }
    // Front arm with stopwatch in hand.
    const right = arm(22, -146, p.ru, p.rf, 1);
    const sx = right.hx + 4, sy = right.hy - 4;
    BP.el("circle", { cx: sx, cy: sy, r: 12, fill: T.groundDeep, stroke: T.data, "stroke-width": 2.6 }, upper);
    BP.el("rect", { x: sx - 3, y: sy - 19, width: 6, height: 6, fill: T.data }, upper);
    BP.el("path", { d: `M${sx} ${sy}L${sx + 5} ${sy - 7}`, stroke: T.data, "stroke-width": 2.2, "stroke-linecap": "round" }, upper);
    // Wristwatch on the left wrist.
    const wx = BP.lerp(left.ex, left.hx, 0.78), wy = BP.lerp(left.ey, left.hy, 0.78);
    BP.el("rect", { x: wx - 3.5, y: wy - 3.5, width: 7, height: 7, fill: T.groundDeep, stroke: T.ink, "stroke-width": 1.6 }, upper);
    return { g: g, hand: [x + k * right.hx, y + k * right.hy], head: [x, y - k * 210] };
  };

  /** Small rider figure (no face detail) with feet at (x, y), k px per unit. */
  BP.rider = function (parent, x, y, k, variant) {
    const T = BP.T;
    const g = BP.el("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(3)})` }, parent);
    const v = variant || 0;
    const sw = 2.2 / k;
    const st = { fill: "none", stroke: T.ink, "stroke-width": Math.max(sw, 6), "stroke-linecap": "round" };
    BP.el("path", Object.assign({ d: "M-8 -80L-12 0M8 -80L12 0" }, st), g);
    BP.el("path", { d: "M-20 -150Q0 -156 20 -150L24 -76L-24 -76Z", fill: v % 2 ? T.groundLift : T.faceSide, stroke: T.ink, "stroke-width": Math.max(sw, 5) }, g);
    BP.el("path", Object.assign({ d: v % 3 === 1 ? "M-20 -146L-30 -100M20 -146L34 -110L26 -84" : "M-20 -146L-28 -86M20 -146L28 -86" }, st), g);
    BP.el("circle", { cx: 0, cy: -176, r: 20, fill: T.groundLift, stroke: T.ink, "stroke-width": Math.max(sw, 5) }, g);
    if (v % 3 === 2) BP.el("path", { d: "M-24 -186H24M-16 -186V-202H16V-186", fill: T.ink, stroke: T.ink, "stroke-width": 4 }, g);
    if (v % 4 === 1) BP.el("rect", { x: 22, y: -116, width: 22, height: 26, fill: T.groundDeep, stroke: T.ink, "stroke-width": Math.max(sw, 4) }, g);
    return g;
  };

  /* ---------- elevation objects ---------- */

  /**
   * Side-elevation bus, wheels on groundY, front at the right. opts: {letter,
   * doorOpen (0..1), hatch, accent}. Width w, height ~0.42w.
   */
  BP.elevationBus = function (parent, x, groundY, w, opts) {
    const T = BP.T;
    const o = opts || {};
    const c = o.accent || T.ink;
    const h = w * 0.4;
    const top = groundY - h - w * 0.03;
    const g = BP.el("g", null, parent);
    BP.el("rect", { x: x, y: top, width: w, height: h, rx: w * 0.035, fill: T.faceSide, stroke: c, "stroke-width": 3 }, g);
    if (o.hatch) BP.el("rect", { x: x, y: top, width: w, height: h, rx: w * 0.035, fill: "url(#bp-hatch)", stroke: "none" }, g);
    // Windows.
    const wy = top + h * 0.14, wh = h * 0.36;
    const doorX = x + w * 0.78, doorW = w * 0.1;
    for (let i = 0; i < 5; i++) {
      const wx = x + w * 0.05 + i * w * 0.142;
      BP.el("rect", { x: wx, y: wy, width: w * 0.12, height: wh, fill: T.groundDeep, stroke: c, "stroke-width": 2 }, g);
    }
    BP.el("rect", { x: x + w * 0.9, y: wy, width: w * 0.08, height: wh * 1.2, fill: T.groundDeep, stroke: c, "stroke-width": 2 }, g);
    // Door: two leaves slide apart when open.
    const open = o.doorOpen || 0;
    BP.el("rect", { x: doorX, y: wy, width: doorW, height: groundY - w * 0.06 - wy, fill: open > 0.1 ? T.ground : T.groundDeep, stroke: c, "stroke-width": 2 }, g);
    const leaf = (doorW / 2) * (1 - open * 0.8);
    BP.el("rect", { x: doorX, y: wy, width: leaf, height: groundY - w * 0.06 - wy, fill: T.groundDeep, stroke: c, "stroke-width": 1.6 }, g);
    BP.el("rect", { x: doorX + doorW - leaf, y: wy, width: leaf, height: groundY - w * 0.06 - wy, fill: T.groundDeep, stroke: c, "stroke-width": 1.6 }, g);
    // Route sign.
    if (o.letter) {
      BP.el("rect", { x: x + w * 0.86, y: top - h * 0.0 + 6, width: w * 0.12, height: h * 0.12, fill: T.groundDeep, stroke: c, "stroke-width": 1.6 }, g);
      BP.text(g, x + w * 0.92, top + 6 + h * 0.105, o.letter, "bp-num", { "text-anchor": "middle", "font-size": h * 0.12, fill: c });
    }
    // Wheels.
    [0.2, 0.74].forEach((u) => {
      BP.el("circle", { cx: x + w * u, cy: groundY - w * 0.055, r: w * 0.06, fill: T.groundDeep, stroke: c, "stroke-width": 3 }, g);
      BP.el("circle", { cx: x + w * u, cy: groundY - w * 0.055, r: w * 0.022, fill: c }, g);
    });
    // Dash-dot centre line across the body, a drafting habit.
    BP.el("line", { x1: x - 20, y1: top + h / 2, x2: x + w + 20, y2: top + h / 2, stroke: T.inkSoft, "stroke-width": 1, "stroke-dasharray": "22 6 4 6", opacity: 0.6 }, g);
    return { g: g, top: top, doorX: doorX, doorW: doorW, h: h };
  };

  /* ---------- instruments ---------- */

  /**
   * Caliper gap gauge: the loop unrolled. Fixed jaw = first vehicle, slider =
   * second, far end = first vehicle one lap later. opts: {x, y, width, total,
   * value (first gap), labels: [jawA, slider, end], title, alarm}.
   */
  BP.caliper = function (parent, o) {
    const T = BP.T;
    const g = BP.el("g", { opacity: o.opacity === undefined ? 1 : o.opacity }, parent);
    const W = o.width, x0 = o.x, y0 = o.y, total = o.total;
    const pxPer = W / total;
    const xs = x0 + o.value * pxPer;
    const valueColor = o.alarm ? T.alarm : T.data;
    BP.text(g, x0 - 2, y0 - 44, o.title || "GAP GAUGE", "bp-label", { fill: T.ink, "font-size": 32 });
    if (o.sumLabel) BP.text(g, x0 + W, y0 - 44, o.sumLabel, "bp-small", { "text-anchor": "end", fill: T.inkSoft });
    // Beam with minute scale.
    BP.el("rect", { x: x0 - 30, y: y0 - 22, width: W + 60, height: 44, fill: T.groundLift, stroke: T.ink, "stroke-width": 2.4 }, g);
    for (let m = 0; m <= total; m++) {
      const tx = x0 + m * pxPer;
      const major = m % 5 === 0;
      BP.el("line", { x1: tx, y1: y0 + 22, x2: tx, y2: y0 + 22 - (major ? 18 : 9), stroke: T.ink, "stroke-width": major ? 2 : 1.2 }, g);
      if (major) BP.text(g, tx, y0 + 2, String(m), "bp-small", { "text-anchor": "middle", fill: T.ink, "font-size": 22 });
    }
    // Fixed jaw (A) and far-end jaw (A, one lap later).
    const jaw = (x, dir, label, fill) => {
      BP.el("path", { d: `M${x} ${y0 + 22}V${y0 + 80}L${x + dir * 26} ${y0 + 66}V${y0 + 22}Z`, fill: fill, stroke: T.ink, "stroke-width": 2.2, "stroke-linejoin": "round" }, g);
      BP.bubble(g, x + dir * 14, y0 + 108, label, { r: 23, fontSize: 28 });
    };
    jaw(x0, -1, o.labels[0], "url(#bp-hatch)");
    jaw(x0 + W, 1, o.labels[2], "url(#bp-hatch)");
    // Slider (B) wraps the beam.
    BP.el("rect", { x: xs - 20, y: y0 - 30, width: 40, height: 60, fill: T.faceTop, stroke: T.ink, "stroke-width": 2.4 }, g);
    BP.el("path", { d: `M${xs} ${y0 + 30}V${y0 + 80}L${xs + 16} ${y0 + 66}V${y0 + 30}Z M${xs} ${y0 + 30}V${y0 + 80}L${xs - 16} ${y0 + 66}V${y0 + 30}Z`, fill: T.groundLift, stroke: T.ink, "stroke-width": 2.2 }, g);
    BP.el("line", { x1: xs, y1: y0 - 30, x2: xs, y2: y0 + 30, stroke: valueColor, "stroke-width": 3 }, g);
    BP.bubble(g, xs, y0 + 108, o.labels[1], { r: 23, fontSize: 28, stroke: T.ink });
    // Dimension lines: solid = A->B, dashed = B->A.
    const dy = y0 + 176;
    const g1 = o.value, g2 = total - o.value;
    // Whole minutes only: mid-transition readings tick like an instrument
    // instead of showing invented decimals.
    const fmt = (v) => String(Math.round(v));
    const lab1 = fmt(g1) + " min", lab2 = fmt(g2) + " min";
    const narrow2 = (W - (xs - x0)) < 190;
    BP.dimension(g, x0, xs, dy, { label: lab1, color: T.ink, labelColor: valueColor, fontSize: 46, ext: 46, sw: 3.4 });
    BP.dimension(g, xs, x0 + W, dy, { label: lab2, dashed: true, color: T.ink, labelColor: valueColor, fontSize: 46, ext: 46, sw: 3.4, labelSide: narrow2 ? "outside-right" : "above" });
    return { g: g, sliderX: xs };
  };

  /**
   * Feedback ring: an elliptical loop of arrows drawn around a scene, with up
   * to 4 labels at its corners (NW, NE, SE, SW), revealed by per-item opacity.
   * opts: {cx, cy, rx, ry, color, ringOpacity, labels: [{text, o}]}.
   */
  BP.feedbackRing = function (parent, o) {
    const T = BP.T;
    const c = o.color || T.alarm;
    const g = BP.el("g", null, parent);
    const ring = BP.el("g", { opacity: o.ringOpacity }, g);
    // Draw the ring as a polyline revealed by ringOpacity (also used as progress).
    const prog = BP.clamp(o.ringProgress === undefined ? 1 : o.ringProgress, 0, 1);
    const start = -Math.PI * 0.75; // start at NW
    const pts = [];
    const n = 120;
    for (let i = 0; i <= n * prog; i++) {
      const a = start + (i / n) * Math.PI * 2;
      pts.push([o.cx + Math.cos(a) * o.rx, o.cy + Math.sin(a) * o.ry]);
    }
    if (pts.length > 1) BP.el("path", { d: BP.d(pts), fill: "none", stroke: c, "stroke-width": 5, "stroke-linecap": "round" }, ring);
    // Arrowheads midway between labels (N, E, S, W), clockwise on screen.
    [-Math.PI / 2, 0, Math.PI / 2, Math.PI].forEach((a, i) => {
      const frac = (((a - start) / (Math.PI * 2)) % 1 + 1) % 1;
      if (frac > prog) return;
      const x = o.cx + Math.cos(a) * o.rx, y = o.cy + Math.sin(a) * o.ry;
      const ang = Math.atan2(Math.cos(a) * o.ry, -Math.sin(a) * o.rx);
      BP.arrowhead(ring, x + Math.cos(ang) * 12, y + Math.sin(ang) * 12, ang, 26, c);
      void i;
    });
    const corners = [-Math.PI * 0.75, -Math.PI * 0.25, Math.PI * 0.25, Math.PI * 0.75];
    (o.labels || []).forEach((lab, i) => {
      if (!lab || lab.o <= 0.001) return;
      const a = corners[i];
      const x = o.cx + Math.cos(a) * o.rx, y = o.cy + Math.sin(a) * o.ry;
      BP.boxLabel(g, x, y + 11, lab.text, { fontSize: 32, color: T.ink, stroke: c, sw: 2.6, opacity: lab.o, fill: T.groundDeep });
    });
    return g;
  };

  /* ---------- stage ---------- */

  /** Scale a 1920x1080 stage element to fit the window (letterboxed). */
  BP.fitStage = function (stage) {
    function fit() {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      stage.style.transform = `translate(${(window.innerWidth - 1920 * s) / 2}px, ${(window.innerHeight - 1080 * s) / 2}px) scale(${s})`;
    }
    window.addEventListener("resize", fit);
    fit();
  };

  /**
   * Keyed tween runner: interpolates numeric params from `from` to `to`, each
   * key with its own [delayMs, durationMs]. Calls draw(params, ctx) per frame.
   * Returns {cancel}. Reduced motion collapses timing to a short crossfade.
   */
  BP.tween = function (from, to, timing, draw, opts) {
    const o = opts || {};
    const t0 = performance.now();
    let raf = 0;
    let end = 0;
    for (const k in to) {
      const tm = timing[k] || timing["*"] || [0, 800];
      end = Math.max(end, tm[0] + tm[1]);
    }
    function frame(now) {
      const el = now - t0;
      const p = {};
      for (const k in to) {
        const a = from[k] === undefined ? to[k] : from[k];
        if (typeof to[k] !== "number") { p[k] = el >= 0 ? to[k] : a; continue; }
        const tm = timing[k] || timing["*"] || [0, 800];
        const t = tm[1] <= 0 ? 1 : BP.clamp((el - tm[0]) / tm[1], 0, 1);
        p[k] = BP.lerp(a, to[k], (o.easeFor && o.easeFor(k)) ? o.easeFor(k)(t) : BP.ease(t));
      }
      draw(p, { elapsed: el, total: end });
      if (el < end) raf = requestAnimationFrame(frame);
      else if (o.done) o.done();
    }
    raf = requestAnimationFrame(frame);
    return { cancel: () => cancelAnimationFrame(raf) };
  };

  window.BP = BP;
})();
