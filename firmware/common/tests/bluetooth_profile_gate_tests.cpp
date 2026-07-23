#include <cassert>
#include <cstdio>

#include "open_radio/bluetooth_profile_gate.hpp"

namespace {

void testRequiresOneShotAuthorization() {
  open_radio::BluetoothProfileOpenGate gate;
  assert(!gate.begin().allowed);
  gate.authorize(open_radio::BluetoothProfileOpenReason::Recovery);
  const auto first = gate.begin();
  assert(first.allowed);
  assert(first.generation != 0);
  assert(first.reason == open_radio::BluetoothProfileOpenReason::Recovery);
  assert(!gate.begin().allowed);
}

void testSingleFlightAndStaleTerminalFence() {
  open_radio::BluetoothProfileOpenGate gate;
  gate.authorize(open_radio::BluetoothProfileOpenReason::BootRemembered);
  const auto first = gate.begin();
  assert(first.allowed);

  gate.authorize(open_radio::BluetoothProfileOpenReason::InboundAcl);
  assert(!gate.begin().allowed);
  assert(gate.openInFlight());
  assert(!gate.finish(first.generation + 1U));
  assert(gate.finish(first.generation));
  assert(!gate.finish(first.generation));
  assert(!gate.openInFlight());

  gate.authorize(open_radio::BluetoothProfileOpenReason::InboundAcl);
  const auto second = gate.begin();
  assert(second.allowed);
  assert(second.generation != first.generation);
  assert(!gate.finish(first.generation));
  assert(gate.openInFlight());
  assert(gate.finish(second.generation));
}

void testCancelledDiscoveryCannotDial() {
  open_radio::BluetoothProfileOpenGate gate;
  gate.authorize(open_radio::BluetoothProfileOpenReason::Discovery);
  gate.cancelAuthorization();
  assert(!gate.begin().allowed);
}

void testLateTerminalCannotClaimUnobservedNewGeneration() {
  open_radio::BluetoothProfileOpenGate gate;
  gate.authorize(open_radio::BluetoothProfileOpenReason::Recovery);
  const auto first = gate.begin();
  assert(first.allowed);
  assert(gate.observeProgress() == first.generation);
  assert(gate.observedGeneration() == first.generation);
  assert(gate.finish(first.generation));
  assert(gate.observedGeneration() == 0);

  gate.authorize(open_radio::BluetoothProfileOpenReason::Recovery);
  const auto second = gate.begin();
  assert(second.allowed);
  assert(second.generation != first.generation);

  // This models a duplicate DISCONNECTED from the retired first attempt.
  // The new generation is active but has not emitted CONNECTING, so the
  // duplicate remains generation-less and cannot finish it.
  assert(gate.observedGeneration() == 0);
  assert(gate.openInFlight());
  assert(gate.observeProgress() == second.generation);
  assert(gate.finish(second.generation));
  assert(gate.observedGeneration() == 0);
}

void testConnectionEventKeepsStateAndGenerationAtomic() {
  constexpr auto packed = open_radio::packBluetoothProfileEvent(3, 123456U);
  static_assert(packed != 0);
  constexpr auto event = open_radio::unpackBluetoothProfileEvent(packed);
  static_assert(event.state == 3);
  static_assert(event.generation == 123456U);

  constexpr auto inbound = open_radio::unpackBluetoothProfileEvent(
      open_radio::packBluetoothProfileEvent(2, 0));
  static_assert(inbound.state == 2);
  static_assert(inbound.generation == 0);
}

}  // namespace

int main() {
  testRequiresOneShotAuthorization();
  testSingleFlightAndStaleTerminalFence();
  testCancelledDiscoveryCannotDial();
  testLateTerminalCannotClaimUnobservedNewGeneration();
  testConnectionEventKeepsStateAndGenerationAtomic();
  std::puts("PASS bluetooth-profile-gate cases=5");
  return 0;
}
