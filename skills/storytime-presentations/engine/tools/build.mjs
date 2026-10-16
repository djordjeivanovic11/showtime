// Full build: check -> render -> export-pptx -> verify-pptx -> export-pdf -> bundle.
//
//   node tools/build.mjs <deck-dir> [--native-text] [--no-cache] [--allow-warnings]
//
// Stops at the first failing step. Prints what was produced and, just as
// importantly, what was NOT verified.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkDeck } from "./check.mjs";
import { renderDeck } from "./render.mjs";
import { exportPptx } from "./export-pptx.mjs";
import { verifyPptx, MAX_DIFF_FRACTION } from "./verify-pptx.mjs";
import { exportPdf } from "./export-pdf.mjs";
import { bundleDeck } from "./bundle.mjs";
import { deckDirFromArgs, formatClock, parseArgs, rel } from "./lib.mjs";

const size = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(0)} KiB`);

async function step(name, action) {
  console.log(`\n== ${name}`);
  const started = Date.now();
  const result = await action();
  console.log(`   (${((Date.now() - started) / 1000).toFixed(1)} s)`);
  return result;
}

export async function buildDeck(deckDir, { nativeText = false, useCache = true } = {}) {
  const check = await step("check", () => checkDeck(deckDir));
  for (const item of check.report.items.filter((i) => i.level !== "INFO")) {
    console.log(`   ${item.level.padEnd(5)} [${item.state}${item.layer ? ` / ${item.layer}` : ""}] ${item.message}`);
  }
  const errors = check.report.items.filter((i) => i.level === "ERROR").length;
  const warnings = check.report.items.filter((i) => i.level === "WARN").length;
  console.log(`   ${errors} error(s), ${warnings} warning(s) -> ${rel(path.join(deckDir, "check-report.md"))}`);
  if (errors) throw new Error("check found errors; fix them before exporting");

  const render = await step("render", () => renderDeck(deckDir, { midframes: true }));
  const pptx = await step("export-pptx", () => exportPptx(deckDir, { nativeText, useCache }));
  const verify = await step("verify-pptx", () => verifyPptx(deckDir, pptx.out));
  if (verify.problems.length) {
    throw new Error(`verify-pptx found ${verify.problems.length} problem(s):\n  ${verify.problems.join("\n  ")}`);
  }
  const pdf = await step("export-pdf", () => exportPdf(deckDir));
  const bundle = await step("bundle", () => bundleDeck(deckDir));

  const worst = verify.results.reduce((max, r) => Math.max(max, r.percent), 0);
  const target = check.info.targetSeconds ? ` (target ${formatClock(check.info.targetSeconds)})` : "";
  const masked = verify.results.reduce((n, r) => n + r.masked, 0);
  console.log(`
== build OK: ${check.states.length} states, ~${formatClock(check.info.totalSeconds)} estimated${target}
   player   ${rel(bundle.out)} (${size(bundle.bytes)}, offline single file)
   pptx     ${rel(pptx.out)} (${size(pptx.bytes)}, ${pptx.media.after} media files)
   pdf      ${rel(pdf.out)} (${size(pdf.bytes)}), notes ${rel(pdf.notesFile)}
   renders  ${rel(render.rendersDir)}/ (state-NN.png, mid-NN.png, contact.png)
   report   ${rel(path.join(deckDir, "check-report.md"))} (${warnings} warning(s))

Verified (engineering checks, in headless Chromium and by reading the PPTX package):
   - every state renders without page errors; fonts load; lint rules in check-report.md
   - PPTX: one slide per state, notes contain each state's SAY text, transitions as declared
     (Morph with Fade fallback), picture names follow the Morph naming rules, persistent art
     keeps its name, geometry matches each layer box
   - each slide rebuilt from its PPTX media matches the HTML render (worst ${worst.toFixed(3)}% of
     pixels differ; limit ${MAX_DIFF_FRACTION * 100}%)${masked ? `; ${masked} native text box(es) masked, not pixel-verified` : ""}
   - the bundled HTML loads with no requests outside itself
NOT verified:
   - PowerPoint/Keynote/Google Slides playback: Morph motion, Fade fallback, Presenter View
     (open the PPTX in PowerPoint and click through before presenting)
   - mid-transition frames in PowerPoint (mid-NN.png shows the HTML player only)
   - whether the story is clear, the art is good, or any claim is true${nativeText ? "\n   - native text: line breaks and font rendering in PowerPoint (font must be installed)" : ""}`);
  return { check, render, pptx, verify, pdf, bundle };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { options, positional } = parseArgs(process.argv.slice(2));
  const deckDir = deckDirFromArgs(positional, "node tools/build.mjs <deck-dir> [--native-text] [--no-cache]");
  if (!fs.existsSync(path.join(deckDir, "storytime.js"))) {
    console.error(`no storytime.js in ${deckDir}; copy the engine's storytime.js next to index.html`);
    process.exit(2);
  }
  try {
    await buildDeck(deckDir, { nativeText: options["native-text"] === true, useCache: options["no-cache"] !== true });
  } catch (error) {
    console.error(`\nbuild failed: ${error.message}`);
    process.exit(1);
  }
}
