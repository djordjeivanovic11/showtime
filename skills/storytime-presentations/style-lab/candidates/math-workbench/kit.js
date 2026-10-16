/* Living Proof: reusable drawing tools for a warm, physical mathematics table. */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const C = Object.freeze({
    desk: "#d8d5ca", paper: "#f5f2e9", paperDark: "#e7e8e1",
    ink: "#18313b", muted: "#4b6167", ruled: "#c9d7d6",
    route: "#7b948d", blue: "#1e687d", bluePale: "#a7cfd1",
    rust: "#a44939", rustPale: "#e3b1a5", amber: "#dd9e44",
    fix: "#296b5d", white: "#fffdf6", shadow: "#65726e",
  });

  /** Create an SVG element, optionally attach it to a parent. */
  function el(tag, attrs = {}, parent = null) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (parent) parent.appendChild(node);
    return node;
  }

  /** Draw editable SVG text with the world's default font. */
  function text(parent, value, x, y, size, color = C.ink, weight = 400, extra = {}) {
    const node = el("text", {
      x, y, fill: color, "font-size": size, "font-weight": weight,
      "font-family": "Inter, 'Inter Greek', sans-serif", ...extra,
    }, parent);
    node.textContent = value;
    return node;
  }

  /** Build one full-bleed drafting table with a paper sheet and ruled grain. */
  function workspace(parent) {
    el("rect", { x: 0, y: 0, width: 1920, height: 1080, fill: C.desk }, parent);
    el("rect", {
      x: 22, y: 22, width: 1876, height: 1036, rx: 20,
      fill: C.paper, stroke: C.ink, "stroke-width": 2,
    }, parent);
    for (let x = 80; x < 1900; x += 80) {
      el("line", {
        x1: x, y1: 23, x2: x, y2: 1055, stroke: C.ruled,
        "stroke-width": x % 160 === 0 ? 1.5 : 0.7, opacity: 0.45,
      }, parent);
    }
    for (let y = 80; y < 1060; y += 80) {
      el("line", {
        x1: 24, y1: y, x2: 1896, y2: y, stroke: C.ruled,
        "stroke-width": y % 160 === 0 ? 1.5 : 0.7, opacity: 0.45,
      }, parent);
    }
    el("path", {
      d: "M35 134 H1884 M35 992 H1884", stroke: C.ink,
      "stroke-width": 2, opacity: 0.65,
    }, parent);
    el("circle", { cx: 109, cy: 170, r: 15, fill: C.paperDark, stroke: C.ink }, parent);
    el("circle", { cx: 1810, cy: 170, r: 15, fill: C.paperDark, stroke: C.ink }, parent);
    el("path", {
      d: "M94 174 h30 M1795 174 h30", stroke: C.ink, "stroke-width": 2,
    }, parent);
    return parent;
  }

  /** Draw the fixed headline tag; its text node is returned for state updates. */
  function tag(parent) {
    const group = el("g", { id: "headline-tag" }, parent);
    el("path", {
      d: "M67 47 H970 L993 71 L970 111 H67 Z", fill: C.ink,
      stroke: C.ink, "stroke-width": 2,
    }, group);
    el("path", { d: "M82 104 H952", stroke: C.amber, "stroke-width": 5 }, group);
    return text(group, "", 91, 91, 42, C.white, 700);
  }

  /** Draw the source-status stamp used for nonempirical examples. */
  function stamp(parent) {
    const group = el("g", { id: "status-stamp" }, parent);
    el("rect", {
      x: 1664, y: 52, width: 189, height: 54, rx: 4,
      fill: C.white, stroke: C.rust, "stroke-width": 3,
    }, group);
    text(group, "ILLUSTRATIVE", 1680, 87, 24, C.rust, 700);
    return group;
  }

  /** Draw the small, persistent source and mathematical assumption line. */
  function source(parent) {
    return text(
      parent,
      "illustrative scenario · avg wait = Σ gap² ÷ (2 · Σ gap), riders arrive at random",
      67, 1025, 21, C.muted, 400,
    );
  }

  /** Return a point on a circular route at an angle in degrees. */
  function point(cx, cy, radius, degrees) {
    const rad = (degrees * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  }

  /** Draw a single clockwise arc, with angles in degrees. */
  function arcPath(cx, cy, radius, start, sweep) {
    const [x1, y1] = point(cx, cy, radius, start);
    const [x2, y2] = point(cx, cy, radius, start + sweep);
    const large = sweep > 180 ? 1 : 0;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  /** Draw the route and eight numbered stops; return the fixed scaffold group. */
  function loopRoute(parent, cx, cy, radius) {
    const group = el("g", { id: "loop-route" }, parent);
    el("circle", {
      cx, cy, r: radius + 22, fill: "none", stroke: C.ruled,
      "stroke-width": 2, "stroke-dasharray": "4 11",
    }, group);
    el("circle", {
      cx, cy, r: radius, fill: "none", stroke: C.ink,
      "stroke-width": 49, opacity: 0.11,
    }, group);
    el("circle", {
      cx, cy, r: radius, fill: "none", stroke: C.route,
      "stroke-width": 37,
    }, group);
    el("circle", {
      cx, cy, r: radius, fill: "none", stroke: C.white,
      "stroke-width": 4, "stroke-dasharray": "12 18", opacity: 0.9,
    }, group);
    for (let i = 0; i < 8; i++) {
      const [x, y] = point(cx, cy, radius, 135 + i * 45);
      el("circle", {
        cx: x, cy: y, r: 19, fill: C.white,
        stroke: C.ink, "stroke-width": 3,
      }, group);
      text(group, String(i + 1), x, y + 8, 23, C.ink, 700,
        { "text-anchor": "middle" });
    }
    return group;
  }

  /** Draw a reusable top-down bus marker that can be moved on a route. */
  function bus(parent, id, fill, label) {
    const group = el("g", { id }, parent);
    el("rect", {
      x: -47, y: -24, width: 94, height: 48, rx: 15,
      fill: C.shadow, opacity: 0.25, transform: "translate(7 7)",
    }, group);
    el("rect", {
      x: -47, y: -24, width: 94, height: 48, rx: 15,
      fill, stroke: C.ink, "stroke-width": 3,
    }, group);
    el("rect", {
      x: -30, y: -18, width: 39, height: 36, rx: 6,
      fill: C.white, opacity: 0.85,
    }, group);
    text(group, label, 28, 9, 26, C.white, 700,
      { "text-anchor": "middle" });
    el("circle", { cx: -48, cy: -12, r: 5, fill: C.ink }, group);
    el("circle", { cx: -48, cy: 12, r: 5, fill: C.ink }, group);
    return group;
  }

  /** Draw a small recurring researcher at the stop; return pose-controlled parts. */
  function researcher(parent) {
    const group = el("g", { id: "researcher", transform: "translate(207 792)" }, parent);
    el("ellipse", { cx: 0, cy: 81, rx: 62, ry: 17, fill: C.shadow, opacity: 0.2 }, group);
    el("path", {
      d: "M-31 24 Q-38 0 -24 -17 H29 Q43 1 33 31 L22 72 H-18 Z",
      fill: C.blue, stroke: C.ink, "stroke-width": 3,
    }, group);
    const leftArm = el("path", { id: "researcher-left-arm", fill: "none",
      stroke: C.ink, "stroke-width": 11, "stroke-linecap": "round" }, group);
    const rightArm = el("path", { id: "researcher-right-arm", fill: "none",
      stroke: C.ink, "stroke-width": 11, "stroke-linecap": "round" }, group);
    el("path", {
      d: "M-14 65 L-18 90 M17 65 L27 90", fill: "none",
      stroke: C.ink, "stroke-width": 10, "stroke-linecap": "round",
    }, group);
    el("circle", { cx: 1, cy: -42, r: 40, fill: C.white,
      stroke: C.ink, "stroke-width": 3 }, group);
    el("path", { d: "M-37 -53 Q-27 -102 3 -96 Q44 -94 41 -47 Q20 -66 -37 -53Z",
      fill: C.amber, stroke: C.ink, "stroke-width": 3 }, group);
    el("path", { d: "M-40 -51 Q-16 -61 12 -53", fill: "none",
      stroke: C.ink, "stroke-width": 3 }, group);
    el("circle", { cx: -12, cy: -42, r: 4, fill: C.ink }, group);
    el("circle", { cx: 15, cy: -42, r: 4, fill: C.ink }, group);
    const mouth = el("path", { id: "researcher-mouth", fill: "none",
      stroke: C.ink, "stroke-width": 3, "stroke-linecap": "round" }, group);
    return { group, leftArm, rightArm, mouth };
  }

  /** Draw a simple two-part gap gauge on the drafting paper. */
  function gauge(parent) {
    const group = el("g", { id: "gap-gauge" }, parent);
    text(group, "20-MINUTE LAP", 565, 495, 33, C.ink, 700,
      { "text-anchor": "middle" });
    text(group, "2 BUSES · 8 STOPS", 565, 541, 28, C.muted, 400,
      { "text-anchor": "middle" });
    el("rect", { x: 142, y: 914, width: 802, height: 41, rx: 20,
      fill: C.white, stroke: C.ink, "stroke-width": 2 }, group);
    const long = el("rect", { id: "gauge-long", x: 145, y: 917,
      width: 399, height: 35, rx: 17, fill: C.rust }, group);
    const short = el("rect", { id: "gauge-short", x: 544, y: 917,
      width: 397, height: 35, rx: 17, fill: C.blue }, group);
    const leftValue = text(group, "10 min", 440, 891, 32, C.rust, 700);
    const rightValue = text(group, "10 min", 783, 891, 32, C.blue, 700);
    return { group, long, short, leftValue, rightValue };
  }

  /** Draw a physical translucent sheet for the waiting-time construction. */
  function graphPaper(parent) {
    const group = el("g", { id: "graph-paper" }, parent);
    el("rect", { x: 1042, y: 217, width: 808, height: 568,
      rx: 7, fill: C.shadow, opacity: 0.18, transform: "translate(13 16)" }, group);
    el("rect", { x: 1042, y: 217, width: 808, height: 568,
      rx: 7, fill: C.white, opacity: 0.87,
      stroke: C.ink, "stroke-width": 3 }, group);
    el("path", { d: "M1042 267 H1850", stroke: C.ink, "stroke-width": 2 }, group);
    el("circle", { cx: 1080, cy: 242, r: 9, fill: C.amber,
      stroke: C.ink, "stroke-width": 2 }, group);
    text(group, "unroll the loop into time", 1105, 253, 28, C.ink, 700);
    const grid = el("g", { opacity: 0.6 }, group);
    for (let i = 0; i <= 20; i += 2) {
      const x = 1106 + i * 31.5;
      el("line", { x1: x, y1: 314, x2: x, y2: 701,
        stroke: C.ruled, "stroke-width": 2 }, grid);
    }
    for (let y = 357; y < 700; y += 51) {
      el("line", { x1: 1106, y1: y, x2: 1736, y2: y,
        stroke: C.ruled, "stroke-width": 2 }, grid);
    }
    el("path", { d: "M1106 308 V701 H1764", fill: "none",
      stroke: C.ink, "stroke-width": 3 }, group);
    text(group, "wait", 1090, 301, 25, C.ink, 700);
    text(group, "arrival time →", 1497, 744, 25, C.ink, 700);
    text(group, "0", 1099, 732, 23, C.muted, 400);
    text(group, "10", 1405, 732, 23, C.muted, 400);
    text(group, "20 min", 1690, 732, 23, C.muted, 400);
    const first = el("path", { id: "wait-triangle-a", fill: C.rustPale,
      "fill-opacity": 0.75, stroke: C.rust, "stroke-width": 5 }, group);
    const second = el("path", { id: "wait-triangle-b", fill: C.bluePale,
      "fill-opacity": 0.78, stroke: C.blue, "stroke-width": 5 }, group);
    const boundary = el("line", { id: "wait-boundary", y1: 316, y2: 701,
      stroke: C.ink, "stroke-dasharray": "8 8", "stroke-width": 2 }, group);
    const note = text(group, "", 1090, 774, 28, C.muted, 400);
    const firstLabel = text(group, "", 1270, 465, 34, C.rust, 700);
    const secondLabel = text(group, "", 1570, 465, 34, C.blue, 700);
    return { group, first, second, boundary, note, firstLabel, secondLabel };
  }

  window.LivingProof = { C, el, text, workspace, tag, stamp, source,
    point, arcPath, loopRoute, bus, researcher, gauge, graphPaper };
})();
