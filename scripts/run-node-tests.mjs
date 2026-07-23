import {spawnSync} from "node:child_process";
import {mkdir, readdir, writeFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const files = (await readdir(new URL("tests/", root)))
  .filter(name => name.endsWith(".test.mjs"))
  .sort()
  .map(name => new URL(`tests/${name}`, root).pathname);
const result = spawnSync(process.execPath, ["--test", ...files], {
  cwd: root.pathname,
  encoding: "utf8",
  env: {...process.env, NO_COLOR: "1"}
});
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
const match = result.stdout.match(/(?:ℹ|#) tests (\d+)/);
if (!match) throw new Error("Node test count missing");
const report = {schemaVersion: 1, tests: Number(match[1]), files: files.length, passed: true};
await mkdir(new URL("output/firmware/", root), {recursive: true});
await writeFile(new URL("output/firmware/node-test-summary.json", root),
  `${JSON.stringify(report, null, 2)}\n`);
