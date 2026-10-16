# fonts/

Put the style kit's font files here (`.woff2` preferred) and declare them with
`@font-face` in the kit's CSS using a relative URL, for example

    @font-face { font-family: "Kit Display"; font-weight: 700;
                 src: url(fonts/kit-display-700.woff2) format("woff2"); }

- `tools/check.mjs` fails if a declared face does not load, and warns when text
  asks for a family that is neither declared nor installed (it would silently
  fall back to another font).
- `tools/bundle.mjs` inlines every `url(...)` it can resolve as a data URI, so
  the single-file HTML works offline.
- The PPTX flattens text to pictures, so fonts need not be installed on the
  presenting machine, unless you export with `--native-text`.
- Only ship fonts whose licence allows embedding (OFL fonts do).
