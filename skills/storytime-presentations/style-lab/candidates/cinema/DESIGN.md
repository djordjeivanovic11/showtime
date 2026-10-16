# Cinema — world plan (written before coding)

1. Location: one rain-wet night city, shot in 2.29:1 widescreen; black letterbox bars carry all chrome.
2. Two set-ups: STREET (eye level at a bus shelter, one-point perspective) and LOOP (crane up to a rooftop view of the same city).
3. Character: a silhouetted rider in a long coat, short-brim hat, amber scarf, umbrella; rim-lit by sodium light. Poses: wait, watch (checks wrist), alarm (umbrella tips back, points), resolved (umbrella furled like a cane, rain easing).
4. Loop scaffold: the loop line is a lit road ring seen obliquely, eight stops each a sodium lamp + stop flag; buses travel along it by minutes-along-the-lap, scaled by depth.
5. Gap gauge: a 35 mm film strip of 20 frames, one frame = one minute of the 20-minute lap; amber run = gap A→B, cold-blue run = gap B→A, a white splice marks the split; the same two colours glow on the road ring between the buses.
6. Feedback loop: a rooftop neon sign shaped as a closed tube with arrowheads, four stations lit one by one: LATE BUS → MORE RIDERS → LONGER BOARDING → LATER BUS.
7. Big reveal: back at street level, "5.0 → 9.1" appears in the sky like the film's title card, with "MIN AVERAGE WAIT" set in spaced credit caps and per-number captions (gaps 10 / 10, gaps 19 / 1).
8. Fix hint: an enamel stop plate with a pause glyph reading HOLD THE EARLY BUS, next to Bus B held at a stop while Bus A is far back.
9. Bookend: state 0's shelter, lamp and rider return in state 4; rain has eased, umbrella is closed.
10. Signature transition: the CRANE — the street drops out of frame while the rooftop view descends into place, the rider and buses travelling between set-ups; neon and credits fade up one element at a time.

---

# Cinema — world bible

## 1. Pitch and settings

**Cinema**: the talk is a short film. A rain-wet night city in 2.29:1 widescreen, one silhouetted
rider in an amber scarf to follow, sodium light doing the explaining, and the key number
arriving like the film's title.

**Serves:** keynotes, TEDx-style talks, storytelling nights, product launches, fundraising
galas, conference openers. Any room that is dark, has a big screen, and where you want the
audience to *feel* the mechanism before they get the number.

**Wrong for:** bright rooms or washed-out projectors (the palette is mostly near-black, so
it loses contrast in daylight); dense, table-heavy reviews; very playful or kids' audiences;
anything printed. Silhouette characters also can't show a facial expression, so
emotion has to come from posture and light.

## 2. World bible

### Palette tokens (semantic)

| Token | Hex | Meaning |
|---|---|---|
| `bar` | `#030305` | letterbox bars; all chrome lives here |
| `night` / `sky` | `#070a12` / `#101829` | the world's base darkness |
| `silhouette` | `#04050a` | characters, near buildings |
| `sodium` | `#ffb347` | **ACCENT / "ours"**: lamp light, the hero's scarf, Bus A, the gap that grows |
| `moon` | `#9cc3ff` | **second voice / "theirs"**: cold light, Bus B, the "before" value |
| `alarm` + `alarmCore` | `#ff4d5e` / `#ffe1e4` | **ALARM**: neon of the vicious circle; text is the white-hot core so it stays legible |
| `paper` | `#f3e9d6` | titles, tag, neutral labels |
| `muted` | `#a9adbb` | small print (source line, keys) |
| `window` | `#ffcf7a` | lit interiors (buses, buildings) |

Meaning is never carried by colour alone: buses carry letter plates, gauge runs carry
`A → B` / `B → A` names, and the neon has words and arrows.

### Typography

- **Cormorant Garamond** 600 italic: tag (60 px) and title card (112 px); 700 for the
  reveal number (200 px). Opening-credits elegance.
- **Fira Sans Condensed** 400–700: labels (≥ 28 px), gauge values (40 px), stamp (24 px,
  spaced caps), source line (24 px). It has a Greek subset, so `Σ` renders from the local font.
- Arrows are always **drawn** (SVG paths), never the `→` glyph. Neither font's Latin
  subset contains it.

### Character: the rider

An original silhouette in a long coat, short-brim hat and amber scarf, holding an umbrella.
Each pose is drawn twice: an amber copy nudged up-left (rim light from the lamp) under the
black silhouette. This is the whole trick that keeps a black figure readable on a black night.
Always stand them in front of a light source (lamp pool, lit shelter panel).

Poses (`Cine.POSES`): `wait` (neutral), `watch` (head down, wrist raised, glint),
`alarm` (leans back, umbrella tips back, free arm points), `resolved` (umbrella furled
like a cane, head up toward the title). Crowd extras reuse the same drawer at ~0.45
scale without the scarf. The scarf is how you tell the hero from the crowd.

### Recurring props

Sodium lamp with cone, pool and wet-road reflection (`lamp`); buses with side view and
front view in one group (`bus`/`placeBus`); bus shelter with a lit panel; perspective
facades with lit windows (`facade`); skyline (`skyline`); rooftop neon sign (`neonLoop`);
enamel stop plate with a pause glyph (`pausePlate`); 35 mm film strip (`filmStrip`).

### Locations (set-ups)

- **STREET**: eye level, one-point perspective to a vanishing point, shelter left
  foreground. Used for the opening and the bookend.
- **LOOP**: the camera has craned up to a rooftop. The mechanism lives on the ground
  plane (an oblique ellipse road with 8 lamp-lit stops). Mechanism states live here.

### Fixed components

- **Headline tag:** top letterbox bar, left, Cormorant italic 60 px, amber 4 px slate rule.
  Cross-fades between states. Never more than ~6 words.
- **Stamp:** top bar, right: spaced caps in a thin amber box (`ILLUSTRATIVE`,
  `PAPER RESULT`, `OUR DATA`…), like a lab or rating card on a print.
- **Source line:** bottom bar, left, 24 px muted.
- **Scene counter:** bottom bar, right (`OPENING`, `SCENE 1`…). It reads as a slate.
- **Title card:** large Cormorant italic in the sky of the establishing shot.
- **Reveal title:** the number set as a film title in the same sky position, with a
  radial scrim behind it, captions under each value, and the unit in spaced credit caps.

## 3. Other talks in this world

**(a) Quarterly business review.** Scaffold: a night harbour from a crane shot. Each
product line is a ship at a lit berth, and the film-strip gauge becomes "weeks of runway"
(1 frame = 1 week). Metaphor: a *tide line* painted on the pier wall, labelled
`TIDE = MARKET DEMAND`, `HULL DEPTH = COST BASE`. The reveal is the quarter's revenue
appearing as the title over the harbour mouth. Stamp: `OUR DATA`.

**(b) Research result.** Scaffold: a rain-wet observatory road. Experimental runs are
buses on the loop, and the gauge is a film strip of trials (1 frame = 10 runs; lit
frames = successes, so the denominator is visible). Metaphor: a neon sign on the
observatory roof drawing the hypothesis as a causal cycle (`SIGNAL → FEEDBACK → GAIN`),
lit one station per click. Stamp: `PAPER RESULT` on the baseline, `OUR RUN` on the replication.

**(c) Class lesson (e.g. supply and demand).** Scaffold: one night market street. Stalls are
lamp pools, and queue length (crowd figures, entering one at a time) is demand. Metaphor:
the price board as a split-flap marquee labelled `PRICE = SIGNAL`, the queue labelled
`QUEUE = DEMAND`. The bookend returns to the same stall at closing time with the
equilibrium price as the title.

## 4. Motion language

- **Persistent actors** (`rider`, `busA`, `busB`, `gapGauge`) are single groups, and
  `Cine.Director` tweens their numbers. Buses move **along the road** (route position in
  minutes), not in straight lines. The gauge splice slides and the frames re-tint
  continuously.
- **New things enter one at a time:** crowd members arrive one by one, neon stations light
  in reading order with the arrow leaving each, and the reveal comes in as number, arrow,
  number, then unit.
- **Signature transition: the CRANE.** The old set-up sinks (translateY) and darkens
  first, the new one descends into place after it, and the actors keep travelling through
  the dark middle. It is a dissolve through night, never a muddy double exposure. Facing
  and pose flips are scheduled late in the move so the rider is never a sliver for long.
- **Idle life:** rain pans slowly. `M` stops it and shortens every transition to 25 %.
- Durations are 800–1200 ms for actors and 300–600 ms for fades, with ease-in-out-cubic.

## 5. PPTX plan

| Layer | Export | Morph name |
|---|---|---|
| Letterbox bars | native rectangles in the master | — |
| Tag | native text box (Cormorant Garamond Italic, embedded) | `!!tag` |
| Stamp, source line, scene counter | native text + rectangle | `!!stamp`, `!!source`, `!!scene` |
| Street / loop backgrounds (sky, skyline, facades, road ring, lamps, rain) | **one flattened PNG per set-up** (rendered from the SVG at 1920×1080), grain baked in | `!!bg` (morph fades between set-ups) |
| Rider poses | one PNG per pose with rim light baked in, same frame size so they align | `!!rider` (swap picture per slide; Morph moves/scales it) |
| Bus A / Bus B | PNG side view + PNG front view; letter plate as native text grouped on top | `!!busA`, `!!busB` |
| Film-strip gauge | native shapes: 20 rectangles (fill per run), splice rectangle, native text labels | `!!gauge`, `!!gaugeSplice`, `!!gaugeLabelA`, `!!gaugeLabelB` |
| Route arcs | native freeform arcs (exported path) per state | `!!arcA`, `!!arcB` |
| Crowd | one PNG group (or nine PNGs for one-by-one entry with Appear animations) | `!!crowd` |
| Neon sign | PNG board + native text labels with glow effect; arrows as native lines | `!!neon` |
| Reveal number | native text (Cormorant 700) + native arrow; scrim as soft-edged ellipse | `!!reveal5`, `!!reveal9`, `!!revealUnit` |

**Lost in PowerPoint:** buses following the curve (Morph moves in a straight line, so add
an intermediate slide or a motion path), the continuous re-tint of the strip (it becomes
a cut per state), animated rain, the dark-middle crane timing (Morph cross-fades, so use a
Fade-through-black between set-ups instead), SVG blur-based glows (approximate with
Glow/Soft Edges effects), and the `mix-blend-mode` lit-rain inside cones.

## 6. One-shot authoring recipe

1. **Fix the two set-ups first.** Choose an eye-level establishing set-up (for the opening
   and bookend) and a raised set-up where the mechanism lives on a ground plane. Write
   their geometry as constants (horizon, VP, ellipse cx/cy/rx/ry).
2. **Put all chrome in the letterbox bars:** tag top-left, stamp top-right, source
   bottom-left, scene bottom-right. The picture itself carries only world and labels.
3. **Model the mechanism in domain units** (minutes along the lap), not pixels.
   `ellipseRoute.point(pos)` gives x, y, depth scale, rotation and flip, so motion follows the road.
4. **Draw the gauge as an in-world object with an explicit denominator.** The film strip
   has exactly N frames for N units, plus a `1 frame = 1 min` key. Colour the runs to match
   the arcs on the route, and name them so meaning is never colour-only.
5. **Light every silhouette from behind.** Stand the character in a lamp pool or in front
   of a lit panel, and use the rim-light double draw. Give the hero one accent object (the scarf).
6. **Draw the metaphor as a sign in the scene,** with labels on a grid and drawn arrows
   between them. A ring of words is not enough: arrows between adjacent labels make the
   reading order unambiguous.
7. **Write every state as a plain object of numbers,** plus per-state `[delay, duration]`
   windows: persistent actors first, new objects after them, one at a time.
8. **Reveal = title card.** Same sky position as the opening title, radial scrim behind it,
   captions under each value, unit in spaced caps. No box around it.
9. **Load fonts before drawing** (`document.fonts.load`): the gauge, neon and reveal
   are laid out from measured text widths.
10. **Render, then look at the mid-frames too.** That is where the double exposure and
    sliver problems show up.

### Pitfalls I actually hit

- **The `→` glyph is missing** from both fonts' Latin subsets and silently fell back to a
  system font. Draw arrows (`Cine.arrow`, `Cine.arrowLabel`).
- **Wet-road reflections drawn as tall rectangles under headlights looked like stilts or
  legs** under the buses. Use short, soft, gradient ellipses.
- **The 2×2 neon sign collided** ("LATER BUS" over "LONGER BOARDING") when labels were
  anchored to the stadium ends. Centre the labels on the quarters instead. Even then a
  2×2 grid reads top-to-bottom, so you need the inner arrows.
- **A "dim, unlit" neon sign left visible** in earlier states leaked the future labels.
  Keep it at opacity 0 until its state.
- **A plain cross-fade between set-ups gave a muddy double exposure** at 350 ms. Stagger
  the fades: old out, then new in, with actors moving across the gap.
- **Dark parallelogram "city blocks" inside the loop read as holes.** Keep the interior
  of the ring plain.
- **Rotating buses to the ellipse tangent** made the rear bus look like it was falling.
  Clamp rotation to ±12°.
- **A blurred-ellipse scrim behind the reveal showed a visible edge.** Use a radial
  gradient fill.
- **Bus letter plates mirror** when the bus flips at the back of the loop. The plate
  counter-flips (`placeBus`).
