#include <cassert>
#include <cstddef>
#include <cstdint>
#include <cstdio>

#include "open_radio/firmware_contract.hpp"
#include "open_radio/spsc_byte_ring.hpp"

namespace {

class FakeOutput final : public open_radio::AudioOutput {
 public:
  explicit FakeOutput(open_radio::OutputKind outputKind) : outputKind_(outputKind) {}

  open_radio::OutputKind kind() const override { return outputKind_; }
  bool available() const override { return available_; }
  std::size_t write(const open_radio::PcmFrame*, std::size_t count) override {
    ++writeCalls_;
    return available_ && acceptsWrites_ ? count : 0;
  }

  void setAvailable(bool available) { available_ = available; }
  void setAcceptsWrites(bool acceptsWrites) { acceptsWrites_ = acceptsWrites; }
  std::size_t writeCalls() const { return writeCalls_; }

 private:
  open_radio::OutputKind outputKind_;
  bool available_ = true;
  bool acceptsWrites_ = true;
  std::size_t writeCalls_ = 0;
};

void testBoundedQueue() {
  open_radio::PcmRingBuffer<2> queue;
  const open_radio::PcmFrame first{1, 2};
  const open_radio::PcmFrame second{3, 4};
  assert(queue.push(first));
  assert(queue.push(second));
  assert(!queue.push(first));
  assert(queue.overruns() == 1);
  open_radio::PcmFrame output[2]{};
  assert(queue.pop(output, 2) == 2);
  assert(output[0].left == 1 && output[1].right == 4);
  assert(queue.pop(output, 1) == 0);
  assert(queue.underruns() == 1);
}

void testPeekKeepsFramesUntilOutputAcceptsThem() {
  open_radio::PcmRingBuffer<3> queue;
  assert(queue.push({1, 2}));
  assert(queue.push({3, 4}));
  open_radio::PcmFrame output[2]{};
  assert(queue.peek(output, 2) == 2);
  assert(output[0].left == 1 && output[1].right == 4);
  assert(queue.size() == 2);
  assert(queue.discard(1) == 1);
  assert(queue.size() == 1);
  assert(queue.peek(output, 2) == 1);
  assert(output[0].left == 3 && output[0].right == 4);
}

void testSingleActiveBluetoothSink() {
  FakeOutput local(open_radio::OutputKind::LocalSpeaker);
  FakeOutput bluetooth(open_radio::OutputKind::Bluetooth);
  open_radio::OutputRouter router(local, bluetooth);
  const open_radio::PcmFrame frame{1, 1};
  assert(router.write(&frame, 1) == 1);
  assert(bluetooth.writeCalls() == 1);
  assert(local.writeCalls() == 0);
}

void testBluetoothBackpressureKeepsTheSelectedSink() {
  FakeOutput local(open_radio::OutputKind::LocalSpeaker);
  FakeOutput bluetooth(open_radio::OutputKind::Bluetooth);
  bluetooth.setAcceptsWrites(false);
  open_radio::OutputRouter router(local, bluetooth);
  const open_radio::PcmFrame frame{1, 1};
  assert(router.write(&frame, 1) == 0);
  assert(bluetooth.writeCalls() == 1);
  assert(local.writeCalls() == 0);
  assert(router.activeOutput() == open_radio::OutputKind::Bluetooth);

  bluetooth.setAvailable(false);
  assert(router.write(&frame, 1) == 1);
  assert(local.writeCalls() == 1);
  assert(router.activeOutput() == open_radio::OutputKind::LocalSpeaker);
}

void testUnavailableBluetoothStartsLocal() {
  FakeOutput local(open_radio::OutputKind::LocalSpeaker);
  FakeOutput bluetooth(open_radio::OutputKind::Bluetooth);
  bluetooth.setAvailable(false);
  open_radio::OutputRouter router(local, bluetooth);
  const open_radio::PcmFrame frame{1, 1};
  assert(router.write(&frame, 1) == 1);
  assert(bluetooth.writeCalls() == 0);
  assert(local.writeCalls() == 1);
}

void testActiveBluetoothDrainsTheMeasuredReserveDeadlock() {
  std::size_t decodedFrames = 44801;
  std::size_t bluetoothFrames = 2816;
  const std::size_t totalFrames = decodedFrames + bluetoothFrames;

  // Exact live RMF failure state from 2026-07-18: the former 44,100-frame
  // source floor rejected a 1,024-frame transfer and fed zero PCM to A2DP.
  assert(open_radio::selectPcmTransferFrames(
             decodedFrames, bluetoothFrames, 262144, 0, 1024) == 1024);
  while (true) {
    const auto transfer = open_radio::selectPcmTransferFrames(
        decodedFrames, bluetoothFrames, 262144, 0, 1024);
    if (transfer == 0) break;
    decodedFrames -= transfer;
    bluetoothFrames += transfer;
  }
  assert(decodedFrames == 0);
  assert(bluetoothFrames == totalFrames);
}

void testBluetoothStandbyStillRetainsLocalFallbackPcm() {
  constexpr std::size_t fallbackReserveFrames = 44100;
  std::size_t decodedFrames = 44801;
  std::size_t bluetoothFrames = 2816;
  const auto transfer = open_radio::selectPcmTransferFrames(
      decodedFrames, bluetoothFrames, 262144, fallbackReserveFrames, 131072);
  assert(transfer == 701);
  decodedFrames -= transfer;
  bluetoothFrames += transfer;
  assert(decodedFrames == fallbackReserveFrames);
  assert(open_radio::selectPcmTransferFrames(
             decodedFrames, bluetoothFrames, 262144,
             fallbackReserveFrames, 131072) == 0);
  assert(open_radio::selectPcmTransferFrames(
             100000, 262144, 262144, fallbackReserveFrames, 131072) == 0);
}

void testSpscByteRingPreservesPartialWritesAcrossWrap() {
  std::uint8_t storage[8]{};
  open_radio::SpscByteRing<8> ring;
  assert(!ring.ready());
  ring.begin(storage);
  assert(ring.ready());
  assert(ring.capacity() == 8);

  const std::uint8_t first[] = {0, 1, 2, 3, 4, 5};
  assert(ring.write(first, sizeof(first)) == sizeof(first));
  std::uint8_t output[8]{};
  assert(ring.read(output, 4) == 4);
  for (std::size_t index = 0; index < 4; ++index) {
    assert(output[index] == index);
  }

  const std::uint8_t second[] = {6, 7, 8, 9, 10, 11, 12};
  assert(ring.write(second, sizeof(second)) == 6);
  assert(ring.size() == 8);
  assert(ring.write(second, 1) == 0);
  assert(ring.read(output, sizeof(output)) == sizeof(output));
  for (std::size_t index = 0; index < sizeof(output); ++index) {
    assert(output[index] == index + 4);
  }
  assert(ring.size() == 0);
  ring.clear();
  assert(ring.size() == 0);
}

}

int main() {
  testBoundedQueue();
  testPeekKeepsFramesUntilOutputAcceptsThem();
  testSingleActiveBluetoothSink();
  testBluetoothBackpressureKeepsTheSelectedSink();
  testUnavailableBluetoothStartsLocal();
  testActiveBluetoothDrainsTheMeasuredReserveDeadlock();
  testBluetoothStandbyStillRetainsLocalFallbackPcm();
  testSpscByteRingPreservesPartialWritesAcrossWrap();
  std::puts("PASS firmware-contract-tests cases=8");
  return 0;
}
