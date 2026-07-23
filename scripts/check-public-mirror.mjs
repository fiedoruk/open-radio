// Public-tree guard: proves the tracked tree stays publishable to the public
// mirror defined by release/public-mirror-policy.json. Offline and read-only;
// it runs inside `npm run check`, so every commit — and the public CI itself —
// re-verifies the same invariants that gated the launch.
import {readFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";

const root = new URL("../", import.meta.url);
const policy = JSON.parse(await readFile(new URL("release/public-mirror-policy.json", root), "utf8"));
const git = args => execFileSync("git", args, {cwd: root, encoding: "utf8"});

const failures = [];

const tracked = git(["ls-files"]).split("\n").filter(Boolean);
for (const pattern of policy.forbiddenTrackedPathPatterns) {
  const regex = new RegExp(pattern);
  for (const path of tracked.filter(path => regex.test(path))) {
    failures.push(`forbidden tracked path ${path} (pattern ${pattern})`);
  }
}

for (const pattern of policy.forbiddenContentPatterns) {
  // -I skips binaries; git grep exits 1 when nothing matches, which is the
  // passing outcome here. The policy file itself is excluded — it has to
  // spell the forbidden patterns to define them.
  try {
    const hits = git(["grep", "-I", "-l", "--fixed-strings", pattern, "--",
      ".", ":(exclude)release/public-mirror-policy.json"]).split("\n").filter(Boolean);
    for (const path of hits) failures.push(`forbidden content "${pattern}" in ${path}`);
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}

if (!policy.publishBranches.includes("main") || policy.publishBranches.length !== 1) {
  failures.push(`publishBranches must be exactly ["main"], got ${JSON.stringify(policy.publishBranches)}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL public-mirror: ${failure}`);
  process.exit(1);
}
console.log(`PASS public-mirror files=${tracked.length} pathPatterns=${policy.forbiddenTrackedPathPatterns.length} contentPatterns=${policy.forbiddenContentPatterns.length}`);
