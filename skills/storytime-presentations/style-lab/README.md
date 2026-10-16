# Style lab: one explanation in seven worlds

Open the [visual gallery](gallery.html) to compare the six chosen alternatives
with Pixel Quest. Each candidate is a **five-state illustrated HTML talk** with
an original character or object hero, a recurring route and gauge, and a
speaker-controlled progression. Open a candidate's `index.html` locally and
use the arrow keys; press **N** for notes and **M** for reduced motion.

## The controlled comparison

The [brief](BRIEF.md) holds the story, tags, narration, numbers, and 1920 × 1080
canvas fixed. The fictional two-bus loop begins with 10/10-minute gaps, shifts
to 12/8, then bunches to 19/1. With riders arriving at random, the example's
average wait rises from 5.0 to 9.1 minutes. Every state is marked
**ILLUSTRATIVE**. The opening image of three arriving buses is an anecdotal
hook; the mechanism uses two buses. The final "hold the early bus" sign is a
possible intervention, not an effect measured in this five-state example.

Twelve candidates were completed and visually reviewed; the six alternatives below were
chosen for distinct audiences and strong storytelling, not by an objective
user-study score. Each needed multiple render-and-revision rounds, so this lab
does not prove that any style works perfectly in one attempt.

| World | Natural room | What the world makes clear | Check before use |
| --- | --- | --- | --- |
| [Paper Diorama](candidates/paper-diorama/index.html) | Education and public talks | A tactile place, countable buses, friendly guide, clear wait reveal | Confirm the room welcomes a warm illustration |
| [Signal Line](candidates/signal-line/index.html) | Corporate and operations | Route, gaps, and consequence are large and direct | Final bus-holding cue is conceptual |
| [Editorial Ink](candidates/editorial-ink/index.html) | Policy and evidence stories | A human view beside documentary-style numbers | Check crowded labels on the 19/1 state |
| [Blueprint Atlas](candidates/blueprint-atlas/index.html) | Research and engineering | Spatial mechanism and exact values in a technical plan | Check route and riders from the back row |
| [Living Proof](candidates/math-workbench/index.html) | Mathematical and technical teaching | Gap arcs unroll into waiting-time triangles, then into the mean-wait equation | Explain why triangle area gives mean wait; PPTX motion is untested |
| [Cinema](candidates/cinema/index.html) | Large-stage keynote | Emotional stakes and a large numerical turn | Test dark scenes on the actual projector |
| [Pixel Quest](candidates/pixel-quest/index.html) | Playful research and teaching | A clear visual quest through the same mechanism | Check pixel text at distance |

Each candidate has its own `renders/contact.png`,
`DESIGN.md` (its reusable visual grammar), `REVIEW.md` (its candid self-review),
`kit.js` (drawing components), and `deck.js` (this particular story). The other
finished experiments are retained locally for further exploration, including
the quieter [Annual Report](candidates/annual-report/renders/contact.png)
variant. The
[earlier infographic approach](reference/failed-infographic-attempt.png) is
kept as a comparison of what did **not** satisfy the one-world brief.

## Using a world for a different talk

Start from its `DESIGN.md`, then choose a mechanism in the new material that
can live in that world. Keep the character or tracked object, visual grammar,
tag position, source stamp, and motion language. Redraw data from the new
source; do not carry over bus numbers or the proposed fix. Test the hardest
technical beat and a reveal state before creating the rest of the talk.

These demos run on standalone HTML players. The separate
[export engine](../engine/README.md) accepts `Storytime.deck` layers and **does
not directly load candidate `deck.js` files**. To make a PowerPoint in a chosen
world, adapt its components into engine layers with stable IDs and inspect the
resulting PPTX. A separate
[Paper Diorama engine demo](../engine/examples/paper-diorama-demo/README.md)
shows that adaptation through five states; its PPTX, PDF, and offline HTML have
passed automated export checks. Live PowerPoint Morph playback has not been
observed.
