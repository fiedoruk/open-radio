import {Screens, SystemStates} from "./state-machine.mjs";
import {createUiController} from "./controller.mjs";
import {hitTest, resolveHitboxes} from "./hitboxes.mjs";

const [layout, hitboxDefinition, setupOptions, catalog, messagesPl, messagesEn] = await Promise.all([
  fetch("../ui-contract/layout/core2-320x240.json").then(response => response.json()),
  fetch("../ui-contract/layout/hitboxes.json").then(response => response.json()),
  fetch("../ui-contract/fixtures/setup-options.json").then(response => response.json()),
  fetch("../ui-contract/catalog/stations.pl.json").then(response => response.json()),
  fetch("../ui-contract/i18n/pl.json").then(response => response.json()),
  fetch("../ui-contract/i18n/en.json").then(response => response.json())
]);

const canvas = document.querySelector("#screen");
const context = canvas.getContext("2d");
context.imageSmoothingEnabled = false;

const controller = createUiController({catalog, dictionaries: {pl: messagesPl, en: messagesEn}});
let snapshot = controller.snapshot();
let hitboxes = [];
let showHitboxes = false;

const cityOptions = setupOptions.cities;
const speakerOptions = setupOptions.speakers;

const messages = () => snapshot.copy;
const station = (index = snapshot.stationIndex) => snapshot.stations[index];

function dispatch(event) {
  snapshot = controller.dispatch(event);
  render();
}

function rect(x, y, width, height, radius, fill, stroke = null) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = 1;
    context.stroke();
  }
}

function text(value, x, y, size, color, options = {}) {
  const {weight = 600, align = "left", baseline = "alphabetic", maxWidth} = options;
  context.font = `${weight} ${size}px Arial, sans-serif`;
  context.textAlign = align;
  context.textBaseline = baseline;
  context.fillStyle = color;
  if (maxWidth) context.fillText(value, x, y, maxWidth);
  else context.fillText(value, x, y);
}

function wrapText(value, x, y, maxWidth, size, lineHeight, color, maxLines = 4) {
  const words = value.split(" ");
  const lines = [];
  let line = "";
  context.font = `600 ${size}px Arial, sans-serif`;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  for (const [index, item] of lines.slice(0, maxLines).entries()) {
    text(item, x, y + index * lineHeight, size, color);
  }
}

function drawWifiIcon(x, y, color) {
  context.strokeStyle = color;
  context.lineWidth = 2;
  for (let radius = 4; radius <= 12; radius += 4) {
    context.beginPath();
    context.arc(x, y, radius, Math.PI * 1.2, Math.PI * 1.8);
    context.stroke();
  }
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y + 1, 2, 0, Math.PI * 2);
  context.fill();
}

function drawSpeakerIcon(x, y, color, bluetooth = false) {
  context.fillStyle = color;
  context.fillRect(x - 7, y - 5, 5, 10);
  context.beginPath();
  context.moveTo(x - 2, y - 5);
  context.lineTo(x + 4, y - 10);
  context.lineTo(x + 4, y + 10);
  context.lineTo(x - 2, y + 5);
  context.closePath();
  context.fill();
  if (bluetooth) text("B", x + 12, y + 1, 10, color, {weight: 800, baseline: "middle"});
}

function drawMenuIcon(x, y, color) {
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.lineCap = "round";
  for (const offset of [-6, 0, 6]) {
    context.beginPath();
    context.moveTo(x - 8, y + offset);
    context.lineTo(x + 8, y + offset);
    context.stroke();
  }
}

function drawStatusBar(theme) {
  context.fillStyle = "rgba(0,0,0,0.24)";
  context.fillRect(0, 0, layout.width, layout.statusBarHeight);
  drawWifiIcon(18, 18, snapshot.wifi === "ONLINE" ? theme.primary : "#ff8d87");
  text(snapshot.city, 37, 15, 10, theme.text, {baseline: "middle", maxWidth: 104});
  const outputLabel = snapshot.output === "BT" ? (snapshot.speaker || "BT") : "CORE2";
  drawSpeakerIcon(226, 14, theme.text, snapshot.output === "BT");
  text(outputLabel, 244, 15, 9, theme.text, {baseline: "middle", maxWidth: 54});
  text(`${snapshot.volume}%`, 308, 15, 9, theme.muted, {align: "right", baseline: "middle"});
}

function drawMotif(theme, index) {
  context.save();
  context.globalAlpha = 0.55;
  context.strokeStyle = theme.primary;
  context.fillStyle = theme.secondary;
  context.lineWidth = 2;
  const motif = theme.motif;
  if (["orbit", "ripples", "arches"].includes(motif)) {
    for (let radius = 18; radius <= 66; radius += 16) {
      context.beginPath();
      context.arc(70, 102, radius, motif === "arches" ? Math.PI : 0, Math.PI * 2);
      context.stroke();
    }
  } else if (["grid", "steps"].includes(motif)) {
    for (let step = 0; step < 5; step += 1) context.strokeRect(18 + step * 12, 56 + step * 9, 74, 64);
  } else if (["confetti", "burst"].includes(motif)) {
    for (let item = 0; item < 14; item += 1) {
      const angle = (item / 14) * Math.PI * 2;
      const x = 67 + Math.cos(angle) * (22 + (item % 3) * 10);
      const y = 99 + Math.sin(angle) * (22 + (item % 3) * 10);
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.fillRect(-2, -7, 4, 14);
      context.restore();
    }
  } else {
    for (let line = 0; line < 5; line += 1) {
      context.beginPath();
      context.moveTo(14, 72 + line * 16);
      context.bezierCurveTo(40, 62 + line * 17, 75, 86 + line * 11, 116, 70 + line * 16);
      context.stroke();
    }
  }
  context.globalAlpha = 0.92;
  rect(34, 69, 72, 64, 18, theme.surface, theme.primary);
  const current = snapshot.stations[index];
  text(current.short, 70, 102, current.short.length > 6 ? 13 : 18, theme.text, {weight: 800, align: "center", baseline: "middle", maxWidth: 62});
  context.restore();
}

function statusCopy() {
  if (snapshot.systemState === SystemStates.SAFE_MODE) return messages().safeMode;
  if (snapshot.systemState === SystemStates.UNSUPPORTED_STATION) return messages().unsupportedStation;
  if (snapshot.statusMessage === "WIFI_LOST") return messages().retrying;
  if (snapshot.statusMessage === "BT_FALLBACK") return messages().playingLocal;
  if (snapshot.statusMessage === "STATION_FALLBACK") return messages().stationFallback;
  return snapshot.output === "BT" ? messages().playingBluetooth : messages().playingLocal;
}

function drawNowPlaying() {
  const current = station();
  const theme = current.theme;
  context.fillStyle = theme.background;
  context.fillRect(0, 0, layout.width, layout.height);
  drawStatusBar(theme);
  drawMotif(theme, snapshot.stationIndex);
  text(current.name, 132, 78, current.name.length > 13 ? 20 : 24, theme.text, {weight: 800, maxWidth: 128});
  rect(268, 36, 44, 44, 14, theme.surface, "rgba(255,255,255,0.12)");
  drawMenuIcon(290, 58, theme.text);
  text(current.transport, 133, 101, 10, theme.primary, {weight: 800});
  text(statusCopy(), 133, 123, 13, theme.muted, {maxWidth: 172});
  if (snapshot.stationIndex !== snapshot.requestedStationIndex) {
    text(`↻ ${snapshot.stations[snapshot.requestedStationIndex].name}`, 133, 143, 10, theme.secondary, {maxWidth: 170});
  } else {
    text(messages().lastKnownGood, 133, 143, 9, theme.muted, {maxWidth: 170});
  }
  if (snapshot.systemState !== SystemStates.PLAYING) {
    rect(12, 156, 296, 24, 9, "rgba(0,0,0,0.46)");
    text(statusCopy(), 160, 168, 11, theme.text, {weight: 700, align: "center", baseline: "middle", maxWidth: 278});
  }
  context.fillStyle = "rgba(0,0,0,0.34)";
  context.fillRect(0, 184, 320, 56);
  rect(8, 190, 56, 44, 14, theme.surface, "rgba(255,255,255,0.12)");
  rect(72, 190, 176, 44, 14, theme.primary);
  rect(256, 190, 56, 44, 14, theme.surface, "rgba(255,255,255,0.12)");
  text("‹", 36, 211, 30, theme.text, {align: "center", baseline: "middle"});
  text(messages().stations, 160, 212, 13, theme.background, {weight: 800, align: "center", baseline: "middle"});
  text("›", 284, 211, 30, theme.text, {align: "center", baseline: "middle"});
}

function drawQr(x, y, size, color, background) {
  const cells = 13;
  const cell = Math.floor(size / cells);
  context.fillStyle = background;
  context.fillRect(x, y, cell * cells, cell * cells);
  context.fillStyle = color;
  for (let row = 0; row < cells; row += 1) {
    for (let column = 0; column < cells; column += 1) {
      const finder = (row < 4 && column < 4) || (row < 4 && column > 8) || (row > 8 && column < 4);
      const data = ((row * 7 + column * 11 + row * column) % 5) < 2;
      if (finder || data) context.fillRect(x + column * cell, y + row * cell, cell, cell);
    }
  }
}

function drawWifiSetup() {
  const theme = station(0).theme;
  context.fillStyle = "#0d1418";
  context.fillRect(0, 0, 320, 240);
  text(messages().setupWifiTitle, 16, 26, 22, "#f4fbf8", {weight: 800});
  text("1 / 3", 304, 24, 10, "#8da39a", {align: "right"});
  drawQr(18, 48, 91, "#101820", "#eaf8f2");
  text("Radio-Setup", 126, 62, 14, theme.primary, {weight: 800});
  text("radio.local", 126, 83, 12, "#f4fbf8", {weight: 700});
  wrapText(messages().setupWifiBody, 126, 106, 176, 12, 15, "#9eb0aa");
  rect(16, 174, 288, 48, 14, "#17221f", "#2f4c42");
  drawWifiIcon(38, 198, theme.primary);
  text(messages().setupWifiWaiting, 58, 198, 12, "#d8e8e1", {weight: 700, baseline: "middle", maxWidth: 232});
  if (snapshot.setupComplete) {
    text("×", 294, 21, 18, "#f4fbf8", {align: "center", baseline: "middle"});
  }
}

function drawFirstSound() {
  const theme = drawSetupHeader(2, messages().firstSoundTitle, messages().firstSoundBody);
  rect(12, 116, 296, 52, 14, theme.surface, theme.primary);
  drawSpeakerIcon(40, 142, theme.primary);
  text(station().name, 64, 135, 13, theme.text, {weight: 800, maxWidth: 220});
  text(messages().playingLocal, 64, 155, 10, theme.muted, {weight: 700, maxWidth: 220});
  rect(8, 188, 304, 44, 14, theme.primary);
  text(messages().continue, 160, 210, 12, theme.background, {weight: 800, align: "center", baseline: "middle"});
}

function drawSetupHeader(step, title, body, total = 3) {
  const theme = station().theme;
  context.fillStyle = theme.background;
  context.fillRect(0, 0, 320, 240);
  rect(0, 0, 320, 32, 0, "rgba(0,0,0,0.34)");
  text(`${station().name} · ${messages().playingLocal}`, 12, 17, 10, theme.primary, {weight: 700, baseline: "middle", maxWidth: 240});
  text(`${step} / ${total}`, 306, 17, 10, theme.muted, {align: "right", baseline: "middle"});
  text(title, 16, 58, 22, theme.text, {weight: 800});
  wrapText(body, 16, 78, 288, 11, 14, theme.muted, 2);
  return theme;
}

function drawCitySetup() {
  const theme = drawSetupHeader(2, messages().cityTitle, messages().cityBody);
  cityOptions.forEach((city, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 12 + column * 154;
    const y = 112 + row * 40;
    const selected = snapshot.city === city;
    rect(x, y, 142, 34, 10, selected ? theme.primary : theme.surface, selected ? theme.primary : "rgba(255,255,255,0.12)");
    text(city, x + 71, y + 17, 11, selected ? theme.background : theme.text, {weight: 700, align: "center", baseline: "middle", maxWidth: 130});
  });
}

function drawBluetoothSetup() {
  const theme = drawSetupHeader(3, messages().bluetoothTitle, messages().bluetoothBody, 3);
  speakerOptions.forEach((speakerName, index) => {
    const y = 112 + index * 42;
    rect(12, y, 218, 36, 11, theme.surface, "rgba(255,255,255,0.12)");
    drawSpeakerIcon(34, y + 18, theme.primary, true);
    text(speakerName, 54, y + 18, 12, theme.text, {weight: 700, baseline: "middle", maxWidth: 164});
  });
  rect(240, 112, 68, 120, 13, "rgba(0,0,0,0.28)", "rgba(255,255,255,0.12)");
  text(messages().skip, 274, 164, 11, theme.text, {weight: 800, align: "center"});
  text("CORE2", 274, 184, 9, theme.primary, {weight: 800, align: "center"});
}

function drawStations() {
  context.fillStyle = "#0f131a";
  context.fillRect(0, 0, 320, 240);
  text(messages().stations, 16, 22, 18, "#f4f7fb", {weight: 800});
  rect(268, 4, 44, 44, 12, "#1d2430");
  text("×", 290, 26, 22, "#dce3ed", {align: "center", baseline: "middle"});
  snapshot.stations.forEach((item, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 8 + column * 104;
    const y = 52 + row * 60;
    const isPlaying = snapshot.stationIndex === index;
    rect(x, y, 96, 52, 12, item.theme.surface, isPlaying ? item.theme.primary : "rgba(255,255,255,0.1)");
    rect(x + 6, y + 7, 35, 35, 10, item.theme.background, item.theme.primary);
    text(item.short, x + 23, y + 25, item.short.length > 5 ? 7 : 10, item.theme.text, {weight: 800, align: "center", baseline: "middle", maxWidth: 30});
    const words = item.name.split(" ");
    if (item.name.length > 10 && words.length > 1) {
      text(words.slice(0, -1).join(" "), x + 46, y + 16, 7, item.theme.text, {weight: 700, maxWidth: 43});
      text(words.at(-1), x + 46, y + 27, 7, item.theme.text, {weight: 700, maxWidth: 43});
      text(item.transport, x + 46, y + 42, 7, item.theme.muted, {weight: 700});
    } else {
      text(item.name, x + 46, y + 20, 9, item.theme.text, {weight: 700, maxWidth: 43});
      text(item.transport, x + 46, y + 36, 7, item.theme.muted, {weight: 700});
    }
  });
}

function drawSettings() {
  const theme = station().theme;
  context.fillStyle = "#0f131a";
  context.fillRect(0, 0, 320, 240);
  text(messages().settings, 16, 24, 19, "#f4f7fb", {weight: 800});
  rect(268, 4, 44, 44, 12, "#1d2430");
  text("×", 290, 26, 22, "#dce3ed", {align: "center", baseline: "middle"});
  const cells = [
    {label: "Wi-Fi", value: snapshot.wifi, screen: Screens.WIFI},
    {label: messages().cityTitle, value: snapshot.city, screen: Screens.CITY},
    {label: "Bluetooth", value: snapshot.speaker || "Core2", screen: Screens.BLUETOOTH},
    {label: messages().language, value: snapshot.locale.toUpperCase(), event: {type: "SET_LOCALE", locale: snapshot.locale === "pl" ? "en" : "pl"}},
    {label: messages().about, value: "fiedoruk.pl", screen: Screens.ABOUT},
    {label: messages().diagnostics, value: snapshot.systemState, screen: Screens.DIAGNOSTICS}
  ];
  cells.forEach((cell, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 10 + column * 155;
    const y = 54 + row * 58;
    rect(x, y, 145, 50, 12, "#1a212c", "#2a3442");
    text(cell.label, x + 12, y + 19, 11, theme.primary, {weight: 800, maxWidth: 118});
    text(cell.value, x + 12, y + 37, 9, "#aab4c3", {maxWidth: 120});
  });
}

function drawAbout() {
  const theme = station().theme;
  context.fillStyle = "#10151d";
  context.fillRect(0, 0, 320, 240);
  text(messages().about, 16, 26, 20, "#f5f7fb", {weight: 800});
  drawQr(214, 20, 84, "#10151d", "#e8f4ef");
  text(messages().founder, 16, 70, 18, theme.primary, {weight: 800});
  text("fiedoruk.pl", 16, 92, 12, "#c9d2dd", {weight: 700});
  text(messages().license, 16, 122, 11, "#f5f7fb", {weight: 700});
  text("No account · No analytics · No OTA", 16, 143, 10, "#8e9aaa");
  text("Open-source DIY proof of concept", 16, 164, 10, "#8e9aaa");
  rect(12, 190, 296, 40, 12, theme.primary);
  text(messages().back, 160, 210, 12, theme.background, {weight: 800, align: "center", baseline: "middle"});
}

function drawDiagnostics() {
  const theme = station().theme;
  context.fillStyle = "#0d1218";
  context.fillRect(0, 0, 320, 240);
  text(messages().diagnostics, 16, 26, 20, "#f5f7fb", {weight: 800});
  const rows = [["system", snapshot.systemState], ["reason", snapshot.recoveryReason], ["wifi", snapshot.wifi], ["bluetooth", snapshot.bluetooth], ["output", snapshot.output], ["recoveries", String(snapshot.diagnostics.recoveries)]];
  rows.forEach(([label, value], index) => {
    const y = 53 + index * 22;
    text(label.toUpperCase(), 16, y, 9, "#718093", {weight: 700});
    text(value, 116, y, 10, index === 0 ? theme.primary : "#d9e0e9", {weight: 700, maxWidth: 184});
  });
  rect(12, 190, 296, 40, 12, theme.primary);
  text(messages().back, 160, 210, 12, theme.background, {weight: 800, align: "center", baseline: "middle"});
}

function drawHitboxOverlay() {
  if (!showHitboxes) return;
  context.save();
  context.font = "7px monospace";
  for (const box of hitboxes) {
    context.fillStyle = "rgba(255,64,129,0.16)";
    context.fillRect(box.x, box.y, box.width, box.height);
    context.strokeStyle = "#ff4081";
    context.strokeRect(box.x + 0.5, box.y + 0.5, box.width - 1, box.height - 1);
    context.fillStyle = "#ffffff";
    context.fillText(box.id, box.x + 3, box.y + 9, Math.max(0, box.width - 6));
  }
  context.restore();
}

function updateStatePanel() {
  document.querySelector("#state-screen").textContent = snapshot.screen;
  document.querySelector("#state-system").textContent = snapshot.systemState;
  document.querySelector("#state-output").textContent = snapshot.output;
  document.querySelector("#state-wifi").textContent = snapshot.wifi;
}

function settingsSource() {
  return [
    {label: "Wi-Fi", event: {type: "NAVIGATE", screen: Screens.WIFI}},
    {label: messages().cityTitle, event: {type: "NAVIGATE", screen: Screens.CITY}},
    {label: "Bluetooth", event: {type: "NAVIGATE", screen: Screens.BLUETOOTH}},
    {label: messages().language, event: {type: "SET_LOCALE", locale: snapshot.locale === "pl" ? "en" : "pl"}},
    {label: messages().about, event: {type: "NAVIGATE", screen: Screens.ABOUT}},
    {label: messages().diagnostics, event: {type: "NAVIGATE", screen: Screens.DIAGNOSTICS}}
  ];
}

function render() {
  hitboxes = resolveHitboxes(hitboxDefinition, snapshot, {
    cities: cityOptions.map(value => ({value})),
    speakers: speakerOptions.map(value => ({value})),
    stations: snapshot.stations,
    settings: settingsSource()
  });
  context.clearRect(0, 0, layout.width, layout.height);
  if (snapshot.screen === Screens.WIFI) drawWifiSetup();
  else if (snapshot.screen === Screens.CITY) drawCitySetup();
  else if (snapshot.screen === Screens.FIRST_SOUND) drawFirstSound();
  else if (snapshot.screen === Screens.BLUETOOTH) drawBluetoothSetup();
  else if (snapshot.screen === Screens.STATIONS) drawStations();
  else if (snapshot.screen === Screens.SETTINGS) drawSettings();
  else if (snapshot.screen === Screens.ABOUT) drawAbout();
  else if (snapshot.screen === Screens.DIAGNOSTICS) drawDiagnostics();
  else drawNowPlaying();
  drawHitboxOverlay();
  updateStatePanel();
}

canvas.addEventListener("pointerup", event => {
  const bounds = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - bounds.left) * (layout.width / bounds.width));
  const y = Math.floor((event.clientY - bounds.top) * (layout.height / bounds.height));
  const target = hitTest(hitboxes, x, y);
  if (target) dispatch(target.event);
});

document.querySelectorAll("[data-event]").forEach(button => button.addEventListener("click", () => dispatch({type: button.dataset.event})));
document.querySelectorAll("[data-scale]").forEach(button => {
  button.addEventListener("click", () => {
    document.documentElement.style.setProperty("--screen-scale", button.dataset.scale);
    document.querySelectorAll("[data-scale]").forEach(item => item.classList.toggle("is-active", item === button));
  });
});
document.querySelector("#hitbox-toggle").addEventListener("change", event => { showHitboxes = event.target.checked; render(); });
document.querySelector("#locale-toggle").addEventListener("click", () => dispatch({type: "SET_LOCALE", locale: snapshot.locale === "pl" ? "en" : "pl"}));
document.querySelector("#volume-down").addEventListener("click", () => dispatch({type: "SET_VOLUME", volume: snapshot.volume - 10}));
document.querySelector("#volume-up").addEventListener("click", () => dispatch({type: "SET_VOLUME", volume: snapshot.volume + 10}));

render();
