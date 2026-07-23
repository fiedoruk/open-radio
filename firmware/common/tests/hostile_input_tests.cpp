#include <cassert>
#include <cstdint>
#include <cstdio>
#include <limits>

#include "open_radio/service_adapters.hpp"

namespace {

void testConfigValidationAndRedaction() {
  auto config = open_radio::currentConfigA();
  assert(open_radio::validateDeviceConfig(config).valid);
  const auto diagnostics = open_radio::redactConfig(config);
  assert(diagnostics.wifiProfileCount == 1);
  assert(!diagnostics.containsCredential);
  config.volume = 101;
  assert(!open_radio::validateDeviceConfig(config).valid);
  config = open_radio::currentConfigA();
  config.locale = open_radio::Locale::Invalid;
  assert(!open_radio::validateDeviceConfig(config).valid);
  config = open_radio::currentConfigA();
  config.brightness = 101;
  assert(!open_radio::validateDeviceConfig(config).valid);
  config = open_radio::currentConfigA();
  config.theme = open_radio::DisplayTheme::Invalid;
  assert(!open_radio::validateDeviceConfig(config).valid);

  config = open_radio::currentConfigA();
  config.nowPlayingVariant = open_radio::NowPlayingVariant::Invalid;
  assert(!open_radio::validateDeviceConfig(config).valid);
  config = open_radio::currentConfigA();
  config.screensaverMode = open_radio::ScreensaverMode::Invalid;
  assert(!open_radio::validateDeviceConfig(config).valid);
  config = open_radio::currentConfigA();
  config.screensaverDelaySeconds = 121;
  assert(!open_radio::validateDeviceConfig(config).valid);
  config = open_radio::currentConfigA();
  config.displayOffDelaySeconds = 1200;
  assert(!open_radio::validateDeviceConfig(config).valid);
  config = open_radio::currentConfigA();
  config.wifiProfileCount = open_radio::kMaxRememberedNetworks + 1;
  assert(!open_radio::validateDeviceConfig(config).valid);
}

void testStorageCorruptionBoundaries() {
  open_radio::HostSlotBackend backend;
  open_radio::seedPersistenceSetup(
      backend, open_radio::PersistenceSetup::ChecksumCorruptNewest);
  open_radio::NvsAbStorageAdapter adapter(backend);
  auto selection = adapter.selectBoot();
  assert(selection.status == open_radio::StorageStatus::Bootable);
  assert(selection.selectedSlot == open_radio::SlotId::A);
  assert(selection.rejectionB == open_radio::StorageRejectReason::ChecksumMismatch);
  open_radio::seedPersistenceSetup(backend,
                                   open_radio::PersistenceSetup::FutureOnly);
  selection = adapter.selectBoot();
  assert(selection.status == open_radio::StorageStatus::SafeMode);
  assert(selection.rejectionA ==
         open_radio::StorageRejectReason::FutureSchemaUnsupported);
}

void testDiscoveryInputBounds() {
  const open_radio::DiscoveryResponseDto valid{
      200, open_radio::ContentType::Json, 128, true, true, true, 96};
  assert(open_radio::parseDiscoveryResponse(
             open_radio::DiscoveryParser::RmfonJson, valid)
             .endpointAccepted);
  auto malformed = valid;
  malformed.completeBody = false;
  assert(open_radio::parseDiscoveryResponse(
             open_radio::DiscoveryParser::EurozetJson, malformed)
             .outcome == open_radio::CandidateOutcome::ParseError);
  malformed = valid;
  malformed.bodyBytes = open_radio::kDiscoveryResponseBytes + 1;
  assert(!open_radio::parseDiscoveryResponse(
              open_radio::DiscoveryParser::TubaJson, malformed)
              .endpointAccepted);
  malformed = valid;
  malformed.contentType = open_radio::ContentType::Html;
  assert(!open_radio::parseDiscoveryResponse(
              open_radio::DiscoveryParser::RmfonJson, malformed)
              .endpointAccepted);
  malformed = valid;
  malformed.statusCode = 404;
  assert(open_radio::parseDiscoveryResponse(
             open_radio::DiscoveryParser::RmfonJson, malformed)
             .outcome == open_radio::CandidateOutcome::Http404);
}

void testOnboardingRoutesAndLimits() {
  assert(open_radio::findOnboardingRoute(
             "/network-onboarding/styles.css", open_radio::HttpMethod::Get)
             ->contentType == open_radio::ContentType::Css);
  const auto config = open_radio::currentConfigA();
  assert(open_radio::validateConfigurationRequest(
             "/api/config", open_radio::HttpMethod::Post,
             open_radio::ContentType::Json, 200, &config) ==
         open_radio::RequestValidation::Accepted);
  assert(open_radio::validateConfigurationRequest(
             "/api/config", open_radio::HttpMethod::Post,
             open_radio::ContentType::Json,
             open_radio::kOnboardingRequestBytes + 1, &config) ==
         open_radio::RequestValidation::Oversized);
  assert(open_radio::validateConfigurationRequest(
             "/api/config", open_radio::HttpMethod::Post,
             open_radio::ContentType::Html, 200, &config) ==
         open_radio::RequestValidation::UnsupportedContentType);
}

void testTimerAndQueueSaturation() {
  const auto maximum = std::numeric_limits<std::uint64_t>::max();
  assert(open_radio::boundedAdd(maximum - 2, 10) == maximum);
  open_radio::PcmRingBuffer<2> queue;
  assert(queue.push({1, 1}));
  assert(queue.push({2, 2}));
  assert(!queue.push({3, 3}));
  assert(queue.overruns() == 1);
}

void testUiProjectionAndHitboxes() {
  open_radio::UiProjectionAdapter adapter;
  auto snapshot = adapter.project(open_radio::RuntimeState::Playing, 8,
                                  open_radio::OutputKind::Bluetooth);
  assert(snapshot.schemaVersion == 1);
  assert(snapshot.screen == open_radio::Screen::NowPlaying);
  assert(snapshot.stationIndex == 8);
  assert(snapshot.output == open_radio::OutputKind::Bluetooth);
  assert(adapter.hitTestNowPlaying(276, 34,
                                   open_radio::NowPlayingVariant::Editorial)
             .action == open_radio::TouchAction::Settings);
  assert(adapter.hitTestNowPlaying(256, 188,
                                   open_radio::NowPlayingVariant::Editorial)
             .action == open_radio::TouchAction::NextStation);
  assert(adapter.hitTestNowPlaying(320, 240,
                                   open_radio::NowPlayingVariant::Editorial)
             .action == open_radio::TouchAction::None);
  snapshot = adapter.project(open_radio::RuntimeState::SafeMode, 0,
                             open_radio::OutputKind::LocalSpeaker);
  assert(snapshot.screen == open_radio::Screen::Diagnostics);
}

}

int main() {
  testConfigValidationAndRedaction();
  testStorageCorruptionBoundaries();
  testDiscoveryInputBounds();
  testOnboardingRoutesAndLimits();
  testTimerAndQueueSaturation();
  testUiProjectionAndHitboxes();
  std::puts("PASS hostile-input-tests cases=24");
  return 0;
}
