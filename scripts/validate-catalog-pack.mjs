import {readdir, readFile} from "node:fs/promises";
import {validateSchema} from "../tests/helpers/json-schema-lite.mjs";

const root = new URL("../", import.meta.url);
const packsDirectory = new URL("ui-contract/catalog/packs/", root);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [schema, stationSchema, packFiles] = await Promise.all([
  readJson("ui-contract/schemas/catalog-pack.schema.json"),
  readJson("ui-contract/schemas/station-catalog.schema.json"),
  readdir(packsDirectory)
]);

const errors = [];
const summaries = [];
const packIds = new Set();
for (const filename of packFiles.filter(name => name.endsWith(".json")).sort()) {
  const pack = await readJson(`ui-contract/catalog/packs/${filename}`);
  for (const error of validateSchema(schema, pack)) errors.push(`${filename}: ${error}`);
  if (packIds.has(pack.packId)) errors.push(`${filename}: duplicate packId ${pack.packId}`);
  packIds.add(pack.packId);
  if (!pack.supportedUiLocales?.includes(pack.defaultUiLocale)) errors.push(`${filename}: default locale is not supported`);
  for (const locale of pack.supportedUiLocales || []) if (!pack.regionLabels?.[locale]) errors.push(`${filename}: missing region label for ${locale}`);
  if (new Set(pack.supportedUiLocales || []).size !== (pack.supportedUiLocales || []).length) errors.push(`${filename}: duplicate supported locale`);
  if (typeof pack.stationCatalogPath !== "string" || typeof pack.stationIdentityPath !== "string" || pack.stationCatalogPath.includes("..") || pack.stationIdentityPath.includes("..")) continue;

  const [catalog, identities] = await Promise.all([
    readJson(pack.stationCatalogPath),
    readJson(pack.stationIdentityPath)
  ]);
  for (const error of validateSchema(stationSchema, catalog)) errors.push(`${filename}: catalog ${error}`);
  const catalogIds = catalog.stations?.map(station => station.id) || [];
  const identityIds = identities.stations?.map(station => station.id) || [];
  if (catalog.stations?.some(station => station.country !== pack.countryCode)) errors.push(`${filename}: pack country and station catalog differ`);
  if (catalogIds.length > pack.maximumStations) errors.push(`${filename}: pack exceeds the Core2 station grid`);
  if (JSON.stringify(catalogIds) !== JSON.stringify(identityIds)) errors.push(`${filename}: catalog and station identities differ`);
  summaries.push(`${pack.packId}:${catalogIds.length}`);
}

if (summaries.length === 0) errors.push("at least one embedded catalog pack is required");
if (errors.length) throw new Error(errors.join("\n"));
console.log(`PASS catalog-packs packs=${summaries.length} entries=${summaries.join(",")}`);
