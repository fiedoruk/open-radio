#include <algorithm>
#include <cstdint>
#include <iostream>
#include <limits>
#include <vector>

#include "fixture_now_playing.hpp"
#include "icon_masks.hpp"
#include "open_radio/renderer.hpp"
#include "ui_contract.hpp"

namespace {

int failures = 0;

void expect(bool condition, const char* message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

void testRgbPacking() {
  expect(open_radio::ui::rgb565(255, 0, 0) == 0xf800, "red RGB565");
  expect(open_radio::ui::rgb565(0, 255, 0) == 0x07e0, "green RGB565");
  expect(open_radio::ui::rgb565(0, 0, 255) == 0x001f, "blue RGB565");
}

void testClippingProtectsSentinels() {
  constexpr std::size_t guard = 16;
  constexpr int width = 8;
  constexpr int height = 6;
  constexpr std::uint16_t sentinel = 0xbeef;
  std::vector<std::uint16_t> memory(guard + width * height + guard, sentinel);
  open_radio::ui::FramebufferView framebuffer{memory.data() + guard,
                                               width * height, width, height};
  expect(open_radio::ui::fill(framebuffer, 0), "valid framebuffer fill");
  expect(open_radio::ui::fillRect(framebuffer, {-4, -3, 8, 7}, 0x1234),
         "clipped rectangle accepted");
  expect(std::all_of(memory.begin(), memory.begin() + guard,
                     [](auto value) { return value == sentinel; }),
         "leading guard intact");
  expect(std::all_of(memory.end() - guard, memory.end(),
                     [](auto value) { return value == sentinel; }),
         "trailing guard intact");
  expect(framebuffer.pixels[0] == 0x1234, "visible clipped region painted");
  expect(framebuffer.pixels[4] == 0, "outside clipped region unchanged");
  const auto visible_before = std::vector<std::uint16_t>(
      framebuffer.pixels, framebuffer.pixels + width * height);
  expect(open_radio::ui::fillRect(
             framebuffer,
             {std::numeric_limits<int>::max() - 2, 0, 10, 1}, 0xffff),
         "overflowing coordinate rectangle accepted as off-screen");
  expect(std::equal(visible_before.begin(), visible_before.end(),
                    framebuffer.pixels),
         "overflowing coordinate rectangle leaves pixels unchanged");
}

void testUndersizedBufferIsRejected() {
  std::vector<std::uint16_t> pixels(9, 0x7777);
  const auto before = pixels;
  open_radio::ui::FramebufferView framebuffer{pixels.data(), pixels.size(), 4, 4};
  expect(!open_radio::ui::isValid(framebuffer), "undersized buffer invalid");
  expect(!open_radio::ui::fill(framebuffer, 0), "undersized fill rejected");
  expect(pixels == before, "undersized buffer untouched");
}

void testRoundedRectanglePreservesCorners() {
  constexpr int width = 16;
  constexpr int height = 16;
  std::vector<std::uint16_t> pixels(width * height, 0);
  open_radio::ui::FramebufferView framebuffer{pixels.data(), pixels.size(),
                                               width, height};
  expect(open_radio::ui::fillRoundRect(framebuffer, {2, 2, 12, 12}, 4, 0x1234),
         "rounded rectangle succeeds");
  expect(pixels[2 + width * 2] == 0, "rounded corner stays clear");
  expect(pixels[8 + width * 8] == 0x1234, "rounded center is painted");
}

void testGeneratedIconMaskRenders() {
  constexpr int width = 24;
  constexpr int height = 24;
  std::vector<std::uint16_t> pixels(width * height, 0);
  open_radio::ui::FramebufferView framebuffer{pixels.data(), pixels.size(),
                                               width, height};
  expect(open_radio::ui::drawIconMask24(
             framebuffer, 0, 0,
             open_radio::ui::generated::kIconChevronRight, 0xffff),
         "generated icon mask succeeds");
  expect(std::count(pixels.begin(), pixels.end(), 0xffff) > 20,
         "generated icon mask paints pixels");
}

void testGeneratedThemeContract() {
  expect(open_radio::ui::generated::kDefaultTheme ==
             open_radio::ui::ThemeMode::dark,
         "dark theme is generated default");
  expect(open_radio::ui::generated::kDarkTheme.canvas !=
             open_radio::ui::generated::kLightTheme.canvas,
         "light and dark canvases differ");
}

void testInvalidStationIsRejected() {
  std::vector<std::uint16_t> pixels(
      static_cast<std::size_t>(open_radio::ui::generated::kWidth) *
          open_radio::ui::generated::kHeight,
      0x7777);
  const auto before = pixels;
  auto fixture = open_radio::ui::generated::kNowPlayingFixture;
  fixture.station_index = open_radio::ui::generated::kStations.size();
  open_radio::ui::FramebufferView framebuffer{
      pixels.data(), pixels.size(), open_radio::ui::generated::kWidth,
      open_radio::ui::generated::kHeight};
  const auto result = open_radio::ui::renderNowPlaying(
      framebuffer, fixture, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(result.status == open_radio::ui::RenderStatus::invalid_station,
         "invalid station status");
  expect(pixels == before, "invalid station leaves framebuffer untouched");
}

void testFontRendersAsciiAndPolishL() {
  constexpr int width = 96;
  constexpr int height = 32;
  std::vector<std::uint16_t> pixels(width * height, 0);
  open_radio::ui::FramebufferView framebuffer{pixels.data(), pixels.size(),
                                               width, height};
  const auto result = open_radio::ui::drawText(
      framebuffer, 0, 0, "A Ł", open_radio::ui::FontSize::title, 0xffff,
      width);
  expect(result.valid && !result.truncated, "Inter font render succeeds");
  expect(result.width == open_radio::ui::measureText(
                             "A Ł", open_radio::ui::FontSize::title),
         "Inter font uses generated metrics");
  expect(std::count_if(pixels.begin(), pixels.end(),
                       [](auto pixel) { return pixel != 0; }) > 80,
         "Inter ASCII and Polish glyphs paint antialiased pixels");
}

void testFontRendersPolishAlphabet() {
  constexpr int width = 300;
  constexpr int height = 24;
  std::vector<std::uint16_t> pixels(width * height, 0);
  open_radio::ui::FramebufferView framebuffer{pixels.data(), pixels.size(),
                                               width, height};
  const auto result = open_radio::ui::drawText(
      framebuffer, 0, 0, "ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż",
      open_radio::ui::FontSize::body, 0xffff, width);
  expect(result.valid && !result.truncated,
         "Inter Polish alphabet render succeeds");
  expect(std::count_if(pixels.begin(), pixels.end(),
                       [](auto pixel) { return pixel != 0; }) > 250,
         "Inter Polish alphabet paints deterministic glyphs");
}

void testFontEllipsizesLongMetadata() {
  constexpr int width = 120;
  constexpr int height = 32;
  std::vector<std::uint16_t> pixels(width * height, 0);
  open_radio::ui::FramebufferView framebuffer{pixels.data(), pixels.size(),
                                               width, height};
  const auto result = open_radio::ui::drawText(
      framebuffer, 0, 0,
      "Bardzo długi wykonawca — bardzo długi tytuł audycji radiowej",
      open_radio::ui::FontSize::body, 0xffff, width);
  expect(result.valid && result.truncated,
         "long metadata reports explicit truncation");
  expect(result.width <= width, "ellipsized metadata stays within bounds");
  expect(std::count_if(pixels.begin(), pixels.end(),
                       [](auto pixel) { return pixel != 0; }) > 100,
         "ellipsized metadata remains visible");
}

void testExtendedGlyphsDoNotFallBackToQuestionMark() {
  constexpr int width = 40;
  constexpr int height = 32;
  std::vector<std::uint16_t> question_pixels(width * height, 0);
  std::vector<std::uint16_t> ellipsis_pixels(width * height, 0);
  std::vector<std::uint16_t> accented_pixels(width * height, 0);
  open_radio::ui::FramebufferView question_view{
      question_pixels.data(), question_pixels.size(), width, height};
  open_radio::ui::FramebufferView ellipsis_view{
      ellipsis_pixels.data(), ellipsis_pixels.size(), width, height};
  open_radio::ui::FramebufferView accented_view{
      accented_pixels.data(), accented_pixels.size(), width, height};
  const auto question = open_radio::ui::drawText(
      question_view, 0, 0, "?", open_radio::ui::FontSize::body, 0xffff,
      width);
  const auto ellipsis = open_radio::ui::drawText(
      ellipsis_view, 0, 0, "…", open_radio::ui::FontSize::body, 0xffff,
      width);
  const auto accented = open_radio::ui::drawText(
      accented_view, 0, 0, "é", open_radio::ui::FontSize::body, 0xffff,
      width);
  expect(question.valid && ellipsis.valid && accented.valid,
         "question mark, ellipsis and Latin extended glyphs render");
  expect(question.width != ellipsis.width,
         "ellipsis uses its own generated metrics");
  expect(question_pixels != ellipsis_pixels,
         "ellipsis does not fall back to question mark bitmap");
  expect(question_pixels != accented_pixels,
         "Latin extended glyph does not fall back to question mark bitmap");
}

void testFixtureIsDeterministic() {
  const auto size = static_cast<std::size_t>(open_radio::ui::generated::kWidth) *
                    open_radio::ui::generated::kHeight;
  std::vector<std::uint16_t> first(size);
  std::vector<std::uint16_t> second(size);
  open_radio::ui::FramebufferView first_view{
      first.data(), first.size(), open_radio::ui::generated::kWidth,
      open_radio::ui::generated::kHeight};
  open_radio::ui::FramebufferView second_view{
      second.data(), second.size(), open_radio::ui::generated::kWidth,
      open_radio::ui::generated::kHeight};
  const auto first_result = open_radio::ui::renderNowPlaying(
      first_view, open_radio::ui::generated::kNowPlayingFixture,
      open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  const auto second_result = open_radio::ui::renderNowPlaying(
      second_view, open_radio::ui::generated::kNowPlayingFixture,
      open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(first_result.status == open_radio::ui::RenderStatus::ok,
         "first fixture render succeeds");
  expect(second_result.status == open_radio::ui::RenderStatus::ok,
         "second fixture render succeeds");
  expect(first_result.framebuffer_hash == second_result.framebuffer_hash,
         "fixture hashes match");
  expect(first == second, "fixture framebuffers match");
}

void testThemeChangesFramebuffer() {
  const auto size = static_cast<std::size_t>(open_radio::ui::generated::kWidth) *
                    open_radio::ui::generated::kHeight;
  std::vector<std::uint16_t> dark_pixels(size);
  std::vector<std::uint16_t> light_pixels(size);
  open_radio::ui::FramebufferView dark_view{
      dark_pixels.data(), dark_pixels.size(), open_radio::ui::generated::kWidth,
      open_radio::ui::generated::kHeight};
  open_radio::ui::FramebufferView light_view{
      light_pixels.data(), light_pixels.size(),
      open_radio::ui::generated::kWidth, open_radio::ui::generated::kHeight};
  auto dark_fixture = open_radio::ui::generated::kNowPlayingFixture;
  auto light_fixture = dark_fixture;
  light_fixture.theme = open_radio::ui::ThemeMode::light;
  const auto dark_result = open_radio::ui::renderNowPlaying(
      dark_view, dark_fixture, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  const auto light_result = open_radio::ui::renderNowPlaying(
      light_view, light_fixture, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(dark_result.status == open_radio::ui::RenderStatus::ok,
         "dark theme render succeeds");
  expect(light_result.status == open_radio::ui::RenderStatus::ok,
         "light theme render succeeds");
  expect(dark_result.framebuffer_hash != light_result.framebuffer_hash,
         "light and dark framebuffer hashes differ");
}

void testHomeVariantsChangeFramebuffer() {
  const auto size = static_cast<std::size_t>(open_radio::ui::generated::kWidth) *
                    open_radio::ui::generated::kHeight;
  std::vector<std::uint16_t> editorial_pixels(size);
  std::vector<std::uint16_t> glance_pixels(size);
  open_radio::ui::FramebufferView editorial_view{
      editorial_pixels.data(), editorial_pixels.size(),
      open_radio::ui::generated::kWidth, open_radio::ui::generated::kHeight};
  open_radio::ui::FramebufferView glance_view{
      glance_pixels.data(), glance_pixels.size(),
      open_radio::ui::generated::kWidth, open_radio::ui::generated::kHeight};
  auto editorial = open_radio::ui::generated::kNowPlayingFixture;
  auto glance = editorial;
  glance.variant = open_radio::ui::HomeVariant::glance;
  glance.clock_valid = true;
  glance.clock_year = 2026;
  glance.clock_month = 7;
  glance.clock_day = 15;
  glance.clock_hour = 18;
  glance.clock_minute = 42;
  const auto editorial_result = open_radio::ui::renderNowPlaying(
      editorial_view, editorial, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  const auto glance_result = open_radio::ui::renderNowPlaying(
      glance_view, glance, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(editorial_result.status == open_radio::ui::RenderStatus::ok,
         "editorial home render succeeds");
  expect(glance_result.status == open_radio::ui::RenderStatus::ok,
         "glance home render succeeds");
  expect(editorial_result.framebuffer_hash != glance_result.framebuffer_hash,
         "home variants have distinct hashes");
  expect(editorial_pixels != glance_pixels,
         "home variants have distinct framebuffers");
  expect(glance_pixels[220 * open_radio::ui::generated::kWidth + 160] ==
             open_radio::ui::generated::kDarkTheme.surface,
         "minimal home omits the on-screen transport bar");
  const auto zero_signal_pixels = glance_pixels;
  glance.wifi_strength_percent = 78;
  const auto signal_result = open_radio::ui::renderNowPlaying(
      glance_view, glance, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(signal_result.status == open_radio::ui::RenderStatus::ok,
         "Wi-Fi percentage render succeeds");
  expect(zero_signal_pixels != glance_pixels,
         "Wi-Fi percentage changes minimal home framebuffer");
}

void testConnectivityStatesChangeFramebuffer() {
  const auto size = static_cast<std::size_t>(open_radio::ui::generated::kWidth) *
                    open_radio::ui::generated::kHeight;
  std::vector<std::uint16_t> pixels(size);
  open_radio::ui::FramebufferView framebuffer{
      pixels.data(), pixels.size(), open_radio::ui::generated::kWidth,
      open_radio::ui::generated::kHeight};
  auto snapshot = open_radio::ui::generated::kNowPlayingFixture;
  snapshot.screen = open_radio::ui::ScreenKind::wifi_status;
  const auto wifi_idle = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  snapshot.wifi_online = true;
  snapshot.device_address = "192.168.1.23";
  const auto wifi_address = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(wifi_idle.framebuffer_hash != wifi_address.framebuffer_hash,
         "device address appears on the online Wi-Fi screen");
  snapshot.console_active = true;
  const auto wifi_console = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(wifi_address.framebuffer_hash != wifi_console.framebuffer_hash,
         "console session changes the Wi-Fi screen");
  expect(pixels[10 * open_radio::ui::generated::kWidth + 130] ==
             open_radio::ui::rgb565(255, 255, 255),
         "console screen reserves the QR canvas");
  snapshot.console_active = false;
  snapshot.device_address = nullptr;
  snapshot.wifi_online = open_radio::ui::generated::kNowPlayingFixture.wifi_online;
  snapshot.wifi_portal_active = true;
  snapshot.setup_access_code = "OR-A1B2C3D4";
  const auto wifi_portal = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(wifi_idle.framebuffer_hash != wifi_portal.framebuffer_hash,
         "Wi-Fi portal state changes framebuffer");
  expect(pixels[10 * open_radio::ui::generated::kWidth + 130] ==
             open_radio::ui::rgb565(255, 255, 255),
         "post-onboarding Wi-Fi portal reserves the large QR canvas");

  snapshot.screen = open_radio::ui::ScreenKind::settings_system;
  const auto console_idle = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  snapshot.console_active = true;
  const auto console_open = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(console_idle.framebuffer_hash != console_open.framebuffer_hash,
         "console tile offers closing while the session is open");
  snapshot.console_active = false;

  snapshot.screen = open_radio::ui::ScreenKind::bluetooth_pairing;
  snapshot.bluetooth_state = open_radio::ui::BluetoothState::scanning;
  const auto scanning = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  snapshot.bluetooth_state = open_radio::ui::BluetoothState::connected;
  snapshot.bluetooth_candidate_name = "Xiaomi Sound Pocket";
  snapshot.bluetooth_remembered = true;
  const auto connected = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  snapshot.bluetooth_state = open_radio::ui::BluetoothState::error;
  const auto error = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(scanning.framebuffer_hash != connected.framebuffer_hash &&
             connected.framebuffer_hash != error.framebuffer_hash,
         "Bluetooth lifecycle states change framebuffer");
}

void testSettingsBatteryHeaderReflectsPowerState() {
  const auto size = static_cast<std::size_t>(open_radio::ui::generated::kWidth) *
                    open_radio::ui::generated::kHeight;
  std::vector<std::uint16_t> pixels(size);
  open_radio::ui::FramebufferView framebuffer{
      pixels.data(), pixels.size(), open_radio::ui::generated::kWidth,
      open_radio::ui::generated::kHeight};
  auto snapshot = open_radio::ui::generated::kNowPlayingFixture;
  snapshot.screen = open_radio::ui::ScreenKind::settings_quick;
  snapshot.battery_available = true;
  snapshot.battery_level_percent = 82;
  snapshot.battery_voltage_millivolts = 3970;
  snapshot.battery_current_milliamps = -145;
  snapshot.battery_runtime_valid = true;
  snapshot.battery_runtime_minutes = 130;
  const auto discharge = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());

  snapshot.battery_external_power = true;
  snapshot.battery_current_milliamps = 120;
  snapshot.battery_runtime_valid = false;
  const auto charging = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());

  snapshot.battery_available = false;
  const auto unavailable = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());

  expect(discharge.status == open_radio::ui::RenderStatus::ok &&
             charging.status == open_radio::ui::RenderStatus::ok &&
             unavailable.status == open_radio::ui::RenderStatus::ok,
         "settings battery states render successfully");
  expect(discharge.framebuffer_hash != charging.framebuffer_hash &&
             charging.framebuffer_hash != unavailable.framebuffer_hash &&
             discharge.framebuffer_hash != unavailable.framebuffer_hash,
         "settings battery states change the header framebuffer");
}

void testNoiseControlsChangeFramebuffer() {
  const auto size = static_cast<std::size_t>(open_radio::ui::generated::kWidth) *
                    open_radio::ui::generated::kHeight;
  std::vector<std::uint16_t> pixels(size);
  open_radio::ui::FramebufferView framebuffer{
      pixels.data(), pixels.size(), open_radio::ui::generated::kWidth,
      open_radio::ui::generated::kHeight};
  auto snapshot = open_radio::ui::generated::kNowPlayingFixture;
  snapshot.screen = open_radio::ui::ScreenKind::noise;
  snapshot.clock_valid = true;
  snapshot.clock_hour = 21;
  snapshot.clock_minute = 42;
  const auto stopped = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  snapshot.noise_playing = true;
  snapshot.noise_color = 2;
  const auto playing = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(stopped.status == open_radio::ui::RenderStatus::ok &&
             playing.status == open_radio::ui::RenderStatus::ok,
         "noise play and stop states render successfully");
  expect(stopped.framebuffer_hash != playing.framebuffer_hash,
         "noise play and color controls change framebuffer");
}

// The owner's rule: a fetched logo sits INSIDE the rounded slot, never over
// its frame. A solid-colour runtime logo must leave the slot's corner pixels
// untouched (they belong to the frame) while covering the slot centre — on
// both call sites: the picker tile and the home-screen badge.
void testRuntimeLogoStaysInsideRoundedSlot() {
  using open_radio::ui::ScreenKind;
  constexpr std::uint16_t kSolid = 0xf81f;
  const auto size = static_cast<std::size_t>(open_radio::ui::generated::kWidth) *
                    open_radio::ui::generated::kHeight;
  std::vector<std::uint16_t> pixels(size);
  open_radio::ui::FramebufferView framebuffer{
      pixels.data(), pixels.size(), open_radio::ui::generated::kWidth,
      open_radio::ui::generated::kHeight};
  std::array<std::uint16_t, 16> solid{};
  solid.fill(kSolid);
  std::vector<open_radio::ui::RuntimeStationLogo> logos(
      open_radio::ui::generated::kStations.size());
  logos[0] = {solid.data(), 4, 4};
  logos[1] = {solid.data(), 4, 4};
  open_radio::ui::setRuntimeStationLogos(logos.data(), logos.size());

  // Station 1 is selected so tile 0 keeps the plain (un-inset) slot.
  auto snapshot = open_radio::ui::generated::kNowPlayingFixture;
  snapshot.station_index = 1;
  snapshot.screen = ScreenKind::stations;
  auto result = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(result.status == open_radio::ui::RenderStatus::ok,
         "stations screen renders with a runtime logo");
  // First tile: slot {56,16,64,64}, radius 16.
  const auto at = [&](int x, int y) {
    return pixels[static_cast<std::size_t>(y) *
                      open_radio::ui::generated::kWidth +
                  x];
  };
  expect(at(56, 16) != kSolid, "tile slot corner stays outside the logo mask");
  expect(at(88, 48) == kSolid, "tile slot centre is covered by the logo");

  snapshot.screen = ScreenKind::now_playing_glance;
  result = open_radio::ui::renderScreen(
      framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
      open_radio::ui::generated::kStations.size());
  expect(result.status == open_radio::ui::RenderStatus::ok,
         "glance home renders with a runtime logo");
  // Badge {10,10,72,72}: interior {14,14,64,64}, radius 20.
  expect(at(14, 14) != kSolid, "badge corner keeps the frame visible");
  expect(at(46, 46) == kSolid, "badge interior centre is covered by the logo");

  open_radio::ui::setRuntimeStationLogos(nullptr, 0);
}

void testEveryProductionScreenRendersInBothThemesAndLocales() {
  using open_radio::ui::LocaleMode;
  using open_radio::ui::ScreenKind;
  using open_radio::ui::ThemeMode;
  constexpr std::array<ScreenKind, 29> screens{{
      ScreenKind::now_playing_editorial, ScreenKind::now_playing_glance,
      ScreenKind::screensaver_pulse, ScreenKind::screensaver_bars,
      ScreenKind::screensaver_orbit, ScreenKind::screensaver_cat,
      ScreenKind::display_off, ScreenKind::stations,
      ScreenKind::volume_control,
      ScreenKind::brightness_control,
      ScreenKind::settings_quick,
      ScreenKind::settings_system, ScreenKind::settings_display,
      ScreenKind::noise,
      ScreenKind::wifi_status, ScreenKind::wifi_recovery,
      ScreenKind::bluetooth_fallback, ScreenKind::unsupported,
      ScreenKind::safe_mode, ScreenKind::onboarding_wifi,
      ScreenKind::onboarding_first_sound, ScreenKind::onboarding_bluetooth,
      ScreenKind::bluetooth_pairing, ScreenKind::diagnostics,
      ScreenKind::about, ScreenKind::market}};
  const auto size = static_cast<std::size_t>(open_radio::ui::generated::kWidth) *
                    open_radio::ui::generated::kHeight;
  std::vector<std::uint16_t> pixels(size);
  open_radio::ui::FramebufferView framebuffer{
      pixels.data(), pixels.size(), open_radio::ui::generated::kWidth,
      open_radio::ui::generated::kHeight};
  for (const auto screen : screens) {
    for (const auto theme : {ThemeMode::dark, ThemeMode::light}) {
      for (const auto locale : {LocaleMode::pl, LocaleMode::en}) {
        auto snapshot = open_radio::ui::generated::kNowPlayingFixture;
        snapshot.screen = screen;
        snapshot.theme = theme;
        snapshot.locale = locale;
        snapshot.now_playing_title =
            "Męskie Granie Orkiestra — Supermoce";
        snapshot.metadata_available = true;
        const auto result = open_radio::ui::renderScreen(
            framebuffer, snapshot, open_radio::ui::generated::kStations.data(),
            open_radio::ui::generated::kStations.size());
        expect(result.status == open_radio::ui::RenderStatus::ok,
               "production screen render succeeds");
        expect(result.framebuffer_hash != 0,
               "production screen framebuffer hash is non-zero");
      }
    }
  }
}

}

int main() {
  testRgbPacking();
  testClippingProtectsSentinels();
  testUndersizedBufferIsRejected();
  testRoundedRectanglePreservesCorners();
  testGeneratedIconMaskRenders();
  testGeneratedThemeContract();
  testInvalidStationIsRejected();
  testFontRendersAsciiAndPolishL();
  testFontRendersPolishAlphabet();
  testFontEllipsizesLongMetadata();
  testExtendedGlyphsDoNotFallBackToQuestionMark();
  testFixtureIsDeterministic();
  testThemeChangesFramebuffer();
  testHomeVariantsChangeFramebuffer();
  testConnectivityStatesChangeFramebuffer();
  testSettingsBatteryHeaderReflectsPowerState();
  testNoiseControlsChangeFramebuffer();
  testRuntimeLogoStaysInsideRoundedSlot();
  testEveryProductionScreenRendersInBothThemesAndLocales();
  if (failures != 0) {
    std::cerr << failures << " renderer test(s) failed\n";
    return 1;
  }
  std::cout << "PASS renderer-tests cases=20 screens=29 variants=116\n";
  return 0;
}
