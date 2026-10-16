// Check that a PPTX is a faithful compile of the deck.
//
//   node tools/verify-pptx.mjs <deck-dir> [file.pptx]   (default dist/deck.pptx)
//
// Needs renders/state-NN.png (tools/render.mjs). Per slide, against the
// deck's own model (window.deck.states() / layers()):
//   1. structure: one slide per state; transition as the state asks
//      (morph = p159:morph with a fade fallback, fade, or none for cut);
//      notes contain the state's notes.say;
//   2. naming: one picture (or native text box) per layer, back to front;
//      art "!!<id>", text/ui "!!<id>~<hash8>" where hash8 matches the
//      picture's own bytes; every art layer that persists into the next
//      state keeps the same "!!<id>" name there (what Morph matches on);
//   3. geometry: offset/size equal the layer box (+ capture pad) to 2 EMU;
//      rotation and transparency match the layer;
//   4. pixels: the slide rebuilt in Chromium from its media and geometry,
//      versus the HTML render. Pass if under 0.5% of pixels differ (a pixel
//      differs if any channel is off by more than 48/255, which tolerates
//      antialiasing and 2x text downsampling).
// Native text boxes (--native-text) cannot be rebuilt from media; their boxes
// are masked out of the pixel comparison and reported as not pixel-verified.
// None of this exercises PowerPoint itself (Morph playback, font rendering).

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import JSZip from "jszip";
import {
  deckDirFromArgs,
  deckStates,
  EMU_PER_PX,
  openDeck,
  pad2,
  parseArgs,
  rel,
  sha256,
  STAGE,
  stateLayers,
} from "./lib.mjs";
import { capturePad, pictureName } from "./export-pptx.mjs";
import { unescapeXml } from "./pptx-ooxml.mjs";

const MAX_EMU_ERROR = 2;
const CHANNEL_TOLERANCE = 48;
export const MAX_DIFF_FRACTION = 0.005;

function parseSlide(xml, rels) {
  const shapes = [];
  // Pictures and text shapes in document order = back-to-front z order.
  for (const match of xml.matchAll(/<p:(pic|sp)>([\s\S]*?)<\/p:\1>/g)) {
    const [, tag, body] = match;
    const off = body.match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/);
    const ext = body.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    const rot = body.match(/<a:xfrm[^>]*\srot="(-?\d+)"/);
    const alpha = body.match(/<a:alphaModFix amt="(\d+)"\/>/);
    const embed = body.match(/<a:blip r:embed="([^"]+)"/);
    shapes.push({
      type: tag === "pic" ? "picture" : "text",
      name: unescapeXml(body.match(/<p:cNvPr [^>]*name="([^"]*)"/)?.[1] ?? ""),
      target: embed ? rels.get(embed[1]) : null,
      emu: off && ext ? { x: Number(off[1]), y: Number(off[2]), w: Number(ext[1]), h: Number(ext[2]) } : null,
      rotate: rot ? Number(rot[1]) / 60000 : 0,
      opacity: alpha ? Number(alpha[1]) / 100000 : 1,
      decorative: body.includes("adec:decorative"),
    });
  }
  let transition = "cut";
  if (xml.includes("<p159:morph")) transition = "morph";
  else if (xml.includes("<p:fade/>")) transition = "fade";
  const morphHasFallback = transition !== "morph" || /<mc:Fallback><p:transition[^>]*><p:fade\/>/.test(xml);
  return { shapes, transition, morphHasFallback };
}

async function readPackage(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const slides = [];
  for (let n = 1; zip.file(`ppt/slides/slide${n}.xml`); n++) {
    const xml = await zip.file(`ppt/slides/slide${n}.xml`).async("string");
    const relsXml = await zip.file(`ppt/slides/_rels/slide${n}.xml.rels`).async("string");
    const rels = new Map([...relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
    const slide = parseSlide(xml, rels);
    const notesTarget = [...rels.values()].find((target) => target.includes("notesSlide"));
    const notesXml = notesTarget ? await zip.file(path.posix.join("ppt/slides", notesTarget))?.async("string") : "";
    slide.notes = unescapeXml([...(notesXml ?? "").matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join("\n"));
    slides.push(slide);
  }
  const media = new Map();
  for (const name of Object.keys(zip.files).filter((n) => n.startsWith("ppt/media/") && !zip.files[n].dir)) {
    media.set(name, await zip.file(name).async("nodebuffer"));
  }
  return { slides, media };
}

const normalizeSpace = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

/** Structure, naming, and geometry for one slide. */
function checkShapes(where, slide, layers, mediaOf, problems) {
  if (slide.shapes.length !== layers.length) {
    problems.push(`${where}: ${slide.shapes.length} shapes for ${layers.length} layers`);
  }
  for (let z = 0; z < Math.min(slide.shapes.length, layers.length); z++) {
    const shape = slide.shapes[z];
    const layer = layers[z];
    const what = `${where} shape ${z + 1} (${layer.id})`;
    let pad = 0;
    if (shape.type === "text") {
      if (shape.name !== `!!${layer.id}`) problems.push(`${what}: text box named "${shape.name}", expected "!!${layer.id}"`);
    } else {
      const bytes = mediaOf(shape);
      if (!bytes) {
        problems.push(`${what}: picture media ${shape.target} is missing`);
        continue;
      }
      const expected = pictureName(layer, sha256(bytes));
      if (shape.name !== expected) problems.push(`${what}: named "${shape.name}", expected "${expected}"`);
      if (layer.kind === "art" && !layer.alt && !shape.decorative) problems.push(`${what}: art without alt is not marked decorative`);
      pad = capturePad(layer);
    }
    const box = { x: layer.box.x - pad, y: layer.box.y - pad, w: layer.box.w + 2 * pad, h: layer.box.h + 2 * pad };
    for (const key of ["x", "y", "w", "h"]) {
      const expected = Math.round(box[key] * EMU_PER_PX);
      if (!shape.emu || Math.abs(shape.emu[key] - expected) > MAX_EMU_ERROR) {
        problems.push(`${what}: ${key} is ${shape.emu?.[key]} EMU, expected ${expected}`);
      }
    }
    if (Math.abs(shape.rotate - (layer.rotate || 0)) > 0.01) problems.push(`${what}: rotation ${shape.rotate}, expected ${layer.rotate}`);
    if (shape.type === "picture" && Math.abs(shape.opacity - layer.opacity) > 0.006) {
      problems.push(`${what}: opacity ${shape.opacity}, expected ${layer.opacity}`);
    }
  }
}

/** HTML that rebuilds a slide at 1920x1080 from its pictures. */
function composeSlideHtml(slide, mediaOf, background) {
  const images = slide.shapes
    .filter((shape) => shape.type === "picture" && shape.emu)
    .map((shape) => {
      const [x, y, w, h] = ["x", "y", "w", "h"].map((key) => shape.emu[key] / EMU_PER_PX);
      // PowerPoint rotates a picture about its centre, like CSS transform-origin: center.
      const style = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;opacity:${shape.opacity};transform:rotate(${shape.rotate}deg)`;
      return `<img style="position:absolute;${style}" src="data:image/png;base64,${mediaOf(shape).toString("base64")}">`;
    });
  const css = `body{margin:0;width:${STAGE.width}px;height:${STAGE.height}px;background:#${background};overflow:hidden;position:relative}`;
  return `<!doctype html><style>${css}</style>${images.join("")}`;
}

/** Fraction of differing pixels outside `masks` (rects in stage px). */
async function diffAgainstRender(page, composedHtml, referencePng, masks) {
  await page.setContent(composedHtml);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  const composed = await page.screenshot({ type: "png" });
  return page.evaluate(
    async ([a64, b64, tolerance, rects]) => {
      const load = async (b) => createImageBitmap(new Blob([Uint8Array.from(atob(b), (c) => c.charCodeAt(0))], { type: "image/png" }));
      const read = (bitmap) => {
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      };
      const [imgA, imgB] = await Promise.all([load(a64), load(b64)]);
      if (imgA.width !== imgB.width || imgA.height !== imgB.height) return { sizeMismatch: `${imgB.width}x${imgB.height}` };
      const [a, b] = [read(imgA), read(imgB)];
      const masked = (x, y) => rects.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      let differing = 0;
      let total = 0;
      for (let y = 0; y < imgA.height; y++) {
        for (let x = 0; x < imgA.width; x++) {
          if (rects.length && masked(x, y)) continue;
          total++;
          const i = (y * imgA.width + x) * 4;
          if (Math.abs(a[i] - b[i]) > tolerance || Math.abs(a[i + 1] - b[i + 1]) > tolerance || Math.abs(a[i + 2] - b[i + 2]) > tolerance) {
            differing++;
          }
        }
      }
      return { differing, total };
    },
    [composed.toString("base64"), referencePng.toString("base64"), CHANNEL_TOLERANCE, masks],
  );
}

export async function verifyPptx(deckDir, pptxFile = path.join(deckDir, "dist", "deck.pptx")) {
  if (!fs.existsSync(pptxFile)) throw new Error(`${pptxFile} does not exist (run tools/export-pptx.mjs first)`);
  const { slides, media } = await readPackage(pptxFile);
  const mediaOf = (shape) => media.get(path.posix.join("ppt/slides", shape.target ?? ""));
  const problems = [];
  const results = [];
  const session = await openDeck(deckDir);
  try {
    const states = await deckStates(session.page);
    const background = await session.page.evaluate(() => {
      const rgb = getComputedStyle(document.getElementById("st-stage")).backgroundColor.match(/\d+/g).map(Number);
      return rgb.slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("");
    });
    if (slides.length !== states.length) problems.push(`${slides.length} slides for ${states.length} states`);
    const layersByState = [];
    for (const state of states) layersByState.push(await stateLayers(session.page, state.index));
    const comparePage = await session.context.newPage();

    for (let i = 0; i < Math.min(slides.length, states.length); i++) {
      const slide = slides[i];
      const state = states[i];
      const layers = layersByState[i];
      const where = `slide ${i + 1} (${state.id})`;
      const before = problems.length;

      if (slide.transition !== state.transition) problems.push(`${where}: transition ${slide.transition}, state asks for ${state.transition}`);
      if (!slide.morphHasFallback) problems.push(`${where}: morph has no fade fallback`);
      if (!normalizeSpace(slide.notes).includes(normalizeSpace(state.notes.say))) problems.push(`${where}: notes do not contain notes.say`);
      checkShapes(where, slide, layers, mediaOf, problems);

      // Art persisting into the next state must keep its "!!<id>" name there.
      const next = slides[i + 1];
      if (next && layersByState[i + 1]) {
        const nextIds = new Set(layersByState[i + 1].map((l) => l.id));
        const nextNames = new Set(next.shapes.map((s) => s.name));
        for (const layer of layers) {
          if (layer.kind === "art" && nextIds.has(layer.id) && !nextNames.has(`!!${layer.id}`)) {
            problems.push(`${where}: art "${layer.id}" persists but slide ${i + 2} has no "!!${layer.id}"`);
          }
        }
      }

      const renderFile = path.join(deckDir, "renders", `state-${pad2(i)}.png`);
      if (!fs.existsSync(renderFile)) {
        problems.push(`${where}: no render at ${rel(renderFile)} (run tools/render.mjs)`);
        continue;
      }
      const masks = slide.shapes.filter((s) => s.type === "text" && s.emu).map((s) => ({
        x: s.emu.x / EMU_PER_PX, y: s.emu.y / EMU_PER_PX, w: s.emu.w / EMU_PER_PX, h: s.emu.h / EMU_PER_PX,
      }));
      const diff = await diffAgainstRender(comparePage, composeSlideHtml(slide, mediaOf, background), fs.readFileSync(renderFile), masks);
      if (diff.sizeMismatch) {
        problems.push(`${where}: render is ${diff.sizeMismatch}, expected 1920x1080`);
        continue;
      }
      const fraction = diff.differing / diff.total;
      if (fraction >= MAX_DIFF_FRACTION) problems.push(`${where}: ${(fraction * 100).toFixed(3)}% of pixels differ from the render`);
      results.push({ index: i, id: state.id, percent: fraction * 100, masked: masks.length });
      const verdict = problems.length === before ? "ok" : "PROBLEM";
      const maskNote = masks.length ? ` (${masks.length} native text box(es) masked, not pixel-verified)` : "";
      console.log(`  slide ${String(i + 1).padStart(2)} ${state.id.padEnd(28)} ${slide.shapes.length} shapes, ${slide.transition.padEnd(5)} diff ${(fraction * 100).toFixed(3)}%${maskNote}  ${verdict}`);
    }
  } finally {
    await session.close();
  }
  for (const message of session.pageErrors) problems.push(`page error: ${message}`);
  return { problems, results, slides: slides.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { positional } = parseArgs(process.argv.slice(2));
  const deckDir = deckDirFromArgs(positional, "node tools/verify-pptx.mjs <deck-dir> [file.pptx]");
  const pptxFile = positional[1] ? path.resolve(positional[1]) : undefined;
  try {
    const { problems, results } = await verifyPptx(deckDir, pptxFile);
    const worst = results.reduce((max, r) => Math.max(max, r.percent), 0);
    if (problems.length) {
      console.log(`verify-pptx: ${problems.length} problem(s)\n  ${problems.join("\n  ")}`);
      process.exit(1);
    }
    console.log(
      `verify-pptx: ${results.length} slides OK: structure, notes, transitions, names, geometry; ` +
        `worst pixel diff ${worst.toFixed(3)}% (limit ${MAX_DIFF_FRACTION * 100}%)`,
    );
  } catch (error) {
    console.error(`verify-pptx failed: ${error.stack ?? error}`);
    process.exit(1);
  }
}
