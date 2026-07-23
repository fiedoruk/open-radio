import {cp, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";

const root = new URL("../", import.meta.url);
const bundle = new URL("dist/open-radio-core2-rc0/", root);
const excludedSegments = new Set([".pio", ".tools", ".playwright-cli", "build", "dist"]);
const include = [
  "AUTHORS.md",
  "CONTRIBUTING.md",
  "CONTRIBUTING.pl.md",
  "LICENSE",
  "LICENSES.md",
  "NOTICE",
  "package.json",
  "README.md",
  "README.pl.md",
  "SECURITY.md",
  "THIRD-PARTY-NOTICES.md",
  "decisions",
  "docs",
  "firmware",
  "network",
  "network-onboarding",
  "persistence",
  "renderer",
  "resolver",
  "runtime",
  "scripts",
  "simulator",
  "tests",
  "ui-contract"
];

await rm(bundle, {recursive: true, force: true});
await mkdir(bundle, {recursive: true});
for (const path of include) {
  await cp(new URL(path, root), new URL(path, bundle), {
    recursive: true,
    filter: source =>
      !source.split("/").some(segment => excludedSegments.has(segment)) &&
      !source.endsWith("/.DS_Store")
  });
}

const evidence = await readFile(new URL("output/firmware/s10-build-evidence.json", root));
await mkdir(new URL("EVIDENCE/", bundle), {recursive: true});
await cp(new URL("output/firmware/s10-build-evidence.json", root),
  new URL("EVIDENCE/s10-build-evidence.json", bundle));
await cp(new URL("output/firmware/s10-ingress-evidence.json", root),
  new URL("EVIDENCE/s10-ingress-evidence.json", bundle));
const releaseManifest = {
  schemaVersion: 1,
  bundle: "open-radio-core2-rc0",
  sourceOnly: true,
  binaryIncluded: false,
  published: false,
  buildEvidenceSha256: createHash("sha256").update(evidence).digest("hex"),
  runtimeEvidence: "EVIDENCE/s10-ingress-evidence.json"
};
await writeFile(new URL("RELEASE-MANIFEST.json", bundle), `${JSON.stringify(releaseManifest, null, 2)}\n`);
console.log(`PASS release-rehearsal fileset=${include.length} binary=0 published=0`);
