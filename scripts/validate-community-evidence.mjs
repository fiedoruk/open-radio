import {readFile} from "node:fs/promises";

import {CommunityReportTypes, validateCommunityEvidence} from "../community/evidence.mjs";
import {replayCommunityPacket} from "../community/replay.mjs";

const root = new URL("../", import.meta.url);
const readJson = path => readFile(new URL(path, root), "utf8").then(JSON.parse);
const [candidate, expectations] = await Promise.all([
  readJson("release/rc1-candidate.json"),
  readJson("community/fixture-expectations.json")
]);
let accepted = 0;
let rejected = 0;
let replayed = 0;

for (const fixture of expectations.fixtures) {
  const report = await readJson(fixture.path);
  const validation = validateCommunityEvidence(report, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256});
  if (validation.code !== fixture.expectedCode) {
    throw new Error(`${fixture.path}: expected ${fixture.expectedCode}, received ${validation.code}`);
  }
  if (validation.ok) ++accepted;
  else ++rejected;
  if (fixture.replay) {
    if (report.reportType !== CommunityReportTypes.REPLAY) throw new Error(`${fixture.path}: replay fixture has wrong type`);
    const replay = replayCommunityPacket(report, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256});
    if (!replay.ok) throw new Error(`${fixture.path}: replay failed with ${replay.code}`);
    ++replayed;
  }
}

console.log(`PASS community-evidence fixtures=${expectations.fixtures.length} accepted=${accepted} rejected=${rejected} replayed=${replayed}`);
