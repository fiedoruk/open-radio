#include <cassert>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>

#include "open_radio/local_noise_source.hpp"

namespace {

struct Statistics {
  double mean = 0.0;
  double rms = 0.0;
  std::int16_t peak = 0;
};

template <typename Consumer>
void generateFully(open_radio::LocalNoiseSource& source, std::size_t frames,
                   Consumer&& consume) {
  std::size_t remaining = frames;
  while (remaining > 0) {
    const auto produced = source.generate(
        [&](const open_radio::PcmFrame& frame) {
          consume(frame);
          return true;
        },
        remaining);
    assert(produced > 0);
    remaining -= produced;
  }
}

Statistics measure(open_radio::NoiseColor color) {
  open_radio::LocalNoiseSource source;
  source.start(color, 0x12345678U);
  generateFully(source, open_radio::LocalNoiseSource::kFadeInFrames +
                            open_radio::kPcmSampleRate * 2U,
                [](const open_radio::PcmFrame&) {});
  constexpr std::size_t kMeasureFrames = open_radio::kPcmSampleRate * 20U;
  double sum = 0.0;
  double squareSum = 0.0;
  std::int16_t peak = 0;
  generateFully(source, kMeasureFrames, [&](const open_radio::PcmFrame& frame) {
    assert(frame.left == frame.right);
    const double sample = static_cast<double>(frame.left) / INT16_MAX;
    sum += sample;
    squareSum += sample * sample;
    peak = std::max<std::int16_t>(
        peak, static_cast<std::int16_t>(std::abs(frame.left)));
  });
  const double mean = sum / kMeasureFrames;
  return {mean, std::sqrt(squareSum / kMeasureFrames), peak};
}

void testLevelAndDc() {
  for (const auto color : {open_radio::NoiseColor::White,
                           open_radio::NoiseColor::Pink,
                           open_radio::NoiseColor::Brown}) {
    const auto statistics = measure(color);
    const double dbfs = 20.0 * std::log10(statistics.rms);
    std::printf("noise color=%u rms_dbfs=%.3f mean=%.6f peak=%d\n",
                static_cast<unsigned>(color), dbfs, statistics.mean,
                static_cast<int>(statistics.peak));
    std::fflush(stdout);
    assert(dbfs > -14.75 && dbfs < -13.25);
    assert(std::abs(statistics.mean) < 0.015);
    assert(statistics.peak <= INT16_MAX);
  }
}

void testBudgetAndBackpressure() {
  open_radio::LocalNoiseSource source;
  source.start(open_radio::NoiseColor::White, 1U);
  std::size_t accepted = 0;
  const auto budgeted = source.generate([&](const open_radio::PcmFrame&) {
    ++accepted;
    return true;
  }, open_radio::LocalNoiseSource::kFramesPerOwnerLoop * 2U);
  assert(budgeted == open_radio::LocalNoiseSource::kFramesPerOwnerLoop);
  assert(accepted == budgeted);

  accepted = 0;
  const auto backpressured = source.generate([&](const open_radio::PcmFrame&) {
    if (accepted == 17) return false;
    ++accepted;
    return true;
  });
  assert(backpressured == 17);
  assert(accepted == 17);
}

void testFadesAndColorTransition() {
  open_radio::LocalNoiseSource source;
  source.start(open_radio::NoiseColor::White, 0xabcdef01U);
  generateFully(source, open_radio::LocalNoiseSource::kFadeInFrames,
                [](const open_radio::PcmFrame&) {});
  assert(source.steady());
  assert(source.envelope() == 1.0F);

  source.setColor(open_radio::NoiseColor::Pink);
  generateFully(source, open_radio::LocalNoiseSource::kFadeOutFrames,
                [](const open_radio::PcmFrame&) {});
  assert(source.active());
  assert(source.color() == open_radio::NoiseColor::Pink);
  assert(source.envelope() == 0.0F);
  generateFully(source, open_radio::LocalNoiseSource::kFadeInFrames,
                [](const open_radio::PcmFrame&) {});
  assert(source.steady());

  source.requestStop();
  generateFully(source, open_radio::LocalNoiseSource::kFadeOutFrames,
                [](const open_radio::PcmFrame&) {});
  assert(!source.active());
  assert(source.envelope() == 0.0F);
}

}  // namespace

int main() {
  testLevelAndDc();
  testBudgetAndBackpressure();
  testFadesAndColorTransition();
  std::puts("PASS local-noise-source-tests cases=3");
  return 0;
}
