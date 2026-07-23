import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validateNetworkInputs} from "../network/network-contract.mjs";
import {NetworkOutcomes, applyNetworkOutcome, scoreNetwork, selectKnownNetwork} from "../network/network-selector.mjs";
import {validateSchema} from "./helpers/json-schema-lite.mjs";

const readJson = async relative => JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));

async function fixtures() {
  const [profiles, scenarios] = await Promise.all([
    readJson("../ui-contract/fixtures/network-profiles.json"),
    readJson("../ui-contract/fixtures/network-scenarios.json")
  ]);
  return {profiles: profiles.profiles, scenarios: scenarios.scenarios};
}

test("profiles and scan fixtures pass JSON Schemas and runtime validation", async () => {
  const [{profiles, scenarios}, profileSchema, scanSchema] = await Promise.all([
    fixtures(),
    readJson("../ui-contract/schemas/remembered-network-profile.schema.json"),
    readJson("../ui-contract/schemas/network-scan-result.schema.json")
  ]);
  for (const profile of profiles) assert.deepEqual(validateSchema(profileSchema, profile), [], profile.ref);
  for (const scenario of scenarios) for (const scan of scenario.scans) assert.deepEqual(validateSchema(scanSchema, scan), [], `${scenario.id}/${scan.scanId}`);
  for (const scenario of scenarios) assert.equal(validateNetworkInputs(profiles, scenario.scans).valid, true);
});

test("preferred known network can beat a stronger fallback signal", async () => {
  const {profiles, scenarios} = await fixtures();
  const scenario = scenarios.find(item => item.id === "preferred-home-selected");
  assert.equal(selectKnownNetwork({profiles, scans: scenario.scans, nowMs: 3_000_000}).selectedProfileRef, "wifi:home");
});

test("unreachable preferred network selects the healthy fallback", async () => {
  const {profiles, scenarios} = await fixtures();
  const scenario = scenarios.find(item => item.id === "fallback-travel-selected");
  assert.equal(selectKnownNetwork({profiles, scans: scenario.scans, nowMs: 3_000_000}).selectedProfileRef, "wifi:travel");
});

for (const scenarioId of ["unknown-secured-prompts", "open-network-prompts", "captive-network-prompts", "unapproved-profile-prompts"]) {
  test(`${scenarioId} never autojoins`, async () => {
    const {profiles, scenarios} = await fixtures();
    const scenario = scenarios.find(item => item.id === scenarioId);
    const selection = selectKnownNetwork({profiles, scans: scenario.scans, nowMs: 3_000_000});
    assert.equal(selection.status, "PROMPT_REQUIRED");
    assert.equal(selection.selectedProfileRef, null);
    assert.ok(selection.trace.every(entry => entry.decision === "PROMPT"));
  });
}

test("no reachable profile schedules a bounded retry", async () => {
  const {profiles, scenarios} = await fixtures();
  const scenario = scenarios.find(item => item.id === "no-reachable-network-retries");
  const selection = selectKnownNetwork({profiles, scans: scenario.scans, nowMs: 3_000_000});
  assert.equal(selection.status, "RETRY_SCHEDULED");
  assert.equal(selection.retryAtMs, 3_005_000);
});

test("two timeouts quarantine a profile and success clears it", async () => {
  const {profiles} = await fixtures();
  let profile = profiles.find(item => item.ref === "wifi:home");
  profile = applyNetworkOutcome(profile, NetworkOutcomes.TIMEOUT, 1_000);
  assert.equal(profile.quarantineUntilMs, 0);
  profile = applyNetworkOutcome(profile, NetworkOutcomes.TIMEOUT, 2_000);
  assert.equal(profile.quarantineUntilMs, 32_000);
  profile = applyNetworkOutcome(profile, NetworkOutcomes.CONNECTED, 32_000);
  assert.equal(profile.quarantineUntilMs, 0);
  assert.equal(profile.consecutiveFailures, 0);
  assert.equal(profile.lastSuccessMs, 32_000);
});

test("authentication failure receives immediate maximum backoff", async () => {
  const {profiles} = await fixtures();
  const profile = profiles.find(item => item.ref === "wifi:travel");
  const updated = applyNetworkOutcome(profile, NetworkOutcomes.AUTH_FAILURE, 10_000);
  assert.equal(updated.quarantineUntilMs, 610_000);
  assert.equal(updated.healthScore, 35);
});

test("preferred profile returns after quarantine recovery", async () => {
  const {profiles, scenarios} = await fixtures();
  const scenario = scenarios.find(item => item.id === "preferred-home-returns");
  const recovered = profiles.map(profile => profile.ref === "wifi:home" ? {...profile, healthScore: 100, lastSuccessMs: 3_000_000, quarantineUntilMs: 0, consecutiveFailures: 0} : profile);
  assert.equal(selectKnownNetwork({profiles: recovered, scans: scenario.scans, nowMs: 3_001_000}).selectedProfileRef, "wifi:home");
});

test("all generated network traces pass schema and contain no network identity", async () => {
  const [fixture, schema] = await Promise.all([
    readJson("../ui-contract/fixtures/network-traces.json"),
    readJson("../ui-contract/schemas/network-selection.schema.json")
  ]);
  assert.equal(fixture.traces.length, 9);
  for (const trace of fixture.traces) {
    const {scenarioId, ...result} = trace;
    assert.ok(scenarioId);
    assert.deepEqual(validateSchema(schema, result), [], scenarioId);
    assert.doesNotMatch(JSON.stringify(trace), /password|passwd|ssid|bssid|https?:\/\//i);
  }
  assert.deepEqual(fixture.traces.reduce((counts, trace) => ({...counts, [trace.status]: (counts[trace.status] || 0) + 1}), {}), {SELECTED: 4, PROMPT_REQUIRED: 4, RETRY_SCHEDULED: 1});
});

test("malformed inputs and unknown outcomes fail explicitly", async () => {
  const {profiles, scenarios} = await fixtures();
  assert.equal(validateNetworkInputs({}, scenarios[0].scans).valid, false);
  assert.equal(validateNetworkInputs(profiles, {}).valid, false);
  assert.throws(() => selectKnownNetwork({profiles, scans: [{...scenarios[0].scans[0], rssi: 1}], nowMs: 0}), /invalid network inputs/);
  assert.throws(() => applyNetworkOutcome(profiles[0], "MAGIC", 0), /unknown network outcome/);
});

test("a future last-success timestamp receives no recency bonus", async () => {
  const {profiles, scenarios} = await fixtures();
  const profile = {...profiles[0], lastSuccessMs: 2_000};
  const scan = scenarios[0].scans.find(item => item.profileRef === profile.ref);
  assert.equal(scoreNetwork(profile, scan, 1_000), scoreNetwork({...profile, lastSuccessMs: null}, scan, 1_000));
});
