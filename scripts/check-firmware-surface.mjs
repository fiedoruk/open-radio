import {readFile, readdir} from "node:fs/promises";
import {extname} from "node:path";

const root = new URL("../", import.meta.url);
const sourceRoots = [
  "firmware/common",
  "firmware/generated",
  "firmware/public-candidate/src",
  "network-onboarding"
];
const textExtensions = new Set([".cpp", ".hpp", ".h", ".c", ".mjs", ".js", ".html", ".css", ".json"]);
const files = [];
const enhancementServices = JSON.parse(await readFile(new URL("ui-contract/network/approved-public-services.v1.json", root), "utf8"));
const playbackServices = JSON.parse(await readFile(new URL("firmware/manifests/network-services.lock.json", root), "utf8"));
const approvedServices = [...enhancementServices.services, ...playbackServices.services];
const approvedHttpEndpoints = new Set(approvedServices
  .filter(service => new Set(["http", "https"]).has(service.scheme))
  .map(service => `${service.scheme}:${service.host}`));
// The hand-curated lock covers the nine stations we ship and reason about one
// by one. The directory the installer picks from is a different kind of list:
// generated, a hundred-odd hosts wide, and admissible only because every entry
// answered our own probe on a recorded date. Dumping those hosts into the lock
// would turn a reviewed allowlist into a bucket, so they are approved from
// their own manifest and the evidence travels with them.
const directory = JSON.parse(await readFile(new URL("ui-contract/catalog/pl-directory.v1.json", root), "utf8"));
if (!/^\d{4}-\d{2}-\d{2}$/.test(directory.probedAt ?? "")) throw new Error("station directory has no probe date");
let directoryHosts = 0;
const curated = JSON.parse(await readFile(new URL("ui-contract/catalog/station-catalog.v1.json", root), "utf8"));
for (const station of directory.stations) {
  for (const endpoint of station.endpoints) {
    const parsed = new URL(endpoint.url);
    if (parsed.protocol !== "http:") throw new Error(`directory entry ${station.id} is not plain http`);
    approvedHttpEndpoints.add(`http:${parsed.hostname}`);
    directoryHosts += 1;
  }
}
// Favicon hosts ride on the same evidence: every URL here passed today's QC
// probe (answers, PNG/JPEG magic, sane dimensions) before it could be
// embedded, and the device only ever fetches them once, unattended, at first
// configuration. https is fine for these: the fetch happens before the
// Bluetooth stack starts, in the heap-rich window.
let faviconHosts = 0;
for (const station of [...directory.stations, ...curated.stations]) {
  if (!station.favicon) continue;
  const parsed = new URL(station.favicon);
  approvedHttpEndpoints.add(`${parsed.protocol.slice(0, -1)}:${parsed.hostname}`);
  faviconHosts += 1;
}
let approvedEndpointReferences = 0;

async function walk(relative) {
  for (const entry of await readdir(new URL(`${relative}/`, root), {withFileTypes: true})) {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) await walk(child);
    else if (textExtensions.has(extname(entry.name))) files.push(child);
  }
}

for (const sourceRoot of sourceRoots) await walk(sourceRoot);

const failures = [];
for (const file of files) {
  const content = await readFile(new URL(file, root), "utf8");
  // Hostile parser fixtures intentionally contain private, loopback and
  // look-alike URLs. Keep scanning those files for credentials and device
  // identifiers, but do not mistake rejected test input for a compiled product
  // endpoint.
  if (file.startsWith("firmware/") && !file.includes("/tests/")) {
    for (const match of content.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
      let host;
      try { host = new URL(match[0]).hostname; }
      catch { failures.push(`${file}: malformed embedded endpoint`); continue; }
      const scheme = new URL(match[0]).protocol.slice(0, -1);
      if (!approvedHttpEndpoints.has(`${scheme}:${host}`)) failures.push(`${file}: unapproved embedded endpoint ${scheme}://${host}`);
      else approvedEndpointReferences += 1;
    }
  }
  if (/(wifi|ssid|password|passphrase)\s*[=:]\s*["'][^"']{3,}["']/i.test(content)) {
    failures.push(`${file}: possible credential value`);
  }
  if (/([0-9a-f]{2}:){5}[0-9a-f]{2}/i.test(content)) {
    failures.push(`${file}: embedded MAC/BSSID`);
  }
}

const generatedFiles = await readdir(new URL("firmware/generated/", root));
if (generatedFiles.some(file => /\.(png|jpe?g|gif|webp|svg)$/i.test(file))) {
  failures.push("firmware/generated: unapproved artwork asset");
}

if (failures.length) throw new Error(failures.join("\n"));
console.log(`PASS firmware-surface files=${files.length} secrets=0 approved_endpoints=${approvedEndpointReferences} services=${approvedServices.length} directory=${directoryHosts}@${directory.probedAt} favicons=${faviconHosts} bundled_artwork=0`);
