import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {contrastRatio, validateGuiContract} from "../scripts/validate-gui-contract.mjs";

const readText = relative => readFile(new URL(relative, import.meta.url), "utf8");
const readJson = async relative => JSON.parse(await readText(relative));

test("pixel GUI contract passes geometry, asset and identity gates", async () => {
  const result = await validateGuiContract();
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
  assert.equal(result.stations, 9);
  assert.equal(result.icons, 21);
  assert.equal(result.logos, 1);
  assert.equal(result.logoVariants, 3);
});

test("emulator exposes exactly one unscaled 320x240 device framebuffer", async () => {
  const [html, css] = await Promise.all([readText("../gui-lab/index.html"), readText("../gui-lab/styles.css")]);
  assert.equal((html.match(/<canvas[^>]+width="320" height="240"/g) || []).length, 1);
  assert.match(css, /#device-frame[\s\S]*width: 320px;[\s\S]*height: 240px;/);
  assert.match(css, /image-rendering: pixelated/);
  assert.doesNotMatch(`${html}\n${css}`, /data-render-mode|data-preview-scale|transform:\s*scale|zoom:|aspect-ratio/);
  assert.doesNotMatch(html, /RGB565 · urządzenie|Firmware C\+\+|Projekt SVG|<svg/);
});

test("emulator paints only the canonical C++ RGB565 Inter path", async () => {
  const [app, preview] = await Promise.all([readText("../gui-lab/app.mjs"), readText("../gui-lab/rgb565-preview.mjs")]);
  assert.match(app, /renderPpmAsRgb565/);
  assert.match(app, /C\+\+ → RGB565 · 320×240 · Inter 600/);
  assert.match(app, /result\.renderer !== "cpp-rgb565-inter"/);
  assert.match(preview, /X-Open-Radio-Truncated/);
  assert.doesNotMatch(`${app}\n${preview}`, /renderSvgAsRgb565|loadSvgImage|device-light|device-dark/);
});

test("Inter is bundled, licensed and generated without runtime download", async () => {
  const [contract, brand, source, license] = await Promise.all([
    readJson("../ui-contract/gui/core2-pixel-system.v1.json"),
    readJson("../brand/brand-concepts.v1.json"),
    readText("../third_party/fonts/inter/SOURCE.md"),
    readText("../third_party/fonts/inter/OFL.txt")
  ]);
  assert.equal(contract.typography.firmwareFamily, "Inter 600");
  assert.equal(contract.typography.coverage, "ASCII_LATIN1_LATIN_EXTENDED_A_SELECTED_PUNCTUATION");
  assert.equal(contract.typography.unsupportedScriptPolicy, "VISIBLE_FALLBACK_FUTURE_BUDGETED_ATLAS_PACK");
  assert.equal(contract.typography.runtimeDownload, false);
  assert.equal(contract.typography.license, "OFL-1.1");
  assert.deepEqual(brand.typography, {strategy: "BUNDLED_OFL_ATLAS", family: "Inter", weight: 600, license: "OFL-1.1", runtimeDownload: false});
  assert.match(source, /4989b125924991b90d05b2d16e0e388c48f7d5bb8b30539bbf9c755278d0ccaf/);
  assert.match(license, /SIL OPEN FONT LICENSE Version 1.1/);
});

test("touch flow includes station navigation settings and edge back gesture", async () => {
  const [app, deviceFlow] = await Promise.all([readText("../gui-lab/app.mjs"), readText("../gui-lab/device-flow.mjs")]);
  assert.match(app, /new DeviceFlow/);
  for (const behavior of ["tapSettings", "activateQuick", "activateSystem", "activateDisplay", "hardwareButton", "changeStation", "startX <= 24"]) assert.match(deviceFlow, new RegExp(behavior.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const behavior of ["pointerdown", "pointerup"]) assert.match(app, new RegExp(behavior));
  assert.match(deviceFlow, /Math\.abs\(deltaX\) < 28/);
  assert.match(app, /elapsed >= 500/);
});

test("connectivity controls expose truthful Wi-Fi and Bluetooth states", async () => {
  const [app, deviceFlow, renderer] = await Promise.all([
    readText("../gui-lab/app.mjs"),
    readText("../gui-lab/device-flow.mjs"),
    readText("../renderer/src/renderer.cpp")
  ]);
  for (const state of ["idle", "scanning", "found", "connecting", "connected", "error"]) {
    assert.match(deviceFlow, new RegExp(`\\"${state}\\"`));
  }
  assert.match(deviceFlow, /status === "connected"[\s\S]*saveSettings/);
  assert.match(deviceFlow, /toggleWifiPortal/);
  assert.match(app, /RF demo/);
  assert.match(app, /bluetoothState: state\.bluetoothState/);
  assert.match(renderer, /OpenRadio-Setup/);
  assert.match(renderer, /BluetoothState::error/);
});

test("emulator mockup preserves measured Core2 proportions and exposes three touch buttons", async () => {
  const [html, css, app] = await Promise.all([readText("../gui-lab/index.html"), readText("../gui-lab/styles.css"), readText("../gui-lab/app.mjs")]);
  assert.match(html, /class="core2-shell"/);
  assert.equal((html.match(/data-device-button=/g) || []).length, 3);
  assert.match(css, /\.core2-shell[\s\S]*width: 429px;[\s\S]*height: 429px;/);
  assert.match(css, /#device-frame[\s\S]*left: 38px;[\s\S]*top: 79px;/);
  assert.match(app, /flow\.hardwareButton/);
});

test("home variant is sent to the C++ renderer and visibly changes settings", async () => {
  const [app, server] = await Promise.all([readText("../gui-lab/app.mjs"), readText("../scripts/serve-simulator.mjs")]);
  assert.match(app, /variant: state\.variant/);
  assert.match(server, /"--variant", variant, "--screen", screen/);
  assert.match(server, /\["editorial", "glance"\]\.includes\(variant\)/);
});


test("all display settings and four screensavers are clickable", async () => {
  const [app, deviceFlow, experience] = await Promise.all([readText("../gui-lab/app.mjs"), readText("../gui-lab/device-flow.mjs"), readJson("../ui-contract/gui/now-playing-experience.v1.json")]);
  assert.deepEqual(experience.screensaver.modes, ["pulse", "bars", "orbit", "cat"]);
  assert.equal(experience.screensaver.maximumFramesPerSecond, 12);
  assert.equal(experience.screensaver.hardwareStatus, "NOT_MEASURED");
  for (const setting of ["screensaverEnabled", "screensaverDelaySeconds", "screensaverMode", "displayOffEnabled", "displayOffDelaySeconds"]) assert.match(deviceFlow, new RegExp(setting));
  assert.match(app, /setInterval[\s\S]*83/);
});

test("dark B remains default while light stays reachable on-device", async () => {
  const [contract, deviceFlow] = await Promise.all([readJson("../ui-contract/gui/core2-pixel-system.v1.json"), readText("../gui-lab/device-flow.mjs")]);
  assert.equal(contract.defaultTheme, "dark");
  assert.deepEqual(contract.availableThemes, ["dark", "light"]);
  assert.match(deviceFlow, /state\.theme === "dark" \? "light" : "dark"/);
});

test("light and dark text contrast exceeds the normal-text target", async () => {
  const contract = await readJson("../ui-contract/gui/core2-pixel-system.v1.json");
  for (const theme of Object.values(contract.themes)) {
    assert.ok(contrastRatio(theme.text, theme.canvas) >= 4.5);
    assert.ok(contrastRatio(theme.muted, theme.surface) >= 4.5);
  }
});

test("station identity stays original and official artwork stays unbundled", async () => {
  const manifest = await readJson("../ui-contract/gui/station-identities.v1.json");
  assert.equal(manifest.runtimeFetch, "DISABLED");
  assert.equal(manifest.officialArtworkPolicy, "disabled-project-original-identity-only");
  for (const station of manifest.stations) {
    assert.ok(contrastRatio(station.onAccent, station.accent) >= 4.5, station.id);
    assert.equal(station.officialArtwork.status, "NOT_BUNDLED");
    assert.equal(station.officialArtwork.permission, "NOT_REQUESTED_BY_APP");
  }
});

test("Signal Cube A2 keeps positive negative mono and micro assets", async () => {
  const [brand, board] = await Promise.all([readJson("../brand/brand-concepts.v1.json"), readText("../gui-lab/brand-a.html")]);
  const signalCube = brand.concepts[0];
  assert.equal(brand.selectedLogo, "signal-cube");
  assert.equal(brand.interfacePalette.primaryBlue, "#3689FF");
  assert.deepEqual(Object.keys(signalCube.variants), ["negative", "monochrome", "micro"]);
  for (const asset of Object.values(signalCube.variants)) assert.match(board, new RegExp(asset.replaceAll(".", "\\.")));
});

test("emulator explicitly refuses unmeasured hardware claims", async () => {
  const html = await readText("../gui-lab/index.html");
  assert.match(html, /NIEZMIERZONE/);
  assert.match(html, /Fizyczna jasność, opóźnienia panelu, kąty widzenia i czułość dotyku/);
});
