import {createHash} from "node:crypto";

const sha256 = value => createHash("sha256").update(value).digest("hex");

// The audio path carries knowledge that cost weeks to acquire and one hard
// device hang to relearn: burst-equilibrium reserves, the decoder budget that
// couples touch latency to playback, and the coexistence preference that must
// stay BALANCE. Release 0.2 changes the catalog, never the sound. A promise
// not to touch it has no evidential value after 2026-07-18, so it is a gate.
export function checkAudioSurface(lock, contents) {
  const failures = [];
  const excused = new Set((lock.exceptions ?? []).map(item => item.path));
  for (const entry of lock.files) {
    const content = contents.get(entry.path);
    if (content === undefined) {
      failures.push(`${entry.path}: frozen audio file is missing`);
      continue;
    }
    if (sha256(content) !== entry.sha256 && !excused.has(entry.path)) {
      failures.push(`${entry.path}: audio surface changed since ${lock.frozenAt}`);
    }
  }
  for (const invariant of lock.invariants) {
    const content = contents.get(invariant.path);
    if (content === undefined) {
      failures.push(`${invariant.path}: invariant host file is missing`);
      continue;
    }
    if (!content.includes(invariant.requiredSubstring)) {
      failures.push(`${invariant.path}: lost audio invariant "${invariant.requiredSubstring}" (${invariant.reason})`);
    }
  }
  return {failures};
}
