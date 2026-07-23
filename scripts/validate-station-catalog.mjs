import {readFile} from "node:fs/promises";
import {validateStationCatalog} from "../resolver/catalog-contract.mjs";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [catalog, uiCatalog, networkLock] = await Promise.all([
  readJson("ui-contract/catalog/station-catalog.v1.json"),
  readJson("ui-contract/catalog/stations.pl.json"),
  readJson("firmware/manifests/network-services.lock.json")
]);
const approvedHosts = new Set(networkLock.services.map(service => service.host));
const result = validateStationCatalog(catalog, uiCatalog.stations.map(station => station.id), approvedHosts);
if (!result.valid) {
  for (const error of result.errors) process.stderr.write(`ERROR: ${error}\n`);
  process.exit(1);
}
const playback = catalog.stations.reduce((sum, station) => sum + station.playback.length, 0);
process.stdout.write(`PASS station-catalog stations=${catalog.stations.length} candidates=${catalog.stations.reduce((sum, station) => sum + station.candidates.length, 0)} playback=${playback} ceiling=${catalog.bitrateCeilingKbps}kbps mp3=${result.capabilityCounts.MP3_ICY} hls=${result.capabilityCounts.HLS_HE_AAC}\n`);
