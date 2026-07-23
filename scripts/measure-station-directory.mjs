// Measures every endpoint in the directory and keeps only what demonstrably
// delivers with headroom. "Answered once with audio" admitted stations that
// stutter on the cube; the owner heard three of them and ordered the list cut
// to what works.
//
// Calibration history, kept as a warning. A first bar of 1.45x was drawn from
// same-day device reports — and then withdrawn: those reports came from a build
// that held the soft access point transmitting for five minutes after
// configuration (an interference of our own, later reverted) and followed
// several port-reset reboots. Radio ESKA on the same smcdn CDN played clean
// for days on release 0.1, which proves 1.39x suffices in normal conditions.
// What survives scrutiny: a live stream converges to 1.0x realtime once caught
// up, so "sustained" here mostly measures the server's prebuffer burst; the
// admission bar only rejects streams that cannot even hold realtime with a
// little slack, and the measurements are kept as data for ranking alternates.
import {readFile, writeFile} from "node:fs/promises";
import {connect} from "node:net";

const root = new URL("../", import.meta.url);
const directoryUrl = new URL("ui-contract/catalog/pl-directory.v1.json", root);
const reportUrl = new URL("output/directory-measurement.json", root);

const SUSTAINED_BAR = 1.1;    // admission floor: holds realtime with slack
// Burst is judged relative to the stream's own need. It decides RECOVERY SPEED
// after a stall, not whether the station works — smcdn's ~3x burst played
// clean for days on 0.1 — so the admission floor is low; the value is kept per
// endpoint so slots can order their alternates fastest-recovering first.
const BURST_BAR_X_NEED = 1.5;
const BITRATE_CEILING = 128;  // kb/s; the cube's intake under A2DP caps here
const WINDOW_S = 15;
const CONCURRENCY = 16;

function measure(url, bitrateKbps) {
  return new Promise(resolve => {
    let parsed;
    try { parsed = new URL(url); } catch { return resolve({ok: false, reason: "bad-url"}); }
    const socket = connect({host: parsed.hostname, port: Number(parsed.port) || 80, timeout: 9000});
    let header = Buffer.alloc(0);
    let inBody = false;
    let bytes = 0;
    let burst3 = null;
    let icyBr = null;
    let startedAt = null;
    let settled = false;
    const finish = result => { if (settled) return; settled = true; socket.destroy(); resolve(result); };
    socket.on("timeout", () => finish(inBody ? verdict() : {ok: false, reason: "timeout"}));
    socket.on("error", error => finish({ok: false, reason: error.code || "error"}));
    socket.on("connect", () => socket.write(
      `GET ${parsed.pathname || "/"}${parsed.search} HTTP/1.0\r\nHost: ${parsed.hostname}\r\n` +
      `User-Agent: OpenRadioCore2/0.2-measure\r\nIcy-MetaData: 1\r\nConnection: close\r\n\r\n`));
    const verdict = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      if (elapsed < 5 || bytes < 8192) return {ok: false, reason: "short-stream"};
      const avg = bytes / elapsed / 1024;
      const need = (icyBr || bitrateKbps || 128) * 1000 / 8 / 1024;
      return {ok: true, bitrateKbps: icyBr || bitrateKbps || 128,
              burst3KBps: Number(((burst3 ?? bytes) / 3 / 1024).toFixed(1)),
              avgKBps: Number(avg.toFixed(1)), xRealtime: Number((avg / need).toFixed(2))};
    };
    socket.on("data", chunk => {
      if (!inBody) {
        header = Buffer.concat([header, chunk]);
        const split = header.indexOf("\r\n\r\n");
        if (split < 0) { if (header.length > 16384) finish({ok: false, reason: "no-headers"}); return; }
        const lines = header.subarray(0, split).toString("latin1").split("\r\n");
        const status = lines[0] || "";
        const headers = Object.fromEntries(lines.slice(1).filter(line => line.includes(":"))
          .map(line => [line.slice(0, line.indexOf(":")).trim().toLowerCase(), line.slice(line.indexOf(":") + 1).trim()]));
        // The directory holds direct mounts; a redirect here means the entry
        // was really a locator, and the device would follow it too — but its
        // target rotates, so measure what the locator hands out now.
        if (/\b30[1237]\b/.test(status) && headers.location) {
          finish(measureRedirect(headers.location, bitrateKbps));
          return;
        }
        if (!/\b200\b/.test(status) || !(headers["content-type"] || "").startsWith("audio/")) {
          finish({ok: false, reason: status.slice(0, 32)});
          return;
        }
        icyBr = Number(headers["icy-br"]) || null;
        inBody = true;
        startedAt = Date.now();
        bytes = header.length - split - 4;
        setTimeout(() => finish(verdict()), WINDOW_S * 1000);
        return;
      }
      bytes += chunk.length;
      if (burst3 === null && Date.now() - startedAt >= 3000) burst3 = bytes;
    });
    socket.on("end", () => finish(inBody ? verdict() : {ok: false, reason: "closed"}));
  });
}

async function measureRedirect(url, bitrateKbps) { return measure(url, bitrateKbps); }

const directory = JSON.parse(await readFile(directoryUrl, "utf8"));
const jobs = [];
for (const station of directory.stations) {
  for (const endpoint of station.endpoints) jobs.push({station, endpoint});
}
process.stdout.write(`measuring ${jobs.length} endpoints, ${WINDOW_S}s each, ${CONCURRENCY} at a time\n`);

for (let index = 0; index < jobs.length; index += CONCURRENCY) {
  const slice = jobs.slice(index, index + CONCURRENCY);
  const results = await Promise.all(slice.map(job => measure(job.endpoint.url, job.endpoint.bitrateKbps)));
  results.forEach((result, offset) => { slice[offset].endpoint.measured = result; });
  process.stdout.write(`measured ${Math.min(index + CONCURRENCY, jobs.length)}/${jobs.length}\n`);
}

const dropped = [];
const kept = [];
for (const station of directory.stations) {
  const clean = station.endpoints.filter(endpoint => {
    const m = endpoint.measured;
    if (!m?.ok || m.bitrateKbps > BITRATE_CEILING) return false;
    const needKBps = m.bitrateKbps * 1000 / 8 / 1024;
    return m.xRealtime >= SUSTAINED_BAR && m.burst3KBps >= BURST_BAR_X_NEED * needKBps;
  });
  if (clean.length > 0) {
    // Tier A has wide margin; tier B is the delivery class Radio ESKA proved
    // clean on 0.1; tier C holds realtime but recovers slowest and stays out
    // of the shipped picker until proven on a device.
    const bestX = Math.max(...clean.map(endpoint => endpoint.measured.xRealtime));
    kept.push({...station, tier: bestX >= 1.5 ? "A" : bestX >= 1.3 ? "B" : "C",
      endpoints: clean.map(({measured, ...endpoint}) => ({...endpoint,
      bitrateKbps: measured.bitrateKbps, burst3KBps: measured.burst3KBps,
      avgKBps: measured.avgKBps, xRealtime: measured.xRealtime}))});
  } else {
    dropped.push({name: station.name,
      best: station.endpoints.map(e => e.measured?.ok
        ? `${e.measured.xRealtime}x/${e.measured.burst3KBps}KBps/${e.measured.bitrateKbps}k`
        : (e.measured?.reason ?? "unmeasured")).join(", ")});
  }
}

await writeFile(reportUrl, `${JSON.stringify({
  measuredAt: directory.probedAt, window: WINDOW_S,
  bars: {sustainedX: SUSTAINED_BAR, burstXNeed: BURST_BAR_X_NEED, bitrateKbps: BITRATE_CEILING},
  kept: kept.length, dropped: dropped.length, droppedStations: dropped
}, null, 2)}\n`);

directory.stations = kept;
directory.note = "Every endpoint here both answered our raw-socket probe AND delivered with measured headroom: sustained >= " +
  `${SUSTAINED_BAR}x realtime and a 3-second burst >= ${BURST_BAR_X_NEED}x the stream's own need, at <= ${BITRATE_CEILING} kb/s. ` +
  "Admission only rejects streams that cannot hold realtime with slack or exceed 128 kb/s; burst and sustained figures are kept per endpoint to rank alternates by recovery speed.";
await writeFile(directoryUrl, `${JSON.stringify(directory, null, 2)}\n`);

process.stdout.write(`KEPT ${kept.length} stations (${kept.reduce((n, s) => n + s.endpoints.length, 0)} endpoints), ` +
  `DROPPED ${dropped.length} -> output/directory-measurement.json\n`);
