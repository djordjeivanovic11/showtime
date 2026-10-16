// Render every state of a deck to 1920x1080 PNGs plus a contact sheet.
//
//   node tools/render.mjs <deck-dir> [--midframes]
//
// Writes <deck-dir>/renders/state-NN.png (final, settled look of each state,
// idle loops frozen at t = 0), optionally mid-NN.png (the transition INTO
// state NN, frozen MIDFRAME_MS after it starts), and contact.png (rows of 3).
// Exits non-zero on any page error.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertNoPageErrors,
  deckDirFromArgs,
  goTo,
  openDeck,
  pad2,
  parseArgs,
  rel,
} from "./lib.mjs";

const MIDFRAME_MS = 350;
const CONTACT_COLUMNS = 3;
const THUMB = { w: 640, h: 360 };

/**
 * Freeze the transition into state `index` at MIDFRAME_MS. Instead of sleeping
 * (timing-dependent), every running Web Animation is paused and seeked, so the
 * frame is the same on every machine.
 */
async function captureMidframe(page, index, file) {
  await goTo(page, index - 1);
  await page.evaluate(
    ([n, ms]) => {
      window.deck.goTo(n); // not awaited: we freeze it mid-flight
      for (const animation of document.getAnimations()) {
        if (animation instanceof CSSAnimation) continue; // idle loops stay frozen at t = 0
        animation.pause();
        animation.currentTime = ms;
      }
    },
    [index, MIDFRAME_MS],
  );
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  await page.screenshot({ path: file });
}

function hasMagick() {
  try {
    execFileSync("magick", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Contact sheet with ImageMagick +append (rows) and -append (stack).
 * `magick montage` is avoided on purpose: it needs a configured font and
 * fails on some machines.
 */
function contactWithMagick(files, out) {
  const args = [];
  for (let r = 0; r < files.length; r += CONTACT_COLUMNS) {
    const row = files.slice(r, r + CONTACT_COLUMNS);
    args.push("(", ...row, "-resize", `${THUMB.w}x${THUMB.h}`, "-bordercolor", "#808080", "-border", "4");
    args.push("+append", ")");
  }
  args.push("-background", "#808080", "-gravity", "NorthWest", "-append", out);
  execFileSync("magick", args);
}

/** Fallback without ImageMagick: lay thumbnails out in a page and screenshot it. */
async function contactWithBrowser(browser, files, out) {
  const page = await browser.newPage();
  const rows = Math.ceil(files.length / CONTACT_COLUMNS);
  const cellW = THUMB.w + 8;
  const cellH = THUMB.h + 8;
  await page.setViewportSize({ width: CONTACT_COLUMNS * cellW, height: rows * cellH });
  const images = files
    .map((file) => `<img src="${pathToFileURL(file).href}" width="${THUMB.w}" height="${THUMB.h}">`)
    .join("");
  await page.setContent(
    `<style>body{margin:0;background:#808080;display:grid;grid-template-columns:repeat(${CONTACT_COLUMNS},${cellW}px);` +
      `line-height:0}img{margin:4px}</style>${images}`,
  );
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
}

export async function renderDeck(deckDir, { midframes = false } = {}) {
  const started = Date.now();
  const rendersDir = path.join(deckDir, "renders");
  fs.mkdirSync(rendersDir, { recursive: true });
  // Clear earlier renders so removed states do not linger next to new ones.
  for (const name of fs.readdirSync(rendersDir)) {
    if (/^(state|mid)-\d+\.png$|^contact\.png$/.test(name)) fs.rmSync(path.join(rendersDir, name));
  }

  const { browser, page, pageErrors, close } = await openDeck(deckDir);
  const files = [];
  try {
    const count = await page.evaluate(() => window.deck.count);
    for (let i = 0; i < count; i++) {
      await goTo(page, i);
      const file = path.join(rendersDir, `state-${pad2(i)}.png`);
      await page.screenshot({ path: file });
      files.push(file);
    }
    if (midframes) {
      for (let i = 1; i < count; i++) {
        await captureMidframe(page, i, path.join(rendersDir, `mid-${pad2(i)}.png`));
      }
    }
    assertNoPageErrors(pageErrors, "render");
    const contact = path.join(rendersDir, "contact.png");
    if (hasMagick()) contactWithMagick(files, contact);
    else await contactWithBrowser(browser, files, contact);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `render: ${files.length} states${midframes ? ` + ${count - 1} midframes` : ""} -> ${rel(rendersDir)}/ ` +
        `(contact.png) in ${seconds} s`,
    );
    return { files, contact, rendersDir };
  } finally {
    await close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { options, positional } = parseArgs(process.argv.slice(2));
  const deckDir = deckDirFromArgs(positional, "node tools/render.mjs <deck-dir> [--midframes]");
  try {
    await renderDeck(deckDir, { midframes: options.midframes === true });
  } catch (error) {
    console.error(`render failed: ${error.message}`);
    process.exit(1);
  }
}
