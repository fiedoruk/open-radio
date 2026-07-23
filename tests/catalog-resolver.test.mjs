import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validateSchema} from "./helpers/json-schema-lite.mjs";
import {validateResolverCandidate, validateStationCatalog} from "../resolver/catalog-contract.mjs";
import {createDeterministicClock} from "../resolver/deterministic-clock.mjs";
import {CandidateOutcomes, applyCandidateOutcome, createHealthState, resolveStation} from "../resolver/resolver.mjs";

const readText = relative => readFile(new URL(relative, import.meta.url), "utf8");
const readJson = async relative => JSON.parse(await readText(relative));

async function loadCatalog() {
  return readJson("../ui-contract/catalog/station-catalog.v1.json");
}

test("canonical catalog and every resolver candidate pass their JSON Schemas", async () => {
  const [catalog, catalogSchema, candidateSchema] = await Promise.all([
    loadCatalog(),
    readJson("../ui-contract/schemas/station-catalog.schema.json"),
    readJson("../ui-contract/schemas/resolver-candidate.schema.json")
  ]);
  assert.deepEqual(validateSchema(catalogSchema, catalog), []);
  for (const station of catalog.stations) for (const candidate of station.candidates) assert.deepEqual(validateSchema(candidateSchema, candidate), [], `${station.id}/${candidate.id}`);
});

test("catalog is embedded, ordered like UI and contains nine Core2-compatible MP3 stations", async () => {
  const [catalog, uiCatalog] = await Promise.all([loadCatalog(), readJson("../ui-contract/catalog/stations.pl.json")]);
  const validation = validateStationCatalog(catalog, uiCatalog.stations.map(station => station.id));
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.deepEqual(validation.capabilityCounts, {MP3_ICY: 9, HLS_HE_AAC: 0});
  assert.equal(catalog.remoteUpdate, false);
});

test("catalog mechanism accepts a bounded non-Polish country pack", () => {
  const catalog = {schemaVersion: 1, catalogId: "de-demo", lifecycle: "EMBEDDED_STATIC", remoteUpdate: false, stations: [{
    id: "example-radio", displayName: "Example Radio", operator: "Example", operatorGroup: "Example", country: "DE", language: "de",
    regionMode: "national", regionalSelection: "NONE", capabilityClass: "MP3_ICY", firmwareSupport: "MODEL_READY",
    artworkRights: "PROJECT_ORIGINAL_ONLY", nameUse: "IDENTIFICATION_ONLY", officialSurface: "https://radio.example/",
    candidates: [
      {id: "example-primary", role: "PRIMARY", kind: "OFFICIAL_API", url: "https://radio.example/api", owner: "Example", parser: "DIRECT_STREAM", transportPreference: ["MP3"], persistence: "DISCOVERY_ONLY", deviceFeasibility: "FEASIBLE", verifiedAt: "2026-07-14", evidence: "fixture"},
      {id: "example-alternate", role: "ALTERNATE", kind: "OFFICIAL_PAGE", url: "https://radio.example/player", owner: "Example", parser: "HTML_REFERENCE", transportPreference: ["MP3"], persistence: "DISCOVERY_ONLY", deviceFeasibility: "REFERENCE_ONLY", verifiedAt: "2026-07-14", evidence: "fixture"}
    ]
  }]};
  const validation = validateStationCatalog(catalog, ["example-radio"]);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.deepEqual(validation.capabilityCounts, {MP3_ICY: 1, HLS_HE_AAC: 0});
});

test("candidate validation rejects malformed, credential-bearing and transient URLs", () => {
  const base = {
    id: "test-api",
    role: "PRIMARY",
    kind: "OFFICIAL_API",
    url: "https://radio.example/api",
    owner: "Example operator",
    parser: "EUROZET_JSON",
    transportPreference: ["MP3"],
    persistence: "DISCOVERY_ONLY",
    deviceFeasibility: "FEASIBLE",
    verifiedAt: "2026-07-13",
    evidence: "fixture"
  };
  assert.equal(validateResolverCandidate(base).valid, true);
  assert.match(validateResolverCandidate({...base, url: "not-a-url"}).errors.join(" "), /invalid/);
  assert.match(validateResolverCandidate({...base, url: "https://user:pass@radio.example/api"}).errors.join(" "), /credentials/);
  assert.match(validateResolverCandidate({...base, url: "https://stream.rmfstream.pl/live"}).errors.join(" "), /transient/);
});

test("primary timeout can recover through a feasible alternate", () => {
  const catalog = {stations: [{
    id: "test-station", capabilityClass: "MP3_ICY",
    candidates: [
      {id: "primary", role: "PRIMARY", deviceFeasibility: "FEASIBLE"},
      {id: "alternate", role: "ALTERNATE", deviceFeasibility: "FEASIBLE"}
    ]
  }]};
  const health = createHealthState(catalog);
  const {result} = resolveStation({catalog, stationId: "test-station", health, nowMs: 1000, outcomes: {primary: "TIMEOUT", alternate: "SUCCESS"}});
  assert.equal(result.status, "PLAYING");
  assert.equal(result.selectedCandidateId, "alternate");
  assert.deepEqual(result.trace.map(item => item.outcome), ["TIMEOUT", "SUCCESS"]);
});

test("last-known-good recovers playback without exposing its endpoint identifier", async () => {
  const catalog = await loadCatalog();
  const health = createHealthState(catalog);
  const {result} = resolveStation({
    catalog, stationId: "rmf-fm", health, nowMs: 2000,
    outcomes: {"rmf-fm-api": "HTTP_404", LAST_KNOWN_GOOD: "SUCCESS"},
    lastKnownGood: {stationId: "rmf-fm", endpointId: "private-runtime-endpoint"}
  });
  assert.equal(result.status, "PLAYING");
  assert.equal(result.selectedCandidateId, "lkg:rmf-fm");
  assert.doesNotMatch(JSON.stringify(result), /private-runtime-endpoint|https?:\/\//);
});

test("known-good startup can prefer a proven local endpoint", async () => {
  const catalog = await loadCatalog();
  const health = createHealthState(catalog);
  const {result} = resolveStation({
    catalog, stationId: "radio-eska", health, nowMs: 2500,
    outcomes: {"radio-eska-player": "SUCCESS", LAST_KNOWN_GOOD: "SUCCESS"},
    lastKnownGood: {stationId: "radio-eska", endpointId: "opaque-local-value"},
    preferLastKnownGood: true
  });
  assert.equal(result.selectedCandidateId, "lkg:radio-eska");
  assert.equal(result.trace.length, 1);
});

test("two timeouts quarantine a candidate until deterministic time advances", async () => {
  const catalog = await loadCatalog();
  const clock = createDeterministicClock(10_000);
  let health = createHealthState(catalog);
  let resolution = resolveStation({catalog, stationId: "rmf-maxx", health, nowMs: clock.now(), outcomes: {"rmf-maxx-api": "TIMEOUT"}});
  health = resolution.health;
  assert.equal(health.candidates["rmf-maxx-api"].score, 75);
  clock.advance(5_000);
  resolution = resolveStation({catalog, stationId: "rmf-maxx", health, nowMs: clock.now(), outcomes: {"rmf-maxx-api": "TIMEOUT"}});
  health = resolution.health;
  const quarantineUntilMs = health.candidates["rmf-maxx-api"].quarantineUntilMs;
  assert.equal(quarantineUntilMs, 45_000);
  clock.advance(1_000);
  resolution = resolveStation({catalog, stationId: "rmf-maxx", health, nowMs: clock.now(), outcomes: {"rmf-maxx-api": "SUCCESS"}});
  assert.equal(resolution.result.status, "RETRY_SCHEDULED");
  assert.ok(resolution.result.trace.some(item => item.outcome === "QUARANTINED"));
  clock.advance(quarantineUntilMs - clock.now());
  resolution = resolveStation({catalog, stationId: "rmf-maxx", health, nowMs: clock.now(), outcomes: {"rmf-maxx-api": "SUCCESS"}});
  assert.equal(resolution.result.status, "PLAYING");
});

test("HTTP 404 immediately applies bounded quarantine", async () => {
  const catalog = await loadCatalog();
  const health = createHealthState(catalog);
  const updated = applyCandidateOutcome(health, "radio-zet-api", CandidateOutcomes.HTTP_404, 5_000);
  assert.equal(updated.candidates["radio-zet-api"].score, 50);
  assert.equal(updated.candidates["radio-zet-api"].quarantineUntilMs, 35_000);
});

test("all nine generated recovery traces pass result schema and expected terminal states", async () => {
  const [fixture, schema] = await Promise.all([
    readJson("../ui-contract/fixtures/resolver-traces.json"),
    readJson("../ui-contract/schemas/resolver-result.schema.json")
  ]);
  assert.equal(fixture.traces.length, 9);
  for (const trace of fixture.traces) {
    const {scenarioId, ...result} = trace;
    assert.ok(scenarioId);
    assert.deepEqual(validateSchema(schema, result), [], scenarioId);
    assert.doesNotMatch(JSON.stringify(result), /https?:\/\//);
    assert.ok(result.trace.length <= 3, `${scenarioId}: retry budget exceeded`);
  }
  assert.deepEqual(
    fixture.traces.reduce((counts, trace) => ({...counts, [trace.status]: (counts[trace.status] || 0) + 1}), {}),
    {PLAYING: 8, RETRY_SCHEDULED: 1}
  );
});

test("deterministic clock rejects backward movement", () => {
  const clock = createDeterministicClock(100);
  assert.equal(clock.advance(25), 125);
  assert.throws(() => clock.advance(-1), /non-negative integer/);
});

test("unknown stations and outcomes fail explicitly", async () => {
  const catalog = await loadCatalog();
  const health = createHealthState(catalog);
  assert.throws(() => resolveStation({catalog, stationId: "missing", health, nowMs: 0}), /unknown station/);
  assert.throws(() => applyCandidateOutcome(health, "rmf-fm-api", "MAGIC", 0), /unknown candidate outcome/);
});
