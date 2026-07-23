#include <cstdint>
#include <iostream>
#include <sstream>
#include <string>

#include "open_radio/service_adapters.hpp"
#include "open_radio/ui_controller.hpp"

namespace {

const char* screenName(open_radio::Screen screen) {
  switch (screen) {
    case open_radio::Screen::Wifi: return "wifi-status";
    case open_radio::Screen::City: return "market";
    case open_radio::Screen::Bluetooth: return "bluetooth-pairing";
    case open_radio::Screen::NowPlaying: return "now-playing";
    case open_radio::Screen::Stations: return "stations";
    case open_radio::Screen::Volume: return "volume-control";
    case open_radio::Screen::Brightness: return "brightness-control";
    case open_radio::Screen::SettingsQuick: return "settings-quick";
    case open_radio::Screen::SettingsSystem: return "settings-system";
    case open_radio::Screen::SettingsDisplay: return "settings-display";
    case open_radio::Screen::Noise: return "noise";
    case open_radio::Screen::About: return "about";
    case open_radio::Screen::Diagnostics: return "diagnostics";
    case open_radio::Screen::Screensaver: return "screensaver";
    case open_radio::Screen::DisplayOff: return "display-off";
    case open_radio::Screen::Unsupported: return "unsupported";
    case open_radio::Screen::SafeMode: return "safe-mode";
  }
  return "invalid";
}

const char* themeName(open_radio::DisplayTheme theme) {
  return theme == open_radio::DisplayTheme::Light ? "light" : "dark";
}

const char* localeName(open_radio::Locale locale) {
  return locale == open_radio::Locale::En ? "en" : "pl";
}

const char* variantName(open_radio::NowPlayingVariant variant) {
  return variant == open_radio::NowPlayingVariant::Glance ? "glance" : "editorial";
}

const char* screensaverName(open_radio::ScreensaverMode mode) {
  switch (mode) {
    case open_radio::ScreensaverMode::Bars: return "bars";
    case open_radio::ScreensaverMode::Orbit: return "orbit";
    case open_radio::ScreensaverMode::Cat: return "cat";
    default: return "pulse";
  }
}

const char* bluetoothStatusName(open_radio::BluetoothUiState status) {
  switch (status) {
    case open_radio::BluetoothUiState::Scanning: return "scanning";
    case open_radio::BluetoothUiState::Found: return "found";
    case open_radio::BluetoothUiState::Connecting: return "connecting";
    case open_radio::BluetoothUiState::Connected: return "connected";
    case open_radio::BluetoothUiState::Error: return "error";
    default: return "idle";
  }
}

void printSnapshot(const open_radio::UiController& controller) {
  const auto& config = controller.config();
  std::cout << "{\"screen\":\"" << screenName(controller.screen())
            << "\",\"stationIndex\":" << static_cast<int>(controller.stationIndex())
            << ",\"volume\":" << static_cast<int>(config.volume)
            << ",\"brightness\":" << static_cast<int>(config.brightness)
            << ",\"onboardingComplete\":" << (config.onboardingComplete ? "true" : "false")
            << ",\"bluetoothRemembered\":" << (config.bluetoothRemembered ? "true" : "false")
            << ",\"wifiPortalActive\":" << (controller.wifiPortalActive() ? "true" : "false")
            << ",\"bluetoothState\":\"" << bluetoothStatusName(controller.bluetoothState()) << "\""
            << ",\"bluetoothCandidate\":\"" << controller.bluetoothCandidate() << "\""
            << ",\"theme\":\"" << themeName(config.theme)
            << "\",\"locale\":\"" << localeName(config.locale)
            << "\",\"variant\":\"" << variantName(config.nowPlayingVariant)
            << "\",\"screensaverEnabled\":" << (config.screensaverEnabled ? "true" : "false")
            << ",\"screensaverMode\":\"" << screensaverName(config.screensaverMode)
            << "\",\"screensaverDelaySeconds\":" << config.screensaverDelaySeconds
            << ",\"displayOffEnabled\":" << (config.displayOffEnabled ? "true" : "false")
            << ",\"displayOffDelaySeconds\":" << config.displayOffDelaySeconds;
  std::cout << ",\"confirmDelete\":" << (controller.confirmDelete() ? "true" : "false")
            << ",\"animationFrame\":" << static_cast<int>(controller.animationFrame())
            << "}\n";
}

open_radio::DisplayTheme parseTheme(const std::string& value) {
  return value == "light" ? open_radio::DisplayTheme::Light : open_radio::DisplayTheme::Dark;
}

open_radio::Locale parseLocale(const std::string& value) {
  return value == "en" ? open_radio::Locale::En : open_radio::Locale::Pl;
}

open_radio::NowPlayingVariant parseVariant(const std::string& value) {
  return value == "glance" ? open_radio::NowPlayingVariant::Glance : open_radio::NowPlayingVariant::Editorial;
}

open_radio::ScreensaverMode parseScreensaver(const std::string& value) {
  if (value == "bars") return open_radio::ScreensaverMode::Bars;
  if (value == "orbit") return open_radio::ScreensaverMode::Orbit;
  if (value == "cat") return open_radio::ScreensaverMode::Cat;
  return open_radio::ScreensaverMode::Pulse;
}

}  // namespace

int main() {
  open_radio::UiController controller;
  std::string supported = "111111111";
  bool begun = false;
  std::string line;
  while (std::getline(std::cin, line)) {
    if (line.empty()) continue;
    std::istringstream input(line);
    std::string command;
    input >> command;
    if (command == "begin") {
      auto config = open_radio::currentConfigA();
      std::string theme;
      std::string locale;
      std::string variant;
      std::string saverMode;
      int station = 0;
      int volume = 0;
      int brightness = 0;
      int saverEnabled = 0;
      int displayOffEnabled = 0;
      int onboardingComplete = 0;
      int bluetoothRemembered = 0;
      std::uint64_t nowMs = 0;
      input >> station >> volume >> brightness >> theme >> locale >> variant >> saverEnabled >> saverMode
            >> config.screensaverDelaySeconds >> displayOffEnabled >> config.displayOffDelaySeconds
            >> onboardingComplete >> bluetoothRemembered >> supported >> nowMs;
      if (!input || station < 0 || station >= 9) return 2;
      config.preferredStationIndex = static_cast<std::uint8_t>(station);
      config.volume = static_cast<std::uint8_t>(volume);
      config.brightness = static_cast<std::uint8_t>(brightness);
      config.theme = parseTheme(theme);
      config.locale = parseLocale(locale);
      config.nowPlayingVariant = parseVariant(variant);
      config.screensaverEnabled = saverEnabled != 0;
      config.screensaverMode = parseScreensaver(saverMode);
      config.displayOffEnabled = displayOffEnabled != 0;
      config.onboardingComplete = onboardingComplete != 0;
      config.bluetoothRemembered = bluetoothRemembered != 0;
      controller.begin(config, open_radio::RuntimeState::Playing, open_radio::OutputKind::LocalSpeaker, nowMs);
      if (supported[static_cast<std::size_t>(station)] == '0') {
        controller.setRuntime(open_radio::RuntimeState::UnsupportedStation, open_radio::OutputKind::LocalSpeaker);
      }
      begun = true;
    } else if (!begun) {
      return 2;
    } else if (command == "title") {
      std::string title;
      std::getline(input >> std::ws, title);
      controller.setNowPlayingTitle(title.c_str());
    } else if (command == "tap" || command == "hold") {
      int x = 0;
      int y = 0;
      std::uint64_t nowMs = 0;
      input >> x >> y >> nowMs;
      if (!input) return 2;
      const auto previousStation = controller.stationIndex();
      if (command == "tap") controller.tap(x, y, nowMs);
      else controller.hold(x, y, nowMs);
      if (controller.stationIndex() != previousStation) {
        const bool isSupported = supported[controller.stationIndex()] != '0';
        controller.setRuntime(isSupported ? open_radio::RuntimeState::Playing : open_radio::RuntimeState::UnsupportedStation,
                              open_radio::OutputKind::LocalSpeaker);
      }
    } else if (command == "swipe") {
      int startX = 0;
      int deltaX = 0;
      int deltaY = 0;
      std::uint64_t nowMs = 0;
      input >> startX >> deltaX >> deltaY >> nowMs;
      if (!input) return 2;
      const auto previousStation = controller.stationIndex();
      controller.swipe(startX, deltaX, deltaY, nowMs);
      if (controller.stationIndex() != previousStation) {
        const bool isSupported = supported[controller.stationIndex()] != '0';
        controller.setRuntime(isSupported ? open_radio::RuntimeState::Playing : open_radio::RuntimeState::UnsupportedStation,
                              open_radio::OutputKind::LocalSpeaker);
      }
    } else if (command == "tick") {
      std::uint64_t nowMs = 0;
      int animationAllowed = 0;
      input >> nowMs >> animationAllowed;
      if (!input) return 2;
      controller.tick(nowMs, animationAllowed != 0);
    } else if (command == "button") {
      std::string button;
      std::uint64_t nowMs = 0;
      input >> button >> nowMs;
      if (!input || (button != "a" && button != "b" && button != "c")) {
        return 2;
      }
      const auto previousStation = controller.stationIndex();
      controller.hardwareButton(
          button == "a" ? open_radio::HardwareButton::A
                         : button == "b" ? open_radio::HardwareButton::B
                                         : open_radio::HardwareButton::C,
          nowMs);
      if (controller.stationIndex() != previousStation) {
        const bool isSupported = supported[controller.stationIndex()] != '0';
        controller.setRuntime(
            isSupported ? open_radio::RuntimeState::Playing
                        : open_radio::RuntimeState::UnsupportedStation,
            open_radio::OutputKind::LocalSpeaker);
      }
    } else if (command == "bluetooth") {
      std::string status;
      std::string candidate;
      input >> status;
      std::getline(input >> std::ws, candidate);
      const auto state = status == "scanning"
                             ? open_radio::BluetoothUiState::Scanning
                             : status == "found"
                                   ? open_radio::BluetoothUiState::Found
                                   : status == "connecting"
                                         ? open_radio::BluetoothUiState::Connecting
                                         : status == "connected"
                                               ? open_radio::BluetoothUiState::Connected
                                               : status == "error"
                                                     ? open_radio::BluetoothUiState::Error
                                                     : open_radio::BluetoothUiState::Idle;
      controller.setBluetoothState(state, candidate.c_str());
      if (state == open_radio::BluetoothUiState::Connected) {
        controller.rememberBluetooth();
      }
    } else {
      return 2;
    }
    printSnapshot(controller);
  }
  return begun ? 0 : 2;
}
