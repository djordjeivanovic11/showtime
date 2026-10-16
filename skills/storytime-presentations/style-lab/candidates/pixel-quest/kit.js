// Pixel Quest style kit.
//
// A reusable toolkit for "storytime" decks drawn as 480x270 pixel art and
// shown at integer scale 4 (1920x1080). Plain browser JS, no modules: load
// with <script src="kit.js"> and use the global `PQ`.
//
// Layers: pixel art is drawn at logical resolution into one <canvas> per layer
// and upscaled with image-rendering: pixelated. Text is real DOM text in the
// bundled pixel fonts. A deck is a list of states; each state lists layers by
// id. A layer id that appears in consecutive states is the same object: it
// moves (and, if its look changes, crossfades) instead of being redrawn.
//
// Sections: palette · surface · sprite grids · Pip (character) · props ·
// route (loop scaffold) · text + UI chrome · player.

(function () {
  "use strict";

  const PQ = {};
  /** Logical canvas width in pixels. */
  PQ.W = 480;
  /** Logical canvas height in pixels. */
  PQ.H = 270;
  /** Integer upscale from logical px to screen px. */
  PQ.SCALE = 4;

  // ---------------------------------------------------------------- palette
  // One-letter keys so sprite rows stay readable. Semantic roles in comments.
  PQ.palette = {
    K: "#0d0b1a", // ink: every outline, text panels
    N: "#11132e", // night sky, top
    n: "#1b1f47", // night sky, horizon; far silhouettes
    u: "#2a3064", // buildings
    v: "#3d4688", // building lit edge
    M: "#0f2442", // map lightbox base (backlit)
    g: "#142d4c", // map city block
    j: "#1f4370", // map block edge
    W: "#f4f1e8", // cream white: stops, text, highlights
    w: "#b9bccb", // light gray: small print, metal light
    m: "#6b6f88", // metal
    c: "#3a3d55", // concrete / asphalt
    a: "#25283b", // asphalt dark, tile joints
    Y: "#ffd447", // ACCENT: tag bar, emphasis, light sources
    y: "#b8892a", // dim warm: lit windows, beanie rim
    l: "#ffe9a3", // pale glow
    O: "#ff9a3c", // DATA 1: gap A→B (the gap that grows)
    o: "#9c561d", // data 1 dark
    C: "#4fd6e8", // DATA 2: gap B→A (the gap that shrinks)
    i: "#1f7f8f", // data 2 dark
    R: "#ff5a5f", // ALARM: late, bunched, the bad number
    r: "#972b35", // alarm dark
    G: "#2bb58f", // FIX / bus livery
    t: "#1a7259", // livery dark
    L: "#a8f07a", // fix highlight
    b: "#e6dec6", // bus body cream
    p: "#9aa3c4", // Pip body
    q: "#69719a", // Pip shade / wing
    h: "#cfd5ea", // Pip light
    E: "#3fcf8e", // Pip neck, green sheen
    P: "#b07de6", // Pip neck, purple sheen
    k: "#ff8fa8", // Pip feet, blush
    D: "#8a5a34", // wood
    d: "#5a3820", // wood dark
    f: "#24583c", // grass / park
    F: "#173d2b", // grass dark
  };

  /** Resolve a palette key or "#rrggbb" to a CSS color; "." is transparent. */
  PQ.color = function (key) {
    if (key === "." || key == null) return null;
    if (key[0] === "#") return key;
    const hex = PQ.palette[key];
    if (!hex) throw new Error(`PQ: unknown palette key "${key}"`);
    return hex;
  };

  /** Deterministic pseudo-random generator (mulberry32) for repeatable art. */
  PQ.rng = function (seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // ---------------------------------------------------------------- surface
  /** Wrap a 2D context in whole-pixel palette primitives (no antialiasing). */
  PQ.surface = function (ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    function fill(x, y, w, h, key) {
      const css = PQ.color(key);
      if (!css || w <= 0 || h <= 0) return;
      ctx.fillStyle = css;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    const g = {
      width,
      height,
      ctx,
      clear() {
        ctx.clearRect(0, 0, width, height);
      },
      px(x, y, key) {
        fill(x, y, 1, 1, key);
      },
      rect(x, y, w, h, key) {
        fill(x, y, w, h, key);
      },
      /** One-pixel outline whose outer edge is the rectangle. */
      frame(x, y, w, h, key) {
        fill(x, y, w, 1, key);
        fill(x, y + h - 1, w, 1, key);
        fill(x, y + 1, 1, h - 2, key);
        fill(x + w - 1, y + 1, 1, h - 2, key);
      },
      /** Bresenham line, endpoints inclusive. */
      line(x0, y0, x1, y1, key) {
        let x = Math.round(x0);
        let y = Math.round(y0);
        const xe = Math.round(x1);
        const ye = Math.round(y1);
        const dx = Math.abs(xe - x);
        const dy = -Math.abs(ye - y);
        const sx = x < xe ? 1 : -1;
        const sy = y < ye ? 1 : -1;
        let err = dx + dy;
        for (;;) {
          fill(x, y, 1, 1, key);
          if (x === xe && y === ye) break;
          const e2 = 2 * err;
          if (e2 >= dy) {
            err += dy;
            x += sx;
          }
          if (e2 <= dx) {
            err += dx;
            y += sy;
          }
        }
      },
      /** Filled ellipse sampled at pixel centres. */
      ellipse(cx, cy, rx, ry, key) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
          const dy = (y + 0.5 - cy) / ry;
          if (Math.abs(dy) > 1) continue;
          const half = rx * Math.sqrt(1 - dy * dy);
          const x0 = Math.round(cx - half);
          const x1 = Math.round(cx + half);
          fill(x0, y, x1 - x0, 1, key);
        }
      },
      /** Elliptical ring of the given width around the centre line rx, ry. */
      ring(cx, cy, rx, ry, width, key) {
        const ro = [rx + width / 2, ry + width / 2];
        const ri = [rx - width / 2, ry - width / 2];
        for (let y = Math.floor(cy - ro[1]); y <= Math.ceil(cy + ro[1]); y++) {
          for (let x = Math.floor(cx - ro[0]); x <= Math.ceil(cx + ro[0]); x++) {
            const ox = (x + 0.5 - cx) / ro[0];
            const oy = (y + 0.5 - cy) / ro[1];
            const ix = (x + 0.5 - cx) / ri[0];
            const iy = (y + 0.5 - cy) / ri[1];
            if (ox * ox + oy * oy <= 1 && ix * ix + iy * iy > 1) fill(x, y, 1, 1, key);
          }
        }
      },
      /** Filled polygon (scanline, even-odd) from [[x, y], ...]. */
      poly(points, key) {
        const ys = points.map((p) => p[1]);
        for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
          const yc = y + 0.5;
          const xs = [];
          for (let i = 0; i < points.length; i++) {
            const [ax, ay] = points[i];
            const [bx, by] = points[(i + 1) % points.length];
            if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
              xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
            }
          }
          xs.sort((p, q) => p - q);
          for (let k = 0; k + 1 < xs.length; k += 2) {
            const x0 = Math.round(xs[k]);
            fill(x0, y, Math.round(xs[k + 1]) - x0, 1, key);
          }
        }
      },
      /** Checkerboard blend; "." as one key gives a see-through half-tone. */
      dither(x, y, w, h, keyA, keyB) {
        for (let r = 0; r < h; r++) {
          for (let c = 0; c < w; c++) {
            const key = (x + c + y + r) % 2 === 0 ? keyA : keyB;
            fill(x + c, y + r, 1, 1, key);
          }
        }
      },
      /** Sparse quarter-tone: one pixel in four, for soft light pools. */
      sparse(x, y, w, h, key) {
        for (let r = 0; r < h; r++) {
          for (let c = 0; c < w; c++) {
            if ((x + c) % 2 === 0 && (y + r) % 2 === 0) fill(x + c, y + r, 1, 1, key);
          }
        }
      },
      /** Half-tone disc: checkerboard pixels inside an ellipse (bokeh, pools). */
      ditherEllipse(cx, cy, rx, ry, key) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
          for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
            const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
            if (d <= 1 && (x + y) % 2 === 0) fill(x, y, 1, 1, key);
          }
        }
      },
      /** Draw sprite rows (strings of palette keys) with top-left at x, y. */
      sprite(rows, x, y, { flip = false, scale = 1 } = {}) {
        for (let r = 0; r < rows.length; r++) {
          const line = rows[r];
          const w = line.length;
          let c = 0;
          while (c < w) {
            const key = line[c];
            let e = c + 1;
            while (e < w && line[e] === key) e++;
            if (key !== ".") {
              const start = flip ? w - e : c;
              fill(x + start * scale, y + r * scale, (e - c) * scale, scale, key);
            }
            c = e;
          }
        }
      },
      /** Pixel panel: fill, 1-px border, optional 1-px drop shadow. */
      box(x, y, w, h, { fill: f = "K", border = "m", shadow = null } = {}) {
        if (shadow) fill(x + 1, y + 1, w, h, shadow === true ? "K" : shadow);
        fill(x, y, w, h, f);
        if (border) g.frame(x, y, w, h, border);
      },
    };
    return g;
  };

  // ----------------------------------------------------------- sprite grids
  const WING_TONES = { fill: "q", shade: "a", light: "p" };
  // Characters are assembled on a char grid from parts. A part painted with
  // outline: true first inks its 4-neighbour border, then fills, so every
  // overlapping part keeps the same one-pixel ink line.

  /** New w x h grid of "." (transparent). */
  PQ.grid = function (w, h) {
    return Array.from({ length: h }, () => Array(w).fill("."));
  };

  /** Paint cells where inside(x, y) is true with colorAt(x, y). */
  PQ.paintMask = function (grid, inside, colorAt, { outline = true } = {}) {
    const h = grid.length;
    const w = grid[0].length;
    if (outline) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (inside(x, y)) continue;
          if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) {
            grid[y][x] = "K";
          }
        }
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (inside(x, y)) grid[y][x] = colorAt(x, y);
      }
    }
  };

  /** Ellipse part with top-left light and bottom-right shade. */
  PQ.paintEllipse = function (grid, cx, cy, rx, ry, tones, opts) {
    const inside = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
    PQ.paintMask(
      grid,
      inside,
      (x, y) => {
        if (tones.shade && (!inside(x + 1, y + 1) || !inside(x, y + 2))) return tones.shade;
        if (tones.light && !inside(x - 1, y - 1)) return tones.light;
        return tones.fill;
      },
      opts,
    );
    return inside;
  };

  /** Polygon part (pixel centres inside [[x, y], ...]). */
  PQ.paintPoly = function (grid, points, tones, opts) {
    const inside = (x, y) => {
      const px = x + 0.5;
      const py = y + 0.5;
      let hit = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    PQ.paintMask(
      grid,
      inside,
      (x, y) => {
        if (tones.shade && !inside(x, y + 1)) return tones.shade;
        if (tones.light && !inside(x, y - 1)) return tones.light;
        return tones.fill;
      },
      opts,
    );
    return inside;
  };

  /**
   * Feathered wing: a rotated ellipse from shoulder (sx, sy) toward angleDeg
   * (0 = right, -90 = up), with three feather fingers carved at the tip.
   */
  PQ.paintWing = function (grid, sx, sy, angleDeg, len, halfW, tones = WING_TONES) {
    const ang = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const a = len / 2;
    const cx = sx + dx * a;
    const cy = sy + dy * a;
    const inside = (x, y) => {
      const px = x + 0.5 - cx;
      const py = y + 0.5 - cy;
      const u = px * dx + py * dy;
      const v = -px * dy + py * dx;
      if ((u / a) ** 2 + (v / halfW) ** 2 > 1) return false;
      // Feather fingers: notch every third row across the last third.
      return !(u > a * 0.45 && Math.floor(v + halfW + 0.5) % 3 === 2);
    };
    PQ.paintMask(grid, inside, (x, y) => {
      if (!inside(x, y + 1)) return tones.shade;
      if (!inside(x, y - 1)) return tones.light;
      return tones.fill;
    });
  };

  /** Paint rows of keys at (ox, oy); "." skips. Outline optional. */
  PQ.paintRows = function (grid, rows, ox, oy, { outline = true } = {}) {
    const inside = (x, y) => {
      const r = rows[y - oy];
      if (!r) return false;
      const ch = r[x - ox];
      return ch !== undefined && ch !== ".";
    };
    PQ.paintMask(grid, inside, (x, y) => rows[y - oy][x - ox], { outline });
  };

  /** Grid to row strings for PQ.surface().sprite(). */
  PQ.rows = function (grid) {
    return grid.map((r) => r.join(""));
  };

  // ------------------------------------------------------------ Pip (hero)
  // Pip: an original city pigeon in a yellow knit beanie, chibi proportions
  // (big head, big eye) so reactions read from the back row. 56x56 grid,
  // facing right, feet on row 54, ink under the feet on row 55: place the
  // sprite at y = groundY - 55. Every pose changes the silhouette (wings,
  // beanie, head), not only the eye.

  const PIP_POSES = {
    neutral: { wing: "fold", eye: "open", head: 0 },
    watch: { wing: "watch", eye: "down", brow: "cross", head: 1, tap: true },
    alarmed: { wing: "up", eye: "wide", brow: "high", head: -1, hat: -4, puff: 1 },
    point: { wing: "point", eye: "open", head: 0 },
    hold: { wing: "hold", eye: "happy", head: 0, blush: true },
    happy: { wing: "fold", eye: "happy", head: 0, blush: true },
  };
  /** Pose names Pip supports. */
  PQ.PIP_POSES = Object.keys(PIP_POSES);
  /** Pip sprite size in logical px. */
  PQ.PIP_SIZE = 56;

  const PIP_EYES = {
    open: [".WWWW.", "WWWWWW", "WWWKKW", "WWKKKW", "WWWKKW", ".WWWW."],
    blink: ["......", "......", "......", "KKKKKK", "......", "......"],
    down: [".WWWW.", "WWWWWW", "WWWWWW", "WWWWKW", "WWWKKK", ".WWKK."],
    wide: [".WWWWW.", "WWWWWWW", "WWWWWWW", "WWWWKKW", "WWWWKKW", "WWWWWWW", ".WWWWW."],
    happy: ["......", "..KK..", ".K..K.", "K....K", "......", "......"],
  };
  const PIP_BROWS = {
    cross: ["KKK....", "..KKKK.", ".....KK"],
    high: ["..KKK..", ".K...K.", "K.....K"],
  };
  const BODY = { fill: "p", shade: "q", light: "h" };
  const WING = WING_TONES;
  const pipCache = new Map();

  /** Sprite rows for Pip in a pose; tick drives blink and foot-tap idles. */
  PQ.pip = function (pose = "neutral", tick = 0) {
    const spec = PIP_POSES[pose];
    if (!spec) throw new Error(`PQ.pip: unknown pose "${pose}"`);
    const blink = spec.eye === "open" && tick % 18 === 17;
    const tap = spec.tap && tick % 4 >= 2 ? 2 : 0;
    const key = `${pose}:${blink}:${tap}`;
    if (pipCache.has(key)) return pipCache.get(key);

    const G = PQ.grid(56, 56);
    const hy = spec.head || 0;
    const puff = spec.puff || 0;

    if (spec.wing === "up") {
      PQ.paintWing(G, 17, 37, -118, 24, 4.5);
    }
    // Tail: a fan pointing back and down with a dark band at the tip.
    PQ.paintRows(
      G,
      ["........qqqq", ".....qqqqqqq", "..pqqqqqqqqq", "KKKqqqqqqqq.", "KKKqqqqq....", ".KK........."],
      1,
      38,
    );
    // Legs; the front foot lifts on the tap frames.
    PQ.paintRows(G, ["..kk..", "..kk..", "..kk..", "..kk..", "kkkkkk"], 18, 50);
    PQ.paintRows(G, ["..kk..", "..kk..", "..kk..", "..kk..", "kkkkkk"], 27, 50 - tap);
    PQ.paintEllipse(G, 25.5, 40, 15 + puff, 11 + puff, BODY);
    if (spec.wing !== "up") {
      // Folded wing with the pigeon's two dark wing bars.
      PQ.paintEllipse(G, 21, 40, 11, 7, WING);
      for (let y = 36; y <= 45; y++) {
        if (G[y][20] === "q") G[y][20] = "K";
        if (G[y][24] === "q") G[y][24] = "K";
      }
    }
    // Iridescent neck: green above, purple below.
    PQ.paintEllipse(G, 34, 32 + hy * 0.5, 8, 6, { fill: "E" });
    for (let y = 34; y < 40; y++) {
      for (let x = 24; x < 44; x++) if (G[y][x] === "E") G[y][x] = "P";
    }
    const headCy = 21 + hy;
    const inHead = PQ.paintEllipse(G, 34, headCy, 12, 11, BODY);
    // Beanie: the top of the head, redrawn in knit yellow; it can hop up.
    const lift = spec.hat || 0;
    const rimY = headCy - 5 + lift;
    PQ.paintMask(
      G,
      (x, y) =>
        y >= 0 && y < 56 && ((y <= rimY && inHead(x, y - lift)) || (y >= rimY - 1 && y <= rimY && x >= 21 && x <= 47)),
      (x, y) => (y >= rimY - 1 ? "y" : x % 3 === 0 ? "y" : y === rimY - 9 + 0 ? "l" : "Y"),
    );
    PQ.paintEllipse(G, 31, rimY - 10, 3.2, 3, { fill: "W", shade: "w" });
    const eye = PIP_EYES[blink ? "blink" : spec.eye];
    PQ.paintRows(G, eye, 36, headCy - 3, { outline: false });
    if (spec.brow) PQ.paintRows(G, PIP_BROWS[spec.brow], 35, headCy - 6, { outline: false });
    if (spec.blush) PQ.paintRows(G, ["kkk", ".kk"], 37, headCy + 5, { outline: false });
    PQ.paintRows(G, ["WW....", "WWmmm.", ".mmmmm", "..mmm."], 45, headCy - 1);

    if (spec.wing === "watch") {
      PQ.paintWing(G, 31, 44, -48, 19, 4.5);
      PQ.paintRows(G, [".YYYYY.", "YWWWWWY", "YWWKWWY", "YWWKKWY", "YWWWWWY", ".YYYYY."], 43, 27);
    } else if (spec.wing === "point") {
      PQ.paintWing(G, 30, 40, -6, 25, 4.5);
    } else if (spec.wing === "up") {
      PQ.paintWing(G, 37, 41, -40, 20, 4.5);
    } else if (spec.wing === "hold") {
      PQ.paintWing(G, 33, 41, -24, 22, 4.5);
    }
    const rows = PQ.rows(G);
    pipCache.set(key, rows);
    return rows;
  };

  /** Draw Pip into a 56x56 layer at (x, y). */
  PQ.drawPip = function (g, pose, tick, x = 0, y = 0) {
    g.sprite(PQ.pip(pose, tick), x, y);
  };

  // ---------------------------------------------------------------- props

  /** Reaction bubble ("!", "?") 12x15 with a tail at bottom-left. */
  PQ.drawBubble = function (g, x, y, mark = "!") {
    g.rect(x + 1, y, 10, 12, "K");
    g.rect(x, y + 1, 12, 10, "K");
    g.rect(x + 1, y + 1, 10, 10, "W");
    g.rect(x + 2, y + 12, 2, 2, "K");
    g.px(x + 1, y + 14, "K");
    g.px(x + 2, y + 11, "W");
    g.px(x + 3, y + 12, "W");
    if (mark === "!") {
      g.rect(x + 5, y + 2, 2, 5, "R");
      g.rect(x + 5, y + 8, 2, 2, "R");
    } else {
      g.rect(x + 4, y + 2, 4, 1, "K");
      g.rect(x + 8, y + 3, 1, 2, "K");
      g.rect(x + 6, y + 5, 2, 1, "K");
      g.rect(x + 5, y + 6, 1, 2, "K");
      g.rect(x + 5, y + 9, 1, 1, "K");
    }
  };

  /** Annoyance scribble 11x9 (a tangled squiggle above a head). */
  PQ.drawGrumble = function (g, x, y, key = "R") {
    const pts = [[0, 6], [2, 2], [4, 7], [6, 1], [8, 7], [10, 3]];
    for (let i = 0; i + 1 < pts.length; i++) {
      g.line(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1], key);
    }
  };

  /** Short motion/emphasis strokes radiating from (x, y). */
  PQ.drawShock = function (g, x, y, key = "W") {
    g.rect(x, y + 4, 3, 1, key);
    g.rect(x + 2, y, 1, 3, key);
    g.rect(x + 5, y + 1, 1, 2, key);
  };

  /** Side-view city bus facing left, 76x34. o: {doorOpen, sign, beam}. */
  PQ.drawBusSide = function (g, x, y, o = {}) {
    const L = 76;
    const H = 34;
    if (o.beam) {
      for (let i = 0; i < 26; i++) {
        const spread = Math.floor(i / 3);
        g.dither(x - 1 - i, y + 22 - Math.floor(spread / 2), 1, 3 + spread, "l", ".");
      }
    }
    // Silhouette with rounded top corners, then body.
    g.rect(x + 2, y, L - 4, 1, "K");
    g.rect(x + 1, y + 1, L - 2, 1, "K");
    g.rect(x, y + 2, L, H - 7, "K");
    g.rect(x + 2, y + 1, L - 4, 1, "W");
    g.rect(x + 1, y + 2, L - 2, H - 9, "b");
    g.rect(x + 2, y + 2, L - 4, 1, "W");
    // Roof unit.
    g.box(x + L - 30, y - 3, 18, 4, { fill: "m", border: "K" });
    // Windscreen (front) and lit passenger windows.
    g.rect(x + 1, y + 4, 8, 15, "K");
    g.rect(x + 2, y + 5, 6, 13, "n");
    g.line(x + 3, y + 15, x + 6, y + 6, "v");
    g.rect(x + 2, y + 5, 6, 2, "K");
    g.rect(x + 3, y + 5, 4, 1, "Y");
    const winTop = y + 5;
    for (let wx = x + 22; wx + 10 <= x + L - 3; wx += 13) {
      g.rect(wx, winTop, 11, 11, "K");
      g.rect(wx + 1, winTop + 1, 9, 9, "y");
      g.rect(wx + 1, winTop + 1, 9, 2, "l");
      // Passenger heads, deterministic per window.
      if (((wx - x) / 13) % 2 < 1) {
        g.rect(wx + 3, winTop + 5, 3, 3, "u");
        g.rect(wx + 2, winTop + 8, 5, 2, "u");
      }
    }
    // Door: two glass leaves; open shows a dark interior and a lit step.
    g.rect(x + 10, y + 4, 10, 23, "K");
    if (o.doorOpen) {
      g.rect(x + 11, y + 5, 8, 21, "a");
      g.rect(x + 11, y + 23, 8, 2, "Y");
      g.rect(x + 9, y + 5, 1, 21, "n");
      g.rect(x + 20, y + 5, 1, 21, "n");
    } else {
      g.rect(x + 11, y + 5, 3, 21, "n");
      g.rect(x + 16, y + 5, 3, 21, "n");
      g.rect(x + 11, y + 5, 3, 1, "v");
      g.rect(x + 16, y + 5, 3, 1, "v");
    }
    // Livery stripe and skirt.
    g.rect(x + 1, y + 18, L - 2, 3, "G");
    g.rect(x + 21, y + 21, L - 22, 1, "t");
    g.rect(x + 1, y + H - 8, L - 2, 1, "t");
    // Lights.
    g.rect(x + 1, y + 21, 3, 3, "Y");
    g.rect(x + L - 3, y + 20, 2, 4, "R");
    // Wheels with arches.
    for (const cx of [x + 15, x + L - 15]) {
      g.ellipse(cx, y + H - 6, 7, 6, "K");
      g.ellipse(cx, y + H - 5, 5, 5, "K");
      g.ellipse(cx, y + H - 5, 3, 3, "m");
      g.rect(cx - 1, y + H - 6, 2, 2, "w");
    }
    // Side destination sign with LED dots (route 8 as a dot pattern).
    g.rect(x + 22, y + 1, 22, 4, "K");
    for (let i = 0; i < 9; i++) g.px(x + 24 + i * 2, y + 2 + (i % 2), "Y");
    if (o.letter) {
      // Cream disc for a DOM letter badge.
      g.ellipse(x + 59, y + 24.5, 6.5, 5.5, "K");
      g.ellipse(x + 59, y + 24.5, 5.5, 4.5, "W");
    }
  };

  /** Map badge for a bus seen on the route map, 22x16 (letter added as DOM). */
  PQ.drawBusBadge = function (g, x, y, o = {}) {
    g.rect(x + 1, y, 20, 16, "K");
    g.rect(x, y + 1, 22, 14, "K");
    g.rect(x + 1, y + 1, 20, 14, "b");
    g.rect(x + 1, y + 1, 20, 1, "W");
    g.rect(x + 1, y + 12, 20, 3, "G");
    g.rect(x + 1, y + 14, 20, 1, "t");
    if (o.ring) g.frame(x - 2, y - 2, 26, 20, o.ring);
  };

  /** Tiny hourglass 7x10: "this bus is boarding". */
  PQ.drawHourglass = function (g, x, y) {
    g.sprite(
      ["KKKKKKK", "KWWWWWK", ".KYYYK.", "..KYK..", "...K...", "..KWK..", ".KWYWK.", "KWYYYWK", "KKKKKKK"],
      x,
      y,
    );
  };

  /** One tiny rider 5x10 (head, coat, legs); variant picks the colours. */
  PQ.drawRider = function (g, x, y, variant = 0) {
    const coats = ["R", "C", "O", "L", "P", "w", "G", "Y"];
    const skins = ["#f2c19a", "#c98d68", "#8a5a34", "#f2d6b8"];
    const hair = ["K", "d", "Y", "a"];
    const coat = coats[variant % coats.length];
    const skin = skins[(variant * 7) % skins.length];
    g.rect(x + 1, y, 3, 4, "K");
    g.rect(x, y + 4, 5, 6, "K");
    g.rect(x + 1, y + 1, 3, 2, skin);
    g.rect(x + 1, y, 3, 1, hair[(variant * 3) % hair.length]);
    g.rect(x + 1, y + 4, 3, 4, coat);
    g.rect(x + 1, y + 8, 1, 1, "a");
    g.rect(x + 3, y + 8, 1, 1, "a");
  };

  /** A waiting crowd: count riders in rows of `perRow` (6 px pitch). */
  PQ.drawCrowd = function (g, x, y, count, perRow = 8, seed = 3) {
    const rand = PQ.rng(seed);
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const jitter = Math.floor(rand() * 2);
      PQ.drawRider(g, x + col * 6 + (row % 2) * 3, y + row * 10 + jitter, Math.floor(rand() * 8));
    }
  };

  /** "You are here" pin with Pip's beanie: 11x15, tip at (x+5, y+14). */
  PQ.drawYouPin = function (g, x, y) {
    g.ellipse(x + 5.5, y + 5.5, 5.5, 5.5, "K");
    g.poly([[x + 2, y + 8], [x + 9, y + 8], [x + 5.5, y + 15]], "K");
    g.ellipse(x + 5.5, y + 5.5, 4.5, 4.5, "W");
    g.poly([[x + 3, y + 9], [x + 8, y + 9], [x + 5.5, y + 13]], "W");
    // Mini Pip head: grey face, beanie, eye.
    g.ellipse(x + 5.5, y + 6, 3, 3, "p");
    g.rect(x + 3, y + 2, 5, 3, "Y");
    g.px(x + 7, y + 6, "K");
    g.px(x + 9, y + 7, "m");
  };

  /** Round hold paddle on a stick, 15x36; stick bottom at (x+7, y+35). */
  PQ.drawPaddle = function (g, x, y, key = "G") {
    g.rect(x + 6, y + 13, 3, 23, "K");
    g.rect(x + 7, y + 13, 1, 22, "D");
    g.ellipse(x + 7.5, y + 7.5, 7.5, 7.5, "K");
    g.ellipse(x + 7.5, y + 7.5, 6.5, 6.5, key);
    g.ellipse(x + 7.5, y + 7.5, 4.5, 4.5, "t");
    g.ellipse(x + 7.5, y + 7.5, 3.5, 3.5, key);
    g.rect(x + 3, y + 6, 9, 3, "W");
    g.rect(x + 3, y + 9, 9, 1, "K");
  };

  /** Night sky with dithered horizon, seeded stars and an optional moon. */
  PQ.drawNightSky = function (g, { seed = 7, horizon = 190, moon = null } = {}) {
    g.rect(0, 0, g.width, horizon, "N");
    g.dither(0, horizon - 70, g.width, 30, "N", "n");
    g.rect(0, horizon - 40, g.width, 40, "n");
    const rand = PQ.rng(seed);
    for (let i = 0; i < 70; i++) {
      const sx = Math.floor(rand() * g.width);
      const sy = Math.floor(rand() * (horizon - 90));
      g.px(sx, sy, rand() < 0.25 ? "W" : "m");
    }
    if (moon) {
      const [mx, my] = moon;
      g.ellipse(mx, my, 13, 13, "#2b2f5c");
      g.ellipse(mx, my, 10, 10, "W");
      g.ellipse(mx + 3, my - 2, 2.5, 2.5, "w");
      g.ellipse(mx - 3, my + 4, 1.5, 1.5, "w");
    }
  };

  /** Two-depth skyline with seeded lit windows; baseY is street level. */
  PQ.drawSkyline = function (g, { seed = 11, baseY = 190, skip = null } = {}) {
    const rand = PQ.rng(seed);
    // Far silhouettes.
    for (let x = -10; x < g.width; ) {
      const w = 18 + Math.floor(rand() * 26);
      const top = baseY - 60 - Math.floor(rand() * 70);
      g.rect(x, top, w, baseY - top, "n");
      if (rand() < 0.3) g.rect(x + Math.floor(w / 2), top - 8, 1, 8, "n");
      x += w;
    }
    // Near buildings with window grids.
    for (let x = -6; x < g.width; ) {
      const w = 34 + Math.floor(rand() * 40);
      const top = baseY - 34 - Math.floor(rand() * 74);
      g.rect(x, top, w, baseY - top, "u");
      g.rect(x, top, w, 1, "v");
      g.rect(x, top, 1, baseY - top, "v");
      g.rect(x + 2, top - 3, w - 4, 3, "u");
      g.rect(x + 2, top - 3, w - 4, 1, "v");
      for (let wy = top + 6; wy < baseY - 10; wy += 9) {
        for (let wx = x + 5; wx + 4 < x + w - 3; wx += 8) {
          if (skip && skip(wx, wy)) continue;
          const roll = rand();
          const key = roll < 0.18 ? "Y" : roll < 0.42 ? "y" : "n";
          g.rect(wx, wy, 4, 5, key);
          if (key === "Y") g.rect(wx, wy, 4, 1, "l");
        }
      }
      x += w + Math.floor(rand() * 4);
    }
  };

  /** Road from y0 to y1 with dashed centre line and kerbs. */
  PQ.drawRoad = function (g, y0, y1) {
    g.rect(0, y0 - 6, g.width, 6, "c");
    g.rect(0, y0 - 6, g.width, 1, "m");
    g.rect(0, y0, g.width, y1 - y0, "a");
    g.dither(0, y0, g.width, 2, "a", "K");
    const mid = Math.round((y0 + y1) / 2);
    for (let x = 4; x < g.width; x += 24) g.rect(x, mid, 12, 1, "y");
  };

  /** Near sidewalk with tile joints from y0 to the bottom edge. */
  PQ.drawSidewalk = function (g, y0) {
    g.rect(0, y0, g.width, g.height - y0, "c");
    g.rect(0, y0, g.width, 1, "w");
    g.rect(0, y0 + 1, g.width, 2, "m");
    for (let x = 0; x < g.width; x += 24) g.rect(x, y0 + 3, 1, g.height - y0 - 3, "a");
    g.rect(0, y0 + 14, g.width, 1, "a");
  };

  /** Street lamp with a warm light pool; base at (x, baseY). */
  PQ.drawLamp = function (g, x, baseY, height = 84, poolTo = null) {
    const top = baseY - height;
    if (poolTo) {
      // Faint cone (one pixel in sixteen) and a half-tone pool on the ground.
      for (let y = top + 8; y < poolTo; y += 4) {
        const half = Math.floor((y - top) * 0.36);
        for (let px = x + 10 - half; px < x + 10 + half; px += 4) g.px(px + ((y / 4) % 2) * 2, y, "y");
      }
      g.ditherEllipse(x + 10, poolTo, 34, 4, "y");
    }
    g.rect(x - 1, top, 3, height, "K");
    g.rect(x, top, 1, height, "m");
    g.rect(x - 3, baseY - 3, 7, 3, "K");
    g.rect(x, top, 10, 2, "K");
    g.rect(x + 6, top + 1, 9, 4, "K");
    g.rect(x + 7, top + 2, 7, 2, "w");
    g.rect(x + 7, top + 4, 7, 2, "Y");
    g.rect(x + 8, top + 6, 5, 1, "l");
  };

  /** Bus stop flag on a pole; base at (x, baseY). */
  PQ.drawStopPole = function (g, x, baseY, height = 100) {
    const top = baseY - height;
    g.rect(x - 1, top, 3, height, "K");
    g.rect(x, top, 1, height, "w");
    g.box(x - 7, top - 2, 16, 15, { fill: "G", border: "K" });
    g.rect(x - 6, top - 1, 14, 1, "L");
    // Bus pictogram.
    g.rect(x - 4, top + 2, 10, 6, "W");
    g.rect(x - 3, top + 3, 8, 2, "t");
    g.rect(x - 3, top + 8, 2, 2, "K");
    g.rect(x + 3, top + 8, 2, 2, "K");
  };

  /** Open bus shelter frame (roof, posts, bench); lightbox drawn by caller. */
  PQ.drawShelter = function (g, x, roofY, groundY, w = 104) {
    g.rect(x - 4, roofY, w + 8, 7, "K");
    g.rect(x - 3, roofY + 1, w + 6, 2, "w");
    g.rect(x - 3, roofY + 3, w + 6, 3, "m");
    g.rect(x + 2, roofY + 7, w - 4, 1, "l");
    for (const px of [x + 2, x + w - 5]) {
      g.rect(px, roofY + 7, 4, groundY - roofY - 7, "K");
      g.rect(px + 1, roofY + 7, 2, groundY - roofY - 7, "m");
    }
    // Back glass: only glints, so buses behind still read.
    g.rect(x + 6, roofY + 9, w - 12, 1, "v");
    for (const gx of [x + 14, x + 20, x + 70]) g.line(gx, roofY + 40, gx + 12, roofY + 14, "v");
    // Bench.
    g.rect(x + 8, groundY - 16, 36, 4, "K");
    g.rect(x + 9, groundY - 15, 34, 2, "D");
    g.rect(x + 11, groundY - 12, 2, 12, "K");
    g.rect(x + 39, groundY - 12, 2, 12, "K");
  };

  /** Lightbox frame (metal, lit edge) around an inner map area. */
  PQ.drawLightbox = function (g, x, y, w, h) {
    g.rect(x, y, w, h, "K");
    g.rect(x + 1, y + 1, w - 2, h - 2, "m");
    g.rect(x + 1, y + 1, w - 2, 1, "w");
    g.rect(x + 3, y + 3, w - 6, h - 6, "K");
    g.rect(x + 4, y + 4, w - 8, h - 8, "M");
  };

  /** Top-down dim city blocks for a map interior. */
  PQ.drawMapBlocks = function (g, x, y, w, h, seed = 5, avoid = null) {
    const rand = PQ.rng(seed);
    for (let by = y + 4; by + 10 < y + h; by += 22) {
      for (let bx = x + 4; bx + 12 < x + w; ) {
        const bw = Math.min(14 + Math.floor(rand() * 18), x + w - bx);
        const bh = Math.min(16, y + h - by);
        if (!avoid || !avoid(bx, by, bw, bh)) {
          const park = rand() < 0.12;
          g.rect(bx, by, bw, bh, park ? "F" : "g");
          g.rect(bx, by, bw, 1, park ? "f" : "j");
          g.rect(bx, by, 1, bh, park ? "f" : "j");
          if (park) {
            for (let tx = bx + 4; tx + 3 < bx + bw; tx += 7) g.ellipse(tx + 1, by + 8, 2.5, 2.5, "f");
          } else if (bw > 18) {
            // Rooftop details: a vent and a lit skylight on some blocks.
            g.rect(bx + 3, by + 4, 3, 2, "j");
            if (rand() < 0.3) g.rect(bx + bw - 6, by + bh - 6, 2, 2, "y");
          }
        }
        bx += bw + 6;
      }
    }
  };

  /** LED cells: a column of `count` cells; colorAt(i) picks each cell's key. */
  PQ.drawLedColumn = function (g, x, y, w, cellH, count, colorAt) {
    for (let i = 0; i < count; i++) {
      const key = colorAt(i);
      const cy = y + i * (cellH + 1);
      g.rect(x, cy, w, cellH, key);
      if (key !== "a") g.rect(x, cy, w, 1, "l");
    }
  };

  /** Marquee billboard frame with bulbs; tick twinkles alternate bulbs. */
  PQ.drawMarquee = function (g, x, y, w, h, tick = 0, legTo = null) {
    if (legTo) {
      // The building across the street that carries the sign.
      const bx = x + 16;
      const bw = w - 32;
      const roof = y + h + 10;
      for (const lx of [x + 30, x + w / 2 - 2, x + w - 34]) {
        g.rect(lx, y + h, 4, roof - y - h, "K");
        g.rect(lx + 1, y + h, 2, roof - y - h, "m");
      }
      g.rect(bx - 2, roof, bw + 4, 3, "K");
      g.rect(bx, roof + 3, bw, legTo - roof - 3, "u");
      g.rect(bx, roof + 3, bw, 1, "v");
      const rand = PQ.rng(31);
      for (let wy = roof + 8; wy < legTo - 8; wy += 9) {
        for (let wx = bx + 6; wx + 4 < bx + bw - 4; wx += 9) {
          const roll = rand();
          g.rect(wx, wy, 5, 5, roll < 0.07 ? "Y" : roll < 0.2 ? "y" : "n");
        }
      }
    }
    g.rect(x, y, w, h, "K");
    g.rect(x + 1, y + 1, w - 2, h - 2, "d");
    g.rect(x + 1, y + 1, w - 2, 1, "D");
    g.rect(x + 7, y + 7, w - 14, h - 14, "K");
    let n = 0;
    const bulb = (bx, by) => {
      const on = (n + tick) % 2 === 0;
      g.rect(bx, by, 3, 3, on ? "Y" : "y");
      if (on) g.px(bx, by, "l");
      n++;
    };
    for (let bx = x + 3; bx < x + w - 4; bx += 7) {
      bulb(bx, y + 2);
      bulb(bx, y + h - 5);
    }
    for (let by = y + 9; by < y + h - 8; by += 7) {
      bulb(x + 2, by);
      bulb(x + w - 5, by);
    }
  };

  /** Roundabout ring road with clockwise painted arrows and a clock island. */
  PQ.drawRoundabout = function (g, cx, cy, rx, ry) {
    g.ring(cx, cy, rx, ry, 13, "K");
    g.ring(cx, cy, rx, ry, 11, "c");
    // Dashed lane line.
    for (let a = 0; a < Math.PI * 2; a += 0.09) {
      if (Math.floor(a / 0.09) % 3 === 0) continue;
      g.px(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, "w");
    }
    // Clockwise arrowheads between the four sign positions.
    for (const a of [Math.PI * 1.75, Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25]) {
      const px = cx + Math.cos(a) * rx;
      const py = cy + Math.sin(a) * ry;
      let tx = -Math.sin(a) * rx;
      let ty = Math.cos(a) * ry;
      const len = Math.hypot(tx, ty);
      tx /= len;
      ty /= len;
      const nx = -ty;
      const ny = tx;
      // Shaft, then a long narrow head so the direction is unambiguous.
      for (let d = -8; d <= 1; d += 0.5) g.rect(px + tx * d - 1, py + ty * d - 1, 2, 2, "Y");
      g.poly(
        [
          [px + tx * 8, py + ty * 8],
          [px + nx * 4.5, py + ny * 4.5],
          [px - nx * 4.5, py - ny * 4.5],
        ],
        "Y",
      );
    }
    // Island with a clock: the loop is about lateness.
    g.ellipse(cx, cy, rx - 8, ry - 8, "K");
    g.ellipse(cx, cy, rx - 9, ry - 9, "F");
    g.ellipse(cx, cy - 1, rx - 12, ry - 12, "f");
    g.rect(cx - 1, cy + 2, 3, 9, "K");
    g.ellipse(cx + 0.5, cy - 4, 8.5, 8.5, "K");
    g.ellipse(cx + 0.5, cy - 4, 7.5, 7.5, "W");
    g.rect(cx, cy - 9, 1, 6, "K");
    g.line(cx, cy - 4, cx + 4, cy - 1, "R");
    g.px(cx, cy - 4, "K");
  };

  /** Pixel arrow along a straight segment with a head at the end. */
  PQ.drawArrow = function (g, x0, y0, x1, y1, key = "Y") {
    g.line(x0, y0, x1, y1, key);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    for (const s of [-1, 1]) {
      const a = ang + Math.PI + s * 0.6;
      g.line(x1, y1, x1 + Math.cos(a) * 4, y1 + Math.sin(a) * 4, key);
    }
  };

  // ------------------------------------------------------- route scaffold
  /**
   * Loop route on a rounded rectangle through `stops` (clockwise, stops[0] is
   * route time 0). Time is split evenly between consecutive stops (one stop
   * every 1/stops.length of a lap) and by arc length inside a segment.
   */
  PQ.makeRoute = function ({ x, y, w, h, r, stops }) {
    const pts = [];
    const step = 0.5;
    const segs = [
      { k: "l", a: [x + r, y], b: [x + w - r, y] },
      { k: "c", c: [x + w - r, y + r], a0: -Math.PI / 2 },
      { k: "l", a: [x + w, y + r], b: [x + w, y + h - r] },
      { k: "c", c: [x + w - r, y + h - r], a0: 0 },
      { k: "l", a: [x + w - r, y + h], b: [x + r, y + h] },
      { k: "c", c: [x + r, y + h - r], a0: Math.PI / 2 },
      { k: "l", a: [x, y + h - r], b: [x, y + r] },
      { k: "c", c: [x + r, y + r], a0: Math.PI },
    ];
    for (const s of segs) {
      if (s.k === "l") {
        const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
        for (let d = 0; d < len; d += step) {
          const f = d / len;
          pts.push([s.a[0] + (s.b[0] - s.a[0]) * f, s.a[1] + (s.b[1] - s.a[1]) * f]);
        }
      } else {
        const len = (Math.PI / 2) * r;
        for (let d = 0; d < len; d += step) {
          const a = s.a0 + (d / len) * (Math.PI / 2);
          pts.push([s.c[0] + Math.cos(a) * r, s.c[1] + Math.sin(a) * r]);
        }
      }
    }
    const total = pts.length * step;
    const nearest = ([sx, sy]) => {
      let best = 0;
      let bestD = Infinity;
      pts.forEach(([px, py], i) => {
        const d = (px - sx) ** 2 + (py - sy) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best * step;
    };
    const stopArc = stops.map(nearest);
    const base = stopArc[0];
    const rel = stopArc.map((s) => (s - base + total) % total);
    rel.push(total);
    const n = stops.length;

    /** Arc length (0..total) of route time t (laps; any real number). */
    function arcOf(t) {
      const tt = ((t % 1) + 1) % 1;
      const k = Math.min(n - 1, Math.floor(tt * n));
      const f = tt * n - k;
      return (base + rel[k] + (rel[k + 1] - rel[k]) * f) % total;
    }
    function pointAtArc(s) {
      const i = Math.floor((((s % total) + total) % total) / step);
      return pts[i];
    }
    return {
      stops,
      total,
      /** [x, y] of route time t. */
      point(t) {
        return pointAtArc(arcOf(t));
      },
      /** Paint the road band for route times t0..t1 (t1 > t0). */
      drawSpan(g, t0, t1, width, key, ox = 0, oy = 0) {
        const a0 = arcOf(t0);
        let a1 = arcOf(t1);
        if (a1 <= a0 && t1 > t0) a1 += total;
        if (t1 - t0 >= 1) a1 = a0 + total;
        const half = Math.floor(width / 2);
        for (let s = a0; s <= a1; s += step) {
          const [px, py] = pointAtArc(s);
          g.rect(Math.round(px - ox) - half, Math.round(py - oy) - half, width, width, key);
        }
      },
    };
  };

  // ----------------------------------------------------------------- text
  const ARROW_SVG =
    '<svg class="pq-glyph" viewBox="0 0 7 5" aria-hidden="true">' +
    '<path d="M0 2h5v1H0zM4 0h1v5H4zM5 1h1v3H5zM6 2h1v1H6z"/></svg>';

  const SIGMA_SVG =
    '<svg class="pq-glyph pq-glyph-s" viewBox="0 0 5 7" aria-hidden="true">' +
    '<path d="M0 0h5v1H0zM0 6h5v1H0zM0 1h1v1H0zM1 2h1v1H1zM2 3h1v1H2zM1 4h1v1H1zM0 5h1v1H0z"/></svg>';

  /** Escape text and swap glyphs the pixel fonts lack (→ drawn, Σ fallback). */
  PQ.rich = function (text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/→/g, `<span class="pq-arrow" role="img" aria-label="to">${ARROW_SVG}</span>`)
      .replace(/Σ/g, `<span class="pq-sigma" role="img" aria-label="sum">${SIGMA_SVG}</span>`)
      .replace(/\n/g, "<br>");
  };

  /** Headline tag spec: the one sentence-like text, fixed top-left. */
  PQ.tag = function (text) {
    return { id: "ui-tag", x: 8, y: 8, text, cls: "pq-tag", z: 900, enter: "slide", swap: true };
  };
  /** Honesty stamp spec, fixed top-right. */
  PQ.stamp = function (text) {
    return { id: "ui-stamp", x: 272, y: 8, w: 200, align: "right", text, cls: "pq-stamp", z: 900 };
  };
  /** Source line spec, fixed bottom-left. */
  PQ.source = function (text) {
    return { id: "ui-source", x: 6, y: 258, w: 468, text, cls: "pq-source", z: 900 };
  };
  /** Label chip spec; accent picks the left bar colour key. */
  PQ.label = function (id, x, y, text, o = {}) {
    return Object.assign(
      { id, x, y, text, cls: "pq-label", accent: o.accent || "m" },
      o,
    );
  };

  /** Inject the kit's CSS (fonts, stage, chrome) once. fontDir is relative. */
  PQ.installStyles = function (fontDir = "fonts") {
    if (document.getElementById("pq-styles")) return;
    const P = PQ.palette;
    const css = `
@font-face{font-family:"Pixelify Sans";src:url(${fontDir}/PixelifySans.ttf) format("truetype");font-weight:400 700;}
@font-face{font-family:"Silkscreen";src:url(${fontDir}/Silkscreen-Bold.ttf) format("truetype");font-weight:700;}
@font-face{font-family:"VT323";src:url(${fontDir}/VT323-Regular.ttf) format("truetype");}
html,body{margin:0;height:100%;background:#000;overflow:hidden;}
#pq-stage{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;
  background:${P.N};transform-origin:0 0;font-family:"Pixelify Sans",monospace;color:${P.W};
  font-variant-ligatures:none;font-feature-settings:"liga" 0,"clig" 0;}
.pq-layer{position:absolute;box-sizing:border-box;}
.pq-layer>canvas{position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated;}
.pq-text{display:inline-block;white-space:nowrap;}
.pq-glyph{width:0.78em;height:0.56em;fill:currentColor;shape-rendering:crispEdges;vertical-align:0.06em;}
.pq-arrow{display:inline-block;margin:0 0.18em;}
.pq-sigma{display:inline-block;margin-right:0.12em;}
.pq-glyph-s{width:0.42em;height:0.58em;vertical-align:0;}
.pq-badge{position:absolute;font-family:"Silkscreen",monospace;font-weight:700;color:${P.K};
  font-size:32px;line-height:32px;text-align:center;}
.pq-tag{font-family:"Pixelify Sans";font-weight:600;font-size:40px;line-height:64px;height:64px;
  padding:0 18px 0 18px;background:${P.K};color:${P.W};border-left:8px solid ${P.Y};
  box-shadow:4px 4px 0 rgba(0,0,0,.55);}
.pq-stamp{font-family:"Silkscreen";font-weight:700;font-size:24px;line-height:40px;height:40px;
  padding:0 14px 0 12px;background:${P.K};color:${P.Y};border:4px solid ${P.y};letter-spacing:2px;}
.pq-stamp::before{content:"";display:inline-block;width:12px;height:12px;margin-right:12px;
  background:${P.Y};vertical-align:2px;}
.pq-source{font-family:"VT323";font-size:34px;line-height:40px;color:${P.w};
  text-shadow:4px 4px 0 ${P.K};}
.pq-label{font-family:"Pixelify Sans";font-weight:600;font-size:32px;line-height:48px;height:48px;
  padding:0 14px;background:${P.K};color:${P.W};border:4px solid ${P.m};}
.pq-gauge-title{font-family:"Silkscreen";font-weight:700;font-size:32px;line-height:40px;color:${P.Y};}
.pq-title{font-family:"Silkscreen";font-weight:700;font-size:72px;line-height:84px;color:${P.W};
  text-shadow:8px 8px 0 ${P.K};white-space:nowrap;}
#pq-notes{position:absolute;left:64px;right:64px;bottom:120px;padding:28px 36px;background:${P.K};
  border:4px solid ${P.Y};font-family:"Pixelify Sans";font-size:34px;line-height:48px;color:${P.W};
  display:none;z-index:2000;white-space:normal;}
#pq-notes.on{display:block;}
#pq-notes b{color:${P.Y};font-family:"Silkscreen";font-size:22px;display:block;margin-bottom:8px;}
`;
    const el = document.createElement("style");
    el.id = "pq-styles";
    el.textContent = css;
    document.head.appendChild(el);
  };

  // --------------------------------------------------------------- player
  /**
   * Build a deck in `stage` from states [{tag, stamp, source, notes, params,
   * transition, layers: [spec]}]. Layer spec fields:
   *   id, x, y, w, h (logical px) or place(p) -> {x, y};
   *   draw(g, p, tick) for pixel art (needs w, h) and/or text (string|fn)
   *   or html (string|fn, author-trusted markup; use PQ.rich inside);
   *   look (content identity: same id + same look = same object);
   *   live (redraw while params tween), idle (redraw on idle ticks);
   *   enter ("fade"|"pop"|"rise"|"drop"|"slide"), delay (ms), z, cls,
   *   align, badges [{x, y, w, text}], scene (rides camera moves in),
   *   camera (false = plain fade instead of riding a camera move out).
   * State transition: "morph" (default) | "cut" |
   *   {camera: {from, to, exitOnTop}}: a camera move mapping stage rect
   *   `from` onto `to` ([x, y, w, h]); exitOnTop for zoom-outs.
   */
  PQ.createDeck = function (stage, states, opts = {}) {
    const S = PQ.SCALE;
    const MOVE_MS = opts.moveMs || 900;
    const ENTER_MS = opts.enterMs || 480;
    // One easing for every move, camera included, so objects that travel
    // with the camera (the lightbox map) stay locked to it mid-move.
    const MOVE_EASE = "cubic-bezier(.65,0,.35,1)";
    let current = -1;
    let params = {};
    let recs = new Map();
    let running = [];
    let rafId = null;
    let tick = 0;
    let reduced = false;
    let idleOn = false;
    const notesEl = document.createElement("div");
    notesEl.id = "pq-notes";
    stage.appendChild(notesEl);

    const lookOf = (spec) =>
      spec.look != null ? String(spec.look) : typeof spec.text === "string" ? spec.text : "";
    const resolveText = (spec, p) => (typeof spec.text === "function" ? spec.text(p) : spec.text);
    function boxOf(spec, p) {
      const pos = spec.place ? spec.place(p) : spec;
      return { x: pos.x, y: pos.y, w: spec.w, h: spec.h };
    }
    function setBox(el, b) {
      el.style.left = `${b.x * S}px`;
      el.style.top = `${b.y * S}px`;
      if (b.w != null) el.style.width = `${b.w * S}px`;
      if (b.h != null) el.style.height = `${b.h * S}px`;
    }
    function paint(rec, p) {
      if (rec.g) {
        rec.g.clear();
        rec.spec.draw(rec.g, p, tick);
      }
      if (rec.textEl) {
        const h = rec.spec.html;
        const html = h != null ? (typeof h === "function" ? h(p) : h) : PQ.rich(resolveText(rec.spec, p));
        if (html !== rec.html) {
          rec.textEl.innerHTML = html;
          rec.html = html;
        }
      }
      if (rec.badgeEls) {
        rec.spec.badges.forEach((b, i) => {
          const t = typeof b.text === "function" ? b.text(p) : b.text;
          if (rec.badgeEls[i].textContent !== t) rec.badgeEls[i].textContent = t;
        });
      }
    }
    function build(spec, p, z) {
      const el = document.createElement("div");
      el.className = "pq-layer";
      el.dataset.id = spec.id;
      el.style.zIndex = spec.z != null ? spec.z : z;
      if (spec.align) el.style.textAlign = spec.align;
      const rec = { spec, el, look: lookOf(spec) };
      if (spec.draw) {
        const cv = document.createElement("canvas");
        cv.width = spec.w;
        cv.height = spec.h;
        el.appendChild(cv);
        rec.g = PQ.surface(cv.getContext("2d"), spec.w, spec.h);
      }
      if (spec.text != null || spec.html != null) {
        const t = document.createElement("div");
        t.className = "pq-text " + (spec.cls || "");
        if (spec.accent) t.style.borderLeft = `12px solid ${PQ.color(spec.accent)}`;
        if (spec.color) t.style.color = PQ.color(spec.color);
        el.appendChild(t);
        rec.textEl = t;
      }
      if (spec.badges) {
        rec.badgeEls = spec.badges.map((b) => {
          const s = document.createElement("div");
          s.className = "pq-badge";
          s.style.left = `${b.x * S}px`;
          s.style.top = `${b.y * S}px`;
          s.style.width = `${(b.w || 10) * S}px`;
          el.appendChild(s);
          return s;
        });
      }
      if (spec.alt) el.setAttribute("aria-label", spec.alt);
      paint(rec, p);
      setBox(el, boxOf(spec, p));
      stage.appendChild(el);
      return rec;
    }
    function track(anim) {
      running.push(anim);
      return anim;
    }
    function finishAll() {
      for (const a of running) {
        try {
          a.finish();
        } catch (e) {
          /* already finished */
        }
      }
      running = [];
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      for (const rec of recs.values()) paint(rec, params);
      for (const rec of recs.values()) setBox(rec.el, boxOf(rec.spec, params));
      stage.querySelectorAll(".pq-layer.pq-dying").forEach((el) => el.remove());
    }
    function lerpParams(a, b, u) {
      const out = Object.assign({}, b);
      for (const k of Object.keys(b)) {
        if (typeof a[k] === "number" && typeof b[k] === "number") out[k] = a[k] + (b[k] - a[k]) * u;
      }
      return out;
    }
    const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    function cameraTransform(from, to, box) {
      // Camera move that maps stage rectangle `from` onto `to` (logical px),
      // expressed about the layer's own top-left corner (box.x, box.y).
      const k = to[2] / from[2];
      const tx = (to[0] + (box.x - from[0]) * k - box.x) * S;
      const ty = (to[1] + (box.y - from[1]) * k - box.y) * S;
      return `translate(${tx}px, ${ty}px) scale(${k})`;
    }
    function px(b) {
      const f = { left: `${b.x * S}px`, top: `${b.y * S}px` };
      if (b.w != null) f.width = `${b.w * S}px`;
      if (b.h != null) f.height = `${b.h * S}px`;
      return f;
    }
    function enterKeyframes(kind) {
      switch (kind) {
        case "pop":
          return [{ opacity: 0, transform: "scale(0.4)" }, { opacity: 1, transform: "scale(1.08)", offset: 0.7 }, { opacity: 1, transform: "scale(1)" }];
        case "rise":
          return [{ opacity: 0, transform: "translateY(48px)" }, { opacity: 1, transform: "translateY(0)" }];
        case "drop":
          return [{ opacity: 0, transform: "translateY(-64px)" }, { opacity: 1, transform: "translateY(8px)", offset: 0.75 }, { opacity: 1, transform: "translateY(0)" }];
        case "slide":
          return [{ opacity: 0, transform: "translateX(-60px)" }, { opacity: 1, transform: "translateX(0)" }];
        default:
          return [{ opacity: 0 }, { opacity: 1 }];
      }
    }

    function goTo(n, { instant = false } = {}) {
      n = Math.max(0, Math.min(states.length - 1, n));
      if (n === current) return;
      finishAll();
      const next = states[n];
      const specs = next.layers;
      const prevParams = params;
      const nextParams = Object.assign({}, next.params || {});
      const noMotion = instant || reduced || current < 0 || next.transition === "cut";
      notesEl.innerHTML = `<b>NOTES · ${n + 1} / ${states.length}</b>${PQ.rich(next.notes || "")}`;

      if (noMotion) {
        for (const rec of recs.values()) rec.el.remove();
        recs = new Map();
        specs.forEach((spec, i) => recs.set(spec.id, build(spec, nextParams, i)));
        params = nextParams;
        current = n;
        return;
      }

      const camera = next.transition && next.transition.camera;
      const old = recs;
      const fresh = new Map();
      const tweened = [];
      let enterIndex = 0;
      const enterBase = camera ? MOVE_MS * 0.75 : MOVE_MS * 0.55;

      specs.forEach((spec, i) => {
        const prev = old.get(spec.id);
        if (prev && prev.look === lookOf(spec)) {
          // Same object: keep the element, move it.
          const oldSpec = prev.spec;
          prev.spec = spec;
          prev.el.style.zIndex = spec.z != null ? spec.z : i;
          fresh.set(spec.id, prev);
          if (spec.place && oldSpec.place) {
            tweened.push(prev);
          } else {
            const from = boxOf(oldSpec, prevParams);
            const to = boxOf(spec, nextParams);
            setBox(prev.el, to);
            if (spec.live) tweened.push(prev);
            else paint(prev, nextParams);
            track(prev.el.animate([px(from), px(to)], { duration: MOVE_MS, easing: MOVE_EASE }));
          }
          return;
        }
        const rec = build(spec, nextParams, i);
        fresh.set(spec.id, rec);
        if (spec.live || spec.place) tweened.push(rec);
        if (prev && spec.swap) {
          // Swap in place (headline tag): old fades fast, new one enters.
          prev.el.classList.add("pq-dying");
          const out = track(prev.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }));
          out.onfinish = () => prev.el.remove();
          old.delete(spec.id);
          track(rec.el.animate(enterKeyframes(spec.enter), {
            duration: ENTER_MS, delay: 180, easing: "cubic-bezier(.3,.7,.3,1)", fill: "backwards",
          }));
          return;
        }
        if (prev) {
          // Same object, new look: both copies travel, old fades out.
          const from = boxOf(prev.spec, prevParams);
          const to = boxOf(spec, nextParams);
          const motion = { duration: MOVE_MS, easing: MOVE_EASE };
          track(rec.el.animate([Object.assign(px(from), { opacity: 0 }), Object.assign(px(to), { opacity: 1 })], motion));
          prev.el.classList.add("pq-dying");
          prev.el.style.zIndex = rec.el.style.zIndex;
          setBox(prev.el, to);
          const a = track(prev.el.animate([Object.assign(px(from), { opacity: 1 }), Object.assign(px(to), { opacity: 0 })], motion));
          a.onfinish = () => prev.el.remove();
          old.delete(spec.id);
          return;
        }
        if (camera && spec.scene) {
          // Scene layers ride the camera in from the previous framing. Zooming
          // in, the new scene grows out of the window it was seen through
          // (opaque almost at once); zooming out, it waits underneath.
          const startOpacity = camera.exitOnTop ? 1 : 0;
          track(rec.el.animate(
            [{ transformOrigin: "0 0", transform: cameraTransform(camera.to, camera.from, boxOf(spec, nextParams)), opacity: startOpacity },
              { opacity: 1, offset: 0.12 },
              { transformOrigin: "0 0", transform: "none", opacity: 1 }],
            { duration: MOVE_MS, easing: MOVE_EASE, fill: "backwards" },
          ));
          return;
        }
        const delay = spec.delay != null ? spec.delay : enterBase + enterIndex * 260;
        enterIndex++;
        track(rec.el.animate(enterKeyframes(spec.enter), {
          duration: ENTER_MS, delay, easing: "cubic-bezier(.3,.7,.3,1)", fill: "backwards",
        }));
      });

      for (const [id, rec] of old) {
        if (fresh.has(id)) continue;
        rec.el.classList.add("pq-dying");
        let a;
        if (camera && rec.spec.camera !== false) {
          // The old scene stays opaque until it is covered (zoom in) or has
          // shrunk back into its window (zoom out, drawn on top).
          if (camera.exitOnTop) rec.el.style.zIndex = Number(rec.el.style.zIndex || 0) + 25;
          a = rec.el.animate(
            [{ transformOrigin: "0 0", transform: "none", opacity: 1 },
              { opacity: 1, offset: 0.8 },
              { transformOrigin: "0 0", transform: cameraTransform(camera.from, camera.to, boxOf(rec.spec, prevParams)), opacity: 0 }],
            { duration: MOVE_MS, easing: MOVE_EASE, fill: "forwards" },
          );
        } else {
          a = rec.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: "forwards" });
        }
        track(a);
        a.onfinish = () => rec.el.remove();
      }

      recs = fresh;
      params = nextParams;
      current = n;
      if (tweened.length) {
        const t0 = performance.now();
        const frame = (now) => {
          const u = Math.min(1, (now - t0) / MOVE_MS);
          const p = lerpParams(prevParams, nextParams, ease(u));
          for (const rec of tweened) {
            if (!rec.el.isConnected) continue;
            if (rec.spec.live) paint(rec, p);
            if (rec.spec.place) setBox(rec.el, boxOf(rec.spec, p));
          }
          rafId = u < 1 ? requestAnimationFrame(frame) : null;
        };
        rafId = requestAnimationFrame(frame);
      }
    }

    function fit() {
      const k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      stage.style.transform = `translate(${(window.innerWidth - 1920 * k) / 2}px, ${(window.innerHeight - 1080 * k) / 2}px) scale(${k})`;
    }
    window.addEventListener("resize", fit);
    fit();

    window.addEventListener("keydown", (e) => {
      if (["ArrowRight", " ", "PageDown", "Enter"].includes(e.key)) {
        e.preventDefault();
        goTo(current + 1);
      } else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        goTo(current - 1);
      } else if (e.key === "Home") {
        goTo(0, { instant: true });
      } else if (e.key === "n" || e.key === "N") {
        notesEl.classList.toggle("on");
      } else if (e.key === "m" || e.key === "M") {
        reduced = !reduced;
        if (reduced) finishAll();
      }
    });
    stage.addEventListener("click", () => goTo(current + 1));

    // Idle life (blink, bulbs, foot tap) starts a little after load so that
    // first screenshots are deterministic; it pauses under reduced motion.
    setTimeout(() => {
      idleOn = true;
    }, opts.idleDelayMs || 2500);
    setInterval(() => {
      if (!idleOn || reduced || rafId) return;
      tick++;
      for (const rec of recs.values()) if (rec.spec.idle) paint(rec, params);
    }, 250);

    return {
      count: states.length,
      goTo: (n) => goTo(n),
      jump: (n) => goTo(n, { instant: true }),
      get current() {
        return current;
      },
    };
  };

  /** Wait for the bundled fonts, then start the deck at ?state=N. */
  PQ.boot = async function (states, opts = {}) {
    PQ.installStyles(opts.fontDir);
    const stage = document.getElementById("pq-stage");
    await Promise.all([
      document.fonts.load('600 40px "Pixelify Sans"'),
      document.fonts.load('700 40px "Silkscreen"'),
      document.fonts.load('40px "VT323"'),
    ]);
    await document.fonts.ready;
    const deck = PQ.createDeck(stage, states, opts);
    const q = new URLSearchParams(location.search);
    const start = Number.parseInt(q.get("state") || "0", 10) || 0;
    deck.jump(start);
    window.deck = deck;
    document.body.dataset.ready = "1";
    return deck;
  };

  window.PQ = PQ;
})();
