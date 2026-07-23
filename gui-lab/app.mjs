import {createDefaultDeviceConfig, createSettingsStore} from "../persistence/settings-store.mjs";
import {ScreensaverModes} from "../display/display-policy.mjs";
import {DeviceFlow} from "./device-flow.mjs";
import {renderPpmAsRgb565} from "./rgb565-preview.mjs";

const [catalog, runtimeCatalog, experience] = await Promise.all([
  fetch("../ui-contract/catalog/stations.pl.json").then(response => response.json()),
  fetch("../ui-contract/catalog/station-catalog.v1.json").then(response => response.json()),
  fetch("../ui-contract/gui/now-playing-experience.v1.json").then(response => response.json())
]);

const canvas = document.querySelector("#device-frame");
const status = document.querySelector("#device-status");
const stationIds = catalog.stations.map(station => station.id);
const settingsStorageKey = "open-radio-core2.device-config.v3";
const settingsStore = createSettingsStore({
  backingStore: localStorage,
  allowedStationIds: stationIds,
  defaultConfig: createDefaultDeviceConfig(stationIds[0]),
  key: settingsStorageKey
});
const setupAccessCode = "OR-A1B2C3D4E5F6"; // gitleaks:allow -- simulator fixture, never a real credential.


const flow = new DeviceFlow({
  config: settingsStore.load(),
  stationIds,
  stationTransports: catalog.stations.map((station, index) =>
    runtimeCatalog.stations[index]?.firmwareSupport === "MODEL_READY"
      ? station.transport
      : "UNSUPPORTED"),
  tracks: catalog.stations.map(station => experience.demo.tracks[station.id] ?? ""),
  nowMs: performance.now(),
  saveSettings: patch => settingsStore.save(patch)
});
const state = flow.state;

let bluetoothDemoGeneration = 0;
async function handleConnectivityAction() {
  const action = flow.consumeConnectivityAction();
  if (action?.type === "secure-reset") {
    localStorage.removeItem(settingsStorageKey);
    window.location.reload();
    return;
  }
  if (action?.type !== "bluetooth-scan") return;
  const generation = ++bluetoothDemoGeneration;
  const advance = (delay, stateName, candidate = "") => setTimeout(() => {
    if (generation !== bluetoothDemoGeneration) return;
    flow.setBluetoothState(stateName, candidate);
    void render();
  }, delay);
  advance(650, "found", "Compatible A2DP speaker");
  advance(1050, "connecting", "Compatible A2DP speaker");
  advance(1750, "connected", "Compatible A2DP speaker");
}

let renderGeneration = 0;
async function render() {
  const generation = ++renderGeneration;
  const parameters = new URLSearchParams({
    screen: state.screen, theme: state.theme, locale: state.locale,
    station: String(state.stationIndex), volume: String(state.volume), brightness: String(state.brightness),
    output: "local", degraded: "false", track: flow.currentTrack(),
    setupCode: setupAccessCode,
    wifiOnline: String(state.wifiOnline),
    wifiPortal: String(state.wifiPortalActive),
    bluetoothState: state.bluetoothState,
    bluetoothCandidate: state.bluetoothCandidate,
    bluetoothRemembered: String(state.bluetoothDeviceRef !== null),
    variant: state.variant, frame: String(state.animationFrame), saverMode: String(Math.max(0, ScreensaverModes.indexOf(state.display.screensaverMode))),
    confirmDelete: String(state.confirmDelete),
  });
  try {
    const result = await renderPpmAsRgb565(`../api/renderer-frame?${parameters}`, canvas);
    if (generation !== renderGeneration) return;
    if (result.renderer !== "cpp-rgb565-inter") throw new Error(`Unexpected renderer: ${result.renderer}`);
    status.textContent = `C++ → RGB565 · 320×240 · Inter 600 · ${state.screen} · RF demo · ${result.hash} · kontrolowane elipsy: ${result.truncated}`;
    window.__openRadioDeviceQa = {screen: state.screen, state: structuredClone(state), ...result};
  } catch (error) {
    if (generation === renderGeneration) status.textContent = `BŁĄD RENDERERA · ${error.message}`;
  }
}

let pointerStart = null;
canvas.addEventListener("pointerdown", event => {
  const bounds = canvas.getBoundingClientRect();
  pointerStart = {x: event.clientX - bounds.left, y: event.clientY - bounds.top, time: performance.now()};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointerup", event => {
  if (pointerStart === null) return;
  const bounds = canvas.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  const nowMs = performance.now();
  const elapsed = nowMs - pointerStart.time;
  const deltaX = x - pointerStart.x;
  const deltaY = y - pointerStart.y;
  const start = pointerStart;
  pointerStart = null;
  if (Math.abs(deltaX) >= 28 && Math.abs(deltaX) >= Math.abs(deltaY)) flow.swipe(start.x, deltaX, deltaY, nowMs);
  else if (elapsed >= 500) flow.hold(start.x, start.y, nowMs);
  else flow.tap(start.x, start.y, nowMs);
  void render();
  void handleConnectivityAction();
});
canvas.addEventListener("pointercancel", () => { pointerStart = null; });
canvas.addEventListener("contextmenu", event => event.preventDefault());
canvas.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    flow.swipe(160, event.key === "ArrowLeft" ? -40 : 40, 0, performance.now());
    void render();
  }
});

for (const button of document.querySelectorAll("[data-device-button]")) {
  button.addEventListener("click", () => {
    flow.hardwareButton(button.dataset.deviceButton, performance.now());
    void render();
  });
}

setInterval(() => {
  if (flow.tick(performance.now(), true)) void render();
}, 83);

flow.startAutomaticConnectivity();
void render();
void handleConnectivityAction();
