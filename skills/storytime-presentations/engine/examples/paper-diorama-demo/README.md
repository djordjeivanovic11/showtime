# Paper Diorama · engine example

This five-state bus-bunching story uses the reusable `Storytime.deck` API.
It adapts the [Paper Diorama style-lab world](../../../style-lab/candidates/paper-diorama/)
into separate, persistent layers: the town and route, bus A, bus B, the bus stop,
and Pip. The paper gap ribbon changes from **10 + 10** to **12 + 8** to
**19 + 1** minutes. The final card shows the corresponding illustrative average
wait changing from **5.0** to **9.1** minutes. The example is an explanation of
bus bunching, not an observed transit dataset or a simulation of a particular
city.

From `storytime-presentations/engine`:

```bash
npm ci
node tools/build.mjs examples/paper-diorama-demo
```

The build produces `renders/contact.png`, `dist/deck.html` (one offline file),
`dist/deck.pdf`, `dist/deck.pptx`, `dist/presenter-notes.md`, and
`check-report.md` in this directory. Generated files are ignored by Git and
can be rebuilt from the source. Open `dist/deck.html` to present in a browser.
The PowerPoint contains layered pictures and declared Morph transitions; its
motion should be checked in a live PowerPoint slideshow before presenting.

The original paper-drawing helpers are copied unchanged into `paper-kit.js`.
`kit.js` adapts them to the engine's layer API, while `deck.js` contains the
five story states and simple speaker notes. The bundled Fraunces and Andika
fonts came from the style-lab candidate and are covered by the
[SIL Open Font License](../../../licenses/OFL-1.1.txt).
