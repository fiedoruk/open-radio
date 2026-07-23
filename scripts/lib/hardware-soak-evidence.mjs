const allowedPrefixes = [
  "wifi_boot profiles=",
  "wifi_state connected=",
  "audio_buffers result=",
  "memory stage=",
  "audio_qc ",
  "loop_stall ",
  "stream_stage ",
  "bluetooth state=",
  "bluetooth retry_in_ms=",
  "bluetooth retry_deferred ",
  "bluetooth direct_connect_attempt=",
  "bluetooth stack_start=",
  "bluetooth standby_ready",
  "bluetooth listen_policy ",
  "bluetooth initiator=",
  "bluetooth attempt_result=",
  "bluetooth acl=",
  "bluetooth gap_auth_cmpl ",
  "bluetooth inbound_acl ",
  "bluetooth media_started=",
  "bluetooth media_start_rejected",
  "bluetooth fallback=",
  "bluetooth recovery_attempt=",
  "bluetooth recovery_complete_ms=",
  "bluetooth media_probe=",
  "bluetooth timeout_phase=",
  "bluetooth volume=",
  "bluetooth pull_watchdog=",
  "audio_format ",
  "audio_starvation ",
  "boot reset_reason=",
  "boot build_sha=",
  "Guru Meditation Error:",
  "Task watchdog got triggered.",
  "Backtrace:",
  "lab_console ",
  "wifi_link "
];

const forbiddenValue = /(ssid|bssid|password|passwd|credential|token|endpoint|url|mac|address)=/i;

export function sanitizeHardwareLine(rawLine) {
  const line = String(rawLine).replace(/\r/g, "").trim();
  if (!allowedPrefixes.some(prefix => line.startsWith(prefix))) return null;
  if (forbiddenValue.test(line) || /https?:\/\//i.test(line) || /\/dev\/cu\./.test(line)) {
    return null;
  }
  return line;
}

export function parseMetricFields(line) {
  const fields = {};
  for (const token of line.split(/\s+/).slice(1)) {
    const separator = token.indexOf("=");
    if (separator <= 0) continue;
    const key = token.slice(0, separator);
    const value = token.slice(separator + 1);
    fields[key] = /^-?\d+$/.test(value) ? Number(value) : value;
  }
  return fields;
}

function minimum(samples, key) {
  const values = samples.map(sample => sample[key]).filter(Number.isFinite);
  return values.length === 0 ? null : Math.min(...values);
}

function maximum(samples, key) {
  const values = samples.map(sample => sample[key]).filter(Number.isFinite);
  return values.length === 0 ? null : Math.max(...values);
}

const counterKeys = [
  "decoded_backpressure",
  "local_starvations",
  "stream_starts",
  "stream_failures",
  "stream_stops",
  "source_events",
  "input_bytes",
  "input_underruns",
  "bt_active_silence_frames",
  "bt_idle_silence_frames",
  "bt_backpressure",
  "bt_stack_starts",
  "bt_connect_attempts",
  "bt_media_starts",
  "bt_retries",
  "bt_fallbacks",
  "bt_pull_callbacks",
  "bt_pull_watchdogs"
];

const maximumRetainedEvents = 4096;

function counterDeltasBetween(firstAudio, lastAudio) {
  const deltas = {};
  for (const key of counterKeys) {
    deltas[key] =
      Number.isFinite(firstAudio?.[key]) && Number.isFinite(lastAudio?.[key])
        ? lastAudio[key] - firstAudio[key]
        : null;
  }
  return deltas;
}

export function createHardwareSoakCollector({label, startedAt, firmwareArtifact}) {
  const memorySamples = [];
  const audioSamples = [];
  const loopSamples = [];
  const events = [];
  let droppedEvents = 0;
  let bootEpoch = 0;
  const operatorMarkers = [];
  const resetEvents = [];
  const allowedMarkerKinds = new Set([
    "speaker-ready",
    "speaker-power-on-command",
    "wifi-ready",
    "power-restored",
    "stream-recovery-requested",
    "touch-check",
    "station-switch-1",
    "station-switch-2",
    "station-switch-3",
    "station-switch-rmf",
    "steady-window-start",
    "audible-cut",
    "audible-clean"
  ]);

  return {
    mark(kind, elapsedMs) {
      if (!allowedMarkerKinds.has(kind)) return false;
      operatorMarkers.push({kind, elapsedMs});
      return true;
    },

    ingest(rawLine, elapsedMs) {
      const line = sanitizeHardwareLine(rawLine);
      if (line === null) return null;
      if (line.startsWith("boot reset_reason=")) {
        const reason = Number(line.slice("boot reset_reason=".length));
        const midCapture =
          memorySamples.length > 0 || audioSamples.length > 0 || loopSamples.length > 0;
        if (midCapture) ++bootEpoch;
        resetEvents.push({elapsedMs, reason, midCapture, bootEpoch});
      }
      const sample = {elapsedMs, bootEpoch, ...parseMetricFields(line)};
      if (line.startsWith("memory stage=")) memorySamples.push(sample);
      else if (line.startsWith("audio_qc ")) audioSamples.push(sample);
      else if (line.startsWith("loop_stall ")) loopSamples.push(sample);
      else if (events.length < maximumRetainedEvents) {
        events.push({elapsedMs, line});
      } else {
        ++droppedEvents;
      }
      return line;
    },

    finish({endedAt, requestedDurationSeconds, completed}) {
      const firstAudio = audioSamples.at(0) ?? null;
      const lastAudio = audioSamples.at(-1) ?? null;
      const midCaptureResetCount = resetEvents.filter(event => event.midCapture).length;
      const panicEventCount = events.filter(event =>
        event.line.startsWith("Guru Meditation Error:") ||
        event.line.startsWith("Task watchdog got triggered.") ||
        event.line.startsWith("Backtrace:")).length;
      const counterDeltasByEpoch = [];
      for (const epoch of [...new Set(audioSamples.map(sample => sample.bootEpoch))]) {
        const epochSamples = audioSamples.filter(sample => sample.bootEpoch === epoch);
        counterDeltasByEpoch.push({
          bootEpoch: epoch,
          firstElapsedMs: epochSamples[0].elapsedMs,
          lastElapsedMs: epochSamples.at(-1).elapsedMs,
          counterDeltas: counterDeltasBetween(epochSamples[0], epochSamples.at(-1))
        });
      }
      const counterDeltas =
        midCaptureResetCount === 0
          ? counterDeltasBetween(firstAudio, lastAudio)
          : null;

      return {
        schemaVersion: 2,
        label,
        startedAt,
        endedAt,
        requestedDurationSeconds,
        completed,
        firmwareArtifact,
        sampleCounts: {
          memory: memorySamples.length,
          audio: audioSamples.length,
          loop: loopSamples.length,
          events: events.length,
          eventsDropped: droppedEvents,
          resetEvents: resetEvents.length,
          midCaptureResets: midCaptureResetCount,
          panicEvents: panicEventCount
        },
        memory: {
          samples: memorySamples,
          first: memorySamples.at(0) ?? null,
          last: memorySamples.at(-1) ?? null,
          minimumObserved: {
            dram_free: minimum(memorySamples, "dram_free"),
            dram_min: minimum(memorySamples, "dram_min"),
            dram_largest: minimum(memorySamples, "dram_largest"),
            psram_free: minimum(memorySamples, "psram_free"),
            psram_min: minimum(memorySamples, "psram_min"),
            psram_largest: minimum(memorySamples, "psram_largest"),
            loop_stack_bytes: minimum(memorySamples, "loop_stack_bytes")
          }
        },
        audio: {
          samples: audioSamples,
          first: firstAudio,
          last: lastAudio,
          minimumObserved: {
            bt_event_stack_bytes: minimum(audioSamples, "bt_event_stack_bytes"),
            input_worker_stack_bytes: minimum(
              audioSamples, "input_worker_stack_bytes")
          },
          counterDeltas,
          counterDeltasValid: midCaptureResetCount === 0,
          counterDeltasByEpoch
        },
        loop: {
          samples: loopSamples
        },
        maximumLoopMilliseconds: {
          loop: maximum(loopSamples, "max_ms"),
          audio: maximum(loopSamples, "audio_ms"),
          drain: maximum(loopSamples, "drain_ms"),
          ui_tick: maximum(loopSamples, "ui_tick_ms"),
          ui_flush: maximum(loopSamples, "ui_flush_ms")
        },
        resetEvents,
        operatorMarkers,
        events
      };
    }
  };
}
