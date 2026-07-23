import {createReadStream, mkdtempSync, readFileSync, rmSync, statSync} from "node:fs";
import {createServer} from "node:http";
import {extname, join, normalize, sep} from "node:path";
import {tmpdir} from "node:os";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

// Without the trailing separator: the containment guard below compares
// against projectRoot + sep, and a root that already ends in one would
// double it and 403 every request.
const projectRoot = normalize(fileURLToPath(new URL("../", import.meta.url))).replace(/[/\\]+$/, "");
const port = Number(process.env.PORT || 4173);
const rendererBinary = join(projectRoot, "build/renderer/open-radio-render");
const rendererBuild = spawnSync("make", ["-C", "renderer", "host"], {cwd: projectRoot, encoding: "utf8"});
const rendererReady = rendererBuild.status === 0;
const rendererScreens = new Set([
  "now-playing-editorial", "now-playing-glance", "screensaver-pulse", "screensaver-bars", "screensaver-orbit", "screensaver-cat",
  "display-off", "stations", "volume-control", "brightness-control", "settings-quick", "settings-system", "settings-display", "wifi-status",
  "wifi-recovery", "bluetooth-fallback", "unsupported", "safe-mode", "onboarding-wifi",
  "onboarding-first-sound", "onboarding-bluetooth", "bluetooth-pairing", "diagnostics", "about", "market"
]);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const requestPath = decodeURIComponent(requestUrl.pathname);
  // The onboarding portal is the whole first-run experience and it is the one
  // surface that cannot be reviewed without hardware, because it needs a scan
  // result to show anything at all. These two routes let the real portal run
  // end to end in a phone browser against this server. They exist only here;
  // the device implements its own, and nothing in firmware reads this file.
  if (requestPath === "/api/networks") {
    // Mirrors sendNetworks() in device_network_runtime.hpp exactly. That handler
    // only distinguishes open from encrypted, so it emits OPEN or WPA2_PSK and
    // nothing else, and it hardcodes captivePortal to false — a fixture that
    // invented WPA3_SAE or a captive flag would exercise branches the device
    // cannot reach and teach the reviewer a portal that does not exist.
    // 32 bytes is the 802.11 maximum and the portal rejects anything longer,
    // so the worst realistic row is exactly 32 characters with no space to wrap at.
    // Synthetic fixture names only (pii-ok): shapes mirror the field — a home
    // router, a 32-character unbreakable ISP name at the 802.11 maximum, a
    // known fiber network, an open hotel net and a phone hotspot with a space.
    const networks = [
      {id: "Domowa_Siec_5G", label: "Domowa_Siec_5G", security: "WPA2_PSK", captivePortal: false, known: false, rssi: -48},
      {id: "Osiedlowa-Siec-24GHz-Goscie-0042", label: "Osiedlowa-Siec-24GHz-Goscie-0042", security: "WPA2_PSK", captivePortal: false, known: false, rssi: -66},
      {id: "Swiatlowod_Klatka_A21", label: "Swiatlowod_Klatka_A21", security: "WPA2_PSK", captivePortal: false, known: true, rssi: -70},
      {id: "Hotel Goscinny - Goscie", label: "Hotel Goscinny - Goscie", security: "OPEN", captivePortal: false, known: false, rssi: -75},
      {id: "Hotspot Telefonu", label: "Hotspot Telefonu", security: "WPA2_PSK", captivePortal: false, known: false, rssi: -52}
    ];
    response.writeHead(200, {"Content-Type": "application/json; charset=utf-8", "X-Open-Radio-CSRF": "simulator-csrf-token", "Cache-Control": "no-store"})
      .end(JSON.stringify({networks}));
    return;
  }
  if (requestPath === "/api/directory") {
    // Mirrors sendDirectory(): index, name and how many verified edges the
    // station has. The device keeps the URLs; the portal posts back indices.
    const directory = JSON.parse(readFileSync(join(projectRoot, "ui-contract/catalog/pl-directory.v1.json"), "utf8"));
    response.writeHead(200, {"Content-Type": "application/json; charset=utf-8", "X-Open-Radio-CSRF": "simulator-csrf-token", "Cache-Control": "no-store"})
      .end(JSON.stringify({probedAt: directory.probedAt,
                           stations: directory.stations.map((station, index) => ({i: index, n: station.name, e: station.endpoints.length, l: station.favicon ? 1 : 0}))}));
    return;
  }
  if (requestPath === "/api/slots" && request.method === "POST") {
    response.writeHead(202, {"Content-Type": "application/json; charset=utf-8"}).end(JSON.stringify({accepted: true}));
    return;
  }
  if (requestPath === "/api/config-form" && request.method === "POST") {
    // acceptConfiguration() answers 202 with this exact shape; the portal reads
    // both fields and stalls on anything else.
    response.writeHead(202, {"Content-Type": "application/json; charset=utf-8"})
      .end(JSON.stringify({accepted: true, waitingForNetwork: false}));
    return;
  }
  if (requestPath === "/api/renderer-frame") {
    if (!rendererReady) {
      response.writeHead(503, {"Content-Type": "text/plain; charset=utf-8"}).end("Host renderer unavailable");
      return;
    }
    const theme = requestUrl.searchParams.get("theme");
    const screen = requestUrl.searchParams.get("screen");
    const variant = requestUrl.searchParams.get("variant") ?? "editorial";
    const locale = requestUrl.searchParams.get("locale");
    const station = Number(requestUrl.searchParams.get("station"));
    const volume = Number(requestUrl.searchParams.get("volume"));
    const output = requestUrl.searchParams.get("output");
    const degraded = requestUrl.searchParams.get("degraded");
    const brightness = Number(requestUrl.searchParams.get("brightness") ?? 75);
    const frame = Number(requestUrl.searchParams.get("frame") ?? 0);
    const saverMode = Number(requestUrl.searchParams.get("saverMode") ?? 0);
    const confirmDelete = requestUrl.searchParams.get("confirmDelete") ?? "false";
    const setupCode = requestUrl.searchParams.get("setupCode") ?? "OR-A1B2C3D4E5F6";
    const wifiPortal = requestUrl.searchParams.get("wifiPortal") ?? "false";
    const wifiOnline = requestUrl.searchParams.get("wifiOnline") ?? "true";
    const bluetoothState = requestUrl.searchParams.get("bluetoothState") ?? "idle";
    const bluetoothCandidate = requestUrl.searchParams.get("bluetoothCandidate") ?? "";
    const bluetoothRemembered = requestUrl.searchParams.get("bluetoothRemembered") ?? "false";
    if (!["dark", "light"].includes(theme) || !rendererScreens.has(screen) || !["editorial", "glance"].includes(variant) || !["pl", "en"].includes(locale) ||
        !Number.isInteger(station) || station < 0 || station > 8 || !Number.isInteger(volume) ||
        volume < 0 || volume > 100 || !Number.isInteger(brightness) || brightness < 0 || brightness > 100 ||
        !Number.isInteger(frame) || frame < 0 || frame > 255 ||
        !Number.isInteger(saverMode) || saverMode < 0 || saverMode > 3 || !["local", "bluetooth"].includes(output) ||
        !["false", "true"].includes(degraded) || !["false", "true"].includes(confirmDelete) ||
        !/^OR-[A-F0-9]{12}$/.test(setupCode) || !["false", "true"].includes(wifiOnline) ||
        !["false", "true"].includes(wifiPortal) ||
        !["idle", "scanning", "found", "connecting", "connected", "error"].includes(bluetoothState) ||
        !["false", "true"].includes(bluetoothRemembered) || bluetoothCandidate.length > 32) {
      response.writeHead(400, {"Content-Type": "text/plain; charset=utf-8"}).end("Invalid renderer query");
      return;
    }
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "open-radio-render-"));
    const outputPath = join(temporaryDirectory, "frame.ppm");
    try {
      const argumentsList = [outputPath, "--variant", variant, "--screen", screen, "--theme", theme, "--locale", locale, "--station", String(station), "--volume", String(volume), "--brightness", String(brightness), "--output", output, "--degraded", degraded, "--track", requestUrl.searchParams.get("track") ?? "", "--setup-code", setupCode, "--wifi-online", wifiOnline, "--wifi-portal", wifiPortal, "--bluetooth-state", bluetoothState, "--bluetooth-candidate", bluetoothCandidate, "--bluetooth-remembered", bluetoothRemembered, "--frame", String(frame), "--saver-mode", String(saverMode), "--confirm-delete", confirmDelete];
      const render = spawnSync(rendererBinary, argumentsList, {cwd: projectRoot, encoding: "utf8"});
      if (render.status !== 0) {
        response.writeHead(500, {"Content-Type": "text/plain; charset=utf-8"}).end("Renderer failed");
        return;
      }
      const truncated = render.stdout.match(/truncated=(\d+)/)?.[1] ?? "unknown";
      response.writeHead(200, {"Content-Type": "image/x-portable-pixmap", "Cache-Control": "no-store", "X-Open-Radio-Renderer": "cpp-rgb565-inter", "X-Open-Radio-Truncated": truncated});
      response.end(readFileSync(outputPath));
    } finally {
      rmSync(temporaryDirectory, {recursive: true, force: true});
    }
    return;
  }
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = normalize(join(projectRoot, relativePath));
  // Prefix check with the separator: a bare startsWith(projectRoot) would
  // also admit a sibling directory whose name merely extends this one.
  if (filePath !== projectRoot && !filePath.startsWith(projectRoot + sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const resolvedPath = statSync(filePath).isDirectory() ? join(filePath, "index.html") : filePath;
    response.writeHead(200, {"Content-Type": mimeTypes[extname(resolvedPath)] || "application/octet-stream", "Cache-Control": "no-store"});
    createReadStream(resolvedPath).pipe(response);
  } catch {
    response.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"}).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Open Radio Core2 preview: http://127.0.0.1:${port}/\n`);
});
