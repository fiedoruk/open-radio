import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const readText = relative => readFile(new URL(relative, import.meta.url), "utf8");
const readJson = async relative => JSON.parse(await readText(relative));

test("renderer dimensions and format match the UI contract", async () => {
  const [layout, renderer] = await Promise.all([
    readJson("../ui-contract/layout/core2-320x240.json"),
    readJson("../ui-contract/renderer/rgb565.json")
  ]);
  assert.equal(renderer.width, layout.width);
  assert.equal(renderer.height, layout.height);
  assert.equal(renderer.pixelFormat, "RGB565");
  assert.equal(renderer.hashAlgorithm, "fnv1a-64");
  assert.equal(renderer.textProof, "bundled-inter-600-generated-4bit-alpha-atlas");
  assert.equal(renderer.themeProof, "generated-light-dark-rgb565");
  assert.equal(renderer.iconProof, "generated-tabler-24x24-masks");
});

test("renderer fixture references a valid launch station", async () => {
  const [fixture, catalog] = await Promise.all([
    readJson("../ui-contract/fixtures/renderer-now-playing.json"),
    readJson("../ui-contract/catalog/stations.pl.json")
  ]);
  assert.equal(fixture.screen, "NOW_PLAYING");
  assert.ok(fixture.stationIndex >= 0 && fixture.stationIndex < catalog.stations.length);
  assert.ok(fixture.requestedStationIndex >= 0 && fixture.requestedStationIndex < catalog.stations.length);
  assert.ok(["LOCAL", "BT"].includes(fixture.output));
  assert.equal(fixture.theme, "DARK");
});

test("generated renderer contract carries Dark B, Light A and icon masks", async () => {
  const [contract, icons, font] = await Promise.all([
    readText("../renderer/generated/ui_contract.hpp"),
    readText("../renderer/generated/icon_masks.hpp"),
    readText("../renderer/generated/inter_font.hpp")
  ]);
  assert.match(contract, /kDefaultTheme = ThemeMode::dark/);
  assert.match(contract, /kDarkTheme/);
  assert.match(contract, /kLightTheme/);
  assert.match(icons, /kIconBluetooth/);
  assert.match(icons, /kIconChevronLeft/);
  assert.match(icons, /kIconChevronRight/);
  assert.match(font, /kInterWeight = 600/);
  assert.match(font, /kInterSourceSha256/);
});

test("renderer core has no host, browser or device-framework dependency", async () => {
  const [header, source] = await Promise.all([
    readText("../renderer/include/open_radio/renderer.hpp"),
    readText("../renderer/src/renderer.cpp")
  ]);
  const core = `${header}\n${source}`;
  assert.doesNotMatch(core, /#include\s*[<"](?:fstream|iostream|filesystem)|emscripten|M5Unified|M5GFX|\bWiFi\b|\bArduino\b/);
});

test("expected framebuffer hash is a canonical 64-bit hex value", async () => {
  const hash = (await readText("../renderer/evidence/now-playing-rmf-local.hash")).trim();
  assert.match(hash, /^[0-9a-f]{16}$/);
});
