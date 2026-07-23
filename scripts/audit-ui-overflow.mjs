import {readFile} from "node:fs/promises";
import {auditTextSlots} from "../simulator/overflow-audit.mjs";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [definition, pl, en, catalog, setupOptions] = await Promise.all([
  readJson("ui-contract/layout/text-slots.json"),
  readJson("ui-contract/i18n/pl.json"),
  readJson("ui-contract/i18n/en.json"),
  readJson("ui-contract/catalog/stations.pl.json"),
  readJson("ui-contract/fixtures/setup-options.json")
]);

const result = auditTextSlots(definition, {dictionaries: {pl, en}, catalog, setupOptions});
if (!result.valid) {
  for (const failure of result.failures) process.stderr.write(`OVERFLOW ${failure.slot}: ${JSON.stringify(failure)}\n`);
  process.exit(1);
}
process.stdout.write(`PASS text-overflow checks=${result.checks} slots=${definition.slots.length}\n`);
