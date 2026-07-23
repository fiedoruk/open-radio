import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {formatRuntimeDiagnostics} from "../runtime/diagnostics.mjs";
import {runtimeLimits} from "../runtime/generated/runtime-limits.mjs";
import {RuntimeEvents, RuntimeOrchestrator, RuntimeStates} from "../runtime/orchestrator.mjs";
import {runVirtualSoak} from "../runtime/soak.mjs";
import {createUiController} from "../simulator/controller.mjs";

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));
const [fixture, catalog, pl, en, budgets] = await Promise.all([
  readJson("../ui-contract/fixtures/runtime-soaks.json"),
  readJson("../ui-contract/catalog/stations.pl.json"),
  readJson("../ui-contract/i18n/pl.json"),
  readJson("../ui-contract/i18n/en.json"),
  readJson("../firmware/manifests/resource-budgets.json")
]);

test("all generated runtime soaks reproduce their terminal summaries", () => {
  for (const scenario of fixture.soaks) {
    assert.deepEqual(runVirtualSoak({scenario, limits: fixture.limits, events: scenario.events}), scenario.expected);
  }
});

test("runtime soak set covers 1, 2, 8 and 24 virtual hours", () => {
  assert.deepEqual(fixture.soaks.map(scenario => scenario.durationMinutes), [60, 120, 480, 1440]);
  assert.equal(fixture.soaks.reduce((sum, scenario) => sum + scenario.durationMinutes, 0), 2100);
});

test("short and medium soaks recover to Bluetooth playback", () => {
  for (const scenario of fixture.soaks.slice(0, 3)) {
    assert.equal(scenario.expected.finalState, RuntimeStates.PLAYING);
    assert.equal(scenario.expected.finalOutput, "BT");
  }
});

test("24-hour corrupt-slot reboot ends in local safe mode", () => {
  const scenario = fixture.soaks.at(-1);
  assert.equal(scenario.expected.finalState, RuntimeStates.SAFE_MODE);
  assert.equal(scenario.expected.finalOutput, "LOCAL");
});

test("all soak resource counters remain bounded", () => {
  for (const scenario of fixture.soaks) {
    assert.equal(scenario.expected.queueOverflows, 0);
    assert.equal(scenario.expected.timerOverflows, 0);
    assert.ok(scenario.expected.maximumQueueDepth <= runtimeLimits.eventQueueCapacity);
    assert.ok(scenario.expected.diagnosticsStored <= runtimeLimits.diagnosticCapacity);
  }
});

test("generated runtime limits match firmware resource gates", () => {
  assert.equal(runtimeLimits.eventQueueCapacity, budgets.runtimeHostGates.eventQueueCapacity);
  assert.equal(runtimeLimits.timerCapacity, budgets.runtimeHostGates.timerCapacity);
  assert.equal(runtimeLimits.diagnosticCapacity, budgets.runtimeHostGates.diagnosticCapacity);
  assert.equal(runtimeLimits.maximumRetryDelayMs, budgets.runtimeHostGates.maximumRetryDelayMs);
});

test("event queue rejects saturation without growing", () => {
  const orchestrator = new RuntimeOrchestrator(runtimeLimits);
  for (let sequence = 1; sequence <= runtimeLimits.eventQueueCapacity; ++sequence) {
    assert.equal(orchestrator.post({type: RuntimeEvents.CONFIG_READY, atMs: 10, sequence}), true);
  }
  assert.equal(orchestrator.post({type: RuntimeEvents.CONFIG_READY, atMs: 10, sequence: 17}), false);
  assert.equal(orchestrator.snapshot().queueDepth, runtimeLimits.eventQueueCapacity);
  assert.equal(orchestrator.snapshot().counters.queueOverflows, 1);
});

test("duplicate, stale and backward events are rejected", () => {
  const orchestrator = new RuntimeOrchestrator(runtimeLimits);
  assert.equal(orchestrator.post({type: RuntimeEvents.CONFIG_READY, atMs: 10, sequence: 1}), true);
  assert.equal(orchestrator.post({type: RuntimeEvents.CONFIG_READY, atMs: 10, sequence: 1}), false);
  orchestrator.advance(10);
  assert.equal(orchestrator.post({type: RuntimeEvents.WIFI_CONNECTED, atMs: 9, sequence: 2}), false);
  assert.equal(orchestrator.advance(9), false);
  assert.equal(orchestrator.snapshot().counters.duplicateEvents, 1);
  assert.equal(orchestrator.snapshot().counters.staleEvents, 2);
});

test("diagnostic ring overwrites oldest records at fixed capacity", () => {
  const orchestrator = new RuntimeOrchestrator(runtimeLimits);
  for (let sequence = 1; sequence <= 40; ++sequence) {
    orchestrator.post({type: "UNKNOWN", atMs: 0, sequence});
  }
  assert.equal(orchestrator.snapshot().diagnosticsStored, runtimeLimits.diagnosticCapacity);
  assert.equal(orchestrator.snapshot().counters.diagnosticOverwrites, 8);
});

test("PL and EN diagnostics expose fixed redacted fields", () => {
  const orchestrator = new RuntimeOrchestrator(runtimeLimits);
  orchestrator.post({type: RuntimeEvents.CONFIG_CORRUPT, atMs: 0, sequence: 1});
  orchestrator.advance(0);
  for (const locale of ["pl", "en"]) {
    const lines = formatRuntimeDiagnostics(orchestrator.snapshot(), locale);
    assert.equal(lines.length, 6);
    assert.doesNotMatch(lines.join(" "), /ssid|password|credential|endpoint|bssid|mac/i);
  }
});

test("simulator controller projects runtime state without owning recovery policy", () => {
  const controller = createUiController({catalog, dictionaries: {pl, en}, configured: true});
  const orchestrator = new RuntimeOrchestrator(runtimeLimits);
  orchestrator.post({type: RuntimeEvents.CONFIG_READY, atMs: 0, sequence: 1});
  orchestrator.post({type: RuntimeEvents.WIFI_CONNECTED, atMs: 0, sequence: 2});
  orchestrator.post({type: RuntimeEvents.RESOLVER_UNSUPPORTED, atMs: 0, sequence: 3});
  orchestrator.advance(0);
  const snapshot = controller.projectRuntime(orchestrator.snapshot());
  assert.equal(snapshot.systemState, "UNSUPPORTED_STATION");
  assert.equal(snapshot.recoveryReason, "STREAM");
  assert.equal(snapshot.output, "LOCAL");
});

test("Bluetooth loss preserves local playback and schedules bounded retry", () => {
  const orchestrator = new RuntimeOrchestrator(runtimeLimits);
  const events = [RuntimeEvents.CONFIG_READY, RuntimeEvents.WIFI_CONNECTED,
    RuntimeEvents.RESOLVER_READY, RuntimeEvents.STREAM_HEALTHY,
    RuntimeEvents.BLUETOOTH_CONNECTED, RuntimeEvents.BLUETOOTH_LOST];
  events.forEach((type, index) => orchestrator.post({type, atMs: 0, sequence: index + 1}));
  orchestrator.advance(0);
  assert.equal(orchestrator.snapshot().state, RuntimeStates.DEGRADED_PLAYING);
  assert.equal(orchestrator.snapshot().output, "LOCAL");
  assert.equal(orchestrator.snapshot().timerCount, 1);
});

test("generated state hashes are canonical 64-bit hex", () => {
  for (const scenario of fixture.soaks) assert.match(scenario.expected.stateHash, /^[0-9a-f]{16}$/);
});
