# Style lab brief: one beat, many worlds

Every candidate tells the **same five-state story** with the **same words and
numbers**. Only the visual world changes. That makes the comparison fair.

## Why this lab exists

A presentation built with the "storytime" method was loved because it felt like
a *world*, not a deck: every state was a full-bleed illustrated scene, a small
original character reacted to each beat, one short headline tag sat in a fixed
corner, a persistent diagram changed exactly one thing per click, metaphors were
drawn and then labelled, and honest small print stayed visible. Inspect the
[Pixel Quest bus-story demo](candidates/pixel-quest/index.html) for an original
example of that approach. The
[earlier infographic attempt](reference/failed-infographic-attempt.png) shows
what the other styles must improve upon.

The earlier attempt at "other styles" failed: it produced ordinary infographic
slides (title + subtitle + boxes with numbers + footer). **That is the failure
mode to avoid.** If your state could pass for a corporate template slide with a
chart pasted in, it fails, even for the most serious corporate style. Serious
does not mean templated: a board-level style can be a quiet, beautifully drawn
world (an architectural model, a precise route diagram drawn like an object, an
annual-report illustration) with very few words.

### Reference standard (the pixel deck that worked)

- One committed world: one palette family, one display font, one rendering
  logic. Sections change location, never style.
- A recurring original character that reacts (confused, alarmed, relieved,
  pointing) and gives the audience someone to follow.
- One headline tag per state, about six words or fewer, in one fixed component
  and position. No sentences, no bullet lists on screen.
- A persistent mechanism scaffold that stays on screen across clicks; each click
  changes one nameable thing (a bar levels, a bus moves, a label appears).
- A metaphor drawn as part of the scene, then labelled element by element
  (e.g. `FORK = HIGH ENTROPY`).
- Data drawn in the world's style but exact: real values, units, denominators.
- Honest small print: a stamp (`illustrative`, `schematic`, `paper result`,
  `our data`) top-right and a source line bottom-left on every state.
- Bookends: the opening scene can return, resolved, at the end.
- Picture changes every 5–15 seconds of speech.

## The shared story: "Why do buses come in bunches?"

A real phenomenon (bus bunching) with **illustrative** numbers. A loop line has
8 stops and 2 buses; one lap takes 20 minutes, so the buses are scheduled 10
minutes apart. Gaps are the time between buses passing a stop; the two gaps
always sum to 20 minutes. Average wait for a rider who arrives at a random
moment is `Σgap² ÷ (2 · Σgap)`:

- 10 and 10 → 200 ÷ 40 = **5.0 min**
- 12 and 8 → 208 ÷ 40 = **5.2 min**
- 19 and 1 → 362 ÷ 40 = **9.05 min, shown as 9.1 min**

Use these exact numbers. Do not invent others. Every state carries the stamp
`ILLUSTRATIVE` (style it however your world styles stamps) and this source line:
`illustrative scenario · avg wait = Σ gap² ÷ (2 · Σ gap), riders arrive at random`
(state 0 may omit the source line).

### States (fixed words; fixed tags)

| # | Tag (exact) | What must be visible / what changes | Speaker notes (exact) |
|---|---|---|---|
| 0 | *(title card)* title "Why do buses come in bunches?" | Establishing shot of the world. Your character waits at a stop; in the distance three buses arrive nose to tail. This scene is the bookend. | "You wait twenty minutes for a bus, and then three arrive together. It isn't bad luck. It's a feedback loop, and once you see it, you can't unsee it." |
| 1 | `every 10 minutes, on paper` | The **scaffold** appears: a loop route with 8 stops, Bus A and Bus B on opposite sides, and a **gap gauge** reading 10 min / 10 min. Character at one stop. | "Let's slow it down with two buses on a loop line: eight stops, one bus every ten minutes. This gauge tracks the gap between them. On paper, the gaps are equal: ten and ten." |
| 2 | `one crowded stop` | One change: a stop fills with waiting riders; Bus A is stuck boarding there and falls behind; the gauge reads 12 / 8 min. Character reacts (checks watch / annoyed). | "Now one stop gets crowded. Bus A takes longer to board everyone and falls two minutes behind. The gap in front of it grows to twelve; the gap behind shrinks to eight." |
| 3 | `late buses get later` | The buses are now nearly touching; the gauge reads 19 / 1 min. The **drawn feedback loop** appears as part of the scene and is labelled: `LATE BUS → MORE RIDERS → LONGER BOARDING → LATER BUS`. | "Here's the loop. A late bus finds more people waiting, so it boards longer and gets later still. The bus behind finds empty stops and speeds up. Soon the gaps are nineteen and one. The buses have bunched." |
| 4 | `same buses, nearly double the wait` | The reveal: one big number `5.0 → 9.1 min average wait`, shown in the world (not a KPI card). Bookend: the opening stop/scene returns, character resolved, plus one small visual hint of the fix: `HOLD THE EARLY BUS`. | "Same buses, same schedule. But if you arrive at a random moment, your average wait goes from five minutes to about nine. Nothing broke. The fix isn't more buses; it's holding the early bus for a minute." |

The route, both buses, the gauge, and the character are **persistent objects**:
same element id across states, so they visibly move/morph on advance instead of
being redrawn from scratch.

## Candidate contract (technical)

Work only inside your candidate directory `style-lab/candidates/<style-id>/`.

Files:

- `index.html`: the deck. Fixed 1920×1080 stage, scaled to fit the window
  (letterboxed). Arrow keys / space advance and go back; `N` toggles a
  speaker-notes overlay; `M` toggles reduced motion.
- `kit.js`: the **reusable style kit** for this world: drawing primitives and
  components that another author could reuse for a completely different talk
  (e.g. character drawer with poses, tag component, stamp, source line, gauge or
  chart primitives in this style, background/scene builders, texture filters,
  projection helpers). Plain browser JS (no modules), loaded with
  `<script src="kit.js">`. Document each public function in one line.
- `deck.js`: this talk's five states, built from `kit.js`.
- `fonts/`: any web fonts you use, downloaded locally (OFL/Apache licensed only,
  e.g. via `https://cdn.jsdelivr.net/npm/@fontsource/<name>/files/...woff2`).
  The deck must render offline. No other network resources.
- `DESIGN.md`: the world bible (see below).
- `REVIEW.md`: your honest self-critique (see below).

Behaviour required by the renderer `style-lab/tools/render.mjs`:

- `index.html?state=N` (0-based) shows state N **instantly** (no transition).
- `window.deck = { count: 5, goTo(n) }`; `goTo` animates to state n.
- Set `document.body.dataset.ready = "1"` once fonts are loaded and art drawn.
- No console errors.

Render and inspect with:

```bash
node style-lab/tools/render.mjs style-lab/candidates/<style-id> --midframes
```

It writes `renders/state-0N.png`, `renders/mid-0N.png` (frames ~350 ms into
each transition), and `renders/contact.png`. **Open the PNGs with the Read tool
and look at them.** Iterate at least three render → critique → fix rounds.
Judge at 1920×1080 *and* imagine it on a projector from the back row.

Art rules:

- All art is authored as code: inline SVG (preferred for vector worlds), canvas,
  or CSS. No external images, no stock, no AI-generated bitmaps, no emoji as art.
- Original characters and props only; no recognizable copyrighted characters,
  logos, or a recognizable imitation of a famous studio/brand style.
- Text uses real fonts as DOM/SVG text (sharp, editable later).
- Legibility: tag ≥ 40 px, labels ≥ 28 px, small print ≥ 20 px at 1920×1080;
  contrast ≥ 4.5:1 for text. Meaning never by colour alone.
- Motion: on advance, persistent objects move/morph (≈500–900 ms, eased);
  new objects enter one at a time; nothing loops decoratively except tiny idle
  life (blink, flicker) that respects reduced motion.

### DESIGN.md must contain

1. Style name, one-line pitch, and the **settings/audiences it serves** (and
   where it would be wrong).
2. World bible: palette tokens with *semantic* meanings (accent, alarm, data,
   "ours" vs "theirs"), typography, character(s) and poses, recurring props,
   locations, headline-tag component, stamp, source line, title card.
3. How a *different* talk would use this world: give three quick examples of
   mechanism scaffolds and labelled metaphors for (a) a quarterly business
   review, (b) a research result, (c) a class lesson, in this style.
4. Motion language and signature transition.
5. **PPTX plan:** how each layer exports (native text vs. picture layer),
   which objects get stable `!!name` Morph names, what is lost in PowerPoint.
6. Authoring recipe: the 6–10 concrete steps a model should follow to produce
   this style reliably in one shot, and the pitfalls you actually hit.

### REVIEW.md must contain

Scores 1–5 with one-line reasons: first-glance story clarity, "is it a world
or a template?", character warmth/usefulness, scaffold persistence,
legibility at distance, polish/craft, setting fit, one-shot reliability (how
hard was it to get right?), PPTX feasibility. Then the three weakest things in
your final renders and what you would do with more time.
