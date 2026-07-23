#include "open_radio/image_dims.hpp"

#include <cstdio>
#include <cstring>
#include <vector>

namespace {

int failures = 0;

void expect(bool condition, const char* label) {
  if (!condition) {
    std::printf("FAIL %s\n", label);
    ++failures;
  }
}

std::vector<std::uint8_t> pngHeader(std::uint32_t width, std::uint32_t height) {
  std::vector<std::uint8_t> bytes = {0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a,
                                     0, 0, 0, 13, 'I', 'H', 'D', 'R'};
  for (int shift = 24; shift >= 0; shift -= 8) bytes.push_back((width >> shift) & 0xff);
  for (int shift = 24; shift >= 0; shift -= 8) bytes.push_back((height >> shift) & 0xff);
  return bytes;
}

// SOI, then a DHT segment (which must be skipped despite living in the 0xCn
// space), then SOF0 with the dimensions.
std::vector<std::uint8_t> jpegHeader(std::uint16_t width, std::uint16_t height) {
  std::vector<std::uint8_t> bytes = {0xff, 0xd8};
  bytes.insert(bytes.end(), {0xff, 0xc4, 0x00, 0x04, 0x00, 0x00});
  bytes.insert(bytes.end(), {0xff, 0xc0, 0x00, 0x0b, 0x08});
  bytes.push_back(height >> 8);
  bytes.push_back(height & 0xff);
  bytes.push_back(width >> 8);
  bytes.push_back(width & 0xff);
  bytes.insert(bytes.end(), {0x01, 0x01, 0x11, 0x00});
  return bytes;
}

}  // namespace

int main() {
  {
    const auto bytes = pngHeader(180, 120);
    const auto dims = open_radio::parseImageDimensions(bytes.data(), bytes.size());
    expect(dims.valid && dims.png && dims.width == 180 && dims.height == 120,
           "png dimensions parse");
  }
  {
    const auto bytes = jpegHeader(300, 200);
    const auto dims = open_radio::parseImageDimensions(bytes.data(), bytes.size());
    expect(dims.valid && !dims.png && dims.width == 300 && dims.height == 200,
           "jpeg dimensions parse across a skipped DHT segment");
  }
  {
    const std::uint8_t gif[] = {'G', 'I', 'F', '8', '9', 'a', 0, 0, 0, 0, 0, 0,
                                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
    expect(!open_radio::parseImageDimensions(gif, sizeof(gif)).valid,
           "gif is rejected, the device cannot decode it");
  }
  {
    auto bytes = pngHeader(0, 64);
    expect(!open_radio::parseImageDimensions(bytes.data(), bytes.size()).valid,
           "zero width is invalid");
    bytes = pngHeader(64, 64);
    expect(!open_radio::parseImageDimensions(bytes.data(), 10).valid,
           "truncated png is invalid");
  }
  {
    // A JPEG whose segment length lies (0) must not loop forever or read out
    // of bounds — it fetched from the open internet.
    const std::uint8_t hostile[] = {0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0xff,
                                    0xff, 0xff, 0xff, 0xff, 0xff};
    expect(!open_radio::parseImageDimensions(hostile, sizeof(hostile)).valid,
           "hostile jpeg segment length is rejected");
    expect(!open_radio::parseImageDimensions(nullptr, 100).valid,
           "null input is rejected");
  }
  if (failures != 0) {
    std::printf("image-dims-tests failures=%d\n", failures);
    return 1;
  }
  std::printf("PASS image-dims-tests cases=7\n");
  return 0;
}
