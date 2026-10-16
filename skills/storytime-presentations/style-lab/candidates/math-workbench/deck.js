/* The shared bus story, constructed as a moving geometric proof. */
(function () {
  "use strict";

  const K = window.LivingProof;
  const { C, el, text } = K;
  const ROOT = el("svg", { viewBox: "0 0 1920 1080", role: "img" });
  document.querySelector("#stage").appendChild(ROOT);

  const TAGS = [
    "",
    "every 10 minutes, on paper",
    "one crowded stop",
    "late buses get later",
    "same buses, nearly double the wait",
  ];
  const NOTES = [
    "You wait twenty minutes for a bus, and then three arrive together. It isn't bad luck. It's a feedback loop, and once you see it, you can't unsee it.",
    "Let's slow it down with two buses on a loop line: eight stops, one bus every ten minutes. This gauge tracks the gap between them. On paper, the gaps are equal: ten and ten.",
    "Now one stop gets crowded. Bus A takes longer to board everyone and falls two minutes behind. The gap in front of it grows to twelve; the gap behind shrinks to eight.",
    "Here's the loop. A late bus finds more people waiting, so it boards longer and gets later still. The bus behind finds empty stops and speeds up. Soon the gaps are nineteen and one. The buses have bunched.",
    "Same buses, same schedule. But if you arrive at a random moment, your average wait goes from five minutes to about nine. Nothing broke. The fix isn't more buses; it's holding the early bus for a minute.",
  ];
  const STATE = [
    { gap: 19, busA: 135, busB: 116, third: 1, title: 1, chart: 0,
      gauge: 0, arcs: 0, crowd: 0, feedback: 0, reveal: 0, hold: 0, pose: 0 },
    { gap: 10, busA: 135, busB: 315, third: 0, title: 0, chart: 1,
      gauge: 1, arcs: 1, crowd: 0, feedback: 0, reveal: 0, hold: 0, pose: 1 },
    { gap: 12, busA: 135, busB: 351, third: 0, title: 0, chart: 1,
      gauge: 1, arcs: 1, crowd: 1, feedback: 0, reveal: 0, hold: 0, pose: 2 },
    { gap: 19, busA: 135, busB: 477, third: 0, title: 0, chart: 1,
      gauge: 1, arcs: 1, crowd: 1, feedback: 1, reveal: 0, hold: 0, pose: 3 },
    { gap: 19, busA: 135, busB: 477, third: 0, title: 0, chart: 1,
      gauge: 1, arcs: 1, crowd: 1, feedback: 0, reveal: 1, hold: 1, pose: 4 },
  ];
  const CENTER = { x: 565, y: 520, r: 292 };
  const CHART = { x: 1106, y: 701, perMinute: 31.5, waitScale: 16.5 };

  K.workspace(ROOT);
  const routeArea = el("g", { id: "route-area" }, ROOT);
  K.loopRoute(routeArea, CENTER.x, CENTER.y, CENTER.r);

  const ringA = el("path", { id: "long-gap-arc", fill: "none",
    stroke: C.rust, "stroke-width": 11, "stroke-linecap": "round" }, routeArea);
  const ringB = el("path", { id: "short-gap-arc", fill: "none",
    stroke: C.blue, "stroke-width": 11, "stroke-linecap": "round" }, routeArea);

  const crowd = el("g", { id: "waiting-riders" }, routeArea);
  for (let i = 0; i < 6; i++) {
    const x = 265 + (i % 3) * 23;
    const y = 643 + Math.floor(i / 3) * 30;
    const person = el("g", { id: `rider-${i}` }, crowd);
    el("circle", { cx: x, cy: y, r: 7, fill: C.ink }, person);
    el("path", { d: `M${x} ${y + 8} v16`, stroke: C.ink,
      "stroke-width": 5, "stroke-linecap": "round" }, person);
  }
  const crowdCallout = text(crowd, "boarding takes longer", 128, 617, 27,
    C.rust, 700);
  el("path", { d: "M319 628 Q348 657 340 688", fill: "none",
    stroke: C.rust, "stroke-width": 3 }, crowd);

  const stop = el("g", { id: "bus-stop" }, routeArea);
  el("path", { d: "M183 693 V849", stroke: C.ink,
    "stroke-width": 9, "stroke-linecap": "round" }, stop);
  el("rect", { x: 124, y: 664, width: 118, height: 52, rx: 13,
    fill: C.white, stroke: C.ink, "stroke-width": 4 }, stop);
  text(stop, "STOP 1", 135, 699, 27, C.ink, 700);

  const busA = K.bus(routeArea, "bus-A", C.rust, "A");
  const busB = K.bus(routeArea, "bus-B", C.blue, "B");
  const busC = K.bus(routeArea, "bus-C", C.amber, "C");
  const character = K.researcher(routeArea);
  const gauge = K.gauge(ROOT);
  const graph = K.graphPaper(ROOT);

  const feedback = el("g", { id: "feedback-loop" }, ROOT);
  el("path", {
    d: "M1082 845 H1754 Q1791 845 1791 875 V899 Q1791 930 1753 930 H1081 Q1048 930 1048 901 V875 Q1048 845 1082 845",
    fill: "none", stroke: C.rust, "stroke-width": 5,
    "stroke-dasharray": "14 9",
  }, feedback);
  text(feedback, "LATE BUS", 1079, 832, 27, C.rust, 700);
  text(feedback, "MORE RIDERS", 1530, 832, 27, C.rust, 700);
  text(feedback, "LONGER BOARDING", 1486, 970, 27, C.rust, 700);
  text(feedback, "LATER BUS", 1090, 970, 27, C.rust, 700);
  el("path", { d: "M1351 832 l25 12 -25 12 M1778 867 l12 25 12 -25 M1369 918 l-25 12 25 12 M1054 909 l-12 -25 -12 25",
    fill: "none", stroke: C.rust, "stroke-width": 4,
    "stroke-linecap": "round", "stroke-linejoin": "round" }, feedback);

  const hold = el("g", { id: "hold-early-bus" }, ROOT);
  el("path", { d: "M515 765 L627 724", stroke: C.fix,
    "stroke-width": 4, "stroke-dasharray": "6 7" }, hold);
  el("circle", { cx: 512, cy: 766, r: 11, fill: C.fix }, hold);
  el("rect", { x: 632, y: 689, width: 325, height: 66, rx: 12,
    fill: C.white, stroke: C.fix, "stroke-width": 3 }, hold);
  text(hold, "HOLD THE EARLY BUS", 651, 733, 26, C.fix, 700);

  const reveal = el("g", { id: "result-reveal" }, ROOT);
  text(reveal, "each triangle's area = gap² ÷ 2", 1079, 838, 28, C.muted, 400);
  text(reveal, "(19² + 1²) ÷ 40 = 9.05 ≈ 9.1 min", 1079, 875, 29,
    C.ink, 700);
  const resultNumber = text(reveal, "5.0 → 9.1", 1070, 963, 84, C.rust, 700);
  text(reveal, "min average wait", 1490, 963, 35, C.ink, 700);

  const title = el("g", { id: "opening-title" }, ROOT);
  text(title, "Why do buses", 1047, 416, 87, C.ink, 700);
  text(title, "come in bunches?", 1047, 522, 87, C.ink, 700);
  el("path", { d: "M1047 555 Q1332 580 1715 554", fill: "none",
    stroke: C.amber, "stroke-width": 10, "stroke-linecap": "round" }, title);
  text(title, "A visual proof you can watch unfold", 1052, 626, 30,
    C.muted, 400);

  const headline = K.tag(ROOT);
  const stamp = K.stamp(ROOT);
  const source = K.source(ROOT);
  const notes = document.querySelector("#notes");
  const motionStatus = document.querySelector("#motion-status");

  let currentIndex = 0;
  let animation = null;
  let reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function mix(first, second, progress) {
    return first + (second - first) * progress;
  }

  function smooth(value) {
    return value * value * (3 - 2 * value);
  }

  function setOpacity(element, value) {
    element.setAttribute("opacity", Math.max(0, Math.min(1, value)).toFixed(3));
  }

  function moveBus(group, degrees, radius = CENTER.r) {
    const [x, y] = K.point(CENTER.x, CENTER.y, radius, degrees);
    group.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  }

  function drawTriangles(gap) {
    const nextGap = 20 - gap;
    const boundaryX = CHART.x + gap * CHART.perMinute;
    const rightX = CHART.x + 20 * CHART.perMinute;
    const firstTop = CHART.y - gap * CHART.waitScale;
    const secondTop = CHART.y - nextGap * CHART.waitScale;
    graph.first.setAttribute("d", `M${CHART.x} ${CHART.y} V${firstTop} L${boundaryX} ${CHART.y} Z`);
    graph.second.setAttribute("d", `M${boundaryX} ${CHART.y} V${secondTop} L${rightX} ${CHART.y} Z`);
    graph.boundary.setAttribute("x1", boundaryX);
    graph.boundary.setAttribute("x2", boundaryX);
    graph.firstLabel.setAttribute("x", CHART.x + (gap * CHART.perMinute) / 2);
    graph.firstLabel.setAttribute("y", Math.max(360, firstTop + 51));
    graph.firstLabel.setAttribute("text-anchor", "middle");
    graph.secondLabel.setAttribute("x", Math.min(1778,
      boundaryX + (nextGap * CHART.perMinute) / 2));
    graph.secondLabel.setAttribute("y", Math.min(662, secondTop + 51));
    graph.secondLabel.setAttribute("text-anchor", "middle");
  }

  function drawGauge(gap) {
    const split = 145 + gap * 39.8;
    const visibleGap = Math.round(gap);
    gauge.long.setAttribute("width", Math.max(1, split - 145));
    gauge.short.setAttribute("x", split);
    gauge.short.setAttribute("width", Math.max(1, 941 - split));
    gauge.leftValue.textContent = `${visibleGap} min`;
    gauge.rightValue.textContent = `${20 - visibleGap} min`;
    gauge.leftValue.setAttribute("x", gap > 15 ? 510 : 440);
    gauge.rightValue.setAttribute("x", gap > 15 ? 797 : 783);
  }

  function poseCharacter(pose) {
    const poses = [
      ["M-25 5 Q-61 21 -70 -4", "M25 6 Q66 5 68 28", "M-12 -21 Q1 -35 16 -21"],
      ["M-25 5 Q-65 -4 -77 -28", "M25 6 Q65 10 78 -10", "M-13 -25 Q0 -18 14 -25"],
      ["M-25 5 Q-50 20 -66 -2", "M25 6 Q53 -13 56 -38", "M-11 -19 H15"],
      ["M-25 5 Q-60 -8 -68 -37", "M25 6 Q61 -8 71 -44", "M-6 -29 C-11 -9 16 -9 11 -29 C8 -38 -3 -38 -6 -29 Z"],
      ["M-25 5 Q-65 -1 -81 -29", "M25 6 Q60 -3 73 -23", "M-15 -32 Q0 -13 16 -32"],
    ];
    const which = poses[Math.round(pose)];
    character.leftArm.setAttribute("d", which[0]);
    character.rightArm.setAttribute("d", which[1]);
    character.mouth.setAttribute("d", which[2]);
  }

  function render(fromIndex, toIndex, progress) {
    const start = STATE[fromIndex];
    const end = STATE[toIndex];
    const k = smooth(progress);
    const blended = {};
    Object.keys(end).forEach((key) => {
      blended[key] = mix(start[key], end[key], k);
    });

    const gap = blended.gap;
    const shortGap = 20 - gap;
    ringA.setAttribute("d", K.arcPath(CENTER.x, CENTER.y,
      CENTER.r + 36, 135, gap * 18));
    ringB.setAttribute("d", K.arcPath(CENTER.x, CENTER.y,
      CENTER.r + 36, 135 + gap * 18, shortGap * 18));
    setOpacity(ringA, blended.arcs);
    setOpacity(ringB, blended.arcs);
    moveBus(busA, blended.busA);
    moveBus(busB, blended.busB);
    moveBus(busC, mix(99, 110, k));
    setOpacity(busC, blended.third);
    for (let i = 0; i < 6; i++) {
      setOpacity(document.getElementById(`rider-${i}`),
        i === 0 ? 0.9 : blended.crowd);
    }
    setOpacity(crowdCallout, blended.crowd);
    setOpacity(gauge.group, blended.gauge);
    setOpacity(graph.group, blended.chart);
    setOpacity(title, blended.title);
    setOpacity(feedback, blended.feedback);
    setOpacity(reveal, blended.reveal);
    setOpacity(hold, blended.hold);
    setOpacity(headline.parentNode, 1 - blended.title);
    setOpacity(source, 1 - blended.title);
    drawGauge(gap);
    drawTriangles(gap);
    poseCharacter(blended.pose);

    const shown = progress >= 0.5 ? toIndex : fromIndex;
    headline.textContent = TAGS[shown];
    const visibleGap = Math.round(gap);
    graph.firstLabel.textContent = shown === 0 ? "" : `${visibleGap} min`;
    graph.secondLabel.textContent = shown === 0
      ? "" : `${20 - visibleGap} min`;
    const mean = (visibleGap ** 2 + (20 - visibleGap) ** 2) / 40;
    graph.note.textContent = shown === 0 ? "" : visibleGap === 19
      ? "shaded area ÷ 20 min = 9.05 min ≈ 9.1 min"
      : `shaded area ÷ 20 min = ${mean.toFixed(1)} min`;
    resultNumber.setAttribute("fill", C.rust);
  }

  function goTo(index) {
    const target = Math.max(0, Math.min(STATE.length - 1, Math.round(index)));
    if (animation) cancelAnimationFrame(animation);
    if (target === currentIndex || reducedMotion) {
      render(target, target, 1);
      currentIndex = target;
      notes.textContent = NOTES[target];
      return;
    }
    const start = currentIndex;
    currentIndex = target;
    notes.textContent = NOTES[target];
    const beginning = performance.now();
    const duration = 850;
    function frame(now) {
      const progress = Math.min(1, (now - beginning) / duration);
      render(start, target, progress);
      if (progress < 1) animation = requestAnimationFrame(frame);
      else animation = null;
    }
    animation = requestAnimationFrame(frame);
  }

  function fitStage() {
    const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    const stage = document.querySelector("#stage");
    stage.style.left = `${(innerWidth - 1920 * scale) / 2}px`;
    stage.style.top = `${(innerHeight - 1080 * scale) / 2}px`;
    stage.style.transform = `scale(${scale})`;
  }

  addEventListener("resize", fitStage);
  addEventListener("keydown", (event) => {
    if (["ArrowRight", " ", "PageDown"].includes(event.key)) {
      event.preventDefault();
      goTo(currentIndex + 1);
    } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      goTo(currentIndex - 1);
    } else if (event.key.toLowerCase() === "n") {
      document.body.classList.toggle("show-notes");
    } else if (event.key.toLowerCase() === "m") {
      reducedMotion = !reducedMotion;
      motionStatus.textContent = reducedMotion ? "Reduced motion on" : "Reduced motion off";
      motionStatus.style.opacity = "1";
      setTimeout(() => { motionStatus.style.opacity = "0"; }, 1400);
    }
  });

  fitStage();
  const requested = Number(new URLSearchParams(location.search).get("state"));
  currentIndex = Number.isInteger(requested)
    ? Math.max(0, Math.min(4, requested)) : 0;
  render(currentIndex, currentIndex, 1);
  notes.textContent = NOTES[currentIndex];
  window.deck = { count: STATE.length, goTo };
  document.fonts.ready.then(() => {
    document.body.dataset.ready = "1";
  });
})();
