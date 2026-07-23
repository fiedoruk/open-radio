import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {
  createHardwareSoakCollector,
  parseMetricFields,
  sanitizeHardwareLine
} from "../scripts/lib/hardware-soak-evidence.mjs";

test("hardware soak allowlist rejects identity and transport details", () => {
  assert.equal(sanitizeHardwareLine("MAC: [REDACTED]"), null);
  assert.equal(sanitizeHardwareLine("station endpoint=https://example.test/live"), null);
  assert.equal(sanitizeHardwareLine("memory stage=runtime ssid=private dram_free=1"), null);
  assert.equal(
    sanitizeHardwareLine("memory stage=runtime dram_free=27100 dram_min=12000"),
    "memory stage=runtime dram_free=27100 dram_min=12000");
  assert.equal(
    sanitizeHardwareLine("wifi_boot profiles=4"),
    "wifi_boot profiles=4");
  assert.equal(
    sanitizeHardwareLine("wifi_state connected=yes profile=0"),
    "wifi_state connected=yes profile=0");
  assert.equal(
    sanitizeHardwareLine("wifi_scan visible=8 candidate=known profiles=4"),
    null);
  assert.equal(
    sanitizeHardwareLine("audio_buffers result=ok decoded_psram=262144"),
    "audio_buffers result=ok decoded_psram=262144");
  assert.equal(
    sanitizeHardwareLine("boot build_sha=0123456789abcdef0123456789abcdef01234567"),
    "boot build_sha=0123456789abcdef0123456789abcdef01234567");
  assert.equal(
    sanitizeHardwareLine("Guru Meditation Error: Core 1 panic'ed (Task watchdog got triggered)"),
    "Guru Meditation Error: Core 1 panic'ed (Task watchdog got triggered)");
  assert.equal(
    sanitizeHardwareLine("Backtrace: 0x40081234:0x3ffbe000 0x40085678:0x3ffbe020"),
    "Backtrace: 0x40081234:0x3ffbe000 0x40085678:0x3ffbe020");
  assert.equal(
    sanitizeHardwareLine("stream_stage stage=decode-refill duration_ms=3885 result=running frames_before=0 frames_after=262144"),
    "stream_stage stage=decode-refill duration_ms=3885 result=running frames_before=0 frames_after=262144");
  assert.equal(
    sanitizeHardwareLine("stream_stage stage=connect duration_ms=500 endpoint=https://private.test"),
    null);
  assert.equal(
    sanitizeHardwareLine("bluetooth media_probe=1 result=sent link_age_ms=251"),
    "bluetooth media_probe=1 result=sent link_age_ms=251");
  assert.equal(
    sanitizeHardwareLine("bluetooth timeout_phase=buffer elapsed_ms=5000 bt_buffered=229376 decoded_frames=147456 local_blocks=1"),
    "bluetooth timeout_phase=buffer elapsed_ms=5000 bt_buffered=229376 decoded_frames=147456 local_blocks=1");
  assert.equal(
    sanitizeHardwareLine("bluetooth retry_deferred local_blocks=2 decoded_frames=212992"),
    "bluetooth retry_deferred local_blocks=2 decoded_frames=212992");
  assert.equal(
    sanitizeHardwareLine("bluetooth standby_ready local_blocks=2 decoded_frames=262144 bt_frames=262144"),
    "bluetooth standby_ready local_blocks=2 decoded_frames=262144 bt_frames=262144");
  assert.equal(
    sanitizeHardwareLine("bluetooth initiator=remote dial_age_ms=4294967295 result=accepted"),
    "bluetooth initiator=remote dial_age_ms=4294967295 result=accepted");
  assert.equal(
    sanitizeHardwareLine("bluetooth attempt_result=dirty duration_ms=6501"),
    "bluetooth attempt_result=dirty duration_ms=6501");
  assert.equal(
    sanitizeHardwareLine("bluetooth attempt_result=clean_timeout duration_ms=5122"),
    "bluetooth attempt_result=clean_timeout duration_ms=5122");
  assert.equal(
    sanitizeHardwareLine("bluetooth attempt_result=success duration_ms=429"),
    "bluetooth attempt_result=success duration_ms=429");
  assert.equal(
    sanitizeHardwareLine("bluetooth listen_policy connectable=yes peer_enabled=yes"),
    "bluetooth listen_policy connectable=yes peer_enabled=yes");
  assert.equal(
    sanitizeHardwareLine("bluetooth gap_auth_cmpl stat=0 peer=remembered dial_age_ms=4294967295"),
    "bluetooth gap_auth_cmpl stat=0 peer=remembered dial_age_ms=4294967295");
  assert.equal(
    sanitizeHardwareLine("bluetooth inbound_acl action=profile_dial_pending"),
    "bluetooth inbound_acl action=profile_dial_pending");
  assert.equal(
    sanitizeHardwareLine("bluetooth acl=conn dial_age_ms=5132 stat=4"),
    "bluetooth acl=conn dial_age_ms=5132 stat=4");
  assert.equal(
    sanitizeHardwareLine("bluetooth acl=disconn dial_age_ms=6502 reason=19"),
    "bluetooth acl=disconn dial_age_ms=6502 reason=19");
  assert.equal(
    sanitizeHardwareLine("bluetooth media_start_rejected reason=standby_not_ready"),
    "bluetooth media_start_rejected reason=standby_not_ready");
});

test("metric parser keeps numeric counters and public route states", () => {
  assert.deepEqual(
    parseMetricFields("audio_qc route=bluetooth bt_retries=3 bt_fallbacks=1"),
    {route: "bluetooth", bt_retries: 3, bt_fallbacks: 1});
});

test("hardware soak summary reports minima maxima and counter deltas", () => {
  const collector = createHardwareSoakCollector({
    label: "fixture",
    startedAt: "2026-07-16T06:00:00.000Z",
    firmwareArtifact: {
      lane: "core2-hardware-lab",
      sha256: "0ab0595616d30e7e6fe1eb46a916630e32b4dc1e792420409610728795bfc336",
      byteSize: 2373936
    }
  });
  collector.ingest(
    "memory stage=runtime dram_free=27000 dram_min=12000 dram_largest=16000 psram_free=2400000 psram_min=2390000 psram_largest=2380000 loop_stack_bytes=4100",
    0);
  collector.ingest(
    "audio_qc route=bluetooth stream_starts=2 stream_stops=1 input_bytes=10000 input_underruns=1 input_worker_stack_bytes=1200 bt_event_stack_bytes=900 bt_active_silence_frames=100 bt_retries=1 bt_fallbacks=0 bt_pull_watchdogs=0",
    1);
  collector.ingest(
    "loop_stall max_ms=101 audio_ms=90 drain_ms=6 ui_tick_ms=1 ui_flush_ms=99",
    2);
  collector.ingest(
    "memory stage=runtime dram_free=26000 dram_min=11000 dram_largest=15000 psram_free=2395000 psram_min=2385000 psram_largest=2375000 loop_stack_bytes=4050",
    60000);
  collector.ingest(
    "audio_qc route=bluetooth stream_starts=3 stream_stops=2 input_bytes=30000 input_underruns=2 input_worker_stack_bytes=1100 bt_event_stack_bytes=850 bt_active_silence_frames=120 bt_retries=2 bt_fallbacks=1 bt_pull_watchdogs=0",
    60001);
  collector.ingest(
    "loop_stall max_ms=88 audio_ms=70 drain_ms=5 ui_tick_ms=1 ui_flush_ms=80",
    60002);
  assert.equal(collector.mark("speaker-ready", 30000), true);
  assert.equal(collector.mark("speaker-power-on-command", 30001), true);
  assert.equal(collector.mark("touch-check", 30002), true);
  assert.equal(collector.mark("station-switch-1", 30003), true);
  assert.equal(collector.mark("station-switch-2", 30004), true);
  assert.equal(collector.mark("station-switch-3", 30005), true);
  assert.equal(collector.mark("station-switch-rmf", 30006), true);
  assert.equal(collector.mark("steady-window-start", 30008), true);
  assert.equal(collector.mark("audible-cut", 30009), true);
  assert.equal(collector.mark("audible-clean", 30010), true);
  assert.equal(collector.mark("private-free-text", 30011), false);
  const summary = collector.finish({
    endedAt: "2026-07-16T06:01:00.000Z",
    requestedDurationSeconds: 60,
    completed: true
  });
  assert.equal(summary.memory.minimumObserved.dram_free, 26000);
  assert.deepEqual(summary.firmwareArtifact, {
    lane: "core2-hardware-lab",
    sha256: "0ab0595616d30e7e6fe1eb46a916630e32b4dc1e792420409610728795bfc336",
    byteSize: 2373936
  });
  assert.equal(summary.memory.minimumObserved.dram_largest, 15000);
  assert.equal(summary.maximumLoopMilliseconds.audio, 90);
  assert.equal(summary.schemaVersion, 2);
  assert.equal(summary.sampleCounts.eventsDropped, 0);
  assert.equal(summary.sampleCounts.midCaptureResets, 0);
  assert.equal(summary.sampleCounts.panicEvents, 0);
  assert.equal(summary.memory.samples.length, 2);
  assert.equal(summary.audio.samples.length, 2);
  assert.equal(summary.loop.samples.length, 2);
  assert.equal(summary.audio.samples[1].elapsedMs, 60001);
  assert.equal(summary.audio.minimumObserved.bt_event_stack_bytes, 850);
  assert.equal(summary.audio.minimumObserved.input_worker_stack_bytes, 1100);
  assert.equal(summary.audio.counterDeltas.input_bytes, 20000);
  assert.equal(summary.audio.counterDeltas.input_underruns, 1);
  assert.equal(summary.audio.counterDeltas.bt_active_silence_frames, 20);
  assert.equal(summary.audio.counterDeltas.bt_fallbacks, 1);
  assert.equal(summary.audio.counterDeltas.bt_pull_watchdogs, 0);
  assert.equal(summary.audio.counterDeltasValid, true);
  assert.equal(summary.audio.counterDeltasByEpoch.length, 1);
  assert.deepEqual(summary.operatorMarkers, [
    {kind: "speaker-ready", elapsedMs: 30000},
    {kind: "speaker-power-on-command", elapsedMs: 30001},
    {kind: "touch-check", elapsedMs: 30002},
    {kind: "station-switch-1", elapsedMs: 30003},
    {kind: "station-switch-2", elapsedMs: 30004},
    {kind: "station-switch-3", elapsedMs: 30005},
    {kind: "station-switch-rmf", elapsedMs: 30006},
    {kind: "steady-window-start", elapsedMs: 30008},
    {kind: "audible-cut", elapsedMs: 30009},
    {kind: "audible-clean", elapsedMs: 30010}
  ]);
});

test("hardware soak segments counter deltas across a mid-capture reboot", () => {
  const collector = createHardwareSoakCollector({
    label: "reboot-segmentation",
    startedAt: "2026-07-18T10:00:00.000Z",
    firmwareArtifact: {
      lane: "core2-hardware-lab",
      sha256: "94c25a9e373f2bc0b3dabeaf4af19483362aa9486a7eafd638f25b2d9e562f12",
      byteSize: 2528976
    }
  });
  collector.ingest(
    "audio_qc route=bluetooth stream_starts=3 stream_stops=2 bt_active_silence_frames=0 bt_pull_callbacks=900",
    1000);
  collector.ingest("boot reset_reason=6", 2000);
  collector.ingest(
    "audio_qc route=local stream_starts=0 stream_stops=0 bt_active_silence_frames=0 bt_pull_callbacks=0",
    3000);
  collector.ingest(
    "audio_qc route=bluetooth stream_starts=1 stream_stops=0 bt_active_silence_frames=0 bt_pull_callbacks=100",
    4000);

  const summary = collector.finish({
    endedAt: "2026-07-18T10:01:00.000Z",
    requestedDurationSeconds: 60,
    completed: true
  });
  assert.equal(summary.sampleCounts.resetEvents, 1);
  assert.equal(summary.sampleCounts.midCaptureResets, 1);
  assert.deepEqual(summary.resetEvents, [
    {elapsedMs: 2000, reason: 6, midCapture: true, bootEpoch: 1}
  ]);
  assert.equal(summary.audio.counterDeltas, null);
  assert.equal(summary.audio.counterDeltasValid, false);
  assert.equal(summary.audio.counterDeltasByEpoch.length, 2);
  assert.equal(
    summary.audio.counterDeltasByEpoch[1].counterDeltas.bt_pull_callbacks,
    100);
});

test("hardware soak summary makes event truncation explicit", () => {
  const collector = createHardwareSoakCollector({
    label: "event-cap",
    startedAt: "2026-07-18T08:00:00.000Z",
    firmwareArtifact: {
      lane: "core2-hardware-lab",
      sha256: "6b01752fd9d20a540469693cfd3ccacd0589468a4313fef6d17041023c0b804d",
      byteSize: 2528992
    }
  });
  for (let index = 0; index < 4100; ++index) {
    collector.ingest("boot reset_reason=1", index);
  }
  const summary = collector.finish({
    endedAt: "2026-07-18T08:01:00.000Z",
    requestedDurationSeconds: 60,
    completed: true
  });
  assert.equal(summary.sampleCounts.events, 4096);
  assert.equal(summary.sampleCounts.eventsDropped, 4);
  assert.equal(summary.events.length, 4096);
});

test("capture releases resumed stdin after writing final evidence", async () => {
  const captureSource = await readFile(
    new URL("../scripts/capture-hardware-soak.mjs", import.meta.url),
    "utf8"
  );
  assert.match(
    captureSource,
    /await writeFile\([\s\S]*process\.stdin\.removeAllListeners\("data"\)[\s\S]*process\.stdin\.pause\(\)/
  );
  assert.match(captureSource, /midCaptureResets === 0/);
  assert.match(captureSource, /panicEvents === 0/);
  assert.match(captureSource, /eventsDropped === 0/);
  for (const marker of [
    "touch-check",
    "station-switch-1",
    "station-switch-2",
    "station-switch-3",
    "station-switch-rmf",
    "steady-window-start",
    "audible-cut",
    "audible-clean"
  ]) {
    assert.match(captureSource, new RegExp(`\\|${marker}`));
  }
});
