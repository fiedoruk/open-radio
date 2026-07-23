import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {OnboardingStages, chooseBluetoothMode, chooseCityMode, createOnboardingState, restartNetworkSelection, selectManualNetwork, selectOnboardingNetwork, submitCredentialLength} from "../network-onboarding/state-machine.mjs";

const readText = relative => readFile(new URL(relative, import.meta.url), "utf8");

test("secured network starts first sound before optional choices", () => {
  let state = createOnboardingState("pl");
  state = selectOnboardingNetwork(state, {id: "secure", security: "WPA2_PSK", captivePortal: false});
  assert.equal(state.stage, OnboardingStages.CREDENTIALS);
  state = submitCredentialLength(state, 12);
  assert.equal(state.stage, OnboardingStages.FIRST_SOUND);
  assert.equal(state.firstSoundStarted, true);
  assert.equal(state.cityMode, "AUTO_APPROXIMATE");
  assert.equal(Object.hasOwn(state, "password"), false);
});

test("remembered secured network starts without requesting its credential again", () => {
  const state = selectOnboardingNetwork(createOnboardingState("pl"), {id: "remembered", security: "WPA2_PSK", captivePortal: false, known: true});
  assert.equal(state.stage, OnboardingStages.FIRST_SOUND);
  assert.equal(state.firstSoundStarted, true);
  assert.equal(state.cityMode, "AUTO_APPROXIMATE");
});

test("a same-phone hotspot can be entered before it is enabled", () => {
  let state = selectManualNetwork(createOnboardingState("pl"));
  assert.equal(state.stage, OnboardingStages.CREDENTIALS);
  assert.equal(state.manualNetwork, true);
  state = submitCredentialLength(state, 12);
  assert.equal(state.stage, OnboardingStages.WAITING_HOTSPOT);
  assert.equal(state.firstSoundStarted, false);
  assert.equal(Object.hasOwn(state, "password"), false);
});

test("short credential never advances or enters state", () => {
  let state = selectOnboardingNetwork(createOnboardingState("en"), {id: "secure", security: "WPA3_SAE", captivePortal: false});
  state = submitCredentialLength(state, 7);
  assert.equal(state.stage, OnboardingStages.CREDENTIALS);
  assert.equal(state.validationError, "CREDENTIAL_LENGTH");
  assert.doesNotMatch(JSON.stringify(state), /secret|password/i);
});

for (const network of [
  {id: "open", security: "OPEN", captivePortal: false},
  {id: "captive", security: "WPA2_PSK", captivePortal: true},
  {id: "unknown", security: "UNKNOWN", captivePortal: false}
]) {
  test(`${network.id} network is blocked from automatic onboarding`, () => {
    const state = selectOnboardingNetwork(createOnboardingState(), network);
    assert.equal(state.stage, OnboardingStages.BLOCKED);
    assert.equal(state.firstSoundStarted, false);
  });
}

test("location starts automatically and can still be disabled before Bluetooth", () => {
  let state = selectOnboardingNetwork(createOnboardingState(), {id: "secure", security: "WPA2_PSK", captivePortal: false});
  state = submitCredentialLength(state, 8);
  assert.equal(state.cityMode, "AUTO_APPROXIMATE");
  state = chooseCityMode(state, "DISABLED");
  assert.equal(state.stage, OnboardingStages.BLUETOOTH);
  assert.equal(state.firstSoundStarted, true);
  state = chooseBluetoothMode(state, "LOCAL_SPEAKER");
  assert.equal(state.stage, OnboardingStages.COMPLETE);
});

test("restart returns to network list without changing locale", () => {
  let state = selectOnboardingNetwork(createOnboardingState("en"), {id: "open", security: "OPEN", captivePortal: false});
  state = restartNetworkSelection(state);
  assert.equal(state.stage, OnboardingStages.NETWORKS);
  assert.equal(state.locale, "en");
});

test("portal source calls only local device routes and does not persist credentials", async () => {
  const [html, app] = await Promise.all([readText("../network-onboarding/index.html"), readText("../network-onboarding/app.mjs")]);
  assert.doesNotMatch(html, /<form[^>]+action=/i);
  assert.doesNotMatch(app, /fetch\(["']https?:|XMLHttpRequest|sendBeacon|localStorage\.setItem|sessionStorage\.setItem/);
  assert.match(app, /fetch\("\/api\/networks"/);
  assert.match(app, /payload\.scanning === true[\s\S]*setTimeout\(\(\) => loadDeviceNetworks/);
  assert.match(app, /fetch\("\/api\/config-form"/);
  assert.match(app, /"X-Open-Radio-CSRF": csrfToken/);
  assert.match(app, /result\.waitingForNetwork === true/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /passwordInput\.value = ""/);
  assert.match(html, /type="password"/);
  assert.match(html, /id="network-ssid"/);
  assert.match(app, /selectManualNetwork/);
});

test("device onboarding access point uses a random displayed WPA2 code", async () => {
  const [runtime, firmware, renderer] = await Promise.all([
    readText("../firmware/public-candidate/src/device_network_runtime.hpp"),
    readText("../firmware/public-candidate/src/main.cpp"),
    readText("../renderer/src/renderer.cpp")
  ]);
  assert.match(runtime, /esp_random\(\)/);
  assert.match(runtime, /WiFi\.softAP\("OpenRadio-Setup", portalPassword_\.data\(\)\)/);
  assert.doesNotMatch(runtime, /WiFi\.softAP\("OpenRadio-Setup"\s*\)/);
  assert.match(runtime, /void registerRoutes\(\)[\s\S]*?if \(routesRegistered_\) return;/);
  // Console session: home-network clients are admitted only while the window
  // is open, the idle window is 15 minutes, and closing the portal must not
  // kill a server the console still needs.
  assert.match(runtime, /consoleActive_ && clientLocal == WiFi\.localIP\(\)/);
  // The page heartbeat bounds a closed tab to a minute of silence, the hard
  // cap bounds the whole window, and saving slots closes the session itself.
  assert.match(runtime, /kConsoleLingerMs = 60U \* 1000U/);
  assert.match(runtime, /kConsoleHardCapMs = 15U \* 60U \* 1000U/);
  assert.match(runtime, /server_\.on\("\/api\/session", HTTP_GET/);
  assert.match(runtime, /consoleCloseAtMs_ = millis\(\) \+ kConsoleSavedCloseMs/);
  // The console QR encodes the raw address (phones do not all resolve .local)
  // and a station pick on the cube ends the session so playback resumes.
  assert.match(firmware, /"%s:\/\/%s\/", "http",\s*\n\s*deviceAddress_\.data\(\)/);
  assert.match(firmware, /if \(consoleSessionActive\) networkRuntime\.stopConsoleSession\(\);/);
  // Audit pins: logo fetching lives on its own task (never the audio loop),
  // follows broadcaster redirects, bounds the TLS handshake's separate clock,
  // always releases the Bluetooth gate, and the console-end tap only fires
  // when the console screen is actually shown (portal takes priority).
  const logoStore = await readText("../firmware/public-candidate/src/logo_store.hpp");
  assert.match(logoStore, /setHandshakeTimeout\(5\)/);
  assert.match(logoStore, /setFollowRedirects\(HTTPC_STRICT_FOLLOW_REDIRECTS\)/);
  assert.match(firmware, /xTaskCreatePinnedToCore\(logoFetchTask, "logo_fetch", 8192, nullptr, 1,\s*\n\s*&logoFetchTaskHandle, 0\)/);
  assert.match(firmware, /logoFetchPending = false;\s*\n\s*logoFetchTaskHandle = nullptr;\s*\n\s*vTaskDelete\(nullptr\)/);
  const controller = await readText("../firmware/common/include/open_radio/ui_controller.hpp");
  assert.match(controller, /consoleActive_ && !wifiPortalActive_ && y >= 184/);
  // The setup portal never idles out on an unprovisioned device — a closed
  // portal there has no on-screen way back and strands the owner on a blank
  // QR square.
  assert.match(runtime, /if \(profileCount_ == 0\) \{\s*\n[\s\S]{0,400}portalIdleDeadlineMs_ = nowMs \+ kPortalIdleTimeoutMs;/);
  // Boot-silence fix: a single profile is not masked on the first timeout and
  // one blind attempt covers a scan that misses a live network.
  assert.match(runtime, /profileCount_ > 1 \|\| consecutiveTimeouts_ >= 2/);
  assert.match(runtime, /candidate = "blind"/);
  // The customer's radio must come up by itself: a single known profile
  // connects directly (no pre-connect scan) and a rejected association is
  // retried after seconds, not after the blanket timeout.
  assert.match(runtime, /candidate=direct/);
  assert.match(runtime, /kEarlyGiveUpMs = 6000/);
  assert.match(runtime, /WL_NO_SSID_AVAIL \|\|\s*\n\s*WiFi\.status\(\) == WL_CONNECT_FAILED/);
  assert.match(runtime, /if \(!consoleActive_\) server_\.stop\(\)/);
  assert.match(runtime, /if \(!WiFi\.softAP\("OpenRadio-Setup", portalPassword_\.data\(\)\)\)/);
  assert.match(runtime, /const auto clientLocal = server_\.client\(\)\.localIP\(\)/);
  assert.match(runtime, /portalActive_ && clientLocal == WiFi\.softAPIP\(\)/);
  assert.match(runtime, /if \(!requirePortalClient\(\)\) return/);
  assert.match(runtime, /server_\.header\("X-Open-Radio-CSRF"\) != portalCsrfToken_\.data\(\)/);
  assert.match(runtime, /server_\.sendHeader\("X-Open-Radio-CSRF", portalCsrfToken_\.data\(\)\)/);
  assert.match(runtime, /bool setPortalEnabled\(bool enabled\)/);
  assert.match(runtime, /bool restartPortal\(\)/);
  assert.match(runtime, /if \(!connected_\) return false/);
  const portalToggle = runtime.match(/bool setPortalEnabled[\s\S]*?\n  }/)?.[0] ?? "";
  assert.doesNotMatch(portalToggle, /WiFi\.disconnect|WiFi\.begin/);
  assert.match(firmware, /setSetupAccessCode\(networkRuntime\.portalActive\(\)/);
  assert.match(firmware,
               /WIFI:T:WPA;S:OpenRadio-Setup;P:%s;H:false;;/);
  assert.match(firmware,
               /ScreenKind::onboarding_wifi[\s\S]*ScreenKind::wifi_status[\s\S]*wifiQrScreen[\s\S]*M5\.Display\.qrcode\(setupQrPayload_\.data\(\), 128, 4, 184, 5, true\)/);
  assert.match(renderer,
               /ScreenKind::wifi_status[\s\S]*wifi_portal_active[\s\S]*drawWifiQrScreen/);
  assert.match(firmware, /wifiPortalToggleRequested/);
  assert.match(firmware, /wifiPortalRestartRequested/);
  assert.match(renderer, /snapshot\.setup_access_code/);
  assert.match(renderer, /Połącz telefon/);
  assert.match(renderer, /translated\(snapshot, "Język", "Language"\)/);
  assert.match(renderer, /translated\(snapshot, "Dalej", "Continue"\)/);
  assert.match(renderer, /translated\(snapshot, "Czekaj", "Wait"\)/);
});

test("new Wi-Fi credentials are committed only after a successful connection", async () => {
  const runtime = await readText("../firmware/public-candidate/src/device_network_runtime.hpp");
  const handler = runtime.match(/void acceptConfiguration\(\)[\s\S]*?\n  }\n\n  bool requirePortalClient/)?.[0] ?? "";
  assert.ok(handler, "configuration handler missing");
  assert.match(handler, /if \(pendingConnect_ \|\| connecting_\)[\s\S]*server_\.send\(409/);
  assert.doesNotMatch(handler, /preferences_|profiles_\[/);
  assert.match(runtime, /WiFi\.status\(\) == WL_CONNECTED[\s\S]*persistProvisionedProfile/);
  assert.match(runtime, /connectedCallback_ != nullptr && \(!provisioned \|\| persisted\)/);
  assert.match(runtime, /preferences_\.putBytes\("wifi_profiles"/);
  assert.match(runtime, /offsetof\(StoredProfiles, checksum\)/);
  assert.match(runtime, /failedProfileMask_[\s\S]*connectBestKnown/);
  assert.match(runtime, /kMaxProfiles =\s*open_radio::kMaxRememberedNetworks/);
  assert.match(runtime, /StoredProfilesV1[\s\S]*kProfileStoreVersionV1/);
  assert.match(runtime, /TargetNetworkStatus::Missing/);
  assert.ok(handler.indexOf("ssid.length()") < handler.indexOf("targetNetworkStatus(ssid)"), "input lengths must be rejected before an RF scan");
  assert.match(runtime, /kProvisioningWindowMs = 120000/);
  assert.match(runtime, /pendingConnectAtMs_ = nowMs \+ kProvisioningRetryMs/);
  assert.match(runtime, /WiFi\.setMinSecurity\(WIFI_AUTH_WPA2_PSK\)/);
});

test("console flow saves stations and ends without provisioning steps", async () => {
  assert.equal(OnboardingStages.CONSOLE_SAVED, "CONSOLE_SAVED");
  const app = await readText("../network-onboarding/app.mjs");
  // The page learns its flow from the device and heartbeats only as a console,
  // so a closed tab ends the session (and the silence) within a minute.
  assert.match(app, /fetch\("\/api\/session", \{cache: "no-store"\}\)/);
  assert.match(app, /consoleMode = payload\.mode === "console"/);
  assert.match(app, /if \(consoleMode\) \{\s*\n\s*setInterval/);
  // Saving is the whole errand: both save paths end on CONSOLE_SAVED and the
  // Wi-Fi list is never requested in console mode.
  // Default nine advances instantly during onboarding (fire-and-forget POST);
  // the console flow still waits, because its confirmation restarts the cube.
  assert.match(app, /postSlots\(null\)\.catch\(\(\) => \{\}\);\s*\n\s*state = chooseDefaultNine\(state\)/);
  assert.match(app, /await postSlots\(null\);\s*\n\s*state = \{\.\.\.state, stage: OnboardingStages\.CONSOLE_SAVED\}/);
  assert.match(app, /state = consoleMode \? \{\.\.\.state, stage: OnboardingStages\.CONSOLE_SAVED\}\s*\n\s*: confirmStationChoice\(state\)/);
  assert.match(app, /if \(!consoleMode\) loadDeviceNetworks\(\)/);
});
