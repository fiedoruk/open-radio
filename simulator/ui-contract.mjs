import {Screens, SystemStates} from "./state-machine.mjs";

const screenValues = new Set(Object.values(Screens));
const systemStateValues = new Set(Object.values(SystemStates));
const reasonValues = new Set(["NONE", "WIFI", "BLUETOOTH", "STREAM", "MEMORY"]);
const commandTypes = new Set([
  "WIFI_CONFIGURED", "CONTINUE_ONBOARDING", "SELECT_CITY", "SKIP_CITY", "SELECT_SPEAKER",
  "SKIP_BLUETOOTH", "NAVIGATE", "NEXT_STATION", "PREVIOUS_STATION",
  "SELECT_STATION", "SET_LOCALE", "SET_VOLUME", "SET_BRIGHTNESS", "SET_THEME", "WIFI_LOST",
  "WIFI_RECOVERED", "BLUETOOTH_LOST", "BLUETOOTH_RECOVERED",
  "STATION_FAILED", "STATION_RECOVERED", "ENTER_SAFE_MODE",
  "RESET_SIMULATOR", "LOAD_READY"
]);

export function createUiSnapshot(state, catalog, dictionaries) {
  const copy = dictionaries[state.locale];
  return Object.freeze({
    schemaVersion: 1,
    ...state,
    diagnostics: Object.freeze({...state.diagnostics}),
    copy: Object.freeze({...copy}),
    stations: Object.freeze(catalog.stations.map(station => Object.freeze(station)))
  });
}

export function validateUiCommand(command, stationCount = 9) {
  const errors = [];
  if (!command || typeof command !== "object" || Array.isArray(command)) return {valid: false, errors: ["command must be an object"]};
  if (!commandTypes.has(command.type)) errors.push("type is unknown");
  if (command.type === "NAVIGATE" && !screenValues.has(command.screen)) errors.push("screen is invalid");
  if (command.type === "SELECT_CITY" && (typeof command.city !== "string" || command.city.length < 1 || command.city.length > 64)) errors.push("city is invalid");
  if (command.type === "SELECT_SPEAKER" && (typeof command.speaker !== "string" || command.speaker.length < 1 || command.speaker.length > 96)) errors.push("speaker is invalid");
  if (command.type === "SELECT_STATION" && (!Number.isInteger(command.index) || command.index < 0 || command.index >= stationCount)) errors.push("station index is invalid");
  if (command.type === "SET_LOCALE" && !["pl", "en"].includes(command.locale)) errors.push("locale is invalid");
  if (command.type === "SET_VOLUME" && !Number.isInteger(command.volume)) errors.push("volume must be an integer");
  if (command.type === "SET_BRIGHTNESS" && !Number.isInteger(command.brightness)) errors.push("brightness must be an integer");
  if (command.type === "SET_THEME" && !["dark", "light"].includes(command.theme)) errors.push("theme is invalid");
  const allowedKeys = {
    SELECT_CITY: ["type", "city"], SELECT_SPEAKER: ["type", "speaker"],
    NAVIGATE: ["type", "screen"], SELECT_STATION: ["type", "index"],
    SET_LOCALE: ["type", "locale"], SET_VOLUME: ["type", "volume"],
    SET_BRIGHTNESS: ["type", "brightness"], SET_THEME: ["type", "theme"]
  }[command.type] || ["type"];
  for (const key of Object.keys(command)) if (!allowedKeys.includes(key)) errors.push(`unexpected property: ${key}`);
  return {valid: errors.length === 0, errors};
}

export function validateUiSnapshot(snapshot) {
  const errors = [];
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return {valid: false, errors: ["snapshot must be an object"]};
  if (snapshot.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!screenValues.has(snapshot.screen)) errors.push("screen is invalid");
  if (!systemStateValues.has(snapshot.systemState)) errors.push("systemState is invalid");
  if (!reasonValues.has(snapshot.recoveryReason)) errors.push("recoveryReason is invalid");
  if (!["OFFLINE", "ONLINE"].includes(snapshot.wifi)) errors.push("wifi is invalid");
  if (!["DISCONNECTED", "CONNECTED"].includes(snapshot.bluetooth)) errors.push("bluetooth is invalid");
  if (!["LOCAL", "BT"].includes(snapshot.output)) errors.push("output is invalid");
  if (!["pl", "en"].includes(snapshot.locale)) errors.push("locale is invalid");
  if (typeof snapshot.city !== "string" || snapshot.city.length < 1 || snapshot.city.length > 64) errors.push("city is invalid");
  if (snapshot.speaker !== null && (typeof snapshot.speaker !== "string" || snapshot.speaker.length > 96)) errors.push("speaker is invalid");
  if (!Number.isInteger(snapshot.stationIndex) || snapshot.stationIndex < 0 || snapshot.stationIndex >= 9) errors.push("stationIndex is invalid");
  if (!Number.isInteger(snapshot.requestedStationIndex) || snapshot.requestedStationIndex < 0 || snapshot.requestedStationIndex >= 9) errors.push("requestedStationIndex is invalid");
  if (!Number.isInteger(snapshot.volume) || snapshot.volume < 0 || snapshot.volume > 100) errors.push("volume is invalid");
  if (!Number.isInteger(snapshot.brightness) || snapshot.brightness < 0 || snapshot.brightness > 100) errors.push("brightness is invalid");
  if (!["dark", "light"].includes(snapshot.theme)) errors.push("theme is invalid");
  if (typeof snapshot.setupComplete !== "boolean") errors.push("setupComplete is invalid");
  if (snapshot.statusMessage !== null && typeof snapshot.statusMessage !== "string") errors.push("statusMessage is invalid");
  if (!snapshot.diagnostics || typeof snapshot.diagnostics !== "object") errors.push("diagnostics are missing");
  else for (const key of ["recoveries", "underruns", "minimumHeapKb"]) if (!Number.isInteger(snapshot.diagnostics[key]) || snapshot.diagnostics[key] < 0) errors.push(`diagnostics.${key} is invalid`);
  if (!snapshot.copy || typeof snapshot.copy !== "object") errors.push("copy is missing");
  if (!Array.isArray(snapshot.stations) || snapshot.stations.length !== 9) errors.push("stations must contain nine entries");
  return {valid: errors.length === 0, errors};
}
