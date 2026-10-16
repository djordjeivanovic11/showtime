// Static PDF backup (one page per state, its final look) and a presenter
// script in Markdown.
//
//   node tools/export-pdf.mjs <deck-dir> [--out file.pdf]
//
// Pages come from renders/state-NN.png; the renders are (re)made first when
// missing, incomplete, or older than any deck source file. Writes
// dist/deck.pdf and dist/presenter-notes.md (state, tag, say, cue, timing).

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFDocument } from "pdf-lib";
import { deckDirFromArgs, deckInfo, deckStates, formatClock, openDeck, pad2, parseArgs, rel } from "./lib.mjs";
import { renderDeck } from "./render.mjs";

/** PDF page = the PPTX slide, 13.333 x 7.5 in, in points. */
const PAGE = { w: 960, h: 540 };
const SOURCE_PATTERN = /\.(html|js|css|woff2?|ttf|otf|svg|png|jpe?g|webp)$/i;

function newestSourceTime(deckDir) {
  let newest = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["renders", "dist", ".cache", "node_modules"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (SOURCE_PATTERN.test(entry.name)) newest = Math.max(newest, fs.statSync(full).mtimeMs);
    }
  };
  walk(deckDir);
  return newest;
}

function rendersAreCurrent(deckDir, count) {
  const files = Array.from({ length: count }, (_, i) => path.join(deckDir, "renders", `state-${pad2(i)}.png`));
  if (!files.every((file) => fs.existsSync(file))) return false;
  const oldest = Math.min(...files.map((file) => fs.statSync(file).mtimeMs));
  return oldest >= newestSourceTime(deckDir);
}

export function presenterNotesMarkdown(info, states) {
  const target = info.targetSeconds ? ` (target ${formatClock(info.targetSeconds)})` : "";
  const lines = [`# ${info.title}: presenter notes`, "", `Estimated total ${formatClock(info.totalSeconds)}${target} at ${info.wpm} wpm.`, ""];
  for (const s of states) {
    const time = `${formatClock(s.startsAt)}–${formatClock(s.startsAt + s.seconds)}, ~${s.seconds} s`;
    lines.push(`## ${s.index + 1}. ${s.tag || s.id}`, "", `\`${s.id}\` · ${s.transition} · ${time}`, "");
    lines.push(`**Say:** ${s.notes.say || "(missing)"}`, "");
    if (s.notes.cue) lines.push(`**Click:** ${s.notes.cue}`, "");
    if (s.notes.plain) lines.push(`**In plain words:** ${s.notes.plain}`, "");
    if (s.notes.detail) lines.push(`**Detail:** ${s.notes.detail}`, "");
  }
  return `${lines.join("\n")}\n`;
}

export async function exportPdf(deckDir, { out = path.join(deckDir, "dist", "deck.pdf") } = {}) {
  const session = await openDeck(deckDir);
  let info;
  let states;
  try {
    info = await deckInfo(session.page);
    states = await deckStates(session.page);
  } finally {
    await session.close();
  }
  if (!rendersAreCurrent(deckDir, states.length)) {
    console.log("export-pdf: renders missing or stale; rendering first");
    await renderDeck(deckDir);
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle(info.title);
  pdf.setCreator("storytime engine");
  for (const state of states) {
    const png = fs.readFileSync(path.join(deckDir, "renders", `state-${pad2(state.index)}.png`));
    const image = await pdf.embedPng(png);
    pdf.addPage([PAGE.w, PAGE.h]).drawImage(image, { x: 0, y: 0, width: PAGE.w, height: PAGE.h });
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const bytes = await pdf.save();
  fs.writeFileSync(out, bytes);
  const notesFile = path.join(path.dirname(out), "presenter-notes.md");
  fs.writeFileSync(notesFile, presenterNotesMarkdown(info, states));
  console.log(`export-pdf: ${rel(out)} (${states.length} pages, ${(bytes.length / 1024 / 1024).toFixed(2)} MB), ${rel(notesFile)}`);
  return { out, notesFile, pages: states.length, bytes: bytes.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { options, positional } = parseArgs(process.argv.slice(2));
  const deckDir = deckDirFromArgs(positional, "node tools/export-pdf.mjs <deck-dir> [--out file.pdf]");
  try {
    await exportPdf(deckDir, { out: options.out ? path.resolve(options.out) : undefined });
  } catch (error) {
    console.error(`export-pdf failed: ${error.stack ?? error}`);
    process.exit(1);
  }
}
