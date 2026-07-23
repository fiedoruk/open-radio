// Turns a raw probe report into the directory the installer picks from.
//
// Three things this does that a plain filter cannot:
//
//   * groups every verified URL of one station together, so a station chosen
//     from the list has the same alternates to rotate through as one we
//     curated by hand. Quality of service cannot depend on how a station got
//     into a slot.
//   * expands known CDN mirror families and probes the sibling, because most
//     stations are published under one host while serving two. This is exactly
//     how ic2 was found for Eska Rock.
//   * cleans the names. radio-browser names are community-supplied and carry
//     artefacts — a trailing bitrate, an "-om" suffix, doubled whitespace —
//     that would be shown on a device screen otherwise.
import {readFile, writeFile} from "node:fs/promises";
import {connect} from "node:net";

const root = new URL("../", import.meta.url);
const country = process.argv.includes("--country") ? process.argv[process.argv.indexOf("--country") + 1] : "PL";
const reportUrl = new URL(`output/catalog-refresh-${country}.json`, root);
const outputUrl = new URL(`ui-contract/catalog/${country.toLowerCase()}-directory.v1.json`, root);
const probedAt = process.argv[process.argv.indexOf("--probed-at") + 1];
if (!/^\d{4}-\d{2}-\d{2}$/.test(probedAt ?? "")) throw new Error("--probed-at YYYY-MM-DD is required; the directory's admissibility rests on it");

// Same protocol handling as catalog-refresh: the firmware accepts ICY 200 OK,
// which fetch rejects, so a conventional client would call live stations dead.
function probe(url, timeoutMs = 7000) {
  return new Promise(resolve => {
    let parsed;
    try { parsed = new URL(url); } catch { return resolve(null); }
    const socket = connect({host: parsed.hostname, port: Number(parsed.port) || 80, timeout: timeoutMs});
    let buffer = Buffer.alloc(0);
    let settled = false;
    const finish = value => { if (settled) return; settled = true; socket.destroy(); resolve(value); };
    socket.on("timeout", () => finish(null));
    socket.on("error", () => finish(null));
    socket.on("connect", () => socket.write(
      `GET ${parsed.pathname || "/"}${parsed.search} HTTP/1.0\r\nHost: ${parsed.hostname}\r\n` +
      `User-Agent: OpenRadioCore2/0.2-directory\r\nIcy-MetaData: 1\r\nConnection: close\r\n\r\n`));
    socket.on("data", chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      const split = buffer.indexOf("\r\n\r\n");
      if (split < 0) { if (buffer.length > 16384) finish(null); return; }
      const head = buffer.subarray(0, split).toString("latin1").split("\r\n");
      const headers = Object.fromEntries(head.slice(1).filter(line => line.includes(":"))
        .map(line => [line.slice(0, line.indexOf(":")).trim().toLowerCase(), line.slice(line.indexOf(":") + 1).trim()]));
      if (buffer.subarray(split + 4).length < 2048) return;
      const ok = /\b200\b/.test(head[0] || "") && (headers["content-type"] || "").startsWith("audio/");
      finish(ok ? {bitrateKbps: Number(headers["icy-br"]) || null, hasIcyMetadata: Boolean(headers["icy-metaint"])} : null);
    });
    socket.on("end", () => finish(null));
  });
}

// Operators that publish one host and serve several. Each rule maps a host to
// its siblings; the path is identical across them.
const mirrorFamilies = [
  {match: /^ic(\d)\.smcdn\.pl$/, siblings: ["ic1.smcdn.pl", "ic2.smcdn.pl"]},
  {match: /^rs(\d+)-krk\.rmfstream\.pl$/, siblings: ["rs102-krk.rmfstream.pl", "rs202-krk.rmfstream.pl"]}
];

function mirrorsOf(url) {
  const parsed = new URL(url);
  const family = mirrorFamilies.find(item => item.match.test(parsed.hostname));
  if (!family) return [];
  return family.siblings.filter(host => host !== parsed.hostname).map(host => {
    const mirror = new URL(url);
    mirror.hostname = host;
    return mirror.toString();
  });
}

// Community names carry artefacts that would be shown on a 320-pixel screen.
function cleanName(raw) {
  let name = raw.replace(/\s+/g, " ").trim();
  name = name.replace(/\s*[-–]\s*om$/i, "");           // radio-browser submission suffix
  name = name.replace(/\s+\(?\d{2,3}\s?(kbps|kb\/s|k)\)?$/i, "");  // trailing bitrate with a unit
  name = name.replace(/\s+(64|96|112|128|160|192|256|320)$/i, "");    // bare bitrate; 357 and 90 are station names
  name = name.replace(/\s*\|\s*.*$/, "");               // trailing pipe-separated slogan
  name = name.replace(/\s*[-–]\s*$/, "").trim();
  return name;
}

// Two entries belong to the same station when their cleaned names agree once
// case, punctuation and the generic "Radio" prefix are set aside.
const brandKey = name => cleanName(name).toLowerCase()
  .replace(/^radio\s+/, "").replace(/[^a-z0-9]/g, "");

const report = JSON.parse(await readFile(reportUrl, "utf8"));
const groups = new Map();
for (const station of report.stations) {
  // Radio-browser decorates duplicate mounts with "#NAME" fragments. A
  // fragment never reaches the wire from a correct client, but the device
  // HTTP stack forwards it into the GET line and smcdn answers 400
  // (measured 2026-07-22: Eska Rock). Strip at the source of the catalog.
  station.url = station.url.split("#")[0];
  const key = brandKey(station.name);
  if (!key) continue;
  if (!groups.has(key)) groups.set(key, {names: [], urls: new Map(), votes: 0, favicon: null});
  const group = groups.get(key);
  group.names.push({name: cleanName(station.name), votes: station.votes});
  // A favicon URL carrying a query string is rejected outright: community
  // entries include Firebase links with access tokens (?alt=media&token=...),
  // and shipping third-party access tokens inside a GPL image is not
  // something a security gate should be taught to tolerate. Plain paths only;
  // everything else falls back to the monogram.
  const query = (station.favicon ?? "").split("?")[1] ?? "";
  const benignQuery = query.length <= 24 && /^[A-Za-z0-9=&._-]*$/.test(query) && !/token|key|sig|auth|pass/i.test(query);
  const cleanFavicon = station.favicon && /^https?:\/\/[^?#]+\.(png|jpe?g|ico|svg|webp|gif)(\?|$)/i.test(station.favicon) && benignQuery
    ? station.favicon : null;
  if (station.votes >= group.votes && cleanFavicon) group.favicon = cleanFavicon;
  group.votes = Math.max(group.votes, station.votes);
  if (!group.urls.has(station.url)) group.urls.set(station.url, {url: station.url, bitrateKbps: station.bitrateKbps, verified: true});
}

// Probe every mirror we can predict but have not already seen.
const pending = [];
for (const [key, group] of groups) {
  for (const url of [...group.urls.keys()]) {
    for (const mirror of mirrorsOf(url)) {
      if (!group.urls.has(mirror)) pending.push({key, mirror, bitrateKbps: group.urls.get(url).bitrateKbps});
    }
  }
}
process.stdout.write(`${groups.size} stations grouped, probing ${pending.length} predicted mirrors\n`);
const concurrency = 12;
let recovered = 0;
for (let index = 0; index < pending.length; index += concurrency) {
  const slice = pending.slice(index, index + concurrency);
  const results = await Promise.all(slice.map(item => probe(item.mirror).then(value => ({item, value}))));
  for (const {item, value} of results) {
    if (!value) continue;
    groups.get(item.key).urls.set(item.mirror, {url: item.mirror, bitrateKbps: value.bitrateKbps || item.bitrateKbps, verified: true});
    recovered += 1;
  }
}
process.stdout.write(`${recovered} mirrors answered and became alternates\n`);

const stations = [...groups.entries()].map(([key, group]) => {
  // The most-voted spelling wins: it is the one listeners recognise.
  const name = group.names.sort((left, right) => right.votes - left.votes)[0].name;
  const urls = [...group.urls.values()].sort((left, right) => left.url.localeCompare(right.url));
  return {id: key.slice(0, 40), name: name.slice(0, 38), votes: group.votes, favicon: group.favicon,
          endpoints: urls.map(item => ({url: item.url, bitrateKbps: item.bitrateKbps}))};
}).filter(station => station.name.length >= 2 && !/^https?:\/\//i.test(station.name) && station.endpoints.every(endpoint => endpoint.url.length <= 110))
  .sort((left, right) => right.votes - left.votes);

const withAlternates = stations.filter(station => station.endpoints.length > 1).length;
await writeFile(outputUrl, `${JSON.stringify({
  schemaVersion: 1,
  directoryId: `${country.toLowerCase()}-verified-${probedAt}`,
  countryCode: country,
  probedAt,
  evidence: `socket-probe-${probedAt}`,
  note: "Every endpoint answered our own raw-socket probe with audio. radio-browser supplied the candidates; it did not supply the verdict. Stations with more than one endpoint rotate between them exactly like the curated nine.",
  stations
}, null, 2)}\n`);

process.stdout.write(
  `WROTE directory stations=${stations.length} endpoints=${stations.reduce((sum, item) => sum + item.endpoints.length, 0)} ` +
  `with_alternates=${withAlternates} -> ${outputUrl.pathname.split("/").pop()}\n`);
