import {readFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const toolchains = JSON.parse(await readFile(new URL("firmware/manifests/toolchains.lock.json", root)));
const dependencies = JSON.parse(await readFile(new URL("firmware/manifests/dependencies.lock.json", root)));
const platformio = await readFile(new URL("firmware/public-candidate/platformio.ini", root), "utf8");

const failures = [];
const rejectFloating = value => /(^|[^a-z])(latest|master|main|develop)([^a-z]|$)/i.test(value);
if (rejectFloating(platformio)) failures.push("platformio.ini contains a floating ref");
if (!platformio.includes(`espressif32@${toolchains.publicCandidate.platform.version}`)) {
  failures.push("PlatformIO platform version differs from lock");
}

for (const dependency of dependencies.publicCandidate.filter(item => item.commit)) {
  if (!platformio.includes(dependency.commit)) {
    failures.push(`${dependency.name} commit differs from platformio.ini`);
  }
  if (!/^[a-f0-9]{40}$/.test(dependency.commit)) {
    failures.push(`${dependency.name} commit is not an exact SHA-1`);
  }
}

if (!toolchains.adfReference.container.includes("@sha256:")) {
  failures.push("ADF container is not digest-pinned");
}

if (failures.length) throw new Error(failures.join("\n"));
// Static pin check only: it proves platformio.ini names exact commits, not
// what PlatformIO actually resolved. check-resolved-libdeps.mjs measures the
// installed tree after a build; both must pass before a release claim.
console.log(`PASS firmware-lock pinned=${dependencies.publicCandidate.length} (static; resolved tree checked post-build)`);
