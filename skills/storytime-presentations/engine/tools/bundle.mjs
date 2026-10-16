// Bundle a deck into ONE self-contained HTML file that plays offline.
//
//   node tools/bundle.mjs <deck-dir> [--out dist/deck.html]
//
// Inlines every local <script src> and <link rel="stylesheet">, then replaces
// every reference to an existing local asset (url(...) in CSS, or a quoted
// "path/file.ext" in HTML/JS, such as fonts/x.woff2 or art/bg.png) with a data
// URI. References are resolved against the deck directory, which is the
// document base for CSS a kit injects from JS. Afterwards the bundle is opened
// in Chromium: it must become ready with the same state count and make no
// request other than to itself.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertNoPageErrors, deckDirFromArgs, openDeck, parseArgs, rel } from "./lib.mjs";

const MIME = {
  woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml", mp3: "audio/mpeg", mp4: "video/mp4",
};
const ASSET = new RegExp(`\\.(${Object.keys(MIME).join("|")})$`, "i");

function isLocal(ref) {
  return !/^(data:|https?:|blob:|#|\/\/)/i.test(ref);
}

function dataUri(file) {
  const mime = MIME[path.extname(file).slice(1).toLowerCase()];
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

function isInsideDeck(file, deckRoot) {
  const relative = path.relative(deckRoot, file);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/** Resolve a local reference without allowing it to read outside the deck. */
export function resolveDeckFile(ref, baseDir, deckRoot, description) {
  const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
  const file = path.resolve(baseDir, clean);
  if (!isInsideDeck(file, deckRoot)) {
    throw new Error(`${description} escapes the deck directory (${ref})`);
  }
  // A symlink within the deck must not point to a private file outside it.
  if (fs.existsSync(file) && !isInsideDeck(fs.realpathSync(file), fs.realpathSync(deckRoot))) {
    throw new Error(`${description} escapes the deck directory through a symlink (${ref})`);
  }
  return file;
}

/** Replace references to existing local assets with data URIs; records what it inlined. */
function inlineAssets(text, baseDir, deckRoot, inlined) {
  const resolve = (ref) => {
    if (!isLocal(ref) || !ASSET.test(decodeURIComponent(ref.split(/[?#]/)[0]))) return null;
    const file = resolveDeckFile(ref, baseDir, deckRoot, "asset");
    return fs.existsSync(file) ? file : null;
  };
  const swap = (whole, quote, ref) => {
    const file = resolve(ref);
    if (!file) return whole;
    inlined.add(path.relative(deckRoot, file));
    return whole.replace(ref, dataUri(file));
  };
  return text
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, swap)
    .replace(/(["'`])([^"'`\s<>(){}]+\.[a-z0-9]{2,5})\1/gi, swap);
}

export async function bundleDeck(deckDir, { out = path.join(deckDir, "dist", "deck.html") } = {}) {
  let html = fs.readFileSync(path.join(deckDir, "index.html"), "utf8");
  const inlined = new Set();
  const scripts = [];

  html = html.replace(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (whole, before, src) => {
    if (!isLocal(src)) throw new Error(`index.html loads a remote script (${src}); decks must work offline`);
    const file = resolveDeckFile(src, deckDir, deckDir, "script");
    if (!fs.existsSync(file)) throw new Error(`index.html loads ${src}, which does not exist`);
    scripts.push(src);
    // "</script" inside the code would end the inline element early.
    const code = inlineAssets(fs.readFileSync(file, "utf8"), deckDir, deckDir, inlined).replace(/<\/script/gi, "<\\/script");
    return `<script>/* ${src} */\n${code}\n</script>`;
  });
  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, (whole) => {
    const href = whole.match(/href=["']([^"']+)["']/)?.[1];
    if (!href || !isLocal(href)) throw new Error(`index.html links a remote stylesheet (${href}); decks must work offline`);
    const file = resolveDeckFile(href, deckDir, deckDir, "stylesheet");
    const css = inlineAssets(fs.readFileSync(file, "utf8"), path.dirname(file), deckDir, inlined);
    return `<style>/* ${href} */\n${css}\n</style>`;
  });
  html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (block) => inlineAssets(block, deckDir, deckDir, inlined));
  if (!scripts.some((src) => path.basename(src) === "storytime.js")) {
    throw new Error("index.html does not load storytime.js");
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  const bytes = Buffer.byteLength(html);

  // Prove it is self-contained: it must load from its own location with no other requests.
  const session = await openDeck(deckDir, { htmlFile: out });
  const self = pathToFileURL(out).href;
  const requests = [];
  session.page.on("request", (request) => requests.push(request.url()));
  try {
    const original = await openDeck(deckDir, { browser: session.browser });
    const [bundled, expected] = await Promise.all([
      session.page.evaluate(() => window.deck.count),
      original.page.evaluate(() => window.deck.count),
    ]);
    await original.close();
    if (bundled !== expected) throw new Error(`bundle has ${bundled} states, deck has ${expected}`);
    await session.page.reload();
    await session.page.waitForFunction(() => document.body?.dataset.ready === "1");
    const external = requests.filter((url) => !url.startsWith("data:") && !url.startsWith(self));
    if (external.length) throw new Error(`bundle still requests: ${external.join(", ")}`);
    assertNoPageErrors(session.pageErrors, "bundle check");
  } finally {
    await session.close();
  }
  console.log(
    `bundle: ${rel(out)} (${(bytes / 1024).toFixed(0)} KiB): ${scripts.length} script(s), ` +
      `${inlined.size} asset(s) inlined${inlined.size ? ` (${[...inlined].join(", ")})` : ""}; loads offline`,
  );
  return { out, bytes, inlined: [...inlined] };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { options, positional } = parseArgs(process.argv.slice(2));
  const deckDir = deckDirFromArgs(positional, "node tools/bundle.mjs <deck-dir> [--out dist/deck.html]");
  try {
    await bundleDeck(deckDir, { out: options.out ? path.resolve(options.out) : undefined });
  } catch (error) {
    console.error(`bundle failed: ${error.message}`);
    process.exit(1);
  }
}
