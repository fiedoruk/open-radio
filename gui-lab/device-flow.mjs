import {DisplayOffDelays, ScreensaverDelays, ScreensaverModes, nextBoundedValue} from "../display/display-policy.mjs";

const settingsScreens = ["settings-quick", "settings-system", "settings-display"];
const homeScreen = state => `now-playing-${state.variant}`;
const isHome = screen => screen.startsWith("now-playing-");
const isScreensaver = screen => screen.startsWith("screensaver-");
const bluetoothReference = candidate => `bt:${candidate.toLowerCase()
  .normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "speaker"}`;

export class DeviceFlow {
  constructor({config, stationIds, stationTransports, tracks, nowMs = 0, saveSettings = () => {}}) {
    this.stationIds = stationIds;
    this.stationTransports = stationTransports;
    this.tracks = tracks;
    this.saveSettings = saveSettings;
    const stationIndex = Math.max(0, stationIds.indexOf(config.preferredStationId));
    this.state = {
      screen: config.onboardingComplete === false
        ? "wifi-status"
        : stationTransports[stationIndex] === "MP3"
          ? `now-playing-${config.nowPlayingVariant}`
          : "unsupported",
      returnScreen: `now-playing-${config.nowPlayingVariant}`,
      theme: config.theme,
      locale: config.locale,
      variant: config.nowPlayingVariant,
      stationIndex,
      volume: config.volume,
      brightness: config.brightness,
      onboardingComplete: config.onboardingComplete ?? true,
      bluetoothDeviceRef: config.bluetoothDeviceRef ?? null,
      wifiOnline: config.wifiOnline ?? true,
      wifiPortalActive: false,
      bluetoothState: config.bluetoothDeviceRef ? "connected" : "idle",
      bluetoothCandidate: "",
      display: structuredClone(config.display),
      confirmDelete: false,
      previewScreensaver: false,
      animationFrame: 0,
      nowPlayingTitle: tracks[stationIndex] ?? "",
    };
    this.connectivityAction = null;
    this.lastInteractionMs = nowMs;
    this.lastAnimationMs = nowMs;
  }

  currentTrack() {
    return this.state.nowPlayingTitle;
  }

  setNowPlayingTitle(title) {
    this.state.nowPlayingTitle = typeof title === "string" ? title : "";
  }

  tap(x, y, nowMs) {
    if (this.wakeDisplay(nowMs)) return true;
    const state = this.state;
    if (x >= 268 && y < 48 && !isHome(state.screen)) return this.back();
    if (isHome(state.screen)) this.tapNowPlaying(x, y);
    else if (state.screen === "stations") this.tapStations(x, y);
    else if (state.screen === "volume-control") this.tapVolume(x, y);
    else if (state.screen === "brightness-control") this.tapBrightness(x, y);
    else if (state.screen.startsWith("settings-")) this.tapSettings(x, y);
    else if (state.screen === "wifi-status" && y >= 184) {
      if (state.onboardingComplete) this.toggleWifiPortal(x);
      else if (x >= 104) {
        if (state.wifiOnline) this.setScreen("market");
      } else this.toggleLocale();
    }
    else if (state.screen === "market" && y >= 184) this.setScreen(x < 104 ? "wifi-status" : "bluetooth-pairing");
    else if (state.screen === "bluetooth-pairing") this.tapBluetooth(x, y);
    else if (state.screen === "about" && y >= 184) this.setScreen("diagnostics");
    else if (state.screen === "diagnostics" && y >= 184) this.setScreen(homeScreen(state));
    else if (state.screen === "unsupported" && y >= 184) this.setScreen("stations");
    else if (state.screen === "safe-mode" && y >= 184) this.setScreen("diagnostics");
    return true;
  }

  hold(x, y, nowMs) {
    if (this.wakeDisplay(nowMs)) return true;
    // A long press only wakes the screen; there is nothing left to save.
    return true;
  }

  hardwareButton(button, nowMs) {
    if (this.wakeDisplay(nowMs)) return true;
    // Mirrors UiController: the picker is touch-only, projected taps would
    // land in the third tile row.
    if (this.state.screen === "stations") return true;
    const projectedX = button === "a" ? 40 : button === "b" ? 160 : button === "c" ? 280 : null;
    if (projectedX === null) return false;
    if (isHome(this.state.screen) && this.state.variant === "glance") this.activateTransport(projectedX);
    else this.tap(projectedX, 210, nowMs);
    return true;
  }

  swipe(startX, deltaX, deltaY, nowMs) {
    if (this.wakeDisplay(nowMs)) return true;
    if (Math.abs(deltaX) < 28 || Math.abs(deltaX) < Math.abs(deltaY)) return false;
    const state = this.state;
    if (startX <= 24 && deltaX > 0) this.back();
    else if (isHome(state.screen)) this.changeStation(deltaX < 0 ? 1 : -1);
    else if (state.screen.startsWith("settings-")) {
      const next = (settingsScreens.indexOf(state.screen) + (deltaX < 0 ? 1 : -1) + settingsScreens.length) % settingsScreens.length;
      this.setScreen(settingsScreens[next]);
    }
    return true;
  }

  tick(nowMs, animationAllowed = true) {
    const state = this.state;
    const idle = Math.max(0, nowMs - this.lastInteractionMs);
    if (state.screen !== "display-off" && state.display.displayOffEnabled && idle >= state.display.displayOffDelaySeconds * 1000) {
      state.screen = "display-off";
      state.previewScreensaver = false;
      return true;
    }
    if (!isScreensaver(state.screen) && state.screen !== "display-off" && state.display.screensaverEnabled && idle >= state.display.screensaverDelaySeconds * 1000) {
      state.screen = `screensaver-${state.display.screensaverMode}`;
      state.previewScreensaver = false;
      this.lastAnimationMs = nowMs;
      return true;
    }
    if (isScreensaver(state.screen) && animationAllowed && nowMs - this.lastAnimationMs >= 83) {
      this.lastAnimationMs = nowMs;
      state.animationFrame = (state.animationFrame + 1) & 0xff;
      return true;
    }
    return false;
  }

  snapshot() {
    const state = this.state;
    return {
      screen: isHome(state.screen) ? "now-playing" : isScreensaver(state.screen) ? "screensaver" : state.screen,
      stationIndex: state.stationIndex,
      volume: state.volume,
      brightness: state.brightness,
      onboardingComplete: state.onboardingComplete,
      bluetoothRemembered: state.bluetoothDeviceRef !== null,
      wifiPortalActive: state.wifiPortalActive,
      bluetoothState: state.bluetoothState,
      bluetoothCandidate: state.bluetoothCandidate,
      theme: state.theme,
      locale: state.locale,
      variant: state.variant,
      screensaverEnabled: state.display.screensaverEnabled,
      screensaverMode: state.display.screensaverMode,
      screensaverDelaySeconds: state.display.screensaverDelaySeconds,
      displayOffEnabled: state.display.displayOffEnabled,
      displayOffDelaySeconds: state.display.displayOffDelaySeconds,
      confirmDelete: state.confirmDelete,
      animationFrame: state.animationFrame
    };
  }

  wakeDisplay(nowMs) {
    this.lastInteractionMs = nowMs;
    const state = this.state;
    if (state.screen !== "display-off" && !isScreensaver(state.screen)) return false;
    this.setScreen(state.previewScreensaver ? "settings-display" : homeScreen(state));
    state.previewScreensaver = false;
    return true;
  }

  setScreen(screen) {
    const state = this.state;
    if (state.screen === screen) return false;
    if (!isScreensaver(screen) && screen !== "display-off") state.returnScreen = state.screen;
    state.screen = screen;
    state.confirmDelete = false;
    return true;
  }

  back() {
    const state = this.state;
    if (isHome(state.screen)) return false;
    if (["stations", ...settingsScreens].includes(state.screen)) return this.setScreen(homeScreen(state));
    return this.setScreen(state.returnScreen === state.screen ? homeScreen(state) : state.returnScreen);
  }


  activateTransport(x) {
    if (x < 64) this.changeStation(-1);
    else if (x < 256) this.setScreen("stations");
    else this.changeStation(1);
  }

  tapNowPlaying(x, y) {
    const state = this.state;
    const settingsTop = state.variant === "glance" ? 8 : 34;
    if (x >= 268 && x < 312 && y >= settingsTop && y < settingsTop + 44) this.setScreen("settings-quick");
    else if (state.variant === "editorial" && x >= 244 && x < 320 && y >= 0 && y < 44) this.setScreen("volume-control");
    else if (y >= 184 && y < 240) this.activateTransport(x);
  }

  tapVolume(x, y) {
    const state = this.state;
    if (x >= 20 && x < 300 && y >= 78 && y < 150) this.setVolume(Math.trunc((x - 24) * 100 / 272));
    else if (y >= 184 && x < 96) this.setVolume(state.volume - 10);
    else if (y >= 184 && x >= 224) this.setVolume(state.volume + 10);
    else if (y >= 184) this.back();
  }

  tapBrightness(x, y) {
    const state = this.state;
    if (x >= 20 && x < 300 && y >= 78 && y < 150) this.setBrightness(Math.trunc((x - 24) * 100 / 272));
    else if (y >= 184 && x < 96) this.setBrightness(state.brightness - 10);
    else if (y >= 184 && x >= 224) this.setBrightness(state.brightness + 10);
    else if (y >= 184) this.back();
  }

  tapStations(x, y) {
    if (x < 52 || x >= 268 || y < 12 || y >= 228) return;
    const index = Math.floor((y - 12) / 72) * 3 + Math.floor((x - 52) / 72);
    if (index >= 0 && index < this.stationIds.length) this.selectStation(index);
  }


  tapSettings(x, y) {
    if (y >= 184) {
      const page = Math.max(0, Math.min(2, Math.trunc((x - 8) / 104)));
      this.setScreen(settingsScreens[page]);
      return;
    }
    if (y < 48 || y >= 180) return;
    const index = Math.floor((y - 48) / 44) * 2 + (x < 160 ? 0 : 1);
    if (this.state.screen === "settings-quick") this.activateQuick(index);
    else if (this.state.screen === "settings-system") this.activateSystem(index);
    else this.activateDisplay(index);
  }

  tapBluetooth(x, y) {
    const state = this.state;
    if (state.onboardingComplete) {
      if (y >= 184 && !["scanning", "connecting"].includes(state.bluetoothState)) this.requestBluetoothScan();
      return;
    }
    if (y < 184) return;
    state.onboardingComplete = true;
    if (x >= 104) {
      this.saveSettings({onboardingComplete: true});
      this.requestBluetoothScan();
      return;
    }
    state.bluetoothDeviceRef = null;
    this.saveSettings({onboardingComplete: true, bluetoothDeviceRef: null});
    this.setScreen(homeScreen(state));
  }

  toggleWifiPortal(x = 160) {
    if (!this.state.wifiPortalActive) {
      this.state.wifiPortalActive = true;
      this.connectivityAction = {type: "wifi-portal", active: true};
    } else if (x < 160) {
      this.connectivityAction = {type: "wifi-portal-restart"};
    } else if (this.state.wifiOnline) {
      this.state.wifiPortalActive = false;
      this.connectivityAction = {type: "wifi-portal", active: false};
    } else return false;
    return true;
  }

  requestBluetoothScan() {
    this.state.bluetoothState = "scanning";
    this.state.bluetoothCandidate = "";
    this.connectivityAction = {type: "bluetooth-scan"};
  }

  startAutomaticConnectivity() {
    const state = this.state;
    if (!state.onboardingComplete || !state.wifiOnline ||
        state.bluetoothDeviceRef !== null ||
        ["scanning", "connecting", "connected"].includes(state.bluetoothState)) {
      return false;
    }
    this.requestBluetoothScan();
    return true;
  }

  setBluetoothState(status, candidate = "") {
    if (!["idle", "scanning", "found", "connecting", "connected", "error"].includes(status)) return false;
    this.state.bluetoothState = status;
    this.state.bluetoothCandidate = candidate.slice(0, 32);
    if (status === "connected" && this.state.bluetoothCandidate.trim() !== "") {
      this.state.bluetoothDeviceRef = bluetoothReference(this.state.bluetoothCandidate);
      this.saveSettings({bluetoothDeviceRef: this.state.bluetoothDeviceRef});
    }
    return true;
  }

  consumeConnectivityAction() {
    const action = this.connectivityAction;
    this.connectivityAction = null;
    return action;
  }

  activateQuick(index) {
    const state = this.state;
    if (index === 0) this.setScreen("wifi-status");
    else if (index === 1) this.setScreen("bluetooth-pairing");
    else if (index === 2) this.setScreen("volume-control");
    else if (index === 3) this.setScreen("brightness-control");
    else if (index === 4) {
      state.theme = state.theme === "dark" ? "light" : "dark";
      this.saveSettings({theme: state.theme});
    } else if (index === 5) this.toggleLocale();
  }

  activateSystem(index) {
    const state = this.state;
    if (index === 0) {
      state.variant = state.variant === "editorial" ? "glance" : "editorial";
      this.saveSettings({nowPlayingVariant: state.variant});
    } else if (index === 1) this.setScreen("wifi-status");
    else if (index === 2) this.setScreen("about");
    else if (index === 3) this.setScreen("diagnostics");
    else if (index === 4) {
      if (!state.confirmDelete) state.confirmDelete = true;
      else this.connectivityAction = {type: "secure-reset"};
    } else if (index === 5) {
      // Mirrors UiController: the console tile requests the browser window
      // and lands on the Wi-Fi screen where the address is shown.
      this.connectivityAction = {type: "console-session"};
      this.setScreen("wifi-status");
    }
  }

  activateDisplay(index) {
    const state = this.state;
    if (index === 0) state.display.screensaverEnabled = !state.display.screensaverEnabled;
    else if (index === 1) state.display.screensaverDelaySeconds = nextBoundedValue(ScreensaverDelays, state.display.screensaverDelaySeconds);
    else if (index === 2) state.display.screensaverMode = nextBoundedValue(ScreensaverModes, state.display.screensaverMode);
    else if (index === 3) state.display.displayOffEnabled = !state.display.displayOffEnabled;
    else if (index === 4) state.display.displayOffDelaySeconds = nextBoundedValue(DisplayOffDelays, state.display.displayOffDelaySeconds);
    else if (index === 5) {
      state.previewScreensaver = true;
      state.screen = `screensaver-${state.display.screensaverMode}`;
      state.animationFrame = 0;
      return;
    }
    this.saveSettings({display: state.display});
  }

  changeStation(delta) {
    const state = this.state;
    const index = (state.stationIndex + delta + this.stationIds.length) % this.stationIds.length;
    state.stationIndex = index;
    state.nowPlayingTitle = "";
    this.saveSettings({preferredStationId: this.stationIds[index]});
    if (this.stationTransports[index] !== "MP3") this.setScreen("unsupported");
  }

  selectStation(index) {
    this.state.stationIndex = index;
    this.state.nowPlayingTitle = "";
    this.saveSettings({preferredStationId: this.stationIds[index]});
    this.setScreen(this.stationTransports[index] === "MP3" ? homeScreen(this.state) : "unsupported");
  }

  toggleLocale() {
    this.state.locale = this.state.locale === "pl" ? "en" : "pl";
    this.saveSettings({locale: this.state.locale});
  }

  setVolume(value) {
    const volume = Math.max(0, Math.min(100, value));
    if (this.state.volume === volume) return;
    this.state.volume = volume;
    this.saveSettings({volume});
  }

  setBrightness(value) {
    const brightness = Math.max(0, Math.min(100, value));
    if (this.state.brightness === brightness) return;
    this.state.brightness = brightness;
    this.saveSettings({brightness});
  }



}
