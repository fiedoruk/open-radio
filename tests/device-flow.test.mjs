import test from "node:test";
import assert from "node:assert/strict";
import {DeviceFlow} from "../gui-lab/device-flow.mjs";
import {createDefaultDeviceConfig, createSettingsStore} from "../persistence/settings-store.mjs";

const stationIds = Array.from({length: 9}, (_, index) => `station-${index}`);
const stationTransports = ["MP3", "HLS", "MP3", "MP3", "MP3", "MP3", "MP3", "MP3", "MP3"];
const tracks = Array.from({length: 9}, (_, index) => `Track ${index}`);
const defaultConfig = {
  preferredStationId: stationIds[0], volume: 42, brightness: 75, theme: "dark", locale: "pl", nowPlayingVariant: "editorial", onboardingComplete: true, bluetoothDeviceRef: null,
  display: {screensaverEnabled: true, screensaverMode: "pulse", screensaverDelaySeconds: 30, displayOffEnabled: true, displayOffDelaySeconds: 900}
};
const createFlow = options => new DeviceFlow({config: structuredClone(defaultConfig), stationIds, stationTransports, tracks, ...options});

test("unsupported transport is a real state with firmware hitboxes", () => {
  const flow = createFlow();
  flow.tap(160, 210, 10);
  flow.tap(124, 68, 20);
  assert.equal(flow.state.stationIndex, 1);
  assert.equal(flow.state.screen, "unsupported");
  flow.tap(160, 210, 30);
  assert.equal(flow.state.screen, "stations");
  flow.tap(88, 48, 40);
  assert.equal(flow.state.screen, "now-playing-editorial");
});

test("Wi-Fi portal and Bluetooth lifecycle match UiController", () => {
  const writes = [];
  const flow = createFlow({saveSettings: patch => writes.push(structuredClone(patch))});
  flow.tap(280, 40, 10);
  flow.tap(20, 60, 20);
  flow.tap(160, 210, 30);
  assert.equal(flow.state.wifiPortalActive, true);
  assert.deepEqual(flow.consumeConnectivityAction(), {type: "wifi-portal", active: true});
  flow.tap(280, 10, 40);
  flow.tap(200, 60, 50);
  assert.equal(flow.state.screen, "bluetooth-pairing");
  flow.tap(160, 210, 60);
  assert.equal(flow.state.bluetoothState, "scanning");
  assert.deepEqual(flow.consumeConnectivityAction(), {type: "bluetooth-scan"});
  flow.setBluetoothState("found", "Xiaomi Sound Pocket");
  assert.equal(flow.state.bluetoothDeviceRef, null);
  flow.setBluetoothState("connecting", "Xiaomi Sound Pocket");
  assert.equal(flow.state.bluetoothDeviceRef, null);
  flow.setBluetoothState("connected", "Xiaomi Sound Pocket");
  assert.equal(flow.state.bluetoothDeviceRef, "bt:xiaomi-sound-pocket");
  assert.deepEqual(writes.at(-1), {bluetoothDeviceRef: flow.state.bluetoothDeviceRef});
});

test("healthy configured startup discovers Bluetooth automatically when no peer is remembered", () => {
  const flow = createFlow();
  assert.equal(flow.startAutomaticConnectivity(), true);
  assert.equal(flow.state.bluetoothState, "scanning");
  assert.deepEqual(flow.consumeConnectivityAction(), {type: "bluetooth-scan"});

  const remembered = createFlow({config: {
    ...structuredClone(defaultConfig),
    bluetoothDeviceRef: "bt:trusted-speaker"
  }});
  assert.equal(remembered.startAutomaticConnectivity(), false);
  assert.equal(remembered.consumeConnectivityAction(), null);
});

test("Wi-Fi setup cannot be closed while the device is offline", () => {
  const flow = createFlow();
  flow.state.wifiOnline = false;
  flow.state.wifiPortalActive = true;
  assert.equal(flow.toggleWifiPortal(), false);
  assert.equal(flow.state.wifiPortalActive, true);
  assert.equal(flow.consumeConnectivityAction(), null);
});

test("first-run Wi-Fi gate cannot be skipped by touch or projected hardware buttons", () => {
  const flow = createFlow({config: {...structuredClone(defaultConfig), onboardingComplete: false, wifiOnline: false}});
  assert.equal(flow.state.screen, "wifi-status");
  flow.state.wifiOnline = false;
  flow.tap(200, 210, 10);
  assert.equal(flow.state.screen, "wifi-status");
  flow.hardwareButton("b", 20);
  assert.equal(flow.state.screen, "wifi-status");
  flow.hardwareButton("c", 30);
  assert.equal(flow.state.screen, "wifi-status");
  flow.state.wifiOnline = true;
  flow.tap(200, 210, 40);
  assert.equal(flow.state.screen, "market");
});

test("connected Bluetooth demo persists through the real settings contract", () => {
  const values = new Map();
  const backingStore = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const store = createSettingsStore({
    backingStore,
    allowedStationIds: stationIds,
    defaultConfig: createDefaultDeviceConfig(stationIds[0]),
    now: () => 1000
  });
  const flow = new DeviceFlow({
    config: store.load(), stationIds, stationTransports, tracks,
    saveSettings: patch => store.save(patch)
  });
  flow.setBluetoothState("connected", "Xiaomi Sound Pocket");
  assert.equal(store.load().bluetoothDeviceRef, "bt:xiaomi-sound-pocket");
});

test("Bluetooth error remains retryable and never remembers a failed device", () => {
  const writes = [];
  const flow = createFlow({saveSettings: patch => writes.push(structuredClone(patch))});
  flow.setBluetoothState("error", "");
  assert.equal(flow.state.bluetoothDeviceRef, null);
  assert.equal(writes.length, 0);
  flow.state.screen = "bluetooth-pairing";
  flow.tap(160, 210, 10);
  assert.equal(flow.state.bluetoothState, "scanning");
});

test("Bluetooth connected without a device identity is not remembered", () => {
  const writes = [];
  const flow = createFlow({saveSettings: patch => writes.push(structuredClone(patch))});
  flow.setBluetoothState("connected", "");
  assert.equal(flow.state.bluetoothDeviceRef, null);
  assert.equal(writes.length, 0);
});

test("idle ticks enter screensaver and display-off with shared wake timing", () => {
  const flow = createFlow();
  assert.equal(flow.tick(29999), false);
  flow.tick(30000);
  assert.equal(flow.state.screen, "screensaver-pulse");
  flow.tick(30083);
  assert.equal(flow.state.animationFrame, 1);
  flow.hold(10, 10, 30100);
  assert.equal(flow.state.screen, "now-playing-editorial");
  flow.tick(900000);
  assert.equal(flow.state.screen, "screensaver-pulse");
  flow.tick(930100);
  assert.equal(flow.state.screen, "display-off");
  flow.swipe(160, -60, 0, 930110);
  assert.equal(flow.state.screen, "now-playing-editorial");
  flow.tap(10, 10, 930120);
  assert.equal(flow.state.screen, "now-playing-editorial");
});



test("system settings expose network and display controls", () => {
  const flow = createFlow();
  flow.tap(280, 40, 10);
  flow.swipe(100, -60, 0, 20);
  flow.tap(200, 60, 30);
  assert.equal(flow.state.screen, "wifi-status");
  flow.setScreen("settings-system");
  flow.tap(260, 210, 50);
  assert.equal(flow.state.screen, "settings-display");
});

test("secure reset requires two touches and emits one local erase action", () => {
  const flow = createFlow();
  flow.setScreen("settings-system");
  // index = row*2 + column; usuniecie kafla Ulubionych przesunelo bezpieczny
  // reset z indeksu 5 na 4, czyli z prawej kolumny do lewej
  flow.tap(100, 150, 10);
  assert.equal(flow.state.confirmDelete, true);
  assert.equal(flow.consumeConnectivityAction(), null);
  flow.tap(100, 150, 20);
  assert.deepEqual(flow.consumeConnectivityAction(), {type: "secure-reset"});
});

test("Core2 TouchA TouchB and TouchC mirror firmware shortcuts", () => {
  const flow = createFlow();
  flow.hardwareButton("c", 10);
  assert.equal(flow.state.stationIndex, 1);
  assert.equal(flow.state.screen, "unsupported");
  flow.hardwareButton("b", 20);
  assert.equal(flow.state.screen, "stations");
  flow.hardwareButton("b", 30);
  assert.equal(flow.state.screen, "stations");
  // C maps to tap (280, 210); without the Favorites tile there is no hitbox there
  flow.hardwareButton("c", 40);
  assert.equal(flow.state.screen, "stations");
  flow.hardwareButton("a", 50);
  assert.equal(flow.state.screen, "stations");
});

test("console tile requests the browser window and shows the address screen", () => {
  const flow = createFlow();
  flow.setScreen("settings-system");
  // index = row*2 + column; kafel Konsoli siedzi na indeksie 5 (prawa kolumna,
  // trzeci rzad) — lustro UiController::activateSystem
  flow.tap(200, 150, 10);
  assert.equal(flow.state.screen, "wifi-status");
  assert.deepEqual(flow.consumeConnectivityAction(), {type: "console-session"});
});
