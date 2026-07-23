# 27 — Platform-neutral renderer contract

## Purpose

The host renderer is the first executable proof of the display path outside the
browser. It produces the same logical `320x240` target planned for M5Stack Core2,
but it does not claim M5GFX font, color, timing or physical-display parity.

## Framebuffer

- dimensions: exactly 320x240 pixels,
- storage: contiguous `uint16_t` values,
- pixel value: RGB565 bits `rrrrrggggggbbbbb`,
- alpha and blending: not supported in the S3 proof,
- coordinates: origin at the top-left,
- rectangles: half-open `[x, x + width)`, `[y, y + height)`,
- clipping: every primitive clips to the framebuffer viewport,
- invalid or undersized buffers: rejected before any write.

The in-memory byte order is deliberately not part of the contract. Device ports
may need byte swapping for their display bus. Hashing always consumes each pixel
as the high byte followed by the low byte, making evidence independent from host
endianness.

## Hash

The proof uses 64-bit FNV-1a over canonical framebuffer bytes. It is a regression
fingerprint, not a cryptographic integrity mechanism. A fixture is deterministic
only when the same contract version, generated constants and renderer source
produce the same hash in consecutive clean host builds.

## API boundary

The C++ core receives:

- a caller-owned framebuffer view,
- a compact immutable UI snapshot,
- generated station themes and layout constants.

It does not access filesystem, browser, network, Wi-Fi, audio, Bluetooth,
M5Unified, M5GFX or global mutable state. The host executable owns PPM output;
the renderer core only writes pixels and calculates the canonical hash.

## Typography boundary

S3 draws deterministic text placeholders to prove layout, clipping and color
paths. These marks are not a font implementation and are not used as a visual
quality reference. Actual glyph rasterization and PL diacritics remain a later
shared-font decision, followed by physical Core2 validation.

## Generated inputs

`scripts/generate-renderer-contract.mjs` derives checked-in C++ constants from:

- `ui-contract/layout/core2-320x240.json`,
- `ui-contract/renderer/rgb565.json`,
- `ui-contract/catalog/stations.pl.json`,
- `ui-contract/fixtures/renderer-now-playing.json`.

The normal quality gate runs the generator in check mode and fails when generated
headers drift from JSON source. It never installs a compiler or global toolchain.

## Hardware boundary

S3 can prove deterministic host behavior and bounds safety only. RGB565 transfer,
display byte order, DMA, PSRAM, M5GFX coordinates, font metrics, physical color,
brightness, touch mapping, performance and power remain unmeasured until Core2
arrives.
