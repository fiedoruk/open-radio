#include <cassert>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <limits>

#include "open_radio/runtime_orchestrator.hpp"
#include "runtime_soak_vectors.hpp"

namespace {

void postAndAdvance(open_radio::RuntimeOrchestrator& orchestrator,
                    open_radio::RuntimeEventKind kind, std::uint64_t atMs,
                    std::uint32_t sequence) {
  assert(orchestrator.post({kind, atMs, sequence}));
  assert(orchestrator.advance(atMs));
}

void bootReady(open_radio::RuntimeOrchestrator& orchestrator,
               std::uint32_t& sequence) {
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::ConfigReady, 0,
                 sequence++);
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::WifiConnected, 0,
                 sequence++);
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::ResolverReady, 0,
                 sequence++);
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::StreamHealthy, 0,
                 sequence++);
}

std::uint64_t updateHash(std::uint64_t hash, std::uint32_t value) {
  for (std::uint8_t byte = 0; byte < 4; ++byte) {
    hash ^= (value >> (byte * 8U)) & 0xffU;
    hash *= 0x100000001b3ULL;
  }
  return hash;
}

void testConfigBoundaries() {
  open_radio::RuntimeOrchestrator missing;
  postAndAdvance(missing, open_radio::RuntimeEventKind::ConfigMissing, 0, 1);
  assert(missing.snapshot().state == open_radio::RuntimeState::ConfigRequired);
  assert(missing.snapshot().output == open_radio::OutputKind::LocalSpeaker);

  open_radio::RuntimeOrchestrator corrupt;
  postAndAdvance(corrupt, open_radio::RuntimeEventKind::ConfigCorrupt, 0, 1);
  assert(corrupt.snapshot().state == open_radio::RuntimeState::SafeMode);
  assert(corrupt.snapshot().recoveryReason ==
         open_radio::RuntimeRecoveryReason::Memory);
}

void testHappyBoot() {
  open_radio::RuntimeOrchestrator orchestrator;
  std::uint32_t sequence = 1;
  bootReady(orchestrator, sequence);
  const auto snapshot = orchestrator.snapshot();
  assert(snapshot.state == open_radio::RuntimeState::Playing);
  assert(snapshot.output == open_radio::OutputKind::LocalSpeaker);
  assert(snapshot.counters.recoveries == 0);
}

void testUnsupportedStation() {
  open_radio::RuntimeOrchestrator orchestrator;
  std::uint32_t sequence = 1;
  bootReady(orchestrator, sequence);
  postAndAdvance(orchestrator,
                 open_radio::RuntimeEventKind::ResolverUnsupported, 1,
                 sequence++);
  assert(orchestrator.snapshot().state ==
         open_radio::RuntimeState::UnsupportedStation);
}

void testWifiRecovery() {
  open_radio::RuntimeOrchestrator orchestrator;
  std::uint32_t sequence = 1;
  bootReady(orchestrator, sequence);
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::WifiLost, 1000,
                 sequence++);
  assert(orchestrator.snapshot().state == open_radio::RuntimeState::Recovering);
  assert(orchestrator.advance(6000));
  assert(orchestrator.snapshot().counters.networkRetries == 1);
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::WifiConnected, 7000,
                 sequence++);
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::StreamHealthy, 7000,
                 sequence++);
  assert(orchestrator.snapshot().state == open_radio::RuntimeState::Playing);
}

void testStreamRecovery() {
  open_radio::RuntimeOrchestrator orchestrator;
  std::uint32_t sequence = 1;
  bootReady(orchestrator, sequence);
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::StreamStalled, 1000,
                 sequence++);
  assert(orchestrator.advance(6000));
  assert(orchestrator.snapshot().counters.streamRetries == 1);
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::StreamHealthy, 7000,
                 sequence++);
  assert(orchestrator.snapshot().counters.recoveries == 1);
}

void testBluetoothFallback() {
  open_radio::RuntimeOrchestrator orchestrator;
  std::uint32_t sequence = 1;
  bootReady(orchestrator, sequence);
  postAndAdvance(orchestrator,
                 open_radio::RuntimeEventKind::BluetoothConnected, 0,
                 sequence++);
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::BluetoothLost, 1000,
                 sequence++);
  auto snapshot = orchestrator.snapshot();
  assert(snapshot.state == open_radio::RuntimeState::DegradedPlaying);
  assert(snapshot.output == open_radio::OutputKind::LocalSpeaker);
  assert(orchestrator.advance(6000));
  assert(orchestrator.snapshot().counters.bluetoothRetries == 1);
}

void testBothOutputsUnavailable() {
  open_radio::RuntimeOrchestrator orchestrator;
  std::uint32_t sequence = 1;
  bootReady(orchestrator, sequence);
  postAndAdvance(orchestrator,
                 open_radio::RuntimeEventKind::BluetoothRemembered, 0,
                 sequence++);
  postAndAdvance(orchestrator,
                 open_radio::RuntimeEventKind::LocalOutputLost, 1000,
                 sequence++);
  assert(orchestrator.snapshot().state == open_radio::RuntimeState::Recovering);
}

void testPowerInterruption() {
  open_radio::RuntimeOrchestrator orchestrator;
  std::uint32_t sequence = 1;
  bootReady(orchestrator, sequence);
  postAndAdvance(orchestrator,
                 open_radio::RuntimeEventKind::PowerInterrupted, 1000,
                 sequence++);
  assert(orchestrator.snapshot().counters.powerInterruptions == 1);
  assert(orchestrator.snapshot().state == open_radio::RuntimeState::Recovering);
}

void testDuplicateAndStaleRejection() {
  open_radio::RuntimeOrchestrator orchestrator;
  assert(orchestrator.post(
      {open_radio::RuntimeEventKind::ConfigReady, 10, 1}));
  assert(!orchestrator.post(
      {open_radio::RuntimeEventKind::ConfigReady, 10, 1}));
  assert(!orchestrator.post(
      {open_radio::RuntimeEventKind::ConfigReady, 10, 0}));
  assert(orchestrator.advance(10));
  const auto snapshot = orchestrator.snapshot();
  assert(snapshot.counters.duplicateEvents == 1);
  assert(snapshot.counters.staleEvents == 1);
}

void testQueueOverflow() {
  open_radio::RuntimeOrchestrator orchestrator;
  for (std::uint32_t sequence = 1;
       sequence <= open_radio::generated::kRuntimeEventQueueCapacity;
       ++sequence) {
    assert(orchestrator.post(
        {open_radio::RuntimeEventKind::ConfigReady, 100, sequence}));
  }
  assert(!orchestrator.post({open_radio::RuntimeEventKind::ConfigReady, 100,
                             static_cast<std::uint32_t>(
                                 open_radio::generated::kRuntimeEventQueueCapacity +
                                 1)}));
  assert(orchestrator.snapshot().counters.queueOverflows == 1);
  assert(orchestrator.snapshot().counters.maximumQueueDepth ==
         open_radio::generated::kRuntimeEventQueueCapacity);
}

void testDiagnosticRingBound() {
  open_radio::RuntimeOrchestrator orchestrator;
  for (std::uint32_t sequence = 1; sequence <= 40; ++sequence) {
    assert(!orchestrator.post(
        {static_cast<open_radio::RuntimeEventKind>(255), 0, sequence}));
  }
  const auto snapshot = orchestrator.snapshot();
  assert(snapshot.diagnosticsStored ==
         open_radio::generated::kRuntimeDiagnosticCapacity);
  assert(snapshot.counters.diagnosticOverwrites == 8);
  assert(orchestrator.diagnostic(0).reason ==
         open_radio::RuntimeDiagnosticReason::StaleEvent);
}

void testBackwardTimeRejection() {
  open_radio::RuntimeOrchestrator orchestrator;
  assert(orchestrator.advance(100));
  assert(!orchestrator.advance(99));
  assert(orchestrator.snapshot().counters.staleEvents == 1);
}

void testTimerCancellation() {
  open_radio::RuntimeOrchestrator orchestrator;
  std::uint32_t sequence = 1;
  bootReady(orchestrator, sequence);
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::StreamStalled, 1000,
                 sequence++);
  postAndAdvance(orchestrator, open_radio::RuntimeEventKind::StreamHealthy, 2000,
                 sequence++);
  assert(orchestrator.advance(6000));
  assert(orchestrator.snapshot().counters.streamRetries == 0);
  assert(orchestrator.snapshot().timerCount == 0);
}

void testSaturatingTimerDeadline() {
  open_radio::RuntimeOrchestrator orchestrator;
  const auto maximum = std::numeric_limits<std::uint64_t>::max();
  assert(orchestrator.post(
      {open_radio::RuntimeEventKind::WifiLost, maximum, 1}));
  assert(orchestrator.advance(maximum));
  assert(orchestrator.snapshot().timerCount == 1);
  assert(orchestrator.advance(maximum));
  assert(orchestrator.snapshot().counters.networkRetries == 1);
}

void testSoakVector(const open_radio::GoldenRuntimeSoakVector& vector) {
  open_radio::RuntimeOrchestrator orchestrator;
  std::size_t eventIndex = 0;
  std::uint64_t stateHash = 0xcbf29ce484222325ULL;
  for (std::uint16_t minute = 0; minute <= vector.durationMinutes; ++minute) {
    while (eventIndex < vector.eventCount &&
           vector.events[eventIndex].minute == minute) {
      const auto& event = vector.events[eventIndex++];
      assert(orchestrator.post(
          {event.kind, static_cast<std::uint64_t>(minute) * 60000ULL,
           event.sequence}));
    }
    assert(orchestrator.advance(static_cast<std::uint64_t>(minute) * 60000ULL));
    const auto snapshot = orchestrator.snapshot();
    const auto retries = snapshot.counters.networkRetries +
                         snapshot.counters.streamRetries +
                         snapshot.counters.bluetoothRetries;
    for (const auto value : {
             static_cast<std::uint32_t>(snapshot.state),
             static_cast<std::uint32_t>(snapshot.output),
             snapshot.counters.recoveries, retries,
             static_cast<std::uint32_t>(snapshot.queueDepth),
             static_cast<std::uint32_t>(snapshot.timerCount)}) {
      stateHash = updateHash(stateHash, value);
    }
  }
  const auto snapshot = orchestrator.snapshot();
  assert(eventIndex == vector.eventCount);
  assert(snapshot.state == vector.expected.finalState);
  assert(snapshot.output == vector.expected.finalOutput);
  assert(snapshot.counters.recoveries == vector.expected.recoveries);
  assert(snapshot.counters.networkRetries == vector.expected.networkRetries);
  assert(snapshot.counters.streamRetries == vector.expected.streamRetries);
  assert(snapshot.counters.bluetoothRetries == vector.expected.bluetoothRetries);
  assert(snapshot.counters.powerInterruptions ==
         vector.expected.powerInterruptions);
  assert(snapshot.counters.maximumQueueDepth ==
         vector.expected.maximumQueueDepth);
  assert(snapshot.diagnosticsStored == vector.expected.diagnosticsStored);
  assert(snapshot.counters.diagnosticOverwrites ==
         vector.expected.diagnosticOverwrites);
  assert(snapshot.counters.queueOverflows == vector.expected.queueOverflows);
  assert(snapshot.counters.timerOverflows == vector.expected.timerOverflows);
  assert(stateHash == vector.expected.stateHash);
}

}

int main() {
  testConfigBoundaries();
  testHappyBoot();
  testUnsupportedStation();
  testWifiRecovery();
  testStreamRecovery();
  testBluetoothFallback();
  testBothOutputsUnavailable();
  testPowerInterruption();
  testDuplicateAndStaleRejection();
  testQueueOverflow();
  testDiagnosticRingBound();
  testBackwardTimeRejection();
  testTimerCancellation();
  testSaturatingTimerDeadline();
  for (const auto& vector : open_radio::generated::kRuntimeSoakVectors) {
    testSoakVector(vector);
  }
  std::puts("PASS runtime-orchestrator-tests cases=18 soaks=4 minutes=2100");
  return 0;
}
