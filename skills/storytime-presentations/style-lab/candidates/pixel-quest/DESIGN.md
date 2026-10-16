# Pixel Quest: world plan (written before coding)

1. Location A, "Loop 8 stop": a 480x270 pixel night street. Dithered sky, lit skyline, two street lamps, an open bus shelter with a backlit route-map lightbox, a small LED sign and a flag stop pole. This is the bookend.
2. Location B, "the lightbox, up close": the camera dives into the shelter's route map. The map fills the frame (backlit navy city blocks). The shelter post, roof light tube and sidewalk stay visible.
3. Character: Pip, an original city pigeon in a yellow knit beanie (planned at 34x36 px; shipped at 56x56 after the first render). Poses: neutral, watch (taps foot, checks wristwatch, annoyed brow), alarmed (feathers puffed, beanie hops off, "!"), hold (raises a green HOLD paddle, happy eyes).
4. Loop-route scaffold: a dark rounded-rectangle road on the map with 8 cream stop dots. Bus A and Bus B are cream bus badges lettered A/B that ride the road by route parameter, so a move follows the road, corners included.
5. Gap gauge: an LED pillar bolted to the shelter, a column of 20 one-minute cells. Amber cells are the gap A→B and cyan cells the gap B→A, labelled with exact minutes. The same two colours light the road arcs between the buses, so the map and the gauge always agree.
6. Riders: tiny 5x10 people gathering at the crowded stop. An hourglass rides beside Bus A while it boards.
7. Feedback loop: a roundabout appears in the map's central block, a ring road with painted clockwise arrows around a clock island. Four street-sign chips go up one at a time: LATE BUS → MORE RIDERS → LONGER BOARDING → LATER BUS.
8. Reveal: back on the street, a rooftop marquee billboard with twinkling bulbs reads "5.0 → 9.1 min" over "average wait". Pip, now calm, holds the early bus with a paddle labelled HOLD THE EARLY BUS.
9. Fixed chrome: a headline tag top-left (black chip, yellow bar), an ILLUSTRATIVE stamp top-right, and a VT323 source line bottom-left on every state.
10. Signature transition, "Map Dive" and back out ("Map Surface"): the whole street scales about the lightbox until the lightbox becomes the full map, and the reverse at the end. Within the map the buses drive along the road and the gauge cells refill as the numbers count.

(The full world bible follows below.)

---

# Pixel Quest: world bible

## 1. Style, pitch, settings

**Pixel Quest.** *A talk told as a tiny night-time video game. One small hero reacts to every beat, and the diagram lives inside the level.*

**Serves:** class lectures and student talks, community and meetup talks (game,
maker, tech, civic tech, open source), playful internal demos and all-hands
segments, science-communication explainers, workshop openers. It works best
when the audience is meant to *enjoy* learning and the speaker can be a little
warm or funny.

**Wrong for:** board or investor meetings, legal or HR topics, grief or safety
incidents, or anything where a cartoon pigeon would undercut the gravity. It is
also a poor fit for decks that must be edited by non-technical staff in
PowerPoint, because the art is code-generated. For those settings, use a quieter
sibling style.

## 2. World bible

### Palette tokens (one-letter keys; semantic, not decorative)

| Key | Hex | Role |
|---|---|---|
| `K` | `#0d0b1a` | Ink: every outline, every text panel |
| `N` / `n` | `#11132e` / `#1b1f47` | Night sky (top / horizon) |
| `u` / `v` | `#2a3064` / `#3d4688` | Buildings / lit edges |
| `M` `g` `j` | `#0f2442` `#142d4c` `#1f4370` | Backlit map, map blocks, block edges |
| `W` | `#f4f1e8` | Cream: stops, labels, highlights |
| `w` `m` `c` `a` | grays | Small print, metal, concrete, asphalt |
| `Y` | `#ffd447` | **Accent / emphasis**: tag bar, stamp, light sources, painted arrows |
| `O` | `#ff9a3c` | **Data 1**: the gap that grows (A→B). A talk's "ours" or primary series |
| `C` | `#4fd6e8` | **Data 2**: the gap that shrinks (B→A). A talk's "theirs", baseline or "on paper" |
| `R` | `#ff5a5f` | **Alarm**: late, failure, the bad number |
| `G` / `L` | `#2bb58f` / `#a8f07a` | **Fix / good**: the remedy, the paddle, bus livery |
| `p q h E P k` | grays, green, purple, pink | Pip only |

Rules: a colour never carries meaning alone. Every coloured mark has a text
label (A→B / B→A, chip text, letters on badges). `O` vs `C` is the deck's
two-series contrast, and `R` is reserved for the one thing that is going wrong.

### Typography (bundled, OFL)

- **Pixelify Sans 600**: the headline tag (40 px), labels and chips (32 px), notes.
- **Silkscreen Bold**: the title card (72 px), big numbers (64–96 px), bus letters (32 px), the stamp (24 px).
- **VT323**: the source line (34 px).
- Glyphs the fonts lack (`→`, `Σ`) are drawn as inline pixel SVGs by
  `PQ.rich()`, so they match the pixel grid. Ligatures are off: Pixelify's
  `fi` ligature reads badly.

### Character: Pip

Pip is an original city pigeon in a yellow knit beanie with a pompom, drawn with
chibi proportions (big head, big eye). The sprite is 56×56 logical px, faces
right, and its ink line sits under the feet on row 55. Pip is the audience
stand-in: a commuter who wants the bus. Every pose changes the silhouette as
well as the face:

| Pose | Silhouette cue | Use |
|---|---|---|
| `neutral` | Wing folded, blinks on idle | Waiting, establishing shots |
| `point` | Wing straight out | "Look at this" (scaffold appears) |
| `watch` | Wing up holding a wristwatch, cross brow, foot taps on idle | Impatience, delay, cost |
| `alarmed` | Feathers puffed, both wings up, beanie hops off its head | The loop, the twist |
| `hold` | Wing out holding a prop, happy eyes, blush | Resolution, the fix |
| `happy` | Folded wing, happy eyes, blush | Endings |

Reaction props: `?` bubble, `!` bubble, red grumble scribble. Pip never speaks
sentences.

### Recurring props

City bus (side view, 76×34, door open or closed, headlight beam, letter disc),
map bus badge (22×16 with a DOM letter), bus stop shelter, flag stop pole,
street lamp with a half-tone pool, a lightbox route map, an LED gap column,
riders (5×10, seeded colours), an hourglass (boarding), a "you are here" pin
with a mini beanie, a hold paddle, a marquee billboard with twinkling bulbs, and
a roundabout with painted arrows around a clock island.

### Locations (the style never changes; only the place does)

1. **Loop 8 stop, night street**: dithered sky, moon, two-depth skyline with
   seeded lit windows, lamps, road, sidewalk, shelter. Opening and ending.
2. **The lightbox, up close**: the camera has dived into the shelter's route
   map. The roof tube light, the shelter post, blurred street lights and the
   sidewalk stay at the frame edges, so you still know where you are.

### Chrome (identical on every state)

- **Headline tag**: top-left at (8, 8) logical, black chip with an 8 px yellow
  left bar, Pixelify 40 px, about six words or fewer. It is the only sentence-like text.
  It swaps on each click: the old tag fades in 200 ms and the new one slides in.
- **Stamp**: top-right, black with a yellow border and a square badge,
  Silkscreen 24 px, `ILLUSTRATIVE` (or `PAPER RESULT`, `OUR DATA`,
  `SCHEMATIC`).
- **Source line**: bottom-left, VT323 34 px with a 1 px ink shadow, sitting on
  the sidewalk.
- **Title card**: two lines of Silkscreen in the sky over the establishing
  shot, with no panel. The world is the card.

## 3. How a different talk would use this world

Keep the night city, Pip and the chrome; change the location and the scaffold.

**(a) Quarterly business review: "why support tickets pile up."**
Location: a night-time post office counter. Scaffold: a conveyor belt of
parcels (tickets) feeding three counter windows (agents), with an LED queue
column showing tickets waiting. Each click changes one thing: a window closes
(sick day), the queue column climbs, then a weekend backlog is drawn as a
parcel mountain. Labelled metaphor: `PARCEL = TICKET`, `WINDOW = AGENT`,
`MOUNTAIN = BACKLOG`. Reveal: a marquee showing `2.1 → 4.8 days to first reply`
(placeholder numbers; use that talk's real data). Pip in `watch` pose at the counter, then `hold` with a
"triage" paddle. Stamp: `OUR DATA`.

**(b) Research result: "our model forgets less."**
Location: a library at night, with shelves as the training corpus. Scaffold: a
reading lamp's light pool over a row of books. Books in the pool are "kept",
books outside fade (forgotten), and an LED column shows the retained fraction.
Labelled metaphor: `LAMP = ATTENTION`, `SHELF = TRAINING DATA`,
`FADED SPINE = FORGOTTEN FACT`. Ours vs baseline: `O` books vs `C` books,
always labelled. Reveal on a marquee, e.g. `61% → 78% retained` (placeholder), with
`PAPER RESULT` vs `OUR RUN` stamps.

**(c) Class lesson: "how a hash table works."**
Location: a row of night-market stalls. Scaffold: eight numbered stalls
(buckets) and a sign-post hash function that points each arriving rider (key)
to a stall. Clicks: one key arrives, a collision forms a queue at a stall, and
chaining is drawn as a rope of riders. Labelled metaphor: `SIGNPOST = HASH`,
`STALL = BUCKET`, `QUEUE = CHAIN`. Pip goes `point`, `alarmed` at the
collision, then `happy` once the table resizes to sixteen stalls.

## 4. Motion language

- **Persistent objects travel.** The same id in consecutive states keeps its
  element. Static objects slide on a 900 ms in-out cubic. Route objects are
  driven by **params** (`a`, `b` in laps), so buses drive *along the road*,
  corners included, and the route arcs, gauge cells and gauge numbers recompute
  every frame. The gap numbers count 10 → 11 → 12 as the bus falls behind.
- **Changed looks crossfade in flight.** Pip's pose change, side bus → map
  badge, and mini map → full map all crossfade while moving.
- **New objects enter one at a time,** about 260 ms apart, after the move has
  half landed: fade, `pop`, `rise`, `drop` or `slide`. The four loop chips pop
  in clockwise order, about 300 ms apart.
- **Signature transition: Map Dive / Map Surface.** The whole street scales
  about the shelter lightbox (`LIGHTBOX → PANEL`, k ≈ 6.3). The close-up grows
  out of the lightbox, opaque almost at once, while the zoomed street stays
  behind it until covered. The reverse shrinks the close-up back into the
  lightbox on top of the street. Every move, camera included, uses one easing,
  so the map stays locked to its lightbox mid-move.
- **Idle life only:** a blink every ~4.5 s, the watch-pose foot tap, and the
  marquee bulbs twinkling. Idle starts 2.5 s after load (so screenshots are
  deterministic), and `M` (reduced motion) stops tweens and idles.

## 5. PPTX plan

Export one slide per state at 13.333×7.5 in, 1 logical px = 13.333/480 in.

| Layer | Export | Morph name |
|---|---|---|
| `bg-street`, `bg-closeup` | Full-bleed PNG at ×4 | `!!bg-street`, `!!bg-closeup` |
| `shelter`, `marquee`, `loop` (roundabout), crowds, pin, paddle, fx | PNG picture of that canvas layer at ×4 (marquee as an animated GIF if wanted) | `!!<id>` |
| `route` (map) | PNG per state (its arcs differ by state) | `!!route` (Morph crossfades the arcs) |
| `busA`, `busB` | PNG badge or side bus | `!!busA`, `!!busB`: Morph slides them, but in a **straight line**, cutting corners |
| `gauge` | PNG per state | `!!gauge` |
| `pip` | PNG per pose (idle GIF optional) | `!!pip` |
| Tag, chips, labels, gauge numbers, reveal number, source, stamp | **Native text boxes** in the bundled fonts if the presenting machine has them installed (embed them), else transparent PNG screenshots of the DOM element | Text: `!!<id>~<hash of text>`, so unchanged text morphs and changed text fades |

**Lost in PowerPoint:** buses following the curved road (Morph tweens straight),
gauge numbers counting up (they jump), the opaque grow-from-the-window camera
dive (approximate it with a Morph zoom of `!!bg-street` scaled ×6.3 about the
lightbox on a hidden duplicate, or fall back to a fade), staggered entry order
(use Morph plus Appear animations only if needed), pixel crispness in edit
mode, and the drawn `→`/`Σ` glyphs if text is exported as native text. Speaker notes go
into Presenter View verbatim.

## 6. Authoring recipe (one-shot)

1. **Pick the location and scaffold first.** Write the world plan: the place
   the mechanism *physically* lives in (here, the shelter's own route map), the
   persistent objects, and which numbers drive them as params.
2. **Lay out in logical px on 480×270.** Reserve the tag (8, 8, height 16),
   the stamp (top-right) and the source line (y ≥ 257). Keep the hero in a
   bottom-left zone of about 90×80 and the scaffold centre-right.
3. **Drive the scaffold with params, not per-state drawings.** Give `place(p)`
   and `draw(g, p)` to anything that should move continuously, and mark it
   `live`. The kit tweens params, so one `params` object per state gives you
   motion for free.
4. **Reuse the kit's props and only add new ones as `draw*` functions** with
   integer coordinates and palette keys. Never antialias, and never scale a
   pixel layer by a non-integer factor at rest.
5. **Give each persistent object one id for its whole life.** Change `look`
   only when its picture changes (a pose, side view → badge). Use a **new id**
   when an object should not fly across the scene (a crowd at a different
   stop).
6. **Write exactly one tag per state and label every coloured mark with
   text.** Chips use `PQ.label` with an accent bar. Numbers go in Silkscreen,
   64 px or larger.
7. **Pick Pip's pose per beat** (`point` when a scaffold appears, `watch` for
   delay or cost, `alarmed` at the twist, `hold` or `happy` for the fix). Add at
   most one reaction prop next to the head, clear of the scaffold.
8. **Render, then open every state and every midframe.** Fix overlaps, clipped
   text, and any midframe that is a double exposure.

**Pitfalls actually hit while building this candidate:**

- **The first Pip (34 px tall) was too small** to read a reaction from the back
  row. Chibi proportions at 56×56 fixed it. Plank-shaped wings looked like
  boards until they became rotated ellipses with carved feather fingers
  (`PQ.paintWing`).
- **The fonts lack `→` (all three) and `Σ` (VT323).** The fallback glyphs looked
  like "Ξ", so draw them as inline pixel SVGs. Pixelify's `fi` ligature turned
  "five" into "Ave": turn ligatures off.
- **Tag crossfades produced overlapping double text.** Tags need a swap
  (fast out, slide in), not a travelling crossfade.
- **A crowd that keeps its id flies diagonally across the map** when it moves
  to another stop. Give it a new id.
- **The camera zoom was a double exposure** until (a) both camera and FLIP moves
  used the same easing and (b) the incoming scene went opaque at once on zoom-in,
  while the outgoing scene stayed on top and opaque on zoom-out.
- **Camera transforms must be computed about each layer's own top-left**, not
  the stage origin. A reaction bubble riding the camera became a giant "?",
  so use `camera: false` for small props.
- **Lamp light cones drawn as half-tone triangles looked like Christmas trees.**
  Use one-in-sixteen pixels plus a ground pool.
- **Seeded skyline windows behind a dither "glass" overlay made noisy checker
  artefacts.** Behind glass, draw window-less silhouettes and a few dithered
  bokeh discs.
- **Map blocks as bright as the route competed with the data.** Keep
  background art at least two steps darker than any data colour.
- **Billboard text sat in the top half of its frame.** Compute the text block
  height (in logical px) and centre it.
