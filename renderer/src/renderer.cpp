#include "open_radio/renderer.hpp"

#include <algorithm>
#include <array>
#include <cstdio>
#include <cstring>
#include <limits>

#include "inter_font.hpp"
#include "icon_masks.hpp"
#include "kiara_sprite.hpp"
#include "ui_contract.hpp"

#if defined(OPEN_RADIO_HAS_LOGO_PACK)
// Private hardware-lab station artwork; never compiled into the public
// candidate (see scripts/generate-logo-pack.mjs).
#include "station_logo_pack.hpp"
#endif

namespace open_radio::ui {
namespace {

constexpr std::uint64_t kFnvOffset = 14695981039346656037ULL;
constexpr std::uint64_t kFnvPrime = 1099511628211ULL;
constexpr int kScreenWidth = 320;

bool requiredPixels(FramebufferView framebuffer, std::size_t& required) {
  if (framebuffer.pixels == nullptr || framebuffer.width <= 0 ||
      framebuffer.height <= 0) {
    return false;
  }
  const auto width = static_cast<std::size_t>(framebuffer.width);
  const auto height = static_cast<std::size_t>(framebuffer.height);
  if (width > std::numeric_limits<std::size_t>::max() / height) return false;
  required = width * height;
  return framebuffer.pixel_count >= required;
}

void putPixel(FramebufferView framebuffer, int x, int y, std::uint16_t color) {
  if (x < 0 || y < 0 || x >= framebuffer.width || y >= framebuffer.height) return;
  framebuffer.pixels[static_cast<std::size_t>(y) *
                         static_cast<std::size_t>(framebuffer.width) +
                     static_cast<std::size_t>(x)] = color;
}

void putPixelAlpha(FramebufferView framebuffer, int x, int y,
                   std::uint16_t foreground, std::uint8_t alpha) {
  if (alpha == 0 || x < 0 || y < 0 || x >= framebuffer.width ||
      y >= framebuffer.height) {
    return;
  }
  auto& background = framebuffer.pixels[
      static_cast<std::size_t>(y) * static_cast<std::size_t>(framebuffer.width) +
      static_cast<std::size_t>(x)];
  if (alpha >= 15) {
    background = foreground;
    return;
  }
  const int inverse = 15 - alpha;
  const int foreground_red = (foreground >> 11U) & 0x1fU;
  const int foreground_green = (foreground >> 5U) & 0x3fU;
  const int foreground_blue = foreground & 0x1fU;
  const int background_red = (background >> 11U) & 0x1fU;
  const int background_green = (background >> 5U) & 0x3fU;
  const int background_blue = background & 0x1fU;
  const auto red = static_cast<std::uint16_t>(
      (foreground_red * alpha + background_red * inverse + 7) / 15);
  const auto green = static_cast<std::uint16_t>(
      (foreground_green * alpha + background_green * inverse + 7) / 15);
  const auto blue = static_cast<std::uint16_t>(
      (foreground_blue * alpha + background_blue * inverse + 7) / 15);
  background = static_cast<std::uint16_t>((red << 11U) | (green << 5U) | blue);
}

std::uint32_t decodeUtf8(const unsigned char*& cursor) {
  const std::uint32_t first = *cursor++;
  if (first < 0x80U) return first;
  if ((first & 0xe0U) == 0xc0U && (*cursor & 0xc0U) == 0x80U) {
    return ((first & 0x1fU) << 6U) | (*cursor++ & 0x3fU);
  }
  if ((first & 0xf0U) == 0xe0U && cursor[0] != 0U && cursor[1] != 0U &&
      (cursor[0] & 0xc0U) == 0x80U && (cursor[1] & 0xc0U) == 0x80U) {
    const std::uint32_t second = *cursor++ & 0x3fU;
    const std::uint32_t third = *cursor++ & 0x3fU;
    return ((first & 0x0fU) << 12U) | (second << 6U) | third;
  }
  while ((*cursor & 0xc0U) == 0x80U) ++cursor;
  return '?';
}

const FontGlyph& glyphFor(const FontFace& face, std::uint32_t codepoint) {
  std::size_t left = 0;
  std::size_t right = face.glyph_count;
  while (left < right) {
    const std::size_t middle = left + (right - left) / 2;
    const auto candidate = face.glyphs[middle].codepoint;
    if (candidate < codepoint) left = middle + 1;
    else right = middle;
  }
  if (left < face.glyph_count && face.glyphs[left].codepoint == codepoint) {
    return face.glyphs[left];
  }
  return glyphFor(face, '?');
}

void drawGlyph(FramebufferView framebuffer, int x, int top,
               const FontFace& face, const FontGlyph& glyph,
               std::uint16_t color) {
  if (glyph.width == 0 || glyph.height == 0) return;
  const int glyph_left = x + glyph.x_offset;
  const int glyph_top = top + face.ascent + glyph.y_offset;
  const std::size_t pixels = static_cast<std::size_t>(glyph.width) * glyph.height;
  for (std::size_t index = 0; index < pixels; ++index) {
    const std::size_t byte_index = glyph.bitmap_offset + index / 2;
    if (byte_index >= face.bitmap_size) return;
    const auto packed = face.bitmap[byte_index];
    const std::uint8_t alpha = index % 2 == 0 ? packed >> 4U : packed & 0x0fU;
    const int column = static_cast<int>(index % glyph.width);
    const int row = static_cast<int>(index / glyph.width);
    putPixelAlpha(framebuffer, glyph_left + column, glyph_top + row, color,
                  alpha);
  }
}

int lineHeight(FontSize size) {
  const auto& face = generated::interFace(size);
  return face.ascent + face.descent;
}

void fillCircle(FramebufferView framebuffer, int center_x, int center_y,
                int radius, std::uint16_t color) {
  if (radius <= 0) return;
  const int radius_squared = radius * radius;
  for (int y = -radius; y <= radius; ++y) {
    for (int x = -radius; x <= radius; ++x) {
      if (x * x + y * y <= radius_squared) {
        putPixel(framebuffer, center_x + x, center_y + y, color);
      }
    }
  }
}

const char* translated(const CompactSnapshot& snapshot, const char* polish,
                       const char* english) {
  return snapshot.locale == LocaleMode::en ? english : polish;
}

const char* metadataTitle(const CompactSnapshot& snapshot) {
  if (snapshot.metadata_available && snapshot.now_playing_title != nullptr &&
      snapshot.now_playing_title[0] != '\0') {
    return snapshot.now_playing_title;
  }
  return translated(snapshot, "Tytuł niedostępny", "Title unavailable");
}

struct Painter {
  FramebufferView framebuffer;
  std::uint16_t truncated = 0;

  TextRenderResult text(int x, int y, const char* value, FontSize size,
                        std::uint16_t color, int maximum_width,
                        bool ellipsize = true) {
    const auto result = drawText(framebuffer, x, y, value, size, color,
                                 maximum_width, ellipsize);
    if (result.truncated) ++truncated;
    return result;
  }

  TextRenderResult centered(int center_x, int y, const char* value,
                            FontSize size, std::uint16_t color,
                            int maximum_width) {
    const int width = std::min(measureText(value, size), maximum_width);
    return text(center_x - width / 2, y, value, size, color, maximum_width);
  }
};

void drawWrappedText(Painter& painter, int x, int y, const char* value,
                     FontSize size, std::uint16_t color, int maximum_width,
                     int maximum_lines) {
  if (value == nullptr || maximum_lines <= 0) return;
  std::array<char, 193> buffer{};
  std::strncpy(buffer.data(), value, buffer.size() - 1);
  char* line = buffer.data();
  for (int line_index = 0; line_index < maximum_lines && *line != '\0';
       ++line_index) {
    auto* cursor = reinterpret_cast<const unsigned char*>(line);
    char* last_space = nullptr;
    char* fit_end = line;
    int width = 0;
    while (*cursor != 0U) {
      const auto* start = cursor;
      const auto codepoint = decodeUtf8(cursor);
      const auto& glyph = glyphFor(generated::interFace(size), codepoint);
      if (width + glyph.advance > maximum_width) break;
      width += glyph.advance;
      fit_end = reinterpret_cast<char*>(const_cast<unsigned char*>(cursor));
      if (codepoint == ' ') last_space = reinterpret_cast<char*>(const_cast<unsigned char*>(start));
    }
    if (*cursor == 0U) {
      painter.text(x, y + line_index * lineHeight(size), line, size, color,
                   maximum_width, false);
      break;
    }
    if (line_index == maximum_lines - 1) {
      painter.text(x, y + line_index * lineHeight(size), line, size, color,
                   maximum_width, true);
      break;
    }
    char* split = last_space != nullptr && last_space > line ? last_space : fit_end;
    if (split <= line) {
      painter.text(x, y + line_index * lineHeight(size), line, size, color,
                   maximum_width, true);
      break;
    }
    const char saved = *split;
    *split = '\0';
    painter.text(x, y + line_index * lineHeight(size), line, size, color,
                 maximum_width, false);
    *split = saved;
    line = split;
    while (*line == ' ') ++line;
  }
}

void drawUtilityHeader(Painter& painter, const ThemeTokens& theme,
                       const char* title, const char* subtitle = nullptr) {
  painter.text(12, 8, title, FontSize::title, theme.text, 244);
  if (subtitle != nullptr) {
    painter.text(14, 31, subtitle, FontSize::caption, theme.muted, 220);
  }
  fillRoundRect(painter.framebuffer, {268, 2, 44, 44}, 14, theme.raised);
  drawIconMask24(painter.framebuffer, 278, 12, generated::kIconX, theme.text);
}

void drawNoiseGlyph(FramebufferView framebuffer, int center_x, int center_y,
                    std::uint16_t foreground, std::uint16_t background) {
  fillCircle(framebuffer, center_x, center_y, 10, foreground);
  fillCircle(framebuffer, center_x, center_y, 7, background);
  fillCircle(framebuffer, center_x, center_y, 5, foreground);
  fillCircle(framebuffer, center_x, center_y, 2, background);
}

void drawStatusBar(Painter& painter, const CompactSnapshot& snapshot,
                   const ThemeTokens& theme, const StationTheme& station) {
  fillRect(painter.framebuffer, {0, 0, kScreenWidth, 28}, theme.surface);
  fillRoundRect(painter.framebuffer, {8, 9, snapshot.wifi_online ? 18 : 8, 6},
                3, snapshot.wifi_online ? theme.success : theme.warning);
  painter.text(32, 6, snapshot.output == AudioOutput::bluetooth ? "BT" : "RADIO",
               FontSize::caption, theme.muted, 52);
  const int volume_width = static_cast<int>(snapshot.volume) * 52 / 100;
  fillRoundRect(painter.framebuffer, {260, 11, 52, 5}, 2, theme.border);
  fillRoundRect(painter.framebuffer, {260, 11, volume_width, 5}, 2,
                station.accent);
}

// Copies the first UTF-8 code point of text into out (used for the station
// monogram / logo-slot placeholder initial). out must hold at least 5 bytes.
void copyFirstGlyph(const char* text, char* out, std::size_t capacity) {
  if (out == nullptr || capacity == 0) return;
  out[0] = '\0';
  if (text == nullptr || text[0] == '\0') return;
  const auto* bytes = reinterpret_cast<const unsigned char*>(text);
  std::size_t length = 1;
  if ((bytes[0] & 0xe0U) == 0xc0U) length = 2;
  else if ((bytes[0] & 0xf0U) == 0xe0U) length = 3;
  else if ((bytes[0] & 0xf8U) == 0xf0U) length = 4;
  std::size_t i = 0;
  for (; i < length && i + 1 < capacity && bytes[i] != 0U; ++i) {
    out[i] = static_cast<char>(bytes[i]);
  }
  out[i] = '\0';
}

namespace {
const RuntimeStationLogo* runtime_logos = nullptr;
std::size_t runtime_logo_count = 0;
}  // namespace

namespace {

// Blits a runtime logo into rect: cover-fit, centred, nearest-neighbour,
// clipped to the same rounded outline the slot beneath it was filled with.
// Nearest is deliberate — the source is at most 96x96 and the smallest slot
// is 30 px, and a deterministic integer resampler keeps this path trivially
// auditable against the golden-hash gate (which never exercises it).
bool drawRuntimeStationLogo(Painter& painter, Rect rect, int radius,
                            std::size_t index) {
  if (runtime_logos == nullptr || index >= runtime_logo_count) return false;
  const auto& logo = runtime_logos[index];
  if (logo.pixels == nullptr || logo.width == 0 || logo.height == 0) return false;
  radius = std::min(radius, std::min(rect.width, rect.height) / 2);
  const int radius_squared = radius * radius;
  // Cover, by owner decision: the mark fills the whole block. Every target
  // pixel samples the source scaled by the LARGER axis ratio, centred, so the
  // overflow crops instead of leaving bars. Sources are square cover-crops
  // already, which makes this exact for square slots and a mild centre-crop
  // for the rectangular hero.
  for (int y = 0; y < rect.height; ++y) {
    for (int x = 0; x < rect.width; ++x) {
      if (radius > 0) {
        // Same corner-arc test as fillRoundRect, so the logo edge lands on
        // exactly the pixels the slot fill painted and the frame around it
        // stays visible.
        const int corner_x = x < radius
                                 ? radius - 1 - x
                                 : x >= rect.width - radius
                                       ? x - (rect.width - radius)
                                       : 0;
        const int corner_y = y < radius
                                 ? radius - 1 - y
                                 : y >= rect.height - radius
                                       ? y - (rect.height - radius)
                                       : 0;
        if (corner_x != 0 && corner_y != 0 &&
            corner_x * corner_x + corner_y * corner_y >= radius_squared) {
          continue;
        }
      }
      int source_x;
      int source_y;
      if (rect.width * logo.height >= rect.height * logo.width) {
        source_x = (x * logo.width) / rect.width;
        const int scaled_h = (rect.width * logo.height) / logo.width;
        source_y = ((y + (scaled_h - rect.height) / 2) * logo.width) / rect.width;
      } else {
        source_y = (y * logo.height) / rect.height;
        const int scaled_w = (rect.height * logo.width) / logo.height;
        source_x = ((x + (scaled_w - rect.width) / 2) * logo.height) / rect.height;
      }
      if (source_x < 0) source_x = 0;
      if (source_y < 0) source_y = 0;
      if (source_x >= logo.width) source_x = logo.width - 1;
      if (source_y >= logo.height) source_y = logo.height - 1;
      putPixel(painter.framebuffer, rect.x + x, rect.y + y,
               logo.pixels[source_y * logo.width + source_x]);
    }
  }
  return true;
}

}  // namespace

#if defined(OPEN_RADIO_HAS_LOGO_PACK)
// Blits the baked station logo centred in rect, choosing the mip whose size is
// nearest the rect (no runtime scaling). Returns false when no logo is baked
// for this station so the caller can fall back to the placeholder.
bool drawStationLogo(Painter& painter, Rect rect, std::size_t index) {
  if (index >= generated::kStationLogos.size()) return false;
  const auto& logo = generated::kStationLogos[index];
  if (!logo.present) return false;
  const int target = std::min(rect.width, rect.height);
  std::size_t best = 0;
  for (std::size_t level = 1; level < logo.mips.size(); ++level) {
    const int here = generated::kStationLogoSizes[level] - target;
    const int keep = generated::kStationLogoSizes[best] - target;
    if ((here < 0 ? -here : here) < (keep < 0 ? -keep : keep)) best = level;
  }
  const auto& mip = logo.mips[best];
  const int origin_x = rect.x + (rect.width - mip.width) / 2;
  const int origin_y = rect.y + (rect.height - mip.height) / 2;
  for (std::uint16_t run_index = 0; run_index < mip.run_count; ++run_index) {
    const auto& run = mip.runs[run_index];
    fillRect(painter.framebuffer,
             {origin_x + run.x, origin_y + run.y, run.length, 1},
             mip.palette[run.color]);
  }
  return true;
}
#endif

void drawStationBadge(Painter& painter, const ThemeTokens& theme,
                      const StationTheme& station, Rect bounds,
                      [[maybe_unused]] std::size_t index) {
  fillRoundRect(painter.framebuffer, bounds, 24, station.accent);
  fillRoundRect(painter.framebuffer,
                {bounds.x + 4, bounds.y + 4, bounds.width - 8,
                 bounds.height - 8},
                20, theme.surface);
  // The logo fills the badge INTERIOR — the same rect and rounding as the
  // surface fill above — so the accent ring stays a visible frame around it.
  if (drawRuntimeStationLogo(painter,
                             {bounds.x + 4, bounds.y + 4, bounds.width - 8,
                              bounds.height - 8},
                             20, index)) {
    return;
  }
#if defined(OPEN_RADIO_HAS_LOGO_PACK)
  if (drawStationLogo(painter, bounds, index)) return;
#endif
  fillCircle(painter.framebuffer, bounds.x + bounds.width / 2,
             bounds.y + bounds.height / 2, bounds.width / 3, theme.raised);
  const int center_x = bounds.x + bounds.width / 2;
  const int center_y = bounds.y + bounds.height / 2;
  const int inner_width = bounds.width - 16;
  // Scale the placeholder mark to the badge: pick the heaviest weight that fits
  // the short name (a hero badge earns the display weight), dropping to a
  // single-letter monogram only when even body overflows.
  const FontSize ceiling =
      bounds.width >= 100 ? FontSize::display : FontSize::title;
  std::array<char, 12> label{};
  FontSize size = ceiling;
  bool fits = false;
  for (int level = static_cast<int>(ceiling);
       level >= static_cast<int>(FontSize::body); --level) {
    const auto candidate = static_cast<FontSize>(level);
    if (measureText(station.short_name, candidate) <= inner_width) {
      size = candidate;
      std::snprintf(label.data(), label.size(), "%s", station.short_name);
      fits = true;
      break;
    }
  }
  if (!fits) copyFirstGlyph(station.short_name, label.data(), label.size());
  painter.centered(center_x, center_y - generated::interFace(size).ascent / 2,
                   label.data(), size, theme.text, inner_width);
}

void drawTransport(Painter& painter, const CompactSnapshot& snapshot,
                   const ThemeTokens& theme) {
  fillRect(painter.framebuffer, {0, 184, 320, 56}, theme.surface);
  fillRoundRect(painter.framebuffer, {8, 190, 52, 44}, 14, theme.raised);
  fillRoundRect(painter.framebuffer, {68, 190, 184, 44}, 14, theme.brand);
  fillRoundRect(painter.framebuffer, {260, 190, 52, 44}, 14, theme.raised);
  drawIconMask24(painter.framebuffer, 22, 200, generated::kIconChevronLeft,
                 theme.text);
  drawIconMask24(painter.framebuffer, 274, 200, generated::kIconChevronRight,
                 theme.text);
  painter.centered(160, 201, translated(snapshot, "Stacje", "Stations"),
                   FontSize::body, theme.on_brand, 140);
}

void formatClock(const CompactSnapshot& snapshot, std::array<char, 8>& time,
                 std::array<char, 20>& date) {
  if (!snapshot.clock_valid) {
    std::snprintf(time.data(), time.size(), "--:--");
    std::snprintf(date.data(), date.size(), "%s",
                  snapshot.locale == LocaleMode::pl ? "Czas nieustawiony"
                                                    : "Time not set");
    return;
  }
  std::snprintf(time.data(), time.size(), "%02u:%02u", snapshot.clock_hour,
                snapshot.clock_minute);
  std::snprintf(date.data(), date.size(), "%02u.%02u.%04u",
                snapshot.clock_day, snapshot.clock_month, snapshot.clock_year);
}

void drawNowPlaying(Painter& painter, const CompactSnapshot& snapshot,
                    const ThemeTokens& theme, const StationTheme& station) {
  fill(painter.framebuffer, theme.canvas);
  if (snapshot.variant == HomeVariant::glance) {
    std::array<char, 8> time{};
    std::array<char, 20> date{};
    std::array<char, 10> volume{};
    std::array<char, 16> wifi{};
    formatClock(snapshot, time, date);
    drawStationBadge(painter, theme, station, {10, 10, 72, 72},
                     snapshot.station_index);
    painter.text(94, 22, station.name, FontSize::title, theme.text, 166);
    painter.text(94, 50,
                 snapshot.output == AudioOutput::bluetooth
                     ? translated(snapshot, "Gra przez Bluetooth", "Playing via Bluetooth")
                     : translated(snapshot, "Gra z radia", "Playing locally"),
                 FontSize::caption, theme.muted, 166);
    fillRoundRect(painter.framebuffer, {268, 8, 44, 44}, 14, theme.raised);
    drawIconMask24(painter.framebuffer, 278, 18, generated::kIconMenu2,
                   theme.text);
    // The owner reads this card from across the room: the clock narrows so
    // output, volume and Wi-Fi become three large rows instead of the old
    // thumbnail-sized caption stack.
    fillRoundRect(painter.framebuffer, {12, 86, 150, 80}, 18, theme.surface);
    painter.text(24, 94, time.data(), FontSize::display, theme.text, 126);
    painter.text(24, 144, date.data(), FontSize::caption, theme.muted, 126);
    fillRoundRect(painter.framebuffer, {170, 86, 142, 80}, 18, theme.surface);
    drawIconMask24(painter.framebuffer, 180, 92,
                   snapshot.output == AudioOutput::bluetooth
                       ? generated::kIconBluetooth
                       : generated::kIconCheck,
                   snapshot.output == AudioOutput::bluetooth ? station.accent
                                                              : theme.success);
    painter.text(212, 94,
                 snapshot.output == AudioOutput::bluetooth ? "BT" : "LOCAL",
                 FontSize::title, theme.text, 92);
    std::snprintf(volume.data(), volume.size(), "%u%%", snapshot.volume);
    fillRoundRect(painter.framebuffer, {180, 125, 60, 10}, 5, theme.border);
    fillRoundRect(painter.framebuffer,
                  {180, 125,
                   6 + static_cast<int>(snapshot.volume) * 54 / 100, 10},
                  5, station.accent);
    painter.text(248, 119, volume.data(), FontSize::title, station.accent, 56);
    // Wi-Fi as four quarter-bars plus the exact value beside them.
    for (int bar = 0; bar < 4; ++bar) {
      const int bar_height = 8 + bar * 4;
      fillRoundRect(painter.framebuffer,
                    {180 + bar * 16, 162 - bar_height, 12, bar_height}, 2,
                    snapshot.wifi_strength_percent > bar * 25 ? theme.text
                                                              : theme.border);
    }
    std::snprintf(wifi.data(), wifi.size(), "%u%%",
                  snapshot.wifi_strength_percent);
    painter.text(248, 142, wifi.data(), FontSize::title, theme.text, 56);
    fillRoundRect(painter.framebuffer, {12, 170, 300, 62}, 16, theme.surface);
    painter.text(24, 178, translated(snapshot, "Teraz gra", "Now playing"),
                 FontSize::caption, station.accent, 270);
    drawWrappedText(painter, 24, 198, metadataTitle(snapshot), FontSize::body,
                    theme.text, 272, 2);
    return;
  }

  drawStatusBar(painter, snapshot, theme, station);
  // Hero station logo on the left; the text column breathes to its right.
  drawStationBadge(painter, theme, station, {10, 56, 120, 120},
                   snapshot.station_index);
  fillRoundRect(painter.framebuffer, {268, 34, 44, 44}, 14, theme.raised);
  drawIconMask24(painter.framebuffer, 278, 44, generated::kIconMenu2,
                 theme.text);
  // Long station names get the smaller weight so the full name shows instead
  // of an ellipsis; short names keep the title weight.
  const bool name_fits_title =
      measureText(station.name, FontSize::title) <= 118;
  painter.text(146, name_fits_title ? 58 : 64, station.name,
               name_fits_title ? FontSize::title : FontSize::body, theme.text,
               118);
  fillRoundRect(painter.framebuffer, {146, 90, 166, 62}, 16, theme.surface);
  painter.text(158, 97, translated(snapshot, "Teraz gra", "Now playing"),
               FontSize::caption, theme.muted, 142);
  drawWrappedText(painter, 158, 114, metadataTitle(snapshot), FontSize::body,
                  theme.text, 148, 2);
  fillRoundRect(painter.framebuffer, {146, 158, 166, 24}, 10, theme.raised);
  drawIconMask24(painter.framebuffer, 154, 158,
                 snapshot.output == AudioOutput::bluetooth
                     ? generated::kIconBluetooth
                     : generated::kIconCheck,
                 snapshot.degraded ? theme.warning : theme.success);
  painter.text(186, 161,
               snapshot.degraded
                   ? translated(snapshot, "Odzyskiwanie", "Recovering")
                   : translated(snapshot, "Gra stabilnie", "Playing reliably"),
               FontSize::caption, theme.text, 120);
  drawTransport(painter, snapshot, theme);
}

void drawSettingsGrid(Painter& painter, const CompactSnapshot& snapshot,
                      const ThemeTokens& theme,
                      const std::array<const char*, 6>& labels,
                      const std::array<const char*, 6>& values) {
  for (std::size_t index = 0; index < labels.size(); ++index) {
    if (labels[index] == nullptr) continue;
    const int column = static_cast<int>(index % 2);
    const int row = static_cast<int>(index / 2);
    const int left = 8 + column * 156;
    const int top = 48 + row * 44;
    const bool destructive =
        snapshot.screen == ScreenKind::settings_system && index == 4;
    fillRoundRect(painter.framebuffer, {left, top + 2, 148, 40}, 11,
                  destructive && snapshot.confirm_delete ? theme.danger
                                                          : theme.surface);
    painter.text(left + 10, top + 5, labels[index], FontSize::caption,
                 destructive && snapshot.confirm_delete ? theme.canvas
                                                         : theme.muted,
                 104);
    painter.text(left + 10, top + 21, values[index], FontSize::caption,
                 destructive && snapshot.confirm_delete ? theme.canvas
                                                         : theme.text,
                 104);
    drawIconMask24(painter.framebuffer, left + 116, top + 10,
                   generated::kIconChevronRight,
                   destructive && snapshot.confirm_delete ? theme.canvas
                                                           : theme.muted);
  }
  const std::array<const char*, 3> pages{
      translated(snapshot, "Szybkie", "Quick"),
      translated(snapshot, "System", "System"),
      translated(snapshot, "Ekran", "Display")};
  const int active = snapshot.screen == ScreenKind::settings_quick
                         ? 0
                         : snapshot.screen == ScreenKind::settings_system ? 1 : 2;
  for (int index = 0; index < 3; ++index) {
    const int left = 8 + index * 104;
    fillRoundRect(painter.framebuffer, {left, 190, 96, 44}, 13,
                  index == active ? theme.brand : theme.raised);
    painter.centered(left + 48, 202, pages[static_cast<std::size_t>(index)],
                     FontSize::caption,
                     index == active ? theme.on_brand : theme.text, 82);
  }
}

const char* screenSaverName(const CompactSnapshot& snapshot) {
  switch (snapshot.screensaver_mode) {
    case 1: return "Bars";
    case 2: return "Orbit";
    case 3: return translated(snapshot, "Kot", "Cat");
    default: return "Pulse";
  }
}

void drawSettings(Painter& painter, const CompactSnapshot& snapshot,
                  const ThemeTokens& theme) {
  fill(painter.framebuffer, theme.canvas);
  std::array<char, 40> battery_primary{};
  std::array<char, 48> battery_secondary{};
  if (!snapshot.battery_available) {
    std::snprintf(battery_primary.data(), battery_primary.size(), "%s --",
                  translated(snapshot, "AKU", "BAT"));
    std::snprintf(battery_secondary.data(), battery_secondary.size(), "%s",
                  translated(snapshot, "Brak odczytu", "No reading"));
  } else {
    const auto battery_current =
        static_cast<std::int32_t>(snapshot.battery_current_milliamps);
    const auto battery_current_magnitude = static_cast<unsigned>(
        battery_current < 0 ? -battery_current : battery_current);
    const auto voltage_whole = snapshot.battery_voltage_millivolts / 1000U;
    const auto voltage_fraction =
        (snapshot.battery_voltage_millivolts % 1000U) / 10U;
    std::snprintf(battery_primary.data(), battery_primary.size(),
                  "%s %u%% | %u.%02u V", translated(snapshot, "AKU", "BAT"),
                  static_cast<unsigned>(snapshot.battery_level_percent),
                  static_cast<unsigned>(voltage_whole),
                  static_cast<unsigned>(voltage_fraction));
    if (snapshot.battery_external_power) {
      std::snprintf(
          battery_secondary.data(), battery_secondary.size(), "USB | %s %ld mA",
          snapshot.battery_current_milliamps > 10
              ? translated(snapshot, "ładowanie", "charging")
              : translated(snapshot, "podtrzymanie", "external power"),
          static_cast<long>(battery_current));
    } else if (snapshot.battery_runtime_valid) {
      const auto hours = snapshot.battery_runtime_minutes / 60U;
      const auto minutes = snapshot.battery_runtime_minutes % 60U;
      std::snprintf(
          battery_secondary.data(), battery_secondary.size(), "%s %u mA | ~%u h %02u min",
          translated(snapshot, "Pobór", "Draw"),
          battery_current_magnitude,
          static_cast<unsigned>(hours), static_cast<unsigned>(minutes));
    } else {
      std::snprintf(
          battery_secondary.data(), battery_secondary.size(), "%s %u mA | %s",
          translated(snapshot, "Pobór", "Draw"),
          battery_current_magnitude,
          translated(snapshot, "pomiar czasu", "estimating"));
    }
  }
  painter.text(12, 3, battery_primary.data(), FontSize::body, theme.text, 196);
  painter.text(12, 23, battery_secondary.data(), FontSize::caption, theme.muted,
               196);
  fillRoundRect(painter.framebuffer, {216, 2, 44, 44}, 14, theme.raised);
  drawNoiseGlyph(painter.framebuffer, 238, 24, theme.text, theme.raised);
  fillRoundRect(painter.framebuffer, {268, 2, 44, 44}, 14, theme.raised);
  drawIconMask24(painter.framebuffer, 278, 12, generated::kIconX, theme.text);
  std::array<const char*, 6> labels{};
  std::array<const char*, 6> values{};
  std::array<char, 8> volume{};
  std::array<char, 8> brightness{};
  std::array<char, 12> saver_delay{};
  std::array<char, 12> off_delay{};
  std::snprintf(volume.data(), volume.size(), "%u%%", snapshot.volume);
  std::snprintf(brightness.data(), brightness.size(), "%u%%", snapshot.brightness);
  std::snprintf(saver_delay.data(), saver_delay.size(), "%u min",
                snapshot.screensaver_delay_seconds / 60);
  std::snprintf(off_delay.data(), off_delay.size(), "%u min",
                snapshot.display_off_delay_seconds / 60);
  if (snapshot.screen == ScreenKind::settings_quick) {
    labels = {"Wi-Fi", "Bluetooth", translated(snapshot, "Głośność", "Volume"),
              translated(snapshot, "Jasność", "Brightness"),
              translated(snapshot, "Motyw", "Theme"),
              translated(snapshot, "Język", "Language")};
    values = {snapshot.wifi_online ? translated(snapshot, "Połączono", "Connected")
                                   : translated(snapshot, "Brak sieci", "Offline"),
              snapshot.output == AudioOutput::bluetooth ? "A2DP" : "Radio",
              volume.data(), brightness.data(),
              snapshot.theme == ThemeMode::dark ? translated(snapshot, "Ciemny", "Dark")
                                                : translated(snapshot, "Jasny", "Light"),
              snapshot.locale == LocaleMode::pl ? "Polski" : "English"};
  } else if (snapshot.screen == ScreenKind::settings_system) {
    labels = {translated(snapshot, "Ekran główny", "Home screen"),
              translated(snapshot, "Wi-Fi i sieci", "Wi-Fi & networks"),
              translated(snapshot, "O projekcie", "About"),
              translated(snapshot, "Diagnostyka", "Diagnostics"),
              snapshot.confirm_delete
                  ? translated(snapshot, "Potwierdź", "Confirm")
                  : translated(snapshot, "Wyczyść dane", "Erase data"),
              translated(snapshot, "Konsola", "Console")};
    values = {snapshot.variant == HomeVariant::editorial
                  ? translated(snapshot, "Pełny", "Full")
                  : translated(snapshot, "Minimalny", "Minimal"),
              translated(snapshot, "Zmień", "Change"),
              "Open Radio", "Pro",
              snapshot.confirm_delete ? "RESET"
                                      : translated(snapshot, "Wszystko", "All"),
              snapshot.console_active
                  ? translated(snapshot, "Zamknij", "Close")
                  : translated(snapshot, "Otwórz", "Open")};
  } else {
    labels = {translated(snapshot, "Wygaszacz", "Screensaver"),
              translated(snapshot, "Start po", "Starts after"),
              translated(snapshot, "Tryb", "Mode"),
              translated(snapshot, "Ekran OFF", "Screen off"),
              translated(snapshot, "Wyłącz po", "Turns off"),
              translated(snapshot, "Podgląd", "Preview")};
    values = {snapshot.screensaver_enabled ? translated(snapshot, "Włączony", "On")
                                           : translated(snapshot, "Wyłączony", "Off"),
              saver_delay.data(), screenSaverName(snapshot),
              snapshot.display_off_enabled ? translated(snapshot, "Włączony", "On")
                                           : translated(snapshot, "Wyłączony", "Off"),
              off_delay.data(), translated(snapshot, "Otwórz", "Open")};
  }
  drawSettingsGrid(painter, snapshot, theme, labels, values);
}

void drawNoise(Painter& painter, const CompactSnapshot& snapshot,
               const ThemeTokens& theme) {
  fill(painter.framebuffer, theme.canvas);
  painter.text(12, 8, translated(snapshot, "Szum", "Noise"), FontSize::title,
               theme.text, 150);
  std::array<char, 8> time{};
  std::array<char, 20> date{};
  formatClock(snapshot, time, date);
  painter.text(206, 13, time.data(), FontSize::caption, theme.muted, 52);
  fillRoundRect(painter.framebuffer, {268, 2, 44, 44}, 14, theme.raised);
  drawIconMask24(painter.framebuffer, 278, 12, generated::kIconX, theme.text);

  const auto controlColor = snapshot.noise_playing ? theme.brand : theme.raised;
  const auto controlForeground =
      snapshot.noise_playing ? theme.on_brand : theme.text;
  fillCircle(painter.framebuffer, 160, 102, 52, controlColor);
  if (snapshot.noise_playing) {
    fillRoundRect(painter.framebuffer, {146, 80, 28, 28}, 5,
                  controlForeground);
  } else {
    for (int row = 0; row < 30; ++row) {
      const int half = row < 15 ? row / 2 : (29 - row) / 2;
      fillRect(painter.framebuffer, {148, 79 + row, 10 + half, 1},
               controlForeground);
    }
  }
  painter.centered(160, 122,
                   snapshot.noise_playing ? "STOP" : "PLAY",
                   FontSize::caption, controlForeground, 72);

  const std::array<const char*, 3> polish{{"BIAŁY", "RÓŻOWY", "BRĄZOWY"}};
  const std::array<const char*, 3> english{{"WHITE", "PINK", "BROWN"}};
  for (int index = 0; index < 3; ++index) {
    const int left = 8 + index * 104;
    const bool selected = snapshot.noise_color == index;
    fillRoundRect(painter.framebuffer, {left, 166, 96, 40}, 14,
                  selected ? theme.brand : theme.surface);
    painter.centered(left + 48, 178,
                     translated(snapshot, polish[static_cast<std::size_t>(index)],
                                english[static_cast<std::size_t>(index)]),
                     FontSize::caption,
                     selected ? theme.on_brand : theme.text, 82);
  }
}

void drawStations(Painter& painter, const CompactSnapshot& snapshot,
                  const ThemeTokens& theme, const StationTheme* stations,
                  std::size_t station_count) {
  fill(painter.framebuffer, theme.canvas);
  // By owner decision the picker is nine logo tiles and a way out — no title,
  // no footer bar. The X matches the global top-right close hitbox.
  fillRoundRect(painter.framebuffer, {268, 2, 44, 44}, 14, theme.raised);
  drawIconMask24(painter.framebuffer, 278, 12, generated::kIconX, theme.text);
  // Centred 3x3 grid. The controller and the hitbox contract share the same
  // 72 px touch pitch from origin (52, 12); tiles sit 4 px inside each cell.
  constexpr int kTile = 64;
  constexpr int kTileRadius = 16;
  constexpr int kPitch = 72;
  for (std::size_t index = 0; index < station_count; ++index) {
    const int column = static_cast<int>(index % 3);
    const int row = static_cast<int>(index / 3);
    const int left = 56 + column * kPitch;
    const int top = 16 + row * kPitch;
    const auto& item = stations[index];
    const bool selected = index == snapshot.station_index;
    Rect slot{left, top, kTile, kTile};
    int slot_radius = kTileRadius;
    if (selected) {
      // Accent ring around the playing station; the logo sits inside it.
      fillRoundRect(painter.framebuffer, {left, top, kTile, kTile},
                    kTileRadius, item.accent);
      slot = {left + 3, top + 3, kTile - 6, kTile - 6};
      slot_radius = kTileRadius - 3;
      fillRoundRect(painter.framebuffer, slot, slot_radius, theme.raised);
    } else {
      fillRoundRect(painter.framebuffer, slot, slot_radius, theme.surface);
    }
    bool drew_logo = drawRuntimeStationLogo(painter, slot, slot_radius, index);
#if defined(OPEN_RADIO_HAS_LOGO_PACK)
    if (!drew_logo) drew_logo = drawStationLogo(painter, slot, index);
#endif
    if (!drew_logo) {
      // Monogram chip. The selected tile keeps its raised interior so the
      // accent ring stays visible — an accent chip inside an accent ring
      // would erase the selection.
      if (!selected) fillRoundRect(painter.framebuffer, slot, slot_radius, item.accent);
      std::array<char, 5> initial{};
      copyFirstGlyph(item.short_name, initial.data(), initial.size());
      painter.centered(left + kTile / 2,
                       top + kTile / 2 -
                           generated::interFace(FontSize::display).ascent / 2,
                       initial.data(), FontSize::display,
                       selected ? item.accent : item.on_accent, kTile);
    }
  }
}




void drawCat(Painter& painter, const CompactSnapshot& snapshot,
             const ThemeTokens& theme, const StationTheme& station) {
  constexpr std::array<std::uint16_t, 4> palette{{
      rgb565(38, 42, 47), rgb565(92, 100, 109), rgb565(151, 160, 170),
      rgb565(218, 224, 229)}};
  constexpr int scale = 3;
  const int bob = snapshot.animation_frame % 16 < 8 ? 0 : 1;
  const int origin_x = (kScreenWidth - generated::kKiaraWidth * scale) / 2;
  const int origin_y = 38 + bob;
  fillRoundRect(painter.framebuffer, {58, 38, 204, 170}, 28, theme.surface);
  fillRoundRect(painter.framebuffer, {62, 42, 196, 162}, 24, theme.canvas);
  for (const auto& run : generated::kKiaraRuns) {
    fillRect(painter.framebuffer,
             {origin_x + run.x * scale, origin_y + run.y * scale,
              run.length * scale, scale},
             palette[run.color]);
  }
  painter.text(12, 10, "Kiara", FontSize::title, theme.text, 220);
  painter.centered(160, 218, metadataTitle(snapshot), FontSize::caption,
                   theme.muted, 286);
  fillRoundRect(painter.framebuffer, {12, 36, 44, 5}, 2, station.accent);
}

void drawPercentControl(Painter& painter, const CompactSnapshot& snapshot,
                        const ThemeTokens& theme,
                        const char* title, std::uint8_t value) {
  fill(painter.framebuffer, theme.canvas);
  drawUtilityHeader(painter, theme, title);
  std::array<char, 8> percentage{};
  std::snprintf(percentage.data(), percentage.size(), "%u%%", value);
  painter.centered(160, 58, percentage.data(), FontSize::display, theme.text,
                   180);
  fillRoundRect(painter.framebuffer, {24, 119, 272, 14}, 7, theme.border);
  const int width = static_cast<int>(value) * 272 / 100;
  fillRoundRect(painter.framebuffer, {24, 119, width, 14}, 7, theme.brand);
  fillCircle(painter.framebuffer, 24 + width, 126, 12, theme.text);
  fillRoundRect(painter.framebuffer, {8, 190, 88, 44}, 14, theme.raised);
  fillRoundRect(painter.framebuffer, {104, 190, 112, 44}, 14, theme.surface);
  fillRoundRect(painter.framebuffer, {224, 190, 88, 44}, 14, theme.brand);
  painter.centered(52, 199, "-", FontSize::title, theme.text, 56);
  painter.centered(160, 201, translated(snapshot, "Gotowe", "Done"),
                   FontSize::body, theme.text, 88);
  painter.centered(268, 199, "+", FontSize::title, theme.on_brand, 56);
}

void drawScreensaver(Painter& painter, const CompactSnapshot& snapshot,
                     const ThemeTokens& theme, const StationTheme& station) {
  fill(painter.framebuffer, theme.canvas);
  if (snapshot.screen == ScreenKind::screensaver_cat) {
    drawCat(painter, snapshot, theme, station);
    return;
  }
  painter.text(12, 10, station.name, FontSize::title, theme.text, 230);
  if (snapshot.screen == ScreenKind::screensaver_bars) {
    constexpr std::array<int, 12> base{{32, 52, 78, 96, 68, 44, 84, 112, 92, 60, 38, 72}};
    for (std::size_t index = 0; index < base.size(); ++index) {
      const int phase = (snapshot.animation_frame + index) % 6;
      const int height = std::max(18, base[index] - phase * 5);
      fillRoundRect(painter.framebuffer,
                    {34 + static_cast<int>(index) * 22, 182 - height, 12,
                     height},
                    6, index % 3 == 0 ? station.accent_alt : station.accent);
    }
  } else if (snapshot.screen == ScreenKind::screensaver_orbit) {
    const int pulse = snapshot.animation_frame % 6;
    fillCircle(painter.framebuffer, 160, 120, 74 + pulse, theme.raised);
    fillCircle(painter.framebuffer, 160, 120, 58, theme.canvas);
    fillCircle(painter.framebuffer, 160, 120, 28, station.accent);
    painter.centered(160, 108, station.short_name, FontSize::body,
                     station.on_accent, 48);
  } else {
    const int pulse = snapshot.animation_frame % 8;
    fillCircle(painter.framebuffer, 160, 120, 72 + pulse, theme.raised);
    fillCircle(painter.framebuffer, 160, 120, 50 + pulse / 2, theme.canvas);
    fillCircle(painter.framebuffer, 160, 120, 28, station.accent);
    painter.centered(160, 108, station.short_name, FontSize::body,
                     station.on_accent, 48);
  }
  painter.centered(160, 214, metadataTitle(snapshot), FontSize::caption,
                   theme.muted, 286);
}

void drawStateScreen(Painter& painter, const CompactSnapshot& snapshot,
                     const ThemeTokens& theme, const StationTheme& station,
                     const char* polish_title, const char* english_title,
                     const char* polish_detail, const char* english_detail,
                     std::uint16_t, const char* polish_action,
                     const char* english_action) {
  fill(painter.framebuffer, theme.canvas);
  drawUtilityHeader(painter, theme, "Open Radio");
  fillRoundRect(painter.framebuffer, {16, 54, 288, 116}, 18, theme.surface);
  painter.text(32, 66, translated(snapshot, polish_title, english_title),
               FontSize::title, theme.text, 252);
  painter.text(32, 94, station.name, FontSize::caption, station.accent, 252);
  drawWrappedText(painter, 32, 116,
                  translated(snapshot, polish_detail, english_detail),
                  FontSize::body, theme.text, 252, 2);
  fillRoundRect(painter.framebuffer, {8, 190, 304, 44}, 14, theme.brand);
  painter.centered(160, 201, translated(snapshot, polish_action, english_action),
                   FontSize::body, theme.on_brand, 270);
}

void drawWifiStatus(Painter& painter, const CompactSnapshot& snapshot,
                    const ThemeTokens& theme, const StationTheme& station) {
  fill(painter.framebuffer, theme.canvas);
  if (snapshot.console_active) {
    // Console session: the QR is the interface — the firmware overlays the
    // real code (http://<address>/) on the white canvas, mirroring the
    // provisioning QR geometry, so any phone camera lands on the picker
    // without typing anything.
    painter.text(8, 8, translated(snapshot, "Konsola", "Console"),
                 FontSize::caption, theme.muted, 112);
    painter.text(8, 30, translated(snapshot, "Stacje", "Stations"),
                 FontSize::body, theme.text, 112);
    painter.text(8, 56,
                 snapshot.device_address != nullptr ? snapshot.device_address
                                                    : "",
                 FontSize::caption, theme.brand, 112);
    painter.text(8, 78, translated(snapshot, "1. Skanuj QR", "1. Scan QR"),
                 FontSize::caption, theme.text, 112);
    painter.text(8, 100,
                 translated(snapshot, "2. Wybierz stacje", "2. Pick stations"),
                 FontSize::caption, theme.text, 112);
    painter.text(8, 122, translated(snapshot, "3. Zapisz", "3. Save"),
                 FontSize::caption, theme.text, 112);
    painter.text(8, 152,
                 translated(snapshot, "Radio wróci samo", "Radio resumes"),
                 FontSize::caption, theme.muted, 112);
    fillRect(painter.framebuffer, {128, 4, 184, 184}, rgb565(255, 255, 255));
    painter.centered(220, 84, "QR", FontSize::title, rgb565(0, 0, 0), 120);
    fillRoundRect(painter.framebuffer, {8, 190, 304, 44}, 14, theme.brand);
    painter.centered(160, 201,
                     translated(snapshot, "Zamknij konsolę", "Close console"),
                     FontSize::body, theme.on_brand, 270);
    return;
  }
  drawUtilityHeader(painter, theme, "Wi-Fi");
  fillRoundRect(painter.framebuffer, {16, 54, 288, 116}, 18, theme.surface);
  painter.text(32, 66,
               translated(snapshot,
                          snapshot.wifi_online ? "Wi-Fi połączone"
                                               : "Brak Wi-Fi",
                          snapshot.wifi_online ? "Wi-Fi connected"
                                               : "Wi-Fi unavailable"),
               FontSize::title, theme.text, 252);
  const bool has_address = snapshot.wifi_online &&
                           snapshot.device_address != nullptr &&
                           snapshot.device_address[0] != '\0';
  if (has_address) {
    // The address is the way into the device console: mDNS name first, the
    // raw IP as the fallback for networks without mDNS.
    painter.text(32, 98, "http://open-radio.local", FontSize::body,
                 station.accent, 252);
    std::array<char, 48> address{};
    std::snprintf(address.data(), address.size(), "IP: %s",
                  snapshot.device_address);
    painter.text(32, 124, address.data(), FontSize::body, theme.text, 252);
    painter.text(32, 148,
                 translated(snapshot, "Otwórz w przeglądarce w tej samej sieci.",
                            "Open in a browser on the same network."),
                 FontSize::caption, theme.muted, 252);
  } else {
    painter.text(32, 98, station.name, FontSize::caption, station.accent, 252);
    drawWrappedText(painter, 32, 122,
                    translated(snapshot,
                               snapshot.wifi_online
                                   ? "Znana sieć działa. Możesz lokalnie dodać kolejną."
                                   : "Brak połączenia. Otwórz lokalną konfigurację.",
                               snapshot.wifi_online
                                   ? "The known network works. You can add another locally."
                                   : "No connection. Open local setup."),
                    FontSize::body, theme.text, 252, 2);
  }
  fillRoundRect(painter.framebuffer, {8, 190, 304, 44}, 14, theme.brand);
  painter.centered(160, 201,
                   translated(snapshot, "Dodaj sieć Wi-Fi", "Add Wi-Fi network"),
                   FontSize::body, theme.on_brand, 270);
}

void drawBluetoothPairing(Painter& painter, const CompactSnapshot& snapshot,
                          const ThemeTokens& theme) {
  fill(painter.framebuffer, theme.canvas);
  drawUtilityHeader(painter, theme, "Bluetooth");
  fillRoundRect(painter.framebuffer, {8, 56, 304, 112}, 18, theme.surface);
  drawIconMask24(painter.framebuffer, 24, 78, generated::kIconBluetooth,
                 theme.brand);
  const char* title = translated(snapshot, "Gotowy do skanowania", "Ready to scan");
  const char* detail = translated(snapshot, "Wyszukaj głośnik A2DP z kodekiem SBC.",
                                  "Find an A2DP speaker using SBC.");
  const char* action = translated(snapshot, "Skanuj głośniki", "Scan speakers");
  std::uint16_t actionColor = theme.brand;
  if (snapshot.bluetooth_state == BluetoothState::scanning) {
    title = translated(snapshot, "Szukam głośników…", "Scanning for speakers…");
    detail = translated(snapshot, "Skan Bluetooth Classic A2DP jest aktywny.",
                        "Bluetooth Classic A2DP scan is active.");
    action = translated(snapshot, "Skanowanie…", "Scanning…");
    actionColor = theme.raised;
  } else if (snapshot.bluetooth_state == BluetoothState::found) {
    title = snapshot.bluetooth_candidate_name != nullptr &&
                    snapshot.bluetooth_candidate_name[0] != '\0'
                ? snapshot.bluetooth_candidate_name
                : translated(snapshot, "Znaleziono głośnik", "Speaker found");
    detail = translated(snapshot, "A2DP · SBC · znaleziony", "A2DP · SBC · found");
    action = translated(snapshot, "Łączę automatycznie…", "Connecting automatically…");
    actionColor = theme.raised;
  } else if (snapshot.bluetooth_state == BluetoothState::connecting) {
    title = snapshot.bluetooth_candidate_name != nullptr &&
                    snapshot.bluetooth_candidate_name[0] != '\0'
                ? snapshot.bluetooth_candidate_name
                : translated(snapshot, "Łączenie", "Connecting");
    detail = translated(snapshot, "Łączę głośnik przez A2DP.",
                        "Connecting the speaker over A2DP.");
    action = translated(snapshot, "Łączenie…", "Connecting…");
    actionColor = theme.raised;
  } else if (snapshot.bluetooth_state == BluetoothState::connected) {
    title = snapshot.bluetooth_candidate_name != nullptr &&
                    snapshot.bluetooth_candidate_name[0] != '\0'
                ? snapshot.bluetooth_candidate_name
                : translated(snapshot, "Głośnik połączony", "Speaker connected");
    detail = translated(snapshot,
                        snapshot.bluetooth_remembered
                            ? "A2DP · SBC · zapamiętany"
                            : "A2DP · SBC · połączony",
                        snapshot.bluetooth_remembered
                            ? "A2DP · SBC · remembered"
                            : "A2DP · SBC · connected");
    action = translated(snapshot, "Skanuj ponownie", "Scan again");
  } else if (snapshot.bluetooth_state == BluetoothState::error) {
    title = translated(snapshot, "Nie znaleziono głośnika", "No speaker found");
    detail = translated(snapshot, "Głośnik radia nadal działa. Możesz ponowić skan.",
                        "The radio speaker still works. You can retry the scan.");
    action = translated(snapshot, "Spróbuj ponownie", "Try again");
  }
  painter.text(64, 70, title, FontSize::title, theme.text, 230);
  drawWrappedText(painter, 64, 106, detail, FontSize::body, theme.muted, 226, 2);
  if (snapshot.bluetooth_remembered &&
      snapshot.bluetooth_state == BluetoothState::connected) {
    painter.text(64, 146, translated(snapshot, "ZAPAMIĘTANY", "REMEMBERED"),
                 FontSize::caption, theme.success, 120);
  }
  fillRoundRect(painter.framebuffer, {8, 190, 304, 44}, 14, actionColor);
  painter.centered(160, 201, action, FontSize::body,
                   actionColor == theme.brand ? theme.on_brand : theme.muted,
                   270);
}

void drawOnboarding(Painter& painter, const CompactSnapshot& snapshot,
                    const ThemeTokens& theme,
                    const char* step, const char* polish_title,
                    const char* english_title, const char* polish_detail,
                    const char* english_detail, const char* polish_secondary,
                    const char* english_secondary, const char* polish_primary,
                    const char* english_primary) {
  fill(painter.framebuffer, theme.canvas);
  painter.text(12, 10, "Open Radio", FontSize::body, theme.muted, 180);
  painter.text(276, 10, step, FontSize::caption, theme.muted, 36);
  fillRoundRect(painter.framebuffer, {12, 58, 88, 92}, 24, theme.surface);
  drawIconMask24(painter.framebuffer, 44, 92, generated::kIconCheck,
                 theme.brand);
  painter.text(116, 62, translated(snapshot, polish_title, english_title),
               FontSize::title, theme.text, 190);
  drawWrappedText(painter, 116, 92,
                  translated(snapshot, polish_detail, english_detail),
                  FontSize::body, theme.muted, 186, 2);
  if (snapshot.setup_access_code != nullptr &&
      snapshot.setup_access_code[0] != '\0') {
    fillRoundRect(painter.framebuffer, {116, 136, 186, 36}, 12, theme.raised);
    painter.text(126, 145,
                 translated(snapshot, "Kod Wi-Fi", "Wi-Fi code"),
                 FontSize::caption, theme.muted, 62);
    painter.text(190, 145, snapshot.setup_access_code, FontSize::caption,
                 theme.text, 102);
  }
  fillRoundRect(painter.framebuffer, {8, 190, 96, 44}, 14, theme.raised);
  painter.centered(56, 202,
                   translated(snapshot, polish_secondary, english_secondary),
                   FontSize::caption, theme.text, 78);
  fillRoundRect(painter.framebuffer, {112, 190, 200, 44}, 14, theme.brand);
  painter.centered(212, 201,
                   translated(snapshot, polish_primary, english_primary),
                   FontSize::body, theme.on_brand, 166);
}

void drawWifiQrScreen(Painter& painter, const CompactSnapshot& snapshot,
                      const ThemeTokens& theme) {
  const bool onboarding = snapshot.screen == ScreenKind::onboarding_wifi;
  fill(painter.framebuffer, theme.canvas);
  painter.text(8, 8, onboarding ? "1/3" : "Wi-Fi", FontSize::caption,
               theme.muted, 112);
  painter.text(8, 30,
               onboarding
                   ? translated(snapshot, "Połącz telefon", "Connect phone")
                   : translated(snapshot, "Dodaj sieć", "Add network"),
               FontSize::body, theme.text, 112);
  painter.text(8, 52, "OpenRadio-Setup", FontSize::caption, theme.brand, 112);
  painter.text(8, 68,
               translated(snapshot, "1. Skanuj QR", "1. Scan QR"),
               FontSize::caption, theme.text, 112);
  painter.text(8, 90,
               translated(snapshot, "2. Połącz", "2. Join"),
               FontSize::caption, theme.text, 112);
  painter.text(8, 112,
               translated(snapshot, "3. Wybierz Wi-Fi", "3. Choose Wi-Fi"),
               FontSize::caption, theme.text, 112);
  painter.text(8, 144,
               translated(snapshot, "Kod awaryjny", "Backup code"),
               FontSize::caption, theme.muted, 112);
  drawWrappedText(
      painter, 8, 162,
      snapshot.setup_access_code != nullptr ? snapshot.setup_access_code : "",
      FontSize::caption, theme.text, 112, 2);
  fillRect(painter.framebuffer, {128, 4, 184, 184}, rgb565(255, 255, 255));
  painter.centered(220, 84, "QR", FontSize::title, rgb565(0, 0, 0), 120);
  if (onboarding) {
    fillRoundRect(painter.framebuffer, {8, 190, 96, 44}, 14, theme.raised);
    painter.centered(56, 202, translated(snapshot, "Język", "Language"),
                     FontSize::caption, theme.text, 78);
    const std::uint16_t continueColor =
        snapshot.wifi_online ? theme.brand : theme.raised;
    fillRoundRect(painter.framebuffer, {112, 190, 200, 44}, 14, continueColor);
    painter.centered(
        212, 201,
        snapshot.wifi_online
            ? translated(snapshot, "Dalej", "Continue")
            : translated(snapshot, "Czekaj", "Wait"),
        FontSize::body,
        snapshot.wifi_online ? theme.on_brand : theme.muted, 166);
    return;
  }
  fillRoundRect(painter.framebuffer, {8, 190, 148, 44}, 14, theme.brand);
  fillRoundRect(painter.framebuffer, {164, 190, 148, 44}, 14, theme.raised);
  painter.centered(82, 201, translated(snapshot, "Nowy kod QR", "New QR code"),
                   FontSize::caption, theme.on_brand, 122);
  painter.centered(238, 201,
                   snapshot.wifi_online
                       ? translated(snapshot, "Zamknij", "Close")
                       : translated(snapshot, "Czekam", "Waiting"),
                   FontSize::caption,
                   snapshot.wifi_online ? theme.text : theme.muted, 122);
}

RenderResult invalidResult(RenderStatus status) { return {status, 0, 0}; }

}  // namespace

bool isValid(FramebufferView framebuffer) {
  std::size_t required = 0;
  return requiredPixels(framebuffer, required);
}

bool fill(FramebufferView framebuffer, std::uint16_t color) {
  std::size_t required = 0;
  if (!requiredPixels(framebuffer, required)) return false;
  std::fill_n(framebuffer.pixels, required, color);
  return true;
}

bool fillRect(FramebufferView framebuffer, Rect rect, std::uint16_t color) {
  if (!isValid(framebuffer)) return false;
  if (rect.width <= 0 || rect.height <= 0) return true;
  const auto raw_right = static_cast<std::int64_t>(rect.x) + rect.width;
  const auto raw_bottom = static_cast<std::int64_t>(rect.y) + rect.height;
  const int left = std::max(0, rect.x);
  const int top = std::max(0, rect.y);
  const int right = static_cast<int>(
      std::min<std::int64_t>(framebuffer.width, raw_right));
  const int bottom = static_cast<int>(
      std::min<std::int64_t>(framebuffer.height, raw_bottom));
  if (left >= right || top >= bottom) return true;
  for (int y = top; y < bottom; ++y) {
    auto* row = framebuffer.pixels + static_cast<std::size_t>(y) *
                                         static_cast<std::size_t>(framebuffer.width);
    std::fill(row + left, row + right, color);
  }
  return true;
}

bool fillRoundRect(FramebufferView framebuffer, Rect rect, int radius,
                   std::uint16_t color) {
  if (!isValid(framebuffer) || radius < 0) return false;
  if (rect.width <= 0 || rect.height <= 0) return true;
  radius = std::min(radius, std::min(rect.width, rect.height) / 2);
  if (radius == 0) return fillRect(framebuffer, rect, color);
  const int radius_squared = radius * radius;
  for (int y = std::max(0, rect.y);
       y < std::min(framebuffer.height, rect.y + rect.height); ++y) {
    for (int x = std::max(0, rect.x);
         x < std::min(framebuffer.width, rect.x + rect.width); ++x) {
      const int local_x = x - rect.x;
      const int local_y = y - rect.y;
      const int corner_x = local_x < radius
                               ? radius - 1 - local_x
                               : local_x >= rect.width - radius
                                     ? local_x - (rect.width - radius)
                                     : 0;
      const int corner_y = local_y < radius
                               ? radius - 1 - local_y
                               : local_y >= rect.height - radius
                                     ? local_y - (rect.height - radius)
                                     : 0;
      if (corner_x == 0 || corner_y == 0 ||
          corner_x * corner_x + corner_y * corner_y < radius_squared) {
        putPixel(framebuffer, x, y, color);
      }
    }
  }
  return true;
}

bool drawIconMask24(FramebufferView framebuffer, int x, int y,
                    const IconMask24& mask, std::uint16_t color) {
  if (!isValid(framebuffer)) return false;
  for (int row = 0; row < 24; ++row) {
    const auto bits = mask.rows[static_cast<std::size_t>(row)];
    for (int column = 0; column < 24; ++column) {
      if ((bits & (1U << static_cast<unsigned>(column))) != 0U) {
        putPixel(framebuffer, x + column, y + row, color);
      }
    }
  }
  return true;
}

int measureText(const char* value, FontSize size) {
  if (value == nullptr) return 0;
  const auto& face = generated::interFace(size);
  const auto* cursor = reinterpret_cast<const unsigned char*>(value);
  int width = 0;
  while (*cursor != 0U) width += glyphFor(face, decodeUtf8(cursor)).advance;
  return width;
}

TextRenderResult drawText(FramebufferView framebuffer, int x, int y,
                          const char* value, FontSize size,
                          std::uint16_t color, int maximum_width,
                          bool ellipsize) {
  if (!isValid(framebuffer) || value == nullptr || maximum_width < 0) {
    return {false, false, 0};
  }
  const auto& face = generated::interFace(size);
  const int full_width = measureText(value, size);
  const bool truncated = full_width > maximum_width;
  const auto& ellipsis = glyphFor(face, 0x2026U);
  const int content_limit = truncated && ellipsize
                                ? std::max(0, maximum_width - ellipsis.advance)
                                : maximum_width;
  const auto* cursor = reinterpret_cast<const unsigned char*>(value);
  int drawn_width = 0;
  while (*cursor != 0U) {
    const auto codepoint = decodeUtf8(cursor);
    const auto& glyph = glyphFor(face, codepoint);
    if (drawn_width + glyph.advance > content_limit) break;
    drawGlyph(framebuffer, x + drawn_width, y, face, glyph, color);
    drawn_width += glyph.advance;
  }
  if (truncated && ellipsize && drawn_width + ellipsis.advance <= maximum_width) {
    drawGlyph(framebuffer, x + drawn_width, y, face, ellipsis, color);
    drawn_width += ellipsis.advance;
  }
  return {true, truncated, drawn_width};
}

std::uint64_t hashFramebuffer(FramebufferView framebuffer) {
  std::size_t required = 0;
  if (!requiredPixels(framebuffer, required)) return 0;
  std::uint64_t hash = kFnvOffset;
  for (std::size_t index = 0; index < required; ++index) {
    const auto pixel = framebuffer.pixels[index];
    hash ^= static_cast<std::uint8_t>(pixel >> 8U);
    hash *= kFnvPrime;
    hash ^= static_cast<std::uint8_t>(pixel & 0xffU);
    hash *= kFnvPrime;
  }
  return hash;
}

RenderResult renderNowPlaying(FramebufferView framebuffer,
                              const CompactSnapshot& snapshot,
                              const StationTheme* stations,
                              std::size_t station_count) {
  if (!isValid(framebuffer)) return invalidResult(RenderStatus::invalid_buffer);
  if (framebuffer.width != generated::kWidth ||
      framebuffer.height != generated::kHeight) {
    return invalidResult(RenderStatus::invalid_dimensions);
  }
  if (stations == nullptr || snapshot.station_index >= station_count ||
      snapshot.requested_station_index >= station_count) {
    return invalidResult(RenderStatus::invalid_station);
  }
  Painter painter{framebuffer};
  const auto& station = stations[snapshot.station_index];
  const auto& theme = generated::themeFor(snapshot.theme);
  drawNowPlaying(painter, snapshot, theme, station);
  return {RenderStatus::ok, hashFramebuffer(framebuffer), painter.truncated};
}

void setRuntimeStationLogos(const RuntimeStationLogo* logos, std::size_t count) {
  runtime_logos = logos;
  runtime_logo_count = logos == nullptr ? 0 : count;
}

RenderResult renderScreen(FramebufferView framebuffer,
                          const CompactSnapshot& snapshot,
                          const StationTheme* stations,
                          std::size_t station_count) {
  if (snapshot.screen == ScreenKind::now_playing_editorial ||
      snapshot.screen == ScreenKind::now_playing_glance) {
    auto home = snapshot;
    home.variant = snapshot.screen == ScreenKind::now_playing_glance
                       ? HomeVariant::glance
                       : HomeVariant::editorial;
    return renderNowPlaying(framebuffer, home, stations, station_count);
  }
  if (!isValid(framebuffer)) return invalidResult(RenderStatus::invalid_buffer);
  if (framebuffer.width != generated::kWidth ||
      framebuffer.height != generated::kHeight) {
    return invalidResult(RenderStatus::invalid_dimensions);
  }
  if (stations == nullptr || snapshot.station_index >= station_count) {
    return invalidResult(RenderStatus::invalid_station);
  }
  Painter painter{framebuffer};
  const auto& station = stations[snapshot.station_index];
  const auto& theme = generated::themeFor(snapshot.theme);

  if (snapshot.screen == ScreenKind::display_off) {
    fill(framebuffer, 0x0000);
  } else if (snapshot.screen == ScreenKind::screensaver_pulse ||
             snapshot.screen == ScreenKind::screensaver_bars ||
             snapshot.screen == ScreenKind::screensaver_orbit ||
             snapshot.screen == ScreenKind::screensaver_cat) {
    drawScreensaver(painter, snapshot, theme, station);
  } else if (snapshot.screen == ScreenKind::stations) {
    drawStations(painter, snapshot, theme, stations, station_count);
  } else if (snapshot.screen == ScreenKind::volume_control) {
    drawPercentControl(painter, snapshot, theme,
                       translated(snapshot, "Głośność", "Volume"),
                       snapshot.volume);
  } else if (snapshot.screen == ScreenKind::brightness_control) {
    drawPercentControl(painter, snapshot, theme,
                       translated(snapshot, "Jasność", "Brightness"),
                       snapshot.brightness);
  } else if (snapshot.screen == ScreenKind::settings_quick ||
             snapshot.screen == ScreenKind::settings_system ||
             snapshot.screen == ScreenKind::settings_display) {
    drawSettings(painter, snapshot, theme);
  } else if (snapshot.screen == ScreenKind::noise) {
    drawNoise(painter, snapshot, theme);
  } else if (snapshot.screen == ScreenKind::wifi_status) {
    if (snapshot.wifi_portal_active) {
      drawWifiQrScreen(painter, snapshot, theme);
    } else {
      drawWifiStatus(painter, snapshot, theme, station);
    }
  } else if (snapshot.screen == ScreenKind::wifi_recovery) {
    drawStateScreen(painter, snapshot, theme, station, "Brak Wi-Fi",
                    "Wi-Fi unavailable", "Wracam do znanej sieci. Radio zrobi to automatycznie.",
                    "Returning to a known network automatically.", theme.warning,
                    "Spróbuj teraz", "Try now");
  } else if (snapshot.screen == ScreenKind::bluetooth_fallback) {
    drawStateScreen(painter, snapshot, theme, station, "Brak Bluetooth",
                    "Bluetooth lost", "Dźwięk automatycznie wrócił na głośnik radia.",
                    "Audio automatically returned to the radio speaker.",
                    theme.success, "Rozumiem", "OK");
  } else if (snapshot.screen == ScreenKind::unsupported) {
    drawStateScreen(painter, snapshot, theme, station, "Format niewspierany",
                    "Format not supported", "Ta stacja wymaga HLS lub HE-AAC.",
                    "This station requires HLS or HE-AAC.", theme.warning,
                    "Wybierz stację MP3", "Choose an MP3 station");
  } else if (snapshot.screen == ScreenKind::safe_mode) {
    drawStateScreen(painter, snapshot, theme, station, "Tryb bezpieczny",
                    "Safe mode", "Konfiguracja wymaga lokalnej naprawy.",
                    "Configuration requires local repair.", theme.danger,
                    "Diagnostyka", "Diagnostics");
  } else if (snapshot.screen == ScreenKind::onboarding_wifi) {
    drawWifiQrScreen(painter, snapshot, theme);
  } else if (snapshot.screen == ScreenKind::onboarding_first_sound) {
    drawOnboarding(painter, snapshot, theme, "2/3", "Radio już gra",
                   "Radio is playing", "Najpierw sprawdzamy lokalny głośnik.",
                   "The local speaker is checked first.", "Wstecz", "Back",
                   "Dalej", "Continue");
  } else if (snapshot.screen == ScreenKind::onboarding_bluetooth) {
    drawOnboarding(painter, snapshot, theme, "3/3", "Bluetooth opcjonalny",
                   "Bluetooth optional", "Możesz zostać przy głośniku radia.",
                   "You can keep using the radio speaker.", "Bez BT", "No BT",
                   "Paruj", "Pair");
  } else if (snapshot.screen == ScreenKind::bluetooth_pairing) {
    drawBluetoothPairing(painter, snapshot, theme);
  } else if (snapshot.screen == ScreenKind::diagnostics) {
    fill(framebuffer, theme.canvas);
    drawUtilityHeader(painter, theme,
                      translated(snapshot, "Diagnostyka", "Diagnostics"));
    constexpr std::array<const char*, 3> polish{{"Konfiguracja", "Katalog stacji",
                                                 "Wi-Fi i Bluetooth"}};
    constexpr std::array<const char*, 3> english{{"Configuration", "Station catalog",
                                                  "Wi-Fi and Bluetooth"}};
    for (std::size_t index = 0; index < polish.size(); ++index) {
      const int top = 54 + static_cast<int>(index) * 42;
      fillRoundRect(framebuffer, {8, top, 304, 38}, 11, theme.surface);
      painter.text(20, top + 10, translated(snapshot, polish[index], english[index]),
                   FontSize::body, theme.text, 210);
      painter.text(260, top + 11, "PASS", FontSize::caption, theme.success, 42);
    }
    fillRoundRect(framebuffer, {8, 190, 304, 44}, 14, theme.raised);
    painter.centered(160, 201, translated(snapshot, "Wstecz", "Back"),
                     FontSize::body, theme.text, 270);
  } else if (snapshot.screen == ScreenKind::about) {
    fill(framebuffer, theme.canvas);
    drawUtilityHeader(painter, theme,
                      translated(snapshot, "Panel aplikacji", "Application panel"));
    fillRoundRect(framebuffer, {8, 56, 304, 112}, 18, theme.surface);
    fillRoundRect(framebuffer, {22, 70, 64, 64}, 18, theme.brand);
    painter.centered(54, 86, "A2", FontSize::title, theme.on_brand, 48);
    painter.text(104, 66, "Open Radio Core2", FontSize::title, theme.text, 194);
    painter.text(104, 96, "Test build · no telemetry", FontSize::caption,
                 theme.success, 194);
    painter.text(104, 116, "Hardware: not verified", FontSize::caption,
                 theme.warning, 194);
    painter.text(104, 136, "fiedoruk.pl", FontSize::caption, theme.muted, 120);
    fillRoundRect(framebuffer, {8, 190, 304, 44}, 14, theme.raised);
    painter.centered(160, 201, translated(snapshot, "Diagnostyka", "Diagnostics"),
                     FontSize::body, theme.text, 270);
  } else if (snapshot.screen == ScreenKind::market) {
    fill(framebuffer, theme.canvas);
    drawUtilityHeader(painter, theme,
                      translated(snapshot, "Region i stacje", "Region and stations"));
    constexpr std::array<const char*, 4> polish{{"Region", "Kraj", "Stacje", "Języki"}};
    constexpr std::array<const char*, 4> english{{"Region", "Country", "Stations", "Languages"}};
    constexpr std::array<const char*, 4> values{{"Cała Polska", "PL", "9", "PL · EN"}};
    for (std::size_t index = 0; index < polish.size(); ++index) {
      const int top = 52 + static_cast<int>(index) * 31;
      painter.text(20, top, translated(snapshot, polish[index], english[index]),
                   FontSize::body, theme.text, 124);
      painter.text(188, top, values[index], FontSize::body,
                   index == 0 ? theme.brand : theme.muted, 110);
    }
    fillRoundRect(framebuffer, {8, 190, 304, 44}, 14, theme.raised);
    painter.centered(160, 201, translated(snapshot, "Wbudowane lokalnie", "Embedded locally"),
                     FontSize::body, theme.text, 270);
  }
  return {RenderStatus::ok, hashFramebuffer(framebuffer), painter.truncated};
}

}  // namespace open_radio::ui
