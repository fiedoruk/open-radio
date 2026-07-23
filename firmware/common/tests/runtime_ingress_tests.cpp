#include <cassert>
#include <cstdint>
#include <cstdio>
#include <cstring>

#include "open_radio/runtime_ingress.hpp"
#include "open_radio/runtime_service_bridge.hpp"
#include "runtime_ingress_vectors.hpp"

namespace {

std::uint64_t updateHash(std::uint64_t hash, std::uint32_t value) {
  for (std::uint8_t byte = 0; byte < 4; ++byte) {
    hash ^= (value >> (byte * 8U)) & 0xffU;
    hash *= 0x100000001b3ULL;
  }
  return hash;
}

void testTickRollover() {
  open_radio::MonotonicTick32 clock;
  const auto before = clock.normalize(0xfffffff0U);
  const auto after = clock.normalize(5U);
  assert(before.accepted && !before.rolledOver);
  assert(after.accepted && after.rolledOver);
  assert(after.value == 0x100000005ULL);
}

void testBackwardTick() {
  open_radio::MonotonicTick32 clock;
  assert(clock.normalize(100U).accepted);
  const auto backward = clock.normalize(90U);
  assert(!backward.accepted);
  assert(backward.value == 100U);
}

void testBridgeMappings() {
  open_radio::RuntimeOrchestrator orchestrator;
  open_radio::RuntimeIngress ingress(orchestrator);
  open_radio::RuntimeServiceBridge bridge(ingress);
  open_radio::StorageSelectionDto storage;
  storage.status = open_radio::StorageStatus::Bootable;
  open_radio::NetworkSelectionDto network;
  network.status = open_radio::NetworkSelectionStatus::Selected;
  open_radio::ResolverResultDto resolver;
  resolver.status = open_radio::ResolverStatus::Playing;
  assert(bridge.boot(storage, 1, 1, 0));
  assert(bridge.localOutput(true, 1, 1, 0));
  assert(bridge.network(network, 1, 1, 0));
  assert(bridge.resolver(resolver, 1, 1, 0));
  assert(bridge.stream(true, 1, 1, 0));
  assert(bridge.bluetoothRemembered(1, 1, 0));
  assert(bridge.bluetoothConnection(true, 1, 2, 0));
  assert(ingress.drain() == 7);
  const auto runtime = orchestrator.snapshot();
  assert(runtime.state == open_radio::RuntimeState::Playing);
  assert(runtime.output == open_radio::OutputKind::Bluetooth);
}

void testInvalidProducerMapping() {
  open_radio::RuntimeOrchestrator orchestrator;
  open_radio::RuntimeIngress ingress(orchestrator);
  assert(!ingress.post({open_radio::RuntimeProducer::Wifi, 1, 1, 0,
                        open_radio::RuntimeEventKind::BluetoothConnected}));
  assert(ingress.snapshot().counters.invalidFacts == 1);
}

void testResourceProbesRemainUnmeasured() {
  open_radio::RuntimeOrchestrator orchestrator;
  open_radio::RuntimeIngress ingress(orchestrator);
  const auto probes = ingress.snapshot().resourceProbes;
  assert(probes.internalHeapFreeBytes ==
         open_radio::RuntimeMeasurementStatus::NotMeasured);
  assert(probes.ownerTaskStackHeadroomBytes ==
         open_radio::RuntimeMeasurementStatus::NotMeasured);
  assert(probes.maximumCallbackLatencyUs ==
         open_radio::RuntimeMeasurementStatus::NotMeasured);
  assert(probes.audioUnderruns ==
         open_radio::RuntimeMeasurementStatus::NotMeasured);
}

void testOwnerClockAdvancesTimers() {
  open_radio::RuntimeOrchestrator orchestrator;
  open_radio::RuntimeIngress ingress(orchestrator);
  assert(ingress.post({open_radio::RuntimeProducer::Wifi, 1, 1, 0,
                       open_radio::RuntimeEventKind::WifiLost}));
  assert(ingress.drain() == 1);
  assert(ingress.advanceOwnerClock(5000));
  assert(orchestrator.snapshot().counters.networkRetries == 1);
}

void testTrace(const open_radio::GoldenIngressTrace& trace) {
  open_radio::RuntimeOrchestrator orchestrator;
  open_radio::RuntimeIngress ingress(orchestrator);
  for (std::size_t index = 0; index < trace.factCount; ++index) {
    const auto& fact = trace.facts[index];
    ingress.post({fact.producer, fact.epoch, fact.producerSequence,
                  fact.rawTick, fact.kind});
  }
  while (ingress.snapshot().mailboxDepth > 0) ingress.drain();
  const auto runtime = orchestrator.snapshot();
  const auto snapshot = ingress.snapshot();
  const auto& expected = trace.expected;
  assert(runtime.state == expected.finalState);
  assert(runtime.output == expected.finalOutput);
  assert(snapshot.counters.acceptedFacts == expected.acceptedFacts);
  assert(snapshot.counters.deliveredFacts == expected.deliveredFacts);
  assert(snapshot.counters.mailboxOverflows == expected.mailboxOverflows);
  assert(snapshot.counters.invalidFacts == expected.invalidFacts);
  assert(snapshot.counters.duplicateFacts == expected.duplicateFacts);
  assert(snapshot.counters.staleFacts == expected.staleFacts);
  assert(snapshot.counters.staleEpochs == expected.staleEpochs);
  assert(snapshot.counters.backwardTicks == expected.backwardTicks);
  assert(snapshot.counters.rollovers == expected.rollovers);
  assert(snapshot.counters.maximumMailboxDepth ==
         expected.maximumMailboxDepth);
  assert(snapshot.counters.deliveryRejected == expected.deliveryRejected);
  assert(runtime.counters.processedEvents == expected.runtimeProcessedEvents);
  std::uint64_t stateHash = 0xcbf29ce484222325ULL;
  for (const auto value : {
           static_cast<std::uint32_t>(runtime.state),
           static_cast<std::uint32_t>(runtime.output),
           snapshot.counters.acceptedFacts,
           snapshot.counters.deliveredFacts,
           snapshot.counters.mailboxOverflows,
           snapshot.counters.invalidFacts,
           snapshot.counters.duplicateFacts,
           snapshot.counters.staleFacts,
           snapshot.counters.staleEpochs,
           snapshot.counters.backwardTicks,
           snapshot.counters.rollovers,
           snapshot.counters.maximumMailboxDepth,
           snapshot.counters.deliveryRejected,
           runtime.counters.processedEvents}) {
    stateHash = updateHash(stateHash, value);
  }
  assert(stateHash == expected.stateHash);
}

void testConvergenceGroup() {
  bool found = false;
  for (const auto& trace : open_radio::generated::kRuntimeIngressTraces) {
    if (trace.convergenceGroup == nullptr ||
        std::strcmp(trace.convergenceGroup, "healthy-boot") != 0) {
      continue;
    }
    found = true;
    assert(trace.expected.finalState == open_radio::RuntimeState::Playing);
    assert(trace.expected.finalOutput == open_radio::OutputKind::Bluetooth);
  }
  assert(found);
}

}

int main() {
  testTickRollover();
  testBackwardTick();
  testBridgeMappings();
  testInvalidProducerMapping();
  testResourceProbesRemainUnmeasured();
  testOwnerClockAdvancesTimers();
  for (const auto& trace : open_radio::generated::kRuntimeIngressTraces) {
    testTrace(trace);
  }
  testConvergenceGroup();
  std::puts("PASS runtime-ingress-tests cases=17 traces=10 facts=98");
  return 0;
}
