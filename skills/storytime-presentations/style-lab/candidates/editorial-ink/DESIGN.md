# Editorial Ink — world plan (written before coding)

1. Location: one city corner drawn as a magazine feature illustration on cotton paper: an avenue receding to the left, a bus shelter in the right foreground.
2. Character: "the commuter", an original ink-line woman in a hatched trench coat, ochre scarf, round glasses; poses wait (reading paper), watch (checks wrist), alarmed, relieved/pointing.
3. She and her shelter never move: the right third of the frame is a fixed foreground; only the left two-thirds changes between "street" and "map".
4. Route scaffold: the street dissolves into an aerial ink map of the same neighbourhood: a rounded-rectangle loop road through hatched city blocks, 8 stop dots, a park inside; her stop on the right side is marked YOU ARE HERE with a leader to the foreground.
5. Buses: one side-view bus pictogram per bus (A solid ink, B Prussian-blue wash, both lettered) that shrinks from the street onto the map and grows back; the same element travels the loop.
6. Gap gauge: drawn as a map scale bar under the map, "the loop unrolled": A — gap — B — gap — A over a 20-minute ruler; each segment's texture matches its arc painted on the road.
7. Feedback loop: drawn in red editor's pencil inside the park as a hand-drawn vicious circle of four small ink vignettes, each labelled in red capitals LATE BUS → MORE RIDERS → LONGER BOARDING → LATER BUS, with a pencil leader to the bunched buses.
8. Reveal number: printed on the shelter's own timetable poster (which read EVERY 10 MIN at the start): "5.0" struck through by red pencil, arrow, "9.1 min" huge, red pencil ring around it.
9. Fix hint: red pencil margin note HOLD THE EARLY BUS with an arrow at Bus B, which sits right behind Bus A at the stop.
10. Signature transition: "ink-in" — new linework draws itself with the pen (stroke-dash), old linework washes out to paper; the red pencil always arrives last and marks the claim.

**What changed while building it:** the city blocks became a river and scattered trees (blocks squeezed into the margins read as clutter); the YOU ARE HERE label became a wordless portrait medallion at the stop just after the crowded one; the 5.0 is not struck through (it is the honest baseline, so it stays in soft ink) and the red pencil rings only 9.1; the bus-stop sign moved from a pole onto the shelter roof so her raised arms have room.

---

# Editorial Ink — world bible

**Pitch:** a magazine feature illustration that thinks out loud: confident black
line on cotton paper, one Prussian-blue data ink, and an editor's red pencil that
circles the one claim you must not miss.

**Serves:** policy briefings, think tanks, journalism and newsroom talks,
humanities and legal seminars, nonprofit boards, investigative or explanatory
talks, public lectures. It reads as *considered* and *trustworthy*: no
gamification, no glow, no corporate gloss.

**Wrong for:** product launches and hype keynotes (too quiet), children (the red
pencil reads as "marking"), dashboards with many series (only one data colour),
dark auditoriums where a paper-white screen glares (use a dark world instead).

## Palette tokens (each has one job)

| token | hex | meaning |
|---|---|---|
| `paper` | #F1EADB | ground; canvas texture painted once to a canvas data URI |
| `paperLight` | #F9F5EC | printed matter lying on the paper: posters, newspapers, cards, road surface |
| `ink` | #1C1A17 | all linework and primary text (14.5:1) |
| `inkSoft` | #4D463E | small print, secondary numbers (7.7:1) |
| `inkFaint` | #A39886 | receding background lines only, never text |
| `red` | #B02E1C | **the editor's red pencil: the claim**. Rings, arrows, margin notes, stamp. One claim per state. (5.6:1) |
| `blue` / `blueWash` | #1F4A66 / #A9C1CF | **data ink**: the measured quantity ("ours"); hatched fills, river |
| `ochre` / `ochreWash` / `skin` | #B07E3A / #DCBE8A / #EFD6BC | warmth reserved for the character |

Meaning never by colour alone: Bus A = solid ink + letter A; Bus B = blue wash +
letter B; gap ahead of A = blue hatch, gap behind = black stipple, same textures
on road and gauge.

## Typography
- **Fraunces** (600 for the title and big numbers, italic 400 for the headline tag). The voice.
- **Source Serif 4** (600 letter-spaced small caps for captions; italic for the source line; Greek subset for Σ).
- **Caveat 700** for red-pencil handwriting only: labels of a metaphor, margin notes. Capitals, ≤4 words.
- Arrows are drawn paths, never glyphs (latin subsets have no →).

## Character: "the commuter"
An original ink-line woman: black bob, round glasses, camel trench coat with hatched
far side, striped black scarf, folded newspaper. ~600 px tall at scale 1; feet at a
fixed spot in the right-hand foreground, so she is the anchor every state cuts around.
Poses (`Ink.POSES`, all tweenable joint angles + expression): `wait` (newspaper held at
chest, looking down the road), `read` (head down), `watch` (wrist to face, frown, time
ticks, other hand on hip), `alarmed` (arms up, brows up, mouth open, emanata, paper
dropped on the ground), `point` (smiling, arm points at the poster), `relaxed`.
Idle life: a blink every ~4.7 s (off under reduced motion). On maps she appears as a
**portrait medallion** at her stop, a "you are here" marker with no words.

## Recurring props and locations
- **The shelter** with a big printed poster: the poster is the slide's in-world
  "printed truth". It reads TIMETABLE / every 10 min, then later AVERAGE WAIT 5.0 → 9.1 min.
- **Bus-stop roundel** on the shelter roof. **Side-view bus pictogram / front-view bus** in one element.
- **Locations**: the avenue (one-point perspective street; facades, windows, lamps,
  lane dashes) and the aerial map (inked loop road, park with stippled tree tops,
  river with wave strokes). Sections change location; the foreground never changes.

## Chrome components
- **Headline tag** (`Ink.tag`): top-left, 64 px ink rule above, red square bullet,
  Fraunces italic 56 px. The only sentence-like text on a state.
- **Stamp** (`Ink.stamp`): top-right, double-ruled letterpress box in red, rotated −2.5°, grainy pencil filter.
- **Source line** (`Ink.sourceLine`): bottom-left, Source Serif italic 22 px on a paper backing so it survives busy scenes.
- **Title card**: Fraunces 600 at 112 px, two lines over the sky of the establishing shot, red-pencil underline under the key word.

## Mechanism scaffolds in this style
- **Route scaffold**: `Ink.route` rounded-rectangle road, stops on the outward normal; `at(f)` positions anything by loop fraction; `setArcs` paints the two gaps as textures on the road.
- **Gap gauge**: `Ink.gauge` is a *map scale bar*, the loop unrolled A → B → A over 20 minutes, with exact values above each segment.
- **Feedback metaphor**: vignette cards (ink icon + red handwritten capitals) on an ellipse, joined by `Ink.cycleArrows` (red pencil arrows that skip the cards).

### Three other talks in this world
- **(a) Quarterly business review:** location = a printing-house floor / newsroom wall.
  Scaffold = a hand-ruled ledger page pinned to the wall, one row inked per click;
  the quarter's number printed on a pinned proof sheet, red pencil rings the miss.
  Metaphor = a leaky bucket drawn in ink: `INFLOW = NEW CUSTOMERS`, `HOLE = CHURN`, `LEVEL = REVENUE`.
- **(b) Research result:** location = a library reading room. Scaffold = a specimen
  drawer / index-card tray whose cards are the samples; a measured fraction is a
  stack of cards with a scale bar gauge (`gauge` with total = N). Metaphor = a
  sieve: `MESH = THRESHOLD`, `CAUGHT = MATCHES`, `FELL THROUGH = MISSES`; the paper's
  number lives on the journal page lying on the desk, red pencil rings it.
- **(c) Class lesson (e.g. supply and demand):** location = a market street (reuse
  `avenue`). Scaffold = a price tag on a stall that re-prints each click, plus a
  scale-bar gauge of quantity. Metaphor = a see-saw drawn in ink:
  `LEFT SEAT = BUYERS`, `RIGHT SEAT = SELLERS`, `PIVOT = PRICE`.

## Motion language
- **Signature transition, "ink-in"** (`Ink.inkIn`): new linework draws itself with
  the pen (stroke-dash from 0 to full), then washes, fills and text settle in over
  the second half. Old scenes simply wash out to paper (`Ink.hide`, 380–420 ms).
- **The red pencil always arrives last** (it is drawn by the same ink-in after the scene settles).
- Persistent objects tween: buses travel the loop by fraction (they follow the road,
  not a straight line), the gauge's B marker slides and the numbers re-type, the
  character's joints and expression interpolate (800 ms), the bus crossfades front ↔ side view while it scales between street and map.
- Entrances are staggered: crowd riders appear one by one (110 ms apart); the
  feedback loop draws in reading order vignette → arrow → vignette.
- `M` = reduced motion: every tween becomes instant, blink stops.

## PPTX plan
| layer | export |
|---|---|
| paper texture | slide background picture (PNG from the canvas) |
| avenue, map art (blocks, river, park, trees), shelter frame | one **picture layer per location**, SVG → EMF/PNG at 2×; named `!!street`, `!!map` |
| route road + arcs | picture layer `!!route`; the two gap arcs as separate freeform pictures `!!arcAhead`, `!!arcBehind` (Morph can't animate dash offsets, so these are re-rendered per slide) |
| buses | grouped pictures `!!busA`, `!!busB` (`!!busC` on slide 0); Morph moves/scales them, but straight-line, not along the loop |
| character | one picture per pose named `!!character` (Morph crossfades poses; no joint interpolation) |
| gauge | native shapes: two rectangles `!!gapAhead`, `!!gapBehind` with pattern fill, circles `!!badgeA`, `!!badgeB`, native text for values (Morph animates widths and the B marker) |
| tag, source, stamp, poster text, notes text, big number | **native text** (Fraunces / Source Serif / Caveat embedded); `!!tag`, `!!poster` |
| red pencil rings/arrows | freeform pictures; use Wipe or a Morph from a zero-length path to approximate ink-in |

Lost in PowerPoint: the stroke-drawing ink-in (approximated with Wipe), buses
following the road's curve (Morph goes straight; add a midpoint slide if it matters),
the displacement wobble on live text (fine: text stays crisp anyway), and the pencil
grain if exported as vector (export rings as PNG to keep it).

## Authoring recipe (one shot)
1. Pick **one location pair**: an establishing scene and a "diagram place" (map, ledger, drawer) that is the same world seen differently. Fix the character's foreground spot and a printed object (poster, page) that will carry the big number.
2. Fix the frame: tag top-left (x 80), stamp top-right, source bottom-left, character + printed object in the right third. The mechanism lives in the left two-thirds.
3. Build the scaffold from `route` / `gauge`; make every persistent object one element with a controller (`place`, `set`, `setPose`) and give states *targets*, not drawings.
4. Write states as data: `{tag, pose, show:[layer names], bus/gauge targets, notes}`; `apply(n, instant)` hides missing layers, tweens persistent ones, then inks-in new layers with a stagger.
5. One red-pencil mark per state, on the claim of that state only. Everything red is the claim.
6. Put every label on a paper card (`backCard`) when it sits on hatching; labels ≥28 px, metaphor labels in Caveat capitals.
7. Render, then check: overlaps of raised arms with markers, labels on road edges, ring vs. neighbouring text, the number legible at contact-sheet size.

### Pitfalls actually hit
- An empty tag still showed its rule and red square on the title card: the tag's "unchanged text" shortcut skipped hiding it. Initialise the tag's current text to `null`.
- Hands placed in the middle of the newspaper read as a second pair of eyes. Hands must grip the **edges** of a held object.
- Raised "alarmed" arms covered the map's you-are-here medallion and the stop pole. Move markers off the character's gesture space, and mount signs on the shelter rather than on a pole beside her.
- City blocks squeezed into thin margins became random rectangles at the frame edge. A river plus scattered trees reads as *a place*; half-blocks read as clutter.
- A small stipple tile makes a visible dot grid on large areas: use a 120 px tile with ~26 random dots for lawns.
- Red rings drawn with the same radius as the text block cut through neighbouring words ("min"). Size rings to the glyph box and keep 25 px clear of the next line.
- Cycle arrows on the same ellipse as the vignette cards were stubby. Run the arrows on a larger ellipse (+46/+26) so they bow outward.
- Fontsource latin subsets have no → and no Σ: draw arrows as paths and load the Greek subset for Σ.
- The source line ran over the street's lane dashes: give small print a paper backing.
