import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {checkAudioSurface} from "../firmware/audio-surface-contract.mjs";

const root = new URL("../", import.meta.url);
const sha256 = value => createHash("sha256").update(value).digest("hex");
const readLock = async () => JSON.parse(await readFile(new URL("firmware/manifests/audio-surface.lock.json", root), "utf8"));

async function readTrackedContents(lock) {
  const contents = new Map();
  for (const entry of lock.files) contents.set(entry.path, await readFile(new URL(entry.path, root), "utf8"));
  for (const invariant of lock.invariants) {
    if (!contents.has(invariant.path)) contents.set(invariant.path, await readFile(new URL(invariant.path, root), "utf8"));
  }
  return contents;
}

test("frozen audio surface matches the working tree", async () => {
  const lock = await readLock();
  assert.equal(lock.frozenAt, "open-radio-0-1");
  assert.ok(lock.files.length >= 6, "audio surface must cover the whole decode and sink path");
  assert.deepEqual(checkAudioSurface(lock, await readTrackedContents(lock)).failures, []);
});

test("a changed audio file fails unless an exception names it", async () => {
  const lock = await readLock();
  const contents = await readTrackedContents(lock);
  const target = lock.files[0].path;
  contents.set(target, `${contents.get(target)}\n// drift\n`);
  assert.match(checkAudioSurface(lock, contents).failures.join(" "), /audio surface changed/);

  const excused = {...lock, exceptions: [{path: target, reason: "test", approvedBy: "test"}]};
  assert.deepEqual(checkAudioSurface(excused, contents).failures, []);
});

test("losing a coexistence invariant fails even when no hashed file changed", async () => {
  const lock = await readLock();
  const contents = await readTrackedContents(lock);
  const invariant = lock.invariants[0];
  contents.set(invariant.path, contents.get(invariant.path).replace(invariant.requiredSubstring, "REMOVED"));
  assert.match(checkAudioSurface(lock, contents).failures.join(" "), /lost audio invariant/);
});

test("the lock records the digest the working tree actually has", async () => {
  const lock = await readLock();
  for (const entry of lock.files) {
    assert.equal(entry.sha256, sha256(await readFile(new URL(entry.path, root))), entry.path);
  }
});
