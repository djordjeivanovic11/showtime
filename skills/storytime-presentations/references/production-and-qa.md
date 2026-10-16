# Production and quality checks

## Route from requested deliverable

- **PowerPoint:** build a PPTX with editable text and important simple diagrams
  where practical. The optional engine exports separate picture layers for
  Morph, but flattens text to pictures by default; its `--native-text` mode
  requires installed fonts and manual layout inspection. If custom motion is
  required, prototype a short sequence and test it in PowerPoint; HTML/CSS motion
  does not automatically export. Add plain-language speaker notes.
- **Google Slides:** work in a native deck when connected tools allow it. Check
  that editability, fonts, notes, and the exported backup survive.
- **Browser talk:** provide keyboard navigation, deterministic states, backward
  navigation, offline assets, and a reduced-motion path. Also provide a static
  backup if the talk depends on it.
- **PDF:** make every page self-contained and readable. A PDF is a static
  fallback, not evidence that animations or builds work.

When the format is unspecified, choose an editable presentation and a static PDF
backup if available; state the choice. Do not build two full authoring pipelines
unless the user needs both. Never spend substantial money, upload private
materials, publish, or send a deck to others without the relevant authorization.

## The small prototype

Before building dozens of slides, check a representative explanation with a
setup, change, and result. Include one difficult chart, diagram, or repeated
object, real typography, evidence label, and speaker notes. In one-shot mode,
review it yourself and proceed; in collaborative mode, ask for feedback only
when a consequential direction remains undecided. Keep source and output linked
so an edit to a number or script updates all relevant states.

## Notes that a person can present

Good notes contain the words a presenter can say, with a click cue when needed:

> We start with 100 requests. Follow the path to review: 78 arrive, while 22
> stop before that gate. Click when you say "before that gate." The 70 resolved
> cases are 70 of the original 100, or 70 of the 78 that reached review. The
> point is that changing the review team cannot fix the 22 requests it never
> received. These are invented numbers for this visual demo.

Do not use shorthand such as "source-disjoint onset / a2 provisional" in notes.
Define a term once, then reuse it consistently. Put optional technical detail
after the spoken paragraph, under a clear heading, rather than inside it. Avoid
internal paths and production jargon in what the presenter reads aloud.

## Final inspection

1. **Truth:** compare every visible and spoken number, label, quote, unit,
   denominator, source, and uncertainty against the source material. Mark
   synthetic content conspicuously.
2. **Story:** ask whether each state advances the argument and whether the ending
   answers the opening question. Cut beautiful scenes that do not explain.
3. **Readability:** inspect all slides at presentation size and as a contact
   sheet. Check hierarchy, contrast, text size, safe margins, color-blind-safe
   encodings, and whether a back-row viewer can find the takeaway.
4. **Accessibility:** add alt text or a textual equivalent where the target
   format supports it. Do not encode meaning by color alone. Ensure that a
   static or reduced-motion version conveys every essential fact.
5. **Delivery:** reopen the exact final file. Test notes, fonts, equations,
   figures, transitions, media, and offline behavior in the target application
   when available. Distinguish package integrity, static rendering, and actual
   live playback.
6. **Timing:** read the script aloud when possible. Otherwise use a clearly
   labeled estimate from word count plus pauses and visual inspection time;
   leave a buffer rather than claiming false precision.

Keep a concise validation note with what was actually tested and what remains
untested. If a static fallback differs from the editable version, identify the
difference. Do not discard the editable source after export.
