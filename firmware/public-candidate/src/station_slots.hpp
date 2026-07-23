#pragma once

#include <Preferences.h>

#include <array>
#include <cctype>
#include <cstdint>
#include <cstring>

#include "station_catalog.hpp"

namespace open_radio::public_candidate {

// Which station sits in each of the nine tiles.
//
// The nine the firmware ships with are a starting point, not a verdict: the
// only complaint 0.1 ever drew was "my station is missing". An installer picks
// replacements from the embedded directory while standing on the device's own
// access point, where there is no internet, which is exactly why the directory
// is compiled in rather than fetched.
//
// A slot holds an index into that directory, or kBuiltIn to mean "leave the
// factory station here". Nine int16 values is the entire stored state.
class StationSlots {
 public:
  static constexpr std::size_t kSlotCount = 9;
  static constexpr std::int16_t kBuiltIn = -1;
  // Bumped whenever the stored layout changes. An unknown version is treated
  // as absent rather than migrated: the worst case is a cube that plays its
  // factory nine, which is a working radio, not a broken one.
  static constexpr std::uint8_t kFormatVersion = 1;

  void load(Preferences& preferences) {
    reset();
    std::array<std::int16_t, kSlotCount> stored{};
    const std::size_t bytes = preferences.getBytes(kKey, stored.data(), sizeof(stored));
    if (bytes != sizeof(stored)) return;
    if (preferences.getUChar(kVersionKey, 0) != kFormatVersion) return;
    for (std::size_t slot = 0; slot < kSlotCount; ++slot) apply(slot, stored[slot]);
  }

  bool store(Preferences& preferences, const std::int16_t* assignments) {
    std::array<std::int16_t, kSlotCount> next{};
    for (std::size_t slot = 0; slot < kSlotCount; ++slot) {
      const std::int16_t value = assignments[slot];
      if (value != kBuiltIn &&
          (value < 0 || static_cast<std::size_t>(value) >= open_radio::generated::kDirectoryCount)) {
        return false;
      }
      next[slot] = value;
    }
    if (preferences.putBytes(kKey, next.data(), sizeof(next)) != sizeof(next)) return false;
    preferences.putUChar(kVersionKey, kFormatVersion);
    reset();
    for (std::size_t slot = 0; slot < kSlotCount; ++slot) apply(slot, next[slot]);
    return true;
  }

  std::int16_t directoryIndex(std::size_t slot) const {
    return slot < kSlotCount ? assigned_[slot] : kBuiltIn;
  }

  bool overridden(std::size_t slot) const { return directoryIndex(slot) != kBuiltIn; }

  // How many verified edges this slot can rotate through. Zero means the slot
  // still holds its factory station and the catalog's own candidates apply.
  std::size_t endpointCount(std::size_t slot) const {
    const std::int16_t index = directoryIndex(slot);
    return index == kBuiltIn ? 0 : open_radio::generated::kDirectory[index].endpointCount;
  }

  // The nth alternate, wrapping. A directory station rotates exactly like a
  // curated one: the same wheel, the same recovery from a dead edge. Which
  // list a station came from must not decide how well it survives.
  const char* url(std::size_t slot, std::size_t candidate) const {
    const std::size_t count = endpointCount(slot);
    if (count == 0) return nullptr;
    const auto& station = open_radio::generated::kDirectory[directoryIndex(slot)];
    return open_radio::generated::kDirectoryEndpoints[station.endpointOffset + candidate % count].url;
  }

  const char* name(std::size_t slot) const {
    if (!overridden(slot)) return open_radio::generated::kStations[slot].displayName;
    return names_[slot].data();
  }

  const char* shortName(std::size_t slot) const {
    if (!overridden(slot)) return nullptr;
    return shorts_[slot].data();
  }

 private:
  static constexpr const char* kKey = "slots1";
  static constexpr const char* kVersionKey = "slotsv";
  static constexpr std::size_t kNameBytes = 39;
  static constexpr std::size_t kShortBytes = 8;

  void reset() {
    assigned_.fill(kBuiltIn);
    for (auto& value : names_) value[0] = '\0';
    for (auto& value : shorts_) value[0] = '\0';
  }

  void apply(std::size_t slot, std::int16_t index) {
    if (index == kBuiltIn ||
        static_cast<std::size_t>(index) >= open_radio::generated::kDirectoryCount) {
      assigned_[slot] = kBuiltIn;
      return;
    }
    assigned_[slot] = index;
    const char* source = open_radio::generated::kDirectory[index].name;
    std::strncpy(names_[slot].data(), source, kNameBytes);
    names_[slot][kNameBytes] = '\0';
    writeShortName(slot, source);
  }

  // The tile is 7 characters wide at most, so a monogram is cut from the first
  // word that carries meaning. "Radio" alone identifies nothing in a Polish
  // directory where half the entries start with it.
  void writeShortName(std::size_t slot, const char* source) {
    auto& target = shorts_[slot];
    std::size_t written = 0;
    bool skippedGenericPrefix = false;
    const char* cursor = source;
    while (*cursor == ' ') ++cursor;
    if (std::strncmp(cursor, "Radio ", 6) == 0 || std::strncmp(cursor, "RADIO ", 6) == 0) {
      cursor += 6;
      skippedGenericPrefix = true;
    }
    for (; *cursor != '\0' && written < kShortBytes - 1; ++cursor) {
      if (*cursor == ' ' && written > 0) break;
      const unsigned char value = static_cast<unsigned char>(*cursor);
      if (value < 0x20 || value > 0x7e) continue;
      target[written++] = static_cast<char>(std::toupper(value));
    }
    if (written == 0 && skippedGenericPrefix) {
      std::strncpy(target.data(), "RADIO", kShortBytes - 1);
      written = 5;
    }
    target[written] = '\0';
  }

  std::array<std::int16_t, kSlotCount> assigned_{};
  std::array<std::array<char, kNameBytes + 1>, kSlotCount> names_{};
  std::array<std::array<char, kShortBytes>, kSlotCount> shorts_{};
};

}  // namespace open_radio::public_candidate
