import {readFile} from "node:fs/promises";
import {validateCurrentConfig, validateLegacyConfig} from "../persistence/config-contract.mjs";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [fixture, catalog] = await Promise.all([
  readJson("ui-contract/fixtures/persistence-configs.json"),
  readJson("ui-contract/catalog/station-catalog.v1.json")
]);
const allowedStationIds = catalog.stations.map(station => station.id);
const currentResults = [fixture.configs.currentA, fixture.configs.currentB].map(config => validateCurrentConfig(config, allowedStationIds));
const legacyResult = validateLegacyConfig(fixture.configs.legacy, allowedStationIds);
const errors = [...currentResults.flatMap(result => result.errors), ...legacyResult.errors];
if (errors.length) {
  for (const error of errors) process.stderr.write(`ERROR: ${error}\n`);
  process.exit(1);
}
const serialized = JSON.stringify(fixture);
if (/password|passwd|ssid|bssid|bearer|api[_-]?key|access[_-]?token/i.test(serialized)) {
  process.stderr.write("ERROR: persistence fixtures contain a forbidden credential-like field\n");
  process.exit(1);
}
process.stdout.write("PASS persistence-contract current=2 legacy=1 future=explicit refs=opaque\n");
