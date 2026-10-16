import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { bundleDeck, resolveDeckFile } from "./bundle.mjs";

function makeFixture() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "storytime-bundle-"));
  const deck = path.join(parent, "deck");
  const privateDir = path.join(parent, "deck-private");
  fs.mkdirSync(deck);
  fs.mkdirSync(privateDir);
  fs.writeFileSync(path.join(deck, "storytime.js"), "// local runtime");
  fs.writeFileSync(path.join(privateDir, "secret.js"), "// private script");
  fs.writeFileSync(path.join(privateDir, "secret.css"), "/* private style */");
  fs.writeFileSync(path.join(privateDir, "secret.png"), "private image");
  return { deck, privateDir, cleanup: () => fs.rmSync(parent, { recursive: true, force: true }) };
}

test("deck paths allow local files but reject parent and sibling paths", () => {
  const fixture = makeFixture();
  try {
    const localFile = path.join(fixture.deck, "art.png");
    fs.writeFileSync(localFile, "local image");
    assert.equal(resolveDeckFile("art.png", fixture.deck, fixture.deck, "asset"), localFile);
    assert.throws(
      () => resolveDeckFile("../deck-private/secret.png", fixture.deck, fixture.deck, "asset"),
      /asset escapes the deck directory/,
    );
    assert.throws(
      () => resolveDeckFile("..%2Fdeck-private%2Fsecret.png", fixture.deck, fixture.deck, "asset"),
      /asset escapes the deck directory/,
    );
  } finally {
    fixture.cleanup();
  }
});

test("deck paths reject symlinks to files outside the deck", () => {
  const fixture = makeFixture();
  try {
    fs.symlinkSync(path.join(fixture.privateDir, "secret.png"), path.join(fixture.deck, "linked.png"));
    assert.throws(
      () => resolveDeckFile("linked.png", fixture.deck, fixture.deck, "asset"),
      /asset escapes the deck directory through a symlink/,
    );
  } finally {
    fixture.cleanup();
  }
});

test("bundle rejects script and stylesheet references outside the deck", async () => {
  const fixture = makeFixture();
  try {
    const indexFile = path.join(fixture.deck, "index.html");
    fs.writeFileSync(indexFile, '<script src="../deck-private/secret.js"></script>');
    await assert.rejects(bundleDeck(fixture.deck), /script escapes the deck directory/);

    fs.writeFileSync(
      indexFile,
      '<script src="storytime.js"></script><link rel="stylesheet" href="../deck-private/secret.css">',
    );
    await assert.rejects(bundleDeck(fixture.deck), /stylesheet escapes the deck directory/);
  } finally {
    fixture.cleanup();
  }
});

test("bundle rejects escaped assets in scripts and nested stylesheets", async () => {
  const fixture = makeFixture();
  try {
    const indexFile = path.join(fixture.deck, "index.html");
    fs.writeFileSync(path.join(fixture.deck, "kit.js"), 'const image = "../deck-private/secret.png";');
    fs.writeFileSync(indexFile, '<script src="storytime.js"></script><script src="kit.js"></script>');
    await assert.rejects(bundleDeck(fixture.deck), /asset escapes the deck directory/);

    const styleDir = path.join(fixture.deck, "style");
    fs.mkdirSync(styleDir);
    fs.writeFileSync(path.join(styleDir, "main.css"), 'body { background: url("../../deck-private/secret.png"); }');
    fs.writeFileSync(
      indexFile,
      '<script src="storytime.js"></script><link rel="stylesheet" href="style/main.css">',
    );
    await assert.rejects(bundleDeck(fixture.deck), /asset escapes the deck directory/);
  } finally {
    fixture.cleanup();
  }
});
