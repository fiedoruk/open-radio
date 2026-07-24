import {readFile, access} from "node:fs/promises";

// The parity gate proves EN/PL structure; this gate proves the LIVING docs
// tell the current release's story. Historical numbered docs are exempt on
// purpose — they are a dated engineering journal. When a release ships,
// bumping release/claims.json makes every stale current-truth claim fail
// loudly here, so the documentation sweep cannot be forgotten (the 0.1-era
// walls survived four audits before this gate existed).
const root = new URL("../", import.meta.url);
const claims = JSON.parse(await readFile(new URL("release/claims.json", root), "utf8"));

const LIVING = [
  "README.md", "README.pl.md",
  "USER-GUIDE.md", "USER-GUIDE.pl.md",
  "STATUS.md", "CURRENT-MISSION.md", "AGENTS.md",
  "SUPPORT.md", "SUPPORT.pl.md",
  "SECURITY.md",
  "CONTRIBUTING.md", "CONTRIBUTING.pl.md",
  "REPRODUCIBILITY.md", "REPRODUCIBILITY.pl.md",
  "NETWORK-ENDPOINTS.md", "TRADEMARKS.md", "LICENSES.md",
  "THIRD-PARTY-NOTICES.md",
  "firmware/README.md", "firmware/public-candidate/README.md",
  "firmware/release/THIRD_PARTY_NOTICES.md",
  "community/README.md", "community/README.pl.md",
];

const tagBody = claims.currentTag.replace(/^open-radio-/, "");
const forbidden = [
  [/no public firmware binary|pre-hardware source candidate/i,
   "pre-release-era claim"],
  [/still open on the corrected image|na poprawionym obrazie pozostają/i,
   "corrected-image era framing"],
  [/coming to github|wkrótce na github|repo wkrótce/i,
   "already-launched promise"],
  [/\b0\.2 is the validated path|0\.2 jest zwalidowaną ścieżką/i,
   "superseded validated-path claim"],
  [/final enclosure fit and public binary release/i,
   "release listed as still open"],
  [new RegExp(String.raw`current public artifact \x60open-radio-(?!${tagBody}\b)`),
   `an artifact other than ${claims.currentTag} described as current`],
];
if (claims.battery?.measured) {
  forbidden.push(
    [/(battery|bater\w+)[^.\n]{0,60}(estimate|szacun)/i,
     "battery still described as an estimate"],
    [/(szacunkowo|estimated?)[^.\n]{0,30}(dwóch godzin|two hours)/i,
     "old two-hour battery estimate"],
  );
}

const failures = [];
const texts = new Map();
for (const path of LIVING) {
  let text;
  try {
    text = await readFile(new URL(path, root), "utf8");
  } catch {
    failures.push(`${path}: living doc missing`);
    continue;
  }
  texts.set(path, text);
  for (const [pattern, why] of forbidden) {
    const hit = text.match(pattern);
    if (hit) failures.push(`${path}: ${why} — "${hit[0].slice(0, 60)}"`);
  }
}

const requireIn = (path, pattern, why) => {
  const text = texts.get(path);
  if (text !== undefined && !pattern.test(text)) failures.push(`${path}: ${why}`);
};
for (const readme of ["README.md", "README.pl.md"]) {
  requireIn(readme, new RegExp(claims.currentRelease.replace(/\./g, "\\.")),
    `must name the current release ${claims.currentRelease}`);
  requireIn(readme, new RegExp(claims.publicRepoUrl.replace(/[/.]/g, "\\$&")),
    "must link the public repository");
  requireIn(readme, new RegExp(claims.releaseNotesBase.replace(/[/.]/g, "\\$&")),
    "must link the current release notes");
}
requireIn("STATUS.md", new RegExp(`Current state:.*${claims.currentRelease.replace(/\./g, "\\.")}`, "s"),
  `Current state must carry ${claims.currentRelease}`);
for (const rev of claims.hardwareRevisions ?? []) {
  const short = rev.split(" ")[0];
  for (const doc of ["README.md", "README.pl.md", "STATUS.md"]) {
    requireIn(doc, new RegExp(short.replace(/\./g, "\\.")),
      `must name field-validated hardware revision ${short}`);
  }
}
requireIn("CURRENT-MISSION.md", new RegExp(claims.currentRelease.replace(/\./g, "\\.")),
  `must name the current release ${claims.currentRelease}`);
for (const suffix of [".en.md", ".pl.md"]) {
  try {
    await access(new URL(claims.releaseNotesBase + suffix, root));
  } catch {
    failures.push(`${claims.releaseNotesBase}${suffix}: release notes missing`);
  }
}

if (failures.length) throw new Error(`doc-currency:\n${failures.join("\n")}`);
console.log(`PASS doc-currency living=${LIVING.length} forbidden=${forbidden.length} release=${claims.currentRelease}`);
