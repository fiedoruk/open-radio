#include <cassert>
#include <cstdio>

#include "open_radio/service_adapters.hpp"
#include "service_golden_vectors.hpp"

namespace {

void testNetworkGoldenVectors() {
  open_radio::WifiSelectionAdapter adapter;
  for (const auto& vector : open_radio::generated::kNetworkGoldenVectors) {
    const auto result = adapter.select(vector.profileState, vector.scans.data(),
                                       vector.scanCount, vector.nowMs);
    assert(result.status == vector.expectedStatus);
    assert(result.selectedProfile == vector.expectedProfile);
    assert(result.retryAtMs == vector.expectedRetryAtMs);
  }
}

void testPersistenceGoldenVectors() {
  for (const auto& vector : open_radio::generated::kPersistenceGoldenVectors) {
    open_radio::HostSlotBackend backend;
    open_radio::seedPersistenceSetup(backend, vector.setup);
    open_radio::NvsAbStorageAdapter adapter(backend);
    if (vector.writePhase != open_radio::WritePhase::None) {
      adapter.commit(open_radio::currentConfigB(), vector.writePhase);
    }
    const auto result = adapter.selectBoot();
    assert(result.status == vector.expectedStatus);
    assert(result.selectedSlot == vector.expectedSlot);
    assert(result.generation == vector.expectedGeneration);
    assert(result.migratedFromVersion == vector.expectedMigratedFromVersion);
  }
}

void testResolverGoldenVectors() {
  open_radio::Mp3ResolverAdapter adapter;
  for (const auto& vector : open_radio::generated::kResolverGoldenVectors) {
    const auto result = adapter.resolve(vector.input);
    assert(result.status == vector.expectedStatus);
    assert(result.selected == vector.expectedSelection);
    assert(result.retryAtMs == vector.expectedRetryAtMs);
  }
}

}

int main() {
  testNetworkGoldenVectors();
  testPersistenceGoldenVectors();
  testResolverGoldenVectors();
  std::puts("PASS service-parity-tests vectors=27");
  return 0;
}
