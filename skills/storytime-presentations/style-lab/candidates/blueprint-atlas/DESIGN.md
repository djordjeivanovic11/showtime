# Blueprint Atlas — world plan (written before coding)

1. Location: one cyanotype drawing sheet, "Transit Loop Study", seen as a tilted planometric town plan (x across, depth foreshortened 0.62) inside a double plate frame with a title block.
2. Character: "the Surveyor", a lab-coated scale figure with round glasses and a stopwatch; a parametric line figure whose joint angles morph between poses: peer, wait, check-watch (annoyed), alarm, present (relieved).
3. Route scaffold: a stadium-shaped loop road on the plan, 8 stops as small shelters tagged with architectural grid bubbles 1–8, buses drawn as extruded boxes with window bands and wheels.
4. Gap gauge: a drafting caliper that is the loop *unrolled*: fixed jaw = Bus A, sliding jaw = Bus B, far end = Bus A one lap later, 0–20 min rule, two dimension lines (solid A→B, dashed B→A) that match solid/dashed gap arcs painted inside the road.
5. Semantic zoom: state 0 is a camera close-up on stop 1; state 1 pulls out to the whole plan; state 2 opens a "DETAIL · BUS A" inset (elevation of Bus A boarding the queue at crowded stop 8), leader-linked to Bus A on the plan; state 4 pushes back in to stop 1.
6. Feedback loop metaphor: inside the detail inset, a red-pencil ring of arrows is drawn around the bus and the queue, then labelled corner by corner: LATE BUS → MORE RIDERS → LONGER BOARDING → LATER BUS (labels sit on the scene parts they name).
7. Big reveal: back at stop 1 the wait is drafted as a dimension annotation over the street: `5.0 → 9.1 min average wait`, with two proportional dimension bars (dashed 5.0 min for gaps 10·10, solid 9.05 min for gaps 19·1).
8. Fix hint: a drafting revision cloud with a revision delta around the early bus: `HOLD THE EARLY BUS`.
9. Honest print: `ILLUSTRATIVE` approval stamp top-right, source line bottom-left, title block bottom-right; tag sits in a fixed title strip top-left with a FIG. cell.
10. Signature transition: "the draftsman's camera": the whole plan glides/zooms (one camera) while buses travel along the road to their new positions (never teleport) and new annotations ink in one at a time.

---

# Blueprint Atlas — world bible

## 1. Style, pitch, settings

**Blueprint Atlas** (`blueprint-atlas`): *the talk is one cyanotype drawing
sheet; every click is the draftsman adding the next annotation.*

Serves: research talks, engineering design reviews, thesis defenses, systems /
architecture reviews, medical and scientific education, technical onboarding.
It signals rigor (dimension lines, plate numbers, honest stamps) while staying a
place with a person in it.

Wrong for: emotional or consumer storytelling (grief, brand launches,
children's audiences), fashion/creative pitches, and anything where "technical
drawing" reads as cold bureaucracy (HR, layoffs). Also weak for datasets that
have no spatial/mechanical metaphor at all; it needs *a thing that can be drawn*.

## 2. World bible

### Palette tokens (semantic, `BP.T`)

| token | hex | meaning |
|---|---|---|
| `ground` | `#0f3b6e` | the sheet (cyanotype exposure, radial-lit) |
| `groundDeep` | `#0a2b54` | knockout panels, stamps, title block cells |
| `groundLift` / `faceSide` / `faceTop` | `#16477d` / `#174a82` / `#22609f` | extruded faces, road surface |
| `ink` | `#eef5ff` | primary linework and text (≈10:1 on ground) |
| `inkSoft` | `#a3c6ea` | secondary linework, small print (≈5.9:1) |
| `inkFaint` | 30 % ink | context only (city blocks); never text |
| `data` | `#ffd166` | the tracked quantity: gauge readings, gap arcs, the stopwatch |
| `alarm` | `#ff8f80` | red-pencil corrections: things going wrong (19 / 1, the feedback ring, crowding zone) |
| `fix` | `#8ef0c6` | revision / remedy (revision cloud, delta, fix note) |

"Ours vs theirs": `data` (amber) = our measurement / our run; `inkSoft` =
baseline / planned / theirs (e.g. the 5.0 in `5.0 → 9.1`). Meaning is never
colour-only: alarm also gets hatching or a ring shape, fix gets a revision
cloud and a delta, solid vs dashed carries A→B vs B→A.

### Typography
- Display: **Barlow Condensed** 600/700 (OFL; descended from highway-sign
  lettering, so it feels like signage and drafting). Title 128 px, tag 52 px,
  labels 30–34 px uppercase with +0.07em tracking, the reveal number 220 px.
- Mono: **JetBrains Mono** 400/700 (OFL), Latin + Greek subset so `Σ` renders
  in-family. Small print 21 px, instrument numerals 46 px bold.
- Arrows (`→`) are not in the Latin subsets: draw them with `BP.arrowGlyph`.
- Avoid B612 Mono: its parentheses look like square brackets, which corrupts
  formulas (found in round 1).

### Character: the Surveyor
A lab-coated scale figure with round glasses, a hair cap, a wristwatch and an
amber stopwatch (the stopwatch is the data colour: they *measure* things).
Built parametrically (`BP.figure`): joint angles + face controls, so poses
morph instead of swapping. Poses in `BP.POSES`:
`peer` (hand at brow, looking off, unsure), `wait` (stopwatch out, calm),
`watch` (checks wristwatch, frown), `alarm` (both arms up, mouth open, eyes
wide), `present` (arm up toward an annotation, smiling), `point`.
Rule: the Surveyor always stands *in* the drawing at a real location (here,
beside stop 1) and scales with the camera, never pasted on top.

### Recurring props
Extruded boxes (`BP.box`), plan buses (`BP.planBus`), shelters, plan-symbol
trees, faint context buildings, riders (`BP.rider`), elevation buses for
insets, grid bubbles (`BP.bubble`), leaders, dimension lines, caliper gauge,
revision cloud + delta, north arrow + scale bar.

### Locations
One sheet, many camera positions: close-up (camS 2.0) on stop 1; whole plan
(camS 1.1, centred); working plan (camS 0.94, right) with a detail inset on
the left. Sections of a longer talk = new plates (Plate 0, 1, 2…) of the same
sheet set, never a new style.

### Fixed components
- **Headline tag**: top-left title strip (56,50), `FIG. n` cell + tag text
  52 px. Width morphs and text crossfades on advance. Only sentence-like text.
- **Stamp**: top-right approval box, double rule, letter-spaced mono
  (`ILLUSTRATIVE`, `SCHEMATIC`, `PAPER RESULT`, `OUR DATA`).
- **Source line**: bottom-left 21 px mono, `inkSoft`.
- **Title block**: bottom-right cells (`SHEET n / 5`, a one-line spec of the
  system). Doubles as a progress indicator.
- **Title card**: a drawing cartouche (double-ruled panel) over the close-up,
  plate caption above a rule, two-line title.

## 3. Using this world for other talks

(a) **Quarterly business review**: the plant is a drafted factory floor in
plan; the scaffold is a conveyor from `ORDERS` to `SHIPPED` with a caliper
gauge per quarter; the metaphor is a *leaking pipe* drawn in a detail inset,
labelled `LEAK = CHURN`, `PATCH = ONBOARDING FIX`; the reveal is a dimension
annotation `92 → 97 % retained` with a revision cloud on the fixed valve.

(b) **Research result**: the model is an elevation of an instrument rack; the
scaffold is a signal path with grid-bubbled stages; the persistent gauge is a
dial or caliper of the metric; the metaphor (e.g. *fork in a road* for high
entropy) is drawn in a DETAIL inset and labelled `FORK = HIGH ENTROPY`; the
stamp switches between `PAPER RESULT` and `OUR RUN` per plate.

(c) **Class lesson (heart physiology)**: a sectioned anatomical plate; the
scaffold is the four chambers with valve bubbles 1–4; the gauge is a caliper
of pressure (mmHg); the metaphor is *a two-stroke pump* drawn beside it and
labelled `VALVE = CHECK VALVE`; the Surveyor holds the stopwatch to time beats.

## 4. Motion language

- **Signature transition: the draftsman's camera.** One 2D camera
  (`camX/camY/camS`) eases (cubic in-out, 800–1100 ms) between close-up and
  plan. Strokes stay constant width because the scene is reprojected per
  frame, not scaled.
- Persistent objects travel: buses always move *along the road* to their new
  arc-length position (never teleport); forward clicks go forward round the
  loop, back clicks go backward. A's and B's travel distances encode the story
  (A crawls, B races).
- The gauge slider slides; readings tick in whole minutes while it moves.
- New annotations "ink in" one at a time with staggered delays (ring draws as
  a growing arc, then each label at +250 ms).
- Tag strip morphs width and crossfades its text at the midpoint.
- Idle life: the Surveyor blinks (CSS, every ~5 s). Disabled under reduced
  motion (`M` toggles; `prefers-reduced-motion` honoured) which collapses all
  tweens to a 280 ms crossfade.

## 5. PPTX plan

| layer | export | Morph name |
|---|---|---|
| sheet ground (exposure gradient, blotch, grid, paper grain) | one picture per deck (PNG, 1920×1080) on the master | — |
| plate frame, registration crosses | native shapes on master | — |
| tag strip | native rect + native text box | `!!tag` (text changes, Morph crossfades) |
| stamp, source line, title block | native rect + text | `!!stamp`, `!!source`, `!!titleblock` |
| road + stops + city (per camera) | SVG/EMF picture per camera position (3 pictures) | `!!plan` (Morph scales/moves it between close and plan) |
| Bus A / Bus B | grouped native shapes (box faces as freeforms) re-exported per state, or a picture per heading | `!!busA`, `!!busB` |
| the Surveyor | picture per pose (SVG→EMF) | `!!surveyor` |
| gauge beam/jaws | native shapes; slider is its own group | `!!gauge`, `!!gaugeSlider`; values native text `!!gapAB`, `!!gapBA` |
| gap arcs | freeform per state | `!!gapSolid`, `!!gapDashed` |
| detail inset frame + contents | native frame, picture contents | `!!inset`; ring `!!ring` + 4 label text boxes `!!fb1..4` |
| reveal number | native text (`5.0`, `9.1`, `min`) + native arrow | `!!reveal`, bars `!!wait5`, `!!wait9` |
| revision cloud + note | freeform + native text | `!!revision` |

Lost in PowerPoint: buses following the curved road (Morph moves in straight
lines, so a bus crossing the loop will cut across; mitigate with an
intermediate state or a motion path), constant-width strokes during the
camera zoom (Morph scales strokes of pictures), the growing ring arc (use a
Wipe instead), the per-frame painter's order (fixed z-order per slide), the
blink. Fonts must be embedded (Barlow Condensed, JetBrains Mono) or text falls
back.

## 6. One-shot authoring recipe

1. **Pick the drawable system** first (a loop road, a pipe network, an organ,
   a rack). Write it as world coordinates on a ground plane; everything else
   annotates it.
2. **Define states as parameter bags**, not as slides: camera, object
   positions (arc length along the scaffold), gauge values, character pose,
   per-annotation opacities. One renderer `draw(params)` draws everything.
3. **Encode the numbers in geometry**: arc length per minute, px per minute on
   the caliper and the wait bars. Then positions *are* the data (`B = A + 12
   min`), and in-between frames stay truthful.
4. **Place the camera states** (close-up for title/bookend, whole plan for the
   setup, working plan + inset for the mechanism). Reserve a column for the
   inset; check the plan's extreme stop bubbles don't touch it.
5. **Persistent ids**: one `<g id>` per object, cleared and redrawn each frame,
   re-appended in depth order (painter's sort by world y).
6. **Labels in screen space** at projected anchor points with knockout boxes
   (`BP.boxLabel`) or halo strokes (`.halo-deep`); never scale text with the
   camera.
7. **Annotate one thing per click** with `TIMING` delays: motion first
   (0–1000 ms), then the new annotation (≥ 700 ms), labels staggered.
8. **Honest print on every state**: stamp, source line, title block, FIG.
   number. Readings round to whole units while moving.
9. Render with `--midframes`, inspect every PNG at full size, crop the
   character and dense areas at 2×.

### Pitfalls actually hit
- **Font glyph coverage**: `Σ` and `→` are missing from Latin web-font
  subsets. Σ needs a Greek subset via `unicode-range`; → is drawn as a vector.
- **B612 Mono parentheses look like brackets**: `(2 · Σ gap)` read as
  `[2 · Σ gap]`. Switched to JetBrains Mono.
- **Tall context buildings** (tiltZ 0.86) read as big dark panels and collided
  with the gauge; the back row now fades out in plan views (`farO`).
- **Stop bubbles above near-side shelters sat on top of buses**; near-side
  bubbles now go on the kerb in front.
- **The crowded stop at the loop's left extreme was invisible** (bus seen
  end-on, riders behind the inset). Crowded stop moved to the near-left
  (stop 8), bus halts just upstream of the shelter, crowd gets a red hatched zone.
- **Physics of the story**: choose positions so the late bus travels *less*
  than the early bus between clicks; first draft had A overtaking B.
- **Back arm behind the coat** hid the check-watch gesture; arms are now drawn
  over the coat.
- **Mid-transition readings** showed invented decimals (10.1 / 9.9 min); the
  caliper now shows whole minutes only.
- Gauge's "1 min" label must go outside the end jaw when the segment is
  narrow; leave ~160 px of free space to the right of the gauge.
