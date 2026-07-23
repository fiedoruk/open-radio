import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validatePlaybackEndpoint, validatePlaybackList} from "../resolver/playback-contract.mjs";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const hosts = new Set(["ic1.smcdn.pl", "rs102-krk.rmfstream.pl"]);
const base = {
  id: "example-primary",
  url: "http://ic1.smcdn.pl/2980-1.mp3",
  transport: "MP3_ICY",
  bitrateKbps: 128,
  resolver: "DIRECT",
  verifiedAt: "2026-07-21",
  evidence: "socket-probe-2026-07-21"
};

test("a probed plain-HTTP endpoint on an approved host is valid", () => {
  assert.deepEqual(validatePlaybackEndpoint(base, hosts).errors, []);
});

test("HTTPS is rejected because TLS is unreachable under active A2DP", () => {
  const errors = validatePlaybackEndpoint({...base, url: "https://ic1.smcdn.pl/2980-1.mp3"}, hosts).errors;
  assert.match(errors.join(" "), /plain http/i);
});

test("an endpoint at or above 128 characters is rejected before it reaches the device", () => {
  const long = `http://ic1.smcdn.pl/${"a".repeat(128)}.mp3`;
  assert.match(validatePlaybackEndpoint({...base, url: long}, hosts).errors.join(" "), /127 characters/);
});

test("an unapproved host is rejected", () => {
  assert.match(validatePlaybackEndpoint({...base, url: "http://evil.example/x.mp3"}, hosts).errors.join(" "), /not in the firmware network lock/);
});

test("credentials in the URL are rejected", () => {
  assert.match(validatePlaybackEndpoint({...base, url: "http://a:b@ic1.smcdn.pl/x.mp3"}, hosts).errors.join(" "), /credentials/);
});

test("a station whose every endpoint exceeds the measured ceiling is rejected", () => {
  const station = {id: "jedynka", playback: [{...base, id: "jedynka-1", bitrateKbps: 192}]};
  assert.match(validatePlaybackList(station, hosts, 128).join(" "), /exceeds the measured/);
});

test("one endpoint under the ceiling is enough to admit a higher-bitrate alternate", () => {
  const station = {id: "mixed", playback: [
    {...base, id: "mixed-1", bitrateKbps: 128},
    {...base, id: "mixed-2", bitrateKbps: 192}
  ]};
  assert.deepEqual(validatePlaybackList(station, hosts, 128), []);
});

test("duplicate playback ids inside one station are rejected", () => {
  const station = {id: "dupe", playback: [{...base, id: "dupe-1"}, {...base, id: "dupe-1"}]};
  assert.match(validatePlaybackList(station, hosts, 128).join(" "), /duplicate playback id/);
});

test("every station in the shipped catalog carries probed playback endpoints", async () => {
  const [catalog, lock] = await Promise.all([
    readJson("ui-contract/catalog/station-catalog.v1.json"),
    readJson("firmware/manifests/network-services.lock.json")
  ]);
  const approved = new Set(lock.services.map(service => service.host));
  assert.equal(typeof catalog.bitrateCeilingKbps, "number");
  for (const station of catalog.stations) {
    assert.ok(Array.isArray(station.playback) && station.playback.length >= 1, `${station.id}: no playback endpoints`);
    assert.deepEqual(validatePlaybackList(station, approved, catalog.bitrateCeilingKbps), [], station.id);
  }
});
