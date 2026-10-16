/* Cinema style kit: a rain-wet night city shot in widescreen.
 *
 * Plain browser JS, no modules. Everything hangs off the global `Cine`.
 * Coordinates are the 1920x1080 stage. The picture lives between the
 * letterbox bars (Cine.FRAME.top .. Cine.FRAME.bottom); bars carry the tag,
 * stamp, source line and scene counter.
 *
 * Drawing functions take a parent <g> and return the group they made (or a
 * small handle object with setter methods). Nothing animates by itself except
 * the rain and lamp flicker, which stop under reduced motion.
 */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  // Palette tokens. Names are semantic, not descriptive.
  const C = {
    bar: "#030305", // letterbox bars
    night: "#070a12", // deepest sky / shadow
    sky: "#101829", // upper sky
    haze: "#2a2a3a", // horizon haze
    asphalt: "#141821", // wet road
    asphaltLit: "#262b38", // road under light
    silhouette: "#04050a", // characters, buildings in front
    building: "#0b0f19", // distant buildings
    sodium: "#ffb347", // ACCENT: lamp light, the hero's world, "ours", Bus A
    sodiumDeep: "#e07b1f", // light falloff
    moon: "#9cc3ff", // SECOND voice: cold light, "theirs", Bus B
    alarm: "#ff4d5e", // ALARM: neon of the vicious circle, lateness
    alarmCore: "#ffe1e4", // white-hot neon core (legible text on neon)
    paper: "#f3e9d6", // titles, tag text
    muted: "#a9adbb", // small print
    window: "#ffcf7a", // lit interior
    windowCold: "#8fb0d8",
  };

  const FRAME = { top: 120, bottom: 960, width: 1920, height: 1080 };

  const FONT = {
    display: "'Cormorant Garamond', 'Times New Roman', serif",
    ui: "'Fira Sans Condensed', 'Arial Narrow', sans-serif",
  };

  /** Create an SVG element with attributes and append it to parent. */
  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const key in attrs || {}) {
      if (attrs[key] !== undefined && attrs[key] !== null) {
        node.setAttribute(key, attrs[key]);
      }
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  /** Create an SVG <text> with content. */
  function text(parent, content, attrs) {
    const node = el("text", attrs, parent);
    node.textContent = content;
    return node;
  }

  /** Deterministic random generator (mulberry32) so art never shifts. */
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

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const easeInOut = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /** Build shared gradients, filters and the rain pattern into <defs>. */
  function defs(svg) {
    const d = el("defs", {}, svg);

    const lin = (id, stops, x2, y2) => {
      const g = el("linearGradient", {
        id, x1: 0, y1: 0, x2: x2 ?? 0, y2: y2 ?? 1,
      }, d);
      stops.forEach(([o, c, a]) =>
        el("stop", { offset: o, "stop-color": c, "stop-opacity": a ?? 1 }, g));
      return g;
    };
    const rad = (id, stops) => {
      const g = el("radialGradient", { id }, d);
      stops.forEach(([o, c, a]) =>
        el("stop", { offset: o, "stop-color": c, "stop-opacity": a ?? 1 }, g));
      return g;
    };

    lin("skyGrad", [[0, C.night], [0.55, C.sky], [1, "#2b2433"]]);
    lin("roadGrad", [[0, "#1b1f2a"], [1, "#0c0f16"]]);
    lin("coneGrad", [[0, C.sodium, 0.42], [0.7, C.sodium, 0.1], [1, C.sodium, 0]]);
    lin("beamGrad", [[0, "#ffe9b8", 0.5], [1, "#ffe9b8", 0]], 1, 0);
    lin("reflectGrad", [[0, "#ffe2a8", 0.55], [1, "#ffe2a8", 0]]);
    lin("busBody", [[0, "#323c52"], [1, "#151a25"]]);
    lin("emulsion", [[0, "#000", 0.28], [0.25, "#000", 0], [0.8, "#000", 0.05], [1, "#000", 0.32]]);
    lin("barFade", [[0, C.bar, 1], [1, C.bar, 0]]);
    rad("poolGrad", [[0, C.sodium, 0.55], [0.5, C.sodiumDeep, 0.18], [1, C.sodiumDeep, 0]]);
    rad("haloGrad", [[0, "#fff6dc", 0.95], [0.25, "#ffe2a8", 0.45], [1, "#ffb347", 0]]);
    rad("coldHalo", [[0, "#eef5ff", 0.9], [0.3, C.moon, 0.35], [1, C.moon, 0]]);
    rad("redHalo", [[0, "#ff9aa3", 0.8], [1, C.alarm, 0]]);
    rad("scrimGrad", [[0, "#05070d", 0.85], [0.6, "#05070d", 0.55], [1, "#05070d", 0]]);
    rad("hazeGrad", [[0, C.sodium, 0.22], [1, C.sodium, 0]]);
    const vig = rad("vignette", [[0.55, "#000", 0], [1, "#000", 0.72]]);
    vig.setAttribute("r", "0.75");

    const blur = (id, sd) => {
      const f = el("filter", { id, x: "-50%", y: "-50%", width: "200%", height: "200%" }, d);
      el("feGaussianBlur", { stdDeviation: sd }, f);
      return f;
    };
    blur("soft", 6);
    blur("softer", 18);
    blur("streak", 3);

    const glow = (id, sd) => {
      const f = el("filter", { id, x: "-40%", y: "-40%", width: "180%", height: "180%" }, d);
      el("feGaussianBlur", { in: "SourceGraphic", stdDeviation: sd, result: "b" }, f);
      const m = el("feMerge", {}, f);
      el("feMergeNode", { in: "b" }, m);
      el("feMergeNode", { in: "b" }, m);
      el("feMergeNode", { in: "SourceGraphic" }, m);
      return f;
    };
    glow("glow", 4);
    glow("neonGlow", 7);

    const grain = el("filter", { id: "grain", x: 0, y: 0, width: "100%", height: "100%" }, d);
    el("feTurbulence", {
      type: "fractalNoise", baseFrequency: 0.9, numOctaves: 2, seed: 7,
      stitchTiles: "stitch",
    }, grain);
    el("feColorMatrix", { type: "saturate", values: 0 }, grain);

    // Rain: a tile of thin slanted streaks, panned by Cine.weather().
    const rain = el("pattern", {
      id: "rain", width: 160, height: 220, patternUnits: "userSpaceOnUse",
    }, d);
    const r = rng(11);
    for (let i = 0; i < 16; i++) {
      const x = r() * 160;
      const y = r() * 220;
      const len = 18 + r() * 26;
      el("line", {
        x1: x, y1: y, x2: x - len * 0.2, y2: y + len,
        stroke: "#b8c6e0", "stroke-width": 1.4, "stroke-opacity": 0.35 + r() * 0.5,
      }, rain);
    }
    return d;
  }

  /**
   * Letterbox frame: bars, picture group (clipped), tag, stamp, source line
   * and scene counter. Returns { picture, setTag, setSource, setScene }.
   */
  function frame(svg, opts) {
    const defsNode = svg.querySelector("defs");
    const clip = el("clipPath", { id: "pictureClip" }, defsNode);
    el("rect", { x: 0, y: FRAME.top, width: FRAME.width, height: FRAME.bottom - FRAME.top }, clip);

    const picture = el("g", { id: "picture", "clip-path": "url(#pictureClip)" }, svg);
    const overlay = el("g", { id: "pictureOverlay", "clip-path": "url(#pictureClip)", "pointer-events": "none" }, svg);
    const bars = el("g", { id: "bars" }, svg);
    el("rect", { x: 0, y: 0, width: 1920, height: FRAME.top, fill: C.bar }, bars);
    el("rect", { x: 0, y: FRAME.bottom, width: 1920, height: 1080 - FRAME.bottom, fill: C.bar }, bars);

    // Headline tag: fixed top-left inside the upper bar, like a chapter card.
    const tagG = el("g", { id: "tag" }, bars);
    el("rect", { x: 64, y: 38, width: 4, height: 50, fill: C.sodium }, tagG);
    const tagSlots = [0, 1].map(() =>
      text(tagG, "", {
        x: 88, y: 80, fill: C.paper, "font-family": FONT.display,
        "font-style": "italic", "font-weight": 600, "font-size": 60,
        style: "transition: opacity 500ms ease",
      }));
    let tagIndex = 0;

    // Stamp: fixed top-right, like a print's rating/lab card.
    const stampG = el("g", { id: "stamp" }, bars);
    const stampText = text(stampG, opts.stamp || "ILLUSTRATIVE", {
      x: 1848, y: 71, "text-anchor": "end", fill: C.sodium,
      "font-family": FONT.ui, "font-weight": 600, "font-size": 24,
      "letter-spacing": 6,
    });
    const stampBox = el("rect", {
      y: 40, height: 44, rx: 3, fill: "none", stroke: C.sodium,
      "stroke-width": 2,
    }, stampG);

    const sourceText = text(bars, "", {
      id: "source", x: 72, y: 1030, fill: C.muted, "font-family": FONT.ui,
      "font-weight": 400, "font-size": 24, "letter-spacing": 0.5,
      style: "transition: opacity 500ms ease",
    });
    const sceneText = text(bars, "", {
      id: "scene", x: 1848, y: 1030, "text-anchor": "end", fill: "#c99a5b",
      "font-family": FONT.ui, "font-weight": 600, "font-size": 22,
      "letter-spacing": 5,
    });

    function layoutStamp() {
      const w = stampText.getComputedTextLength();
      stampBox.setAttribute("x", 1848 - w - 22);
      stampBox.setAttribute("width", w + 36);
      stampText.setAttribute("x", 1848 - 8);
    }

    return {
      picture,
      overlay,
      layoutStamp,
      /** Cross-fade the tag to new words (instant=true skips the fade). */
      setTag(words, instant) {
        const next = tagSlots[1 - tagIndex];
        const prev = tagSlots[tagIndex];
        tagG.querySelector("rect").style.opacity = words ? 1 : 0;
        if (prev.textContent === words) return;
        next.textContent = words;
        [next, prev].forEach((n) => (n.style.transition = instant ? "none" : ""));
        next.style.opacity = 1;
        prev.style.opacity = 0;
        tagIndex = 1 - tagIndex;
        tagG.querySelector("rect").style.opacity = words ? 1 : 0;
      },
      setSource(words) {
        sourceText.textContent = words;
      },
      setScene(words) {
        sceneText.textContent = words;
      },
    };
  }

  /** Night sky with a sodium haze along the horizon line y. */
  function sky(parent, horizonY) {
    const g = el("g", { class: "sky" }, parent);
    el("rect", { x: 0, y: FRAME.top, width: 1920, height: horizonY - FRAME.top + 40, fill: "url(#skyGrad)" }, g);
    el("ellipse", { cx: 960, cy: horizonY, rx: 1100, ry: 170, fill: "url(#hazeGrad)" }, g);
    return g;
  }

  /**
   * City skyline silhouettes standing on baseY, with lit windows.
   * opts: { x0, x1, minH, maxH, seed, fill, windowRate }
   */
  function skyline(parent, baseY, opts) {
    const o = Object.assign({ x0: 0, x1: 1920, minH: 40, maxH: 220, seed: 3, fill: C.building, windowRate: 0.12, beacons: true }, opts);
    const r = rng(o.seed);
    const g = el("g", { class: "skyline" }, parent);
    let x = o.x0;
    while (x < o.x1) {
      const w = 40 + r() * 110;
      const h = o.minH + Math.pow(r(), 1.6) * (o.maxH - o.minH);
      el("rect", { x, y: baseY - h, width: w + 1, height: h + 2, fill: o.fill }, g);
      if (r() < 0.25 && o.beacons) {
        el("rect", { x: x + w * 0.4, y: baseY - h - 18, width: 3, height: 18, fill: o.fill }, g);
        el("circle", { cx: x + w * 0.4 + 1.5, cy: baseY - h - 19, r: 2.5, fill: C.alarm, opacity: 0.8 }, g);
      }
      for (let wy = baseY - h + 10; wy < baseY - 8; wy += 14) {
        for (let wx = x + 6; wx < x + w - 8; wx += 11) {
          if (r() < o.windowRate) {
            el("rect", {
              x: wx, y: wy, width: 5, height: 7,
              fill: r() < 0.75 ? C.window : C.windowCold, opacity: 0.35 + r() * 0.5,
            }, g);
          }
        }
      }
      x += w + r() * 6;
    }
    return g;
  }

  /**
   * Facade drawn in perspective from a quad (near-top, far-top, far-bottom,
   * near-bottom). Windows are placed with bilinear interpolation.
   */
  function facade(parent, quad, opts) {
    const o = Object.assign({ cols: 14, rows: 6, seed: 5, fill: C.silhouette, windowRate: 0.3 }, opts);
    const [nt, ft, fb, nb] = quad;
    const g = el("g", { class: "facade" }, parent);
    el("path", { d: `M${nt}L${ft}L${fb}L${nb}Z`, fill: o.fill }, g);
    const r = rng(o.seed);
    const at = (u, v) => {
      const top = [lerp(nt[0], ft[0], u), lerp(nt[1], ft[1], u)];
      const bot = [lerp(nb[0], fb[0], u), lerp(nb[1], fb[1], u)];
      return [lerp(top[0], bot[0], v), lerp(top[1], bot[1], v)];
    };
    // Columns get denser toward the vanishing point: u is warped.
    for (let i = 0; i < o.cols; i++) {
      const u0 = 1 - Math.pow(1 - i / o.cols, 0.55);
      const u1 = 1 - Math.pow(1 - (i + 0.55) / o.cols, 0.55);
      for (let j = 0; j < o.rows; j++) {
        if (r() > o.windowRate) continue;
        const v0 = 0.08 + (j / o.rows) * 0.8;
        const v1 = v0 + 0.55 * (0.8 / o.rows);
        const p = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
        el("path", {
          d: `M${p[0]}L${p[1]}L${p[2]}L${p[3]}Z`,
          fill: r() < 0.8 ? C.window : C.windowCold, opacity: 0.25 + r() * 0.45,
        }, g);
      }
    }
    return g;
  }

  /**
   * Sodium street lamp: pole, head, light cone, ground pool and a wet-road
   * reflection streak. (x, y) is the pole foot; s scales it. Returns group.
   * opts.coneClip: a <clipPath> to which the cone shape is added (lit rain).
   */
  function lamp(parent, x, y, s, opts) {
    const o = Object.assign({ height: 300, arm: 40, side: 1, bright: 1, coneClip: null, reflect: true }, opts);
    const g = el("g", { class: "lamp" }, parent);
    const h = o.height * s;
    const hx = x + o.arm * s * o.side;
    const hy = y - h;
    const spread = 120 * s;
    const pool = el("ellipse", { cx: hx, cy: y + 6 * s, rx: spread * 1.5, ry: spread * 0.38, fill: "url(#poolGrad)", opacity: o.bright }, g);
    const conePts = `M${hx - 8 * s},${hy + 6 * s} L${hx + 8 * s},${hy + 6 * s} L${hx + spread},${y} L${hx - spread},${y} Z`;
    el("path", { d: conePts, fill: "url(#coneGrad)", opacity: 0.85 * o.bright, filter: "url(#soft)" }, g);
    if (o.coneClip) el("path", { d: conePts }, o.coneClip);
    if (o.reflect) {
      el("ellipse", {
        cx: hx, cy: y + 50 * s, rx: 18 * s, ry: 60 * s,
        fill: "url(#reflectGrad)", opacity: 0.35 * o.bright, filter: "url(#soft)",
      }, g);
    }
    el("rect", { x: x - 3 * s, y: hy, width: 6 * s, height: h, fill: "#0d0f15" }, g);
    el("path", {
      d: `M${x},${hy + 4 * s} Q${x},${hy - 6 * s} ${hx},${hy - 4 * s}`,
      stroke: "#0d0f15", "stroke-width": 5 * s, fill: "none",
    }, g);
    el("rect", { x: hx - 14 * s, y: hy - 6 * s, width: 28 * s, height: 8 * s, rx: 3 * s, fill: "#1a1c22" }, g);
    el("ellipse", { cx: hx, cy: hy + 3 * s, rx: 30 * s, ry: 16 * s, fill: "url(#haloGrad)", opacity: o.bright }, g);
    el("ellipse", { cx: hx, cy: hy + 2 * s, rx: 10 * s, ry: 3 * s, fill: "#fff0c8" }, g);
    g.dataset.head = `${hx},${hy}`;
    void pool;
    return g;
  }

  /** Vertical blurred reflection streak on wet asphalt at (x, y). */
  function reflection(parent, x, y, len, width, color, opacity) {
    return el("rect", {
      x: x - width / 2, y, width, height: len, fill: color, opacity,
      filter: "url(#streak)",
    }, parent);
  }

  /** Rain over the picture; litClipId adds brighter amber rain in cones. */
  function rainLayer(parent, opacity, litClipId) {
    const g = el("g", { class: "rain" }, parent);
    el("rect", { x: 0, y: FRAME.top, width: 1920, height: FRAME.bottom - FRAME.top, fill: "url(#rain)", opacity }, g);
    if (litClipId) {
      const lit = el("g", { "clip-path": `url(#${litClipId})` }, g);
      el("rect", { x: 0, y: FRAME.top, width: 1920, height: FRAME.bottom - FRAME.top, fill: "url(#rain)", opacity: 1, style: "mix-blend-mode: screen" }, lit);
      el("rect", { x: 0, y: FRAME.top, width: 1920, height: FRAME.bottom - FRAME.top, fill: C.sodium, opacity: 0.05 }, lit);
    }
    return g;
  }

  /** Film grain + vignette over the picture (static, not animated). */
  function grainAndVignette(parent) {
    const g = el("g", { class: "grade", "pointer-events": "none" }, parent);
    el("rect", { x: 0, y: FRAME.top, width: 1920, height: FRAME.bottom - FRAME.top, fill: "url(#vignette)" }, g);
    el("rect", {
      x: 0, y: FRAME.top, width: 1920, height: FRAME.bottom - FRAME.top,
      filter: "url(#grain)", opacity: 0.09, style: "mix-blend-mode: overlay",
    }, g);
    return g;
  }

  /*
   * Characters. A figure faces +x, feet at (0,0), ~200 units tall at s=1.
   * Each pose is drawn twice: an amber copy nudged up-left (rim light from a
   * street lamp) and the black silhouette on top. Poses live in sibling
   * groups so a pose change is a cross-fade, not a redraw.
   */
  // Pose fields: lean (deg), head [x,y], headTilt (deg, + = looks down),
  // umbrella "open" | "inverted" (blown inside out) | "hanging" (furled,
  // hangs from the back hand), tilt (umbrella deg), freeArm (back arm path),
  // frontArm (front arm path; defaults to holding the umbrella up), watch
  // [x,y] (a lit wristwatch face), gust (wind ticks beside the umbrella).
  // Big, readable gestures only: a silhouette has no face, so the arm,
  // the head angle and the umbrella carry the emotion.
  const POSES = {
    wait: { lean: 0, head: [2, -156], headTilt: 0, umbrella: "open", tilt: 0, freeArm: "M-14,-130 L-22,-104 L-18,-80" },
    watch: { lean: 2, head: [5, -153], headTilt: 22, umbrella: "open", tilt: 10, freeArm: "M-14,-130 L-2,-104 L26,-128", watch: [26, -128] },
    alarm: { lean: -8, head: [0, -157], headTilt: -12, umbrella: "inverted", tilt: -26, freeArm: "M-10,-132 L26,-142 L66,-156", gust: true },
    resolved: { lean: 3, head: [3, -158], headTilt: -12, umbrella: "hanging", tilt: 0, freeArm: "M-14,-130 L-20,-104 L-22,-84", frontArm: "M12,-134 L38,-150 L62,-176" },
  };

  function drawFigureShape(g, pose, fill, o) {
    const body = el("g", { transform: `rotate(${pose.lean})` }, g);
    // Legs and shoes.
    el("path", { d: "M-13,0 L-10,-64 L-1,-64 L-3,0 Z M3,0 L1,-64 L10,-64 L13,0 Z", fill }, body);
    el("path", { d: "M-16,0 L-1,0 L-1,-6 L-12,-6 Z M3,0 L19,0 L15,-6 L3,-6 Z", fill }, body);
    // Long coat.
    el("path", { d: "M-19,-140 C-25,-112 -30,-84 -33,-54 L31,-54 C28,-84 24,-112 18,-140 Q0,-146 -19,-140 Z", fill }, body);
    el("path", { d: o.freeArmPath, stroke: fill, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" }, body);
    // Head with a short-brim hat.
    const [hx, hy] = pose.head;
    el("rect", { x: -5, y: -148, width: 10, height: 10, fill }, body);
    const head = el("g", { transform: `rotate(${pose.headTilt || 0} 0 -144)` }, body);
    el("circle", { cx: hx, cy: hy, r: 13, fill }, head);
    el("path", { d: `M${hx + 9},${hy - 2} L${hx + 17},${hy + 3} L${hx + 10},${hy + 6} Z`, fill }, head);
    el("ellipse", { cx: hx + 1, cy: hy - 9, rx: 20, ry: 4, fill }, head);
    el("path", { d: `M${hx - 11},${hy - 9} Q${hx - 10},${hy - 25} ${hx + 1},${hy - 25} Q${hx + 12},${hy - 25} ${hx + 12},${hy - 9} Z`, fill }, head);
    // Front arm + umbrella.
    const armAttrs = { stroke: fill, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" };
    el("path", Object.assign({ d: pose.frontArm || "M12,-132 L26,-110 L24,-140" }, armAttrs), body);
    if (pose.umbrella === "open" || pose.umbrella === "inverted") {
      const u = el("g", { transform: `rotate(${pose.tilt} 24 -142)` }, body);
      el("path", { d: "M24,-138 L24,-246 M24,-138 Q24,-128 17,-130", stroke: fill, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, u);
      if (pose.umbrella === "open") {
        let d = "M-44,-206 Q-40,-252 24,-256 Q88,-252 92,-206";
        const scallops = 6;
        for (let i = scallops; i > 0; i--) {
          const x0 = -44 + (i / scallops) * 136;
          const x1 = -44 + ((i - 1) / scallops) * 136;
          d += ` Q${(x0 + x1) / 2},${-216} ${x1},${-206}`;
        }
        el("path", { d: d + "Z", fill }, u);
        el("path", { d: "M24,-256 L24,-266", stroke: fill, "stroke-width": 4 }, u);
      } else {
        // Blown inside out: the canopy is a cup opening upward, ribs splayed.
        el("path", { d: "M-54,-306 Q-14,-252 24,-240 Q62,-252 102,-306 Q78,-292 60,-300 Q42,-286 24,-296 Q6,-286 -12,-300 Q-30,-292 -54,-306 Z", fill, stroke: fill, "stroke-width": 4, "stroke-linejoin": "round" }, u);
        el("path", { d: "M24,-240 L-58,-312 M24,-240 L-12,-306 M24,-240 L60,-306 M24,-240 L106,-312", stroke: fill, "stroke-width": 3.5, "stroke-linecap": "round", fill: "none" }, u);
      }
    } else {
      // Furled umbrella hanging straight down from the back hand.
      el("path", { d: "M-23,-86 L-17,-80 L-21,-6 L-25,-6 L-29,-80 Z", fill, stroke: fill, "stroke-width": 2, "stroke-linejoin": "round" }, body);
      el("path", { d: "M-22,-82 Q-22,-96 -12,-94", fill: "none", stroke: fill, "stroke-width": 4, "stroke-linecap": "round" }, body);
    }
  }

  /**
   * Draw a figure with every pose in `poses`. opts: { scarf, rim, poses }.
   * Returns { g, poses: {name: group} } — fade pose groups to change pose.
   */
  function figure(parent, opts) {
    const o = Object.assign({ scarf: true, rim: C.sodium, poses: ["wait"], id: null }, opts);
    const g = el("g", { id: o.id, class: "figure" }, parent);
    el("ellipse", { cx: 0, cy: 2, rx: 38, ry: 7, fill: "#000", opacity: 0.55 }, g);
    const out = {};
    o.poses.forEach((name) => {
      const pose = POSES[name];
      const pg = el("g", { class: `pose pose-${name}` }, g);
      const shape = { freeArmPath: pose.freeArm };
      const rim = el("g", { transform: "translate(-2.8,-2)" }, pg);
      drawFigureShape(rim, pose, o.rim, shape);
      drawFigureShape(pg, pose, C.silhouette, shape);
      if (o.scarf) {
        const sc = el("g", { transform: `rotate(${pose.lean})` }, pg);
        el("path", { d: "M-13,-143 Q2,-135 17,-143 L15,-133 Q2,-127 -11,-133 Z", fill: C.sodium }, sc);
        el("path", { d: "M-9,-136 L-17,-104 L-8,-106 L-2,-133 Z", fill: C.sodiumDeep }, sc);
      }
      if (pose.watch) {
        // A lit watch face, big enough to read as "checks the time" at 0.5x.
        const [wx, wy] = pose.watch;
        const lean = `rotate(${pose.lean})`;
        const w = el("g", { transform: lean }, pg);
        el("circle", { cx: wx, cy: wy, r: 14, fill: "url(#haloGrad)" }, w);
        el("circle", { cx: wx, cy: wy, r: 6.5, fill: "#fff3c4", stroke: C.silhouette, "stroke-width": 1.5 }, w);
        el("path", { d: `M${wx},${wy} L${wx},${wy - 4.5} M${wx},${wy} L${wx + 3.5},${wy + 1}`, stroke: C.silhouette, "stroke-width": 1.4, "stroke-linecap": "round" }, w);
      }
      if (pose.gust && o.scarf) {
        // Wind ticks: the gust that turned the umbrella inside out.
        const w = el("g", { opacity: 0.85 }, pg);
        ["M-150,-250 Q-122,-258 -94,-250", "M-162,-222 Q-130,-230 -100,-222", "M-146,-194 Q-122,-200 -98,-194"].forEach((d) =>
          el("path", { d, stroke: C.moon, "stroke-width": 3, "stroke-linecap": "round", fill: "none" }, w));
      }
      out[name] = pg;
    });
    return { g, poses: out };
  }

  /*
   * Bus. One group with a side view (facing +x) and a front view; fade
   * between them with the `view` value. The route letter sits on a plate that
   * is never mirrored, so it always reads correctly.
   */
  function bus(parent, opts) {
    const o = Object.assign({ id: null, letter: "", livery: C.sodium }, opts);
    const g = el("g", { id: o.id, class: "bus" }, parent);
    el("ellipse", { cx: 0, cy: 2, rx: 104, ry: 11, fill: "#000", opacity: 0.6, class: "bus-shadow" }, g);

    const side = el("g", { class: "bus-side" }, g);
    const body = el("g", { class: "bus-body" }, side);
    el("path", { d: "M96,-28 L320,-48 L320,8 Z", fill: "url(#beamGrad)", opacity: 0.55, filter: "url(#soft)" }, body);
    el("rect", { x: -98, y: -106, width: 196, height: 96, rx: 12, fill: "url(#busBody)" }, body);
    el("rect", { x: -98, y: -106, width: 196, height: 5, rx: 3, fill: "#5d6a86", opacity: 0.7 }, body);
    el("rect", { x: -88, y: -96, width: 170, height: 32, rx: 3, fill: C.window, opacity: 0.92 }, body);
    for (let i = 0; i < 6; i++) {
      el("rect", { x: -60 + i * 26, y: -96, width: 4, height: 32, fill: "#1b2130" }, body);
    }
    // Passengers' heads, so the windows read as an occupied bus.
    [-74, -40, -18, 26, 56].forEach((px, i) =>
      el("circle", { cx: px, cy: -76 + (i % 2) * 2, r: 6, fill: "#3a2a17", opacity: 0.85 }, body));
    el("path", { d: "M84,-96 L96,-96 L97,-44 L84,-44 Z", fill: "#f7d9a0", opacity: 0.55 }, body);
    el("rect", { x: -98, y: -58, width: 196, height: 7, fill: o.livery }, body);
    el("rect", { x: 66, y: -50, width: 18, height: 38, fill: "#0e121b" }, body);
    el("circle", { cx: 94, cy: -26, r: 5, fill: "#fff6dc" }, body);
    el("ellipse", { cx: 96, cy: -26, rx: 34, ry: 22, fill: "url(#haloGrad)" }, body);
    el("rect", { x: -98, y: -32, width: 5, height: 10, fill: C.alarm }, body);
    [-58, 56].forEach((wx) => {
      el("circle", { cx: wx, cy: -10, r: 14, fill: "#07080c" }, body);
      el("circle", { cx: wx, cy: -10, r: 6, fill: "#2c3242" }, body);
    });
    const plate = el("g", { class: "bus-plate" }, side);
    el("rect", { x: -40, y: -50, width: 52, height: 46, rx: 6, fill: o.livery }, plate);
    text(plate, o.letter, {
      x: -14, y: -11, "text-anchor": "middle", fill: "#0b0d14",
      "font-family": FONT.ui, "font-weight": 700, "font-size": 46,
    });

    const front = el("g", { class: "bus-front" }, g);
    el("rect", { x: -66, y: -158, width: 132, height: 150, rx: 14, fill: "url(#busBody)" }, front);
    // Destination sign: the route letter, as real buses show it, so a bus
    // seen head-on in the street set-up is still identifiable.
    el("rect", { x: -56, y: -150, width: 112, height: 34, rx: 3, fill: "#0b0d14" }, front);
    if (o.letter) {
      el("rect", { x: -20, y: -147, width: 40, height: 28, rx: 3, fill: o.livery }, front);
      text(front, o.letter, {
        x: 0, y: -124, "text-anchor": "middle", fill: "#0b0d14",
        "font-family": FONT.ui, "font-weight": 700, "font-size": 28,
      });
    } else {
      el("rect", { x: -46, y: -142, width: 92, height: 18, rx: 2, fill: C.window, opacity: 0.8 }, front);
    }
    el("rect", { x: -58, y: -110, width: 116, height: 52, rx: 6, fill: "#3b3222" }, front);
    el("path", { d: "M-52,-106 L-20,-106 L-46,-62 L-56,-62 Z", fill: "#f7e3b8", opacity: 0.18 }, front);
    el("rect", { x: -66, y: -50, width: 132, height: 7, fill: o.livery }, front);
    el("rect", { x: -60, y: -18, width: 120, height: 10, rx: 3, fill: "#0b0d14" }, front);
    [-44, 44].forEach((lx) => {
      el("ellipse", { cx: lx, cy: -30, rx: 70, ry: 46, fill: "url(#haloGrad)" }, front);
      el("circle", { cx: lx, cy: -30, r: 8, fill: "#fffaf0" }, front);
      el("ellipse", { cx: lx, cy: 34, rx: 16, ry: 46, fill: "url(#reflectGrad)", opacity: 0.45, filter: "url(#soft)" }, front);
    });

    return { g, side, body, front, plate };
  }

  /**
   * Place a bus. p: { x, y, s, rot, flip (-1..1), view (0 side, 1 front),
   * opacity }. The plate counter-flips so its letter never mirrors.
   */
  function placeBus(b, p) {
    b.g.setAttribute("transform", `translate(${p.x},${p.y}) rotate(${p.rot || 0}) scale(${p.s})`);
    b.g.setAttribute("opacity", p.opacity ?? 1);
    const flip = Math.abs(p.flip) < 0.04 ? 0.04 * Math.sign(p.flip || 1) : p.flip;
    b.body.setAttribute("transform", `scale(${flip},1)`);
    b.plate.setAttribute("transform", `translate(${(flip < 0 ? 28 : 0) * Math.abs(flip)},0) scale(${Math.abs(flip)},1)`);
    b.side.setAttribute("opacity", 1 - p.view);
    b.front.setAttribute("opacity", p.view);
  }

  /**
   * A closed route drawn as a ground-plane ellipse seen at an oblique angle.
   * Positions are in "minutes along the lap": pos 0..lap. Larger pos is
   * further along the direction of travel. Returns point/arc helpers.
   */
  function ellipseRoute(cfg) {
    const o = Object.assign({ cx: 960, cy: 600, rx: 660, ry: 165, theta0: 110, lap: 20, minScale: 0.74 }, cfg);
    const thetaOf = (pos) => ((o.theta0 - (360 / o.lap) * pos) * Math.PI) / 180;
    function point(pos) {
      const t = thetaOf(pos);
      const x = o.cx + o.rx * Math.cos(t);
      const y = o.cy + o.ry * Math.sin(t);
      const depth = (Math.sin(t) + 1) / 2; // 0 far side, 1 near side
      const dx = o.rx * Math.sin(t);
      const dy = -o.ry * Math.cos(t);
      const len = Math.hypot(dx, dy);
      const flip = clamp((dx / len) * 2.4, -1, 1);
      let rot = dx >= 0 ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx);
      rot = clamp((rot * 180) / Math.PI, -12, 12);
      const s = lerp(o.minScale, 1, depth);
      return { x, y, depth, flip, rot, s, halfWidth: lerp(15, 30, depth) };
    }
    function arcPath(p0, p1, offset) {
      const steps = Math.max(2, Math.ceil(Math.abs(p1 - p0) * 6));
      let d = "";
      for (let i = 0; i <= steps; i++) {
        const pt = point(lerp(p0, p1, i / steps));
        d += `${i ? "L" : "M"}${pt.x.toFixed(1)},${(pt.y + (offset || 0)).toFixed(1)}`;
      }
      return d;
    }
    function ringPath() {
      const outer = [];
      const inner = [];
      for (let i = 0; i <= 120; i++) {
        const pt = point((i / 120) * o.lap);
        const t = thetaOf((i / 120) * o.lap);
        // Offset along the ellipse normal, scaled by depth so the road narrows.
        const nx = Math.cos(t) * pt.halfWidth * (o.rx / o.ry) * 0.18;
        const ny = Math.sin(t) * pt.halfWidth;
        outer.push(`${(pt.x + nx).toFixed(1)},${(pt.y + ny).toFixed(1)}`);
        inner.push(`${(pt.x - nx).toFixed(1)},${(pt.y - ny).toFixed(1)}`);
      }
      return `M${outer.join("L")}Z M${inner.reverse().join("L")}Z`;
    }
    return { point, arcPath, ringPath, cfg: o };
  }

  /** Draw the road ring for an ellipseRoute, with kerb glints and centre dashes. */
  function roadRing(parent, route) {
    const g = el("g", { class: "road" }, parent);
    el("path", { d: route.ringPath(), fill: C.asphaltLit, "fill-rule": "evenodd" }, g);
    el("path", { d: route.ringPath(), fill: "none", stroke: "#3a4154", "stroke-width": 2 }, g);
    el("path", {
      d: route.arcPath(0, route.cfg.lap), fill: "none", stroke: "#5a5f6e",
      "stroke-width": 2, "stroke-dasharray": "14 18", opacity: 0.6,
    }, g);
    return g;
  }

  /**
   * Film-strip gauge: `frames` frames, one per unit, split into two runs.
   * opts: { x, y, frames, fw, fh, colorA, colorB, labelA(v), labelB(v), unit }
   * Returns { g, set(splitValue) }. Labels sit under each run and never
   * collide: a narrow run's label pins to the strip's end.
   */
  function filmStrip(parent, opts) {
    const o = Object.assign({ x: 120, y: 820, frames: 20, fw: 46, fh: 44, colorA: C.sodium, colorB: C.moon }, opts);
    const g = el("g", { id: o.id || null, class: "film-strip" }, parent);
    const w = o.frames * o.fw;
    const band = 9;
    el("rect", { x: o.x - 10, y: o.y - band - 4, width: w + 20, height: o.fh + 2 * band + 8, rx: 4, fill: "#0d0b08", stroke: "#2b261c", "stroke-width": 2 }, g);
    const runA = el("rect", { x: o.x, y: o.y, height: o.fh, fill: o.colorA }, g);
    const runB = el("rect", { y: o.y, height: o.fh, fill: o.colorB }, g);
    // Frame lines and sprocket holes drawn over the runs.
    for (let i = 0; i <= o.frames; i++) {
      el("rect", { x: o.x + i * o.fw - 1.5, y: o.y, width: 3, height: o.fh, fill: "#0d0b08" }, g);
    }
    for (let i = 0; i < o.frames * 2; i++) {
      const sx = o.x + (i + 0.5) * (o.fw / 2) - 4;
      el("rect", { x: sx, y: o.y - band + 1, width: 8, height: 6, rx: 1.5, fill: "#5b5244" }, g);
      el("rect", { x: sx, y: o.y + o.fh + 2, width: 8, height: 6, rx: 1.5, fill: "#5b5244" }, g);
    }
    const splice = el("g", { class: "splice" }, g);
    el("rect", { x: -3, y: o.y - band - 14, width: 6, height: o.fh + 2 * band + 28, fill: C.paper }, splice);
    el("path", { d: `M-10,${o.y - band - 22} L10,${o.y - band - 22} L0,${o.y - band - 10} Z`, fill: C.paper }, splice);

    el("rect", { x: o.x, y: o.y, width: w, height: o.fh, fill: "url(#emulsion)" }, g);
    const baseY = o.y + o.fh + band + 50;
    const la = arrowLabel(g, o.namesA[0], o.namesA[1], o.colorA, baseY);
    const lb = arrowLabel(g, o.namesB[0], o.namesB[1], o.colorB, baseY);

    function set(split) {
      const v = clamp(split, 0, o.frames);
      runA.setAttribute("width", v * o.fw);
      runB.setAttribute("x", o.x + v * o.fw);
      runB.setAttribute("width", (o.frames - v) * o.fw);
      splice.setAttribute("transform", `translate(${o.x + v * o.fw},0)`);
      la.setValue(o.format(v));
      lb.setValue(o.format(o.frames - v));
      const wa = la.width();
      const wb = lb.width();
      let ax = o.x + (v * o.fw) / 2 - wa / 2;
      let bx = o.x + v * o.fw + ((o.frames - v) * o.fw) / 2 - wb / 2;
      ax = clamp(ax, o.x, o.x + w - wa);
      bx = clamp(bx, o.x, o.x + w - wb);
      if (ax + wa + 40 > bx) {
        // Runs too narrow to centre both labels: pin to the strip's ends.
        if (v > o.frames / 2) bx = o.x + w - wb, ax = Math.min(ax, bx - wa - 40);
        else ax = o.x, bx = Math.max(bx, ax + wa + 40);
      }
      la.setX(ax);
      lb.setX(bx);
    }
    return { g, set };
  }

  /**
   * "A -> B  12 min" label with a drawn arrow (no arrow glyph needed).
   * Returns { g, setValue(text), width(), setX(x) }.
   */
  function arrowLabel(parent, from, to, color, y) {
    const g = el("g", {}, parent);
    const nameAttrs = { y, fill: color, "font-family": FONT.ui, "font-weight": 600, "font-size": 30, "letter-spacing": 1 };
    const t1 = text(g, from, nameAttrs);
    const ar = el("path", { stroke: color, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    const t2 = text(g, to, nameAttrs);
    const tv = text(g, "", { y, fill: color, "font-family": FONT.ui, "font-weight": 700, "font-size": 40 });
    const arrowLen = 30;
    let x0 = 0;
    const layout = () => {
      const w1 = t1.getComputedTextLength();
      const w2 = t2.getComputedTextLength();
      t1.setAttribute("x", x0);
      const ax = x0 + w1 + 8;
      const ay = y - 11;
      ar.setAttribute("d", `M${ax},${ay} L${ax + arrowLen},${ay} M${ax + arrowLen - 8},${ay - 7} L${ax + arrowLen},${ay} L${ax + arrowLen - 8},${ay + 7}`);
      t2.setAttribute("x", ax + arrowLen + 8);
      tv.setAttribute("x", ax + arrowLen + 8 + w2 + 14);
    };
    return {
      g,
      setValue(v) { tv.textContent = v; },
      width() {
        return t1.getComputedTextLength() + t2.getComputedTextLength() + tv.getComputedTextLength() + arrowLen + 30;
      },
      setX(x) { x0 = x; layout(); },
    };
  }

  /** Small drawn arrow pointing +x from (x,y), length len. */
  function arrow(parent, x, y, len, color, width) {
    const w = width || 4;
    return el("path", {
      d: `M${x},${y} L${x + len},${y} M${x + len - 4 * w},${y - 3 * w} L${x + len},${y} L${x + len - 4 * w},${y + 3 * w}`,
      stroke: color, "stroke-width": w, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round",
    }, parent);
  }

  /**
   * Rooftop neon sign for a cycle of four stations, read clockwise from
   * top-left: labels sit on a 2x2 grid and neon arrows run between them
   * (right, down, left, up) so the loop is drawn, not implied. The stadium
   * tube is the sign's frame. Returns { g, set(n) }: n in 0..4 lights the
   * stations, and the arrow leaving each, one at a time.
   * opts: { x, y, w, h, labels[4], color, size, legs (px, 0 = none),
   * unlitBoard (keep the dark board visible while unlit) }. Stand it on a
   * Cine.rooftop() so it belongs to a building instead of floating.
   */
  function neonLoop(parent, opts) {
    const o = Object.assign({ x: 1200, y: 160, w: 600, h: 260, labels: [], color: C.alarm, size: 34, legs: 60, unlitBoard: false }, opts);
    // unlitBoard: the dark board stays visible before the sign switches on,
    // so lighting it is one nameable change ("the sign comes on").
    const board = el("g", { class: "neon-board" }, parent);
    const g = el("g", { id: o.id || null, class: "neon" }, parent);
    const boardParent = o.unlitBoard ? board : g;
    if (o.legs) {
      el("rect", { x: o.x + 80, y: o.y + o.h, width: 8, height: o.legs, fill: "#161820" }, boardParent);
      el("rect", { x: o.x + o.w - 88, y: o.y + o.h, width: 8, height: o.legs, fill: "#161820" }, boardParent);
    }
    el("rect", { x: o.x - 14, y: o.y - 14, width: o.w + 28, height: o.h + 28, rx: o.h / 2 + 14, fill: "#0b0c12", stroke: "#1d2130", "stroke-width": 3, opacity: 0.94 }, boardParent);
    const framePath = `M${o.x + o.h / 2},${o.y + 6} L${o.x + o.w - o.h / 2},${o.y + 6} A${o.h / 2 - 6},${o.h / 2 - 6} 0 0 1 ${o.x + o.w - o.h / 2},${o.y + o.h - 6} L${o.x + o.h / 2},${o.y + o.h - 6} A${o.h / 2 - 6},${o.h / 2 - 6} 0 0 1 ${o.x + o.h / 2},${o.y + 6} Z`;
    if (o.unlitBoard) {
      // Unlit glass tube: reads as "a neon sign, switched off", no labels.
      el("path", { d: framePath, stroke: "#4a3440", "stroke-width": 5, fill: "none" }, board);
    }

    const tube = (parentG, d, extra) => {
      el("path", Object.assign({ d, stroke: o.color, "stroke-width": 7, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#neonGlow)" }, extra), parentG);
      el("path", Object.assign({ d, stroke: C.alarmCore, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, extra), parentG);
    };
    const frameG = el("g", { opacity: 0.1 }, g);
    tube(frameG, framePath, { "stroke-width": 5 });

    const q1 = o.x + o.w * 0.3;
    const q3 = o.x + o.w * 0.7;
    const topY = o.y + o.h * 0.36;
    const botY = o.y + o.h * 0.8;
    const spots = [[q1, topY], [q3, topY], [q3, botY], [q1, botY]];
    const widths = [];
    const labels = o.labels.map((words, i) => {
      const [lx, ly] = spots[i];
      const lg = el("g", { opacity: 0.08 }, g);
      const attrs = { x: lx, y: ly, "text-anchor": "middle", "font-family": FONT.ui, "font-weight": 600, "font-size": o.size, "letter-spacing": 2 };
      text(lg, words, Object.assign({ fill: o.color, filter: "url(#neonGlow)" }, attrs));
      const t = text(lg, words, Object.assign({ fill: C.alarmCore }, attrs));
      widths.push(t.getComputedTextLength());
      return lg;
    });

    // Arrow geometry between stations, from the measured label widths.
    const capMid = o.size * 0.36; // vertical middle of capitals above baseline
    const pad = 18;
    const hArrow = (y, xFrom, xTo) => {
      const dir = Math.sign(xTo - xFrom);
      return `M${xFrom},${y} L${xTo},${y} M${xTo - dir * 12},${y - 11} L${xTo},${y} L${xTo - dir * 12},${y + 11}`;
    };
    const vArrow = (x, yFrom, yTo) => {
      const dir = Math.sign(yTo - yFrom);
      return `M${x},${yFrom} L${x},${yTo} M${x - 11},${yTo - dir * 12} L${x},${yTo} L${x + 11},${yTo - dir * 12}`;
    };
    const rowTop = topY - capMid;
    const rowBot = botY - capMid;
    const arrows = [
      hArrow(rowTop, q1 + widths[0] / 2 + pad, q3 - widths[1] / 2 - pad),
      vArrow(q3, topY + 14, botY - o.size * 0.8 - 6),
      hArrow(rowBot, q3 - widths[2] / 2 - pad, q1 + widths[3] / 2 + pad),
      vArrow(q1, botY - o.size * 0.8 - 6, topY + 14),
    ].map((d) => {
      const ag = el("g", { opacity: 0.1 }, g);
      tube(ag, d);
      return ag;
    });

    function set(n) {
      g.setAttribute("opacity", clamp(n * 3, 0, 1));
      frameG.setAttribute("opacity", lerp(0.1, 0.55, clamp(n, 0, 1)));
      labels.forEach((lg, i) => lg.setAttribute("opacity", lerp(0.08, 1, clamp(n - i, 0, 1))));
      arrows.forEach((ag, i) => ag.setAttribute("opacity", lerp(0.1, 1, clamp((n - i - 0.5) * 2, 0, 1))));
    }
    return { g, set };
  }

  /**
   * Bus-stop pole with a lit square flag showing a bus pictogram, foot at
   * (x, y), scaled by s. Use one per stop so stops can be counted.
   */
  function stopSign(parent, x, y, s, opts) {
    const o = Object.assign({ color: C.paper, ring: C.sodium, lit: false }, opts);
    const g = el("g", { class: "stop-sign" }, parent);
    const h = 64 * s;
    const f = 28 * s;
    if (o.lit) el("circle", { cx: x, cy: y - h - f / 2, r: f * 1.3, fill: "url(#haloGrad)", opacity: 0.6 }, g);
    el("rect", { x: x - 2 * s, y: y - h, width: 4 * s, height: h, fill: "#9aa0ae" }, g);
    el("rect", { x: x - f / 2, y: y - h - f, width: f, height: f, rx: 3 * s, fill: o.color, stroke: o.ring, "stroke-width": 2.5 * s }, g);
    // Bus pictogram: body, window band, two wheels.
    el("rect", { x: x - f * 0.32, y: y - h - f * 0.8, width: f * 0.64, height: f * 0.46, rx: 1.5 * s, fill: "#14171f" }, g);
    el("rect", { x: x - f * 0.26, y: y - h - f * 0.72, width: f * 0.52, height: f * 0.14, fill: o.color }, g);
    [-0.18, 0.18].forEach((u) => el("circle", { cx: x + f * u, cy: y - h - f * 0.3, r: f * 0.08, fill: "#14171f" }, g));
    return g;
  }

  /**
   * Clock tower silhouette standing on baseY with a lit face at (x, top+r).
   * Time is "HH:MM" (static). A waiting talk's quiet prop: time passing.
   */
  function clockTower(parent, x, baseY, opts) {
    const o = Object.assign({ width: 96, height: 300, r: 34, time: "21:50", fill: C.building }, opts);
    const g = el("g", { class: "clock-tower" }, parent);
    const top = baseY - o.height;
    el("path", { d: `M${x - o.width / 2},${baseY} L${x - o.width / 2},${top + 40} L${x},${top - 30} L${x + o.width / 2},${top + 40} L${x + o.width / 2},${baseY} Z`, fill: o.fill }, g);
    el("rect", { x: x - 1.5, y: top - 56, width: 3, height: 28, fill: o.fill }, g);
    const cy = top + 40 + o.r + 10;
    el("circle", { cx: x, cy, r: o.r * 1.7, fill: "url(#haloGrad)", opacity: 0.22 }, g);
    el("circle", { cx: x, cy, r: o.r, fill: "#f6dfae", stroke: "#3a2a17", "stroke-width": 3 }, g);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      el("line", { x1: x + Math.sin(a) * o.r * 0.78, y1: cy - Math.cos(a) * o.r * 0.78, x2: x + Math.sin(a) * o.r * 0.9, y2: cy - Math.cos(a) * o.r * 0.9, stroke: "#3a2a17", "stroke-width": 2 }, g);
    }
    const [hh, mm] = o.time.split(":").map(Number);
    const ma = (mm / 60) * Math.PI * 2;
    const ha = (((hh % 12) + mm / 60) / 12) * Math.PI * 2;
    el("line", { x1: x, y1: cy, x2: x + Math.sin(ha) * o.r * 0.5, y2: cy - Math.cos(ha) * o.r * 0.5, stroke: "#1b140c", "stroke-width": 4, "stroke-linecap": "round" }, g);
    el("line", { x1: x, y1: cy, x2: x + Math.sin(ma) * o.r * 0.78, y2: cy - Math.cos(ma) * o.r * 0.78, stroke: "#1b140c", "stroke-width": 2.5, "stroke-linecap": "round" }, g);
    for (let wy = cy + o.r + 30; wy < baseY - 20; wy += 34) {
      el("rect", { x: x - 6, y: wy, width: 12, height: 18, fill: C.window, opacity: 0.35 }, g);
    }
    return g;
  }

  /**
   * Rooftop for a sign: a building block whose roof is at roofY spanning
   * x0..x1, with lattice struts up to the sign's bottom edge (signY), and a
   * coloured light spill on the roof. Draw it before the sign.
   * opts: { struts, spill (colour), fill, baseY (building foot), seed }.
   * Returns { g, spill } — fade `spill` up when the sign lights.
   */
  function rooftop(parent, x0, x1, roofY, signY, opts) {
    const o = Object.assign({ spill: C.alarm, struts: 5, fill: "#080b13", baseY: roofY + 60, seed: 31 }, opts);
    const g = el("g", { class: "rooftop" }, parent);
    el("rect", { x: x0, y: roofY, width: x1 - x0, height: o.baseY - roofY, fill: o.fill }, g);
    const r = rng(o.seed);
    for (let wy = roofY + 12; wy < o.baseY - 10; wy += 16) {
      for (let wx = x0 + 14; wx < x1 - 14; wx += 22) {
        if (r() < 0.22) el("rect", { x: wx, y: wy, width: 9, height: 8, fill: C.window, opacity: 0.25 + r() * 0.4 }, g);
      }
    }
    el("rect", { x: x0, y: roofY, width: x1 - x0, height: 3, fill: "#2a2f3d" }, g);
    const step = (x1 - x0 - 120) / (o.struts - 1);
    for (let i = 0; i < o.struts; i++) {
      const sx = x0 + 60 + i * step;
      el("rect", { x: sx - 3, y: signY, width: 6, height: roofY - signY, fill: "#1a1d27" }, g);
      if (i < o.struts - 1) {
        el("path", { d: `M${sx},${roofY} L${sx + step},${signY} M${sx},${signY} L${sx + step},${roofY}`, stroke: "#1a1d27", "stroke-width": 3 }, g);
      }
    }
    el("rect", { x: x0, y: signY + (roofY - signY) / 2 - 2, width: x1 - x0, height: 4, fill: "#1a1d27" }, g);
    const spill = el("ellipse", { cx: (x0 + x1) / 2, cy: roofY, rx: (x1 - x0) * 0.55, ry: 26, fill: o.spill, opacity: 0.18, filter: "url(#softer)" }, g);
    return { g, spill };
  }

  /** Enamel stop-sign plate with a pause glyph and a short instruction. */
  function pausePlate(parent, x, y, words, opts) {
    const o = Object.assign({ size: 30, color: C.sodium }, opts);
    const g = el("g", { class: "pause-plate" }, parent);
    const t = text(g, words, { x: x + 64, y: y + o.size * 0.36, fill: C.paper, "font-family": FONT.ui, "font-weight": 600, "font-size": o.size, "letter-spacing": 2 });
    const w = t.getComputedTextLength();
    const box = el("rect", { x: x - 6, y: y - o.size * 0.95, width: w + 92, height: o.size * 1.9, rx: 6, fill: "#0e0f15", stroke: o.color, "stroke-width": 2.5 }, g);
    g.insertBefore(box, t);
    el("rect", { x: x + 14, y: y - o.size * 0.5, width: 10, height: o.size, rx: 2, fill: o.color }, g);
    el("rect", { x: x + 32, y: y - o.size * 0.5, width: 10, height: o.size, rx: 2, fill: o.color }, g);
    return g;
  }

  /*
   * Tween director. Holds named numeric values, interpolates them toward a
   * target with per-value [delayMs, durationMs] windows, and calls apply()
   * every frame. Deck states become plain objects of numbers.
   */
  function Director(apply) {
    this.cur = {};
    this.apply = apply;
    this.raf = 0;
  }
  /** Jump to values with no animation. */
  Director.prototype.set = function (vals) {
    cancelAnimationFrame(this.raf);
    Object.assign(this.cur, vals);
    this.apply(this.cur);
  };
  /** Animate to values. timing: { default: [delay, dur], key: [delay, dur] }. */
  Director.prototype.to = function (vals, timing, speed) {
    cancelAnimationFrame(this.raf);
    const k = speed ?? 1;
    const tracks = Object.keys(vals).map((key) => {
      const w = (timing && timing[key]) || (timing && timing.default) || [0, 850];
      const from = this.cur[key] ?? vals[key];
      return { key, a: from, b: vals[key], d: w[0] * k, du: Math.max(1, w[1] * k) };
    }).filter((t) => t.a !== t.b);
    const total = Math.max(0, ...tracks.map((t) => t.d + t.du));
    const start = performance.now();
    const step = (now) => {
      const t = now - start;
      tracks.forEach((tr) => {
        const p = clamp((t - tr.d) / tr.du, 0, 1);
        this.cur[tr.key] = lerp(tr.a, tr.b, easeInOut(p));
      });
      this.apply(this.cur);
      if (t < total) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  };

  /** Scale a fixed 1920x1080 stage element to fit the window, letterboxed. */
  function fitStage(stage) {
    const fit = () => {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      const x = (window.innerWidth - 1920 * s) / 2;
      const y = (window.innerHeight - 1080 * s) / 2;
      stage.style.transform = `translate(${x}px,${y}px) scale(${s})`;
    };
    window.addEventListener("resize", fit);
    fit();
  }

  /** Pan the rain pattern (idle life). Returns { setReduced(bool) }. */
  function weather() {
    const pattern = document.getElementById("rain");
    let reduced = false;
    let y = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!reduced) {
        y = (y + dt * 0.9) % 220;
        pattern.setAttribute("patternTransform", `translate(${(-y * 0.2).toFixed(1)},${y.toFixed(1)})`);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return { setReduced(v) { reduced = v; } };
  }

  /**
   * Keyboard + URL deck controller. cfg: { count, show(n, instant), notes[] }.
   * ?state=N shows N instantly. Arrows/space/PageUp/PageDown navigate,
   * N toggles speaker notes, M toggles reduced motion.
   */
  function deckControls(cfg) {
    const params = new URLSearchParams(location.search);
    let index = clamp(parseInt(params.get("state") || "0", 10) || 0, 0, cfg.count - 1);
    const notesBox = document.getElementById("notes");
    const go = (n, instant) => {
      index = clamp(n, 0, cfg.count - 1);
      cfg.show(index, !!instant);
      if (notesBox) notesBox.querySelector(".body").textContent = cfg.notes[index] || "";
      if (notesBox) notesBox.querySelector(".num").textContent = `${index + 1} / ${cfg.count}`;
    };
    window.addEventListener("keydown", (e) => {
      if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(e.key)) { e.preventDefault(); go(index + 1); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); go(index - 1); }
      else if (e.key === "n" || e.key === "N") notesBox && notesBox.classList.toggle("open");
      else if (e.key === "m" || e.key === "M") cfg.toggleReduced && cfg.toggleReduced();
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(cfg.count - 1);
    });
    window.deck = { count: cfg.count, goTo: (n) => go(n, false) };
    go(index, true);
    return { go };
  }

  window.Cine = {
    C, FRAME, FONT, el, text, rng, lerp, clamp, easeInOut,
    defs, frame, sky, skyline, facade, lamp, reflection, rainLayer,
    grainAndVignette, figure, POSES, bus, placeBus, ellipseRoute, roadRing,
    filmStrip, arrowLabel, arrow, neonLoop, stopSign, clockTower, rooftop, pausePlate,
    Director, fitStage, weather,
    deckControls,
  };
})();
