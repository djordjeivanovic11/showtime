# Living Proof: self-review

This review is of the final five-state offline HTML candidate, not a PPTX.
All five states and four 350 ms midframes were rendered locally. The candidate
went through four render/inspect/repair passes.

| Criterion | Score | Reason |
| --- | ---: | --- |
| First-glance story clarity | 4/5 | Route, buses, gap arcs, and changing triangles are linked by color and position. |
| World rather than template | 4/5 | It is one continuous drafting table; the graph sheet is a physical object in that world. |
| Character warmth/usefulness | 3/5 | Expressions guide attention, but the small researcher does not carry the whole proof. |
| Scaffold persistence | 5/5 | The same route, bus groups, character, gauge, and graph stay in place while geometry changes. |
| Legibility at distance | 4/5 | Headline and results are large; graph/source detail needs a nearer seat. |
| Polish/craft | 4/5 | Restrained paper/grid/ink system and carefully animated geometry; background could have more material depth. |
| Setting fit | 4/5 | Strong for quantitative teaching; less suitable for serious nontechnical hearings. |
| One-shot reliability | 3/5 | The central proof was straightforward, but three rounds of overlap and midframe repairs were needed. |
| PPTX feasibility | 3/5 | Layer IDs provide a path to Morph, but SVG path interpolation and a live PPTX export remain untested. |

## Three weakest things

1. **The connection between the circular gap and the waiting triangle still
   needs spoken explanation.** The chart is titled “unroll the loop into time,”
   but it does not show the arc physically straightening. With more time, add
   a short projection ribbon from each arc to its matching triangle.
2. **The small `1 min` triangle is hard to see from the back of the room.** Its
   exact smallness is the mathematical point, so enlarging it would lie. Add an
   outlined magnifier or a dashed callout without altering its scale.
3. **This standalone candidate has not been proven as a PowerPoint.** Build a
   layered PPTX, inspect the native text/layers, and watch Morph in live show
   mode before claiming parity with the HTML animation.

The scenario numbers are illustrative, not observations of a real bus network.
The graph assumes riders arrive uniformly at random and does not model time
varying demand, road conditions, or a live holding policy.
