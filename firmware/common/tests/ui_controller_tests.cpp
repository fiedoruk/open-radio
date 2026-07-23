#include <cassert>
#include <cstdio>
#include <cstring>

#include "open_radio/service_adapters.hpp"
#include "open_radio/ui_controller.hpp"

namespace {

void testNavigationAndSettings() {
  open_radio::UiController controller;
  controller.begin(open_radio::currentConfigA(), open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::LocalSpeaker, 0);
  assert(controller.screen() == open_radio::Screen::NowPlaying);
  controller.takeUpdate();

  controller.tap(260, 12, 10);
  assert(controller.screen() == open_radio::Screen::Volume);
  controller.tap(268, 210, 15);
  assert(controller.config().volume == 52);
  const auto volumeUpdate = controller.takeUpdate();
  assert(volumeUpdate.configChanged && volumeUpdate.dirty);
  controller.tap(160, 210, 18);
  assert(controller.screen() == open_radio::Screen::NowPlaying);

  controller.tap(280, 40, 20);
  assert(controller.screen() == open_radio::Screen::SettingsQuick);
  controller.tap(20, 100, 25);
  assert(controller.screen() == open_radio::Screen::Volume);
  controller.tap(160, 210, 28);
  assert(controller.screen() == open_radio::Screen::SettingsQuick);

  controller.tap(200, 100, 29);
  assert(controller.screen() == open_radio::Screen::Brightness);
  controller.drag(92, 126, 30);
  assert(controller.config().brightness == 25);
  assert(!controller.takeUpdate().configChanged);
  assert(controller.release(228, 126, 31));
  assert(controller.config().brightness == 75);
  assert(controller.takeUpdate().configChanged);
  controller.tap(160, 210, 32);
  assert(controller.screen() == open_radio::Screen::SettingsQuick);

  controller.swipe(100, -60, 2, 33);
  assert(controller.screen() == open_radio::Screen::SettingsSystem);
  controller.tap(20, 60, 40);
  assert(controller.config().nowPlayingVariant ==
         open_radio::NowPlayingVariant::Glance);
  controller.tap(280, 10, 50);
  assert(controller.screen() == open_radio::Screen::NowPlaying);
  controller.tap(250, 130, 55);
  assert(controller.screen() == open_radio::Screen::Volume);
  controller.drag(79, 110, 56);
  assert(controller.config().volume == 20);
  assert(controller.release(242, 110, 57));
  assert(controller.config().volume == 80);
}

void testNetworkAndDisplaySettingsShortcuts() {
  open_radio::UiController controller;
  controller.begin(open_radio::currentConfigA(), open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::LocalSpeaker, 0);
  controller.tap(280, 40, 10);
  controller.swipe(100, -60, 0, 20);
  controller.tap(200, 60, 30);
  assert(controller.screen() == open_radio::Screen::Wifi);
  controller.tap(280, 10, 35);
  assert(controller.screen() == open_radio::Screen::SettingsSystem);
  controller.tap(260, 210, 40);
  assert(controller.screen() == open_radio::Screen::SettingsDisplay);
}

void testSecureResetRequiresTwoTouches() {
  open_radio::UiController controller;
  controller.begin(open_radio::currentConfigA(), open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::LocalSpeaker, 0);
  controller.takeUpdate();
  controller.tap(280, 40, 10);
  controller.swipe(100, -60, 0, 20);
  assert(controller.screen() == open_radio::Screen::SettingsSystem);

  // index = row*2 + column; usuniecie kafla Ulubionych przesunelo bezpieczny
  // reset z indeksu 5 na 4, czyli z prawej kolumny do lewej
  controller.tap(100, 150, 30);
  auto update = controller.takeUpdate();
  assert(controller.confirmDelete());
  assert(!update.secureResetRequested);

  controller.tap(100, 150, 40);
  update = controller.takeUpdate();
  assert(update.secureResetRequested);
}

void testStationTapAndSwipe() {
  open_radio::UiController controller;
  controller.begin(open_radio::currentConfigA(), open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::LocalSpeaker, 0);
  controller.setNowPlayingTitle("Old station - Old title");
  controller.takeUpdate();
  controller.swipe(120, -50, 0, 10);
  assert(controller.stationIndex() == 1);
  assert(!controller.metadataAvailable());
  auto update = controller.takeUpdate();
  assert(update.stationChanged && update.configChanged);
  controller.setNowPlayingTitle("Second station - Current title");
  controller.tap(160, 210, 20);
  assert(controller.screen() == open_radio::Screen::Stations);
  controller.tap(220, 110, 30);
  assert(controller.stationIndex() == 5);
  assert(!controller.metadataAvailable());
  assert(controller.screen() == open_radio::Screen::NowPlaying);
}


void testMetadataSanitizationAndDeduplication() {
  open_radio::UiController controller;
  controller.begin(open_radio::currentConfigA(), open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::LocalSpeaker, 0);
  controller.setNowPlayingTitle("  Artist\n\t—  Title  ");
  assert(std::strcmp(controller.nowPlayingTitle(), "Artist — Title") == 0);
}

void testDisplayPolicyAndWake() {
  open_radio::UiController controller;
  auto config = open_radio::currentConfigA();
  config.screensaverDelaySeconds = 30;
  config.displayOffDelaySeconds = 900;
  controller.begin(config, open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::LocalSpeaker, 0);
  controller.takeUpdate();
  controller.tick(30000, true);
  assert(controller.screen() == open_radio::Screen::Screensaver);
  controller.tick(30100, true);
  assert(controller.animationFrame() == 1);
  controller.tick(900000, true);
  assert(controller.screen() == open_radio::Screen::DisplayOff);
  controller.swipe(120, -50, 0, 900010);
  assert(controller.screen() == open_radio::Screen::NowPlaying);
}

void testOnboardingActions() {
  open_radio::UiController controller;
  auto config = open_radio::currentConfigA();
  config.onboardingComplete = false;
  config.bluetoothRemembered = false;
  controller.begin(config, open_radio::RuntimeState::ConfigRequired,
                   open_radio::OutputKind::LocalSpeaker, 0);
  controller.tap(200, 210, 10);
  assert(controller.screen() == open_radio::Screen::Wifi);
  controller.hardwareButton(open_radio::HardwareButton::B, 15);
  assert(controller.screen() == open_radio::Screen::Wifi);
  controller.hardwareButton(open_radio::HardwareButton::C, 20);
  assert(controller.screen() == open_radio::Screen::Wifi);
  controller.setWifiOnline(true);
  controller.tap(200, 210, 25);
  assert(controller.screen() == open_radio::Screen::City);
  controller.tap(50, 210, 30);
  assert(controller.screen() == open_radio::Screen::Wifi);
  controller.tap(200, 210, 35);
  controller.tap(200, 210, 40);
  assert(controller.screen() == open_radio::Screen::Bluetooth);
  controller.tap(200, 210, 50);
  assert(controller.config().onboardingComplete);
  auto update = controller.takeUpdate();
  assert(update.bluetoothScanRequested);
  assert(controller.bluetoothState() == open_radio::BluetoothUiState::Scanning);
  assert(!controller.config().bluetoothRemembered);
  controller.setBluetoothState(open_radio::BluetoothUiState::Found,
                               "Xiaomi Sound Pocket");
  assert(!controller.config().bluetoothRemembered);
  controller.setBluetoothState(open_radio::BluetoothUiState::Connecting,
                               "Xiaomi Sound Pocket");
  assert(!controller.config().bluetoothRemembered);
  controller.setBluetoothState(open_radio::BluetoothUiState::Connected,
                               "Xiaomi Sound Pocket");
  controller.rememberBluetooth();
  assert(controller.config().bluetoothRemembered);
  assert(std::strcmp(controller.bluetoothCandidate(), "Xiaomi Sound Pocket") == 0);

  auto staleConfig = open_radio::currentConfigA();
  staleConfig.onboardingComplete = true;
  staleConfig.wifiProfileCount = 1;
  open_radio::UiController staleController;
  staleController.begin(staleConfig, open_radio::RuntimeState::Playing,
                        open_radio::OutputKind::LocalSpeaker, 0);
  staleController.requireNetworkOnboarding();
  assert(staleController.screen() == open_radio::Screen::Wifi);
  assert(!staleController.config().onboardingComplete);
  assert(staleController.config().wifiProfileCount == 0);
  assert(staleController.takeUpdate().configChanged);
}

void testConnectivityManagementActions() {
  open_radio::UiController controller;
  auto config = open_radio::currentConfigA();
  config.bluetoothRemembered = false;
  controller.begin(config, open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::LocalSpeaker, 0);
  controller.takeUpdate();
  controller.tap(280, 40, 10);
  controller.tap(20, 60, 20);
  controller.tap(160, 210, 30);
  auto update = controller.takeUpdate();
  assert(update.wifiPortalToggleRequested);
  assert(controller.wifiPortalActive());
  controller.setWifiOnline(false);
  controller.tap(80, 210, 35);
  update = controller.takeUpdate();
  assert(update.wifiPortalRestartRequested);
  assert(controller.wifiPortalActive());
  controller.tap(240, 210, 36);
  update = controller.takeUpdate();
  assert(!update.wifiPortalToggleRequested);
  assert(controller.wifiPortalActive());
  controller.setWifiOnline(true);
  controller.tap(240, 210, 37);
  update = controller.takeUpdate();
  assert(update.wifiPortalToggleRequested);
  assert(!controller.wifiPortalActive());
  controller.tap(280, 10, 40);
  controller.tap(200, 60, 50);
  controller.tap(160, 210, 60);
  update = controller.takeUpdate();
  assert(update.bluetoothScanRequested);
  assert(controller.bluetoothState() == open_radio::BluetoothUiState::Scanning);
}

void testHardwareButtons() {
  open_radio::UiController controller;
  controller.begin(open_radio::currentConfigA(), open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::LocalSpeaker, 0);
  controller.takeUpdate();
  controller.hardwareButton(open_radio::HardwareButton::C, 10);
  assert(controller.stationIndex() == 1);
  assert(controller.screen() == open_radio::Screen::NowPlaying);
  controller.hardwareButton(open_radio::HardwareButton::B, 20);
  assert(controller.screen() == open_radio::Screen::Stations);
  controller.hardwareButton(open_radio::HardwareButton::B, 30);
  assert(controller.screen() == open_radio::Screen::Stations);
  // button C maps to tap (280, 210); after the Favorites entry was removed
  // there is no hitbox there any more, so the screen does not change
  controller.hardwareButton(open_radio::HardwareButton::C, 40);
  assert(controller.screen() == open_radio::Screen::Stations);
  controller.hardwareButton(open_radio::HardwareButton::A, 50);
  assert(controller.screen() == open_radio::Screen::Stations);
  controller.tap(280, 10, 60);
  controller.tap(280, 40, 70);
  assert(controller.screen() == open_radio::Screen::SettingsQuick);
  controller.hardwareButton(open_radio::HardwareButton::B, 80);
  assert(controller.screen() == open_radio::Screen::SettingsSystem);
  controller.hardwareButton(open_radio::HardwareButton::C, 90);
  assert(controller.screen() == open_radio::Screen::SettingsDisplay);
  controller.hardwareButton(open_radio::HardwareButton::A, 100);
  assert(controller.screen() == open_radio::Screen::SettingsQuick);

  auto glanceConfig = open_radio::currentConfigA();
  glanceConfig.nowPlayingVariant = open_radio::NowPlayingVariant::Glance;
  open_radio::UiController glanceController;
  glanceController.begin(glanceConfig, open_radio::RuntimeState::Playing,
                         open_radio::OutputKind::LocalSpeaker, 0);
  glanceController.takeUpdate();
  glanceController.hardwareButton(open_radio::HardwareButton::C, 10);
  assert(glanceController.stationIndex() == 1);
  glanceController.hardwareButton(open_radio::HardwareButton::B, 20);
  assert(glanceController.screen() == open_radio::Screen::Stations);
  glanceController.tap(280, 10, 30);
  glanceController.hardwareButton(open_radio::HardwareButton::A, 40);
  assert(glanceController.stationIndex() == 0);

  open_radio::UiController bluetoothShortcutController;
  bluetoothShortcutController.begin(
      glanceConfig, open_radio::RuntimeState::Playing,
      open_radio::OutputKind::LocalSpeaker, 0);
  bluetoothShortcutController.takeUpdate();
  bluetoothShortcutController.tap(240, 100, 10);
  assert(bluetoothShortcutController.screen() == open_radio::Screen::Bluetooth);

  open_radio::UiController volumeShortcutController;
  volumeShortcutController.begin(glanceConfig,
                                 open_radio::RuntimeState::Playing,
                                 open_radio::OutputKind::LocalSpeaker, 0);
  volumeShortcutController.takeUpdate();
  volumeShortcutController.tap(240, 120, 10);
  assert(volumeShortcutController.screen() == open_radio::Screen::Volume);
}

void testNoiseModeFlow() {
  open_radio::UiController controller;
  controller.begin(open_radio::currentConfigA(), open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::Bluetooth, 0);
  controller.restoreNoiseState(open_radio::NoiseColor::Pink, false);
  controller.takeUpdate();

  controller.tap(280, 40, 10);
  assert(controller.screen() == open_radio::Screen::SettingsQuick);
  controller.tap(238, 20, 20);
  assert(controller.screen() == open_radio::Screen::Noise);
  assert(controller.noiseMode());
  assert(controller.noisePlaying());
  auto update = controller.takeUpdate();
  assert(update.noiseModeRequested && update.noisePlaybackChanged);

  controller.tap(160, 100, 30);
  assert(!controller.noisePlaying());
  assert(controller.takeUpdate().noisePlaybackChanged);
  controller.tap(160, 100, 40);
  assert(controller.noisePlaying());

  controller.tap(264, 180, 50);
  assert(controller.noiseColor() == open_radio::NoiseColor::Brown);
  assert(controller.takeUpdate().noiseColorChanged);
  controller.hardwareButton(open_radio::HardwareButton::A, 60);
  assert(controller.noiseColor() == open_radio::NoiseColor::Pink);
  controller.hardwareButton(open_radio::HardwareButton::C, 70);
  assert(controller.noiseColor() == open_radio::NoiseColor::Brown);

  controller.tick(120100, true);
  assert(controller.screen() == open_radio::Screen::Screensaver);
  controller.tap(120, 120, 120110);
  assert(controller.screen() == open_radio::Screen::Noise);
  controller.hardwareButton(open_radio::HardwareButton::B, 120120);
  assert(controller.screen() == open_radio::Screen::NowPlaying);
  assert(!controller.noiseMode());
  update = controller.takeUpdate();
  assert(update.radioModeRequested && update.noisePlaybackChanged);

  open_radio::UiController resumed;
  resumed.begin(open_radio::currentConfigA(), open_radio::RuntimeState::Playing,
                open_radio::OutputKind::LocalSpeaker, 0);
  resumed.restoreNoiseState(open_radio::NoiseColor::Brown, true);
  assert(resumed.screen() == open_radio::Screen::Noise);
  assert(resumed.noisePlaying());
  assert(resumed.noiseColor() == open_radio::NoiseColor::Brown);
}

void testNowPlayingTitleCapacityIsIndependentOfFavorites() {
  static_assert(open_radio::kNowPlayingTitleBytes == 193,
                "now-playing title must keep its 193-byte capacity");
  open_radio::UiController controller;
  controller.begin(open_radio::currentConfigA(), open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::LocalSpeaker, 0);
  std::array<char, 320> longTitle{};
  longTitle.fill('x');
  longTitle[319] = '\0';
  controller.setNowPlayingTitle(longTitle.data());
  assert(std::strlen(controller.nowPlayingTitle()) ==
         open_radio::kNowPlayingTitleBytes - 1);
}

void testUiControllerNeedsNoFavoriteRepository() {
  open_radio::UiController controller;
  controller.begin(open_radio::currentConfigA(), open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::LocalSpeaker, 0);
  controller.setNowPlayingTitle("Artist — Title");
  assert(controller.metadataAvailable());
  assert(controller.screen() == open_radio::Screen::NowPlaying);
  // former path 1: long-pressing the title only wakes the screen
  controller.hold(150, 100, 10);
  assert(controller.screen() == open_radio::Screen::NowPlaying);
  // former path 2: tapping the title no longer opens any save screen
  controller.tap(150, 100, 20);
  assert(controller.screen() == open_radio::Screen::NowPlaying);
}

}  // namespace

void testConsoleSessionTile() {
  open_radio::UiController controller;
  controller.begin(open_radio::currentConfigA(),
                   open_radio::RuntimeState::Playing,
                   open_radio::OutputKind::LocalSpeaker, 0);
  controller.takeUpdate();
  controller.tap(280, 40, 10);
  assert(controller.screen() == open_radio::Screen::SettingsQuick);
  controller.tap(160, 210, 20);
  assert(controller.screen() == open_radio::Screen::SettingsSystem);
  // Tile 5 (column 1, row 2) requests the console window and lands on the
  // Wi-Fi screen, where the device address is displayed.
  controller.tap(200, 150, 30);
  assert(controller.screen() == open_radio::Screen::Wifi);
  const auto update = controller.takeUpdate();
  assert(update.consoleSessionRequested);
  assert(!controller.takeUpdate().consoleSessionRequested);
  // While the session is open the bottom button on the console screen closes
  // it; once it is gone the same tap is the portal control again.
  controller.setConsoleActive(true);
  controller.tap(160, 210, 40);
  assert(controller.screen() == open_radio::Screen::Wifi);
  assert(controller.takeUpdate().consoleSessionEndRequested);
  controller.setConsoleActive(false);
  controller.tap(160, 210, 50);
  const auto portalUpdate = controller.takeUpdate();
  assert(!portalUpdate.consoleSessionEndRequested);
  assert(portalUpdate.wifiPortalToggleRequested);
}

int main() {
  testNavigationAndSettings();
  testNowPlayingTitleCapacityIsIndependentOfFavorites();
  testUiControllerNeedsNoFavoriteRepository();
  testStationTapAndSwipe();
  testMetadataSanitizationAndDeduplication();
  testDisplayPolicyAndWake();
  testOnboardingActions();
  testConnectivityManagementActions();
  testHardwareButtons();
  testNoiseModeFlow();
  testNetworkAndDisplaySettingsShortcuts();
  testSecureResetRequiresTwoTouches();
  testConsoleSessionTile();
  std::puts("PASS ui-controller-tests cases=14");
  return 0;
}
