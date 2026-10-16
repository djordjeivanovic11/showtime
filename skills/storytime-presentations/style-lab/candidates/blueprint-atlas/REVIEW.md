# Blueprint Atlas — self-review

Renders: `renders/state-00..04.png`, `renders/mid-01..04.png`, `renders/contact.png`.
Renderer ran clean (no page or console errors); keyboard nav, `N` notes,
`M` reduced motion and backward navigation were also checked in a browser run.

| criterion | score | reason |
|---|---|---|
| First-glance story clarity | 4 | Title close-up → whole loop → detail → loop of arrows → number reads in order; the plan in states 2–3 is smaller than I'd like at the back of a room. |
| World or template? | 4 | One drawing sheet with a camera, a town plan, a person standing in it; the title block and caliper are drafted objects, not cards. The inset panel is the most "slide-like" element. |
| Character warmth / usefulness | 3 | Surveyor's poses read well up close (peer, present) and alarm reads in plan; the check-watch pose is small at plan scale and the face is minimal by design. |
| Scaffold persistence | 5 | Route, both buses, gauge and character are the same `<g id>` throughout; buses travel along the road, the slider slides, the camera zooms. |
| Legibility at distance | 4 | Tag 52 px, labels ≥ 28 px, gauge values 46 px, reveal 220 px, small print 21 px with ≥ 5.9:1 contrast; rider figures and bus roof letters are small in plan views. |
| Polish / craft | 4 | Consistent linework, hatching, knockouts and instruments; a few overlaps remain (shelter over Bus B in state 3, wristwatch over the glasses in the peer pose). |
| Setting fit | 5 | Feels right for a thesis defense or design review: rigorous, quiet, numerically honest, still a story. |
| One-shot reliability | 3 | The kit makes it repeatable, but getting the layout right took 6 render rounds (glyph coverage, bubble placement, crowded-stop visibility, motion physics). |
| PPTX feasibility | 3 | Chrome, tag, gauge and labels export natively with `!!` names; curved bus travel, constant-width zoom and the ring draw-on degrade to Morph straight lines. |

## Three weakest things in the final renders

1. **Plan scale in states 2–3.** The loop is about 960 px wide next to the
   inset, so riders (~55 px) and roof letters are small for a back row. With
   more time: give the plan more width by putting the gauge *inside* the loop
   interior, or let the inset slide in over the plan only during state 2–3.
2. **The crowded stop on the plan is still a small cluster.** The inset carries
   the beat, but the plan-level change is subtle. I'd draw the queue as a long
   hatched line of riders spilling along the kerb with a count bubble `6`.
3. **The Surveyor has little to do in states 1–2.** The reactions exist but are
   small; more time would add a second plan-scale prop (a clipboard log of gaps
   that fills in per click) and make the check-watch pose bigger (lean + head
   tilt), plus hide the wristwatch when the hand is at the brow.
