// A flash is not finished when esptool says "verify OK". That only proves the
// bytes landed. This proves the device came back: it boots, it reports the
// commit it was built from, its buffers exist, and it keeps talking.
//
// Written after 2026-07-21, when a lab-lane image — carrying 251 AAC decoder
// symbols the owner lane does not have — was flashed onto the only cube, went
// silent on the serial port, and the failure was noticed by the owner rather
// than by any tool.
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root = new URL("../", import.meta.url);
const argument = name => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
};
const port = argument("port") ?? process.env.PORT;
const expectedSha = argument("expect-sha");
const seconds = Number(argument("seconds") ?? 45);

if (!port || !/^\/dev\/cu\./.test(port)) throw new Error("--port must name a /dev/cu.* device");
if (!/^[0-9a-f]{40}$/.test(expectedSha ?? "")) throw new Error("--expect-sha must be the full commit the image was built from");

const reader = `
import serial, sys, time, re
port, seconds = sys.argv[1], float(sys.argv[2])
p = serial.Serial(port, 115200, timeout=1)
p.setDTR(False); p.setRTS(True); time.sleep(0.15); p.setRTS(False)
end = time.time() + seconds
while time.time() < end:
    raw = p.readline()
    if not raw: continue
    line = raw.decode("utf-8", "replace").rstrip()
    line = re.sub(r"([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}", "[MAC]", line)
    line = re.sub(r"(?i)(ssid|password)=\\S+", r"\\1=[REDACTED]", line)
    if line: print(line, flush=True)
p.close()
`;

const result = spawnSync(fileURLToPath(new URL(".tools/venv/bin/python", root)),
                         ["-c", reader, port, String(seconds)],
                         {encoding: "utf8", timeout: (seconds + 20) * 1000});
if (result.error) throw new Error(`serial capture failed: ${result.error.message}`);
const lines = (result.stdout ?? "").split("\n").filter(Boolean);

const failures = [];
const find = pattern => lines.find(line => pattern.test(line)) ?? null;

// A wedged device says nothing at all. That is the exact symptom the July
// hang produced and the one a human noticed before any tool did.
if (lines.length < 8) failures.push(`device produced only ${lines.length} serial lines; a healthy boot prints far more`);

const bootLine = find(/^boot build_sha=/);
if (!bootLine) failures.push("device never reported the commit it was built from");
else {
  const reported = bootLine.split("=")[1]?.trim();
  if (reported !== expectedSha) failures.push(`image reports commit ${reported?.slice(0, 8)} but was registered as ${expectedSha.slice(0, 8)}`);
}

if (!find(/audio_buffers result=ok/)) failures.push("audio buffers did not allocate");
if (find(/Guru Meditation|assert failed|abort\(\) was called|Backtrace:/i)) failures.push("device panicked during boot");

const resetLine = find(/^boot reset_reason=/);
const resetReason = resetLine ? Number(resetLine.split("=")[1]) : null;
// 1 = power-on, 3 = software. 4 = panic, 5/6 = watchdog, 9 = brownout.
if (resetReason !== null && ![1, 3].includes(resetReason)) failures.push(`unhealthy reset reason ${resetReason}`);

// The last third of the window must contain something, or the device stopped
// talking partway through — a hang that a short capture would have missed.
const tail = lines.slice(Math.floor(lines.length * 0.66));
if (tail.length === 0) failures.push("device fell silent before the capture ended");

process.stdout.write(lines.slice(0, 6).map(line => `  ${line}`).join("\n") + "\n");
if (failures.length) {
  process.stderr.write(`FAIL device-boot\n${failures.map(item => `  - ${item}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`PASS device-boot commit=${expectedSha.slice(0, 8)} lines=${lines.length} reset_reason=${resetReason}\n`);
