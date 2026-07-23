// Host-only. The build stays offline: this script proposes, a human decides,
// and the decision is committed as data. Reaching the network during a build
// would destroy the byte-for-byte reproducibility the provenance proof and the
// rehearse:rc1 gate stand on.
import {readFile, writeFile} from "node:fs/promises";
import {connect} from "node:net";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const api = "http://all.api.radio-browser.info/json";
const country = process.argv.includes("--country") ? process.argv[process.argv.indexOf("--country") + 1] : "PL";
const outputUrl = new URL(`output/catalog-refresh-${country}.json`, root);

// The firmware accepts SHOUTcast's "ICY 200 OK" status line, which Node's fetch
// and Python's urllib both reject outright. A probe that used them would report
// working stations as dead, so this speaks the protocol on a raw socket.
function probe(url, timeoutMs = 8000) {
  return new Promise(resolve => {
    let parsed;
    try { parsed = new URL(url); } catch { return resolve({ok: false, reason: "bad-url"}); }
    if (parsed.protocol !== "http:") return resolve({ok: false, reason: "not-plain-http"});
    const socket = connect({host: parsed.hostname, port: Number(parsed.port) || 80, timeout: timeoutMs});
    let buffer = Buffer.alloc(0);
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.on("timeout", () => finish({ok: false, reason: "timeout"}));
    socket.on("error", error => finish({ok: false, reason: error.code || "error"}));
    socket.on("connect", () => socket.write(
      `GET ${parsed.pathname || "/"}${parsed.search} HTTP/1.0\r\nHost: ${parsed.hostname}\r\n` +
      `User-Agent: OpenRadioCore2/0.2-catalog-refresh\r\nIcy-MetaData: 1\r\nConnection: close\r\n\r\n`));
    socket.on("data", chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      const split = buffer.indexOf("\r\n\r\n");
      if (split < 0) { if (buffer.length > 16384) finish({ok: false, reason: "no-headers"}); return; }
      const head = buffer.subarray(0, split).toString("latin1").split("\r\n");
      const status = head[0] || "";
      const headers = Object.fromEntries(head.slice(1).filter(line => line.includes(":"))
        .map(line => [line.slice(0, line.indexOf(":")).trim().toLowerCase(), line.slice(line.indexOf(":") + 1).trim()]));
      const body = buffer.subarray(split + 4);
      // A redirect is how streamtheworld hands out its live edge; the device
      // follows it, so report the hop rather than calling the station dead.
      if (/\b30[1237]\b/.test(status) && headers.location) {
        return finish({ok: false, reason: "redirect", redirectTo: headers.location});
      }
      if (body.length < 2048) return;
      const ok = /\b200\b/.test(status) && (headers["content-type"] || "").startsWith("audio/");
      finish({ok, reason: ok ? "ok" : status.slice(0, 40), status: status.slice(0, 40),
              contentType: headers["content-type"] || null, icyName: headers["icy-name"] || null,
              icyBitrate: Number(headers["icy-br"]) || null, hasIcyMetadata: Boolean(headers["icy-metaint"])});
    });
    socket.on("end", () => finish({ok: false, reason: "short-stream"}));
  });
}

const request = async path => {
  const response = await fetch(`${api}/${path}`, {headers: {"User-Agent": "OpenRadioCore2/0.2-catalog-refresh"}});
  if (!response.ok) throw new Error(`radio-browser ${path}: HTTP ${response.status}`);
  return response.json();
};

const [catalog, networkLock] = await Promise.all([
  readJson("ui-contract/catalog/station-catalog.v1.json"),
  readJson("firmware/manifests/network-services.lock.json")
]);
const approvedHosts = new Set(networkLock.services.map(service => service.host));
const shipped = new Set(catalog.stations.flatMap(station => station.playback.map(endpoint => endpoint.url)));

process.stdout.write(`querying radio-browser for ${country}\n`);
const rows = await request(`stations/search?countrycode=${country}&hidebroken=true&limit=100000`);
// Many broadcasters publish an https URL to radio-browser while serving the
// same mount over plain http. Filtering on the published scheme alone hid
// working stations: Eska Rock and VOX FM were both found this way, by asking
// the plain-http variant directly. We downgrade the address, never the check —
// the probe below still has to succeed on its own.
const playableUrl = row => {
  if (typeof row.url_resolved !== "string") return null;
  if (row.url_resolved.startsWith("http://")) return row.url_resolved;
  if (row.url_resolved.startsWith("https://")) return `http://${row.url_resolved.slice("https://".length)}`;
  return null;
};
const hard = rows.filter(row =>
  row.codec === "MP3" && row.hls === 0 && row.lastcheckok === 1 &&
  (playableUrl(row) || "").length > 0 && playableUrl(row).length < 128 &&
  row.bitrate >= 64 && row.bitrate <= catalog.bitrateCeilingKbps);
process.stdout.write(`${rows.length} stations, ${hard.length} pass the hard filter\n`);

// lastcheckok says the stream worked for somebody else's client. Our own probe
// is what admits a station; borrowing a third party's measurement and shipping
// it as our guarantee is exactly the mistake this project does not make.
const byUrl = new Map();
for (const row of hard) {
  const url = playableUrl(row);
  if (!byUrl.has(url)) byUrl.set(url, {...row, probeUrl: url});
}
const targets = [...byUrl.values()];
const results = [];
const concurrency = 12;
for (let index = 0; index < targets.length; index += concurrency) {
  const slice = targets.slice(index, index + concurrency);
  const probed = await Promise.all(slice.map(row => probe(row.probeUrl).then(result => ({row, result}))));
  results.push(...probed);
  process.stdout.write(`probed ${Math.min(index + concurrency, targets.length)}/${targets.length}\n`);
}

const feasible = results.filter(item => item.result.ok);
const report = {
  generatedFor: country,
  bitrateCeilingKbps: catalog.bitrateCeilingKbps,
  totals: {returned: rows.length, hardFilter: hard.length, probed: targets.length, feasible: feasible.length},
  alreadyShipped: feasible.filter(item => shipped.has(item.row.probeUrl)).length,
  hostsNeedingLockEntry: [...new Set(feasible.map(item => new URL(item.row.probeUrl).hostname).filter(host => !approvedHosts.has(host)))].sort(),
  stations: feasible.map(item => ({
    name: item.row.name.trim(), stationuuid: item.row.stationuuid, url: item.row.probeUrl,
    publishedUrl: item.row.url_resolved,
    host: new URL(item.row.probeUrl).hostname, bitrateKbps: item.result.icyBitrate || item.row.bitrate,
    icyName: item.result.icyName, hasIcyMetadata: item.result.hasIcyMetadata,
    votes: item.row.votes, clickcount: item.row.clickcount, favicon: item.row.favicon || null,
    shipped: shipped.has(item.row.probeUrl)
  })).sort((left, right) => right.votes - left.votes)
};
await writeFile(outputUrl, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(
  `REPORT catalog-refresh country=${country} feasible=${feasible.length}/${targets.length} ` +
  `shipped=${report.alreadyShipped} new_hosts=${report.hostsNeedingLockEntry.length} -> output/catalog-refresh-${country}.json\n` +
  `This is a proposal. Nothing was committed; a human picks the nine.\n`);
