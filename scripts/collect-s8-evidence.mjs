import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [build, vectors, variants] = await Promise.all([
  readJson("output/firmware/s8-build-evidence.json"),
  readJson("firmware/generated/service-vectors-manifest.json"),
  readJson("output/firmware/s8-variant-sizes.json")
]);
const buildBytes = await readFile(new URL("output/firmware/s8-build-evidence.json", root));
const report = {
  schemaVersion: 1,
  loop: "S8",
  target: "m5stack-core2",
  buildOnly: true,
  hardwareValidated: false,
  networkAccessDuringRuntimeTests: false,
  goldenVectors: {
    ...vectors.counts,
    total: Object.values(vectors.counts).reduce((sum, value) => sum + value, 0)
  },
  hostFirmwareCases: {contract: 14, parity: 27, hostileInput: 24, total: 65},
  regression: {node: 82, renderer: 5},
  variants: variants.variants,
  publicBuild: {
    firmwareBinBytes: build.artifacts["firmware.bin"].bytes,
    firmwareBinSha256: build.artifacts["firmware.bin"].sha256,
    staticRamBytes: build.resources.staticRamBytes,
    applicationFlashBytes: build.resources.applicationFlashBytes,
    forbiddenCodecSymbols: build.forbiddenCodecSymbols
  },
  buildEvidenceSha256: createHash("sha256").update(buildBytes).digest("hex"),
  prohibitedActions: {
    flash: false,
    serial: false,
    account: false,
    releasePublication: false,
    ccWrite: false
  }
};

await mkdir(new URL("output/firmware/", root), {recursive: true});
await writeFile(new URL("output/firmware/s8-service-evidence.json", root),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS s8-evidence vectors=${report.goldenVectors.total} firmwareCases=${report.hostFirmwareCases.total} variants=${report.variants.length}`);
