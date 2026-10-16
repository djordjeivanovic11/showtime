// Starter deck: three states showing a persistent object, a changing label,
// a hand-drawn line, and the chrome. Replace with your story.
const BACKDROP = `<svg viewBox="0 0 1920 1080" preserveAspectRatio="none">
  <rect width="1920" height="1080" fill="#1b1838"/>
  <rect y="760" width="1920" height="320" fill="#2c2a5a"/>
</svg>`;

Storytime.deck({
  title: "Starter deck",
  wpm: 130,
  targetSeconds: 30,
  background: "#1b1838",
  chrome: kit.chrome,
  states: [
    {
      id: "title",
      kind: "title",
      stamp: "ILLUSTRATIVE",
      source: "illustrative starter deck",
      transition: "fade",
      notes: { say: "This is a starter deck with one object that will move.", cue: "Click after 'will move.'" },
      layers: [
        { id: "backdrop", x: 0, y: 0, w: 1920, h: 1080, svg: BACKDROP },
        { id: "title", kind: "text", x: 160, y: 360, w: 1400, h: 240, html: '<div class="kit-title">A starter story</div>' },
        { id: "dot", x: 1500, y: 640, w: 160, h: 160, svg: kit.dot() },
      ],
    },
    {
      id: "move",
      tag: "the dot moves",
      stamp: "ILLUSTRATIVE",
      source: "illustrative starter deck",
      notes: { say: "Same id, new position: the dot slides instead of reappearing.", cue: "Click after 'reappearing.'" },
      layers: [
        { id: "backdrop", x: 0, y: 0, w: 1920, h: 1080, svg: BACKDROP },
        { id: "dot", x: 400, y: 600, w: 160, h: 160, svg: kit.dot() },
        { id: "label", kind: "text", x: 600, y: 640, w: 700, h: 64, html: '<div class="kit-label">SAME OBJECT, NEW PLACE</div>' },
      ],
    },
    {
      id: "change",
      tag: "then it changes colour",
      stamp: "ILLUSTRATIVE",
      source: "illustrative starter deck",
      notes: { say: "New content in the same box crossfades, and a line draws itself in.", cue: "End of demo." },
      layers: [
        { id: "backdrop", x: 0, y: 0, w: 1920, h: 1080, svg: BACKDROP },
        {
          id: "trail", x: 560, y: 560, w: 900, h: 240, enter: "draw",
          svg: `<svg viewBox="0 0 900 240"><path class="st-draw" d="M10 200 C 250 20, 600 20, 890 160" fill="none" stroke="#ffd447" stroke-width="10" stroke-linecap="round"/></svg>`,
        },
        { id: "dot", x: 1400, y: 640, w: 160, h: 160, svg: kit.dot({ color: "#ff6b6b" }) },
        { id: "label", kind: "text", x: 600, y: 840, w: 700, h: 64, html: '<div class="kit-label">SAME OBJECT, NEW LOOK</div>' },
      ],
    },
  ],
});
