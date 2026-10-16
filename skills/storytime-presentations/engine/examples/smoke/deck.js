// Smoke deck: 4 states. Persistent "bus-a" moves and changes colour, the
// "label" text changes, "route" enters with a drawn line, chrome on every
// state, and native-text fields on the label for --native-text.
const label = (text) => ({
  id: "label",
  kind: "text",
  x: 1180,
  y: 760,
  w: 640,
  h: 64,
  html: `<div class="smk-label">${text}</div>`,
  text,
  font: { family: "Patrick Hand", size: 44, color: "#22252b" },
});
const SOURCE = "illustrative scenario · 2 buses, 8 stops, 20-minute loop";

Storytime.deck({
  title: "Why do buses come in bunches?",
  wpm: 130,
  targetSeconds: 40,
  background: "#f6f1e7",
  chrome: kit.chrome,
  states: [
    {
      id: "s1-title",
      kind: "title",
      stamp: "ILLUSTRATIVE",
      source: SOURCE,
      transition: "fade",
      notes: {
        say: "You wait twenty minutes for a bus, and then two arrive at once. Why?",
        cue: "Click after 'Why?'",
      },
      layers: [
        { id: "paper", x: 0, y: 0, w: 1920, h: 1080, svg: kit.paper() },
        {
          id: "title",
          kind: "text",
          x: 160,
          y: 330,
          w: 1500,
          h: 140,
          html: '<div class="smk-title">Why do buses come in bunches?</div>',
          alt: "Why do buses come in bunches?",
        },
        { id: "bus-a", x: 160, y: 560, w: 260, h: 143, svg: kit.bus() },
      ],
    },
    {
      id: "s2-route",
      tag: "every 10 minutes, on paper",
      stamp: "ILLUSTRATIVE",
      source: SOURCE,
      notes: {
        say: "On paper, two buses share one loop, ten minutes apart.",
        cue: "Click after 'ten minutes apart.'",
        plain: "The timetable spaces buses evenly.",
      },
      layers: [
        { id: "paper", x: 0, y: 0, w: 1920, h: 1080, svg: kit.paper() },
        { id: "route", x: 260, y: 220, w: 1400, h: 600, svg: kit.route(), enter: "draw", alt: "A loop route with four stops" },
        { id: "bus-a", x: 250, y: 400, w: 200, h: 110, svg: kit.bus() },
        label("BUS A · ON TIME"),
      ],
    },
    {
      id: "s3-late",
      tag: "one bus runs late",
      stamp: "ILLUSTRATIVE",
      source: SOURCE,
      notes: {
        say: "Bus A falls a little behind, so more riders are waiting at each stop.",
        cue: "Click after 'each stop.'",
        detail: "Dwell time grows with the number of boarding riders.",
      },
      layers: [
        { id: "paper", x: 0, y: 0, w: 1920, h: 1080, svg: kit.paper() },
        { id: "route", x: 260, y: 220, w: 1400, h: 600, svg: kit.route() },
        { id: "bus-a", x: 860, y: 240, w: 200, h: 110, svg: kit.bus({ pose: "late" }), rotate: 4 },
        label("BUS A · LATE"),
      ],
    },
    {
      id: "s4-bunch",
      tag: "late bus gets later",
      stamp: "ILLUSTRATIVE",
      source: SOURCE,
      notes: {
        say: "More riders means longer stops, so the late bus gets later and the next bus catches up.",
        cue: "End of smoke deck.",
      },
      layers: [
        { id: "paper", x: 0, y: 0, w: 1920, h: 1080, svg: kit.paper() },
        { id: "route", x: 260, y: 220, w: 1400, h: 600, svg: kit.route() },
        { id: "bus-b", x: 1240, y: 360, w: 200, h: 110, svg: kit.bus(), enter: "slide-left" },
        { id: "bus-a", x: 1430, y: 440, w: 200, h: 110, svg: kit.bus({ pose: "bunched" }) },
        label("LATE BUS → MORE RIDERS"),
      ],
    },
  ],
});
