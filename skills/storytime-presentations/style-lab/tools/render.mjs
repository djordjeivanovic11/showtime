// Render every state of a storytime HTML deck to 1920x1080 PNGs plus a
// contact sheet, and a mid-transition frame for each state change.
//
// Usage: node render.mjs <deck-dir-or-index.html> [--midframes]
//
// Deck contract: index.html honours ?state=N (0-based) by showing that state
// with no transition, exposes window.deck = { count, goTo(n) }, and sets
// document.body.dataset.ready = "1" once fonts and art are drawn.
import { chromium } from "playwright";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const target = process.argv[2];
const wantMidframes = process.argv.includes("--midframes");
if (!target) {
  console.error("usage: node render.mjs <deck-dir-or-index.html> [--midframes]");
  process.exit(2);
}
const indexPath = statSync(target).isDirectory()
  ? path.join(target, "index.html")
  : target;
if (!existsSync(indexPath)) {
  console.error(`no index.html at ${indexPath}`);
  process.exit(2);
}
const deckDir = path.dirname(path.resolve(indexPath));
const outDir = path.join(deckDir, "renders");
mkdirSync(outDir, { recursive: true });
const baseUrl = pathToFileURL(path.resolve(indexPath)).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const consoleErrors = [];
page.on("pageerror", (err) => consoleErrors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

async function waitReady() {
  await page.waitForFunction(() => document.body?.dataset.ready === "1", null, {
    timeout: 15000,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}

await page.goto(`${baseUrl}?state=0`);
await waitReady();
const count = await page.evaluate(() => window.deck?.count ?? 0);
if (!count) throw new Error("window.deck.count missing or zero");

const files = [];
for (let i = 0; i < count; i++) {
  await page.goto(`${baseUrl}?state=${i}`);
  await waitReady();
  const file = path.join(outDir, `state-${String(i).padStart(2, "0")}.png`);
  await page.screenshot({ path: file });
  files.push(file);
}

if (wantMidframes) {
  for (let i = 1; i < count; i++) {
    await page.goto(`${baseUrl}?state=${i - 1}`);
    await waitReady();
    await page.evaluate((n) => window.deck.goTo(n), i);
    await page.waitForTimeout(350);
    const file = path.join(outDir, `mid-${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: file });
  }
}
await browser.close();

const contact = path.join(outDir, "contact.png");
// Build rows of three with plain append ops; `magick montage` needs a
// configured font and fails on some machines.
const rowArgs = [];
for (let r = 0; r < files.length; r += 3) {
  rowArgs.push("(", ...files.slice(r, r + 3), "-resize", "960x540",
    "-bordercolor", "#1a1a1a", "-border", "6", "+append", ")");
}
execFileSync("magick", [...rowArgs, "-background", "#1a1a1a", "-gravity",
  "west", "-append", contact]);
console.log(`rendered ${count} states -> ${outDir}`);
console.log(`contact sheet: ${contact}`);
if (consoleErrors.length) {
  console.log("PAGE ERRORS:");
  for (const e of consoleErrors) console.log("  " + e);
}
