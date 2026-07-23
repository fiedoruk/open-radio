# S22 GUI interaction polish

[Polska wersja](90-s22-gui-interaction-polish.pl.md)

Date: 2026-07-14

> Hardware correction 2026-07-15: the owner restored the explicit local
> station-logo action. The firmware never bundles those files; one menu click
> downloads the pinned operator-hosted JPEG/PNG files directly to device-only
> storage. Current evidence is recorded in the H1 bring-up record.

## Closed in software

- The physical Core2 mockup now uses a neutral gray outer shell instead of the orange AWS product-photo color.
- The editorial home volume indicator ends at x=312, matching the eight-pixel right grid margin, has a dedicated 76×44 touch target and opens a full 0–100% control screen.
- The volume screen supports direct bar selection plus 44-pixel-or-larger decrement, done and increment actions. A value of zero now reaches the M5 speaker as zero rather than being forced to a non-zero diagnostic minimum.
- System settings expose `Station logos`. One click downloads all missing files in the background, shows `x/9`, verifies media type, size and SHA-256, then keeps the converted 64×64 RGB565 cache only on the device.
- The Kiara screensaver uses the CC0 `Pixel cat` source by `scofanogd`. Its exact source bytes, license and SHA-256 are recorded; the renderer consumes 154 deterministic four-level grayscale runs without a PNG decoder or heap allocation.
- Browser and firmware flows remain driven by the same C++ renderer and matching JavaScript/C++ controllers.

## Historical S22 evidence

- `npm run validate:gui`: 92 geometry boxes, 9 stations, 21 icons.
- `npm run validate:ui`: 10 hitbox screens; every declared target passes the 44-pixel minimum.
- Renderer: 28 production screens, 112 theme/locale variants, zero truncation in the reviewed frames.
- Controller parity: 8 scenarios and 61 snapshots.
- Node suite: 172 tests passed.
- Firmware variants: 5 builds passed.
- Public candidate: 2,276,592-byte binary; 2,270,017 bytes of program flash; 116,116 bytes of RAM; deterministic SHA-256 `eab57cfe40d427092c340f97407d86cec8819f3cfed3c7110d42f1ac3ae26f62`.

## Still blocked on hardware

Software evidence cannot validate the physical touch transform, edge accuracy, panel color, actual volume curve, built-in speaker quality, A2DP behavior, Wi-Fi recovery or endurance. H1 must therefore begin with display/touch/speaker/battery smoke, then continue through the 60-minute playback and recovery gate before any hardware-ready claim.
