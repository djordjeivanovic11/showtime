# Storytime engine

The plumbing for storytime decks: an HTML player, a lint, a renderer, and
PPTX / PDF / single-file HTML exporters. A deck author (human or model) writes
only `deck.js` (states and layers) against a style kit (`kit.js`); everything
here works for any style.

```
engine/
  storytime.js          browser runtime (classic script, global Storytime, works from file://)
  package.json          pinned tool dependencies (Node 20+)
  tools/
    check.mjs           storytime lint -> <deck>/check-report.md
    render.mjs          renders/state-NN.png, mid-NN.png, contact.png
    export-pptx.mjs     dist/deck.pptx (one picture per layer, Morph)
    verify-pptx.mjs     reads the PPTX back and pixel-diffs it against the renders
    export-pdf.mjs      dist/deck.pdf + dist/presenter-notes.md
    bundle.mjs          dist/deck.html, one offline file
    build.mjs           all of the above, in order, with a summary
    lib.mjs, pptx-ooxml.mjs   shared helpers and OOXML post-processing
  template/             starter deck dir (index.html, kit.js, deck.js, fonts/)
  examples/smoke/       4-state test deck used to verify the engine
  examples/paper-diorama-demo/  5-state illustrated deck and verified exports
```

## Quick start

```bash
cd engine && npm ci                      # once, from the pinned lockfile
npx playwright install chromium          # once, for rendering and export checks
cp -r template ../my-deck && cp storytime.js ../my-deck/
node tools/build.mjs ../my-deck          # check -> render -> pptx -> verify -> pdf -> bundle
open ../my-deck/index.html               # the live player
```

A deck directory holds `index.html`, `storytime.js` (copied from here; `check`
warns when the copy is stale), `kit.js`, `deck.js`, and `fonts/`. `index.html`
loads the three scripts, in that order, from its own directory. Outputs go to
`renders/`, `dist/`, `.cache/`, and `check-report.md` (all git-ignored).
The style-lab candidates elsewhere in this package use separate standalone
HTML players. Their `kit.js` and `deck.js` are visual references, not drop-in
engine decks; adapt their drawings into the `Storytime.deck` layer API.
For a complete visual example that already uses this API, open the
[Paper Diorama engine demo](examples/paper-diorama-demo/README.md).

## Deck API

```js
Storytime.deck({
  title: "Why do buses come in bunches?",
  wpm: 130,                    // speaking pace for timing estimates (default 130)
  targetSeconds: 300,          // optional; check and notes compare against it
  background: "#0b0f1a",       // stage and letterbox colour (also the PPTX slide background)
  chrome: {                    // optional; usually kit.chrome. Functions return HTML strings.
    tag: (text) => `<div class="kit-tag">${text}</div>`,
    stamp: (text) => `<div class="kit-stamp"><span>${text}</span></div>`,
    source: (text) => `<div class="kit-source">${text}</div>`,
    tagBox: { x: 64, y: 48, w: 1240, h: 104 },      // stage px; where ui-tag sits
    stampBox: { x: 1456, y: 52, w: 400, h: 72 },    // ui-stamp
    sourceBox: { x: 64, y: 1004, w: 1600, h: 44 },  // ui-source (small print)
  },
  states: [
    {
      id: "s1-scaffold",                 // unique; used in ?state=<id> and reports
      kind: "scene",                     // "scene" (default) | "title" (no stamp/source warning)
      tag: "every 10 minutes, on paper", // headline tag, <= 6 words; HTML allowed
      stamp: "ILLUSTRATIVE",
      source: "illustrative scenario · avg wait = Σ gap² ÷ (2 · Σ gap)",
      transition: "morph",               // "morph" (default) | "fade" | "cut": how this state is entered
      notes: {
        say: "Spoken words for this click.",          // required
        cue: "Click after 'this click.'",
        plain: "Optional plain-language aside.",
        detail: "Optional technical aside.",
      },
      layers: [                          // back to front unless z says otherwise
        { id: "route", x: 0, y: 0, w: 1920, h: 1080, svg: "<svg viewBox='0 0 1920 1080'>...</svg>" },
        { id: "bus-a", x: 400, y: 300, w: 160, h: 90, svg: kit.bus({ pose: "late" }), enter: "pop" },
        { id: "label-loop", kind: "text", x: 600, y: 320, w: 640, h: 64,
          html: '<div class="kit-label">LATE BUS → MORE RIDERS</div>' },
      ],
    },
  ],
});
```

### Layer fields

| field | meaning |
| --- | --- |
| `id` | Stable object id: letters, digits, `_ . : -`. `ui-*` is reserved for chrome. |
| `x, y, w, h` | Box in stage px on the 1920x1080 stage. Required. |
| `svg` / `html` / `canvas` | Exactly one. `svg` and `html` are strings; `canvas` is `(ctx, w, h) => {}`, drawn synchronously once, at device pixel ratio. SVG fills the box (give it a `viewBox`). |
| `kind` | `"art"` (default) or `"text"`. Text layers get the text lint rules and PPTX text naming. |
| `z` | Stacking order (default: position in the array). Chrome is always on top. |
| `opacity`, `rotate` | 0–1 and degrees (about the box centre). Both tween and both carry into the PPTX. |
| `enter` | First appearance: `fade` (default), `rise`, `pop`, `slide-left`, `slide-right`, `draw`, `none`. |
| `duration` | Tween length in ms for this layer (default 700, the Morph duration). |
| `alt` | Alt text. Art without `alt` is marked decorative in the PPTX; text layers default to their words. |
| `small` | Marks small print: 20–28 px text is allowed without a warning, and it is not counted as visible words. |
| `offCanvas` | Allows the box to leave the stage (pans, bleeds, entrances). |
| `pad` | Capture margin (px) around a text layer's PPTX picture, for glows and shadows (default 12). |
| `key` | Content identity override. Layers with the same key never crossfade. |
| `text`, `font` | For `--native-text`: plain text plus `{family, size (px), color, bold, align}`. |

Art layers are clipped to their box (exactly what their PPTX picture shows).
Text layers are not clipped, but the lint fails text that leaves its box.

## Player

- The stage is a fixed 1920x1080 canvas scaled to fit the window, letterboxed in `background`.
- Keys: → / Space / PageDown next; ← / PageUp previous; Home first; End last; click next.
  **N** notes overlay (say, cue, plain, detail, state x/N, planned time); **M** reduced motion;
  **F** fullscreen; **G** author grid (120 px grid, 5% safe area, every layer box with its id).
- URL: `?state=3` (0-based) or `?state=s3-late` opens a state instantly; `?export=1` hides
  overlays, freezes idle CSS animations, and disables keys; `?reduced=1` starts in reduced motion.

### Persistence rules

- **Same id in consecutive states = the same DOM element.** It tweens box, opacity and rotation
  with an ease-in-out over `duration` (700 ms). Text layers move but never resize mid-tween, so
  they do not reflow on every frame.
- **Changed content** (different `svg`/`html` string, or different canvas pixels) crossfades
  inside the same, moving box. Art: the new look fades in over the old one, which stays opaque
  for the first half, so an opaque object never turns see-through. Text: old words fade out, then
  new words fade in, so two labels never overlap.
- **New ids** enter with `enter` (going backward they simply fade). **Removed ids** fade out (300 ms).
- `enter: "draw"` animates `stroke-dashoffset` on every SVG element with class `st-draw`, one
  after another, like a pen. Use it on stroke-only paths (fills appear immediately).
- `transition` belongs to the boundary: forward, the entered state's; backward, the left state's.
  `fade` crossfades the whole scene (the old one stays opaque underneath); `cut` swaps instantly.
  Jumps of more than one state always fade.
- Every navigation first cancels running animations. Final values are written as inline styles
  before animating, so rapid clicking or reversing mid-transition always lands on the exact state.
- **Idle life:** CSS animations inside a layer's SVG/HTML run freely. Reduced motion and export
  mode pause them (`.st-reduced *, .st-still * { animation-play-state: paused }`), so renders are
  deterministic (frozen at t = 0) and reduced motion means no tweens and no loops.

### `window.deck` (for tools and tests)

`count`, `title`, `wpm`, `targetSeconds`, `totalSeconds`, `ready` (promise), `version`;
`states()` → `[{id, index, kind, tag, stamp, source, transition, notes, seconds, startsAt}]`;
`current()`; `goTo(indexOrId, {instant})` → promise resolved once settled;
`layers(indexOrId)` → `[{id, kind: "art"|"text"|"ui", ui, box: {x,y,w,h}, opacity, rotate, z, enter,
key, alt, small, offCanvas, pad, text, font}]` in back-to-front order;
`isolate(layerId, {pad})` → `{clip, box}` after hiding everything but that layer (unrotated, opaque,
moved to (pad, pad), transparent page), `isolate(null)` restores; `setReducedMotion(bool)`;
`fonts()` → every declared font face and its load status. `document.body.dataset.ready = "1"` is
set after every declared `@font-face` has loaded (or failed), canvases are drawn, and images decoded.

## Commands

All tools take the deck directory and assume nothing about its style.

| command | does |
| --- | --- |
| `node tools/check.mjs <deck>` | Lint every state in Chromium; writes `check-report.md`; exit 1 on errors. |
| `node tools/render.mjs <deck> [--midframes]` | `renders/state-NN.png`, `mid-NN.png` (350 ms into the transition into NN, frozen deterministically), `contact.png` (rows of 3, via ImageMagick `+append/-append`, or the browser if `magick` is missing). Exit 1 on page errors. |
| `node tools/export-pptx.mjs <deck> [--out f.pptx] [--native-text] [--art-scale 1] [--text-scale 2] [--no-cache]` | Layered PPTX with Morph. |
| `node tools/verify-pptx.mjs <deck> [f.pptx]` | Package and pixel checks (needs renders). |
| `node tools/export-pdf.mjs <deck> [--out f.pdf]` | Static PDF of final states (re-renders when stale) and `presenter-notes.md`. |
| `node tools/bundle.mjs <deck> [--out dist/deck.html]` | One offline HTML file, proven by reloading it and recording requests. |
| `node tools/build.mjs <deck> [--native-text] [--no-cache]` | All of it; prints what is and is not verified. |

### Lint rules (`check.mjs`)

- **ERROR**: missing `notes.say`; duplicate state ids; a layer outside the stage without
  `offCanvas`; text rendered under 20 px (SVG text includes its viewBox scale); text overflowing
  its box or clipped by the stage; text/ui ink beyond box + capture pad (the PPTX picture would
  clip it); page errors (exceptions, `console.error`, failed requests); declared `@font-face`
  faces that failed to load.
- **WARN**: tag over 6 words; scene without stamp or source; 20–28 px text outside small print;
  over 25 visible words (small print excluded); over 3 layers added/removed/changed on a morph
  click; overlapping text; estimated contrast under 4.5:1 (3:1 for text ≥ 32 px, WCAG "large
  text"); `notes.say` over 45 words; a font that is neither loaded nor installed.
- **INFO**: seconds per state (`say words ÷ wpm × 60 + 1.5 s`), total vs `targetSeconds`, objects
  alive in 3 or more states.

Contrast is estimated from pixels. A layer whose pixels fill most of their bounding box (a chip
or panel) is judged by the two dominant luminance clusters of what is seen there; bare text is
judged by its glyph colour against the render behind it with the layer hidden.

## PPTX export and Morph

- One 13.333 x 7.5 in slide per state (1920 px = 13.333 in; 1 px = 6350 EMU). Each layer is one
  picture at its box, back to front, captured as a transparent screenshot of that layer alone.
  Opacity becomes picture transparency and rotation becomes picture rotation.
- **Art** pictures are named `!!<id>`. Morph matches `!!` names across slides, so a persistent
  object moves, resizes and rotates, and a new look crossfades, just as in the player.
- **Text and chrome** pictures are named `!!<id>~<8 hex of the image hash>`. Identical text keeps
  its name and moves; changed text gets a new name, so Morph fades old out and new in instead of
  stretching one picture of words into another. To move text, keep its content identical.
- Every slide gets `p159:morph option="byObject"` (700 ms) inside `mc:AlternateContent` with a
  plain Fade fallback, placed right after `<p:clrMapOvr>` as the schema requires. `fade` states
  get Fade; `cut` states get no transition.
- Speaker notes: `SAY`, `CLICK`, `IN PLAIN WORDS`, `DETAIL` sections (empty ones omitted), split
  into real paragraphs. Media are deduplicated; art without `alt` is flagged decorative;
  phantom `[Content_Types]` overrides from pptxgenjs are removed.
- **Capture scale**: art at 1x (pixel-identical to the 1920x1080 render), text/ui at 2x (crisp
  on 4K projectors). Measured on `examples/smoke`: all 1x 0.19 MB, pixel diff 0.000%; default
  (art 1x, text 2x) 0.28 MB, worst diff 0.215% (downsampled text edges); all 2x 0.33 MB. A rich
  full-bleed illustration costs 4x the bytes at 2x, hence art stays at 1x unless you pass
  `--art-scale 2`.
- Captures are cached in `<deck>/.cache/` by layer content, size, scale, and a hash of every
  deck file except `deck.js` plus the live page CSS. `--no-cache` forces fresh captures.
- `--native-text`: text layers with `text` + `font` become editable text boxes named `!!<id>`
  (size in pt = px ÷ 2). The font must be installed on the presenting machine, and line breaks
  may differ from the HTML; verify masks these boxes out of the pixel diff and says so.

### Limits

- Morph matches by name only and animates position, size, rotation and transparency with its
  own easing. It cannot reproduce `enter` effects (rise, pop, draw) or idle CSS loops: entering
  layers simply fade in, and pictures are static.
- Text is flattened to pictures (unless `--native-text`), so it is not editable or searchable in
  PowerPoint; alt text carries the words.
- CSS blend modes, backdrop filters, or effects that span layers are not reproducible from
  per-layer pictures; `verify-pptx` will show them as pixel differences.
- Nothing here plays the PPTX in PowerPoint. Click through it in PowerPoint (or Keynote) once
  before presenting; static renders and package checks are not playback.

## Troubleshooting

- **"deck did not become ready"**: `storytime.js` is missing next to `index.html`, or `deck.js`
  threw. Open `index.html` in a browser: the error panel shows the message.
- **Fonts fall back**: declare every family with `@font-face` (kit CSS) using a relative
  `url(fonts/...)`. `check` errors when a declared face fails and warns when text asks for an
  undeclared, uninstalled family.
- **Text overflow errors**: enlarge the box, shorten the words, or use `white-space: nowrap` only
  with a wide enough box. Overflow is measured from the live layout and from captured ink.
- **Object pops instead of moving**: its `id` changed between states, or a `fade`/`cut`
  transition (or a multi-state jump) is in between.
- **Object crossfades when it should only move**: its content string changed (for example a
  random number in the SVG). Keep helper output deterministic, or set the same `key`.
- **`magick montage` fails**: not used; the contact sheet uses `+append/-append`.
- **Stale runtime**: `check` warns when the deck's `storytime.js` differs from this engine's.
