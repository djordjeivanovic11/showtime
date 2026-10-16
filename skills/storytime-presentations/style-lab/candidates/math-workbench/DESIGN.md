# Living Proof

**Pitch:** An illustrated mathematics table where an audience watches a physical
system become a geometric proof. The proof is discovered through motion, not
presented as a finished slide of equations.

**Best rooms:** mathematics and computer-science classrooms, quantitative
research talks, product or policy briefings where an equation must be made
intuitive. It is too playful for a solemn memorial or a legal filing, and it
would slow down a meeting that only needs a decision and one number.

## World bible

The whole talk lives on one warm drafting sheet inside a darker desk. A circular
bus route is pinned on the left. A sheet of translucent graph paper unfolds the
same 20-minute loop into a straight time axis on the right. Nothing is a
PowerPoint card. The gap lengths are physically visible both as colored arcs
around the route and as widths of two waiting-time triangles.

| Token | Hex | Meaning |
| --- | --- | --- |
| paper | `#f5f2e9` | Main explanatory surface |
| ink | `#18313b` | Claims, axes, outlines |
| muted | `#4b6167` | Secondary annotations and source |
| rust | `#a44939` | The growing gap and delay mechanism |
| blue | `#1e687d` | The shrinking gap and second bus |
| amber | `#dd9e44` | Attention, open question, original third bus |
| fix | `#296b5d` | Intervention, separate from observation |

Typography is locally bundled Inter, including its Greek subset for `Σ`. The
headline tag is a navy clipped-paper strip in the same upper-left position on
every explanatory state. The `ILLUSTRATIVE` stamp remains in the upper-right;
the source and random-arrival assumption stay along the lower edge. The title
card uses the same desk, route, stop, and character as the ending.

The recurring researcher wears an amber cap and blue coat. Their face changes
from worried to curious, annoyed, startled, then relieved. They wait by Stop 1.
The bus markers, route, character, gap arcs, graph sheet, and gauge retain stable
element IDs across all states. Three buses appear only in the opening anecdote;
the two-bus model begins on the second state.

The exact geometric kernel is: for a gap of length `g`, a rider arriving at time
`t` within it waits `g − t`. Unrolling that gap gives a right triangle with
width and height `g`; its area is `g²/2`. Over the fixed 20-minute cycle, the
mean wait is `(g₁² + g₂²)/(2 × 20)`. Thus `10/10 → 5.0`, `12/8 → 5.2`, and
`19/1 → 9.05`, rounded on the slide to `9.1` minutes. The final equation comes
*after* the audience has seen the first triangle grow.

## Reuse in another talk

- **Quarterly business review:** Draw a customer journey around the same table;
  unroll each stage into a time or cost strip. The recurring analyst moves a
  physical weight to show which stage dominates total latency.
- **Research result:** Show a specimen being sampled, then unroll samples into
  distributions; let an area, slope, or uncertainty band visibly change before
  naming the statistic.
- **Class lesson:** Turn a water tank or queue into a rate-versus-time diagram.
  Let the learner character point at a shaded area, then reveal its integral.

The reusable grammar is `real mechanism → unrolled representation → shaded
quantity → equation → practical consequence`. It must be adapted to a subject's
actual math; the bus triangles are not a universal shape.

## Motion language

The persistent buses travel along the same circular route as the gap arcs stretch.
On the tracing sheet, the boundary between the two triangles slides while one
area grows and the other shrinks. The source and chart scaffold stay fixed.
An 850 ms eased transition gives enough time to see causality without turning
the talk into a looping animation. `M` toggles reduced motion. The signature
transition is the 12/8 to 19/1 stretch: the long arc almost closes around the
route while its waiting triangle becomes dominant. The HTML currently fades the
graph sheet into view; it does not literally peel a route arc off the circle.

## PowerPoint plan

For a PPTX version, export the sheet/grid as one SVG picture layer, keep the
headline, stamp, graph labels, source, and equation as native text where the
presenting machine has Inter, and use separate SVG layers for route, buses,
character, gauge, arcs, and triangles. Give stable Morph names such as
`!!route`, `!!bus-A`, `!!bus-B`, `!!researcher`, `!!long-gap-arc`,
`!!wait-triangle-a`, and `!!wait-triangle-b`. PowerPoint Morph may interpolate
position and size of these layers, but arbitrary SVG path interpolation and the
HTML's exact timing are not guaranteed. A single flattened slide image is a
reliable visual fallback but sacrifices object editability and motion. This
candidate has **not** been exported to or live-tested in PowerPoint.

## One-shot authoring recipe

1. Ask who needs to learn which quantity, and what they can already picture.
2. Identify one mechanism that can remain visible for the whole explanation.
3. Choose a second representation that reveals a hidden quantity, such as an
   unrolled route becoming a time axis.
4. Fix source status, units, assumptions, and exact numbers before drawing.
5. Sketch the physical world and reserve empty space for the mathematical view.
6. Build both views from the same state variables; here the single `gap` value
   controls bus position, colored arcs, gauge split, triangle widths and heights,
   and numeric labels.
7. Reveal the equation only after the geometric quantity is visible.
8. Render all static states and transition midframes. Check text collisions,
   arithmetic at the endpoints, and that labels remain truthful in motion.
9. Provide a reduced-motion/static path and identify whether the requested
   export preserves native objects or only pictures.

Actual pitfalls: the first iteration let the character's feet obscure a gauge
heading; moving that heading above the gauge put it over a route arc. The final
solution put the route facts in the empty center of the loop. An early feedback
loop also sat too close to the footer; shrinking it rather than moving it as a
whole avoided colliding with the graph's own annotation. Midframe labels were
initially frozen while triangles moved; they now recalculate from the animated
gap value.
