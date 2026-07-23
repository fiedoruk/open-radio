import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {crc32, stableStringify} from "../persistence/checksum.mjs";
import {validateCurrentConfig, migrateConfig} from "../persistence/config-contract.mjs";
import {createDeterministicStorage} from "../persistence/deterministic-storage.mjs";
import {WritePhases, applyAtomicWrite, createCommittedSlot, inspectSlot, selectBootConfig} from "../persistence/persistence.mjs";
import {evaluateBootSupervisor} from "../persistence/supervisor.mjs";
import {createDefaultDeviceConfig, createSettingsStore} from "../persistence/settings-store.mjs";
import {validateSchema} from "./helpers/json-schema-lite.mjs";

const readJson = async relative => JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));

async function fixtures() {
  const [configs, catalog] = await Promise.all([
    readJson("../ui-contract/fixtures/persistence-configs.json"),
    readJson("../ui-contract/catalog/station-catalog.v1.json")
  ]);
  return {configs: configs.configs, stationIds: catalog.stations.map(station => station.id)};
}

test("current and legacy fixtures pass their schemas", async () => {
  const [{configs}, currentSchema, legacySchema] = await Promise.all([
    fixtures(),
    readJson("../ui-contract/schemas/device-config-v2.schema.json"),
    readJson("../ui-contract/schemas/device-config-v1.schema.json")
  ]);
  assert.deepEqual(validateSchema(currentSchema, configs.currentA), []);
  assert.deepEqual(validateSchema(currentSchema, configs.currentB), []);
  assert.deepEqual(validateSchema(legacySchema, configs.legacy), []);
});

test("committed slot envelope passes its schema", async () => {
  const [{configs}, schema] = await Promise.all([
    fixtures(),
    readJson("../ui-contract/schemas/persistence-slot.schema.json")
  ]);
  assert.deepEqual(validateSchema(schema, createCommittedSlot("A", 1, configs.currentA, 1000)), []);
});

test("CRC32 and canonical serialization are deterministic", () => {
  assert.equal(crc32("123456789"), "crc32:cbf43926");
  assert.equal(stableStringify({b: 2, a: {d: 4, c: 3}}), '{"a":{"c":3,"d":4},"b":2}');
});

test("legacy migration is deterministic and does not mutate input", async () => {
  const {configs, stationIds} = await fixtures();
  const before = structuredClone(configs.legacy);
  const migrated = migrateConfig(configs.legacy, stationIds);
  assert.equal(migrated.valid, true);
  assert.equal(migrated.migratedFromVersion, 1);
  assert.equal(migrated.config.schemaVersion, 2);
  assert.equal(migrated.config.nowPlayingVariant, "editorial");
  assert.deepEqual(migrated.config.display, {screensaverEnabled: true, screensaverMode: "pulse", screensaverDelaySeconds: 120, displayOffEnabled: true, displayOffDelaySeconds: 1800});
  assert.deepEqual(configs.legacy, before);
  assert.equal(validateCurrentConfig(migrated.config, stationIds).valid, true);
});

test("future schemas fail explicitly", async () => {
  const {configs, stationIds} = await fixtures();
  assert.deepEqual(migrateConfig(configs.future, stationIds), {valid: false, reason: "FUTURE_SCHEMA_UNSUPPORTED"});
});

test("newest valid committed slot wins", async () => {
  const {configs, stationIds} = await fixtures();
  const storage = {slots: {
    A: createCommittedSlot("A", 1, configs.currentA, 1000),
    B: createCommittedSlot("B", 2, configs.currentB, 2000)
  }};
  const selected = selectBootConfig(storage, stationIds);
  assert.equal(selected.result.selectedSlotId, "B");
  assert.equal(selected.config.preferredStationId, "radio-eska");
});

for (const phase of [WritePhases.BEFORE_WRITE, WritePhases.DURING_PAYLOAD, WritePhases.BEFORE_COMMIT_MARKER]) {
  test(`${phase} preserves the previous committed slot`, async () => {
    const {configs, stationIds} = await fixtures();
    const storage = {slots: {A: createCommittedSlot("A", 1, configs.currentA, 1000), B: null}};
    const written = applyAtomicWrite(storage, configs.currentB, phase, 2000, stationIds);
    const selected = selectBootConfig(written.storage, stationIds);
    assert.equal(written.write.status, "INTERRUPTED");
    assert.equal(selected.result.selectedSlotId, "A");
    assert.equal(selected.config.preferredStationId, "rmf-fm");
  });
}

test("AFTER_COMMIT atomically promotes the alternate slot", async () => {
  const {configs, stationIds} = await fixtures();
  const storage = {slots: {A: createCommittedSlot("A", 1, configs.currentA, 1000), B: null}};
  const written = applyAtomicWrite(storage, configs.currentB, WritePhases.AFTER_COMMIT, 2000, stationIds);
  const selected = selectBootConfig(written.storage, stationIds);
  assert.equal(written.write.status, "COMMITTED");
  assert.equal(selected.result.selectedSlotId, "B");
  assert.equal(selected.result.selectedGeneration, 2);
});

test("checksum corruption falls back to the older slot", async () => {
  const {configs, stationIds} = await fixtures();
  const storage = {slots: {
    A: createCommittedSlot("A", 1, configs.currentA, 1000),
    B: {...createCommittedSlot("B", 2, configs.currentB, 2000), checksum: "crc32:00000000"}
  }};
  const selected = selectBootConfig(storage, stationIds);
  assert.equal(selected.result.selectedSlotId, "A");
  assert.deepEqual(selected.result.rejections, [{slotId: "B", reason: "CHECKSUM_MISMATCH"}]);
});

test("valid-checksum malformed JSON is rejected without leaking payload", async () => {
  const {configs, stationIds} = await fixtures();
  const malformed = '{"schemaVersion":2';
  const storage = {slots: {
    A: createCommittedSlot("A", 1, configs.currentA, 1000),
    B: {slotId: "B", generation: 2, payloadText: malformed, checksum: crc32(malformed), commitMarker: "COMMITTED", writtenAtMs: 2000}
  }};
  const selected = selectBootConfig(storage, stationIds);
  assert.equal(selected.result.selectedSlotId, "A");
  assert.doesNotMatch(JSON.stringify(selected.result), /schemaVersion\\?":2/);
  assert.equal(inspectSlot(storage.slots.B, "B", stationIds).reason, "PAYLOAD_PARSE_ERROR");
});

test("no valid slot enters explicit safe mode", async () => {
  const {stationIds} = await fixtures();
  const selected = selectBootConfig({slots: {A: null, B: null}}, stationIds);
  assert.equal(selected.result.status, "SAFE_MODE");
  assert.equal(selected.config, null);
});

test("equal generations select slot A deterministically", async () => {
  const {configs, stationIds} = await fixtures();
  const storage = {slots: {
    A: createCommittedSlot("A", 3, configs.currentA, 1000),
    B: createCommittedSlot("B", 3, configs.currentB, 2000)
  }};
  assert.equal(selectBootConfig(storage, stationIds).result.selectedSlotId, "A");
});

test("deterministic storage isolates reads and writes", async () => {
  const {configs} = await fixtures();
  const adapter = createDeterministicStorage();
  const state = adapter.read();
  state.slots.A = createCommittedSlot("A", 1, configs.currentA, 1000);
  assert.equal(adapter.read().slots.A, null);
  adapter.replace(state);
  state.slots.A.generation = 99;
  assert.equal(adapter.read().slots.A.generation, 1);
});

test("boot supervisor enters bounded safe mode", () => {
  assert.deepEqual(evaluateBootSupervisor({consecutiveBootFailures: 0, hasBootableConfig: true}), {mode: "NORMAL", reason: null, boundedFailureCount: 0});
  assert.deepEqual(evaluateBootSupervisor({consecutiveBootFailures: 9, hasBootableConfig: true}), {mode: "SAFE_MODE", reason: "BOOT_LOOP", boundedFailureCount: 3});
  assert.deepEqual(evaluateBootSupervisor({consecutiveBootFailures: 1, hasBootableConfig: false}), {mode: "SAFE_MODE", reason: "CONFIG_UNAVAILABLE", boundedFailureCount: 1});
});

test("invalid current config is rejected before any slot write", async () => {
  const {configs, stationIds} = await fixtures();
  const storage = {slots: {A: null, B: null}};
  assert.throws(() => applyAtomicWrite(storage, {...configs.currentA, volume: 101}, WritePhases.AFTER_COMMIT, 1000, stationIds), /invalid current config/);
  assert.deepEqual(storage, {slots: {A: null, B: null}});
});

test("settings survive restart through alternating A/B slots", async () => {
  const {stationIds} = await fixtures();
  const values = new Map();
  const backingStore = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); }
  };
  let clock = 1000;
  const options = {
    backingStore,
    allowedStationIds: stationIds,
    defaultConfig: createDefaultDeviceConfig(stationIds[0]),
    now: () => clock++
  };
  const firstSession = createSettingsStore(options);
  assert.equal(firstSession.load().theme, "dark");
  assert.deepEqual(firstSession.load().city, {mode: "AUTO_APPROXIMATE", label: null});
  assert.equal(firstSession.load().display.screensaverEnabled, true);
  firstSession.save({locale: "en", volume: 75, brightness: 50, theme: "light", nowPlayingVariant: "glance", display: {screensaverEnabled: false, screensaverMode: "orbit", screensaverDelaySeconds: 300, displayOffEnabled: true, displayOffDelaySeconds: 3600}});
  const secondSession = createSettingsStore(options);
  const restored = secondSession.load();
  assert.deepEqual(
    {locale: restored.locale, volume: restored.volume, brightness: restored.brightness, theme: restored.theme, nowPlayingVariant: restored.nowPlayingVariant},
    {locale: "en", volume: 75, brightness: 50, theme: "light", nowPlayingVariant: "glance"}
  );
  assert.deepEqual(restored.display, {screensaverEnabled: false, screensaverMode: "orbit", screensaverDelaySeconds: 300, displayOffEnabled: true, displayOffDelaySeconds: 3600});
  const storage = JSON.parse(values.values().next().value);
  assert.equal(selectBootConfig(storage, stationIds).result.selectedSlotId, "B");
});

test("all generated boot traces pass schema and expose no payload or credential", async () => {
  const [fixture, schema] = await Promise.all([
    readJson("../ui-contract/fixtures/persistence-traces.json"),
    readJson("../ui-contract/schemas/boot-selection.schema.json")
  ]);
  assert.equal(fixture.traces.length, 9);
  for (const trace of fixture.traces) {
    assert.deepEqual(validateSchema(schema, trace.boot), [], trace.scenarioId);
    assert.doesNotMatch(JSON.stringify(trace), /payloadText|wifi:|bt:|password|ssid|https?:\/\//i);
  }
  assert.deepEqual(fixture.traces.reduce((counts, trace) => ({...counts, [trace.boot.status]: (counts[trace.boot.status] || 0) + 1}), {}), {BOOTABLE: 7, SAFE_MODE: 2});
});
