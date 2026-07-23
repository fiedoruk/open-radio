#pragma once

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <cstring>

#include "open_radio/service_contracts.hpp"

namespace open_radio {

// Capacity of the on-screen now-playing title, sanitised from ICY metadata.
constexpr std::size_t kNowPlayingTitleBytes = 193;
constexpr std::size_t kBluetoothNameBytes = 33;

struct UiControllerUpdate {
  bool dirty = false;
  bool configChanged = false;
  bool stationChanged = false;
  bool wifiPortalToggleRequested = false;
  bool wifiPortalRestartRequested = false;
  bool bluetoothScanRequested = false;
  bool consoleSessionRequested = false;
  bool consoleSessionEndRequested = false;
  bool secureResetRequested = false;
  bool noiseModeRequested = false;
  bool radioModeRequested = false;
  bool noisePlaybackChanged = false;
  bool noiseColorChanged = false;
};

class UiController {
 public:
  UiController() = default;

  void begin(const DeviceConfigDto& config, RuntimeState runtime,
             OutputKind output, std::uint64_t nowMs) {
    config_ = config;
    runtime_ = runtime;
    output_ = output;
    screen_ = !config.onboardingComplete ||
                      runtime == RuntimeState::ConfigRequired
                  ? Screen::Wifi
                  : runtime == RuntimeState::SafeMode ? Screen::SafeMode
                                                      : Screen::NowPlaying;
    returnScreen_ = Screen::NowPlaying;
    lastInteractionMs_ = nowMs;
    lastAnimationMs_ = nowMs;
    pending_ = {};
    wifiOnline_ = config.onboardingComplete;
    wifiPortalActive_ = false;
    bluetoothState_ = config.bluetoothRemembered
                          ? BluetoothUiState::Connected
                          : BluetoothUiState::Idle;
    bluetoothCandidate_.fill(0);
    noiseMode_ = false;
    noisePlaying_ = false;
    noiseColor_ = NoiseColor::White;
    pending_.dirty = true;
  }

  const DeviceConfigDto& config() const { return config_; }
  Screen screen() const { return screen_; }
  RuntimeState runtime() const { return runtime_; }
  OutputKind output() const { return output_; }
  std::uint8_t stationIndex() const { return config_.preferredStationIndex; }
  std::uint8_t animationFrame() const { return animationFrame_; }
  bool confirmDelete() const { return confirmDelete_; }
  const char* nowPlayingTitle() const { return metadata_.data(); }
  bool metadataAvailable() const { return metadata_[0] != '\0'; }
  bool wifiOnline() const { return wifiOnline_; }
  bool wifiPortalActive() const { return wifiPortalActive_; }
  BluetoothUiState bluetoothState() const { return bluetoothState_; }
  const char* bluetoothCandidate() const { return bluetoothCandidate_.data(); }
  bool noiseMode() const { return noiseMode_; }
  bool noisePlaying() const { return noisePlaying_; }
  NoiseColor noiseColor() const { return noiseColor_; }

  void restoreNoiseState(NoiseColor color, bool resumeMode) {
    noiseColor_ = validNoiseColor(color) ? color : NoiseColor::White;
    noiseMode_ = resumeMode && config_.onboardingComplete;
    noisePlaying_ = noiseMode_;
    if (noiseMode_) {
      screen_ = Screen::Noise;
      returnScreen_ = Screen::NowPlaying;
    }
    markDirty();
  }
  void setWifiPortalActive(bool active) {
    if (wifiPortalActive_ == active) return;
    wifiPortalActive_ = active;
    markDirty();
  }

  void setWifiOnline(bool online) {
    if (wifiOnline_ == online) return;
    wifiOnline_ = online;
    markDirty();
  }

  void setBluetoothState(BluetoothUiState state, const char* candidate = nullptr) {
    std::array<char, kBluetoothNameBytes> sanitized{};
    sanitizeBounded(candidate, sanitized);
    if (bluetoothState_ == state && bluetoothCandidate_ == sanitized) return;
    bluetoothState_ = state;
    bluetoothCandidate_ = sanitized;
    markDirty();
  }

  void completeNetworkOnboarding() {
    config_.wifiProfiles[0] = NetworkProfileRef::Home;
    config_.wifiProfileCount = 1;
    config_.onboardingComplete = true;
    pending_.configChanged = true;
    markDirty();
  }

  void requireNetworkOnboarding() {
    const bool configChanged = config_.onboardingComplete ||
                               config_.wifiProfileCount != 0;
    config_.wifiProfileCount = 0;
    config_.onboardingComplete = false;
    screen_ = Screen::Wifi;
    if (configChanged) pending_.configChanged = true;
    markDirty();
  }

  void rememberBluetooth() {
    if (config_.bluetoothRemembered) return;
    config_.bluetoothRemembered = true;
    pending_.configChanged = true;
    markDirty();
  }

  void forgetBluetooth() {
    if (config_.bluetoothRemembered) {
      config_.bluetoothRemembered = false;
      pending_.configChanged = true;
      markDirty();
    }
    setBluetoothState(BluetoothUiState::Idle);
  }


  void setConsoleActive(bool active) {
    if (consoleActive_ == active) return;
    consoleActive_ = active;
    markDirty();
  }

  void setRuntime(RuntimeState runtime, OutputKind output) {
    if (runtime_ == runtime && output_ == output) return;
    runtime_ = runtime;
    output_ = output;
    if (runtime == RuntimeState::SafeMode) screen_ = Screen::SafeMode;
    else if (runtime == RuntimeState::UnsupportedStation) screen_ = Screen::Unsupported;
    else if (runtime == RuntimeState::ConfigRequired) screen_ = Screen::Wifi;
    markDirty();
  }

  void setNowPlayingTitle(const char* title) {
    std::array<char, kNowPlayingTitleBytes> sanitized{};
    sanitize(title, sanitized);
    if (std::strncmp(metadata_.data(), sanitized.data(), metadata_.size()) == 0) {
      return;
    }
    metadata_ = sanitized;
    markDirty();
  }

  void tap(std::int16_t x, std::int16_t y, std::uint64_t nowMs) {
    if (wakeDisplay(nowMs)) return;
    if (x >= 268 && y < 48 && screen_ != Screen::NowPlaying) {
      back();
      return;
    }
    dispatchTap(x, y);
  }

  void hold(std::int16_t, std::int16_t, std::uint64_t nowMs) {
    // A long press only wakes the display; there is nothing to save any more.
    wakeDisplay(nowMs);
  }

  void drag(std::int16_t x, std::int16_t y, std::uint64_t nowMs) {
    lastInteractionMs_ = nowMs;
    if (!inside(x, y, 20, 78, 280, 72)) return;
    const int value = percentAt(x);
    if (screen_ == Screen::Volume) setVolume(value, false);
    else if (screen_ == Screen::Brightness) setBrightness(value, false);
  }

  bool release(std::int16_t x, std::int16_t y, std::uint64_t nowMs) {
    lastInteractionMs_ = nowMs;
    if (!inside(x, y, 20, 78, 280, 72)) return false;
    const int value = percentAt(x);
    if (screen_ == Screen::Volume) setVolume(value, true);
    else if (screen_ == Screen::Brightness) setBrightness(value, true);
    else return false;
    return true;
  }

  void hardwareButton(HardwareButton button, std::uint64_t nowMs) {
    if (wakeDisplay(nowMs)) return;
    if (screen_ == Screen::Noise) {
      if (button == HardwareButton::A) changeNoiseColor(-1);
      else if (button == HardwareButton::B) returnToRadio();
      else changeNoiseColor(1);
      return;
    }
    // The picker is touch-only: the projected tap at y=210 would land in the
    // third tile row and select a station the owner never pointed at.
    if (screen_ == Screen::Stations) return;
    const std::int16_t projectedX =
        button == HardwareButton::A ? 40
                                    : button == HardwareButton::B ? 160 : 280;
    if (screen_ == Screen::NowPlaying &&
        config_.nowPlayingVariant == NowPlayingVariant::Glance) {
      activateTransport(projectedX);
      return;
    }
    dispatchTap(projectedX, 210);
  }

  void swipe(std::int16_t startX, std::int16_t deltaX,
             std::int16_t deltaY, std::uint64_t nowMs) {
    if (wakeDisplay(nowMs)) return;
    if (std::abs(deltaX) < 28 || std::abs(deltaX) < std::abs(deltaY)) return;
    if (startX <= 24 && deltaX > 0) {
      back();
      return;
    }
    if (screen_ == Screen::NowPlaying) {
      changeStation(deltaX < 0 ? 1 : -1);
    } else if (screen_ == Screen::SettingsQuick ||
               screen_ == Screen::SettingsSystem ||
               screen_ == Screen::SettingsDisplay) {
      changeSettingsPage(deltaX < 0 ? 1 : -1);
    }
  }

  void tick(std::uint64_t nowMs, bool animationAllowed) {
    const std::uint64_t idle = nowMs >= lastInteractionMs_ ? nowMs - lastInteractionMs_ : 0;
    if (screen_ != Screen::DisplayOff && config_.displayOffEnabled &&
        idle >= static_cast<std::uint64_t>(config_.displayOffDelaySeconds) * 1000U) {
      screen_ = Screen::DisplayOff;
      previewScreensaver_ = false;
      markDirty();
      return;
    }
    if (screen_ != Screen::Screensaver && screen_ != Screen::DisplayOff &&
        config_.screensaverEnabled &&
        idle >= static_cast<std::uint64_t>(config_.screensaverDelaySeconds) * 1000U) {
      screen_ = Screen::Screensaver;
      previewScreensaver_ = false;
      lastAnimationMs_ = nowMs;
      markDirty();
      return;
    }
    if (screen_ == Screen::Screensaver && animationAllowed &&
        nowMs - lastAnimationMs_ >= 83U) {
      lastAnimationMs_ = nowMs;
      ++animationFrame_;
      markDirty();
    }
  }

  UiControllerUpdate takeUpdate() {
    const auto update = pending_;
    pending_ = {};
    return update;
  }

 private:
  static bool inside(std::int16_t x, std::int16_t y, int left, int top,
                     int width, int height) {
    return x >= left && y >= top && x < left + width && y < top + height;
  }

  static bool validNoiseColor(NoiseColor color) {
    return color == NoiseColor::White || color == NoiseColor::Pink ||
           color == NoiseColor::Brown;
  }

  static void sanitize(const char* source,
                       std::array<char, kNowPlayingTitleBytes>& destination) {
    destination.fill(0);
    if (source == nullptr) return;
    std::size_t written = 0;
    bool previousSpace = true;
    for (const auto* cursor = reinterpret_cast<const unsigned char*>(source);
         *cursor != 0U && written + 1 < destination.size(); ++cursor) {
      unsigned char value = *cursor;
      if (value < 0x20U || value == 0x7fU) value = ' ';
      if (value == ' ') {
        if (previousSpace) continue;
        previousSpace = true;
      } else {
        previousSpace = false;
      }
      destination[written++] = static_cast<char>(value);
    }
    while (written > 0 && destination[written - 1] == ' ') --written;
    std::size_t continuation_start = written;
    while (continuation_start > 0 &&
           (static_cast<unsigned char>(destination[continuation_start - 1]) &
            0xc0U) == 0x80U) {
      --continuation_start;
    }
    if (continuation_start < written && continuation_start > 0) {
      const auto lead = static_cast<unsigned char>(destination[continuation_start - 1]);
      const std::size_t expected = (lead & 0xe0U) == 0xc0U
                                       ? 2
                                       : (lead & 0xf0U) == 0xe0U
                                             ? 3
                                             : (lead & 0xf8U) == 0xf0U ? 4 : 1;
      const std::size_t actual = written - (continuation_start - 1);
      if (actual < expected) written = continuation_start - 1;
    }
    destination[written] = '\0';
  }

  template <std::size_t Size>
  static void sanitizeBounded(const char* source,
                              std::array<char, Size>& destination) {
    destination.fill(0);
    if (source == nullptr) return;
    std::size_t written = 0;
    for (const auto* cursor = reinterpret_cast<const unsigned char*>(source);
         *cursor != 0U && written + 1 < destination.size(); ++cursor) {
      const unsigned char value = *cursor;
      destination[written++] = value >= 0x20U && value != 0x7fU
                                   ? static_cast<char>(value)
                                   : ' ';
    }
    destination[written] = '\0';
  }

  bool wakeDisplay(std::uint64_t nowMs) {
    lastInteractionMs_ = nowMs;
    if (screen_ != Screen::DisplayOff && screen_ != Screen::Screensaver) {
      return false;
    }
    setScreen(previewScreensaver_ ? Screen::SettingsDisplay
                                  : noiseMode_ ? Screen::Noise
                                               : Screen::NowPlaying);
    previewScreensaver_ = false;
    return true;
  }

  void markDirty() { pending_.dirty = true; }

  void setScreen(Screen screen) {
    if (screen_ == screen) return;
    if (screen != Screen::Screensaver && screen != Screen::DisplayOff) {
      returnScreen_ = screen_;
    }
    screen_ = screen;
    confirmDelete_ = false;
    markDirty();
  }

  void back() {
    if (screen_ == Screen::NowPlaying) return;
    if (screen_ == Screen::Noise) {
      returnToRadio();
      return;
    }
    if (screen_ == Screen::Stations ||
        screen_ == Screen::SettingsQuick || screen_ == Screen::SettingsSystem ||
        screen_ == Screen::SettingsDisplay) {
      setScreen(Screen::NowPlaying);
    } else {
      setScreen(returnScreen_ == screen_ ? Screen::NowPlaying : returnScreen_);
    }
  }


  void dispatchTap(std::int16_t x, std::int16_t y) {
    switch (screen_) {
      case Screen::NowPlaying:
        tapNowPlaying(x, y);
        break;
      case Screen::Stations:
        tapStations(x, y);
        break;
      case Screen::Volume:
        tapVolume(x, y);
        break;
      case Screen::Brightness:
        tapBrightness(x, y);
        break;
      case Screen::SettingsQuick:
      case Screen::SettingsSystem:
      case Screen::SettingsDisplay:
        tapSettings(x, y);
        break;
      case Screen::Noise:
        tapNoise(x, y);
        break;
      case Screen::Wifi:
        if (consoleActive_ && !wifiPortalActive_ && y >= 184) {
          // The console screen's bottom button closes the session. With the
          // portal active the renderer shows the PORTAL controls, so the tap
          // must keep meaning what the screen shows.
          pending_.consoleSessionEndRequested = true;
          markDirty();
          break;
        }
        if (config_.onboardingComplete && y >= 184) {
          if (!wifiPortalActive_) {
            wifiPortalActive_ = true;
            pending_.wifiPortalToggleRequested = true;
          } else if (x < 160) {
            pending_.wifiPortalRestartRequested = true;
          } else if (wifiOnline_) {
            wifiPortalActive_ = false;
            pending_.wifiPortalToggleRequested = true;
          }
          markDirty();
        } else if (y >= 184 && x >= 104) {
          // Wi-Fi is the only mandatory onboarding gate. Do not allow touch or
          // the projected B/C hardware buttons to skip it while offline.
          if (wifiOnline_) setScreen(Screen::City);
        } else if (y >= 184) {
          toggleLocale();
        }
        break;
      case Screen::City:
        if (y >= 184 && x < 104) setScreen(Screen::Wifi);
        else if (y >= 184) setScreen(Screen::Bluetooth);
        break;
      case Screen::Bluetooth:
        if (config_.onboardingComplete) {
          if (y >= 184 && bluetoothState_ != BluetoothUiState::Scanning &&
              bluetoothState_ != BluetoothUiState::Connecting) {
            setBluetoothState(BluetoothUiState::Scanning);
            pending_.bluetoothScanRequested = true;
          }
        } else if (y >= 184 && x >= 104) {
          config_.onboardingComplete = true;
          configChanged();
          setBluetoothState(BluetoothUiState::Scanning);
          pending_.bluetoothScanRequested = true;
        } else if (y >= 184) {
          config_.onboardingComplete = true;
          config_.bluetoothRemembered = false;
          configChanged();
          setScreen(Screen::NowPlaying);
        }
        break;
      case Screen::About:
        if (y >= 184) setScreen(Screen::Diagnostics);
        break;
      case Screen::Diagnostics:
      case Screen::Unsupported:
      case Screen::SafeMode:
        if (y >= 184) setScreen(screen_ == Screen::Unsupported
                                    ? Screen::Stations
                                    : screen_ == Screen::SafeMode
                                          ? Screen::Diagnostics
                                          : Screen::NowPlaying);
        break;
      default:
        if (y >= 184) setScreen(Screen::NowPlaying);
        break;
    }
  }

  void activateTransport(std::int16_t x) {
    if (x < 64) changeStation(-1);
    else if (x < 256) setScreen(Screen::Stations);
    else changeStation(1);
  }

  void tapNowPlaying(std::int16_t x, std::int16_t y) {
    if (inside(x, y, 268,
               config_.nowPlayingVariant == NowPlayingVariant::Glance ? 8 : 34,
               44, 44)) {
      setScreen(Screen::SettingsQuick);
    } else if (config_.nowPlayingVariant == NowPlayingVariant::Editorial &&
               inside(x, y, 244, 0, 76, 44)) {
      setScreen(Screen::Volume);
    } else if (config_.nowPlayingVariant == NowPlayingVariant::Glance &&
               inside(x, y, 170, 86, 142, 33)) {
      setScreen(Screen::Bluetooth);
    } else if (config_.nowPlayingVariant == NowPlayingVariant::Glance &&
               inside(x, y, 170, 119, 142, 47)) {
      setScreen(Screen::Volume);
    } else if (config_.nowPlayingVariant == NowPlayingVariant::Editorial &&
               inside(x, y, 122, 150, 190, 28)) {
      setScreen(Screen::Bluetooth);
    } else if (y >= 184) {
      activateTransport(x);
    }
  }

  void tapVolume(std::int16_t x, std::int16_t y) {
    if (inside(x, y, 20, 78, 280, 72)) {
      setVolume(percentAt(x), true);
    } else if (y >= 184 && x < 96) {
      setVolume(static_cast<int>(config_.volume) - 10);
    } else if (y >= 184 && x >= 224) {
      setVolume(static_cast<int>(config_.volume) + 10);
    } else if (y >= 184) {
      back();
    }
  }

  void tapBrightness(std::int16_t x, std::int16_t y) {
    if (inside(x, y, 20, 78, 280, 72)) {
      setBrightness(percentAt(x), true);
    } else if (y >= 184 && x < 96) {
      setBrightness(static_cast<int>(config_.brightness) - 10, true);
    } else if (y >= 184 && x >= 224) {
      setBrightness(static_cast<int>(config_.brightness) + 10, true);
    } else if (y >= 184) {
      back();
    }
  }

  void tapStations(std::int16_t x, std::int16_t y) {
    // Centred 3x3 grid of 72 px cells from origin (52, 12) — the renderer
    // draws 64 px tiles 4 px inside each cell.
    if (x < 52 || x >= 268 || y < 12 || y >= 228) return;
    const int column = (x - 52) / 72;
    const int row = (y - 12) / 72;
    const int index = row * 3 + column;
    if (index >= 0 && index < 9) {
      config_.preferredStationIndex = static_cast<std::uint8_t>(index);
      // ICY metadata belongs to the stream that emitted it. Never keep the
      // previous station's title visible while the new stream connects.
      metadata_.fill(0);
      pending_.configChanged = true;
      pending_.stationChanged = true;
      markDirty();
      setScreen(Screen::NowPlaying);
    }
  }


  void tapSettings(std::int16_t x, std::int16_t y) {
    if (inside(x, y, 216, 2, 44, 44)) {
      openNoise();
      return;
    }
    if (y >= 184) {
      const int page = std::clamp<int>((x - 8) / 104, 0, 2);
      setScreen(page == 0 ? Screen::SettingsQuick
                          : page == 1 ? Screen::SettingsSystem
                                      : Screen::SettingsDisplay);
      return;
    }
    if (y < 48 || y >= 180) return;
    const int column = x < 160 ? 0 : 1;
    const int row = (y - 48) / 44;
    const int index = row * 2 + column;
    if (screen_ == Screen::SettingsQuick) activateQuick(index);
    else if (screen_ == Screen::SettingsSystem) activateSystem(index);
    else activateDisplay(index);
  }

  void tapNoise(std::int16_t x, std::int16_t y) {
    if (inside(x, y, 108, 50, 104, 104)) {
      noisePlaying_ = !noisePlaying_;
      pending_.noisePlaybackChanged = true;
      markDirty();
      return;
    }
    if (inside(x, y, 8, 166, 96, 40)) selectNoiseColor(NoiseColor::White);
    else if (inside(x, y, 112, 166, 96, 40)) {
      selectNoiseColor(NoiseColor::Pink);
    } else if (inside(x, y, 216, 166, 96, 40)) {
      selectNoiseColor(NoiseColor::Brown);
    }
  }

  void openNoise() {
    noiseMode_ = true;
    noisePlaying_ = true;
    pending_.noiseModeRequested = true;
    pending_.noisePlaybackChanged = true;
    setScreen(Screen::Noise);
  }

  void returnToRadio() {
    noiseMode_ = false;
    noisePlaying_ = false;
    pending_.radioModeRequested = true;
    pending_.noisePlaybackChanged = true;
    setScreen(Screen::NowPlaying);
  }

  void selectNoiseColor(NoiseColor color) {
    if (!validNoiseColor(color) || noiseColor_ == color) return;
    noiseColor_ = color;
    pending_.noiseColorChanged = true;
    markDirty();
  }

  void changeNoiseColor(int delta) {
    const int current = static_cast<int>(noiseColor_);
    selectNoiseColor(static_cast<NoiseColor>((current + delta + 3) % 3));
  }

  void activateQuick(int index) {
    if (index == 0) setScreen(Screen::Wifi);
    else if (index == 1) setScreen(Screen::Bluetooth);
    else if (index == 2) setScreen(Screen::Volume);
    else if (index == 3) setScreen(Screen::Brightness);
    else if (index == 4) config_.theme = config_.theme == DisplayTheme::Dark
                                             ? DisplayTheme::Light
                                             : DisplayTheme::Dark;
    else if (index == 5) toggleLocale();
    if (index >= 4) configChanged();
  }

  void activateSystem(int index) {
    if (index == 0) {
      config_.nowPlayingVariant =
          config_.nowPlayingVariant == NowPlayingVariant::Editorial
              ? NowPlayingVariant::Glance
              : NowPlayingVariant::Editorial;
      configChanged();
    } else if (index == 1) setScreen(Screen::Wifi);
    else if (index == 2) setScreen(Screen::About);
    else if (index == 3) setScreen(Screen::Diagnostics);
    else if (index == 4) {
      if (!confirmDelete_) {
        confirmDelete_ = true;
        markDirty();
      } else {
        pending_.secureResetRequested = true;
        markDirty();
      }
    } else if (index == 5) {
      // Console session: the firmware opens the 15-minute browser window and
      // the Wi-Fi screen shows the address to type.
      pending_.consoleSessionRequested = true;
      setScreen(Screen::Wifi);
    }
  }

  void activateDisplay(int index) {
    if (index == 0) config_.screensaverEnabled = !config_.screensaverEnabled;
    else if (index == 1) {
      constexpr std::array<std::uint16_t, 5> values{{30, 60, 120, 300, 600}};
      config_.screensaverDelaySeconds = nextValue(values, config_.screensaverDelaySeconds);
    } else if (index == 2) {
      config_.screensaverMode =
          config_.screensaverMode == ScreensaverMode::Pulse
              ? ScreensaverMode::Bars
              : config_.screensaverMode == ScreensaverMode::Bars
                    ? ScreensaverMode::Orbit
                    : config_.screensaverMode == ScreensaverMode::Orbit
                          ? ScreensaverMode::Cat
                          : ScreensaverMode::Pulse;
    } else if (index == 3) config_.displayOffEnabled = !config_.displayOffEnabled;
    else if (index == 4) {
      constexpr std::array<std::uint16_t, 3> values{{900, 1800, 3600}};
      config_.displayOffDelaySeconds = nextValue(values, config_.displayOffDelaySeconds);
    } else if (index == 5) {
      previewScreensaver_ = true;
      screen_ = Screen::Screensaver;
      animationFrame_ = 0;
      markDirty();
      return;
    }
    configChanged();
  }

  void changeStation(int delta) {
    const int current = config_.preferredStationIndex;
    config_.preferredStationIndex = static_cast<std::uint8_t>((current + delta + 9) % 9);
    metadata_.fill(0);
    pending_.configChanged = true;
    pending_.stationChanged = true;
    markDirty();
  }

  void changeSettingsPage(int delta) {
    int page = screen_ == Screen::SettingsQuick
                   ? 0
                   : screen_ == Screen::SettingsSystem ? 1 : 2;
    page = (page + delta + 3) % 3;
    setScreen(page == 0 ? Screen::SettingsQuick
                        : page == 1 ? Screen::SettingsSystem
                                    : Screen::SettingsDisplay);
  }


  void toggleLocale() {
    config_.locale = config_.locale == Locale::Pl ? Locale::En : Locale::Pl;
    configChanged();
  }

  void configChanged() {
    pending_.configChanged = true;
    markDirty();
  }

  static int percentAt(std::int16_t x) {
    return std::clamp<int>((x - 24) * 100 / 272, 0, 100);
  }

  void setVolume(int value, bool persist = true) {
    const auto clamped = static_cast<std::uint8_t>(std::clamp(value, 0, 100));
    if (config_.volume != clamped) {
      config_.volume = clamped;
      markDirty();
    }
    if (persist) configChanged();
  }

  void setBrightness(int value, bool persist = true) {
    const auto clamped = static_cast<std::uint8_t>(std::clamp(value, 0, 100));
    if (config_.brightness != clamped) {
      config_.brightness = clamped;
      markDirty();
    }
    if (persist) configChanged();
  }




  template <std::size_t Size>
  static std::uint16_t nextValue(const std::array<std::uint16_t, Size>& values,
                                 std::uint16_t current) {
    for (std::size_t index = 0; index < values.size(); ++index) {
      if (values[index] == current) return values[(index + 1) % values.size()];
    }
    return values[0];
  }

  DeviceConfigDto config_{};
  RuntimeState runtime_ = RuntimeState::ConfigRequired;
  OutputKind output_ = OutputKind::LocalSpeaker;
  Screen screen_ = Screen::Wifi;
  Screen returnScreen_ = Screen::NowPlaying;
  std::array<char, kNowPlayingTitleBytes> metadata_{};
  std::uint8_t animationFrame_ = 0;
  bool confirmDelete_ = false;
  bool previewScreensaver_ = false;
  bool wifiOnline_ = false;
  bool wifiPortalActive_ = false;
  bool consoleActive_ = false;
  BluetoothUiState bluetoothState_ = BluetoothUiState::Idle;
  std::array<char, kBluetoothNameBytes> bluetoothCandidate_{};
  NoiseColor noiseColor_ = NoiseColor::White;
  bool noiseMode_ = false;
  bool noisePlaying_ = false;
  std::uint64_t lastInteractionMs_ = 0;
  std::uint64_t lastAnimationMs_ = 0;
  UiControllerUpdate pending_{};
};

}  // namespace open_radio
