import {spawnSync} from "node:child_process";
import {lstat, mkdir, readFile, readdir, writeFile} from "node:fs/promises";

import {validateCommunityEvidence} from "../community/evidence.mjs";
import {replayCommunityPacket} from "../community/replay.mjs";
import {buildDeterministicTar, jsonBytes, sha256} from "./lib/deterministic-archive.mjs";

const root = new URL("../", import.meta.url);
const writeLock = process.argv.includes("--write");
if (process.argv.some(argument => !["--write", "--check"].includes(argument) && argument !== process.argv[0] && argument !== process.argv[1])) {
  throw new Error("usage: node scripts/rehearse-rc1-source.mjs [--check|--write]");
}
const readJson = path => readFile(new URL(path, root), "utf8").then(JSON.parse);
const [policy, candidate, expectations] = await Promise.all([
  readJson("release/rc1-source-policy.json"),
  readJson("release/rc1-candidate.json"),
  readJson("community/fixture-expectations.json")
]);
const excludedSegments = new Set(policy.excludedSegments);
const excludedPaths = new Set(policy.excludedPaths);
const excludedSuffixes = new Set(policy.excludedSuffixes);
const allowedBinarySources = new Set(policy.allowedBinarySources ?? []);
const credentialPattern = /(?:ssid|wifiPassword|wifiSsid|password|passphrase|credential)\s*(?::|(?<![=!<>])=(?!=))\s*["'][^"']{3,}["']/i;
const macPattern = /(?:^|[^0-9a-f])(?:[0-9a-f]{2}:){5}[0-9a-f]{2}(?:$|[^0-9a-f])/i;
const resolvedEndpointPattern = /["'](?:resolved[_-]?endpoint|endpoint[_-]?url|stream[_-]?url)["']\s*:\s*["']https?:\/(?!\/example\.invalid)/i;

function isExcluded(path) {
  if (excludedPaths.has(path) || path.endsWith("/.DS_Store") || path === ".DS_Store") return true;
  const segments = path.split("/");
  if (segments.some(segment => excludedSegments.has(segment))) return true;
  return [...excludedSuffixes].some(suffix => path.toLowerCase().endsWith(suffix));
}

async function collectPath(path, entries) {
  if (isExcluded(path)) return;
  const metadata = await lstat(new URL(path, root));
  if (metadata.isSymbolicLink()) throw new Error(`source package rejects symlink: ${path}`);
  if (metadata.isDirectory()) {
    const children = (await readdir(new URL(`${path}/`, root))).sort((left, right) => left.localeCompare(right, "en"));
    for (const child of children) await collectPath(`${path}/${child}`, entries);
    return;
  }
  if (!metadata.isFile()) throw new Error(`source package rejects special file: ${path}`);
  entries.set(path, {path, data: await readFile(new URL(path, root)), mode: metadata.mode & 0o111 ? 0o755 : 0o644});
}

function runGeneratorChecks() {
  for (const arguments_ of policy.generatorChecks) {
    const usesPython = arguments_[0] === "python3";
    const command = usesPython ? arguments_[0] : process.execPath;
    const commandArguments = usesPython ? arguments_.slice(1) : arguments_;
    const result = spawnSync(command, commandArguments, {cwd: root.pathname, encoding: "utf8"});
    if (result.status !== 0) throw new Error(`generated drift check failed: ${arguments_.join(" ")}\n${result.stderr || result.stdout}`);
  }
}

async function verifyGeneratedOwnership(sourceEntries) {
  const owned = new Map();
  for (const group of policy.generatedOwnership) {
    if (!sourceEntries.has(group.generator)) throw new Error(`generator missing from source package: ${group.generator}`);
    for (const output of group.outputs) {
      if (owned.has(output)) throw new Error(`generated output has multiple owners: ${output}`);
      if (!sourceEntries.has(output)) throw new Error(`generated output missing from source package: ${output}`);
      owned.set(output, group.generator);
    }
  }
  for (const generatedRoot of policy.strictGeneratedRoots) {
    const actual = [...sourceEntries.keys()].filter(path => path.startsWith(`${generatedRoot}/`)).sort();
    const expected = [...owned.keys()].filter(path => path.startsWith(`${generatedRoot}/`)).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`unexpected or unowned generated file under ${generatedRoot}`);
  }
}

function scanSource(entries) {
  for (const path of allowedBinarySources) {
    if (!entries.has(path)) throw new Error(`allowed binary source missing from source package: ${path}`);
  }
  for (const entry of entries.values()) {
    if (entry.data.includes(0)) {
      if (!allowedBinarySources.has(entry.path)) throw new Error(`binary content in source package: ${entry.path}`);
      continue;
    }
    const content = entry.data.toString("utf8");
    if (macPattern.test(content)) throw new Error(`device identity in source package: ${entry.path}`);
    if (credentialPattern.test(content)) throw new Error(`credential value in source package: ${entry.path}`);
    if (resolvedEndpointPattern.test(content)) throw new Error(`resolved audio endpoint in source package: ${entry.path}`);
  }
}

function scanCommunityKit(entries) {
  for (const entry of entries) {
    const content = entry.data.toString("utf8");
    if (/https?:\/\//i.test(content) || macPattern.test(content) || credentialPattern.test(content)) {
      throw new Error(`private value in community kit: ${entry.path}`);
    }
  }
}

async function buildCommunityKit() {
  const entries = [];
  const validations = [];
  for (const fixture of expectations.fixtures) {
    const data = await readFile(new URL(fixture.path, root));
    const report = JSON.parse(data);
    const validation = validateCommunityEvidence(report, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256});
    if (validation.code !== fixture.expectedCode) throw new Error(`${fixture.path}: expected ${fixture.expectedCode}, received ${validation.code}`);
    const item = {path: fixture.path.replace("community/fixtures/", "fixtures/"), data, mode: 0o644};
    entries.push(item);
    const summary = {path: item.path, code: validation.code};
    if (fixture.replay) {
      const replay = replayCommunityPacket(report, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256});
      if (!replay.ok) throw new Error(`${fixture.path}: replay failed with ${replay.code}`);
      summary.replay = replay.summary;
    }
    validations.push(summary);
  }
  entries.push({
    path: "VALIDATION-SUMMARY.json",
    data: jsonBytes({schemaVersion: 1, candidate: candidate.candidate, validations}),
    mode: 0o644
  });
  scanCommunityKit(entries);
  const first = buildDeterministicTar(entries, "open-radio-core2-rc1-community-kit");
  const second = buildDeterministicTar(entries, "open-radio-core2-rc1-community-kit");
  if (!first.equals(second)) throw new Error("community kit rehearsals differ");
  return {archive: first, files: entries.length, sha256: sha256(first), validations};
}

runGeneratorChecks();
const sourceEntries = new Map();
for (const path of policy.include) await collectPath(path, sourceEntries);
await verifyGeneratedOwnership(sourceEntries);
scanSource(sourceEntries);

const sourceManifest = {
  schemaVersion: 1,
  candidate: candidate.candidate,
  sourceOnly: true,
  binaryIncluded: false,
  hardwareValidated: false,
  published: false,
  policySha256: sha256(await readFile(new URL("release/rc1-source-policy.json", root))),
  candidateSha256: sha256(await readFile(new URL("release/rc1-candidate.json", root))),
  generatedOwnership: policy.generatedOwnership,
  allowedBinarySources: [...allowedBinarySources].sort(),
  privacyBoundary: {
    credentialValues: 0,
    deviceIdentities: 0,
    resolvedAudioEndpoints: 0,
    compiledArtifacts: 0,
    thirdPartyArtwork: 0
  },
  files: [...sourceEntries.values()].sort((left, right) => left.path.localeCompare(right.path, "en")).map(entry => ({
    path: entry.path,
    bytes: entry.data.length,
    mode: entry.mode === 0o755 ? "0755" : "0644",
    sha256: sha256(entry.data)
  }))
};
const lockBytes = jsonBytes(sourceManifest);
const lockUrl = new URL("release/rc1-source-lock.json", root);
if (writeLock) await writeFile(lockUrl, lockBytes);
else {
  const currentLock = await readFile(lockUrl).catch(() => null);
  if (!currentLock || !currentLock.equals(lockBytes)) throw new Error("RC1 source lock is stale; run npm run rehearse:rc1:write after reviewing intended source changes");
}

const sourceArchiveEntries = [...sourceEntries.values(), {path: "SOURCE-MANIFEST.json", data: lockBytes, mode: 0o644}];
const sourceFirst = buildDeterministicTar(sourceArchiveEntries, candidate.candidate);
const sourceSecond = buildDeterministicTar(sourceArchiveEntries, candidate.candidate);
if (!sourceFirst.equals(sourceSecond)) throw new Error("source package rehearsals differ");
const communityKit = await buildCommunityKit();

await Promise.all([
  mkdir(new URL("dist/", root), {recursive: true}),
  mkdir(new URL("output/firmware/", root), {recursive: true})
]);
await Promise.all([
  writeFile(new URL("dist/open-radio-core2-rc1-source.tar", root), sourceFirst),
  writeFile(new URL("dist/open-radio-core2-rc1-community-kit.tar", root), communityKit.archive),
  writeFile(new URL("output/firmware/s11-rc1-evidence.json", root), jsonBytes({
    schemaVersion: 1,
    candidate: candidate.candidate,
    sourceOnly: true,
    binaryIncluded: false,
    hardwareValidated: false,
    published: false,
    sourceArchive: {files: sourceArchiveEntries.length, bytes: sourceFirst.length, sha256: sha256(sourceFirst), rehearsals: 2},
    communityKit: {files: communityKit.files, bytes: communityKit.archive.length, sha256: communityKit.sha256, rehearsals: 2},
    generatorChecks: policy.generatorChecks.length,
    privacyBoundary: sourceManifest.privacyBoundary
  }))
]);

console.log(`PASS rc1-source files=${sourceArchiveEntries.length} sha256=${sha256(sourceFirst)} rehearsals=2`);
console.log(`PASS community-kit files=${communityKit.files} sha256=${communityKit.sha256} rehearsals=2`);
