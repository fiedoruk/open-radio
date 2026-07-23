export const Screens = Object.freeze({
  WIFI: "WIFI",
  CITY: "CITY",
  FIRST_SOUND: "FIRST_SOUND",
  BLUETOOTH: "BLUETOOTH",
  NOW_PLAYING: "NOW_PLAYING",
  STATIONS: "STATIONS",
  SETTINGS: "SETTINGS",
  ABOUT: "ABOUT",
  DIAGNOSTICS: "DIAGNOSTICS"
});

export const SystemStates = Object.freeze({
  CONFIG_REQUIRED: "CONFIG_REQUIRED",
  PLAYING: "PLAYING",
  RECOVERING: "RECOVERING",
  DEGRADED_PLAYING: "DEGRADED_PLAYING",
  UNSUPPORTED_STATION: "UNSUPPORTED_STATION",
  SAFE_MODE: "SAFE_MODE"
});

export function applyRuntimeSnapshot(state, snapshot, ingressSnapshot = null) {
  const statusMessage = snapshot.state === SystemStates.SAFE_MODE
    ? "SAFE_MODE"
    : snapshot.recoveryReason === "WIFI"
      ? "WIFI_LOST"
      : snapshot.recoveryReason === "BLUETOOTH"
        ? "BT_FALLBACK"
        : snapshot.recoveryReason === "STREAM"
          ? "STATION_FALLBACK"
          : null;
  return {
    ...state,
    screen: snapshot.state === SystemStates.CONFIG_REQUIRED
      ? Screens.WIFI
      : snapshot.state === SystemStates.SAFE_MODE
        ? Screens.DIAGNOSTICS
        : state.screen,
    systemState: snapshot.state,
    recoveryReason: snapshot.recoveryReason,
    wifi: snapshot.wifiConnected ? "ONLINE" : "OFFLINE",
    bluetooth: snapshot.bluetoothConnected ? "CONNECTED" : "DISCONNECTED",
    output: snapshot.output,
    setupComplete: snapshot.state !== SystemStates.CONFIG_REQUIRED,
    statusMessage,
    diagnostics: {
      ...state.diagnostics,
      recoveries: snapshot.counters.recoveries,
      ...(ingressSnapshot ? {
        ingressRejected: ingressSnapshot.counters.mailboxOverflows +
          ingressSnapshot.counters.invalidFacts + ingressSnapshot.counters.duplicateFacts +
          ingressSnapshot.counters.staleFacts + ingressSnapshot.counters.staleEpochs +
          ingressSnapshot.counters.backwardTicks + ingressSnapshot.counters.contentionDrops +
          ingressSnapshot.counters.deliveryRejected,
        ingressMailboxDepth: ingressSnapshot.mailboxDepth,
        ingressMaximumDepth: ingressSnapshot.counters.maximumMailboxDepth,
        ingressRollovers: ingressSnapshot.counters.rollovers
      } : {})
    }
  };
}

export function createInitialState({configured = false, preferences = {}} = {}) {
  return {
    screen: configured ? Screens.NOW_PLAYING : Screens.WIFI,
    systemState: configured ? SystemStates.PLAYING : SystemStates.CONFIG_REQUIRED,
    recoveryReason: "NONE",
    wifi: configured ? "ONLINE" : "OFFLINE",
    bluetooth: "DISCONNECTED",
    output: "LOCAL",
    locale: preferences.locale ?? "pl",
    city: preferences.city ?? "AUTO",
    speaker: null,
    stationIndex: preferences.stationIndex ?? 0,
    requestedStationIndex: preferences.stationIndex ?? 0,
    volume: preferences.volume ?? 15,
    brightness: preferences.brightness ?? 75,
    theme: preferences.theme ?? "dark",
    setupComplete: configured,
    statusMessage: null,
    diagnostics: {
      recoveries: 0,
      underruns: 0,
      minimumHeapKb: 0,
      ingressRejected: 0,
      ingressMailboxDepth: 0,
      ingressMaximumDepth: 0,
      ingressRollovers: 0
    }
  };
}

function stationCount(stationsOrCount) {
  return Array.isArray(stationsOrCount) ? stationsOrCount.length : stationsOrCount;
}

function stationIsSupported(index, stationsOrCount) {
  if (!Array.isArray(stationsOrCount)) return true;
  return stationsOrCount[index]?.transport === "MP3";
}

function nextSupportedStation(startIndex, direction, stationsOrCount) {
  const count = stationCount(stationsOrCount);
  for (let offset = 1; offset <= count; offset += 1) {
    const index = (startIndex + direction * offset + count) % count;
    if (stationIsSupported(index, stationsOrCount)) return index;
  }
  return startIndex;
}

function restoredPlaybackState(state, stationsOrCount) {
  return stationIsSupported(state.requestedStationIndex, stationsOrCount)
    ? {systemState: SystemStates.PLAYING, recoveryReason: "NONE", statusMessage: null}
    : {systemState: SystemStates.UNSUPPORTED_STATION, recoveryReason: "STREAM", statusMessage: "UNSUPPORTED_STATION"};
}

export function reduceState(state, event, stationsOrCount = 9) {
  switch (event.type) {
    case "WIFI_CONFIGURED":
      return {...state, screen: Screens.FIRST_SOUND, city: "Białystok · AUTO", systemState: SystemStates.PLAYING, wifi: "ONLINE", output: "LOCAL", statusMessage: "FIRST_SOUND"};
    case "CONTINUE_ONBOARDING":
      return {...state, screen: Screens.BLUETOOTH, statusMessage: null};
    case "SELECT_CITY":
      return {...state, city: event.city, screen: state.setupComplete ? Screens.SETTINGS : Screens.BLUETOOTH};
    case "SKIP_CITY":
      return {...state, city: "Cała Polska", screen: state.setupComplete ? Screens.SETTINGS : Screens.BLUETOOTH};
    case "SELECT_SPEAKER":
      return {...state, speaker: event.speaker, bluetooth: "CONNECTED", output: "BT", screen: state.setupComplete ? Screens.SETTINGS : Screens.NOW_PLAYING, setupComplete: true, statusMessage: null};
    case "SKIP_BLUETOOTH":
      return {...state, speaker: null, bluetooth: "DISCONNECTED", output: "LOCAL", screen: state.setupComplete ? Screens.SETTINGS : Screens.NOW_PLAYING, setupComplete: true, statusMessage: null};
    case "NAVIGATE":
      return {...state, screen: event.screen, statusMessage: null};
    case "NEXT_STATION": {
      const stationIndex = nextSupportedStation(state.requestedStationIndex, 1, stationsOrCount);
      return {...state, stationIndex, requestedStationIndex: stationIndex, systemState: SystemStates.PLAYING, recoveryReason: "NONE", statusMessage: null};
    }
    case "PREVIOUS_STATION": {
      const stationIndex = nextSupportedStation(state.requestedStationIndex, -1, stationsOrCount);
      return {...state, stationIndex, requestedStationIndex: stationIndex, systemState: SystemStates.PLAYING, recoveryReason: "NONE", statusMessage: null};
    }
    case "SELECT_STATION": {
      const supported = stationIsSupported(event.index, stationsOrCount);
      return {...state, stationIndex: event.index, requestedStationIndex: event.index, screen: Screens.NOW_PLAYING, systemState: supported ? SystemStates.PLAYING : SystemStates.UNSUPPORTED_STATION, recoveryReason: supported ? "NONE" : "STREAM", statusMessage: supported ? null : "UNSUPPORTED_STATION"};
    }
    case "SET_LOCALE":
      return {...state, locale: event.locale};
    case "SET_VOLUME":
      return {...state, volume: Math.max(0, Math.min(100, event.volume))};
    case "SET_BRIGHTNESS":
      return {...state, brightness: Math.max(0, Math.min(100, event.brightness))};
    case "SET_THEME":
      return {...state, theme: event.theme};
    case "WIFI_LOST":
      return {...state, wifi: "OFFLINE", systemState: SystemStates.RECOVERING, recoveryReason: "WIFI", statusMessage: "WIFI_LOST", diagnostics: {...state.diagnostics, recoveries: state.diagnostics.recoveries + 1}};
    case "WIFI_RECOVERED":
      return {...state, wifi: "ONLINE", ...restoredPlaybackState(state, stationsOrCount)};
    case "BLUETOOTH_LOST":
      return state.speaker || state.output === "BT" || state.bluetooth === "CONNECTED"
        ? {...state, bluetooth: "DISCONNECTED", output: "LOCAL", systemState: SystemStates.DEGRADED_PLAYING, recoveryReason: "BLUETOOTH", statusMessage: "BT_FALLBACK", diagnostics: {...state.diagnostics, recoveries: state.diagnostics.recoveries + 1}}
        : state;
    case "BLUETOOTH_RECOVERED":
      return state.speaker ? {...state, bluetooth: "CONNECTED", output: "BT", ...restoredPlaybackState(state, stationsOrCount)} : state;
    case "STATION_FAILED":
      return {...state, stationIndex: nextSupportedStation(state.requestedStationIndex, 1, stationsOrCount), systemState: SystemStates.DEGRADED_PLAYING, recoveryReason: "STREAM", statusMessage: "STATION_FALLBACK", diagnostics: {...state.diagnostics, recoveries: state.diagnostics.recoveries + 1}};
    case "STATION_RECOVERED":
      return stationIsSupported(state.requestedStationIndex, stationsOrCount)
        ? {...state, stationIndex: state.requestedStationIndex, systemState: SystemStates.PLAYING, recoveryReason: "NONE", statusMessage: null}
        : {...state, stationIndex: state.requestedStationIndex, systemState: SystemStates.UNSUPPORTED_STATION, recoveryReason: "STREAM", statusMessage: "UNSUPPORTED_STATION"};
    case "ENTER_SAFE_MODE":
      return {...state, screen: Screens.DIAGNOSTICS, wifi: "OFFLINE", bluetooth: "DISCONNECTED", speaker: null, output: "LOCAL", systemState: SystemStates.SAFE_MODE, recoveryReason: "MEMORY", setupComplete: false, statusMessage: "SAFE_MODE"};
    case "RUNTIME_SNAPSHOT":
      return applyRuntimeSnapshot(state, event.snapshot, event.ingressSnapshot);
    case "RESET_SIMULATOR":
      return createInitialState();
    case "LOAD_READY":
      return createInitialState({configured: true});
    default:
      return state;
  }
}
