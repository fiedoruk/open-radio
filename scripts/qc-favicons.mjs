// Verifies every favicon the directory carries before it may be compiled into
// firmware. The device can decode PNG and JPEG, nothing else, and it will
// fetch these URLs unattended on first boot — so each one must prove, today:
// it answers, it is an image, its magic bytes match a decodable format, and
// its pixel dimensions are sane. Anything less becomes null and the tile
// keeps its monogram. radio-browser supplied the candidates, not the verdict.
import {readFile, writeFile} from "node:fs/promises";
import {request as httpsRequest} from "node:https";
import {request as httpRequest} from "node:http";

const root = new URL("../", import.meta.url);
const directoryUrl = new URL("ui-contract/catalog/pl-directory.v1.json", root);
const MAX_BYTES = 262144;
const MAX_PIXELS = 1600;

function pngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer.readUInt32BE(0) !== 0x89504e47) return null;
  return {format: "png", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    // SOF0..SOF15 minus DHT/DAC/RST carry the frame header with dimensions.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {format: "jpeg", height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7)};
    }
    offset += 2 + length;
  }
  return null;
}

function fetchHead(url, depth = 0) {
  return new Promise(resolve => {
    if (depth > 2) return resolve({ok: false, reason: "redirect-loop"});
    let parsed;
    try { parsed = new URL(url); } catch { return resolve({ok: false, reason: "bad-url"}); }
    const requester = parsed.protocol === "https:" ? httpsRequest : httpRequest;
    const req = requester(parsed, {timeout: 8000, headers: {"User-Agent": "OpenRadioCore2/0.2-favicon-qc"}}, response => {
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        return resolve(fetchHead(new URL(response.headers.location, parsed).toString(), depth + 1));
      }
      if (response.statusCode !== 200) { response.resume(); return resolve({ok: false, reason: `http-${response.statusCode}`}); }
      const declared = Number(response.headers["content-length"] ?? 0);
      if (declared > MAX_BYTES) { response.resume(); return resolve({ok: false, reason: "oversize"}); }
      const chunks = [];
      let received = 0;
      response.on("data", chunk => {
        received += chunk.length;
        if (received > MAX_BYTES) { req.destroy(); return resolve({ok: false, reason: "oversize"}); }
        if (chunks.length < 8) chunks.push(chunk);
        if (Buffer.concat(chunks).length >= 4096) { req.destroy(); finish(); }
      });
      response.on("end", finish);
      let finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        const head = Buffer.concat(chunks);
        const dims = pngDimensions(head) ?? jpegDimensions(head);
        if (!dims) return resolve({ok: false, reason: "not-png-jpeg"});
        if (dims.width < 16 || dims.height < 16 || dims.width > MAX_PIXELS || dims.height > MAX_PIXELS) {
          return resolve({ok: false, reason: `dims-${dims.width}x${dims.height}`});
        }
        resolve({ok: true, ...dims, finalUrl: url});
      }
    });
    req.on("timeout", () => { req.destroy(); resolve({ok: false, reason: "timeout"}); });
    req.on("error", error => resolve({ok: false, reason: error.code ?? "error"}));
    req.end();
  });
}

const directory = JSON.parse(await readFile(directoryUrl, "utf8"));
const candidates = directory.stations.filter(station => station.favicon);
process.stdout.write(`QC ${candidates.length} favicon URLs\n`);
let verified = 0, rejected = 0;
for (let index = 0; index < candidates.length; index += 12) {
  const slice = candidates.slice(index, index + 12);
  const results = await Promise.all(slice.map(station => fetchHead(station.favicon)));
  results.forEach((result, offset) => {
    const station = slice[offset];
    if (result.ok) {
      // A redirect target is what the device would land on; store it resolved.
      station.favicon = result.finalUrl;
      station.faviconFormat = result.format;
      verified += 1;
    } else {
      station.favicon = null;
      delete station.faviconFormat;
      rejected += 1;
    }
  });
}
await writeFile(directoryUrl, `${JSON.stringify(directory, null, 2)}\n`);
process.stdout.write(`PASS favicon-qc verified=${verified} rejected=${rejected}\n`);
