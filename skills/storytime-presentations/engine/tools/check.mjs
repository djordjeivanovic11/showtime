// The storytime lint: run every state in the browser and check what the
// audience will actually see.
//
//   node tools/check.mjs <deck-dir>
//
// Writes <deck-dir>/check-report.md, prints a summary, exits 1 on any ERROR.
//
// ERROR  missing notes.say; duplicate state ids; layer outside the stage
//        (unless offCanvas: true); text rendered below 20 px; text overflowing
//        its box or clipped by the stage or by its PPTX capture; page errors;
//        declared @font-face faces that failed to load.
// WARN   tag over 6 words; scene without stamp or source; 20-28 px text
//        outside small print (ui-source or small: true); over 25 visible words;
//        over 3 layers added/removed/changed between morph states; overlapping
//        text; estimated contrast below 4.5:1 (3:1 for text >= 32 px, WCAG
//        "large text"); notes.say over 45 words; fonts that fall back.
// INFO   estimated seconds per state and in total vs targetSeconds; objects
//        that persist across 3 or more states.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  deckDirFromArgs,
  deckInfo,
  deckStates,
  formatClock,
  goTo,
  openDeck,
  parseArgs,
  rel,
  stateLayers,
  staleRuntimeWarning,
  STAGE,
} from "./lib.mjs";
import { capturePad } from "./export-pptx.mjs";

export const RULES = {
  minTextPx: 20,
  smallPrintMaxPx: 28,
  maxTagWords: 6,
  maxVisibleWords: 25,
  maxChangesPerClick: 3,
  maxSayWords: 45,
  minContrast: 4.5,
  minContrastLarge: 3,
  largeTextPx: 32,
  secondsPerClick: 1.5,
};

const words = (text) => (String(text ?? "").match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) ?? []).length;

/**
 * Runs in the page: every visible text node of every layer on the stage, with
 * its rendered font size (SVG text includes the viewBox scale) and rects.
 */
function measureStateInPage() {
  const stage = document.getElementById("st-stage");
  const stageRect = stage.getBoundingClientRect();
  const layers = [];
  for (const el of stage.querySelectorAll(".st-layer")) {
    const texts = [];
    let union = null;
    let rangeOverflowX = 0;
    let rangeOverflowY = 0;
    const box = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent.replace(/\s+/g, " ").trim();
      const parent = node.parentElement;
      if (!text || !parent || parent.closest("style, script, title, desc, defs")) continue;
      const style = getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      let size = parseFloat(style.fontSize);
      if (parent instanceof SVGElement && parent.getScreenCTM()) {
        const m = parent.getScreenCTM();
        size *= Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
      }
      const range = document.createRange();
      range.selectNodeContents(node);
      let rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (!rects.length) rects = [parent.getBoundingClientRect()];
      for (const r of rects) {
        const x = r.left - stageRect.left;
        const y = r.top - stageRect.top;
        union = union
          ? { x0: Math.min(union.x0, x), y0: Math.min(union.y0, y), x1: Math.max(union.x1, x + r.width), y1: Math.max(union.y1, y + r.height) }
          : { x0: x, y0: y, x1: x + r.width, y1: y + r.height };
        // Glyph boxes are taller than the ink for most fonts, so vertical slack scales with size.
        rangeOverflowX = Math.max(rangeOverflowX, box.x - x, x + r.width - (box.x + box.w));
        rangeOverflowY = Math.max(rangeOverflowY, box.y - y - size * 0.3, y + r.height - (box.y + box.h) - size * 0.3);
      }
      const family = style.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
      texts.push({ text: text.slice(0, 60), size: Math.round(size * 10) / 10, family });
    }
    const content = el.querySelector(".st-content");
    layers.push({
      id: el.dataset.id,
      rotated: el.style.transform !== "none" && el.style.transform !== "",
      text: texts.map((t) => t.text).join(" "),
      texts,
      union: union && { x: union.x0, y: union.y0, w: union.x1 - union.x0, h: union.y1 - union.y0 },
      rangeOverflowX,
      rangeOverflowY,
      scroll: content && {
        x: content.scrollWidth - content.clientWidth,
        y: content.scrollHeight - content.clientHeight,
      },
    });
  }
  return layers;
}

/** Runs in the page: is `family` available (installed or loaded), judged by text width? */
function fontAvailabilityInPage(families) {
  const ctx = document.createElement("canvas").getContext("2d");
  const sample = "mmmmmmmmmmlli1WQ@#ygpj";
  return families.map((family) => {
    const available = ["monospace", "serif", "sans-serif"].some((fallback) => {
      ctx.font = `72px ${fallback}`;
      const base = ctx.measureText(sample).width;
      ctx.font = `72px "${family}", ${fallback}`;
      return ctx.measureText(sample).width !== base;
    });
    return { family, available };
  });
}

/**
 * Runs in the page. `layer64` is a transparent capture of one text/ui layer,
 * isolated with a margin; `final64` is the full stage as seen; `behind64` is
 * the stage with that layer hidden; (offsetX, offsetY) maps capture px to
 * stage px. Returns
 *   ink    bounds (capture px) of the layer's pixels (alpha > 16);
 *   ratio  estimated WCAG contrast, from the colours actually seen:
 *          - if the layer's pixels fill most of their bounding box, the layer
 *            carries its own backing (chip, panel): split the seen colours into
 *            two luminance clusters (1-D 2-means) and compare cluster medians;
 *          - otherwise it is bare text: compare the seen colour of its glyph
 *            cores (alpha > 200) with what is behind those same pixels.
 *          Medians resist antialiased edges. An estimate, so warn-only.
 */
async function analyzeLayerInPage({ layer64, final64, behind64, offsetX, offsetY }) {
  const read = async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    return { w: bitmap.width, h: bitmap.height, data: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data };
  };
  const linear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminance = (d, i) => 0.2126 * linear(d[i] / 255) + 0.7152 * linear(d[i + 1] / 255) + 0.0722 * linear(d[i + 2] / 255);
  const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const ratioOf = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

  const [layer, seen, behind] = await Promise.all([read(layer64), read(final64), read(behind64)]);
  let ink = null;
  const covered = []; // stage pixel offsets with alpha > 16
  const cores = []; // stage pixel offsets with alpha > 200
  for (let y = 0; y < layer.h; y++) {
    for (let x = 0; x < layer.w; x++) {
      const alpha = layer.data[(y * layer.w + x) * 4 + 3];
      if (alpha <= 16) continue;
      ink = ink ? { x0: Math.min(ink.x0, x), y0: Math.min(ink.y0, y), x1: Math.max(ink.x1, x + 1), y1: Math.max(ink.y1, y + 1) }
        : { x0: x, y0: y, x1: x + 1, y1: y + 1 };
      const sx = x + offsetX;
      const sy = y + offsetY;
      if (sx < 0 || sy < 0 || sx >= seen.w || sy >= seen.h) continue;
      const offset = (sy * seen.w + sx) * 4;
      covered.push(offset);
      if (alpha > 200) cores.push(offset);
    }
  }
  if (!ink || covered.length < 20) return { ink, ratio: null };
  const coverage = covered.length / ((ink.x1 - ink.x0) * (ink.y1 - ink.y0));

  if (coverage > 0.6) {
    const values = covered.map((o) => luminance(seen.data, o));
    let low = Infinity;
    let high = -Infinity;
    for (const v of values) {
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
    let lows = [];
    let highs = [];
    for (let iter = 0; iter < 8 && high > low; iter++) {
      const split = (low + high) / 2;
      lows = values.filter((v) => v < split);
      highs = values.filter((v) => v >= split);
      if (!lows.length || !highs.length) break;
      low = lows.reduce((a, b) => a + b, 0) / lows.length;
      high = highs.reduce((a, b) => a + b, 0) / highs.length;
    }
    if (Math.min(lows.length, highs.length) < 20) return { ink, ratio: null }; // a plain shape, no words to judge
    return { ink, ratio: ratioOf(median(lows), median(highs)), method: "on its own backing" };
  }
  if (cores.length < 20) return { ink, ratio: null };
  const text = median(cores.map((o) => luminance(seen.data, o)));
  const back = median(cores.map((o) => luminance(behind.data, o)));
  return { ink, ratio: ratioOf(text, back), method: "text vs scene" };
}

function intersect(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

function createReport() {
  const items = [];
  const add = (level) => (state, layer, message) => items.push({ level, state, layer, message });
  return { items, error: add("ERROR"), warn: add("WARN"), info: add("INFO") };
}

/** Rules that need only the normalized model (no pixels). */
function checkModel(states, layersByState, report) {
  const seen = new Map();
  for (const state of states) {
    const where = `${state.index}:${state.id}`;
    if (seen.has(state.id)) report.error(where, "", `duplicate state id (also state ${seen.get(state.id)})`);
    seen.set(state.id, state.index);
    if (!String(state.notes.say ?? "").trim()) report.error(where, "", "notes.say is missing (what does the presenter say?)");
    const tagWords = words(state.tag);
    if (tagWords > RULES.maxTagWords) {
      report.warn(where, "ui-tag", `tag has ${tagWords} words (aim for ${RULES.maxTagWords} or fewer): "${state.tag}"`);
    }
    if (state.kind !== "title") {
      if (!state.stamp) report.warn(where, "", "scene has no stamp (e.g. ILLUSTRATIVE, OUR DATA)");
      if (!state.source) report.warn(where, "", "scene has no source line");
    }
    const sayWords = words(state.notes.say);
    if (sayWords > RULES.maxSayWords) {
      report.warn(where, "", `notes.say is ${sayWords} words (over ${RULES.maxSayWords}): the picture holds too long; split the state`);
    }
    for (const layer of layersByState[state.index]) {
      if (layer.kind === "ui" || layer.offCanvas) continue;
      const { x, y, w, h } = layer.box;
      if (x < 0 || y < 0 || x + w > STAGE.width || y + h > STAGE.height) {
        report.error(where, layer.id, `box x=${x} y=${y} w=${w} h=${h} leaves the 1920x1080 stage (add offCanvas: true if intended)`);
      }
    }
    if (state.index === 0) continue;
    if (state.transition !== "morph") continue;
    const before = new Map(layersByState[state.index - 1].filter((l) => l.kind !== "ui").map((l) => [l.id, l]));
    const after = layersByState[state.index].filter((l) => l.kind !== "ui");
    const added = after.filter((l) => !before.has(l.id)).map((l) => `+${l.id}`);
    const changed = after.filter((l) => before.has(l.id) && before.get(l.id).key !== l.key).map((l) => `~${l.id}`);
    const afterIds = new Set(after.map((l) => l.id));
    const removed = [...before.keys()].filter((id) => !afterIds.has(id)).map((id) => `-${id}`);
    const changes = [...added, ...removed, ...changed];
    if (changes.length > RULES.maxChangesPerClick) {
      report.warn(where, "", `${changes.length} layers change on this click (${changes.join(" ")}); aim for one change per click`);
    }
  }
}

/** Rules that need the rendered page: sizes, overflow, words, overlap, contrast, ink. */
async function checkRendered(page, state, layers, measured, report, families) {
  const where = `${state.index}:${state.id}`;
  const byId = new Map(layers.map((l) => [l.id, l]));
  const stageBox = { x: 0, y: 0, w: STAGE.width, h: STAGE.height };
  let visibleWords = 0;
  const textBoxes = [];
  const sizeById = new Map();

  for (const m of measured) {
    const layer = byId.get(m.id);
    if (!layer || !m.texts.length) continue;
    const smallPrint = layer.ui === "source" || layer.small;
    if (!smallPrint) visibleWords += words(m.text);
    for (const t of m.texts) families.add(t.family);
    const smallest = m.texts.reduce((a, b) => (b.size < a.size ? b : a));
    if (smallest.size < RULES.minTextPx) {
      report.error(where, m.id, `text at ${smallest.size}px ("${smallest.text}") is below ${RULES.minTextPx}px`);
    } else if (smallest.size < RULES.smallPrintMaxPx && !smallPrint) {
      report.warn(where, m.id, `text at ${smallest.size}px ("${smallest.text}") is small-print size; mark the layer small: true or enlarge it`);
    }
    // Vertical slack: a font's glyph boxes are often taller than its line, which
    // inflates scrollHeight by a few px; a real overflow is at least one line (~1.2em).
    const largest = Math.max(...m.texts.map((t) => t.size));
    const scrollOverflow = m.scroll && (m.scroll.x > 1 || m.scroll.y > 1 + largest * 0.3);
    const rangeOverflow = !m.rotated && (m.rangeOverflowX > 1 || m.rangeOverflowY > 1);
    if (scrollOverflow || rangeOverflow) {
      const by = Math.round(Math.max(m.scroll?.x ?? 0, m.scroll?.y ?? 0, m.rangeOverflowX, m.rangeOverflowY));
      report.error(where, m.id, `text overflows its ${layer.box.w}x${layer.box.h} box by ~${by}px ("${m.text.slice(0, 40)}")`);
    }
    if (m.union && !layer.offCanvas) {
      const u = m.union;
      if (u.x < -1 || u.y < -1 || u.x + u.w > STAGE.width + 1 || u.y + u.h > STAGE.height + 1) {
        report.error(where, m.id, "text is clipped by the stage edge");
      }
    }
    sizeById.set(m.id, smallest.size);
    if (layer.kind !== "art" && m.union) textBoxes.push({ id: m.id, rect: intersect(m.union, stageBox) });
  }
  if (visibleWords > RULES.maxVisibleWords) {
    report.warn(where, "", `${visibleWords} visible words (over ~${RULES.maxVisibleWords}); move words into the notes`);
  }

  for (let i = 0; i < textBoxes.length; i++) {
    for (let j = i + 1; j < textBoxes.length; j++) {
      const overlap = textBoxes[i].rect && textBoxes[j].rect && intersect(textBoxes[i].rect, textBoxes[j].rect);
      if (overlap && overlap.w > 2 && overlap.h > 2) {
        report.warn(where, `${textBoxes[i].id}+${textBoxes[j].id}`, "text layers overlap");
      }
    }
  }

  // Ink and contrast, per text/ui layer. A transparent capture with a wide
  // margin shows exactly what the layer's PPTX picture would cut off at its
  // capture pad; the same capture is the text mask for the contrast estimate.
  const margin = 96;
  const finalPng = await page.screenshot({ type: "png" });
  for (const layer of layers) {
    if (layer.kind === "art" || layer.rotate) continue;
    const { clip } = await page.evaluate(([id, pad]) => window.deck.isolate(id, { pad }), [layer.id, margin]);
    const layerPng = await page.screenshot({ clip, omitBackground: true, type: "png" });
    await page.evaluate(() => window.deck.isolate(null));
    const hide = (hidden) => page.evaluate(([id, h]) => {
      document.querySelector(`#st-stage .st-layer[data-id="${CSS.escape(id)}"]`).style.visibility = h ? "hidden" : "";
    }, [layer.id, hidden]);
    await hide(true);
    const behindPng = await page.screenshot({ type: "png" });
    await hide(false);
    const result = await page.evaluate(analyzeLayerInPage, {
      layer64: layerPng.toString("base64"),
      final64: finalPng.toString("base64"),
      behind64: behindPng.toString("base64"),
      offsetX: layer.box.x - margin,
      offsetY: layer.box.y - margin,
    });
    if (!result.ink) continue;
    const { ink } = result;
    const pad = capturePad(layer);
    const beyond = Math.max(margin - pad - ink.x0, margin - pad - ink.y0, ink.x1 - (clip.width - margin + pad), ink.y1 - (clip.height - margin + pad));
    if (beyond > 0) {
      report.error(where, layer.id, `ink reaches ${Math.round(beyond)}px past the box + ${pad}px capture pad; the PPTX picture would clip it (enlarge the box or set pad)`);
    }
    const size = sizeById.get(layer.id);
    const needed = size >= RULES.largeTextPx ? RULES.minContrastLarge : RULES.minContrast;
    if (result.ratio && size && result.ratio < needed) {
      report.warn(where, layer.id, `estimated contrast ${result.ratio.toFixed(1)}:1 (${result.method}); want ${needed}:1 for ${size}px text`);
    }
  }
}

function persistenceTable(states, layersByState) {
  const alive = new Map();
  for (const state of states) {
    for (const layer of layersByState[state.index]) {
      if (layer.kind === "ui") continue;
      if (!alive.has(layer.id)) alive.set(layer.id, []);
      alive.get(layer.id).push(state.index);
    }
  }
  return [...alive.entries()].filter(([, at]) => at.length >= 3).map(([id, at]) => ({ id, at }));
}

function writeReport(file, { info, states, report, persistent, pageErrors }) {
  const lines = [`# Storytime check: ${info.title}`, ""];
  const count = (level) => report.items.filter((item) => item.level === level).length;
  lines.push(`${states.length} states · ${count("ERROR")} error(s) · ${count("WARN")} warning(s)`, "");
  lines.push(
    "Passing this check is engineering evidence only: it does not judge the story, the",
    "art, or whether a claim is true, and it does not exercise PowerPoint playback.",
    "",
  );
  const findings = report.items.filter((item) => item.level !== "INFO");
  if (findings.length) {
    lines.push("## Findings", "", "| level | state | layer | message |", "| --- | --- | --- | --- |");
    for (const f of findings) lines.push(`| ${f.level} | ${f.state} | ${f.layer} | ${f.message.replace(/\|/g, "\\|")} |`);
    lines.push("");
  }
  if (pageErrors.length) lines.push("## Page errors", "", ...pageErrors.map((e) => `- ${e}`), "");
  lines.push("## Timing (estimated)", "", `words of notes.say ÷ ${info.wpm} wpm × 60 + ${RULES.secondsPerClick} s per click`, "");
  lines.push("| # | state | transition | tag | say words | seconds |", "| --- | --- | --- | --- | --- | --- |");
  for (const s of states) {
    lines.push(`| ${s.index} | ${s.id} | ${s.transition} | ${s.tag} | ${words(s.notes.say)} | ${s.seconds} |`);
  }
  const target = info.targetSeconds ? ` vs target ${formatClock(info.targetSeconds)}` : "";
  lines.push("", `Total ${formatClock(info.totalSeconds)}${target}.`, "");
  lines.push("## Persistent objects (3+ states)", "");
  if (!persistent.length) lines.push("None.");
  for (const p of persistent) lines.push(`- \`${p.id}\`: states ${p.at.join(", ")}`);
  fs.writeFileSync(file, `${lines.join("\n")}\n`);
}

export async function checkDeck(deckDir) {
  const report = createReport();
  const stale = staleRuntimeWarning(deckDir);
  if (stale) report.warn("deck", "", stale);

  let session;
  try {
    session = await openDeck(deckDir);
  } catch (error) {
    report.error("deck", "", error.message.replace(/\n\s*/g, " / "));
    const info = { title: path.basename(deckDir), wpm: 0, totalSeconds: 0 };
    writeReport(path.join(deckDir, "check-report.md"), { info, states: [], report, persistent: [], pageErrors: [] });
    return { report, states: [] };
  }
  const { page, pageErrors, close } = session;
  try {
    const info = await deckInfo(page);
    const states = await deckStates(page);
    const layersByState = [];
    for (const state of states) layersByState.push(await stateLayers(page, state.index));
    checkModel(states, layersByState, report);

    const families = new Set();
    for (const state of states) {
      await goTo(page, state.index);
      const measured = await page.evaluate(measureStateInPage);
      await checkRendered(page, state, layersByState[state.index], measured, report, families);
    }

    const faces = await page.evaluate(() => window.deck.fonts());
    for (const face of faces.filter((f) => f.status === "error")) {
      report.error("deck", "", `@font-face "${face.family}" (${face.weight} ${face.style}) failed to load`);
    }
    const declared = new Set(faces.filter((f) => f.status === "loaded").map((f) => f.family.toLowerCase()));
    const generic = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|emoji|math|fangsong|ui-[a-z-]+|-apple-system|blinkmacsystemfont)$/i;
    const undeclared = [...families].filter((f) => !generic.test(f) && !declared.has(f.toLowerCase()));
    for (const { family, available } of await page.evaluate(fontAvailabilityInPage, undeclared)) {
      if (!available) report.warn("deck", "", `font "${family}" is neither loaded nor installed; text falls back to another font`);
      else report.info("deck", "", `font "${family}" comes from this machine, not the deck (declare it with @font-face to ship it)`);
    }
    for (const message of pageErrors) report.error("deck", "", `page error: ${message}`);

    for (const s of states) report.info(`${s.index}:${s.id}`, "", `~${s.seconds} s`);
    const target = info.targetSeconds ? ` (target ${formatClock(info.targetSeconds)})` : "";
    report.info("deck", "", `estimated total ${formatClock(info.totalSeconds)}${target}`);
    const persistent = persistenceTable(states, layersByState);
    writeReport(path.join(deckDir, "check-report.md"), { info, states, report, persistent, pageErrors });
    return { report, states, info, persistent };
  } finally {
    await close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { positional } = parseArgs(process.argv.slice(2));
  const deckDir = deckDirFromArgs(positional, "node tools/check.mjs <deck-dir>");
  try {
    const { report, states, info, persistent } = await checkDeck(deckDir);
    for (const item of report.items.filter((i) => i.level !== "INFO")) {
      console.log(`${item.level.padEnd(5)} [${item.state}${item.layer ? ` / ${item.layer}` : ""}] ${item.message}`);
    }
    const errors = report.items.filter((i) => i.level === "ERROR").length;
    const warnings = report.items.filter((i) => i.level === "WARN").length;
    if (info) {
      const target = info.targetSeconds ? ` vs target ${formatClock(info.targetSeconds)}` : "";
      console.log(`timing: ~${formatClock(info.totalSeconds)} for ${states.length} states${target}; ` +
        `${persistent.length} object(s) persist across 3+ states`);
    }
    console.log(`check: ${errors} error(s), ${warnings} warning(s) -> ${rel(path.join(deckDir, "check-report.md"))}`);
    process.exit(errors ? 1 : 0);
  } catch (error) {
    console.error(`check failed: ${error.stack ?? error}`);
    process.exit(1);
  }
}
