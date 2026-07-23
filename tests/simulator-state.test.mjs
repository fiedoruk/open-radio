import test from "node:test";
import assert from "node:assert/strict";
import {createInitialState, reduceState, Screens, SystemStates} from "../simulator/state-machine.mjs";

const stations = [
  {transport: "MP3"}, {transport: "MP3"}, {transport: "MP3"},
  {transport: "HLS"}, {transport: "MP3"}, {transport: "MP3"},
  {transport: "MP3"}, {transport: "HLS"}, {transport: "HLS"}
];

test("first boot requires Wi-Fi and nothing else", () => {
  const state = createInitialState();
  assert.equal(state.screen, Screens.WIFI);
  assert.equal(state.systemState, SystemStates.CONFIG_REQUIRED);
  assert.equal(state.output, "LOCAL");
});

test("Wi-Fi configuration starts audio and automatic location before Bluetooth", () => {
  const state = reduceState(createInitialState(), {type: "WIFI_CONFIGURED"});
  assert.equal(state.screen, Screens.FIRST_SOUND);
  assert.equal(state.systemState, SystemStates.PLAYING);
  assert.equal(state.output, "LOCAL");
  assert.equal(state.statusMessage, "FIRST_SOUND");
  assert.equal(state.city, "Białystok · AUTO");
});

test("automatic location requires no city step and Bluetooth can be skipped", () => {
  let state = reduceState(createInitialState(), {type: "WIFI_CONFIGURED"});
  state = reduceState(state, {type: "CONTINUE_ONBOARDING"});
  assert.equal(state.screen, Screens.BLUETOOTH);
  state = reduceState(state, {type: "SKIP_BLUETOOTH"});
  assert.equal(state.screen, Screens.NOW_PLAYING);
  assert.equal(state.city, "Białystok · AUTO");
  assert.equal(state.output, "LOCAL");
  assert.equal(state.setupComplete, true);
});

test("automatic location can be corrected later from settings", () => {
  let state = reduceState(createInitialState({configured: true}), {type: "NAVIGATE", screen: Screens.CITY});
  state = reduceState(state, {type: "SELECT_CITY", city: "Warszawa"});
  assert.equal(state.screen, Screens.SETTINGS);
  assert.equal(state.city, "Warszawa");
});

test("Bluetooth loss keeps playing locally", () => {
  let state = createInitialState({configured: true});
  state = reduceState(state, {type: "SELECT_SPEAKER", speaker: "Test Speaker"});
  state = reduceState(state, {type: "BLUETOOTH_LOST"});
  assert.equal(state.output, "LOCAL");
  assert.equal(state.systemState, SystemStates.DEGRADED_PLAYING);
  assert.equal(state.recoveryReason, "BLUETOOTH");
});

test("Bluetooth loss without a remembered speaker is a no-op", () => {
  const state = createInitialState({configured: true});
  assert.equal(reduceState(state, {type: "BLUETOOTH_LOST"}), state);
});

test("unsupported station selection never claims playback", () => {
  const state = reduceState(createInitialState({configured: true}),
    {type: "SELECT_STATION", index: 3}, stations);
  assert.equal(state.systemState, SystemStates.UNSUPPORTED_STATION);
  assert.equal(state.recoveryReason, "STREAM");
  assert.equal(state.statusMessage, "UNSUPPORTED_STATION");
});

test("next station and automatic fallback skip unsupported formats", () => {
  const initial = {...createInitialState({configured: true}), stationIndex: 2,
    requestedStationIndex: 2};
  const next = reduceState(initial, {type: "NEXT_STATION"}, stations);
  assert.equal(next.stationIndex, 4);
  const fallback = reduceState(initial, {type: "STATION_FAILED"}, stations);
  assert.equal(fallback.stationIndex, 4);
});

test("network and Bluetooth recovery cannot promote unsupported HLS to playing", () => {
  let state = reduceState(createInitialState({configured: true}),
    {type: "SELECT_STATION", index: 3}, stations);
  state = reduceState(state, {type: "WIFI_LOST"}, stations);
  state = reduceState(state, {type: "WIFI_RECOVERED"}, stations);
  assert.equal(state.systemState, SystemStates.UNSUPPORTED_STATION);
  state = reduceState(state, {type: "SELECT_SPEAKER", speaker: "Test Speaker"}, stations);
  state = reduceState(state, {type: "BLUETOOTH_LOST"}, stations);
  state = reduceState(state, {type: "BLUETOOTH_RECOVERED"}, stations);
  assert.equal(state.systemState, SystemStates.UNSUPPORTED_STATION);
  assert.equal(state.statusMessage, "UNSUPPORTED_STATION");
});

test("station failure automatically plays next and remembers request", () => {
  const initial = createInitialState({configured: true});
  const state = reduceState(initial, {type: "STATION_FAILED"}, 9);
  assert.equal(state.requestedStationIndex, 0);
  assert.equal(state.stationIndex, 1);
  assert.equal(state.systemState, SystemStates.DEGRADED_PLAYING);
});

test("station recovery returns to the requested station", () => {
  let state = createInitialState({configured: true});
  state = reduceState(state, {type: "STATION_FAILED"}, 9);
  state = reduceState(state, {type: "STATION_RECOVERED"}, 9);
  assert.equal(state.stationIndex, state.requestedStationIndex);
  assert.equal(state.systemState, SystemStates.PLAYING);
});

test("safe mode opens diagnostics and drops network outputs", () => {
  let state = createInitialState({configured: true});
  state = reduceState(state, {type: "SELECT_SPEAKER", speaker: "Test Speaker"});
  state = reduceState(state, {type: "ENTER_SAFE_MODE"});
  assert.equal(state.screen, Screens.DIAGNOSTICS);
  assert.equal(state.systemState, SystemStates.SAFE_MODE);
  assert.equal(state.wifi, "OFFLINE");
  assert.equal(state.bluetooth, "DISCONNECTED");
  assert.equal(state.output, "LOCAL");
});

test("volume is always clamped", () => {
  let state = createInitialState({configured: true});
  state = reduceState(state, {type: "SET_VOLUME", volume: 120});
  assert.equal(state.volume, 100);
  state = reduceState(state, {type: "SET_VOLUME", volume: -10});
  assert.equal(state.volume, 0);
});

test("display preferences are bounded and theme is explicit", () => {
  let state = createInitialState({configured: true});
  state = reduceState(state, {type: "SET_BRIGHTNESS", brightness: 130});
  assert.equal(state.brightness, 100);
  state = reduceState(state, {type: "SET_BRIGHTNESS", brightness: -10});
  assert.equal(state.brightness, 0);
  state = reduceState(state, {type: "SET_THEME", theme: "light"});
  assert.equal(state.theme, "light");
});
