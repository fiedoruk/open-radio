import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {formatIngressDiagnostics} from "../runtime/diagnostics.mjs";
import {ingressLimits} from "../runtime/generated/ingress-limits.mjs";
import {MonotonicTick32, RuntimeIngress, RuntimeProducers} from "../runtime/ingress.mjs";
import {runIngressTrace} from "../runtime/ingress-replay.mjs";
import {RuntimeEvents, RuntimeOrchestrator} from "../runtime/orchestrator.mjs";
import {runtimeLimits} from "../runtime/generated/runtime-limits.mjs";
import {applyRuntimeSnapshot, createInitialState} from "../simulator/state-machine.mjs";
import {validateSchema} from "./helpers/json-schema-lite.mjs";

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));
const [fixture, schema, budgets] = await Promise.all([
  readJson("../ui-contract/fixtures/callback-traces.json"),
  readJson("../ui-contract/schemas/callback-trace.schema.json"),
  readJson("../firmware/manifests/resource-budgets.json")
]);

test("callback trace fixture passes its strict schema", () => {
  assert.deepEqual(validateSchema(schema, fixture), []);
});

test("all generated callback traces reproduce JS expectations", () => {
  for (const trace of fixture.traces) {
    assert.deepEqual(runIngressTrace({trace, ingressLimits, runtimeLimits}), trace.expected);
  }
});

test("trace set covers rollover, saturation, epochs, duplicates and late ticks", () => {
  assert.equal(fixture.traces.length, 10);
  assert.ok(fixture.traces.some(trace => trace.expected.rollovers === 1));
  assert.ok(fixture.traces.some(trace => trace.expected.mailboxOverflows === 2));
  assert.ok(fixture.traces.some(trace => trace.expected.staleEpochs === 1));
  assert.ok(fixture.traces.some(trace => trace.expected.duplicateFacts === 1 && trace.expected.staleFacts === 1));
  assert.ok(fixture.traces.some(trace => trace.expected.backwardTicks === 1));
});

test("seeded healthy boot permutations converge after bounded recovery tail", () => {
  const traces = fixture.traces.filter(trace => trace.convergenceGroup === "healthy-boot");
  assert.deepEqual(traces.map(trace => trace.seed), [11, 29, 47]);
  for (const trace of traces) {
    assert.equal(trace.expected.finalState, "PLAYING");
    assert.equal(trace.expected.finalOutput, "BT");
    assert.equal(trace.expected.deliveryRejected, 0);
  }
});

test("ingress limits match firmware resource gates", () => {
  assert.deepEqual(ingressLimits, {
    mailboxCapacity: budgets.ingressHostGates.mailboxCapacity,
    producerCount: budgets.ingressHostGates.producerCount,
    rawTickBits: budgets.ingressHostGates.rawTickBits,
    maximumDrainPerPass: budgets.ingressHostGates.maximumDrainPerPass
  });
});

test("32-bit tick normalizer distinguishes rollover from backward time", () => {
  const clock = new MonotonicTick32();
  assert.deepEqual(clock.normalize(0xfffffff0), {accepted: true, value: 0xfffffff0, rolledOver: false});
  assert.deepEqual(clock.normalize(5), {accepted: true, value: 0x100000005, rolledOver: true});
  assert.deepEqual(clock.normalize(4), {accepted: false, value: 0x100000005, rolledOver: false});
});

test("producer kind boundary rejects cross-service facts", () => {
  const orchestrator = new RuntimeOrchestrator(runtimeLimits);
  const ingress = new RuntimeIngress({limits: ingressLimits, orchestrator});
  assert.equal(ingress.post({producer: RuntimeProducers.WIFI, epoch: 1,
    producerSequence: 1, rawTick: 0, type: RuntimeEvents.BLUETOOTH_CONNECTED}), false);
  assert.equal(ingress.snapshot().counters.invalidFacts, 1);
  assert.equal(orchestrator.snapshot().counters.processedEvents, 0);
});

test("mailbox never grows beyond the generated capacity", () => {
  const orchestrator = new RuntimeOrchestrator(runtimeLimits);
  const ingress = new RuntimeIngress({limits: ingressLimits, orchestrator});
  for (let sequence = 1; sequence <= ingressLimits.mailboxCapacity + 2; ++sequence) {
    ingress.post({producer: RuntimeProducers.POWER, epoch: 1,
      producerSequence: sequence, rawTick: 0, type: RuntimeEvents.POWER_INTERRUPTED});
  }
  assert.equal(ingress.snapshot().mailboxDepth, ingressLimits.mailboxCapacity);
  assert.equal(ingress.snapshot().counters.mailboxOverflows, 2);
});

test("hardware resource probes remain explicitly unmeasured", () => {
  const orchestrator = new RuntimeOrchestrator(runtimeLimits);
  const ingress = new RuntimeIngress({limits: ingressLimits, orchestrator});
  assert.deepEqual(ingress.snapshot().resourceProbes, budgets.hardwareIngressMeasurements);
});

test("PL and EN ingress diagnostics are fixed and redacted", () => {
  const orchestrator = new RuntimeOrchestrator(runtimeLimits);
  const ingress = new RuntimeIngress({limits: ingressLimits, orchestrator});
  ingress.post({producer: RuntimeProducers.POWER, epoch: 1,
    producerSequence: 1, rawTick: 0, type: RuntimeEvents.POWER_INTERRUPTED});
  ingress.drain();
  for (const locale of ["pl", "en"]) {
    const lines = formatIngressDiagnostics(ingress.snapshot(), locale);
    assert.equal(lines.length, 5);
    assert.doesNotMatch(lines.join(" "), /ssid|password|credential|endpoint|bssid|mac|pcm/i);
  }
});

test("simulator projection exposes source-agnostic ingress health", () => {
  const orchestrator = new RuntimeOrchestrator(runtimeLimits);
  const ingress = new RuntimeIngress({limits: ingressLimits, orchestrator});
  ingress.post({producer: RuntimeProducers.POWER, epoch: 1,
    producerSequence: 1, rawTick: 0, type: RuntimeEvents.POWER_INTERRUPTED});
  ingress.drain();
  const state = applyRuntimeSnapshot(createInitialState({configured: true}),
    orchestrator.snapshot(), ingress.snapshot());
  assert.equal(state.diagnostics.ingressMailboxDepth, 0);
  assert.equal(state.diagnostics.ingressMaximumDepth, 1);
  assert.equal(state.diagnostics.ingressRejected, 0);
  assert.equal(state.diagnostics.ingressRollovers, 0);
});

test("firmware callbacks enqueue facts without direct orchestrator mutation", async () => {
  const [main, bridge] = await Promise.all([
    readFile(new URL("../firmware/public-candidate/src/main.cpp", import.meta.url), "utf8"),
    readFile(new URL("../firmware/common/include/open_radio/runtime_service_bridge.hpp", import.meta.url), "utf8")
  ]);
  assert.doesNotMatch(main, /runtimeOrchestrator\.(post|advance)\(/);
  assert.match(main, /runtimeIngress\.drain\(\)/);
  assert.match(main, /runtimeIngress\.advanceOwnerClock\(millis\(\)\)/);
  assert.match(bridge, /ingress_\.post\(/);
  assert.doesNotMatch(bridge, /orchestrator_/);
});
