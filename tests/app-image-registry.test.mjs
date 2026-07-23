import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const registryUrl = new URL("hardware/approved-app-images.json", root);
const validatorUrl = new URL("scripts/validate-app-image.py", root);
const deviceActionUrl = new URL("scripts/core2-device-action.sh", root);
const registry = JSON.parse(await readFile(registryUrl, "utf8"));

function validate(sha256, byteSize, purpose) {
  return spawnSync(
    "python3",
    [validatorUrl.pathname, registryUrl.pathname, sha256, String(byteSize), purpose],
    {encoding: "utf8"}
  );
}

test("current exact image is approved only for recovery of the current surface", () => {
  const candidate = registry.approved.find(item =>
    item.role === "CURRENT_EXACT_RECOVERY_IMAGE");
  const restore = validate(
    candidate.sha256, candidate.byteSize, "RESTORE_CURRENT_SURFACE");
  assert.equal(restore.status, 0, restore.stderr);
  assert.match(restore.stdout, /CURRENT_EXACT_RECOVERY_IMAGE\|791ebd4/);

  const candidateUse = validate(
    candidate.sha256, candidate.byteSize, "CURRENT_CANDIDATE");
  assert.notEqual(candidateUse.status, 0);
  assert.match(candidateUse.stderr, /PURPOSE_REJECTED/);
});

test("failed owner images are closed while radio rollback, audio LKG and noise candidate stay separate", () => {
  const noiseBtFailed = registry.quarantined.find(item =>
    item.reason === "BT_AUTO_CONNECT_REGRESSION_AFTER_NOISE_QUEUE_LATENCY_CHANGE");
  const wifiFailed = registry.quarantined.find(item =>
    item.reason === "ASYNC_WIFI_SCAN_TIMEOUT_NO_PLAYBACK");
  const rmfFailed = registry.quarantined.find(item =>
    item.reason === "RMF_MP3_A2DP_BANDWIDTH_STARVATION");
  const aacFailed = registry.quarantined.find(item =>
    item.reason === "RMF_AAC_RESAMPLER_STARVATION_AND_RTC_DOUBLE_CEST");
  const coexFailed = registry.quarantined.find(item =>
    item.reason === "RMF_AAC_BALANCED_COEX_INGEST_STARVATION");
  const timeSliceFailed = registry.quarantined.find(item =>
    item.reason === "RMF_AAC_COEX_TIMESLICE_STILL_STARVED_A2DP");
  const zetSwitchFailed = registry.quarantined.find(item =>
    item.reason === "RADIO_ZET_MP3_BALANCED_INGEST_STARVATION_AFTER_SWITCH");
  const zetScopedRefillFailed = registry.quarantined.find(item =>
    item.reason === "RADIO_ZET_MP3_SCOPED_REFILL_STILL_BELOW_REALTIME");
  const lowWaterRestartFailed = registry.quarantined.find(item =>
    item.reason === "LIVE_LOW_WATER_WATCHDOG_RESTARTED_CONNECTED_STREAMS");
  const audibleZetFailed = registry.quarantined.find(item =>
    item.reason === "RADIO_ZET_AUDIBLE_DISTORTION_AFTER_RMF_PASS");
  const fenced94cFailed = registry.quarantined.find(item =>
    item.reason === "EXACT_94C_SEMANTICS_STILL_RMF_INGEST_STARVATION");
  for (const failed of [noiseBtFailed, wifiFailed, rmfFailed, aacFailed, coexFailed,
                        timeSliceFailed, zetSwitchFailed,
                        zetScopedRefillFailed, lowWaterRestartFailed,
                        audibleZetFailed, fenced94cFailed]) {
    const rejected = validate(
      failed.sha256, failed.byteSize, "FLASH_OWNER_PRODUCTION");
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /QUARANTINED/);
  }

  const approved = validate(
    "659e56c236caad050e08220814839f7d395e410223c2cd05f373fc44fded28ba",
    2453264, "FLASH_OWNER_PRODUCTION");
  assert.equal(approved.status, 0, approved.stderr);
  assert.match(approved.stdout, /FINAL_PRIVATE_CUBE_CANDIDATE\|97f3e9b/);

  const audioLkg = validate(
    "44e9792983ff62b45c02dea5631c3599f7a8cb476da8728df82c940e1a61683a",
    2442368, "RESTORE_AUDIO_LKG");
  assert.equal(audioLkg.status, 0, audioLkg.stderr);
  assert.match(audioLkg.stdout, /CURRENT_AUDIO_LKG_ROLLBACK\|f243453/);

  const audioLkgAsCandidate = validate(
    "44e9792983ff62b45c02dea5631c3599f7a8cb476da8728df82c940e1a61683a",
    2442368, "FLASH_OWNER_PRODUCTION");
  assert.notEqual(audioLkgAsCandidate.status, 0);
  assert.match(audioLkgAsCandidate.stderr, /PURPOSE_REJECTED/);

  const recoveryUse = validate(
    "3e7a0cbdfc5cb5509ea2929430c047e812d86fbdd3ae8699998c7c7f847a9738",
    2448816, "RESTORE_CURRENT_SURFACE");
  assert.equal(recoveryUse.status, 0, recoveryUse.stderr);
  assert.match(recoveryUse.stdout, /CURRENT_EXACT_RECOVERY_IMAGE\|791ebd4/);

  const recoveryAsCandidate = validate(
    "3e7a0cbdfc5cb5509ea2929430c047e812d86fbdd3ae8699998c7c7f847a9738",
    2448816, "FLASH_OWNER_PRODUCTION");
  assert.notEqual(recoveryAsCandidate.status, 0);
  assert.match(recoveryAsCandidate.stderr, /PURPOSE_REJECTED/);
});

test("known RMF regression cannot be restored despite matching the GUI surface", () => {
  const regression = registry.quarantined.find(item =>
    item.reason === "KNOWN_RMF_BT_PCM_STARVATION_BASELINE");
  const rejected = validate(
    regression.sha256, regression.byteSize, "RESTORE_CURRENT_SURFACE");
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /QUARANTINED/);
});

test("quarantined, unregistered and size-mismatched images fail closed", () => {
  const quarantined = registry.quarantined[0];
  const quarantineResult = validate(
    quarantined.sha256, quarantined.byteSize, "CURRENT_CANDIDATE");
  assert.notEqual(quarantineResult.status, 0);
  assert.match(quarantineResult.stderr, /QUARANTINED/);

  const unregistered = validate("0".repeat(64), 1000, "CURRENT_CANDIDATE");
  assert.notEqual(unregistered.status, 0);
  assert.match(unregistered.stderr, /UNREGISTERED/);

  const candidate = registry.approved.at(-1);
  const wrongSize = validate(
    candidate.sha256, candidate.byteSize + 1, "CURRENT_CANDIDATE");
  assert.notEqual(wrongSize.status, 0);
  assert.match(wrongSize.stderr, /SIZE_MISMATCH/);
});

test("direct build-and-flash shortcuts fail before any device access", () => {
  for (const action of ["flash", "flash-lab"]) {
    const result = spawnSync("bash", [deviceActionUrl.pathname, action], {
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /DIRECT_BUILD_FLASH_DISABLED/);
    assert.doesNotMatch(result.stderr, /PORT must name/);
  }
});
