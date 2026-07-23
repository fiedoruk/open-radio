import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createInitialState} from "../simulator/state-machine.mjs";
import {createUiSnapshot, validateUiCommand, validateUiSnapshot} from "../simulator/ui-contract.mjs";
import {createUiController} from "../simulator/controller.mjs";
import {validateSchema} from "./helpers/json-schema-lite.mjs";

const readJson = async relative => JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));
const loadSources = async () => {
  const [catalog, pl, en] = await Promise.all([
    readJson("../ui-contract/catalog/stations.pl.json"),
    readJson("../ui-contract/i18n/pl.json"),
    readJson("../ui-contract/i18n/en.json")
  ]);
  return {catalog, dictionaries: {pl, en}};
};

test("JSON Schema documents identify UiSnapshot and UiCommand", async () => {
  const [snapshotSchema, commandSchema] = await Promise.all([
    readJson("../ui-contract/schemas/ui-snapshot.schema.json"),
    readJson("../ui-contract/schemas/ui-command.schema.json")
  ]);
  assert.equal(snapshotSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(snapshotSchema.title, "UiSnapshot");
  assert.equal(commandSchema.title, "UiCommand");
  assert.ok(commandSchema.oneOf.length >= 10);
  assert.deepEqual(validateSchema(commandSchema, {type: "SELECT_STATION", index: 8}), []);
  assert.ok(validateSchema(commandSchema, {type: "SELECT_STATION", index: 9}).length > 0);
  assert.ok(validateSchema(commandSchema, {type: "ERASE_DEVICE"}).length > 0);
  assert.deepEqual(validateSchema(commandSchema, {type: "SET_THEME", theme: "light"}), []);
});

test("valid snapshot projection passes the runtime contract", async () => {
  const {catalog, dictionaries} = await loadSources();
  const snapshot = createUiSnapshot(createInitialState({configured: true}), catalog, dictionaries);
  assert.deepEqual(validateUiSnapshot(snapshot), {valid: true, errors: []});
  const schema = await readJson("../ui-contract/schemas/ui-snapshot.schema.json");
  assert.deepEqual(validateSchema(schema, snapshot), []);
  assert.ok(validateSchema(schema, {...snapshot, volume: 101}).length > 0);
  assert.equal(snapshot.copy.settings, dictionaries.pl.settings);
  assert.equal(snapshot.stations.length, 9);
});

test("malformed snapshots and unknown commands are rejected", async () => {
  const {catalog, dictionaries} = await loadSources();
  const snapshot = {...createUiSnapshot(createInitialState({configured: true}), catalog, dictionaries), volume: 101};
  assert.equal(validateUiSnapshot(snapshot).valid, false);
  assert.equal(validateUiSnapshot({...snapshot, volume: 50, city: "", diagnostics: null}).valid, false);
  assert.equal(validateUiCommand({type: "ERASE_DEVICE"}).valid, false);
  assert.equal(validateUiCommand({type: "SELECT_STATION", index: 9}).valid, false);
  assert.equal(validateUiCommand({type: "NAVIGATE", screen: "SECRET", extra: true}).valid, false);
});

test("controller rejects invalid commands before reducer execution", async () => {
  const {catalog, dictionaries} = await loadSources();
  const controller = createUiController({catalog, dictionaries});
  assert.throws(() => controller.dispatch({type: "SET_LOCALE", locale: "de"}), /Rejected UiCommand/);
  const snapshot = controller.dispatch({type: "WIFI_CONFIGURED"});
  assert.equal(snapshot.screen, "FIRST_SOUND");
  assert.equal(snapshot.city, "Białystok · AUTO");
  assert.equal(snapshot.copy.bluetoothTitle, dictionaries.pl.bluetoothTitle);
});

test("controller restores and persists display settings", async () => {
  const {catalog, dictionaries} = await loadSources();
  const saved = [];
  const settingsStore = {
    load: () => ({locale: "en", preferredStationId: "radio-eska", volume: 75, brightness: 50, theme: "light"}),
    save: patch => saved.push(patch)
  };
  const controller = createUiController({catalog, dictionaries, configured: true, settingsStore});
  assert.deepEqual(
    (({locale, stationIndex, volume, brightness, theme}) => ({locale, stationIndex, volume, brightness, theme}))(controller.snapshot()),
    {locale: "en", stationIndex: 4, volume: 75, brightness: 50, theme: "light"}
  );
  controller.dispatch({type: "SET_BRIGHTNESS", brightness: 100});
  controller.dispatch({type: "SET_THEME", theme: "dark"});
  assert.deepEqual(saved, [{brightness: 100}, {theme: "dark"}]);
});

test("fixture matrix covers every system state, locale and output", async () => {
  const matrix = await readJson("../ui-contract/fixtures/ui-matrix.json");
  const expected = new Set();
  for (const systemState of matrix.dimensions.systemState) for (const locale of matrix.dimensions.locale) for (const output of matrix.dimensions.output) expected.add(`${systemState}|${locale}|${output}`);
  for (const fixture of matrix.fixtures) expected.delete(`${fixture.systemState}|${fixture.locale}|${fixture.output}`);
  assert.equal(matrix.fixtures.length,
    matrix.dimensions.systemState.length * matrix.dimensions.locale.length * matrix.dimensions.output.length);
  assert.deepEqual([...expected], []);
});
