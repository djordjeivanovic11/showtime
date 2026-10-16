# Pixel Quest: self-review

Scores are 1–5, judged from the final `renders/state-0N.png` and `mid-0N.png`.

| Criterion | Score | Reason |
|---|---|---|
| First-glance story clarity | 5 | Three buses nose to tail under the title, then a live map with two lettered buses and a 20-cell gauge. You can follow 10/10 → 12/8 → 19/1 with the sound off. |
| World or template? | 5 | Every state is a place (a night street, the shelter's own lightbox up close). The scaffold is a real object in that place, and the reveal is a rooftop marquee. |
| Character warmth/usefulness | 4 | Pip reads clearly and changes silhouette per beat (point, watch with foot tap, alarmed with the beanie hopping off, hold with a paddle). It is still small on the street shots. |
| Scaffold persistence | 5 | Route, buses, gauge and Pip keep their ids. The buses drive along the road (corners included), and the gauge cells and numbers count frame by frame. |
| Legibility at distance | 4 | Tag 40 px, numbers 64–96 px, labels 32 px, source 34 px, all on dark panels. The 1-minute gap cell and the riders are small, but they are backed by the "1 min" number. |
| Polish/craft | 4 | Clean pixel grammar, consistent ink outlines, a crisp Map Dive. Lower-left of state 4 is busy (bus A partly behind the shelter lightbox). |
| Setting fit | 5 | Right for classes, meetups and playful internal talks. Wrong for boards, by design. |
| One-shot reliability | 3 | Needed four render rounds. The kit now absorbs most traps (glyphs, swap tags, camera maths, param tweens), but hand-placing props in logical px still needs one look at the renders. |
| PPTX feasibility | 3 | Layers map cleanly to named pictures for Morph. Curved bus paths, counting numbers and the opaque window dive degrade to straight Morphs and fades. |

## Three weakest things in the final renders

1. **State 4's lower-left is crowded.** Bus A sits behind the shelter and its
   lightbox, with the pole, Pip and the paddle all in about 200 px. With more
   time I would move the stop pole to the right of bus B and let bus A pull
   half out of frame on the left.
2. **On the street, Pip is the right size for the world but small for the back
   row** (about 190 px tall). With more time I would use a slightly lower
   camera on the street, with a bigger shelter, bigger Pip and a smaller
   skyline, so the hero and the bookend read from further away.
3. **The map's centre is quiet in states 1–2 and the riders are tiny.** I would
   draw the crowded stop as a small "zoom bubble" callout (a magnified stop
   with 8–10 bigger riders) attached to the stop, and dim the map blocks
   further once the roundabout appears in state 3.

Also unverified: no PPTX was exported for this candidate, and PowerPoint
behaviour is only planned in DESIGN.md §5.
