// Shared helpers for the storytime tools: argument parsing, deck paths, and
// opening a deck in headless Chromium at exactly 1920x1080 in export mode.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

export const ENGINE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const STAGE = { width: 1920, height: 1080 };

/** 13.333 in = 1920 px, so one stage px is 1/144 in = 6350 EMU. */
export const EMU_PER_PX = 6350;
export const INCH_PER_PX = 1 / 144;

/** Parse `--name value` / `--flag` options and positional arguments. */
export function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      options[name] = next;
      i++;
    } else {
      options[name] = true;
    }
  }
  return { options, positional };
}

/** Resolve the deck directory argument and fail clearly if it is not a deck. */
export function deckDirFromArgs(positional, usage) {
  if (!positional[0]) {
    console.error(`usage: ${usage}`);
    process.exit(2);
  }
  const deckDir = path.resolve(positional[0]);
  const index = path.join(deckDir, "index.html");
  if (!fs.existsSync(index)) {
    console.error(`${deckDir} is not a deck directory (no index.html).`);
    process.exit(2);
  }
  return deckDir;
}

export function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export const pad2 = (n) => String(n).padStart(2, "0");

/** Short path for logs: relative to the working directory unless that climbs out of it. */
export function rel(file) {
  const relative = path.relative(process.cwd(), file);
  if (relative.startsWith(`..${path.sep}..`)) return file;
  return relative || ".";
}

/**
 * Launch Chromium and open `<deckDir>/index.html?export=1` (or `htmlFile`).
 * Collects page errors (uncaught exceptions, console.error, failed requests)
 * in `pageErrors`. Resolves once the deck reports ready; throws the deck's own
 * error message if it failed to load.
 */
export async function openDeck(deckDir, { htmlFile, deviceScaleFactor = 1, query = "", browser } = {}) {
  const ownBrowser = !browser;
  browser = browser ?? (await chromium.launch());
  const context = await browser.newContext({ viewport: STAGE, deviceScaleFactor, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(`uncaught: ${error.message.split("\n")[0]}`));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(`console.error: ${message.text().split("\n")[0]}`);
  });
  page.on("requestfailed", (request) => {
    pageErrors.push(`failed to load ${request.url().slice(0, 160)} (${request.failure()?.errorText})`);
  });

  const file = htmlFile ?? path.join(deckDir, "index.html");
  const url = `${pathToFileURL(file).href}?export=1${query}`;
  await page.goto(url);
  try {
    // Also stop early when the page has loaded but storytime.js never ran.
    const settled = () =>
      document.body?.dataset.ready === "1" ||
      window.storytimeError ||
      (document.readyState === "complete" && !window.Storytime);
    await page.waitForFunction(settled, null, { timeout: 30000 });
  } catch (error) {
    if (ownBrowser) await browser.close();
    throw new Error(
      `deck did not become ready within 30 s (is storytime.js next to index.html?)\n  ${pageErrors.join("\n  ")}`,
      { cause: error },
    );
  }
  const deckError = await page.evaluate(() =>
    window.Storytime ? (window.storytimeError ?? null) : "storytime.js did not load (copy it next to index.html)",
  );
  if (deckError) {
    if (ownBrowser) await browser.close();
    throw new Error(`deck failed to load: ${deckError}\n  ${pageErrors.join("\n  ")}`);
  }
  const close = () => (ownBrowser ? browser.close() : context.close());
  return { browser, context, page, pageErrors, close };
}

/** States as the runtime normalized them. */
export function deckStates(page) {
  return page.evaluate(() => window.deck.states());
}

export function deckInfo(page) {
  return page.evaluate(() => ({
    title: window.deck.title,
    wpm: window.deck.wpm,
    targetSeconds: window.deck.targetSeconds,
    background: window.deck.background,
    totalSeconds: window.deck.totalSeconds,
    count: window.deck.count,
    version: window.deck.version,
  }));
}

export function goTo(page, index, { instant = true } = {}) {
  return page.evaluate(([n, inst]) => window.deck.goTo(n, { instant: inst }), [index, instant]);
}

export function stateLayers(page, index) {
  return page.evaluate((n) => window.deck.layers(n), index);
}

/** "SAY ... CLICK ... IN PLAIN WORDS ... DETAIL ..." with empty sections omitted. */
export function notesText(notes) {
  const sections = [
    ["SAY", notes.say],
    ["CLICK", notes.cue],
    ["IN PLAIN WORDS", notes.plain],
    ["DETAIL", notes.detail],
  ];
  return sections
    .filter(([, body]) => body && String(body).trim())
    .map(([label, body]) => `${label}\n${String(body).trim()}`)
    .join("\n\n");
}

export function formatClock(seconds) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

/** Warn when the deck's copy of storytime.js differs from this engine's. */
export function staleRuntimeWarning(deckDir) {
  const deckCopy = path.join(deckDir, "storytime.js");
  const engineCopy = path.join(ENGINE_DIR, "storytime.js");
  if (!fs.existsSync(deckCopy)) return `no storytime.js in ${deckDir}; copy ${engineCopy} there`;
  if (sha256(fs.readFileSync(deckCopy)) !== sha256(fs.readFileSync(engineCopy))) {
    return `the deck's storytime.js differs from ${rel(engineCopy)}; copy the engine version if this is unintended`;
  }
  return null;
}

/** Fail the tool if the page logged errors. */
export function assertNoPageErrors(pageErrors, what) {
  if (!pageErrors.length) return;
  throw new Error(`${pageErrors.length} page error(s) during ${what}:\n  ${pageErrors.join("\n  ")}`);
}
