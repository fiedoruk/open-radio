import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("the generated header carries every playback endpoint from the catalog", async () => {
  const [header, catalog] = await Promise.all([
    readFile(new URL("firmware/generated/station_catalog.hpp", root), "utf8"),
    readFile(new URL("ui-contract/catalog/station-catalog.v1.json", root), "utf8").then(JSON.parse)
  ]);
  assert.match(header, /kPlaybackEndpoints\[\]/);
  let offset = 0;
  for (const station of catalog.stations) {
    for (const endpoint of station.playback) assert.ok(header.includes(`"${endpoint.url}"`), `${endpoint.id}: url missing from header`);
    assert.ok(header.includes(`"${station.favicon ?? ""}", CapabilityClass`), `${station.id}: favicon column missing`);
    assert.ok(header.includes(`${offset}, ${station.playback.length}}`), `${station.id}: offset/count row missing`);
    offset += station.playback.length;
  }
  // The count is a sizeof() expression in the header, so assert on the table
  // itself: exactly one row per catalog endpoint, no orphans, no duplicates.
  const table = header.slice(header.indexOf("kPlaybackEndpoints[] = {"), header.indexOf("kPlaybackEndpointCount"));
  assert.equal(table.match(/^\s+\{"http/gm)?.length ?? 0, offset);
});

test("no playback endpoint reaches the byte limit start() enforces", async () => {
  const catalog = JSON.parse(await readFile(new URL("ui-contract/catalog/station-catalog.v1.json", root), "utf8"));
  for (const station of catalog.stations) {
    for (const endpoint of station.playback) assert.ok(endpoint.url.length < 128, `${endpoint.id}: ${endpoint.url.length} bytes`);
  }
});

test("pool-resolved rows keep the pinned fallback mount the firmware needs", async () => {
  const [header, catalog] = await Promise.all([
    readFile(new URL("firmware/generated/station_catalog.hpp", root), "utf8"),
    readFile(new URL("ui-contract/catalog/station-catalog.v1.json", root), "utf8").then(JSON.parse)
  ]);
  // resolveEndpoint() falls back to this literal whenever TLS discovery cannot
  // run, which is every station switch that happens while Bluetooth is up. The
  // expectation comes from the catalog so it follows the default nine.
  const pooled = catalog.stations.flatMap(station => station.playback.filter(endpoint => endpoint.resolver === "RMFON_POOL"));
  assert.ok(pooled.length >= 1, "at least one station still resolves through the operator pools");
  for (const endpoint of pooled) {
    assert.ok(header.includes(`{"${endpoint.url}", ${endpoint.bitrateKbps}, PlaybackResolver::RmfonPool}`), endpoint.id);
  }
});

test("no endpoint URL carries a fragment the device would put on the wire", async () => {
  // Radio-browser marks duplicate mounts with "#NAME" fragments. Our probe
  // correctly drops them, but HTTPClient on the device forwards them into
  // the GET line and smcdn answers 400 (measured 2026-07-22: Eska Rock
  // failed on the cube in 86 ms while the probe reported it feasible).
  const [nine, directory, header] = await Promise.all([
    readFile(new URL("ui-contract/catalog/station-catalog.v1.json", root), "utf8").then(JSON.parse),
    readFile(new URL("ui-contract/catalog/pl-directory.v1.json", root), "utf8").then(JSON.parse),
    readFile(new URL("firmware/generated/station_catalog.hpp", root), "utf8")
  ]);
  for (const station of nine.stations) {
    for (const endpoint of station.playback) assert.ok(!endpoint.url.includes("#"), endpoint.url);
  }
  for (const station of directory.stations) {
    for (const endpoint of station.endpoints) assert.ok(!endpoint.url.includes("#"), `${station.name}: ${endpoint.url}`);
  }
  for (const literal of header.match(/"https?:\/\/[^"]+"/g) ?? []) {
    assert.ok(!literal.includes("#"), literal);
  }
});
