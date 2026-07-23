import {mkdir, stat, writeFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const buildRoot = new URL("firmware/public-candidate/.pio/build/", root);
const outputName = process.env.OPEN_RADIO_VARIANT_EVIDENCE_NAME ?? "s10-variant-sizes.json";
const outputUrl = new URL(`output/firmware/${outputName}`, root);
const environments = [
  "core2-public-candidate",
  "core2-onboarding-only",
  "core2-local-speaker-fallback",
  "core2-bt-disabled-diagnostics",
  "core2-corrupt-config-safe-mode"
];

const sizes = {};
for (const environment of environments) {
  sizes[environment] = (await stat(new URL(`${environment}/firmware.bin`, buildRoot))).size;
}
const baseline = sizes["core2-public-candidate"];
const variants = environments.map(environment => ({
  environment,
  binaryBytes: sizes[environment],
  deltaFromPublicBytes: sizes[environment] - baseline
}));
const report = {
  schemaVersion: 1,
  target: "m5stack-core2",
  buildOnly: true,
  hardwareValidated: false,
  variants
};

await mkdir(new URL("output/firmware/", root), {recursive: true});
await writeFile(outputUrl, `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS firmware-variants count=${variants.length} baseline=${baseline}`);
