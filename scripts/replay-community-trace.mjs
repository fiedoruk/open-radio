import {readFile} from "node:fs/promises";

import {replayCommunityPacket} from "../community/replay.mjs";

const root = new URL("../", import.meta.url);
const packetPath = process.argv[2];
if (!packetPath || process.argv.length !== 3) {
  console.error(JSON.stringify({ok: false, code: "USAGE", errors: ["usage: node scripts/replay-community-trace.mjs <packet.json>"]}));
  process.exit(2);
}

try {
  const [packet, candidate] = await Promise.all([
    readFile(packetPath, "utf8").then(JSON.parse),
    readFile(new URL("release/rc1-candidate.json", root), "utf8").then(JSON.parse)
  ]);
  const result = replayCommunityPacket(packet, {expectedFirmwareSha256: candidate.evidenceFirmwareSha256});
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ok: false, code: "READ_ERROR", errors: [error.message]}));
  process.exitCode = 1;
}
