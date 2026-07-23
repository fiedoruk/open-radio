import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {CommunityValidationCodes, validateCommunityEvidence} from "../community/evidence.mjs";
import {replayCommunityPacket} from "../community/replay.mjs";
import {buildDeterministicTar, sha256} from "../scripts/lib/deterministic-archive.mjs";
import {validateSchema} from "./helpers/json-schema-lite.mjs";

const readJson = path => readFile(new URL(path, import.meta.url), "utf8").then(JSON.parse);
const [candidate, policy, expectations, bluetoothSchema, stationSchema, replaySchema] = await Promise.all([
  readJson("../release/rc1-candidate.json"),
  readJson("../release/rc1-source-policy.json"),
  readJson("../community/fixture-expectations.json"),
  readJson("../community/schemas/bluetooth-compatibility-result.schema.json"),
  readJson("../community/schemas/station-playback-result.schema.json"),
  readJson("../community/schemas/callback-replay-packet.schema.json")
]);
const schemas = new Map([
  ["BLUETOOTH_COMPATIBILITY", bluetoothSchema],
  ["STATION_PLAYBACK", stationSchema],
  ["CALLBACK_REPLAY", replaySchema]
]);

test("accepted community fixtures pass schema and runtime validation", async () => {
  for (const fixture of expectations.fixtures.filter(item => item.expectedCode === "PASS")) {
    const report = await readJson(`../${fixture.path}`);
    assert.deepEqual(validateSchema(schemas.get(report.reportType), report), []);
    assert.equal(validateCommunityEvidence(report, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256}).code, "PASS");
  }
});

test("LE Audio-only evidence remains explicitly outside the hardware contract", async () => {
  const report = await readJson("../community/fixtures/bluetooth-le-audio-out-of-scope.json");
  assert.equal(report.outcome, "OUT_OF_SCOPE");
  assert.equal(validateCommunityEvidence(report, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256}).ok, true);
});

test("bounded retry report cannot be relabeled as unsupported with playback duration", async () => {
  const report = await readJson("../community/fixtures/station-unsupported-codec.json");
  assert.equal(report.durationBucket, "NOT_APPLICABLE");
  assert.equal(report.outcome, "BOUNDED_RETRY");
  assert.equal(validateCommunityEvidence({...report, outcome: "UNSUPPORTED", durationBucket: "M16_TO_60"}, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256}).code,
    CommunityValidationCodes.SCHEMA_REJECTED);
});

test("stale firmware evidence fails with a machine-readable reason", async () => {
  const report = await readJson("../community/fixtures/replay-stale-firmware.json");
  assert.equal(validateCommunityEvidence(report, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256}).code,
    CommunityValidationCodes.STALE_FIRMWARE);
});

test("unknown replay fields fail both schema and runtime validation", async () => {
  const report = await readJson("../community/fixtures/replay-schema-rejection.json");
  assert.notDeepEqual(validateSchema(replaySchema, report), []);
  assert.equal(validateCommunityEvidence(report, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256}).code,
    CommunityValidationCodes.SCHEMA_REJECTED);
});

test("privacy boundary rejects endpoint, identity and free-text fields", async () => {
  const report = await readJson("../community/fixtures/station-mp3-playing.json");
  for (const unsafe of [
    {...report, endpointUrl: "https://example.invalid/audio"},
    {...report, speakerMac: ["00", "11", "22", "33", "44", "55"].join(":")},
    {...report, notes: "works for me"}
  ]) {
    assert.equal(validateCommunityEvidence(unsafe, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256}).code,
      CommunityValidationCodes.PRIVACY_REJECTED);
  }
});

test("sanitized callback replay produces a deterministic bounded summary", async () => {
  const report = await readJson("../community/fixtures/replay-good.json");
  const first = replayCommunityPacket(report, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256});
  const second = replayCommunityPacket(report, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256});
  assert.deepEqual(first, second);
  assert.equal(first.summary.finalState, "PLAYING");
  assert.equal(first.summary.finalOutput, "BT");
  assert.equal(first.summary.acceptedFacts, 7);
  assert.equal(first.summary.deliveryRejected, 0);
});

test("candidate metadata matches the published 0.2.1 release", () => {
  // Hotfix 0.2.1 shipped the same evening as 0.2 (2026-07-22): two field
  // reports fixed (factory boot loop, fragment-rejected console stations),
  // hardware-validated on the owner's device before publication.
  assert.equal(candidate.sourceOnly, false);
  assert.equal(candidate.binaryIncluded, true);
  assert.equal(candidate.hardwareValidated, true);
  assert.equal(candidate.published, true);
  assert.equal(candidate.sourceTag, "open-radio-0-2-1");
  // Semantic coherence, not just field formats: the 0.2.1 manifest once
  // carried the 0.2 download URL next to 0.2.1 hashes and every check here
  // stayed green. Name, URL and tag must describe the same artifact, and the
  // full merged image can never equal the bare app component.
  assert.equal(candidate.candidate, candidate.sourceTag);
  assert.ok(candidate.publishedUrl.startsWith("https://fiedoruk.pl/os/"));
  assert.ok(candidate.publishedUrl.endsWith(`/${candidate.sourceTag}.bin`));
  assert.match(candidate.publishedSha256, /^[0-9a-f]{64}$/);
  assert.match(candidate.evidenceFirmwareSha256, /^[0-9a-f]{64}$/);
  assert.notEqual(candidate.publishedSha256, candidate.evidenceFirmwareSha256);
});

test("canonical release manifest agrees with the candidate metadata", async () => {
  const release = JSON.parse(await readFile(new URL("../release/release-0-2-1.json", import.meta.url)));
  assert.equal(release.tag, candidate.sourceTag);
  assert.equal(release.appSha256, candidate.evidenceFirmwareSha256);
  assert.equal(release.mergedImageSha256, candidate.publishedSha256);
  assert.equal(release.publishedUrl, candidate.publishedUrl);
  assert.equal(release.codeCutCommit.length, 40);
  assert.ok(release.sizeBytes > 2_000_000);
  assert.ok(release.correspondingSource.url.endsWith(`/${release.tag}-corresponding-source.tar.gz`));
  assert.match(release.correspondingSource.sha256, /^[0-9a-f]{64}$/);
  assert.notEqual(release.correspondingSource.sha256, release.mergedImageSha256);
});

test("source policy excludes caches, captures, media and compiled firmware", () => {
  for (const segment of [".git", ".pio", ".tools", "build", "dist", "output", "backups"]) assert.ok(policy.excludedSegments.includes(segment));
  for (const suffix of [".bin", ".elf", ".map", ".pcm", ".png", ".tar"]) assert.ok(policy.excludedSuffixes.includes(suffix));
});

test("deterministic tar is independent of input ordering", () => {
  const left = {path: "a.txt", data: Buffer.from("a\n"), mode: 0o644};
  const right = {path: "b.txt", data: Buffer.from("b\n"), mode: 0o644};
  const first = buildDeterministicTar([left, right], "candidate");
  const second = buildDeterministicTar([right, left], "candidate");
  assert.equal(sha256(first), sha256(second));
});
