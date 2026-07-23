import {createHash} from "node:crypto";
import {mkdir, readFile, stat, writeFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const build = new URL("firmware/public-candidate/.pio/build/core2-public-candidate/", root);
const output = new URL("output/firmware/", root);
const artifactNames = ["firmware.bin", "firmware.elf", "firmware.map", "partitions.bin", "bootloader.bin"];

const hash = value => createHash("sha256").update(value).digest("hex");
const artifacts = {};
for (const name of artifactNames) {
  const url = new URL(name, build);
  const content = await readFile(url);
  artifacts[name] = {bytes: (await stat(url)).size, sha256: hash(content)};
}

const map = await readFile(new URL("firmware.map", build), "utf8");
const buildLogPath = process.env.OPEN_RADIO_BUILD_LOG;
if (!buildLogPath) throw new Error("OPEN_RADIO_BUILD_LOG is required");
const buildLog = await readFile(buildLogPath, "utf8");
const ramMatch = buildLog.match(/RAM:.*used (\d+) bytes from (\d+) bytes/);
const flashMatch = buildLog.match(/Flash:.*used (\d+) bytes from (\d+) bytes/);
if (!ramMatch || !flashMatch) throw new Error("PlatformIO resource summary missing");
const budgets = JSON.parse(await readFile(new URL("firmware/manifests/resource-budgets.json", root)));
const staticRamBytes = Number(ramMatch[1]);
const applicationFlashBytes = Number(flashMatch[1]);
if (staticRamBytes > budgets.softwareGates.staticRamBytesMax) {
  throw new Error(`static RAM budget exceeded: ${staticRamBytes}`);
}
if (applicationFlashBytes > budgets.softwareGates.applicationFlashBytesMax) {
  throw new Error(`application flash budget exceeded: ${applicationFlashBytes}`);
}
if (artifacts["firmware.bin"].bytes > budgets.softwareGates.publicBinaryBytesMax) {
  throw new Error(`binary budget exceeded: ${artifacts["firmware.bin"].bytes}`);
}
const forbidden = ["AudioGeneratorAAC", "helix", "esp_audio_codec", "esp-adf-libs"];
const foundForbidden = forbidden.filter(term => map.toLowerCase().includes(term.toLowerCase()));
if (foundForbidden.length) throw new Error(`forbidden public symbols: ${foundForbidden.join(", ")}`);

const report = {
  schemaVersion: 1,
  lane: "public-candidate",
  target: "m5stack-core2",
  buildOnly: true,
  hardwareValidated: false,
  resources: {
    staticRamBytes,
    staticRamLimitBytes: Number(ramMatch[2]),
    applicationFlashBytes,
    applicationFlashLimitBytes: Number(flashMatch[2])
  },
  artifacts,
  forbiddenCodecSymbols: foundForbidden,
  componentGraph: [
    "M5Unified@0.2.18",
    "M5GFX@0.2.25",
    "ESP32-A2DP@1.8.11",
    "ESP8266Audio@2.4.1:HTTP+ICY+MP3/libmad-only",
    "Arduino-ESP32@2.0.17"
  ]
};

await mkdir(output, {recursive: true});
const evidenceName = process.env.OPEN_RADIO_EVIDENCE_NAME || "s9-build-evidence.json";
await writeFile(new URL(evidenceName, output), `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS firmware-evidence binary=${artifacts["firmware.bin"].bytes} forbidden=0`);
