import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createInitialState} from "../simulator/state-machine.mjs";
import {createUiSnapshot} from "../simulator/ui-contract.mjs";
import {hitTest, resolveHitboxes} from "../simulator/hitboxes.mjs";

const readJson = async relative => JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));

async function fixture() {
  const [definition, setupOptions, catalog, pl, en] = await Promise.all([
    readJson("../ui-contract/layout/hitboxes.json"),
    readJson("../ui-contract/fixtures/setup-options.json"),
    readJson("../ui-contract/catalog/stations.pl.json"),
    readJson("../ui-contract/i18n/pl.json"),
    readJson("../ui-contract/i18n/en.json")
  ]);
  const snapshot = createUiSnapshot(createInitialState({configured: true}), catalog, {pl, en});
  const settings = [
    {label: "Wi-Fi", event: {type: "NAVIGATE", screen: "WIFI"}},
    {label: pl.cityTitle, event: {type: "NAVIGATE", screen: "CITY"}},
    {label: "Bluetooth", event: {type: "NAVIGATE", screen: "BLUETOOTH"}},
    {label: pl.language, event: {type: "SET_LOCALE", locale: "en"}},
    {label: pl.about, event: {type: "NAVIGATE", screen: "ABOUT"}},
    {label: pl.diagnostics, event: {type: "NAVIGATE", screen: "DIAGNOSTICS"}}
  ];
  return {definition, setupOptions, snapshot, settings};
}

test("all declared touch targets satisfy the 44px contract", async () => {
  const {definition} = await fixture();
  for (const items of Object.values(definition.screens)) for (const item of items) {
    assert.ok(item.rect[2] >= definition.minimumTouchTarget, item.id || item.repeat);
    assert.ok(item.rect[3] >= definition.minimumTouchTarget, item.id || item.repeat);
  }
});

test("repeated onboarding touch targets never overlap", async () => {
  const {definition, setupOptions, snapshot, settings} = await fixture();
  for (const [screen, sources] of [
    ["CITY", {cities: setupOptions.cities.map(value => ({value})), speakers: [], stations: [], settings}],
    ["BLUETOOTH", {cities: [], speakers: setupOptions.speakers.map(value => ({value})), stations: [], settings}]
  ]) {
    const boxes = resolveHitboxes(definition, {...snapshot, screen}, sources);
    for (let left = 0; left < boxes.length; left += 1) for (let right = left + 1; right < boxes.length; right += 1) {
      const a = boxes[left];
      const b = boxes[right];
      const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      assert.equal(overlaps, false, `${screen}: ${a.id} overlaps ${b.id}`);
    }
  }
});

test("repeated station hitboxes resolve from data", async () => {
  const {definition, setupOptions, snapshot, settings} = await fixture();
  const stationSnapshot = {...snapshot, screen: "STATIONS"};
  const boxes = resolveHitboxes(definition, stationSnapshot, {cities: setupOptions.cities.map(value => ({value})), speakers: [], stations: snapshot.stations, settings});
  assert.equal(boxes.length, 10);
  assert.deepEqual(boxes.at(-1).event, {type: "SELECT_STATION", index: 8});
  assert.equal(boxes.at(-1).label, snapshot.stations.at(-1).name);
});

test("hit testing uses topmost box and excludes the far edge", () => {
  const boxes = [
    {id: "bottom", x: 0, y: 0, width: 44, height: 44},
    {id: "top", x: 10, y: 10, width: 44, height: 44}
  ];
  assert.equal(hitTest(boxes, 12, 12).id, "top");
  assert.equal(hitTest(boxes, 54, 54), null);
});

test("Canvas renderer has no reducer import or inline hitbox construction", async () => {
  const app = await readFile(new URL("../simulator/app.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(app, /reduceState|createInitialState|addHitbox/);
  assert.match(app, /resolveHitboxes\(hitboxDefinition/);
});
