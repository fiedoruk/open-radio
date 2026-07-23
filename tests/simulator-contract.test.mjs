import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const readJson = async relative => JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));

test("Core2 viewport is exact and touch target is usable", async () => {
  const layout = await readJson("../ui-contract/layout/core2-320x240.json");
  assert.equal(layout.width, 320);
  assert.equal(layout.height, 240);
  assert.ok(layout.minimumTouchTarget >= 44);
});

test("launch catalog contains nine distinct original procedural themes", async () => {
  const catalog = await readJson("../ui-contract/catalog/stations.pl.json");
  assert.equal(catalog.stations.length, 9);
  assert.equal(new Set(catalog.stations.map(station => station.id)).size, 9);
  assert.equal(catalog.artworkPolicy, "project-original-procedural");
  for (const station of catalog.stations) {
    assert.match(station.theme.background, /^#[0-9A-F]{6}$/i);
    assert.ok(station.theme.motif);
  }
});

test("Polish and English dictionaries have identical keys", async () => {
  const [pl, en] = await Promise.all([readJson("../ui-contract/i18n/pl.json"), readJson("../ui-contract/i18n/en.json")]);
  assert.deepEqual(Object.keys(pl).sort(), Object.keys(en).sort());
});

test("simulator uses one intrinsic 320x240 canvas", async () => {
  const html = await readFile(new URL("../simulator/index.html", import.meta.url), "utf8");
  assert.match(html, /<canvas id="screen" width="320" height="240"/);
});
