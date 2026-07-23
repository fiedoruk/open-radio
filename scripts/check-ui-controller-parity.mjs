import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import {DeviceFlow} from "../gui-lab/device-flow.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalog = JSON.parse(readFileSync(join(root, "ui-contract/catalog/stations.pl.json"), "utf8"));
const runtimeCatalog = JSON.parse(readFileSync(join(root, "ui-contract/catalog/station-catalog.v1.json"), "utf8"));
const experience = JSON.parse(readFileSync(join(root, "ui-contract/gui/now-playing-experience.v1.json"), "utf8"));
const stationIds = catalog.stations.map(station => station.id);
const stationTransports = catalog.stations.map((station, index) =>
  runtimeCatalog.stations[index]?.firmwareSupport === "MODEL_READY"
    ? station.transport
    : "UNSUPPORTED");
const tracks = catalog.stations.map(station => experience.demo.tracks[station.id] ?? "");
const supportedMask = stationTransports.map(transport => transport === "MP3" ? "1" : "0").join("");
const supportedIndex = stationTransports.findIndex(transport => transport === "MP3");
const alternateIndex = (supportedIndex + 1) % stationIds.length;
if (stationIds.length !== 9 || supportedIndex < 0 ||
    stationTransports.some(transport => transport !== "MP3")) {
  throw new Error("Parity catalog needs nine supported MP3 stations");
}

const baseConfig = overrides => ({
  preferredStationId: stationIds[supportedIndex],
  volume: 42,
  brightness: 75,
  theme: "dark",
  locale: "pl",
  nowPlayingVariant: "editorial",
  onboardingComplete: true,
  bluetoothDeviceRef: null,
  display: {
    screensaverEnabled: true,
    screensaverMode: "pulse",
    screensaverDelaySeconds: 120,
    displayOffEnabled: true,
    displayOffDelaySeconds: 1800
  },
  ...overrides
});

const stationTap = index => ({type: "tap", x: index % 3 * 104 + 20, y: Math.floor(index / 3) * 44 + 68});
const scenarios = [
  {
    name: "volume-and-display-settings",
    config: baseConfig(),
    events: [
      {type: "tap", x: 260, y: 12, nowMs: 10},
      {type: "tap", x: 268, y: 210, nowMs: 20},
      {type: "tap", x: 160, y: 210, nowMs: 30},
      {type: "tap", x: 280, y: 40, nowMs: 40},
      {type: "swipe", startX: 100, deltaX: -60, deltaY: 0, nowMs: 50},
      {type: "tap", x: 200, y: 60, nowMs: 60},
      {type: "tap", x: 160, y: 210, nowMs: 70}
    ]
  },
  {
    name: "settings-preview",
    config: baseConfig(),
    events: [
      {type: "tap", x: 280, y: 40, nowMs: 10},
      {type: "tap", x: 200, y: 100, nowMs: 20},
      {type: "swipe", startX: 100, deltaX: -60, deltaY: 2, nowMs: 30},
      {type: "tap", x: 20, y: 60, nowMs: 40},
      {type: "swipe", startX: 100, deltaX: -60, deltaY: 0, nowMs: 50},
      {type: "tap", x: 200, y: 150, nowMs: 60},
      {type: "tick", nowMs: 200, animationAllowed: true},
      {type: "tap", x: 10, y: 10, nowMs: 210}
    ]
  },
  {
    name: "wifi-city-bluetooth",
    config: baseConfig(),
    events: [
      {type: "tap", x: 280, y: 40, nowMs: 10},
      {type: "tap", x: 20, y: 60, nowMs: 20},
      {type: "tap", x: 160, y: 210, nowMs: 30},
      {type: "tap", x: 280, y: 10, nowMs: 40},
      {type: "tap", x: 200, y: 60, nowMs: 50},
      {type: "tap", x: 160, y: 210, nowMs: 60},
      {type: "bluetooth", status: "found", candidate: "Xiaomi Sound Pocket"},
      {type: "bluetooth", status: "connecting", candidate: "Xiaomi Sound Pocket"},
      {type: "bluetooth", status: "connected", candidate: "Xiaomi Sound Pocket"}
    ]
  },
  {
    name: "bluetooth-onboarding",
    config: baseConfig({onboardingComplete: false}),
    events: [
      {type: "tap", x: 280, y: 40, nowMs: 10},
      {type: "tap", x: 200, y: 60, nowMs: 20},
      {type: "tap", x: 160, y: 210, nowMs: 30},
      {type: "tap", x: 160, y: 210, nowMs: 40},
      {type: "tap", x: 160, y: 80, nowMs: 50}
    ]
  },
  {
    name: "idle-wake",
    config: baseConfig({display: {screensaverEnabled: true, screensaverMode: "bars", screensaverDelaySeconds: 30, displayOffEnabled: true, displayOffDelaySeconds: 900}}),
    events: [
      {type: "tick", nowMs: 30000, animationAllowed: true},
      {type: "tick", nowMs: 30083, animationAllowed: true},
      {type: "hold", x: 10, y: 10, nowMs: 30100},
      {type: "tick", nowMs: 900000, animationAllowed: true},
      {type: "tick", nowMs: 930100, animationAllowed: true},
      {type: "swipe", startX: 160, deltaX: -60, deltaY: 0, nowMs: 930110},
      {type: "tap", x: 10, y: 10, nowMs: 930120},
      {type: "tick", nowMs: 960120, animationAllowed: true}
    ]
  },
  {
    name: "station-swipe",
    config: baseConfig(),
    events: [{type: "swipe", startX: 120, deltaX: -50, deltaY: 0, nowMs: 10}]
  },
  {
    name: "hardware-buttons",
    config: baseConfig(),
    events: [
      {type: "button", button: "c", nowMs: 10},
      {type: "button", button: "b", nowMs: 20},
      {type: "button", button: "b", nowMs: 30},
      {type: "button", button: "a", nowMs: 40}
    ]
  }
];

function beginLine(config) {
  const stationIndex = stationIds.indexOf(config.preferredStationId);
  const display = config.display;
  return `begin ${stationIndex} ${config.volume} ${config.brightness} ${config.theme} ${config.locale} ${config.nowPlayingVariant} ${Number(display.screensaverEnabled)} ${display.screensaverMode} ${display.screensaverDelaySeconds} ${Number(display.displayOffEnabled)} ${display.displayOffDelaySeconds} ${Number(config.onboardingComplete)} ${Number(config.bluetoothDeviceRef !== null)} ${supportedMask} 0`;
}

function eventLine(event) {
  if (event.type === "title") return `title ${event.title}`;
  if (event.type === "tap" || event.type === "hold") return `${event.type} ${event.x} ${event.y} ${event.nowMs}`;
  if (event.type === "swipe") return `swipe ${event.startX} ${event.deltaX} ${event.deltaY} ${event.nowMs}`;
  if (event.type === "button") return `button ${event.button} ${event.nowMs}`;
  if (event.type === "bluetooth") return `bluetooth ${event.status} ${event.candidate ?? ""}`;
  return `tick ${event.nowMs} ${Number(event.animationAllowed)}`;
}

function runJavaScript(scenario) {
  const flow = new DeviceFlow({config: scenario.config, stationIds, stationTransports, tracks});
  const snapshots = [flow.snapshot()];
  for (const event of scenario.events) {
    if (event.type === "tap") flow.tap(event.x, event.y, event.nowMs);
    else if (event.type === "hold") flow.hold(event.x, event.y, event.nowMs);
    else if (event.type === "swipe") flow.swipe(event.startX, event.deltaX, event.deltaY, event.nowMs);
    else if (event.type === "button") flow.hardwareButton(event.button, event.nowMs);
    else if (event.type === "bluetooth") flow.setBluetoothState(event.status, event.candidate ?? "");
    else if (event.type === "tick") flow.tick(event.nowMs, event.animationAllowed);
    else if (event.type === "title") flow.setNowPlayingTitle(event.title);
    snapshots.push(flow.snapshot());
  }
  return snapshots;
}

const build = spawnSync("make", ["-C", "firmware/common", "trace"], {cwd: root, encoding: "utf8"});
if (build.status !== 0) throw new Error(build.stderr || build.stdout || "Failed to build UiController trace");
const traceBinary = join(root, "build/firmware-common/ui-controller-trace");

let compared = 0;
for (const scenario of scenarios) {
  const input = [beginLine(scenario.config), ...scenario.events.map(eventLine)].join("\n") + "\n";
  const result = spawnSync(traceBinary, {cwd: root, input, encoding: "utf8"});
  if (result.status !== 0) throw new Error(result.stderr || `UiController trace failed for ${scenario.name}`);
  const cppSnapshots = result.stdout.trim().split("\n").map(line => JSON.parse(line));
  const jsSnapshots = runJavaScript(scenario);
  assert.equal(cppSnapshots.length, jsSnapshots.length, `${scenario.name} snapshot count`);
  for (let index = 0; index < cppSnapshots.length; index += 1) {
    assert.deepEqual(jsSnapshots[index], cppSnapshots[index], `${scenario.name} step ${index}`);
    compared += 1;
  }
}

process.stdout.write(`PASS ui-controller-parity scenarios=${scenarios.length} snapshots=${compared}\n`);
