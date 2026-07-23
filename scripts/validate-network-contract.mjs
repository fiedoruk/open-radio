import {readFile} from "node:fs/promises";
import {validateNetworkInputs} from "../network/network-contract.mjs";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [profileFixture, scenarios, configs] = await Promise.all([
  readJson("ui-contract/fixtures/network-profiles.json"),
  readJson("ui-contract/fixtures/network-scenarios.json"),
  readJson("ui-contract/fixtures/persistence-configs.json")
]);
const errors = [];
for (const scenario of scenarios.scenarios) {
  const validation = validateNetworkInputs(profileFixture.profiles, scenario.scans);
  for (const error of validation.errors) errors.push(`${scenario.id}: ${error}`);
}
const profileRefs = new Set(profileFixture.profiles.map(profile => profile.ref));
for (const ref of [...configs.configs.currentA.wifiProfileRefs, ...configs.configs.currentB.wifiProfileRefs, configs.configs.legacy.wifiProfileRef]) {
  if (!profileRefs.has(ref)) errors.push(`persistence reference missing from network profiles: ${ref}`);
}
const serialized = JSON.stringify({profileFixture, scenarios});
if (/password|passwd|ssid|bssid|bearer|api[_-]?key|access[_-]?token/i.test(serialized)) errors.push("network fixtures contain a forbidden credential-like field");
if (errors.length) {
  for (const error of errors) process.stderr.write(`ERROR: ${error}\n`);
  process.exit(1);
}
process.stdout.write(`PASS network-contract profiles=${profileFixture.profiles.length} scenarios=${scenarios.scenarios.length} persistence_refs=3\n`);
