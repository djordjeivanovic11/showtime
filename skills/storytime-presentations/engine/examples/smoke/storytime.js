/* storytime.js: browser runtime for storytime decks.
 *
 * Classic script (no ES modules) so a deck opens straight from file://.
 * index.html loads, in order: storytime.js, kit.js (style kit), deck.js, and
 * deck.js calls Storytime.deck({...}). See README.md for the full API.
 *
 * Model: a fixed 1920x1080 stage. Each state is a list of layers placed in
 * stage px. A layer id present in consecutive states is the SAME element:
 * it tweens to its new box/opacity/rotation, and if its content changed the
 * old and new content crossfade inside the box. The PPTX exporter mirrors
 * this with Morph, so the HTML player and PowerPoint tell the same story.
 */
(() => {
  "use strict";

  const VERSION = "1.0.0";
  const STAGE_W = 1920;
  const STAGE_H = 1080;
  const MOVE_MS = 700; // matches the PPTX Morph duration
  const ENTER_MS = 450;
  const ENTER_DELAY_MS = 120; // entrances start just after moves, so the eye follows the move first
  const LEAVE_MS = 300;
  const FADE_MS = 500;
  const DRAW_MS = 1100;
  const EASE = "cubic-bezier(0.45, 0, 0.55, 1)";
  const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
  const ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;
  const ENTERS = ["fade", "rise", "pop", "draw", "slide-left", "slide-right", "none"];
  const TRANSITIONS = ["morph", "fade", "cut"];
  const UI_Z = 100000; // chrome always sits above scene layers

  const esc = (text) =>
    String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  // Fallback chrome when the style kit supplies none. Kits normally override all of it.
  const DEFAULT_CHROME = {
    tagBox: { x: 64, y: 48, w: 1240, h: 104 },
    stampBox: { x: 1456, y: 48, w: 400, h: 72 },
    sourceBox: { x: 64, y: 1004, w: 1600, h: 44 },
    tag: (text) => `<div class="st-d-tag">${text}</div>`,
    stamp: (text) => `<div class="st-d-stamp"><span>${text}</span></div>`,
    source: (text) => `<div class="st-d-source">${text}</div>`,
  };

  const BASE_CSS = `
html, body { margin: 0; height: 100%; overflow: hidden; }
#st-root { position: fixed; inset: 0; background: var(--st-bg); }
#st-stage { position: absolute; left: 0; top: 0; width: ${STAGE_W}px; height: ${STAGE_H}px;
  transform-origin: 0 0; overflow: hidden; background: var(--st-bg); }
.st-layer { position: absolute; box-sizing: border-box; transform-origin: 50% 50%; }
.st-art { overflow: hidden; } /* art is clipped to its box, exactly like its PPTX picture */
.st-content { position: absolute; inset: 0; }
.st-content > svg, .st-content > canvas { display: block; width: 100%; height: 100%; }
.st-reduced *, .st-still * { animation-play-state: paused !important; }
.st-export * { caret-color: transparent !important; }
.st-export .st-overlay { display: none !important; }
html.st-isolating, html.st-isolating body, html.st-isolating #st-root,
html.st-isolating #st-stage { background: transparent !important; overflow: visible !important; }
html.st-isolating .st-layer:not(.st-isolated), html.st-isolating .st-overlay
  { visibility: hidden !important; }
.st-d-tag { display: inline-block; padding: 14px 26px; border-radius: 12px; background: rgba(0,0,0,.62);
  color: #fff; font: 700 48px/1.1 system-ui, sans-serif; }
.st-d-stamp { text-align: right; } .st-d-stamp span { display: inline-block; padding: 8px 18px;
  border: 3px solid #ffd447; color: #ffd447; font: 700 30px/1.2 system-ui, sans-serif; letter-spacing: .08em; }
.st-d-source { color: rgba(255,255,255,.86); font: 22px/1.3 system-ui, sans-serif; white-space: nowrap; }
.st-notes { position: fixed; left: 0; right: 0; bottom: 0; max-height: 42vh; overflow: auto; z-index: 10;
  padding: 16px 28px 20px; background: rgba(8,10,18,.95); color: #f2f2f2; border-top: 3px solid #ffd447;
  font: 22px/1.45 system-ui, sans-serif; }
.st-notes p { margin: 6px 0 0; } .st-notes b { color: #ffd447; font-weight: 700; }
.st-notes .st-meta { color: #aab; font-size: 18px; }
.st-toast { position: fixed; right: 16px; top: 12px; padding: 6px 12px; z-index: 11; opacity: 0;
  background: rgba(8,10,18,.9); color: #fff; font: 18px system-ui; transition: opacity .3s; pointer-events: none; }
.st-toast.on { opacity: 1; }
.st-grid { position: absolute; inset: 0; z-index: ${UI_Z * 10}; pointer-events: none; }
.st-error { position: fixed; inset: 0; margin: 0; padding: 32px; z-index: 20; overflow: auto;
  background: #2a0d12; color: #fff; font: 20px/1.4 ui-monospace, monospace; white-space: pre-wrap; }
`;

  // FNV-1a: a short, stable content signature (not cryptographic).
  function fnv(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  function plainText(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || "").replace(/\s+/g, " ").trim();
  }

  const wordCount = (text) => (String(text || "").match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length;

  // ---- Model: validate and normalize the author's states ------------------

  function normalizeLayer(raw, order, where) {
    const at = `${where}, layer ${order} (${raw && raw.id})`;
    if (!raw || typeof raw.id !== "string" || !ID_PATTERN.test(raw.id)) {
      throw new Error(`${at}: id must use only letters, digits and _ . : -`);
    }
    if (raw.id.startsWith("ui-")) throw new Error(`${at}: ids starting "ui-" are reserved for chrome`);
    const sources = ["svg", "html", "canvas"].filter((key) => raw[key] != null);
    if (sources.length !== 1) throw new Error(`${at}: give exactly one of svg, html, canvas`);
    if (raw.canvas != null && typeof raw.canvas !== "function") {
      throw new Error(`${at}: canvas must be a function (ctx, w, h) => {}`);
    }
    for (const key of ["x", "y", "w", "h"]) {
      if (!Number.isFinite(raw[key])) throw new Error(`${at}: ${key} must be a number (stage px)`);
    }
    if (raw.w <= 0 || raw.h <= 0) throw new Error(`${at}: w and h must be positive`);
    const kind = raw.kind === undefined || raw.kind === "art" ? "art" : raw.kind;
    if (kind !== "art" && kind !== "text") throw new Error(`${at}: kind must be "art" or "text"`);
    const enter = raw.enter || "fade";
    if (!ENTERS.includes(enter)) throw new Error(`${at}: enter must be one of ${ENTERS.join(", ")}`);
    return {
      ...raw,
      kind,
      enter,
      order,
      z: Number.isFinite(raw.z) ? raw.z : order,
      opacity: Number.isFinite(raw.opacity) ? raw.opacity : 1,
      rotate: Number.isFinite(raw.rotate) ? raw.rotate : 0,
      duration: Number.isFinite(raw.duration) ? raw.duration : MOVE_MS,
      source: sources[0],
      // Canvas keys are computed from pixels on demand (closures can differ).
      key: raw.key != null ? `k:${raw.key}` : raw.canvas ? null : `${sources[0]}:${fnv(raw[sources[0]])}`,
    };
  }

  function chromeLayer(name, text, chrome) {
    const box = chrome[`${name}Box`];
    if (!box || !["x", "y", "w", "h"].every((key) => Number.isFinite(box[key]))) {
      throw new Error(`chrome.${name}Box must be {x, y, w, h} in stage px`);
    }
    const html = chrome[name](text);
    return {
      id: `ui-${name}`, kind: "ui", ui: name, x: box.x, y: box.y, w: box.w, h: box.h,
      z: UI_Z + ["tag", "stamp", "source"].indexOf(name), order: 0, opacity: 1, rotate: 0,
      duration: MOVE_MS, enter: "fade", source: "html", html, key: `html:${fnv(html)}`,
      small: name === "source", pad: box.pad,
    };
  }

  function normalizeState(raw, index, chrome) {
    if (!raw || typeof raw.id !== "string" || !raw.id) throw new Error(`state ${index}: needs a string id`);
    const where = `state ${index} "${raw.id}"`;
    const transition = raw.transition || "morph";
    if (!TRANSITIONS.includes(transition)) throw new Error(`${where}: transition must be morph, fade or cut`);
    const rawNotes = typeof raw.notes === "string" ? { say: raw.notes } : raw.notes || {};
    const notes = { say: "", cue: "", plain: "", detail: "", ...rawNotes };
    const layers = (raw.layers || []).map((layer, order) => normalizeLayer(layer, order, where));
    for (const name of ["tag", "stamp", "source"]) {
      if (raw[name]) layers.push(chromeLayer(name, raw[name], chrome));
    }
    const seen = new Set();
    for (const layer of layers) {
      if (seen.has(layer.id)) throw new Error(`${where}: layer id "${layer.id}" is used twice`);
      seen.add(layer.id);
    }
    layers.sort((a, b) => a.z - b.z || a.order - b.order); // back to front
    return {
      id: raw.id, index, kind: raw.kind || "scene", transition, notes, layers,
      tag: raw.tag || "", stamp: raw.stamp || "", source: raw.source || "",
    };
  }

  function normalizeDeck(config) {
    if (!config || !Array.isArray(config.states) || config.states.length === 0) {
      throw new Error("Storytime.deck: `states` must be a non-empty array");
    }
    const chrome = { ...DEFAULT_CHROME, ...(config.chrome || {}) };
    const states = config.states.map((raw, index) => normalizeState(raw, index, chrome));
    const wpm = config.wpm || 130;
    let elapsed = 0;
    for (const state of states) {
      // Planned time: speaking time at the deck's pace plus a beat for the click.
      state.seconds = Math.round((wordCount(state.notes.say) / wpm) * 60 + 1.5);
      state.startsAt = elapsed;
      elapsed += state.seconds;
    }
    return {
      title: config.title || document.title || "Storytime deck", wpm, chrome,
      targetSeconds: config.targetSeconds || null, background: config.background || "#000", states,
      totalSeconds: elapsed,
    };
  }

  // ---- Stage: DOM, transitions, persistence -------------------------------

  function createStage(stageEl, deck) {
    const live = new Map(); // layer id -> { layer, el, content }
    const transient = new Set(); // elements fading out; removed on settle
    const canvasCache = new WeakMap(); // layer -> drawn canvas
    let animations = [];
    let current = -1;
    let reduced = false;

    function animate(el, keyframes, options) {
      const animation = el.animate(keyframes, { fill: "backwards", easing: EASE, ...options });
      animations.push(animation);
      return animation;
    }

    // Final values are always written as inline styles BEFORE animating from the
    // old values, so cancelling every animation lands exactly on the target state.
    // That is what makes rapid clicking and backward navigation exact.
    function settle() {
      for (const animation of animations) animation.cancel();
      animations = [];
      for (const el of transient) el.remove();
      transient.clear();
    }

    function drawnCanvas(layer) {
      if (!canvasCache.has(layer)) {
        const ratio = window.devicePixelRatio || 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(layer.w * ratio);
        canvas.height = Math.round(layer.h * ratio);
        const ctx = canvas.getContext("2d");
        ctx.scale(ratio, ratio);
        layer.canvas(ctx, layer.w, layer.h);
        canvasCache.set(layer, canvas);
      }
      return canvasCache.get(layer);
    }

    function contentKey(layer) {
      if (!layer.key) layer.key = `canvas:${layer.w}x${layer.h}:${fnv(drawnCanvas(layer).toDataURL())}`;
      return layer.key;
    }

    function makeContent(layer) {
      const content = document.createElement("div");
      content.className = "st-content";
      if (layer.source === "canvas") {
        const source = drawnCanvas(layer);
        const canvas = document.createElement("canvas");
        canvas.width = source.width;
        canvas.height = source.height;
        canvas.getContext("2d").drawImage(source, 0, 0);
        content.appendChild(canvas);
      } else {
        content.innerHTML = layer[layer.source];
      }
      return content;
    }

    const transformOf = (layer, extra = "") =>
      `${extra} ${layer.rotate ? `rotate(${layer.rotate}deg)` : ""}`.trim() || "none";

    function place(el, layer, zIndex) {
      Object.assign(el.style, {
        left: `${layer.x}px`, top: `${layer.y}px`, width: `${layer.w}px`, height: `${layer.h}px`,
        opacity: String(layer.opacity), transform: transformOf(layer), zIndex: String(zIndex),
      });
    }

    function mount(layer, zIndex) {
      const el = document.createElement("div");
      el.className = `st-layer st-${layer.kind}${layer.ui ? ` st-ui-${layer.ui}` : ""}`;
      el.dataset.id = layer.id;
      const content = makeContent(layer);
      el.appendChild(content);
      place(el, layer, zIndex);
      stageEl.appendChild(el);
      const entry = { layer, el, content };
      live.set(layer.id, entry);
      return entry;
    }

    function enterKeyframes(kind, layer) {
      const o = layer.opacity;
      const t = (extra) => transformOf(layer, extra);
      if (kind === "rise") return [{ opacity: 0, transform: t("translateY(48px)") }, { opacity: o, transform: t() }];
      if (kind === "slide-left") return [{ opacity: 0, transform: t("translateX(96px)") }, { opacity: o, transform: t() }];
      if (kind === "slide-right") return [{ opacity: 0, transform: t("translateX(-96px)") }, { opacity: o, transform: t() }];
      if (kind === "pop") {
        return [{ opacity: 0, transform: t("scale(0.6)") }, { opacity: o, transform: t("scale(1.06)"), offset: 0.7 },
          { opacity: o, transform: t() }];
      }
      return [{ opacity: 0 }, { opacity: o }];
    }

    // "draw": stroke-dashoffset from full length to 0 on every .st-draw element,
    // which reads as a line being drawn by hand. Returns false if there is nothing to draw.
    function animateDraw(entry) {
      const strokes = [...entry.el.querySelectorAll(".st-draw")].filter((s) => s.getTotalLength);
      if (!strokes.length) return false;
      animate(entry.el, [{ opacity: 0 }, { opacity: entry.layer.opacity }], { duration: 150, delay: ENTER_DELAY_MS });
      strokes.forEach((stroke, i) => {
        // An author pathLength attribute redefines the units stroke-dasharray uses.
        const length = Number(stroke.getAttribute("pathLength")) || stroke.getTotalLength();
        const dash = `${length} ${length}`;
        animate(stroke, [{ strokeDasharray: dash, strokeDashoffset: length }, { strokeDasharray: dash, strokeDashoffset: 0 }],
          { duration: DRAW_MS, delay: ENTER_DELAY_MS + i * 160, easing: "ease-in-out" });
      });
      return true;
    }

    function enter(entry, kind) {
      if (kind === "none") return;
      if (kind === "draw" && animateDraw(entry)) return;
      animate(entry.el, enterKeyframes(kind === "draw" ? "fade" : kind, entry.layer),
        { duration: ENTER_MS, delay: ENTER_DELAY_MS, easing: EASE_OUT });
    }

    function retire(el, duration) {
      transient.add(el);
      const from = el.style.opacity === "" ? 1 : Number(el.style.opacity);
      const out = animate(el, [{ opacity: from }, { opacity: 0 }], { duration, fill: "forwards" });
      out.onfinish = () => transient.delete(el) && el.remove();
    }

    function showInstant(state) {
      for (const entry of live.values()) entry.el.remove();
      live.clear();
      state.layers.forEach((layer, z) => mount(layer, z));
    }

    // Scene change: the new scene fades in over the old one, which stays opaque
    // underneath, so the cut never flashes the background through both scenes.
    function showFade(state) {
      const old = [...live.values()];
      live.clear();
      for (const entry of old) {
        entry.el.style.zIndex = String(Number(entry.el.style.zIndex) - UI_Z * 100);
        transient.add(entry.el);
      }
      let last = null;
      state.layers.forEach((layer, z) => {
        last = animate(mount(layer, z).el, [{ opacity: 0 }, { opacity: layer.opacity }], { duration: FADE_MS });
      });
      const dropOld = () => old.forEach((entry) => transient.delete(entry.el) && entry.el.remove());
      if (last) last.onfinish = dropOld;
      else dropOld();
    }

    function showMorph(state, backward) {
      const nextIds = new Set(state.layers.map((layer) => layer.id));
      for (const [id, entry] of live) {
        if (nextIds.has(id)) continue;
        live.delete(id);
        retire(entry.el, LEAVE_MS);
      }
      state.layers.forEach((layer, z) => {
        const entry = live.get(layer.id);
        if (!entry) {
          enter(mount(layer, z), backward ? "fade" : layer.enter); // going back, entrances just un-leave
          return;
        }
        const from = entry.el.style;
        const fromFrame = { left: from.left, top: from.top, width: from.width, height: from.height,
          opacity: from.opacity, transform: from.transform || "none" };
        const changed = contentKey(layer) !== contentKey(entry.layer);
        entry.layer = layer;
        place(entry.el, layer, z);
        const to = entry.el.style;
        const toFrame = { left: to.left, top: to.top, width: to.width, height: to.height,
          opacity: to.opacity, transform: to.transform || "none" };
        if (layer.kind !== "art") {
          // Text never resizes mid-tween: a changing width would reflow it every frame.
          delete fromFrame.width; delete fromFrame.height; delete toFrame.width; delete toFrame.height;
        }
        if (JSON.stringify(fromFrame) !== JSON.stringify(toFrame)) {
          animate(entry.el, [fromFrame, toFrame], { duration: layer.duration });
        }
        if (!changed) return;
        // Same object, new look: crossfade old -> new content inside the same box.
        // Art: the new look fades in over the old, which stays opaque for the first
        // half, so an opaque object never turns see-through mid-way. Text: the old
        // words fade out, then the new ones fade in, so two labels never overlap.
        const fresh = makeContent(layer);
        entry.el.appendChild(fresh);
        const isArt = layer.kind === "art";
        const fadeIn = isArt ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }];
        const fadeOut = isArt ? [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }] : [{ opacity: 1 }, { opacity: 0, offset: 0.55 }, { opacity: 0 }];
        animate(fresh, fadeIn, { duration: layer.duration });
        const stale = entry.content;
        entry.content = fresh;
        transient.add(stale);
        const out = animate(stale, fadeOut, { duration: layer.duration, fill: "forwards" });
        out.onfinish = () => transient.delete(stale) && stale.remove();
      });
    }

    function show(index, { instant = false } = {}) {
      settle();
      const previous = current;
      current = index;
      const state = deck.states[index];
      if (instant || reduced || previous < 0 || previous === index) return showInstant(state);
      const backward = index < previous;
      // A transition belongs to the boundary: forward it is the new state's,
      // backward it is the transition of the state being left.
      const boundary = backward ? deck.states[previous] : state;
      const mode = Math.abs(index - previous) > 1 ? "fade" : boundary.transition;
      if (mode === "cut") showInstant(state);
      else if (mode === "fade") showFade(state);
      else showMorph(state, backward);
    }

    return {
      show, settle, contentKey,
      get index() { return current; },
      get reduced() { return reduced; },
      setReduced(value) {
        reduced = Boolean(value);
        document.documentElement.classList.toggle("st-reduced", reduced);
        if (reduced) settle();
      },
      entry: (id) => live.get(id) || null,
      idle: () => Promise.all(animations.map((a) => a.finished.catch(() => {}))),
    };
  }

  // ---- Author overlays: notes (N) and grid (G) ----------------------------

  const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

  function renderNotes(panel, deck, state) {
    const n = state.notes;
    const target = deck.targetSeconds ? ` / target ${clock(deck.targetSeconds)}` : "";
    const rows = [
      `<div class="st-meta">${state.index + 1}/${deck.states.length} · ${esc(state.id)} · planned ` +
        `${clock(state.startsAt)}–${clock(state.startsAt + state.seconds)} of ${clock(deck.totalSeconds)}${target}</div>`,
      `<p><b>SAY</b> ${esc(n.say || "(missing)")}</p>`,
    ];
    if (n.cue) rows.push(`<p><b>CLICK</b> ${esc(n.cue)}</p>`);
    if (n.plain) rows.push(`<p><b>IN PLAIN WORDS</b> ${esc(n.plain)}</p>`);
    if (n.detail) rows.push(`<p><b>DETAIL</b> ${esc(n.detail)}</p>`);
    panel.innerHTML = rows.join("");
  }

  // 120 px grid, 5% safe area, chrome boxes, and this state's layer boxes with ids.
  function renderGrid(grid, deck, state) {
    const lines = [];
    for (let x = 120; x < STAGE_W; x += 120) lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${STAGE_H}"/>`);
    for (let y = 120; y < STAGE_H; y += 120) lines.push(`<line x1="0" y1="${y}" x2="${STAGE_W}" y2="${y}"/>`);
    const rect = (b, color, label) =>
      `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="8 6"/>` +
      (label ? `<text x="${b.x + 4}" y="${b.y + 18}" fill="${color}" font-size="16" font-family="monospace">${esc(label)}</text>` : "");
    const boxes = state.layers.map((l) => rect(l, l.kind === "art" ? "#4fd6e8" : "#ffd447", l.id));
    grid.innerHTML = `<svg viewBox="0 0 ${STAGE_W} ${STAGE_H}" width="100%" height="100%">` +
      `<g stroke="rgba(255,0,200,.35)" stroke-width="1">${lines.join("")}</g>` +
      rect({ x: 96, y: 54, w: STAGE_W - 192, h: STAGE_H - 108 }, "#ff3d7f", "safe area 5%") + boxes.join("") + "</svg>";
  }

  // ---- Boot ----------------------------------------------------------------

  function showFatal(error) {
    console.error(error);
    window.storytimeError = String((error && error.message) || error);
    if (document.querySelector(".st-error") || !document.body) return;
    const panel = document.createElement("pre");
    panel.className = "st-error";
    panel.textContent = `Deck failed to load\n\n${(error && error.stack) || error}`;
    document.body.appendChild(panel);
  }

  async function boot(config) {
    const params = new URLSearchParams(location.search);
    const exportMode = params.get("export") === "1";
    const deck = normalizeDeck(config);
    const style = document.createElement("style");
    style.textContent = BASE_CSS;
    document.head.prepend(style); // kit styles come later and win ties
    document.documentElement.style.setProperty("--st-bg", deck.background);
    document.documentElement.classList.toggle("st-export", exportMode);
    document.documentElement.classList.toggle("st-still", exportMode); // idle loops frozen for exports
    document.title = deck.title;

    const root = document.createElement("div");
    root.id = "st-root";
    const stageEl = document.createElement("div");
    stageEl.id = "st-stage";
    const grid = document.createElement("div");
    grid.className = "st-grid st-overlay";
    grid.hidden = true;
    stageEl.appendChild(grid);
    root.appendChild(stageEl);
    const notes = document.createElement("aside");
    notes.className = "st-notes st-overlay";
    notes.hidden = true;
    const toast = document.createElement("div");
    toast.className = "st-toast st-overlay";
    document.body.append(root, notes, toast);

    // Load every declared @font-face up front (not only those used by the
    // first state), so text measures the same in every state and failures surface.
    await Promise.allSettled([...document.fonts].map((face) => face.load()));
    await document.fonts.ready;

    const stage = createStage(stageEl, deck);
    const fit = () => {
      if (exportMode) return;
      const scale = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
      const left = (innerWidth - STAGE_W * scale) / 2;
      const top = (innerHeight - STAGE_H * scale) / 2;
      stageEl.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
    };
    fit();
    addEventListener("resize", fit);
    stage.setReduced(params.get("reduced") === "1" ||
      (!exportMode && matchMedia("(prefers-reduced-motion: reduce)").matches));

    const resolve = (ref) => {
      if (typeof ref === "number") return ref;
      const byId = deck.states.findIndex((s) => s.id === ref);
      if (byId >= 0) return byId;
      if (/^\d+$/.test(String(ref))) return Number(ref);
      throw new Error(`Unknown state "${ref}"`);
    };
    const stateAt = (ref) => {
      const index = resolve(ref);
      if (!(index >= 0 && index < deck.states.length)) throw new Error(`State ${ref} is out of range`);
      return deck.states[index];
    };

    let isolated = null;
    function endIsolation() {
      if (!isolated) return;
      isolated.el.classList.remove("st-isolated");
      Object.assign(isolated.el.style, isolated.saved);
      document.documentElement.classList.remove("st-isolating");
      isolated = null;
    }

    async function settled() {
      await stage.idle();
      await Promise.all([...stageEl.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    }

    function navigate(index, options = {}) {
      endIsolation();
      const clamped = Math.max(0, Math.min(deck.states.length - 1, index));
      if (clamped === stage.index && !options.instant) return;
      stage.show(clamped, options);
      const state = deck.states[clamped];
      renderNotes(notes, deck, state);
      if (!grid.hidden) renderGrid(grid, deck, state);
      if (!exportMode) {
        try {
          history.replaceState(null, "", `?state=${encodeURIComponent(state.id)}`);
        } catch (_) { /* some file:// setups forbid it; navigation still works */ }
      }
    }

    const api = {
      version: VERSION, title: deck.title, wpm: deck.wpm, targetSeconds: deck.targetSeconds,
      background: deck.background, totalSeconds: deck.totalSeconds, count: deck.states.length,
      states: () => deck.states.map((s) => ({
        id: s.id, index: s.index, kind: s.kind, tag: s.tag, stamp: s.stamp, source: s.source,
        transition: s.transition, notes: { ...s.notes }, seconds: s.seconds, startsAt: s.startsAt,
      })),
      current: () => stage.index,
      async goTo(ref, options = {}) {
        navigate(resolve(ref), { instant: Boolean(options.instant) });
        await settled();
        return stage.index;
      },
      layers: (ref) => stateAt(ref).layers.map((l) => ({
        id: l.id, kind: l.kind, ui: l.ui || null, box: { x: l.x, y: l.y, w: l.w, h: l.h },
        opacity: l.opacity, rotate: l.rotate, z: l.z, enter: l.enter, key: stage.contentKey(l),
        alt: l.alt != null ? String(l.alt) : l.kind === "art" ? "" : plainText(l.html || ""),
        small: Boolean(l.small), offCanvas: Boolean(l.offCanvas), pad: l.pad,
        text: typeof l.text === "string" ? l.text : null, font: l.font || null,
      })),
      /**
       * Show only one layer of the CURRENT state, unrotated, at full opacity, on a
       * transparent page, moved to (pad, pad), for a transparent screenshot.
       * Opacity and rotation are applied by PowerPoint instead. Returns the
       * screenshot clip (stage px) and the stage box the screenshot covers.
       */
      isolate(id, { pad = 0 } = {}) {
        endIsolation();
        if (id == null) return null;
        stage.settle();
        const entry = stage.entry(id);
        if (!entry) throw new Error(`Layer "${id}" is not on the current state`);
        const { el, layer } = entry;
        isolated = { el, saved: { left: el.style.left, top: el.style.top, opacity: el.style.opacity, transform: el.style.transform } };
        document.documentElement.classList.add("st-isolating");
        el.classList.add("st-isolated");
        Object.assign(el.style, { left: `${pad}px`, top: `${pad}px`, opacity: "1", transform: "none" });
        return {
          clip: { x: 0, y: 0, width: layer.w + 2 * pad, height: layer.h + 2 * pad },
          box: { x: layer.x - pad, y: layer.y - pad, w: layer.w + 2 * pad, h: layer.h + 2 * pad },
        };
      },
      setReducedMotion: (value) => stage.setReduced(value),
      fonts: () => [...document.fonts].map((f) => ({ family: f.family.replace(/^["']|["']$/g, ""),
        weight: f.weight, style: f.style, status: f.status })),
    };
    window.deck = Object.assign(window.deck || {}, api);

    const flash = (message) => {
      toast.textContent = message;
      toast.classList.add("on");
      clearTimeout(flash.timer);
      flash.timer = setTimeout(() => toast.classList.remove("on"), 1200);
    };
    addEventListener("keydown", (event) => {
      if (exportMode || event.metaKey || event.ctrlKey || event.altKey) return;
      const index = stage.index;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (["ArrowRight", " ", "PageDown"].includes(key)) navigate(index + 1);
      else if (["ArrowLeft", "PageUp"].includes(key)) navigate(index - 1);
      else if (key === "Home") navigate(0, { instant: true });
      else if (key === "End") navigate(deck.states.length - 1, { instant: true });
      else if (key === "n") notes.hidden = !notes.hidden;
      else if (key === "g") {
        grid.hidden = !grid.hidden;
        renderGrid(grid, deck, deck.states[index]);
      } else if (key === "m") {
        stage.setReduced(!stage.reduced);
        flash(`reduced motion ${stage.reduced ? "on" : "off"}`);
      } else if (key === "f") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      } else return;
      event.preventDefault();
    });
    stageEl.addEventListener("click", () => !exportMode && navigate(stage.index + 1));

    const requested = params.get("state");
    let start = 0;
    if (requested != null) {
      try {
        start = resolve(requested);
      } catch (error) {
        console.warn(`${error.message}; starting at the first state`);
      }
    }
    navigate(Math.max(0, Math.min(deck.states.length - 1, start)), { instant: true });
    await settled();
    document.body.dataset.ready = "1";
    return api;
  }

  let called = false;
  function deckEntry(config) {
    if (called) throw new Error("Storytime.deck() was called twice");
    called = true;
    const ready = new Promise((resolve, reject) => {
      const start = () => boot(config).then(resolve, (error) => { showFatal(error); reject(error); });
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
      else start();
    });
    ready.catch(() => {});
    window.deck = { ready };
    return ready;
  }

  // Errors before the deck is up (a kit or deck.js that throws) replace the
  // stage with a readable panel; after that they are only logged, so a runtime
  // glitch never covers the stage mid-talk.
  addEventListener("error", (event) => {
    if (document.body && document.body.dataset.ready === "1") return;
    showFatal(event.error || event.message);
  });
  addEventListener("load", () => {
    if (!called) showFatal(new Error("deck.js never called Storytime.deck({...})"));
  });

  window.Storytime = { version: VERSION, deck: deckEntry, esc, stage: { width: STAGE_W, height: STAGE_H } };
})();
