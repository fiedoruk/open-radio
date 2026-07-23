import {readFile, writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {checkAudioSurface} from "../firmware/audio-surface-contract.mjs";

const root = new URL("../", import.meta.url);
const lockUrl = new URL("firmware/manifests/audio-surface.lock.json", root);
const lock = JSON.parse(await readFile(lockUrl, "utf8"));
const sha256 = value => createHash("sha256").update(value).digest("hex");

if (process.argv.includes("--write")) {
  for (const entry of lock.files) entry.sha256 = sha256(await readFile(new URL(entry.path, root)));
  await writeFile(lockUrl, `${JSON.stringify(lock, null, 2)}\n`);
  process.stdout.write(`WROTE audio-surface files=${lock.files.length}\n`);
} else {
  const contents = new Map();
  for (const entry of lock.files) contents.set(entry.path, await readFile(new URL(entry.path, root), "utf8"));
  for (const invariant of lock.invariants) {
    if (!contents.has(invariant.path)) contents.set(invariant.path, await readFile(new URL(invariant.path, root), "utf8"));
  }
  const {failures} = checkAudioSurface(lock, contents);
  if (failures.length) throw new Error(failures.join("\n"));
  process.stdout.write(`PASS audio-surface files=${lock.files.length} invariants=${lock.invariants.length} exceptions=${lock.exceptions.length}\n`);
}
