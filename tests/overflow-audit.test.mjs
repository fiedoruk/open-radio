import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {auditTextSlots} from "../simulator/overflow-audit.mjs";

const readJson = async relative => JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));

test("all declared PL/EN UI text slots pass overflow policy", async () => {
  const [definition, pl, en, catalog, setupOptions] = await Promise.all([
    readJson("../ui-contract/layout/text-slots.json"),
    readJson("../ui-contract/i18n/pl.json"),
    readJson("../ui-contract/i18n/en.json"),
    readJson("../ui-contract/catalog/stations.pl.json"),
    readJson("../ui-contract/fixtures/setup-options.json")
  ]);
  const result = auditTextSlots(definition, {dictionaries: {pl, en}, catalog, setupOptions});
  assert.equal(result.valid, true, JSON.stringify(result.failures));
  assert.ok(result.checks >= 40);
});

test("overflow audit rejects copy outside a slot budget", () => {
  const result = auditTextSlots({slots: [{id: "tiny", mode: "single-line", fontSize: 20, maxWidth: 10, minimumScale: 0.8, sources: ["literal:Too long"]}]}, {dictionaries: {}, catalog: {stations: []}, setupOptions: {cities: [], speakers: []}});
  assert.equal(result.valid, false);
  assert.equal(result.failures[0].slot, "tiny");
});
