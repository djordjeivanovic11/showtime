// OOXML post-processing for pptxgenjs output (ported from the original deck):
//   1. slide transitions: Morph with a Fade fallback, Fade, or none,
//   2. speaker notes split into real paragraphs,
//   3. identical media files stored once across all slides,
//   4. pictures without alt text marked decorative,
//   5. [Content_Types].xml limited to parts that exist.
//
// Morph markup matches what PowerPoint 2019/365 writes: the p159:morph element
// is wrapped in mc:AlternateContent, so PowerPoint versions without Morph (and
// other readers such as Keynote, Google Slides, LibreOffice) take the plain
// Fade fallback instead of rejecting the file. The element goes right after
// <p:clrMapOvr>, which is where CT_Slide puts <p:transition> (schema order:
// cSld, clrMapOvr, transition, timing, extLst); anywhere else is invalid.

import crypto from "node:crypto";
import JSZip from "jszip";

const NS_MC = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const NS_P14 = "http://schemas.microsoft.com/office/powerpoint/2010/main";
const NS_P159 = "http://schemas.microsoft.com/office/powerpoint/2015/09/main";

/** Morph duration in ms; the HTML player's default tween is the same 700 ms. */
export const MORPH_MS = 700;

/**
 * pptxgenjs replaces an empty alt text with the image's file path, so the
 * exporter passes this marker and markDecorativePictures() swaps it for
 * PowerPoint's own "decorative" flag (Office 2019+), which screen readers skip.
 */
export const DECORATIVE_ALT = "__storytime-decorative__";
const DECORATIVE_EXT =
  '<a:extLst><a:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}">' +
  '<adec:decorative xmlns:adec="http://schemas.microsoft.com/office/drawing/2017/decorative" val="1"/>' +
  "</a:ext></a:extLst>";

export function transitionXml(kind) {
  if (kind === "cut") return "";
  if (kind === "fade") return '<p:transition spd="med"><p:fade/></p:transition>';
  // option="byObject" matches shapes by name; "!!"-prefixed names force a match
  // even when the shapes differ, which is how persistent layers move.
  return (
    `<mc:AlternateContent xmlns:mc="${NS_MC}">` +
    `<mc:Choice xmlns:p159="${NS_P159}" Requires="p159">` +
    `<p:transition spd="slow" xmlns:p14="${NS_P14}" p14:dur="${MORPH_MS}">` +
    '<p159:morph option="byObject"/></p:transition>' +
    "</mc:Choice>" +
    '<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback>' +
    "</mc:AlternateContent>"
  );
}

function insertTransition(slideXml, kind, slidePath) {
  const xml = transitionXml(kind);
  if (!xml) return slideXml;
  if (slideXml.includes("<p:transition") || slideXml.includes("<mc:AlternateContent")) {
    throw new Error(`${slidePath} already has a transition; refusing to add a second one.`);
  }
  const anchor = "</p:clrMapOvr>";
  if (slideXml.includes(anchor)) return slideXml.replace(anchor, anchor + xml);
  // No clrMapOvr: the transition follows </p:cSld> directly.
  if (!slideXml.includes("</p:cSld>")) throw new Error(`${slidePath} has no </p:cSld>.`);
  return slideXml.replace("</p:cSld>", "</p:cSld>" + xml);
}

/**
 * pptxgenjs writes all notes into one <a:t> with CRLFs, which Presenter View
 * shows as one run. Rewrite the notes body as one <a:p> per line. The text is
 * already XML-escaped by pptxgenjs, so lines are copied as they are.
 */
export function splitNotesParagraphs(notesXml) {
  const pattern = new RegExp(
    '<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>([\\s\\S]*?)</a:t></a:r>' +
      '<a:endParaRPr lang="en-US" dirty="0"/></a:p>',
  );
  const match = notesXml.match(pattern);
  if (!match) return notesXml;
  const paragraphs = match[1]
    .split(/\r?\n/)
    .map((line) =>
      line
        ? `<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${line}</a:t></a:r></a:p>`
        : '<a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>',
    )
    .join("");
  return notesXml.replace(match[0], paragraphs);
}

function markDecorativePictures(slideXml) {
  const pattern = new RegExp(` descr="${DECORATIVE_ALT}">\\s*</p:cNvPr>`, "g");
  return slideXml.replace(pattern, `>${DECORATIVE_EXT}</p:cNvPr>`);
}

/** Keep one copy of each distinct media file and repoint relationships. */
async function dedupeMedia(zip) {
  const mediaPaths = Object.keys(zip.files).filter((name) => name.startsWith("ppt/media/") && !zip.files[name].dir);
  const canonicalByHash = new Map();
  const replacement = new Map(); // "image-3-2.png" -> "image-1-1.png"
  for (const name of mediaPaths.sort()) {
    const bytes = await zip.file(name).async("nodebuffer");
    const extension = name.slice(name.lastIndexOf("."));
    const hash = crypto.createHash("sha256").update(bytes).digest("hex") + extension;
    const canonical = canonicalByHash.get(hash);
    if (canonical) {
      replacement.set(name.slice("ppt/media/".length), canonical.slice("ppt/media/".length));
      zip.remove(name);
    } else {
      canonicalByHash.set(hash, name);
    }
  }
  if (replacement.size === 0) return { before: mediaPaths.length, after: mediaPaths.length };

  const relsPattern = /^ppt\/(slides|slideLayouts|slideMasters)\/_rels\/.*\.rels$/;
  for (const relsPath of Object.keys(zip.files).filter((name) => relsPattern.test(name))) {
    let changed = false;
    const xml = (await zip.file(relsPath).async("string")).replace(/Target="\.\.\/media\/([^"]+)"/g, (whole, file) => {
      const target = replacement.get(file);
      if (!target) return whole;
      changed = true;
      return `Target="../media/${target}"`;
    });
    if (changed) zip.file(relsPath, xml);
  }
  return { before: mediaPaths.length, after: canonicalByHash.size };
}

/**
 * pptxgenjs 3.12 declares an Override for /ppt/slideMasters/slideMasterN.xml
 * for every slide but writes only slideMaster1.xml. Drop every Override whose
 * part is not in the package, so strict readers do not offer a "repair".
 */
async function removePhantomContentTypes(zip) {
  const typesPath = "[Content_Types].xml";
  const xml = await zip.file(typesPath).async("string");
  const cleaned = xml.replace(/<Override PartName="\/([^"]+)"[^>]*\/>/g, (whole, part) => (zip.file(part) ? whole : ""));
  if (cleaned !== xml) zip.file(typesPath, cleaned);
}

/**
 * Apply all post-processing to a pptxgenjs buffer.
 * @param {Buffer} buffer
 * @param {{transitions: string[]}} options  transition kind per slide, in order
 */
export async function postprocessPptx(buffer, { transitions }) {
  const zip = await JSZip.loadAsync(buffer);
  for (let i = 0; i < transitions.length; i++) {
    const slidePath = `ppt/slides/slide${i + 1}.xml`;
    const file = zip.file(slidePath);
    if (!file) throw new Error(`Missing ${slidePath}`);
    const xml = markDecorativePictures(insertTransition(await file.async("string"), transitions[i], slidePath));
    if (xml.includes(DECORATIVE_ALT)) throw new Error(`${slidePath}: a decorative picture marker was not replaced.`);
    zip.file(slidePath, xml);
  }
  const notesPaths = Object.keys(zip.files).filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name));
  for (const notesPath of notesPaths) {
    zip.file(notesPath, splitNotesParagraphs(await zip.file(notesPath).async("string")));
  }
  const media = await dedupeMedia(zip);
  await removePhantomContentTypes(zip);
  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { buffer: out, media };
}

export function unescapeXml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}
