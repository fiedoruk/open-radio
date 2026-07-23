import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const matrix = JSON.parse(await readFile(new URL("../ui-contract/fixtures/firmware-fault-matrix.json", import.meta.url)));
const firmwareSource = await readFile(
  new URL("../firmware/public-candidate/src/main.cpp", import.meta.url), "utf8");
const platformIo = await readFile(
  new URL("../firmware/public-candidate/platformio.ini", import.meta.url), "utf8");
const stationRuntime = await readFile(
  new URL("../firmware/public-candidate/src/station_runtime.hpp", import.meta.url), "utf8");
const audioPipeline = await readFile(
  new URL("../firmware/public-candidate/src/public_audio_pipeline.hpp", import.meta.url), "utf8");
const asyncIcySource = await readFile(
  new URL("../firmware/public-candidate/src/async_icy_stream_source.hpp", import.meta.url), "utf8");
const firmwareBuildScript = await readFile(
  new URL("../firmware/public-candidate/scripts/select_mp3_sources.py", import.meta.url), "utf8");
const rendererSource = await readFile(
  new URL("../renderer/src/renderer.cpp", import.meta.url), "utf8");
const uiController = await readFile(
  new URL("../firmware/common/include/open_radio/ui_controller.hpp", import.meta.url), "utf8");
const localNoiseSource = await readFile(
  new URL("../firmware/common/include/open_radio/local_noise_source.hpp", import.meta.url), "utf8");

test("firmware fault matrix covers every RC0 recovery layer", () => {
  const layers = new Set(matrix.scenarios.map(scenario => scenario.layer));
  for (const required of ["boot", "persistence", "network", "resolver", "capability", "stream", "output", "supervisor"]) {
    assert.ok(layers.has(required), `missing ${required}`);
  }
  assert.equal(new Set(matrix.scenarios.map(scenario => scenario.id)).size, matrix.scenarios.length);
  assert.ok(matrix.scenarios.length >= 12);
});

test("unsafe network and unsupported codec never auto-play", () => {
  const openNetwork = matrix.scenarios.find(scenario => scenario.id === "open-wifi-visible");
  const unsupported = matrix.scenarios.find(scenario => scenario.id === "hls-he-aac-selected");
  assert.equal(openNetwork.expectedAction, "PROMPT_REQUIRED");
  assert.equal(openNetwork.audio, "STOPPED");
  assert.equal(unsupported.expectedAction, "SHOW_UNSUPPORTED");
  assert.equal(unsupported.audio, "STOPPED");
});

test("Bluetooth failures preserve the local speaker fallback", () => {
  const failures = matrix.scenarios.filter(scenario => scenario.id.startsWith("bluetooth-"));
  assert.equal(failures.length, 2);
  assert.ok(failures.every(scenario => scenario.expectedAction.includes("FALLBACK_LOCAL")));
  assert.ok(failures.every(scenario => scenario.audio === "CONTINUES"));
});

test("Bluetooth has one stack lifecycle, one retry owner and media-gated routing", () => {
  const start = firmwareSource.match(/void startBluetooth\(bool scan\)[\s\S]*?\n}\n#endif/)?.[0];
  assert.ok(start, "Bluetooth start boundary missing");
  const stack = firmwareSource.match(/bool startBluetoothStack[\s\S]*?\n}\n\nvoid startBluetooth/)?.[0];
  assert.ok(stack, "Bluetooth stack lifecycle boundary missing");
  assert.match(stack, /if \(bluetoothStackStarted\) return true/);
  assert.match(stack, /prepareClassicBluetoothController\(\)/);
  assert.match(firmwareSource, /esp_bt_controller_mem_release\(ESP_BT_MODE_BLE\)/);
  assert.match(firmwareSource, /config\.mode = ESP_BT_MODE_CLASSIC_BT/);
  assert.match(firmwareSource, /esp_bt_controller_enable\(ESP_BT_MODE_CLASSIC_BT\)/);
  assert.doesNotMatch(firmwareSource, /set_reset_ble\(true\)/);
  assert.match(firmwareSource, /set_discovery_mode_callback\(handleBluetoothDiscovery\)/);
  assert.equal(firmwareSource.match(/bluetoothSource\.start\(\)/g)?.length, 1);
  assert.doesNotMatch(firmwareSource, /bluetoothSource\.end\(/);
  assert.doesNotMatch(firmwareSource, /WiFi\.setSleep\(/);
  assert.match(start, /if \(!bluetoothStackStarted\)[\s\S]*startBluetoothStack\(true, nowMs\)/);
  assert.match(start, /bluetoothScanAfterDisconnect = true[\s\S]*bluetoothSource\.disconnect\(\)/);
  assert.match(start, /beginBluetoothDiscovery\(nowMs\)/);
  assert.match(start, /startBluetoothStack\(false, nowMs\)/);
  assert.match(start, /connectRememberedBluetooth\(nowMs\)/);
  const callback = firmwareSource.match(/const auto connectionEvent[\s\S]*?\n#endif/)?.[0];
  assert.ok(callback, "Bluetooth supervisor boundary missing");
  assert.match(callback, /ESP_A2D_CONNECTION_STATE_CONNECTED[\s\S]*bluetoothQueue\.setConnected\(true\)/);
  assert.match(firmwareSource, /bool persistActiveBluetooth\(\)[\s\S]*preferences\.putBytes\("bt_addr"[\s\S]*preferences\.putString\("bt_name"[\s\S]*boardUi\.rememberBluetooth\(\)/);
  assert.match(callback, /ESP_A2D_AUDIO_STATE_STARTED[\s\S]*localSpeaker\.stopPlayback\(\)[\s\S]*outputRouter\.preferBluetooth\(true\)/);
  assert.doesNotMatch(callback,
                      /ESP_A2D_AUDIO_STATE_STARTED[\s\S]*primeBluetooth(?:Queue|StandbyQueue)\(\)/);
  assert.match(callback, /ESP_A2D_AUDIO_STATE_STARTED[\s\S]*persistActiveBluetooth\(\)/);
  assert.match(callback,
               /mediaStartAdmitted[\s\S]*ESP_A2D_AUDIO_STATE_STARTED[\s\S]*bluetoothLinkConnected[\s\S]*mediaStartAdmitted/);
  assert.match(callback,
               /media_start_rejected reason=standby_not_ready[\s\S]*bluetoothSource\.disconnect\(\)[\s\S]*kBluetoothMediaRecoveryDelayMs/);
  assert.match(callback, /ESP_A2D_CONNECTION_STATE_DISCONNECTED[\s\S]*useLocalBluetoothFallback\(\)[\s\S]*scheduleBluetoothRecovery\(millis\(\)\)/);
  assert.match(callback, /kBluetoothScanTimeoutMs[\s\S]*cancel_discovery\(\)/);
  assert.match(firmwareSource, /xQueueOverwrite\(bluetoothCandidateQueue, &event\) == pdPASS/);
  assert.match(start, /if \(!loadRememberedBluetooth\(\)\)[\s\S]*boardUi\.forgetBluetooth\(\)/);
  assert.match(firmwareSource, /candidateAddress == rememberedBluetoothAddress/);
  assert.match(firmwareSource, /rememberedDevice \|\|[\s\S]*bluetoothAllowNewCandidate\.load/);
  assert.match(firmwareSource, /set_valid_cod_service\(ESP_BT_COD_SRVC_RENDERING \|[\s\S]*ESP_BT_COD_SRVC_AUDIO\)/);
  assert.doesNotMatch(firmwareSource, /sound pocket|outdoor-xtreme|knownModel/i);
  assert.match(firmwareSource, /selectCompatibleSpeaker[\s\S]*"Bluetooth speaker"/);
  assert.doesNotMatch(firmwareSource, /set_auto_reconnect\([^\n]*, 3\)/);
  assert.match(firmwareSource,
               /applyBluetoothVolume\(\)[\s\S]*set_volume\(volume\)/);
  assert.match(firmwareSource,
               /boardUi\.config\(\)\.volume \* 0x7fU \/ 100U/);
  assert.match(firmwareSource,
               /class LocalVolumeBluetoothSource final : public BluetoothA2DPSource/);
  assert.match(firmwareSource,
               /LocalVolumeBluetoothSource\(\)[\s\S]*discoverability = ESP_BT_NON_DISCOVERABLE/);
  assert.match(firmwareSource,
               /set_scan_mode_connectable_default\(\) override[\s\S]*set_scan_mode_connectable\(false\)/);
  assert.match(firmwareSource,
               /process_user_state_callbacks[\s\S]*remote_bda\[index\][\s\S]*esp_a2d_source_disconnect[\s\S]*s_a2d_state = APP_AV_STATE_CONNECTED[\s\S]*BluetoothA2DPSource::process_user_state_callbacks/);
  assert.match(firmwareSource,
               /esp_a2d_connect\(esp_bd_addr_t peer\) override[\s\S]*profileOpenGate_\.begin\(\)[\s\S]*noteDialStarted\(millis\(\)\)[\s\S]*BluetoothA2DPSource::esp_a2d_connect\(peer\)/);
  assert.equal(firmwareSource.match(/BluetoothA2DPSource::esp_a2d_connect\(peer\)/g)?.length, 1,
               "Every local A2DP profile open must pass the low-level override gate");
  assert.match(firmwareSource,
               /startBluetoothStack[\s\S]*authorizeProfileOpen\([\s\S]*BootRemembered/);
  assert.match(firmwareSource,
               /beginBluetoothDiscovery[\s\S]*authorizeProfileOpen\([\s\S]*Discovery/);
  assert.match(firmwareSource,
               /connectRememberedBluetooth[\s\S]*authorizeProfileOpen\([\s\S]*Recovery/);
  assert.match(firmwareSource,
               /handleBluetoothConnection[\s\S]*packBluetoothProfileEvent/);
  assert.match(callback,
               /unpackBluetoothProfileEvent[\s\S]*finishProfileOpen\(profileGeneration\)/);
  assert.match(firmwareSource,
               /process_user_state_callbacks[\s\S]*dialAgeMs\(millis\(\)\)[\s\S]*dialAge > kBluetoothDirtyAttemptAbortMs/);
  assert.match(firmwareSource,
               /app_gap_callback\(esp_bt_gap_cb_event_t event[\s\S]*ESP_BT_GAP_ACL_CONN_CMPL_STAT_EVT[\s\S]*bluetooth acl=conn dial_age_ms=%lu stat=%u[\s\S]*bluetooth acl=disconn dial_age_ms=%lu reason=%u[\s\S]*BluetoothA2DPSource::app_gap_callback\(event, param\)/);
  assert.match(start,
               /if \(scan\)[\s\S]*setReconnectPeer\(activeBluetoothAddress, false\)/);
  assert.match(start,
               /setReconnectPeer\(activeBluetoothAddress, true\)[\s\S]*startBluetoothStack\(false, nowMs\)/);
  assert.match(callback,
               /takeConnectionOrigin\(\)[\s\S]*BluetoothConnectionOrigin::RemoteListen[\s\S]*bluetooth initiator=%s dial_age_ms=%lu result=accepted/);
  assert.match(callback,
               /ESP_A2D_CONNECTION_STATE_DISCONNECTED[\s\S]*setReconnectPeer[\s\S]*applyReconnectListenPolicy\(\)/);
  assert.match(firmwareSource,
               /A2DPLinearVolumeControl bluetoothLinearVolumeControl/);
  assert.match(firmwareSource,
               /void set_volume\(std::uint8_t volume\) override[\s\S]*volume_control\(\)->set_volume\(volume_value\)[\s\S]*volume_control\(\)->set_enabled\(true\)/);
  assert.match(firmwareSource,
               /void bt_av_volume_changed\(\) override \{\}/);
  assert.match(firmwareSource,
               /void bt_av_notify_evt_handler\([\s\S]*override \{\}/);
  assert.match(firmwareSource,
               /set_avrc_rn_events\(\{\}\)/);
  assert.doesNotMatch(firmwareSource,
                      /A2DPNoVolumeControl|bluetoothPassthroughVolumeControl/);
  assert.doesNotMatch(firmwareSource,
                      /esp_avrc_ct_send_set_absolute_volume_cmd/);
  assert.match(firmwareSource,
               /set_volume_control\(&bluetoothLinearVolumeControl\)/);
  assert.ok(
    firmwareSource.indexOf(
      "set_volume_control(&bluetoothLinearVolumeControl)") <
      firmwareSource.indexOf("set_data_callback_in_frames(provideBluetoothFrames)"),
    "Bluetooth linear PCM volume must be installed before audio starts");
  assert.match(callback,
               /bluetoothConnectInFlight && !bluetoothMediaStarted[\s\S]*bluetoothSource\.disconnect\(\)[\s\S]*scheduleBluetoothRecovery\(/);
  assert.match(callback,
               /bluetoothMediaStarted &&[\s\S]*kBluetoothPullWatchdogMs[\s\S]*bluetoothSource\.disconnect\(\)[\s\S]*scheduleBluetoothRecovery\(millis\(\)\)/);
  assert.match(firmwareSource,
               /kBluetoothRecoveryMinDelayMs = 8U \* 1000U/);
  assert.match(firmwareSource,
               /kBluetoothRecoveryMaxDelayMs = 20U \* 1000U/);
  assert.match(firmwareSource,
               /bluetoothRecoveryDelayMs\(\)[\s\S]*esp_random\(\) % kDelayRangeMs/);
  assert.match(firmwareSource,
               /overrideDelayMs != 0 \? overrideDelayMs[\s\S]*bluetoothRecoveryDelayMs\(\)/);
  assert.doesNotMatch(firmwareSource,
                      /kBluetoothRetryDelaysMs|bluetoothRetryDelayIndex|bluetoothRetryBurstStartedMs|kBluetoothRecoveryMediumDelayMs|kBluetoothRecoveryLongDelayMs/);
  assert.match(firmwareSource,
               /bluetooth fallback=%lu recovery_start_ms=%lu/);
  assert.match(firmwareSource,
               /bluetooth recovery_attempt=%u elapsed_ms=%lu/);
  assert.match(callback,
               /ESP_A2D_AUDIO_STATE_STARTED[\s\S]*bluetooth recovery_complete_ms=%lu attempts=%u/);
  const linkConnected = callback.match(
    /ESP_A2D_CONNECTION_STATE_CONNECTED[\s\S]*?ESP_A2D_CONNECTION_STATE_DISCONNECTING/)?.[0];
  assert.ok(linkConnected, "Bluetooth connected-state boundary missing");
  assert.match(firmwareSource,
               /requestMediaStartIfIdle\(\)[\s\S]*s_media_state != 0[\s\S]*ESP_A2D_MEDIA_CTRL_CHECK_SRC_RDY/);
  assert.match(firmwareSource,
               /a2d_app_heart_beat\(void\* arg\) override[\s\S]*is_connected\(\)[\s\S]*!mediaStartAllowed_[\s\S]*BluetoothA2DPSource::a2d_app_heart_beat/);
  assert.match(callback,
               /ESP_A2D_CONNECTION_STATE_CONNECTED[\s\S]*armBluetoothMediaProbe\(connectedAtMs\)/);
  assert.match(callback,
               /bluetoothStandbyReady\(\)[\s\S]*allowBluetoothMediaStart\(bluetoothNowMs\)/);
  assert.match(callback,
               /bluetooth media_probe=%u result=%s link_age_ms=%lu/);
  assert.match(callback,
               /kBluetoothMediaStartTimeoutMs[\s\S]*bluetooth timeout_phase=%s elapsed_ms=%lu[\s\S]*bt_buffered=%u[\s\S]*decoded_frames=%u local_blocks=%u/);
  assert.match(firmwareSource, /kBluetoothMediaStartTimeoutMs = 10000/);
  assert.match(firmwareSource, /kBluetoothMediaRecoveryDelayMs = 2000/);
  assert.match(callback,
               /scheduleBluetoothRecovery\([\s\S]*bluetoothMediaStartTimeout \? kBluetoothMediaRecoveryDelayMs : 0/);
  assert.match(callback,
               /bluetoothRetryAtMs != 0[\s\S]*activeAudioSourceHealthy\(\)[\s\S]*localAudioReadyForBluetoothRetry\(\)[\s\S]*deferBluetoothRetryForAudio\(retryNowMs\)[\s\S]*connectRememberedBluetooth\(retryNowMs\)/);
  assert.match(firmwareSource,
               /kBluetoothRetryDecodedReserveFrames =[\s\S]*kPcmSampleRate;/);
  assert.match(firmwareSource,
               /localAudioReadyForBluetoothRetry\(\)[\s\S]*activeOutput\(\) == open_radio::OutputKind::LocalSpeaker[\s\S]*bufferedBlocks\(\) == 2[\s\S]*decodedFrames\.size\(\) >= kBluetoothRetryDecodedReserveFrames/);
  assert.match(firmwareSource,
               /bluetooth retry_deferred local_blocks=%u decoded_frames=%u/);
  assert.match(firmwareSource,
               /kBluetoothStandbyReadyFrames =[\s\S]*kPcmSampleRate \* 2U/);
  assert.match(firmwareSource,
               /bluetoothStandbyReady\(\)[\s\S]*bufferedFrames\(\) >= kBluetoothStandbyReadyFrames/);
  assert.doesNotMatch(firmwareSource,
                      /bluetoothQueue\.bufferedFrames\(\) ==\s*open_radio::public_candidate::kBluetoothPcmFrames/);
  assert.match(firmwareSource, /kBluetoothDirtyAttemptAbortMs = 6500U/);
  assert.match(callback,
               /ESP_A2D_CONNECTION_STATE_DISCONNECTED[\s\S]*bluetoothConnectionEventDialAgeMs\.exchange[\s\S]*cleanBluetoothAttemptTimeout\(durationMs\)[\s\S]*reportBluetoothAttemptResult/);
  assert.match(callback,
               /bluetoothDirtyAttempt[\s\S]*dialAgeMs\(bluetoothNowMs\) >[\s\S]*kBluetoothDirtyAttemptAbortMs[\s\S]*dirty_watchdog elapsed_ms=%lu action=await_stack/);
  assert.match(callback,
               /bluetoothDirtyAttempt[\s\S]*bluetoothDirtyAttemptReported = true/);
  assert.match(callback,
               /bluetoothDirtyAwaitSinceMs[\s\S]*action=reboot[\s\S]*ESP\.restart\(\)/);
  assert.match(callback,
               /takeInboundProfileDialRequest\(\)[\s\S]*bluetoothRetryAtMs = millis\(\)[\s\S]*connectRememberedBluetooth\(retryNowMs\)/);
  assert.match(firmwareSource,
               /ESP_BT_GAP_ACL_CONN_CMPL_STAT_EVT[\s\S]*aclSucceeded[\s\S]*dialAge == kBluetoothNoDialAgeMs[\s\S]*rememberedPeer[\s\S]*inboundProfileDialPending_\.store/);
  assert.match(callback,
               /ESP_A2D_CONNECTION_STATE_DISCONNECTED[\s\S]*bluetoothRetryAtMs = 0;[\s\S]*scheduleBluetoothRecovery\(millis\(\)\)/);
  assert.match(firmwareSource,
               /ESP_BT_GAP_AUTH_CMPL_EVT[\s\S]*bluetooth gap_auth_cmpl stat=%u peer=%s dial_age_ms=%lu/);
  assert.doesNotMatch(firmwareSource, /bluetooth listen_hold_/);
});

test("automatic Bluetooth waits for healthy local audio and prioritizes a remembered peer", () => {
  const connected = firmwareSource.match(
    /void handleNetworkConnected[\s\S]*?\n}\n\n}  \/\/ namespace/)?.[0];
  const setup = firmwareSource.match(/void setup\(\)[\s\S]*?\n}\n\nvoid loop/)?.[0];
  assert.ok(connected, "network-connected callback missing");
  assert.ok(setup, "firmware setup boundary missing");
  assert.match(connected,
               /stationRuntime\.networkConnected[\s\S]*!bluetoothMediaStarted[\s\S]*bluetoothAutoStartPending = true/);
  assert.match(firmwareSource,
               /bluetoothAutoStartPending && !logoFetchPending &&\s*\n\s*activeAudioSourceHealthy\(\)[\s\S]*localAudioReadyForBluetoothRetry\(\)[\s\S]*startBluetooth\(!boardUi\.config\(\)\.bluetoothRemembered\)/);
  assert.match(firmwareSource,
               /bluetoothDiscoveryRetryAtMs[\s\S]*kBluetoothDiscoveryRecoveryDelayMs[\s\S]*startBluetooth\(true\)/);
  assert.doesNotMatch(setup,
                      /if \(activeConfig\.bluetoothRemembered\) startBluetooth\(false\)/);
});

test("two-step secure reset erases the complete default NVS partition before restart", () => {
  assert.match(firmwareSource, /#include <nvs_flash\.h>/);
  assert.match(firmwareSource,
               /bool eraseAllLocalHistory\(\)[\s\S]*WiFi\.disconnect\(true, true\)[\s\S]*preferences\.end\(\)[\s\S]*nvs_flash_deinit\(\)[\s\S]*nvs_flash_erase\(\)[\s\S]*ESP\.restart\(\)/);
  assert.match(firmwareSource,
               /update\.secureResetRequested[\s\S]*eraseAllLocalHistory\(\)/);
});

test("unsupported MP3 output formats stop instead of playing at a wrong rate", () => {
  assert.match(audioPipeline, /rateSupported_ = rate == static_cast<int>\(kPcmSampleRate\)/);
  assert.match(audioPipeline, /channelsSupported_ = channelCount == static_cast<int>\(kPcmChannels\)/);
  assert.match(audioPipeline, /if \(!output_\.formatSupported\(\)\)[\s\S]*close\(false\)[\s\S]*return false/);
  assert.match(audioPipeline, /decoder_->begin\(source_, &output_\)/);
  assert.doesNotMatch(audioPipeline, /AudioFileSourceBuffer|inputBuffer_/);
});

test("compressed ICY input is prefetched off the audio-owner loop", () => {
  assert.match(asyncIcySource, /class AsyncIcyStreamSource final/);
  assert.match(asyncIcySource, /SpscByteRing<kRingBytes>/);
  assert.match(asyncIcySource, /kRingBytes = 128U \* 1024U/);
  assert.match(asyncIcySource,
               /MALLOC_CAP_SPIRAM \| MALLOC_CAP_8BIT/);
  assert.match(asyncIcySource,
               /xTaskCreatePinnedToCore\(workerEntry,[\s\S]*this, 1, nullptr, 0\)/);
  assert.match(asyncIcySource,
               /upstream_->readNonBlock\(scratch_, kScratchBytes\)/);
  assert.match(asyncIcySource, /kReadWaitMs = 100U/);
  assert.match(asyncIcySource, /SetReconnect\(0, 0\)/);
  assert.match(firmwareSource,
               /input_buffered=%u input_bytes=%lu[\s\S]*input_underruns=%lu input_worker_stack_bytes=%lu/);
});

test("audio outputs keep multi-second staged PCM without dropping partial blocks", () => {
  assert.match(audioPipeline, /kDecodedPcmFrames = 262144/);
  assert.match(audioPipeline,
               /kLocalDecodedReserveTargetFrames =[\s\S]*kDecodedPcmFrames;/);
  assert.match(audioPipeline, /kLocalSpeakerFramesPerBlock = 131072/);
  assert.match(audioPipeline, /kBluetoothPcmFrames = 262144/);
  assert.match(audioPipeline,
               /kBluetoothFallbackReserveFrames = 44100/);
  assert.match(audioPipeline,
               /kBluetoothDecoderLowWaterFrames =[\s\S]*kDecodedPcmFrames/);
  assert.match(audioPipeline,
               /kBluetoothDecoderHighWaterFrames =[\s\S]*kDecodedPcmFrames/);
  assert.match(audioPipeline,
               /kDecoderPumpTargetFrames =[\s\S]*kLocalDecodedReserveTargetFrames/);
  assert.match(audioPipeline, /kDecoderPumpPasses = 8/);
  assert.match(audioPipeline,
               /setBluetoothRealtimeMode\(bool active\)[\s\S]*bluetoothRealtimeMode_ = active/);
  assert.match(audioPipeline,
               /while \(output_\.bufferedFrames\(\) < pumpLowWaterFrames_ &&[\s\S]*bluetoothRealtimeMode_ \|\| pass < kDecoderPumpPasses/);
  assert.match(audioPipeline, /kDecoderNoProgressPasses = 8/);
  assert.match(audioPipeline,
               /noProgressPasses >= kDecoderNoProgressPasses/);
  assert.match(audioPipeline,
               /queue_\.size\(\) >= highWaterFrames_[\s\S]*return false/);
  assert.match(audioPipeline, /kFramesPerOwnerLoop = 8192/);
  assert.match(audioPipeline,
               /ownerLoopFrames_ >= kFramesPerOwnerLoop[\s\S]*return false/);
  assert.match(audioPipeline,
               /void beginOwnerLoop\(\) \{ ownerLoopFrames_ = 0; \}/);
  assert.match(firmwareSource,
               /mp3Pipeline\.beginOwnerLoop\(\);[\s\S]*stationRuntime\.loop/);
  assert.match(firmwareSource,
               /setBluetoothRealtimeMode\(bluetoothMediaStarted\)/);
  assert.match(audioPipeline, /class PsramPcmRingBuffer/);
  assert.match(audioPipeline,
               /heap_caps_calloc\([\s\S]*MALLOC_CAP_SPIRAM \| MALLOC_CAP_8BIT/);
  assert.doesNotMatch(firmwareSource,
                      /EXT_RAM_ATTR open_radio::PcmRingBuffer/);
  assert.match(audioPipeline, /count != kLocalSpeakerFramesPerBlock/);
  assert.match(audioPipeline, /samples\[index\] = static_cast<std::int16_t>\(mono \/ 2\)/);
  assert.match(audioPipeline,
               /playRaw\(samples, count, kPcmSampleRate, false/);
  assert.match(audioPipeline, /queuedBlocks >= 2/);
  assert.match(audioPipeline, /\+\+starvations_/);
  assert.match(firmwareSource,
               /const bool bluetoothActive =[\s\S]*if \(!bluetoothActive\)[\s\S]*const std::size_t drainFrames =[\s\S]*1024U/);
  assert.match(firmwareSource,
               /const std::size_t drainFrames = 1024U;[\s\S]*kBluetoothPcmFrames \/ drainFrames/);
  assert.match(firmwareSource,
               /selectPcmTransferFrames\([\s\S]*bluetoothQueue\.bufferedFrames\(\)[\s\S]*kBluetoothPcmFrames, 0U, drainFrames\)/);
  assert.match(firmwareSource,
               /primeBluetoothStandbyQueue\(\)[\s\S]*selectPcmTransferFrames\([\s\S]*kBluetoothFallbackReserveFrames[\s\S]*decodedFrames\.discard\(written\)/);
  assert.match(firmwareSource,
               /bluetoothStandbyPrefilling[\s\S]*primeBluetoothStandbyQueue\(\)[\s\S]*bluetoothStandbyPrefilling \? 0U/);
  assert.match(firmwareSource,
               /ESP_A2D_AUDIO_STATE_STARTED[\s\S]*localSpeaker\.stopPlayback\(\)[\s\S]*preferBluetooth\(true\)/);
  assert.match(firmwareSource,
               /setPlaybackActive\([\s\S]*activeOutput\(\) == open_radio::OutputKind::Bluetooth/);
  assert.match(audioPipeline, /starvationLatched_/);
  assert.match(firmwareSource,
               /drainFrames =[\s\S]*kLocalSpeakerFramesPerBlock/);
  assert.match(audioPipeline,
               /setConnected\(bool connected, bool clearBuffered = true\)/);
  assert.match(audioPipeline,
               /connected_\.load\(std::memory_order_relaxed\)[\s\S]*queue_\.pop/);
  assert.match(firmwareSource,
               /bluetoothQueue\.peekBuffered\(decodedDrainFrames, bluetoothFrames\)[\s\S]*decodedFrames\.peek\(decodedDrainFrames \+ bluetoothFrames[\s\S]*bluetoothQueue\.discardBuffered\(bluetoothFrames\)[\s\S]*decodedFrames\.discard\(decodedFrameCount\)/);
  assert.match(firmwareSource,
               /bluetoothQueue\.setConnected\(false, false\)[\s\S]*preferBluetooth\(false\)[\s\S]*wasBluetoothActive[\s\S]*drainDecodedFrames\(\)/);
  assert.match(firmwareSource, /audio_starvation total=%lu/);
  assert.match(firmwareSource, /nextLoopStallReportMs[\s\S]*5000U/);
  assert.match(audioPipeline, /kWriteChunkFrames = 256/);
  assert.match(audioPipeline, /bt_active_silence_frames|activeUnderrunFrames/);
});

test("local noise is bounded, offline and isolated from radio tuning", () => {
  assert.match(localNoiseSource, /class LocalNoiseSource/);
  assert.match(localNoiseSource, /kFramesPerOwnerLoop = 8192/);
  assert.match(localNoiseSource, /kFadeInFrames = kPcmSampleRate \/ 4/);
  assert.match(localNoiseSource, /kFadeOutFrames = kPcmSampleRate \* 3 \/ 20/);
  assert.match(localNoiseSource,
               /value \^= value << 13U[\s\S]*value \^= value >> 17U[\s\S]*value \^= value << 5U/);
  assert.match(localNoiseSource, /kBrownLeak = 0\.997F/);
  assert.match(localNoiseSource,
               /brown_ = brown_ \* kBrownLeak \+ white \* kBrownInputGain/);
  assert.match(localNoiseSource, /PcmFrame\{pcm, pcm\}/);
  assert.doesNotMatch(localNoiseSource,
                      /#include[^\n]*(?:WiFi|HTTP|Bluetooth|Preferences|Arduino)/);
  assert.match(stationRuntime,
               /void suspend\(std::uint32_t nowMs\)[\s\S]*pipeline_\.stop\(\)[\s\S]*activeEndpoint_ = ""/);
  assert.match(firmwareSource,
               /kPlaybackModeKey = "play_mode"[\s\S]*kNoiseColorKey = "noise_color"/);
  assert.match(firmwareSource,
               /enterNoiseMode[\s\S]*stationRuntime\.suspend[\s\S]*decodedFrames\.clear[\s\S]*startNoisePlayback/);
  assert.match(firmwareSource,
               /startNoisePlayback[\s\S]*localNoiseSource\.start/);
  assert.match(firmwareSource,
               /persistPlaybackMode[\s\S]*getUChar\(kPlaybackModeKey[\s\S]*putUChar/);
  assert.match(firmwareSource,
               /noiseExitPending[\s\S]*noiseTailDrained\(\)[\s\S]*finishNoiseExit/);
  assert.match(rendererSource, /void drawNoise\([\s\S]*BIAŁY[\s\S]*RÓŻOWY[\s\S]*BRĄZOWY/);
  assert.match(rendererSource,
               /drawNoiseGlyph[\s\S]*\{216, 2, 44, 44\}/);
});

test("ICY metadata reads and transient stream recovery are bounded", () => {
  assert.match(asyncIcySource, /SetReconnect\(0, 0\)/);
  assert.match(stationRuntime, /kFastReconnectDelayMs = 250/);
  assert.match(stationRuntime,
               /void loop\(std::uint32_t nowMs, bool startAllowed = true\)[\s\S]*!running_ && startAllowed/);
  assert.match(firmwareSource,
               /stationRuntime\.loop\(millis\(\),[\s\S]{0,80}!consoleSessionActive &&[\s\S]{0,80}\(!bluetoothConnectInFlight \|\| bluetoothMediaStarted\)\)/);
  assert.match(stationRuntime, /String endpoint = activeEndpoint_/);
  assert.match(stationRuntime,
               /rmfCandidateIndex_ % kRmfCandidateCount/);
  assert.match(stationRuntime,
               /\+\+unexpectedStops_;[\s\S]*\+\+rmfCandidateIndex_/);
  assert.match(stationRuntime,
               /\+\+startFailures_;[\s\S]*\+\+rmfCandidateIndex_/);
  assert.match(firmwareSource, /source_status=%d/);
  assert.match(stationRuntime,
               /stream_stage stage=resolver duration_ms=%lu result=%s/);
  assert.match(audioPipeline,
               /stream_stage stage=connect duration_ms=%lu result=%s codec=%s/);
  assert.match(audioPipeline,
               /stream_stage stage=first-read duration_ms=%lu result=%s codec=%s/);
  assert.match(audioPipeline,
               /stream_stage stage=decode-refill duration_ms=%lu result=%s/);
  assert.match(firmwareSource, /boot build_sha=%s/);
  assert.match(firmwareBuildScript,
               /git[\s\S]*rev-parse[\s\S]*HEAD[\s\S]*OPEN_RADIO_BUILD_SHA/);
});

test("last-known-good stream is persisted only after decoded audio", () => {
  const decodedFrames = stationRuntime.match(
    /void decodedFrames[\s\S]*?\n  }\n\n  bool running/)?.[0];
  const start = stationRuntime.match(/void start[\s\S]*?\n  }\n\n  void scheduleRetry/)?.[0];
  assert.ok(decodedFrames, "decodedFrames boundary missing");
  assert.ok(start, "start boundary missing");
  assert.match(decodedFrames, /putString\(lastKnownGoodKey/);
  assert.match(stationRuntime,
               /activeEndpoint_ = preferences_\.getString\(lastKnownGoodKey/);
  assert.doesNotMatch(start, /putString\(lastKnownGoodKey/);
});

test("public firmware boot does not synthesize healthy services", () => {
  const initialization = firmwareSource.match(
    /void initializeRuntime\(const open_radio::StorageSelectionDto& storage\) \{([\s\S]*?)\n\}\n\nvoid flushUi/)?.[1];
  assert.ok(initialization, "initializeRuntime boundary missing");
  assert.match(initialization, /runtimeServices\.boot\(storage/);
  assert.doesNotMatch(initialization, /runtimeServices\.(network|resolver|stream|bluetoothRemembered)/);
  assert.doesNotMatch(initialization, /StorageStatus::Bootable/);
  assert.match(initialization, /runtimeServices\.localOutput\(M5\.Speaker\.isEnabled\(\)/);
  assert.match(firmwareSource, /auto storage = configStorage\.selectBoot\(\)/);
});

test("missing stored Wi-Fi profiles repair stale onboarding state before rendering", () => {
  assert.match(firmwareSource,
               /networkRuntime\.begin\(millis\(\)\);[\s\S]*if \(!networkRuntime\.hasProfiles\(\)\)[\s\S]*boardUi\.requireNetworkOnboarding\(\)/);
  assert.match(firmwareSource, /boardUi\.setSetupAccessCode\(networkRuntime\.portalActive\(\)/);
});


test("public firmware links the shared renderer instead of duplicating UI", () => {
  assert.match(firmwareSource, /#include "open_radio\/renderer\.hpp"/);
  assert.match(firmwareSource, /open_radio::ui::renderScreen/);
  assert.match(firmwareSource,
               /M5\.Display\.setSwapBytes\(true\)[\s\S]*M5\.Display\.pushImage/);
  assert.match(firmwareSource,
               /ScreenKind::onboarding_wifi[\s\S]*M5\.Display\.qrcode/);
  for (const screen of ["onboarding_wifi", "market", "onboarding_bluetooth", "stations", "settings_quick", "about", "diagnostics", "now_playing_editorial"]) {
    assert.match(firmwareSource, new RegExp(`ScreenKind::${screen}`));
  }
  assert.match(platformIo, /OpenRadioRenderer=symlink:\/\/\.\.\/\.\.\/renderer/g);
});

test("minimal home uses RTC facts and one shared touch-button action path", () => {
  assert.match(firmwareSource, /M5\.Rtc\.getDateTime\(\)/);
  assert.match(firmwareSource, /snapshot\.clock_valid = clockValid_/);
  assert.match(uiController,
               /hardwareButton[\s\S]*dispatchTap\(projectedX, 210\)/);
  assert.doesNotMatch(rendererSource,
                      /"18:42"|"19°"|"Białystok"|"Deszcz 80%"/);
  const glance = rendererSource.match(
    /if \(snapshot\.variant == HomeVariant::glance\)[\s\S]*?\n    return;/)?.[0];
  assert.ok(glance, "minimal home renderer boundary missing");
  assert.doesNotMatch(glance, /drawTransport/);
  assert.match(glance, /wifi_strength_percent/);
});

test("brightness changes do not reapply the speaker gain", () => {
  const levels = firmwareSource.match(
    /void applyHardwareLevels\(\)[\s\S]*?\n  }\n\n  void refreshClock/)?.[0];
  assert.ok(levels, "hardware level boundary missing");
  assert.match(levels, /appliedBrightness_ != brightness/);
  assert.match(levels, /appliedVolume_ != volume/);
  assert.match(levels, /M5\.Display\.setBrightness\(brightness\)/);
  assert.match(levels, /M5\.Speaker\.setVolume\(volume\)/);
});

test("settings battery status is low-rate PMIC telemetry outside the audio path", () => {
  const batteryRefresh = firmwareSource.match(
    /void refreshBattery\(std::uint64_t nowMs\)[\s\S]*?\n  }\n\n  void render/)?.[0];
  assert.ok(batteryRefresh, "battery refresh boundary missing");
  assert.match(batteryRefresh, /!settingsVisible\(\)/);
  assert.match(batteryRefresh, /kBatteryReadIntervalMs/);
  assert.match(firmwareSource, /kBatteryReadIntervalMs = 10000U/);
  assert.match(batteryRefresh, /M5\.Power\.getBatteryLevel\(\)/);
  assert.match(batteryRefresh, /M5\.Power\.getBatteryVoltage\(\)/);
  assert.match(batteryRefresh, /M5\.Power\.getBatteryCurrent\(\)/);
  assert.match(batteryRefresh, /M5\.Power\.getVBUSVoltage\(\)/);
  assert.match(batteryRefresh, /dischargeCurrentSamples_ >= 3/);
  assert.match(firmwareSource, /kBatteryNominalCapacityMilliampHours = 390U/);
  assert.equal(firmwareSource.match(/M5\.Power\./g)?.length, 4);
  assert.match(firmwareSource, /snapshot\.battery_level_percent = batteryLevelPercent_/);
  assert.match(firmwareSource, /snapshot\.battery_runtime_minutes = batteryRuntimeMinutes_/);

  const settingsRenderer = rendererSource.match(
    /void drawSettings\([\s\S]*?\n}\n\nvoid drawStations/)?.[0];
  assert.ok(settingsRenderer, "settings renderer boundary missing");
  assert.doesNotMatch(settingsRenderer, /translated\(snapshot, "Ustawienia", "Settings"\)/);
  assert.match(settingsRenderer, /battery_level_percent/);
  assert.match(settingsRenderer, /battery_current_milliamps/);
  assert.match(settingsRenderer, /battery_runtime_minutes/);
});

test("optional wall-clock synchronization cannot become a playback dependency", async () => {
  const endpoints = await readFile(new URL("../NETWORK-ENDPOINTS.md", import.meta.url), "utf8");
  assert.match(endpoints, /Time synchronization \| pool\.ntp\.org \| optional(?: —|;) never a playback dependency/);
  assert.match(endpoints, /Recovery timers continue to use monotonic device time/);
  assert.match(firmwareSource, /CET-1CEST,M3\.5\.0\/2,M10\.5\.0\/3/);
  assert.match(firmwareSource,
               /sntp_get_sync_status\(\) == SNTP_SYNC_STATUS_COMPLETED/);
  assert.match(firmwareSource,
               /freshNetworkTime[\s\S]*SNTP_SYNC_STATUS_COMPLETED[\s\S]*M5\.Rtc\.setDateTime\(&utc\)/);
});

test("station logo networking is absent from the minimal firmware", () => {
  assert.doesNotMatch(firmwareSource, /stationArtwork|StationArtworkRuntime|artworkDownloadRequested/);
  assert.doesNotMatch(uiController, /ArtworkStatus|artworkDownloadRequested/);
});

test("the stream source strips URL fragments before they reach the wire", () => {
  // Belt to the catalog-side fix: slots saved by earlier builds may still
  // hold "#NAME" fragment URLs, and smcdn answers 400 to a GET that
  // carries the fragment. The async source truncates at '#' before
  // handing the URL to the upstream HTTP stack.
  assert.match(asyncIcySource,
               /char sanitizedUrl\[kMaximumUrlBytes\];[\s\S]{0,200}std::strchr\(sanitizedUrl, '#'\)[\s\S]{0,80}url = sanitizedUrl;/);
});

test("SPIFFS is never formatted under the loop watchdog", async () => {
  // Field report 2026-07-22 (factory-fresh Core2 v1.1): formatting the
  // 3.4 MB partition in setup() outlives the 30 s panic watchdog, the
  // half-done format restarts every reboot and the device loops forever.
  // The mount in setup() must never format, the factory/secure paths must
  // delete files instead of formatting, and the only SPIFFS.format() call
  // lives in ensureReady() on the unsubscribed logo task.
  const logoStore = await readFile(
    new URL("../firmware/public-candidate/src/logo_store.hpp", import.meta.url), "utf8");
  assert.match(logoStore, /mounted_ = SPIFFS\.begin\(false\);/);
  assert.doesNotMatch(logoStore, /SPIFFS\.begin\(true\)/);
  assert.equal(logoStore.match(/SPIFFS\.format\(\);/g)?.length, 1);
  assert.match(logoStore, /bool ensureReady\(\) \{[\s\S]*?SPIFFS\.format\(\)[\s\S]*?\n  \}/);
  assert.doesNotMatch(logoStore, /void formatAll/);
  assert.doesNotMatch(firmwareSource, /formatAll/);
  // Factory reset and secure reset both use the bounded file deletion.
  assert.match(firmwareSource,
               /putString\("build_sha", OPEN_RADIO_BUILD_SHA\);[\s\S]{0,400}logoStore\.clearStored\(\);/);
  assert.match(firmwareSource, /logoStore\.clearStored\(\);\s*\n\s*const auto eraseResult = nvs_flash_erase\(\);/);
  // The logo task formats the virgin filesystem before its fetch passes.
  assert.match(firmwareSource,
               /void logoFetchTask\(void\*\) \{[\s\S]{0,700}logoStore\.ensureReady\(\)[\s\S]*?for \(int pass = 0; pass < 3; \+\+pass\)/);
});

test("owner production lane is MP3-only with the complete local logo pack", () => {
  const ownerLane = platformIo.match(
    /\[env:core2-owner-production\]([\s\S]*?)(?=\n\[env:|$)/)?.[1];
  assert.ok(ownerLane, "owner-production lane missing");
  assert.match(ownerLane, /OPEN_RADIO_VARIANT_FULL=1/);
  assert.match(ownerLane, /OPEN_RADIO_HAS_LOGO_PACK=1/);
  assert.match(ownerLane, /assets-local\/station-logos/);
  assert.match(ownerLane, /ESP32-A2DP\.git#b6da474/);
  assert.match(ownerLane, /ESP8266Audio\.git#d6184e0/);
  assert.doesNotMatch(
    ownerLane,
    /OPEN_RADIO_HAS_HLS|OPEN_RADIO_HAS_AAC|OPEN_RADIO_LAB_CONSOLE|OPEN_RADIO_LIMIT_A2DP_BITPOOL|--wrap/
  );
  assert.match(firmwareBuildScript,
               /mp3_environments[\s\S]*"core2-owner-production"/);
  assert.match(firmwareBuildScript,
               /a2dp_environments[\s\S]*"core2-owner-production"/);
  const hlsSet = firmwareBuildScript.match(/hls_environments = \{([^}]*)\}/)?.[1];
  assert.ok(hlsSet, "HLS lane set missing");
  assert.doesNotMatch(hlsSet, /owner-production/);
  assert.doesNotMatch(firmwareBuildScript, /aac_environments/);
  assert.doesNotMatch(
    firmwareSource,
    /handleBluetoothRealtimeRefillPriority|setRealtimeRefillPriorityCallback|sustained-low-water/
  );
  assert.doesNotMatch(stationRuntime, /stationPrefersOwnerAac|observeAudio\(/);
});
