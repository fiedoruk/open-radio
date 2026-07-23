import {createHash} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, root), "utf8");
const readJson = async path => JSON.parse(await readText(path));
const sha256 = value => createHash("sha256").update(value).digest("hex");

const [matrix, capture, flashProposal, deviceAction, appImageValidator,
  flashLayoutValidator, ignore, platformIo, endpoints, appImages,
  ownerManifest, noiseManifest] =
  await Promise.all([
    readJson("hardware/speaker-qualification-matrix.json"),
    readJson("hardware/callback-trace-capture-template.json"),
    readText("docs/49-first-build-flash-rollback-proposal.md"),
    readText("scripts/core2-device-action.sh"),
    readText("scripts/validate-app-image.py"),
    readText("scripts/validate-core2-flash-layout.py"),
    readText(".gitignore"),
    readText("firmware/public-candidate/platformio.ini"),
    readText("NETWORK-ENDPOINTS.md"),
    readJson("hardware/approved-app-images.json"),
    readJson("hardware/owner-production-candidate-2026-07-18.json"),
    readJson("hardware/noise-owner-candidate-2026-07-18.json")
  ]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(matrix.schemaVersion === 1, "speaker matrix schema mismatch");
assert(matrix.hardwareValidated === true &&
       matrix.matrixStatus === "PARTIAL_HARDWARE_EVIDENCE",
       "speaker matrix must record the bounded physical result");
assert(Array.isArray(matrix.candidates) && matrix.candidates.length >= 2,
       "speaker matrix must contain at least two candidates");
assert(matrix.candidates.filter(candidate => candidate.role === "PRIMARY").length === 1,
       "speaker matrix requires one primary candidate");
assert(new Set(matrix.candidates.map(candidate => candidate.id)).size ===
       matrix.candidates.length, "speaker candidate ids must be unique");
for (const candidate of matrix.candidates) {
  if (candidate.role === "PRIMARY") {
    assert(candidate.a2dpSink === "SUPPORTED" && candidate.sbc === "SUPPORTED",
           `${candidate.id}: bounded A2DP/SBC result is missing`);
    assert(candidate.qualificationStatus === "FOCUSED_PCM_PASS_ENDURANCE_FAILED",
           `${candidate.id}: primary qualification boundary mismatch`);
    assert(candidate.evidence?.firmwareSha256 ===
             "94c25a9e373f2bc0b3dabeaf4af19483362aa9486a7eafd638f25b2d9e562f12" &&
           candidate.evidence?.currentImageSpeakerReconnect === "NOT_MEASURED" &&
           candidate.evidence?.currentImageLocalFallback === "NOT_MEASURED" &&
           candidate.evidence?.endurance === "FAILED" &&
           candidate.evidence?.resetReason === 4 &&
           candidate.evidence?.panicElapsedMs === 2594295 &&
           candidate.evidence?.postResetActiveSilenceFrames === 2411520,
           `${candidate.id}: exact evidence or remaining gates mismatch`);
  } else {
    assert(candidate.a2dpSink === "NOT_MEASURED",
           `${candidate.id}: A2DP must remain unmeasured`);
    assert(candidate.sbc === "NOT_MEASURED",
           `${candidate.id}: SBC must remain unmeasured`);
    assert(candidate.qualificationStatus === "NOT_MEASURED",
           `${candidate.id}: qualification must remain unmeasured`);
  }
}

assert(capture.captureStatus === "NOT_CAPTURED",
       "capture template must remain empty");
assert(capture.hardwareValidated === false,
       "capture template cannot claim validation");
assert(matrix.candidates.some(candidate => candidate.id === capture.speakerCandidateId),
       "capture template speaker must exist in the qualification matrix");
assert(capture.traces.length === 0,
       "capture template cannot contain recorded traces");

assert(ignore.split(/\r?\n/).includes("hardware/backups/"),
       "factory backups must remain ignored");
assert(deviceAction.includes("read_flash 0x0 0x1000000"),
       "factory backup must cover the complete 16 MiB flash");
assert(deviceAction.includes("verify_flash"),
       "rollback must include verification");
assert(flashProposal.includes("scripts/core2-device-action.sh"),
       "hardware proposal must route through the guarded device script");
assert(deviceAction.includes('ESP32_ALLOW_DEVICE_ACTION:-0'),
       "device script must require the shared hardware-action gate");
assert(deviceAction.includes('platformio-core/packages/tool-esptoolpy/esptool.py'),
       "device script must use PlatformIO's pinned esptool package");
assert(deviceAction.includes("MAC: ") && deviceAction.includes("[REDACTED]"),
       "device script must redact MAC addresses from esptool output");
assert(deviceAction.includes("SER=") && deviceAction.includes("list_devices_redacted"),
       "device script must redact USB serial identifiers from device-list output");
assert(deviceAction.includes("redact_device_output") &&
       deviceAction.includes('-e \'s#(/dev/cu\\.)[^ ]+#\\1[REDACTED]#g\''),
       "device script must redact serial-port paths from device output");
assert(deviceAction.includes(
         'device monitor --port "$PORT" --baud 115200 2>&1 | redact_device_output'),
       "device monitor output must pass through device-identifier redaction");
assert(deviceAction.includes('CONFIRM_FLASH:-NO'),
       "device script must require explicit flash confirmation");
assert(deviceAction.includes("DIRECT_BUILD_FLASH_DISABLED") &&
       !deviceAction.includes("-t upload"),
       "direct build-and-flash shortcuts must remain disabled");
assert(deviceAction.includes("flash-image") &&
       deviceAction.includes("IMAGE_PATH") &&
       deviceAction.includes("EXPECTED_SHA256") &&
       deviceAction.includes("IMAGE_PURPOSE"),
       "exact archived-image flashing must require path, hash and purpose");
assert(deviceAction.includes("APP_OFFSET=0x10000") &&
       deviceAction.includes("APP_MAX_BYTES=6553600"),
       "exact archived-image flashing must stay inside the 6.4 MiB app0 partition");
assert(deviceAction.includes("PARTITION_TABLE_OFFSET=0x8000") &&
       deviceAction.includes("OTADATA_OFFSET=0xe000") &&
       deviceAction.includes("verify_live_flash_layout") &&
       deviceAction.includes("validate-core2-flash-layout.py") &&
       deviceAction.includes("--expected-active app0") &&
       flashLayoutValidator.includes("ACTIVE_SLOT_MISMATCH") &&
       flashLayoutValidator.includes("PARTITION_LAYOUT_MISMATCH"),
       "app0 writes must validate the live partition geometry and active OTA slot");
assert(appImageValidator.includes("core2-owner-production"),
       "the reviewed owner-production lane must be eligible for exact registry approval");
assert(deviceAction.includes('"$ROOT/output/flashed/"*.bin') &&
       !deviceAction.includes('"$ROOT/hardware/backups/lkg/"*/firmware.bin'),
       "exact archived-image flashing must exclude historical LKG trees");
assert(deviceAction.includes("approved-app-images.json") &&
       deviceAction.includes("validate-app-image.py") &&
       appImageValidator.includes("QUARANTINED") &&
       appImageValidator.includes("PURPOSE_REJECTED"),
       "exact archived-image flashing must enforce the reviewed image registry");
assert(deviceAction.includes('write_flash --flash_size keep "$APP_OFFSET" "$RESOLVED_IMAGE"') &&
       deviceAction.includes("verify_flash") &&
       deviceAction.includes('"$APP_OFFSET" "$RESOLVED_IMAGE"'),
       "exact archived-image writes must preserve flash geometry and verify app0");
assert(deviceAction.includes('CONFIRM_ROLLBACK:-NO'),
       "device script must require explicit rollback confirmation");
assert(deviceAction.includes("read_flash 0x0 0x1000000"),
       "device script must create a complete 16 MiB backup");
assert(deviceAction.includes("verify_backup"),
       "device script must verify the backup before write actions");
assert(deviceAction.includes("verify_flash"),
       "device script rollback must verify the restored flash");
assert(!flashProposal.split(/\r?\n/).some(
         line => /(?:esptool|pio).*(?:erase_flash|erase-all)/i.test(line)),
       "first-flash proposal must not contain an erase command");
assert(!/(?:esptool|pio).*(?:erase_flash|erase-all)/i.test(deviceAction),
       "device action script must not contain an erase command");
assert(platformIo.includes("board = m5stack-core2"),
       "PlatformIO target must remain Core2");
assert(endpoints.includes(
         "| Time synchronization | pool.ntp.org | optional; never a playback dependency |"),
       "time endpoint decision must remain explicit");
assert(!endpoints.includes("decision pending"),
       "network endpoint decisions cannot remain pending");
assert(appImages.schemaVersion === 1,
       "approved app-image registry schema mismatch");
const requiredRoles = ["LEGACY_RECOVERY_IMAGE", "CURRENT_AUDIO_LKG_ROLLBACK",
                       "CURRENT_EXACT_RECOVERY_IMAGE", "FINAL_PRIVATE_CUBE_CANDIDATE"];
for (const role of requiredRoles) {
  assert(appImages.approved.some(image => image.role === role),
         `app-image registry lost the ${role} rollback path`);
}
assert(appImages.quarantined.length >= 4,
       "quarantined images must never be removed");
const legacyRecovery = appImages.approved.find(image =>
  image.role === "LEGACY_RECOVERY_IMAGE");
const recoveryImage = appImages.approved.find(image =>
  image.role === "CURRENT_EXACT_RECOVERY_IMAGE");
const audioLkg = appImages.approved.find(image =>
  image.role === "CURRENT_AUDIO_LKG_ROLLBACK");
const ownerCandidate = appImages.approved.find(image =>
  image.role === "FINAL_PRIVATE_CUBE_CANDIDATE");
assert(legacyRecovery?.sha256 ===
         "94c25a9e373f2bc0b3dabeaf4af19483362aa9486a7eafd638f25b2d9e562f12" &&
       legacyRecovery.allowedPurposes.length === 1 &&
       legacyRecovery.allowedPurposes[0] === "RESTORE_LEGACY_SURFACE" &&
       appImages.quarantined.some(image =>
         image.sha256 === "6b01752fd9d20a540469693cfd3ccacd0589468a4313fef6d17041023c0b804d"),
       "the legacy 94c image must remain an exact recovery option");
assert(recoveryImage?.sha256 ===
         "3e7a0cbdfc5cb5509ea2929430c047e812d86fbdd3ae8699998c7c7f847a9738" &&
       recoveryImage.byteSize === 2448816 &&
       recoveryImage.sourceCommit ===
         "791ebd49d87d904a14956fa21688fbfe5fbff65e" &&
       recoveryImage.surfaceId === "current-nine-station-logo-pack-battery-v2" &&
       recoveryImage.allowedPurposes.includes("RESTORE_CURRENT_SURFACE") &&
       !recoveryImage.allowedPurposes.includes("FLASH_OWNER_PRODUCTION") &&
       recoveryImage.allowedPurposes.length === 1,
       "the qualified 3e radio image must remain the direct recovery-only image");
assert(audioLkg?.sha256 ===
         "44e9792983ff62b45c02dea5631c3599f7a8cb476da8728df82c940e1a61683a" &&
       audioLkg.byteSize === 2442368 &&
       audioLkg.sourceCommit ===
         "f243453a96e8c60a5c84fd5f4f9cc50dba7f3fd7" &&
       audioLkg.lane === "core2-owner-production" &&
       audioLkg.surfaceId === "current-nine-station-logo-pack-v1" &&
       audioLkg.allowedPurposes.length === 1 &&
       audioLkg.allowedPurposes[0] === "RESTORE_AUDIO_LKG",
       "the working audio LKG must remain an independently restorable exact image");
assert(ownerCandidate?.sha256 ===
         "659e56c236caad050e08220814839f7d395e410223c2cd05f373fc44fded28ba" &&
       ownerCandidate.byteSize === 2453264 &&
       ownerCandidate.sourceCommit ===
         "97f3e9b305a8a6370cd2601a24c64a3efe0c4225" &&
       ownerCandidate.lane === "core2-owner-production" &&
       ownerCandidate.surfaceId ===
         "current-nine-station-logo-pack-battery-noise-v3" &&
       ownerCandidate.allowedPurposes.length === 1 &&
       ownerCandidate.allowedPurposes[0] === "FLASH_OWNER_PRODUCTION" &&
       appImages.quarantined.some(image =>
         image.sha256 ===
           "77b16bc710ce20df9210c980682473f32f1b55c73ff43c57cb0140d251e67735" &&
         image.reason ===
           "BT_AUTO_CONNECT_REGRESSION_AFTER_NOISE_QUEUE_LATENCY_CHANGE") &&
       appImages.quarantined.some(image =>
         image.sha256 ===
           "a7ed7f1530ba0d1ec4afd1999a030861f188eefe0987b0861d5cb08e01120e5f" &&
         image.reason === "ASYNC_WIFI_SCAN_TIMEOUT_NO_PLAYBACK") &&
       appImages.quarantined.some(image =>
         image.sha256 ===
           "c74a1e14025376bab0a2f74c26b2a15456737f072c7c9b47e62ac9ffc1aa77f7" &&
         image.reason === "RMF_MP3_A2DP_BANDWIDTH_STARVATION") &&
       appImages.quarantined.some(image =>
         image.sha256 ===
           "a7ca02797dfbe9da5102df16fb1928a3a8d1dc9707fd6c10f8e3bab549ebde0a" &&
         image.reason === "RMF_AAC_RESAMPLER_STARVATION_AND_RTC_DOUBLE_CEST") &&
       appImages.quarantined.some(image =>
         image.sha256 ===
           "f2b89803f60a5cce88de3386d534b077c8ae7ec368f904c4a76f5648cafa63be" &&
         image.reason === "RMF_AAC_BALANCED_COEX_INGEST_STARVATION") &&
       appImages.quarantined.some(image =>
         image.sha256 ===
           "726e106772dc456478019dcfc4b629394857409f9678b829bef19d79c82a5cc9" &&
         image.reason === "RMF_AAC_COEX_TIMESLICE_STILL_STARVED_A2DP") &&
       appImages.quarantined.some(image =>
         image.sha256 ===
           "e46729737d7637a5be42e0235b63dd39e9a8999d936a58398f9a111d384945a2" &&
         image.reason ===
           "RADIO_ZET_MP3_BALANCED_INGEST_STARVATION_AFTER_SWITCH") &&
       appImages.quarantined.some(image =>
         image.sha256 ===
           "fbfc977fbad6b1ceffeb7b5566007517011c203232c5d4ac8bd135356feb7f49" &&
         image.reason ===
           "RADIO_ZET_MP3_SCOPED_REFILL_STILL_BELOW_REALTIME") &&
       appImages.quarantined.some(image =>
         image.sha256 ===
           "eda2c800729f73776d1b811f3d560d0513d259550a6eaa5c7d2693433a8dc84f" &&
         image.reason ===
           "LIVE_LOW_WATER_WATCHDOG_RESTARTED_CONNECTED_STREAMS") &&
       appImages.quarantined.some(image =>
         image.sha256 ===
           "91bf973c79c5c2d3dad008da77ec9348bc2d2e3052fa98a6f558a8bef08359ed" &&
         image.reason ===
           "RADIO_ZET_AUDIBLE_DISTORTION_AFTER_RMF_PASS") &&
       appImages.quarantined.some(image =>
         image.sha256 ===
           "7b6f44b1536d0ab921de7f392016ff3861f042a1453066d694e53da8a4a55855" &&
         image.reason ===
           "EXACT_94C_SEMANTICS_STILL_RMF_INGEST_STARVATION") &&
       !appImages.quarantined.some(image =>
         image.sha256 ===
           "44e9792983ff62b45c02dea5631c3599f7a8cb476da8728df82c940e1a61683a"),
       "the replacement approval and preserved audio LKG must be exact");
assert(ownerManifest.status === "CONDITIONAL_QC_PASS_EXACT_APP0" &&
       ownerManifest.flashGate.flashAllowed === true &&
       ownerManifest.candidate.sha256 ===
         "3e7a0cbdfc5cb5509ea2929430c047e812d86fbdd3ae8699998c7c7f847a9738" &&
       ownerManifest.candidate.sourceCommit ===
         "791ebd49d87d904a14956fa21688fbfe5fbff65e",
       "the replacement manifest must bind the exact approved image and source");
assert(noiseManifest.status ===
         "CONDITIONAL_QC_PASS_EXACT_APP0_ACCEPTED_CONTROL_LATENCY" &&
       noiseManifest.flashGate.flashAllowed === true &&
       noiseManifest.candidate.sha256 === ownerCandidate.sha256 &&
       noiseManifest.candidate.byteSize === ownerCandidate.byteSize &&
       noiseManifest.candidate.sourceCommit === ownerCandidate.sourceCommit &&
       noiseManifest.rollback.sha256 === recoveryImage.sha256 &&
       noiseManifest.frozenRadioGeometry.wifiCoexistenceTuningChanged === false &&
       noiseManifest.frozenRadioGeometry.radioResolverOrEndpointChanged === false,
       "the noise manifest must bind the exact candidate and qualified radio rollback");
assert(appImages.approved.every(image => image.flashAllowed === true &&
       appImages.productSurfaces[image.surfaceId] !== undefined &&
       Array.isArray(image.allowedPurposes) && image.allowedPurposes.length > 0),
       "approved app images must bind purpose and current product surface");
const approvedHashes = new Set(appImages.approved.map(image => image.sha256));
assert(appImages.quarantined.every(image => !approvedHashes.has(image.sha256)),
       "a quarantined image cannot also be approved");
// The drift check follows the declared development surface, not the surface of
// the flashed candidate. Those diverge on purpose while the next release is
// being built: the cube keeps running the approved image while the tree moves
// ahead. Each approved image stays bound to the surface that produced it, which
// is what actually protects a flash.
const developmentSurfaceId = appImages.developmentSurfaceId;
assert(typeof developmentSurfaceId === "string" &&
       appImages.productSurfaces[developmentSurfaceId] !== undefined,
       "developmentSurfaceId must name a declared product surface");
assert(appImages.approved.every(image => image.surfaceId !== developmentSurfaceId),
       "no image may be approved for the development surface");
const currentSurface = appImages.productSurfaces[developmentSurfaceId];
const surfaceFiles = {
  rendererSourceSha256: "renderer/src/renderer.cpp",
  rendererInterfaceSha256: "renderer/include/open_radio/renderer.hpp",
  rendererContractSha256: "renderer/generated/ui_contract.hpp",
  firmwareCatalogSha256: "firmware/generated/station_catalog.hpp",
  stationListSha256: "ui-contract/catalog/stations.pl.json",
  stationIdentitiesSha256: "ui-contract/gui/station-identities.v1.json",
  configSchemaSha256: "ui-contract/schemas/device-config-v2.schema.json"
};
if (process.argv.includes("--write-development-surface")) {
  for (const [field, path] of Object.entries(surfaceFiles)) {
    currentSurface[field] = sha256(await readFile(new URL(path, root)));
  }
  await writeFile(new URL("../hardware/approved-app-images.json", import.meta.url),
                  `${JSON.stringify(appImages, null, 2)}\n`);
  process.stdout.write(`WROTE development-surface ${developmentSurfaceId}\n`);
} else {
  for (const [field, path] of Object.entries(surfaceFiles)) {
    assert(currentSurface[field] === sha256(await readFile(new URL(path, root))),
           `development surface drift: ${path} (run npm run check:hardware-readiness:write after reviewing the change)`);
  }
}

process.stdout.write(
  `PASS hardware-readiness speakers=${matrix.candidates.length} backup=16MiB exact_app_flash=registry-guarded device_actions=guarded ntp=optional-bound\n`
);
