// Compile a deck into a layered PPTX whose Morph transitions mirror the player.
//
//   node tools/export-pptx.mjs <deck-dir> [--out file.pptx] [--native-text]
//        [--art-scale 1] [--text-scale 2] [--no-cache]
//
// One 13.333 x 7.5 in slide per state (1920 px = 13.333 in, 1 px = 6350 EMU).
// Every layer becomes one picture at its box, back to front, captured as a
// transparent screenshot of that layer alone (window.deck.isolate):
//   art layers       "!!<id>"          Morph matches the same name across
//                                       slides: it moves/resizes/rotates the
//                                       picture and crossfades a new look.
//   text and ui-*    "!!<id>~<hash8>"  the hash of the picture bytes: same text
//                                       keeps the name (Morph moves it); new text
//                                       gets a new name, so Morph fades old out
//                                       and new in instead of stretching one
//                                       picture of words into another.
// Layer opacity becomes picture transparency and rotation becomes picture
// rotation, so the capture itself is always unrotated and opaque.
//
// Capture scale: art at device scale 1 (exactly the 1920x1080 render),
// text/ui at 2, so words stay crisp on 4K projectors. Measured on the smoke
// deck: see README "PPTX export" for the size trade-off.
//
// --native-text: text layers that give `text` and `font` become editable
// PowerPoint text boxes named "!!<id>". The font must be installed on the
// presenting machine, and line breaks may differ from the HTML.
//
// Captures are cached by content in <deck-dir>/.cache/ (key: layer content,
// size, scale, and every stylesheet and font of the page).

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import PptxGenJS from "pptxgenjs";
import {
  assertNoPageErrors,
  deckDirFromArgs,
  deckInfo,
  deckStates,
  goTo,
  INCH_PER_PX,
  notesText,
  openDeck,
  parseArgs,
  rel,
  sha256,
  STAGE,
  stateLayers,
} from "./lib.mjs";
import { DECORATIVE_ALT, postprocessPptx } from "./pptx-ooxml.mjs";

/** Transparent margin (px) around text/ui captures, so shadows and glows are kept. */
export const TEXT_PAD = 12;
export const DEFAULT_ART_SCALE = 1;
export const DEFAULT_TEXT_SCALE = 2;
const NAME_HASH_DIGITS = 8;
const PT_PER_PX = 0.5; // 13.333 in * 72 pt = 960 pt across 1920 px

/** Margin captured around a layer. Art is clipped to its box in the player, so it has none. */
export function capturePad(layer) {
  if (layer.kind === "art") return 0;
  return Number.isFinite(layer.pad) ? layer.pad : TEXT_PAD;
}

/** PPTX object name of a layer's picture (see header). */
export function pictureName(layer, imageHash) {
  if (layer.kind === "art") return `!!${layer.id}`;
  return `!!${layer.id}~${imageHash.slice(0, NAME_HASH_DIGITS)}`;
}

export const isNativeText = (layer, nativeText) =>
  nativeText && layer.kind === "text" && typeof layer.text === "string" && layer.font?.family && layer.font?.size;

const inches = (px) => Number((px * INCH_PER_PX).toFixed(6));

/**
 * Everything outside a layer's own content that changes how it renders: every
 * deck file except deck.js (whose layer content is keyed per layer) and build
 * outputs, plus the page's live CSS (which also catches styles that deck.js
 * injects). Linked stylesheets on file:// pages hide their rules (cssRules
 * throws), but their files are already hashed from disk.
 */
async function environmentHash(page, deckDir) {
  const css = await page.evaluate(() =>
    [...document.styleSheets]
      .map((sheet) => {
        try {
          return [...sheet.cssRules].map((rule) => rule.cssText).join("\n");
        } catch {
          return sheet.href ?? "";
        }
      })
      .join("\n"),
  );
  const skip = new Set(["deck.js", "renders", "dist", ".cache", "node_modules", "check-report.md"]);
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (skip.has(entry.name) || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(`${path.relative(deckDir, full)}:${sha256(fs.readFileSync(full))}`);
    }
  };
  walk(deckDir);
  return sha256([css, ...files].join("|"));
}

function createCache(deckDir, enabled) {
  const dir = path.join(deckDir, ".cache", "media");
  const indexFile = path.join(deckDir, ".cache", "pptx-index.json");
  fs.mkdirSync(dir, { recursive: true });
  let index = {};
  if (enabled && fs.existsSync(indexFile)) index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  return {
    get(key) {
      const file = index[key] && path.join(dir, `${index[key]}.png`);
      return file && fs.existsSync(file) ? { file, hash: index[key] } : null;
    },
    put(key, bytes) {
      const hash = sha256(bytes);
      const file = path.join(dir, `${hash}.png`);
      if (!fs.existsSync(file)) fs.writeFileSync(file, bytes);
      index[key] = hash;
      return { file, hash };
    },
    save: () => fs.writeFileSync(indexFile, JSON.stringify(index, null, 1)),
  };
}

/** Transparent PNG of one layer of the current state, at its page's device scale. */
async function captureLayer(page, layer) {
  const pad = capturePad(layer);
  const need = { width: Math.ceil(layer.box.w + 2 * pad), height: Math.ceil(layer.box.h + 2 * pad) };
  // A layer larger than the stage (a panorama with offCanvas) needs a larger viewport to be captured whole.
  const grow = need.width > STAGE.width || need.height > STAGE.height;
  if (grow) await page.setViewportSize({ width: Math.max(need.width, STAGE.width), height: Math.max(need.height, STAGE.height) });
  const { clip } = await page.evaluate(([id, p]) => window.deck.isolate(id, { pad: p }), [layer.id, pad]);
  const png = await page.screenshot({ clip, omitBackground: true, type: "png" });
  await page.evaluate(() => window.deck.isolate(null));
  if (grow) await page.setViewportSize(STAGE);
  return png;
}

async function backgroundHex(page) {
  const rgb = await page.evaluate(() => getComputedStyle(document.getElementById("st-stage")).backgroundColor);
  const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? [0, 0, 0]).map(Number);
  return [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function cssColorToHex(color) {
  const hex = String(color ?? "").replace(/^#/, "");
  if (/^[0-9a-f]{6}$/i.test(hex)) return hex.toUpperCase();
  if (/^[0-9a-f]{3}$/i.test(hex)) return hex.split("").map((c) => c + c).join("").toUpperCase();
  return "000000";
}

function addNativeText(slide, layer) {
  const { font, box } = layer;
  slide.addText(layer.text, {
    x: inches(box.x),
    y: inches(box.y),
    w: inches(box.w),
    h: inches(box.h),
    fontFace: font.family,
    fontSize: font.size * PT_PER_PX,
    color: cssColorToHex(font.color),
    bold: Boolean(font.bold),
    align: font.align ?? "left",
    valign: "top",
    margin: 0,
    fit: "none",
    objectName: `!!${layer.id}`,
    transparency: layer.opacity < 1 ? Math.round((1 - layer.opacity) * 100) : undefined,
    rotate: layer.rotate || undefined,
  });
}

export async function exportPptx(deckDir, options = {}) {
  const {
    out = path.join(deckDir, "dist", "deck.pptx"),
    nativeText = false,
    artScale = DEFAULT_ART_SCALE,
    textScale = DEFAULT_TEXT_SCALE,
    useCache = true,
  } = options;
  const started = Date.now();
  // One page per capture scale, both showing the same state.
  const art = await openDeck(deckDir, { deviceScaleFactor: artScale });
  const text = artScale === textScale ? art : await openDeck(deckDir, { deviceScaleFactor: textScale, browser: art.browser });
  const counters = { captured: 0, cached: 0, pictures: 0, nativeText: 0 };
  const nativeFonts = new Set();
  try {
    const info = await deckInfo(art.page);
    const states = await deckStates(art.page);
    const cache = createCache(deckDir, useCache);
    const env = await environmentHash(art.page, deckDir);
    const background = await backgroundHex(art.page);

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
    pptx.title = info.title;
    const transitions = [];

    for (const state of states) {
      const stateStarted = Date.now();
      await goTo(art.page, state.index);
      if (text !== art) await goTo(text.page, state.index);
      const layers = await stateLayers(art.page, state.index);
      const slide = pptx.addSlide();
      slide.background = { color: background };

      for (const layer of layers) {
        if (isNativeText(layer, nativeText)) {
          addNativeText(slide, layer);
          nativeFonts.add(layer.font.family);
          counters.nativeText++;
          continue;
        }
        const isArt = layer.kind === "art";
        const scale = isArt ? artScale : textScale;
        const pad = capturePad(layer);
        const key = sha256([env, layer.id, layer.kind, layer.key, layer.box.w, layer.box.h, pad, scale].join("|"));
        let shot = cache.get(key);
        if (shot) counters.cached++;
        else {
          shot = cache.put(key, await captureLayer(isArt ? art.page : text.page, layer));
          counters.captured++;
        }
        slide.addImage({
          path: shot.file,
          x: inches(layer.box.x - pad),
          y: inches(layer.box.y - pad),
          w: inches(layer.box.w + 2 * pad),
          h: inches(layer.box.h + 2 * pad),
          objectName: pictureName(layer, shot.hash),
          // Empty alt marks art as decorative (see pptx-ooxml.mjs); text keeps its words as alt.
          altText: layer.alt || DECORATIVE_ALT,
          ...(layer.opacity < 1 ? { transparency: Math.round((1 - layer.opacity) * 100) } : {}),
          ...(layer.rotate ? { rotate: layer.rotate } : {}),
        });
        counters.pictures++;
      }
      slide.addNotes(notesText(state.notes));
      transitions.push(state.transition);
      console.log(`  ${String(state.index).padStart(2)} ${state.id.padEnd(28)} ${layers.length} layers  ${Date.now() - stateStarted} ms`);
    }
    assertNoPageErrors([...art.pageErrors, ...(text === art ? [] : text.pageErrors)], "export");
    cache.save();

    const raw = await pptx.write({ outputType: "nodebuffer" });
    const { buffer, media } = await postprocessPptx(raw, { transitions });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buffer);

    const count = (kind) => transitions.filter((t) => t === kind).length;
    const megabytes = (buffer.length / 1024 / 1024).toFixed(2);
    console.log(
      `export-pptx: ${rel(out)} (${megabytes} MB) in ${((Date.now() - started) / 1000).toFixed(1)} s\n` +
        `  slides ${states.length} (morph ${count("morph")}, fade ${count("fade")}, cut ${count("cut")}), ` +
        `pictures ${counters.pictures} (captured ${counters.captured}, cached ${counters.cached})` +
        `${counters.nativeText ? `, native text boxes ${counters.nativeText}` : ""}\n` +
        `  capture scale: art ${artScale}x, text ${textScale}x; media ${media.before} -> ${media.after} after dedupe`,
    );
    if (nativeFonts.size) {
      console.warn(`  warning: native text needs these fonts installed on the presenting machine: ${[...nativeFonts].join(", ")}`);
    }
    return { out, bytes: buffer.length, slides: states.length, media, counters };
  } finally {
    if (text !== art) await text.close();
    await art.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { options, positional } = parseArgs(process.argv.slice(2));
  const deckDir = deckDirFromArgs(
    positional,
    "node tools/export-pptx.mjs <deck-dir> [--out file.pptx] [--native-text] [--art-scale N] [--text-scale N] [--no-cache]",
  );
  try {
    await exportPptx(deckDir, {
      out: options.out ? path.resolve(options.out) : undefined,
      nativeText: options["native-text"] === true,
      artScale: options["art-scale"] ? Number(options["art-scale"]) : undefined,
      textScale: options["text-scale"] ? Number(options["text-scale"]) : undefined,
      useCache: options["no-cache"] !== true,
    });
  } catch (error) {
    console.error(`export-pptx failed: ${error.stack ?? error}`);
    process.exit(1);
  }
}
