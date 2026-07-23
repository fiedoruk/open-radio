import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const writeEvidence = process.argv.includes("--write");
const defaultEvidenceUrl = new URL("../renderer/evidence/now-playing-rmf-local.hash", import.meta.url);
const matrixEvidenceUrl = new URL("../renderer/evidence/production-screen-matrix.sha256", import.meta.url);
const expectedHash = writeEvidence ? null : (await readFile(defaultEvidenceUrl, "utf8")).trim();
const expectedMatrixHash = writeEvidence ? null : (await readFile(matrixEvidenceUrl, "utf8")).trim();
const temporaryDirectory = await mkdtemp(join(tmpdir(), "open-radio-renderer-"));
const compiler = process.env.CXX || "c++";
const binaries = [join(temporaryDirectory, "renderer-a"), join(temporaryDirectory, "renderer-b")];
const paths = [join(temporaryDirectory, "first.ppm"), join(temporaryDirectory, "second.ppm")];
const compileArguments = [
  "-std=c++17", "-O2", "-Wall", "-Wextra", "-Werror", "-pedantic",
  `-I${join(root, "renderer/include")}`,
  `-I${join(root, "renderer/generated")}`,
  join(root, "renderer/src/renderer.cpp"),
  join(root, "renderer/host/main.cpp")
];

function build(binary) {
  const result = spawnSync(compiler, [...compileArguments, "-o", binary], {encoding: "utf8"});
  if (result.status !== 0) throw new Error(result.stderr || `compiler exited ${result.status}`);
}

function render(binary, path, argumentsList = []) {
  const result = spawnSync(binary, [path, ...argumentsList], {encoding: "utf8"});
  if (result.status !== 0) throw new Error(result.stderr || `renderer exited ${result.status}`);
  const match = result.stdout.match(/hash=([0-9a-f]{16})/);
  if (!match) throw new Error(`renderer hash missing: ${result.stdout}`);
  return {hash: match[1], output: result.stdout.trim()};
}

try {
  build(binaries[0]);
  build(binaries[1]);
  const first = render(binaries[0], paths[0]);
  const second = render(binaries[1], paths[1]);
  const [firstPpm, secondPpm] = await Promise.all(paths.map(path => readFile(path)));
  if (first.hash !== second.hash) throw new Error(`hash mismatch ${first.hash} != ${second.hash}`);
  if (!firstPpm.equals(secondPpm)) throw new Error("PPM byte mismatch");
  const screens = [
    "now-playing-editorial", "now-playing-glance", "screensaver-pulse", "screensaver-bars", "screensaver-orbit", "screensaver-cat",
    "display-off", "stations", "volume-control", "brightness-control", "settings-quick", "settings-system", "settings-display", "noise", "wifi-status",
    "wifi-recovery", "bluetooth-fallback", "unsupported", "safe-mode", "onboarding-wifi",
    "onboarding-first-sound", "onboarding-bluetooth", "bluetooth-pairing", "diagnostics", "about", "market"
  ];
  const matrix = createHash("sha256");
  let matrixCases = 0;
  for (const screen of screens) {
    for (const theme of ["dark", "light"]) {
      for (const locale of ["pl", "en"]) {
        const caseName = `${screen}:${theme}:${locale}`;
        const firstPath = join(temporaryDirectory, `first-${matrixCases}.ppm`);
        const secondPath = join(temporaryDirectory, `second-${matrixCases}.ppm`);
        const argumentsList = ["--screen", screen, "--theme", theme, "--locale", locale, "--station", "4", "--volume", "75", "--output", "local", "--degraded", "false", "--noise-color", "pink", "--noise-playing", "true", "--clock", "2026-07-18T21:42", "--track", "Męskie Granie — Supermoce"];
        const firstCase = render(binaries[0], firstPath, argumentsList);
        const secondCase = render(binaries[1], secondPath, argumentsList);
        const [firstFrame, secondFrame] = await Promise.all([readFile(firstPath), readFile(secondPath)]);
        if (firstCase.hash !== secondCase.hash || !firstFrame.equals(secondFrame)) throw new Error(`renderer matrix mismatch: ${caseName}`);
        matrix.update(caseName).update("\0").update(firstFrame);
        matrixCases += 1;
      }
    }
  }
  const matrixHash = matrix.digest("hex");
  if (writeEvidence) {
    await Promise.all([
      writeFile(defaultEvidenceUrl, `${first.hash}\n`),
      writeFile(matrixEvidenceUrl, `${matrixHash}\n`)
    ]);
  } else {
    if (first.hash !== expectedHash) throw new Error(`expected hash ${expectedHash}, received ${first.hash}`);
    if (matrixHash !== expectedMatrixHash) throw new Error(`expected matrix hash ${expectedMatrixHash}, received ${matrixHash}`);
  }
  const version = spawnSync(compiler, ["--version"], {encoding: "utf8"}).stdout.split("\n")[0];
  process.stdout.write(`PASS renderer-determinism hash=${first.hash} matrix=${matrixHash} cases=${matrixCases} bytes=${firstPpm.length} clean_builds=2 compiler=${version}${writeEvidence ? " evidence=written" : ""}\n`);
} finally {
  await rm(temporaryDirectory, {recursive: true, force: true});
}
