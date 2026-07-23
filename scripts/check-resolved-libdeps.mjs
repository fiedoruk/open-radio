import {readFile, access, readdir} from "node:fs/promises";
import {execFileSync} from "node:child_process";

// Measures what PlatformIO actually installed, after a build. The static
// lock checker can only prove platformio.ini names exact commits; this one
// proves the resolved tree matches firmware/manifests/dependencies.lock.json
// — the gap that let M5GFX float to 0.2.26 while the gate printed a pass.
const root = new URL("../", import.meta.url);
const libdeps = new URL(
  process.env.OPEN_RADIO_LIBDEPS_DIR
    ? `${process.env.OPEN_RADIO_LIBDEPS_DIR.replace(/\/?$/, "/")}`
    : "firmware/public-candidate/.pio/libdeps/core2-public-candidate/",
  root,
);
const dependencies = JSON.parse(await readFile(new URL("firmware/manifests/dependencies.lock.json", root)));

const failures = [];
const resolved = [];
// An unnamed git pin lands in "<Name>@src-<hash>" NEXT TO the registry copy
// the parent library resolves, and the linker picks one silently — measured
// 2026-07-23: that ambiguity produced a third distinct firmware hash. Any
// duplicate install of a locked dependency is therefore a hard failure.
const installed = await readdir(libdeps).catch(() => []);
for (const dependency of dependencies.publicCandidate) {
  const twins = installed.filter(entry => entry === dependency.name || entry.startsWith(`${dependency.name}@`));
  if (twins.length > 1) failures.push(`${dependency.name}: ambiguous duplicate installs (${twins.join(", ")})`);
}
for (const dependency of dependencies.publicCandidate) {
  const home = new URL(`${dependency.name}/`, libdeps);
  let manifest;
  try {
    manifest = JSON.parse(await readFile(new URL("library.json", home)));
  } catch {
    failures.push(`${dependency.name}: not installed under ${libdeps.pathname}`);
    continue;
  }
  if (manifest.version !== dependency.version) {
    failures.push(`${dependency.name}: resolved ${manifest.version}, lock says ${dependency.version}`);
    continue;
  }
  let commit = "registry";
  try {
    await access(new URL(".git", home));
    commit = execFileSync("git", ["-C", new URL(home).pathname, "rev-parse", "HEAD"], {encoding: "utf8"}).trim();
    if (commit !== dependency.commit) {
      failures.push(`${dependency.name}: checked out ${commit}, lock says ${dependency.commit}`);
      continue;
    }
  } catch {
    // Registry installs carry no .git; the version match above still holds.
  }
  resolved.push(`${dependency.name}@${manifest.version}(${commit === "registry" ? "registry" : commit.slice(0, 8)})`);
}

if (failures.length) throw new Error(`resolved-libdeps drift:\n${failures.join("\n")}`);
console.log(`PASS resolved-libdeps ${resolved.join(" ")}`);
