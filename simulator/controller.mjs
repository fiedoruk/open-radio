import {createInitialState, reduceState} from "./state-machine.mjs";
import {createUiSnapshot, validateUiCommand, validateUiSnapshot} from "./ui-contract.mjs";

export function createUiController({catalog, dictionaries, configured = false, settingsStore = null, onChange = () => {}}) {
  const storedConfig = settingsStore?.load() ?? null;
  const storedStationIndex = storedConfig === null
    ? 0
    : Math.max(0, catalog.stations.findIndex(station => station.id === storedConfig.preferredStationId));
  let state = createInitialState({
    configured,
    preferences: storedConfig === null ? {} : {
      locale: storedConfig.locale,
      stationIndex: storedStationIndex,
      volume: storedConfig.volume,
      brightness: storedConfig.brightness,
      theme: storedConfig.theme
    }
  });

  function persist(command) {
    if (settingsStore === null) return;
    if (command.type === "SET_LOCALE") settingsStore.save({locale: state.locale});
    else if (command.type === "SET_VOLUME") settingsStore.save({volume: state.volume});
    else if (command.type === "SET_BRIGHTNESS") settingsStore.save({brightness: state.brightness});
    else if (command.type === "SET_THEME") settingsStore.save({theme: state.theme});
    else if (["NEXT_STATION", "PREVIOUS_STATION", "SELECT_STATION"].includes(command.type)) {
      settingsStore.save({preferredStationId: catalog.stations[state.requestedStationIndex].id});
    }
  }

  function snapshot() {
    const value = createUiSnapshot(state, catalog, dictionaries);
    const validation = validateUiSnapshot(value);
    if (!validation.valid) throw new Error(`Invalid UiSnapshot: ${validation.errors.join(", ")}`);
    return value;
  }

  function dispatch(command) {
    const validation = validateUiCommand(command, catalog.stations.length);
    if (!validation.valid) throw new Error(`Rejected UiCommand: ${validation.errors.join(", ")}`);
    state = reduceState(state, command, catalog.stations);
    persist(command);
    const value = snapshot();
    onChange(value);
    return value;
  }

  function projectRuntime(runtimeSnapshot, ingressSnapshot = null) {
    state = reduceState(state, {type: "RUNTIME_SNAPSHOT", snapshot: runtimeSnapshot, ingressSnapshot}, catalog.stations);
    const value = snapshot();
    onChange(value);
    return value;
  }

  return Object.freeze({snapshot, dispatch, projectRuntime});
}
