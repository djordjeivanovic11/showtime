# Paper Diorama — world plan (written before coding)

1. Location: a kraft-card shadow box theatre holding a cut-paper hill town (sky sheet, hanging clouds, far hills + houses, near hill with a road, grass lip).
2. Character: Pip, a paper puppet kid (green beanie, plum coat) with brass split pins at shoulders and elbows; poses wait, watch, annoyed, alarmed, point, relieved.
3. Loop route: a slate paper road ring glued onto a meadow sheet that rises from below like a stage lift; 8 numbered stop flags pop up on pins around it.
4. Buses: flat paper buses A (marigold) and B (cornflower) with lettered discs and split-pin wheel hubs; they slide around the ring.
5. Gap gauge: a 20-notch kraft ribbon flown in on strings from the top; two paper segments (A, B) split by a sliding brass fastener, each with a hanging luggage tag "ahead of A / 10 min".
6. Feedback loop: a cardboard disc laid flat inside the ring, four pop-up paper tags (LATE BUS, MORE RIDERS, LONGER BOARDING, LATER BUS) joined by cut-paper arrows clockwise.
7. Crowding: tiny paper riders pop up one by one at the crowded stop; the bus door opens while it boards.
8. Big reveal: "5.0 → 9.1 min" as thick cut-card numerals standing on the hills in the bookend scene, with a pinned "average wait" tag; the fix is a teal tag tied to the held bus: HOLD THE EARLY BUS.
9. Fixed furniture: headline tag = taped paper strip top-left; stamp = rubber-stamp ILLUSTRATIVE top-right; source line = masking tape bottom-left.
10. Signature transition: "stage lift". Planes parallax at different rates, scenery flies in on strings with a small swing, and ground pieces pop up like a pop-up book.

---

## 1. Style

**Paper Diorama** (`paper-diorama`): *the talk is a shadow-box theatre made of
cut paper, string and brass pins. Every idea gets built by hand in front of
the audience.*

**Serves:** education (K-12 through intro university), nonprofits and
foundations, public science talks, museum and library programmes, community
meetings, family audiences, culture all-hands, onboarding, "how it works"
explainers for non-specialists. Its warmth tells the audience the speaker made
this for them.

**Wrong for:** board or investor updates where a craft look reads as unserious;
incident post-mortems or bad news about harm to people, where whimsy reads as
flippant; data-dense technical reviews with more than about 3 numbers per
state; talks where the audience must copy exact figures off slides (the style
favours a few huge numbers over tables).

## 2. World bible

### Palette tokens (`Paper.PALETTE`)

| Token | Hex | Semantic role |
|---|---|---|
| `ink` | #2B2622 | all text, outlines of number discs |
| `inkSoft` | #4E4238 | secondary text (captions, small print), neutral arrows |
| `cream` / `paper` | #FFF8EA / #F7EBD5 | every card, tag, label; text always sits on these |
| `kraft*` | #C49A6C family | frame, gauge backing, cardboard props, stakes, poles |
| `sky`, `skyLow`, `sun` | warm cream / peach / marigold | backdrop only, never data |
| `hillFar → grass → forest`, `meadow` | sage to moss greens | ground planes, depth order light (far) to dark (near) |
| `road` | #5B5D6A | routes, paths, tracks: the mechanism's "rails" |
| `busA` | #EBA437 marigold | **subject / "ours"**: the thing the story follows |
| `busB` | #6B8DC9 cornflower | **comparison / "theirs"**: the other actor |
| `alarm` / `alarmInk` | #C8442F / #A3341F | bad outcome, vicious loop, the evidence stamp |
| `fix` | #2A7C6C teal | good outcome, remedy, baseline-that-was-fine |
| `plum`, `rose`, `beanie`, `skin` | character only | Pip's costume; never used for data |
| `brass` | #C9A13B | split pins: joints, pivots, dividers, hooks |

Meaning is never colour alone: buses carry letter discs, gauge segments carry
letter discs and captioned tags, alarm vs fix numbers also differ in size and
position.

### Typography

- **Fraunces** 800/900 (OFL): headline tag (50 px), title (112 px), big
  numerals (190–300 px), loop labels (32 px caps), stop numbers, bus letters.
  Its soft "wonky" serif reads as handmade without being a script.
- **Andika** 400/700 (OFL, SIL's literacy typeface): captions (28 px),
  gauge header, small print (24 px). Designed for early readers, so it stays
  legible far from the screen.
- **Gentium Plus Greek** (OFL) supplies Σ through `unicode-range`, because the
  Fontsource Andika Latin subset has no Greek.

### Character: Pip

A paper puppet kid about 360 px tall at scale 1: separate cut pieces (shoes,
trousers, plum coat, rose scarf, round head, green beanie with pom-pom), arms
in two segments joined by visible brass split pins. Both arms sit *on top of*
the coat, as a real paper puppet would, so every gesture reads. Poses are
data (`Paper.POSES`): `wait`, `watch` (forearm across chest, wristwatch
appears, head tilted down, brows cross), `annoyed` (hands on hips),
`alarmed` (arms up, wide eyes, O mouth), `point` (arm out toward the scene),
`relieved` (eyes closed in smile, grin). Each transition makes Pip hop on
his stick; idle life is a blink every 4.3 s (off in reduced motion).

### Recurring props

Cut-paper buses (side-on, lettered disc, split-pin hubs, opening door), tiny
paper riders (seeded variety of coats, skins, hats), numbered stop flags on
pins, lollipop and pine trees, little houses, a paper sun with cut rays, a
cloud hung on string, flowers, grass tufts, a bus-stop pole with a pictogram
sign and timetable card.

### Locations (one world, different camera)

- **Wide shot (states 0 and 4, bookend):** sky, far hills with houses, near
  hill with a winding road, grass lip with the bus stop and Pip.
- **Tabletop (states 1–3):** the meadow sheet lifts in from below and the hills
  slide up behind it. The mechanism lives on the meadow.

### Fixed furniture

- **Headline tag** (`headlineTag`): cream strip, rotated −1.3°, two pieces of
  masking tape, Fraunces 800 50 px, always at (66, 60). On change the old strip
  peels up and fades, and the new one is pressed on with a small overshoot.
- **Stamp** (`stamp`): rubber-stamp `ILLUSTRATIVE`, double rounded border,
  alarmInk, noise-eroded ink (`pd-ink` filter), rotated −4°, right-aligned to
  x = 1852.
- **Source line** (`sourceLine`): Andika 700 24 px on a torn masking-tape strip
  bottom-left; hidden on the title card.
- **Frame** (`shadowBox`): kraft frame with four inner walls in perspective
  (lid darkest), plus a soft shadow from the lid onto the scene.
- **Paper texture** (`grainOverlay`): canvas-generated grain + fibres
  (multiply) and mottling (soft-light) over the whole stage, generated once.
- **Title card:** a big cream sheet hung on two strings with brass pins, title
  in Fraunces 900, one marigold paper underline.

## 3. Using this world for other talks

**(a) Quarterly business review.** Location: a paper market street. Scaffold:
a kraft "pipeline" conveyor running left to right with four pinned stations
(Leads → Trials → Paid → Renewed); paper parcels ride it, and a ribbon gauge
overhead reads the conversion at each gate (`ribbonGauge` with 4 segments).
Metaphor: a leaky bucket made of card, labelled `HOLE = CHURN 4.1%`, with
paper drops falling out. Pip (or a shopkeeper puppet) points to the leak. The
reveal number stands on stakes over the street.

**(b) Research result.** Location: a paper field station. Scaffold: two
greenhouse boxes (control vs treatment) on the meadow with plants that pop up
one at a time. A ribbon gauge counts the sample (`n = 40 / 40`). Metaphor: a
paper fork in the road, labelled `FORK = HIGH ENTROPY`, where the puppet must
choose. Reveal: cut-card `2.2% → 9.6%`, with stamp `PAPER RESULT` or `OUR
DATA` and a source line naming the table.

**(c) Class lesson (the water cycle).** Location: the same hill town plus a
paper lake. Scaffold: `loopRoute` reused as the cycle (lake → cloud → rain →
river), with drops as the moving objects and a `feedbackWheel` labelled
`SUN HEATS → WATER RISES → COOLS → FALLS`. Gauge: a thermometer ribbon.
Pip holds an umbrella in the rain state (a new pose = new angles only).

## 4. Motion language

- **Stage lift (signature):** each layer is its own SVG plane moved with a CSS
  `translate3d`; on a scene change nearer planes travel further (meadow 780 px,
  near hill 330, far hill 235, sky 60, grass lip 420 down), eased in-out over
  about 1.1 s. It reads as a camera tilting down into the box.
- **Fly-in on strings:** hung scenery (title, gauge) drops with a damped swing
  ease (`Paper.ease.swing`) and is hoisted out with an ease-in.
- **Pop-up:** anything standing on the ground (stop flags, riders, wheel tags,
  numerals, the fix tag) folds up from its base line (`popTransform`, with
  outBack), one at a time with staggers of about 90–180 ms.
- **Travel:** buses move by time-along-loop `t`, so they follow the ring rather
  than cutting across it. Side-on sprites flip edge-on as they round a bend.
- **Counting:** gauge numbers count through intermediate integers while the
  brass divider slides.
- **Reduced motion (`M`):** every tween jumps to its end, and blinks stop.
- **Choreography per click:** scenery first (0–700 ms), then the mechanism
  (700–1500 ms), then the character's reaction last, so the audience looks at
  the change before Pip responds to it.

## 5. PPTX plan

| Layer | Export | Morph name |
|---|---|---|
| Sky + sun + cloud | one picture per scene (PNG, 1920×1080) | `!!sky` |
| Far hills + houses | transparent PNG plane | `!!far` |
| Near hill + road | transparent PNG plane | `!!near` |
| Meadow sheet + ring road | transparent PNG plane | `!!meadow` |
| Grass lip + stop pole | transparent PNG plane | `!!fg` |
| Stop flags 1–8 | 8 small PNGs, number as native text on top | `!!stop1`…`!!stop8` |
| Bus A / Bus B | PNG sprite each (mirrored copy for facing left) + native text letter | `!!busA`, `!!busB` |
| Pip | one PNG per pose (6) | `!!pip` (same name across poses, so Morph cross-fades and moves him) |
| Gauge backing + segments | native rectangles (kraft/marigold/cornflower fills, soft shadow) | `!!gaugeA`, `!!gaugeB`, `!!gaugePin` |
| Gauge tags | native rounded rectangles + native text | `!!tagA`, `!!tagB` |
| Feedback wheel | disc PNG + 4 native text cards + 4 arrow PNGs | `!!wheel`, `!!loop1`…`!!loop4` |
| Headline tag | native text on a cream shape with picture tape | `!!headline` |
| Stamp | PNG (ink texture) | `!!stamp` |
| Source line | native text on tape PNG | `!!source` |
| Big numerals | native text (Fraunces 900, cream 11% outline, shadow) | `!!num50`, `!!num91` |
| Grain overlay | top PNG at 40% multiply-like transparency | `!!grain` |

Morph moves planes, buses, gauge segments and Pip between slides. It moves
buses along a straight line, not around the ring, so a ring trip needs 1–2
intermediate slides or a motion path. **Lost in PowerPoint:** live hand-cut
jitter (baked into the PNGs), per-element SVG drop shadows on native shapes
(they approximate with PowerPoint's own shadow), the damped swing and
pop-up overshoot (approximate with Bounce or Zoom entrance), counting numbers,
the idle blink, and the multiply blend of the grain (use a low-alpha PNG
instead). Fonts must be embedded or the numerals fall back to Georgia.

## 6. One-shot authoring recipe

1. **Write the beat sheet first:** for each state, one tag (6 words or fewer), the
   one thing that changes, and which persistent objects exist. Put exact
   numbers in a `GAPS`/data constant, never inline in drawing code.
2. **Pick two cameras, not five:** a wide establishing shot (also the bookend)
   and one "tabletop" where the mechanism lives. Define plane offsets for each
   as constants (`PLANES_WIDE`, `PLANES_LOOP`).
3. **Build each plane as its own `<svg class="layer">`** with one plane-level
   shadow filter (`pd-lift-N-plane`) and move it only with CSS transforms. Do
   not put filters on groups you animate every frame.
4. **Load fonts before building anything.** `card`, `headlineTag`, `stamp`
   and `sourceLine` measure text with `getComputedTextLength`, so build after
   `document.fonts.load(...)` resolves.
5. **Lay out the mechanism around reserved corners:** headline tag at
   (66, 60) up to about x 1000; stamp at the top-right to x 1852; source tape at the
   bottom-left to about x 1066, y > 984. Hang gauges from a single V hook, not
   two vertical strings.
6. **Every persistent object gets a `render(props)` and a full prop set in
   state 0**; later states only list what changes (the deck carries props
   forward so `?state=N` works).
7. **Choreograph each click:** scenery, then mechanism, then character
   reaction (use `_delay`). Delay the new headline tag until departing scenery
   has cleared.
8. **Character beats:** pick one pose per state from `POSES` and make the
   reaction match the speaker note (point when introducing, watch when
   delayed, alarmed at the loop, relieved at the fix).
9. **Render, then look at every state and midframe.** Check the reserved corners,
   numbers hidden by props, strings crossing text, and things peeking over
   planes they should be behind.

### Pitfalls actually hit while building this candidate

- **Gestures hidden behind the coat:** the back arm was drawn under the body,
  so "check watch" was invisible. Fix: both arms on top (true to paper puppets).
- **Buses parked exactly on a stop hide its number:** park them half a stop
  off (t = 1.25 / 11.25), unless the bus is meant to be boarding there.
- **Side-on sprites on an ellipse go edge-on at the ends** (face = sin θ = 0).
  Fix: shift the flip angle by 20° so buses at the ends face their direction.
- **String clutter:** three hung clouds plus title plus gauge made a
  barcode of vertical lines that crossed the stamp and the reveal numerals.
  One cloud only; gauge hung on a V to one hook.
- **Planes peeking:** near-hill trees poked over the meadow crest behind the
  gauge in the tabletop states. Keep tall props on hidden planes away from
  the gauge's x range.
- **Layer order:** buses under the grass-lip plane hid the held bus in the
  bookend. Moving objects go above every ground plane.
- **Fixed-tag collision:** the new headline was pressed on while the title
  banner was still flying out. Add a per-state tag delay.
- **Glyph coverage:** Σ is missing from Fontsource Latin subsets. Add a
  Greek subset via `unicode-range`. Check every special character in the
  source line (Σ ² ÷ ·).
- **Stakes through glyphs:** stakes starting above the baseline showed
  between "." and "1". Start stakes just below the baseline.
- **The fix must sit on a plane that is visible in the bookend:** the
  hold tag lives on the foreground plane, not the meadow.
