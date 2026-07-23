import {readFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [layout, hitboxes, textSlots, renderer, rendererFixture, catalog, pl, en, fixtures, matrix, snapshotSchema, commandSchema] = await Promise.all([
  readJson("ui-contract/layout/core2-320x240.json"),
  readJson("ui-contract/layout/hitboxes.json"),
  readJson("ui-contract/layout/text-slots.json"),
  readJson("ui-contract/renderer/rgb565.json"),
  readJson("ui-contract/fixtures/renderer-now-playing.json"),
  readJson("ui-contract/catalog/stations.pl.json"),
  readJson("ui-contract/i18n/pl.json"),
  readJson("ui-contract/i18n/en.json"),
  readJson("ui-contract/fixtures/scenarios.json"),
  readJson("ui-contract/fixtures/ui-matrix.json"),
  readJson("ui-contract/schemas/ui-snapshot.schema.json"),
  readJson("ui-contract/schemas/ui-command.schema.json")
]);

const errors = [];
if (layout.width !== 320 || layout.height !== 240) errors.push("viewport must be exactly 320x240");
if (layout.minimumTouchTarget < 44) errors.push("minimum touch target must be at least 44px");
if (catalog.stations.length !== 9) errors.push("catalog must contain exactly nine launch stations");

const ids = new Set();
for (const station of catalog.stations) {
  if (ids.has(station.id)) errors.push(`duplicate station id: ${station.id}`);
  ids.add(station.id);
  for (const key of ["background", "surface", "primary", "secondary", "text", "muted", "motif"]) {
    if (!station.theme[key]) errors.push(`${station.id}: missing theme.${key}`);
  }
}

const plKeys = Object.keys(pl).sort();
const enKeys = Object.keys(en).sort();
if (JSON.stringify(plKeys) !== JSON.stringify(enKeys)) errors.push("PL/EN message keys differ");
if (fixtures.scenarios.length < 7) errors.push("recovery fixture coverage is incomplete");
if (snapshotSchema.title !== "UiSnapshot" || commandSchema.title !== "UiCommand") errors.push("UI schemas are missing or misnamed");
if (hitboxes.minimumTouchTarget !== layout.minimumTouchTarget) errors.push("hitbox and viewport touch targets differ");
for (const [screen, items] of Object.entries(hitboxes.screens)) {
  for (const item of items) {
    const rect = item.rect;
    if (!Array.isArray(rect) || rect.length !== 4) errors.push(`${screen}/${item.id || item.repeat}: invalid rect`);
    else if (rect[2] < layout.minimumTouchTarget || rect[3] < layout.minimumTouchTarget) errors.push(`${screen}/${item.id || item.repeat}: touch target below minimum`);
  }
}
const expectedMatrix = new Set();
for (const systemState of matrix.dimensions.systemState) for (const locale of matrix.dimensions.locale) for (const output of matrix.dimensions.output) expectedMatrix.add(`${systemState}|${locale}|${output}`);
for (const fixture of matrix.fixtures) expectedMatrix.delete(`${fixture.systemState}|${fixture.locale}|${fixture.output}`);
const expectedMatrixSize = matrix.dimensions.systemState.length * matrix.dimensions.locale.length * matrix.dimensions.output.length;
if (expectedMatrix.size || matrix.fixtures.length !== expectedMatrixSize) errors.push("system-state x locale x output matrix is incomplete");
if (textSlots.slots.length < 10) errors.push("text-slot coverage is incomplete");
if (renderer.width !== layout.width || renderer.height !== layout.height || renderer.pixelFormat !== "RGB565") errors.push("renderer and UI viewport contracts differ");
if (rendererFixture.stationIndex < 0 || rendererFixture.stationIndex >= catalog.stations.length) errors.push("renderer fixture station is invalid");

if (errors.length) {
  for (const error of errors) process.stderr.write(`ERROR: ${error}\n`);
  process.exit(1);
}
process.stdout.write(`PASS viewport=${layout.width}x${layout.height} stations=${catalog.stations.length} i18n=${plKeys.length} scenarios=${fixtures.scenarios.length} matrix=${matrix.fixtures.length} hitboxScreens=${Object.keys(hitboxes.screens).length}\n`);
