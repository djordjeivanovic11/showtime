# Signal Line

## World plan (written before coding)

1. Location: one bus shelter on a dusk street. Its back wall carries a cream vitreous-enamel route map in a steel frame, a backlit "gap gauge" display, and a bench; a lightbox fascia runs along the canopy. The street, skyline and road sit outside it.
2. Character: "the Rider", a signage-pictogram figure (cream, flat cap, green scarf, one eye dot) whose limbs are jointed so poses morph. Poses: shrug (state 0), look (1), check-watch (2), alarmed with an enamel "!" disc (3), point-up and relaxed (4).
3. Loop route scaffold: a thick route-green line drawn as a 45-degree chamfered octagon on the enamel map, with 8 outward station ticks. The rider's stop is an interchange ring marked THIS STOP. Bus A (amber) and Bus B (blue) are enamel magnet tokens that glide *along* the line.
4. Gap gauge: the shelter's backlit display. Two large backlit readouts, IN FRONT OF A and BEHIND A, sit over one fixed 20-minute rail. A white needle slides along the rail, so the two parts visibly always add up to 20. The same amber and blue bands are drawn on the map under the route between the tokens.
5. Feedback loop metaphor: a second, signal-red line inside the big loop (a loop inside the loop) with four stations: LATE BUS, MORE RIDERS, LONGER BOARDING, LATER BUS. Filled red arrowheads run clockwise and FEEDBACK LOOP is set in its centre. (Planned as chevrons; changed after render 2.)
6. Crowd: small pictogram riders queue just inside the loop beside the right-hand stop, where MORE RIDERS will later appear. They fade out once Bus A has boarded them.
7. Reveal: the camera pulls back to the street. The canopy lightbox, which read LOOP LINE in state 0, now reads AVERAGE WAIT 5.0 → 9.1 min, with 9.1 in signal red. The number is part of the shelter itself.
8. Fix hint: out on the street, the rear bus of the bunch waits at a timing post that carries the enamel plate HOLD THE EARLY BUS.
9. Signature transition: the "dolly-in". One camera glides from the street into the map and back out. Tokens never jump; they travel along the route line. Numbers count to their new values.
10. Chrome: a station-name tag plate top-left (cream enamel, green rule), a red-bordered ILLUSTRATIVE plate top-right, and the engraved source line bottom-left.

---

## 1. Style, pitch, settings

**Signal Line**: *the system drawn as a public-transport object: an enamel route map in a steel frame, a backlit display, one quiet commuter.*

**Serves:** board meetings, operations and performance reviews, government and public-sector briefings, infrastructure, logistics and platform talks. It also suits any audience that needs to *trust* a mechanism before it accepts a number. The world says "engineered, maintained, accountable" without a single stock photo or KPI card.

**Wrong for:** children's lessons or anything that should feel playful (use a warmer, illustrated world). It is also wrong for brand launches whose own visual identity must dominate. It suits subjects that have no flow, sequence or network at all poorly, because the route line is the metaphor engine. Avoid it if the audience is literally a transit agency that might read the generic roundel as a mimicry of its own mark; recolour the roundel and the problem goes away.

## 2. World bible

### Palette tokens (all in `kit.js` as `SignalLine.C`)

| Token | Hex | Meaning |
|---|---|---|
| `route` / `routeBright` | #11775d / #2fa483 | **The system itself**: the line, the stop marks, the rider's cap and scarf (the rider belongs to the line) |
| `busA` / `busATint` | #e8a032 / #ffc062 | **Ours**: the subject actor (Bus A, the late one) and every reading about it |
| `busB` / `busBTint` | #2b5ca6 / #93b8f6 | **Theirs / counterpart**: the second actor (Bus B, the early one) |
| `bandA`, `bandB` | #f2c46e, #a7c0e8 | Map highlight bands that echo the gauge segments. Labels always sit next to them, so colour is never the only cue |
| `alarm` / `alarmTint` | #c0342a / #ff7a6b | **Alarm**: the feedback loop, the bad number, the stamp, the HOLD bars. Used sparingly |
| `ink`, `inkSoft` | #161b20, #4a545e | Text on enamel; `inkSoft` also marks the *before* value (5.0) |
| `enamel`, `paper` | #eee7d8, #f2ede3 | Sign faces, the map, tag plate; the rider's body |
| `wall`, `steel*`, `display` | #242a31, greys, #0c1115 | The physical housing: shelter wall, frames, screws, backlit display face |
| `sky*`, `city*`, `road`, `pavement` | dusk blues, asphalt | Location only. Never carry data |

Contrast checked: ink on enamel ≈ 14:1, inkSoft on enamel ≈ 6.9:1, gauge tints on display ≥ 8:1, alarm red on enamel ≈ 5.3:1, source line #c9d1d8 on pavement ≈ 7:1.

### Typography
Inter only (OFL, `fonts/`, latin plus a greek subset for Σ via `unicode-range`), with tabular figures on.
- Tag: 46 px, weight 700, sentence case.
- Labels: 28–30 px, weight 700/800, UPPERCASE, tracked +2.
- Gauge numerals: 116 px weight 800 with a soft backlit glow.
- Reveal: 210 px weight 800 on the lightbox.
- Small print: 22 px weight 500.

Arrows are **drawn**, never typed: `→` is not in Inter's latin subset.

### Character: the Rider
A signage-pictogram commuter: capsule coat, a round head with **one eye dot**, a green flat cap, a green scarf and a slate satchel. The limbs are jointed (`RIDER_POSES`), so poses morph rather than swap, and the legs stride automatically whenever the rider travels. Poses:
- `wait`
- `look` (calm, studying the map)
- `shrug` (forearms out: "three at once?")
- `watch` (wrist raised, head down; a watch appears)
- `alarm` (lean back, hands to head)
- `point` (one arm up at the thing that matters)

An enamel disc badge (`?`, `!`) floats behind the head for the two emotional peaks. Idle life: a blink every ~4 s.

### Recurring props and locations
- **Shelter**: canopy lightbox, posts, seamed wall and bench.
- **Enamel route map** (`enamelPanel`), with a 45° `chamferLoop`, outward `stationTick`s and an `interchange` ring for "this stop".
- **Magnet tokens** (`busToken`) that travel *along* the line.
- **Backlit display** (`displayHousing`) and the split-rail `gapGauge`.
- **Pictogram crowd**.
- **Timing post** with an enamel instruction plate.
- **Street**: municipal buses, a block skyline with sparse lit windows, and the road.

Locations change by moving one camera (street, then map, then street); the style never changes.

### Fixed chrome
- **Headline tag**: a station-name plate top-left (cream enamel, green rule on the left, two screws). Its width animates to fit the new text, and it is the only sentence-like text on screen.
- **Stamp**: a red-bordered enamel plate top-right (`ILLUSTRATIVE`; use `PAPER RESULT`, `OUR DATA` or `SCHEMATIC` for other talks).
- **Source line**: 22 px engraved-grey text bottom-left on the pavement.
- **Title card**: a big two-line Inter 800 title over the dusk sky with a roundel and route rule. The shelter, the rider and the bunched buses make up the establishing shot.

## 3. How another talk uses this world

**(a) Quarterly business review: "why churn spiked in Q3".**
- **Scaffold:** the customer journey is a line on the enamel map (Trial → Onboard → Active → Renew), with stations as stages. Customer cohorts are magnet tokens, and the display reads `RETAINED 82% / LOST 18%` on the split rail (always summing to 100%).
- **Click by click:** one station gets a crowd (a support backlog), then the cohort token stalls there and the rail slides.
- **Labelled metaphor:** a red inner loop with the stations `SLOW SUPPORT → ANGRY TICKETS → MORE ESCALATIONS → SLOWER SUPPORT`.
- **Reveal:** on the lightbox: `CHURN 6% → 11%`.
- **Fix hint:** a timing-post plate reading `TRIAGE BEFORE ESCALATION`.

**(b) Research result: "retrieval improves recall only on long queries".**
- **Scaffold:** the pipeline is a line (Query → Retrieve → Rerank → Answer), with one token per query-length bucket.
- **Gauge:** the display reads `WITHOUT 61% / WITH 74%` as two backlit readouts, each on its own 0–100% rail. Use the single split rail only when the two parts truly sum to a fixed total.
- **Labelled metaphor:** a branch line splits off at Retrieve and is labelled `SHORT QUERY = SKIP STOP`. The stamp switches to `OUR DATA` and the source line names the eval set and n.
- **Reveal:** on the lightbox: `RECALL 61% → 74% (n = 1,200)`.

**(c) Class lesson: "how a bill becomes law".**
- **Scaffold:** the line runs House → Committee → Floor → Senate → President, and the bill is a token. The display counts votes as `YES 52 / NO 48` on a fixed 100-seat rail.
- **The rider is the student:** `look` at the start, `watch` at the committee delay, `point` at the end.
- **Labelled metaphor:** a red loop for the conference committee: `HOUSE TEXT → SENATE TEXT → CONFERENCE → NEW TEXT`.
- **Bookend:** the opening street returns with the lightbox reading `LAW`.

## 4. Motion language and signature transition
- **Signature: the dolly-in.** One camera transform (`cam.s`, `cam.x`, `cam.y`) glides from the street to the shelter map over 1.1 s (ease in-out cubic) and back out for the reveal. The rider walks with the camera, and their stride is driven by distance travelled.
- **Tokens travel along the line.** They never move in a straight line: their position is a loop fraction `t`, tweened and then resolved with `getPointAtLength`. The gauge is *computed from the token positions*, so its numerals count up (10 → 12 → 19) in lockstep with the map.
- **One thing at a time.** Each state lists per-key delays: the camera first, then tokens, then bands, then display power. Likewise the crowd arrives one figure after another, and the feedback loop draws its line, then arrowheads, then each station label in order, then FEEDBACK LOOP.
- **Tag plate:** the old text fades (120 ms), then the plate resizes while the new text fades in (320 ms).
- **Going back** uses the same targets with no delays and 700 ms. **Reduced motion** (`M`, or the OS setting) jumps instantly and stops the blink. The only idle life is the blink.

## 5. PPTX plan
| Layer | Export | Morph name |
|---|---|---|
| Sky, skyline, road, shelter (wall, posts, lightbox frame), bench | One **picture** (PNG at 2×) per camera framing: a street-wide plate and a map-close plate. A cross-fade between them stands in for the dolly; optionally put the street plate in one big picture and Morph its size and position | `!!world` |
| Enamel map panel and route line | Picture (grain and sheen do not survive as native shapes). Station ticks are baked in | `!!map` |
| Gap bands | One picture per state (dash offsets cannot morph); cross-fade | `!!bands` |
| Bus tokens | **Native** rounded rectangle plus text "A"/"B" (and a small bus icon picture) | `!!busA`, `!!busB` |
| Gauge readouts | **Native text** boxes (Inter 800) over the display picture | `!!gapFront`, `!!gapBehind` |
| Gauge rail fills and needle | Native rectangles | `!!railA`, `!!railB`, `!!needle` |
| Crowd | Native group of pictogram shapes; appears by fade | `!!crowd` |
| Feedback loop | Native arc (red, 16 pt) plus four native text labels plus arrowhead triangles | `!!loop`, `!!loopLabels` |
| Rider | One picture **per pose**, at the same size and anchor | `!!rider` (Morph moves it; the pose change is a cross-fade) |
| Tag, stamp, source, title, reveal number, HOLD plate | **Native text** in native rounded rectangles | `!!tag`, `!!stamp`, `!!source`, `!!reveal`, `!!hold` |
| Speaker notes | Native notes, copied verbatim | — |

**Lost in PowerPoint:**
- Tokens moving *along* the octagon: Morph interpolates straight lines, so B would cut across the map interior between states 2 and 3. You can split the move into an extra corner state or accept the cut.
- Count-up numerals: Morph swaps the text instead.
- The jointed pose blend and the walking stride.
- Staggered label entrances, unless each label is its own fade animation.
- The blink, enamel grain and backlit glow as live effects (they are baked into the pictures).

Embed Inter or install it on the presenting machine; otherwise PowerPoint substitutes a font and the plate widths break.

## 6. One-shot authoring recipe
1. **Lock the content first:** the exact tags, the numbers and their denominators, the stamp text and the source line. Decide the *system* that becomes the line, the 1–2 actors that become tokens, the one reading that becomes the gauge (pick a quantity with a fixed total, so the split rail is honest), and the one bad number for the lightbox.
2. **Build the world in camera space:** design the close-up (map plus display plus rider) at identity scale on the 1920×1080 grid, then build the street around it with the shelter at x 0–1920. Pick one wide camera (s ≈ 0.5) for the title and one (s ≈ 0.56) for the reveal. Keep the tag zone (56–960 × 40–124) and the source zone (y > 1030) clear in every framing.
3. **Give every actor a parameter, not coordinates.** Tokens get `t` along the route; the gauge reads `t`; text never stores state. This makes the map and the gauge agree by construction.
4. **Write states as flat value maps that inherit from the previous state**, plus a per-state timing table (delay, dur, ease, bump). Only the tag, badge glyph and notes are discrete.
5. **`goTo` must return nothing.** The renderer `await`s `page.evaluate`, so a returned Promise makes every midframe look finished.
6. **Draw arrows as paths; load the greek subset for Σ;** call `loadFonts()` before measuring any text, because the tag plate width, the reveal centring and the timing plate all use `getComputedTextLength`.
7. **Use contrast for staging:** the cream rider must stand against the dark wall or the sky, never in front of the cream enamel. Badges go *behind* the head, away from housings.
8. **Render, then check:** labels ≥ 28 px at final scale (the display title and axis numbers started at 22 px and had to grow). Look for SVG paint-order mistakes, and for anything translucent on asphalt; it reads as a grey smudge.

**Pitfalls actually hit while building this candidate:**
- Every midframe showed the final state, because `goTo` returned the tween Promise.
- The tag plate showed as an empty cream bar on the title card, because `current = null` equalled the first `set(null)` call and returned early.
- The gauge rail fills were invisible: the rail background was appended after the lit group, which put it on top.
- 124 px numerals plus units collided across the 540 px display ("10min 10min"). The fix was 116 px plus a centre divider.
- Low-opacity headlight cones and glows read as grey triangles and smudges on the dark road. They were removed.
- White stroke chevrons on the thin red loop read as corner brackets. The fix was filled arrowheads with an enamel outline.
- The "!" badge first collided with the display housing. It now sits behind the head.
- A 12 px sliver of the lit lightbox showed at the top of the close-up and looked like a glitch. The fix was moving the wall's top edge to y 0.
- The crowd first sat outside the loop, on top of Bus A. It moved inside the loop, which made it rhyme with the later `MORE RIDERS` label.
