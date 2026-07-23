# S20 — canonical device UI closeout

> Historical S20 snapshot. Superseded by
> `docs/88-final-pre-hardware-audit.en.md` after runtime integration.

[Polska wersja](87-s20-canonical-device-ui-closeout.pl.md)

## Why this correction exists

The earlier GUI closure was too optimistic. It accepted a visibly different
5×7 firmware font, exposed three preview modes and called coordinate parity a
finished device view. That was not sufficient evidence. S20 replaces those
claims instead of preserving them as if they were still current.

## Delivered

- one canonical 320×240 device canvas with no tabs, SVG mode or zoom control,
- the same C++ RGB565 framebuffer path in host emulator and Core2 firmware,
- one bundled Inter 600 atlas generated offline from checked-in OFL source,
  covering ASCII, Latin-1, Latin Extended-A and selected punctuation,
- Dark B as the default, with Light A still selectable on the device,
- bounded text layout with explicit ellipsis accounting and extended-glyph tests,
- tap, hold and horizontal-swipe navigation with a physical back-target fallback,
- favorite-track save, deduplication, list, detail and two-tap deletion,
- screensaver on/off, bounded delays, independent display-off timing and cat mode,
- dirty-only display updates and animation throttling when the audio buffer is under pressure.

## Defects found and fixed

1. The font generator emitted glyph metadata out of codepoint order while the
   renderer used binary search. Some extended characters therefore fell back to
   `?`. Generation is now sorted and covered by a regression test.
2. The browser lab could previously show design and browser-composed variants
   that were not proof of firmware output. Those paths were removed from the
   canonical device emulator.
3. Documentation and status still described the old 5×7, 22-screen, 88-frame
   state. Current public documents now identify 26 screens and 104 frames.
4. The prior “software scope complete” statement hid a core integration gap.
   The current entry point compiles but does not start Wi-Fi, endpoint resolution,
   MP3 playback or the remembered A2DP speaker connection.

## Validation evidence

- renderer: 15 focused cases, 26 screens, 104 PL/EN and Light A/Dark B variants,
- determinism: two fresh builds, matrix SHA-256
  `b494904b2bfadca9b88c1da2821392301866497c78e0c0573295e25f26ee7e6c`,
- firmware host: contract, service parity, hostile input, runtime, ingress and UI
  controller suites pass, including four deterministic virtual soaks,
- Core2 build-only gate: all five variants compile; the full candidate uses
  94,652 bytes static RAM and 1,487,461 bytes application flash; two clean
  builds produce the same 1,494,032-byte image with SHA-256
  `4779e68dda4a960a383cbdca193ed423af36059358d8ad9a212579a1087471ae`,
- browser structure: exactly one visible 320×240 canvas and no retired preview UI,
- repository gate: generated assets, contracts, docs parity, tests and diff
  hygiene are required before ship.

No command in this loop flashes, erases or monitors a physical device.

## What is still not proved

- physical Inter readability and minimum practical text size,
- non-Latin scripts; a country pack requiring them needs a separately budgeted
  compile-time atlas rather than a runtime download,
- real touch calibration, edge behavior and gesture reliability,
- IPS color, brightness, viewing angle and exact optical appearance,
- animation cost while decoding and transmitting live audio,
- Wi-Fi recovery, stream recovery, built-in speaker output and A2DP/SBC playback,
- Xiaomi Sound Pocket and MOZOS Outdoor-Xtreme interoperability,
- 60-minute and eight-hour endurance.

## Core work before hardware UX validation

1. Bind remembered Wi-Fi selection and onboarding completion to `WiFi.begin`.
2. Bind resolver output and last-known-good endpoint to `Mp3StreamPipeline::start`.
3. Bind remembered speaker identity to `BluetoothA2DPSource::start`.
4. Translate service callbacks into runtime facts and bounded recovery actions.
5. Stop/restart services on station changes without blocking touch or rendering.
6. Then pass the explicit hardware-arrival gate and measure the display and audio path.

## Simplify Gate

**Mode:** max pre-ship review. **Scope:** canonical UI, renderer, controller,
emulator, firmware compile path and public documentation.

**Verdict:** `PASS WITH RISKS` for the software UI; `BLOCKED` for a playable
device. There is one renderer, one atlas, one device canvas and one controller
contract. Remaining blockers are core service integration and physical evidence,
not hidden alternative GUI paths.
