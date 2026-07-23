import {execFileSync, spawn} from "node:child_process";
import {createHash} from "node:crypto";
import {createWriteStream} from "node:fs";
import {mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {createHardwareSoakCollector} from "./lib/hardware-soak-evidence.mjs";

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const durationSeconds = Number(argument("--duration-seconds"));
const label = argument("--label");
const firmwareLane = argument("--firmware-lane", "core2-hardware-lab");
const firmwarePath = resolve(argument(
  "--firmware-path",
  "firmware/public-candidate/.pio/build/core2-hardware-lab/firmware.bin"
));
if (!Number.isInteger(durationSeconds) || durationSeconds < 10 || durationSeconds > 90000) {
  throw new Error("--duration-seconds must be an integer from 10 through 90000");
}
if (typeof label !== "string" || !/^[a-z0-9][a-z0-9-]{1,47}$/.test(label)) {
  throw new Error("--label must be 2-48 lowercase letters, digits or hyphens");
}
if (typeof firmwareLane !== "string" ||
    !/^[a-z0-9][a-z0-9-]{1,47}$/.test(firmwareLane)) {
  throw new Error("--firmware-lane must be 2-48 lowercase letters, digits or hyphens");
}
if (process.env.ESP32_ALLOW_DEVICE_ACTION !== "1" ||
    !process.env.PORT?.startsWith("/dev/cu.")) {
  throw new Error("guarded PORT and ESP32_ALLOW_DEVICE_ACTION=1 are required");
}
const switchPlanRaw = argument("--switch-plan");
const switchPlan = [];
if (switchPlanRaw !== null) {
  for (const entry of switchPlanRaw.split(",")) {
    const match = entry.trim().match(/^(\d{1,5}):(\d{1,2})$/);
    if (!match) {
      throw new Error(
        "--switch-plan entries must be offsetSeconds:stationIndex");
    }
    const offsetSeconds = Number(match[1]);
    if (offsetSeconds < 5 || offsetSeconds > durationSeconds - 5) {
      throw new Error("--switch-plan offsets must sit inside the capture window");
    }
    switchPlan.push({offsetSeconds, stationIndex: Number(match[2])});
  }
}

const startedAt = new Date().toISOString();
const startedMs = Date.now();
const firmwareBytes = await readFile(firmwarePath);
const firmwareArtifact = {
  lane: firmwareLane,
  sha256: createHash("sha256").update(firmwareBytes).digest("hex"),
  byteSize: firmwareBytes.byteLength
};
const collector = createHardwareSoakCollector({
  label,
  startedAt,
  firmwareArtifact
});
const outputDirectory = resolve("output/hardware-soaks");
await mkdir(outputDirectory, {recursive: true});
const outputPath = resolve(outputDirectory, `${startedAt.replaceAll(":", "-")}-${label}.json`);
process.stdout.write(
  `CAPTURE ARTIFACT lane=${firmwareArtifact.lane} sha256=${firmwareArtifact.sha256} bytes=${firmwareArtifact.byteSize}\n`
);

// PlatformIO's serial monitor exits immediately without a terminal. BSD
// `script` provides a private PTY while stdout remains available to the
// allowlist parser. The typescript target is /dev/null, so no raw serial copy
// is persisted. With a --switch-plan, the monitor's stdin comes from a FIFO
// so scheduled `station N` commands reach the device through the monitor's
// own transmit path — opening the tty a second time would pulse DTR/RTS and
// reset the board mid-capture.
const controlPipePath = switchPlan.length > 0
  ? resolve(outputDirectory, `.control-${label}-${startedMs}.pipe`)
  : null;
if (controlPipePath !== null) execFileSync("mkfifo", [controlPipePath]);
const monitorInput = controlPipePath === null
  ? "tail -f /dev/null"
  : `cat ${JSON.stringify(controlPipePath)}`;
const child = spawn(
  "bash",
  [
    "-c",
    `${monitorInput} | script -q -F /dev/null bash scripts/core2-device-action.sh monitor`
  ],
  {
    cwd: resolve("."),
    env: process.env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

let buffered = "";
let inputBuffered = "";
let requestedStop = false;
let finalized = false;

process.stdin.setEncoding("utf8");
process.stdin.resume();
process.stdin.on("data", chunk => {
  inputBuffered += chunk;
  const lines = inputBuffered.split(/\r?\n/);
  inputBuffered = lines.pop() ?? "";
  for (const line of lines) {
    const match = line.trim().match(/^marker (speaker-ready|speaker-power-on-command|wifi-ready|power-restored|stream-recovery-requested|touch-check|station-switch-1|station-switch-2|station-switch-3|station-switch-rmf|steady-window-start|audible-cut|audible-clean)$/);
    if (match && collector.mark(match[1], Date.now() - startedMs)) {
      process.stdout.write(
        `CAPTURE MARKER label=${label} kind=${match[1]} elapsed_ms=${Date.now() - startedMs}\n`
      );
    }
  }
});

function consume(chunk) {
  buffered += chunk.toString("utf8");
  const lines = buffered.split(/\n/);
  buffered = lines.pop() ?? "";
  for (const line of lines) {
    const accepted = collector.ingest(line, Date.now() - startedMs);
    if (accepted?.startsWith("memory stage=") ||
        accepted?.startsWith("wifi_boot profiles=") ||
        accepted?.startsWith("wifi_state connected=") ||
        accepted?.startsWith("wifi_link ") ||
        accepted?.startsWith("audio_buffers result=") ||
        accepted?.startsWith("audio_qc ") ||
        accepted?.startsWith("lab_console ") ||
        accepted?.startsWith("bluetooth media_started=")) {
      process.stdout.write(`capture ${label} elapsed_s=${Math.floor((Date.now() - startedMs) / 1000)} ${accepted}\n`);
    }
  }
}

child.stdout.on("data", consume);
child.stderr.on("data", consume);

const controlStream =
  controlPipePath === null ? null : createWriteStream(controlPipePath);
const switchTimers = [];
for (const {offsetSeconds, stationIndex} of switchPlan) {
  switchTimers.push(setTimeout(() => {
    controlStream.write(`station ${stationIndex}\n`);
    process.stdout.write(
      `CAPTURE SWITCH label=${label} elapsed_s=${offsetSeconds} station=${stationIndex}\n`
    );
  }, offsetSeconds * 1000));
}

function stopChild() {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    process.kill(-child.pid, "SIGINT");
  } catch {
    child.kill("SIGINT");
  }
}

const timer = setTimeout(() => {
  requestedStop = true;
  stopChild();
  setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
  }, 3000).unref();
}, durationSeconds * 1000);

async function finalize(completed) {
  if (finalized) return;
  finalized = true;
  clearTimeout(timer);
  for (const switchTimer of switchTimers) clearTimeout(switchTimer);
  if (controlStream !== null) controlStream.end();
  if (controlPipePath !== null) await rm(controlPipePath, {force: true});
  if (buffered) collector.ingest(buffered, Date.now() - startedMs);
  const result = collector.finish({
    endedAt: new Date().toISOString(),
    requestedDurationSeconds: durationSeconds,
    completed
  });
  const requiredPeriodicSamples =
    durationSeconds < 60 ? 0 : Math.max(1, Math.floor(durationSeconds / 60) - 1);
  result.captureHealth = {
    requiredPeriodicSamples,
    memorySamplesPresent:
      result.sampleCounts.memory >= requiredPeriodicSamples,
    audioSamplesPresent:
      result.sampleCounts.audio >= requiredPeriodicSamples,
    midCaptureResets: result.sampleCounts.midCaptureResets,
    panicEvents: result.sampleCounts.panicEvents,
    eventsDropped: result.sampleCounts.eventsDropped
  };
  const healthy =
    completed && result.captureHealth.memorySamplesPresent &&
    result.captureHealth.audioSamplesPresent &&
    result.captureHealth.midCaptureResets === 0 &&
    result.captureHealth.panicEvents === 0 &&
    result.captureHealth.eventsDropped === 0;
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, {mode: 0o600});
  process.stdout.write(
    `CAPTURE ${healthy ? "COMPLETE" : "INCOMPLETE"} label=${label} memory_samples=${result.sampleCounts.memory} audio_samples=${result.sampleCounts.audio} output=${outputPath}\n`
  );
  if (!healthy) process.exitCode = 1;
  // stdin was resumed to accept fixed operator markers. Release that handle
  // after the evidence file is durable so a completed capture cannot retain
  // its parent PTY or serial-monitor resources.
  process.stdin.removeAllListeners("data");
  process.stdin.pause();
}

child.on("error", async error => {
  process.stderr.write(`${error.message}\n`);
  await finalize(false);
});
child.on("close", async () => {
  await finalize(requestedStop);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    requestedStop = false;
    stopChild();
  });
}
