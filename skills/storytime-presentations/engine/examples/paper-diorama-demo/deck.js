/* A five-state Paper Diorama example using the reusable Storytime engine. */
(() => {
  "use strict";

  const SOURCE = "Illustrative model · 2 buses, 8 stops, 20-minute loop · random arrivals";
  const world = kit.world();
  const busA = kit.bus("A");
  const busB = kit.bus("B");
  const stop = kit.stop();

  const scenery = () => ({
    id: "paper-world",
    x: 0, y: 0, w: 1920, h: 1080,
    svg: world,
    small: true, // Numbered stop flags are scene details, not spoken text.
    alt: "A cut-paper town with a circular eight-stop bus route",
  });
  const bus = (letter, x, y) => ({
    id: `bus-${letter.toLowerCase()}`,
    x, y, w: 250, h: 150,
    svg: letter === "A" ? busA : busB,
    alt: `Paper bus ${letter} on the loop`,
  });
  const stopLayer = () => ({
    id: "stop-pole",
    x: 1420, y: 738, w: 180, h: 290,
    svg: stop,
    alt: "Paper bus-stop sign with a timetable",
  });
  const pip = (pose) => ({
    id: "pip",
    x: 1550, y: 590, w: 300, h: 430,
    svg: kit.puppet(pose),
    alt: `Pip, the paper rider, looks ${pose}`,
  });
  const gap = (aheadA, aheadB) => ({
    id: "gap-ribbon",
    x: 730, y: 183, w: 760, h: 238,
    svg: kit.gapGauge(aheadA, aheadB),
    alt: `Paper ribbon: gap ahead of A is ${aheadA} minutes; ahead of B is ${aheadB} minutes`,
  });

  Storytime.deck({
    title: "Why do buses come in bunches? · Paper Diorama",
    wpm: 130,
    targetSeconds: 80,
    background: "#2b2017",
    chrome: kit.chrome,
    states: [
      {
        id: "s1-question",
        kind: "title",
        stamp: "ILLUSTRATIVE",
        source: SOURCE,
        transition: "fade",
        notes: {
          say: "You wait a long time for a bus, and then two come together. Why does a regular schedule turn into a bunch?",
          cue: "Click after the question.",
          plain: "This is an invented example to explain the mechanism, not measured city data.",
        },
        layers: [
          scenery(),
          bus("A", 175, 558),
          bus("B", 1305, 558),
          stopLayer(),
          pip("wait"),
          { id: "hanging-title", x: 105, y: 188, w: 1090, h: 380,
            svg: kit.titleCard(), alt: "Why do buses come in bunches?" },
        ],
      },
      {
        id: "s2-even",
        tag: "every 10 minutes, on paper",
        stamp: "ILLUSTRATIVE",
        source: SOURCE,
        notes: {
          say: "Start with two buses on one twenty-minute loop. The gap ahead of each bus is ten minutes. So a rider arriving at a random time waits five minutes on average.",
          cue: "Click after 'five minutes on average.'",
          plain: "Even spacing means neither bus is close behind the other.",
          detail: "For gaps 10 and 10, expected wait is (10 squared + 10 squared) divided by 40: 5.0 minutes.",
        },
        layers: [
          scenery(),
          bus("A", 175, 558),
          bus("B", 1305, 558),
          stopLayer(),
          pip("wait"),
          gap(10, 10),
        ],
      },
      {
        id: "s3-crowded-stop",
        tag: "one crowded stop",
        stamp: "ILLUSTRATIVE",
        source: SOURCE,
        notes: {
          say: "Now one stop gets crowded. Bus A spends longer boarding people. Its gap to the bus ahead grows to twelve minutes, while the gap to the bus behind shrinks to eight.",
          cue: "Click after 'shrinks to eight.'",
          plain: "One delay makes the spacing uneven, even though there are still two buses.",
          detail: "The two gaps still add to one twenty-minute lap. At 12 and 8, the model gives a 5.2-minute average wait.",
        },
        layers: [
          scenery(),
          bus("A", 175, 558),
          bus("B", 1197, 454),
          stopLayer(),
          pip("wait"),
          gap(12, 8),
          { id: "waiting-riders", x: 210, y: 804, w: 300, h: 160,
            svg: kit.riders(6), enter: "rise",
            alt: "Six cut-paper riders queue beside the delayed bus" },
        ],
      },
      {
        id: "s4-feedback",
        tag: "late buses get later",
        stamp: "ILLUSTRATIVE",
        source: SOURCE,
        notes: {
          say: "A late bus meets more waiting riders, so its stops take longer. The bus behind finds emptier stops and catches up. In our example, the gaps become nineteen and one.",
          cue: "Click after 'nineteen and one.'",
          plain: "The little delay feeds on itself until the buses travel almost together.",
          detail: "This is a feedback mechanism illustrated with chosen gaps; the slide is not a transit simulation.",
        },
        layers: [
          scenery(),
          bus("A", 175, 558),
          bus("B", 205, 498),
          stopLayer(),
          pip("wait"),
          gap(19, 1),
          { id: "waiting-riders", x: 210, y: 804, w: 300, h: 160,
            svg: kit.riders(6), alt: "Six riders still wait at the stop" },
          { id: "feedback-wheel", x: 570, y: 585, w: 620, h: 260,
            svg: kit.feedbackWheel(), enter: "pop",
            alt: "Paper loop: late bus, more riders, longer boarding, later bus" },
        ],
      },
      {
        id: "s5-wait",
        tag: "longer wait",
        stamp: "ILLUSTRATIVE",
        source: SOURCE,
        notes: {
          say: "The number of buses never changed. But unequal gaps make a randomly arriving rider wait longer: five minutes becomes about nine. The point is the spacing, not just the timetable.",
          cue: "End of demo.",
          plain: "When two buses come together, one leaves a long empty stretch behind it.",
          detail: "Expected wait is the sum of squared gaps divided by twice their sum. For 19 and 1: (361 + 1) / 40 = 9.05, rounded to 9.1 minutes. This is illustrative, not observed data.",
        },
        layers: [
          scenery(),
          bus("A", 175, 558),
          bus("B", 205, 498),
          stopLayer(),
          pip("alarmed"),
          gap(19, 1),
          { id: "waiting-riders", x: 210, y: 804, w: 300, h: 160,
            svg: kit.riders(6), alt: "Six riders still wait at the stop" },
          { id: "wait-reveal", x: 380, y: 368, w: 1150, h: 360,
            svg: kit.waitReveal(), enter: "pop",
            alt: "Illustrative average wait rises from 5.0 to 9.1 minutes" },
        ],
      },
    ],
  });
})();
