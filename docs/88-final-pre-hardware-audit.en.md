# 88 — Final pre-hardware audit

[Polska wersja](88-final-pre-hardware-audit.pl.md)

**Date:** 2026-07-14

**Software verdict:** `PASS WITH RISKS`

**Physical-device verdict:** `BLOCKED UNTIL H0-H4 EVIDENCE`

## What is now real

- The emulator exposes one unscaled 320×240 RGB565 framebuffer produced by the
  same C++ renderer linked into firmware. It uses the bundled OFL Inter 600
  atlas; no serif fallback or runtime font download remains.
- Editorial and minimal home variants persist and visibly change. The old left
  accent-strip card decoration is removed. Track metadata, favorites, four
  screensavers including Kiara, light/dark themes and display-off remain local.
- Touch hitboxes are at least 44 px where actionable. Swipes remain bounded and
  the three Core2 virtual buttons are mapped as A previous, B stations/home and
  C next. JavaScript and C++ match across 7 scenarios and 53 snapshots.
- Empty storage starts a WPA2-protected local `OpenRadio-Setup` portal with a
  random per-boot code shown on the device. It lists nearby 2.4 GHz networks,
  rejects open targets, stores approved credentials only in device NVS and
  selects the strongest reachable remembered profile with bounded retries.
- RMF FM, Radio ZET, Złote Przeboje, Chillizet and RMF MAXX have executable MP3
  paths. RMF discovery authenticates its official API with a root CA. Successful
  runtime endpoints are cached only on-device as last-known-good values.
- The built-in speaker is the first output. A2DP scanning is user-requested and
  restricted to a remembered name or Xiaomi Sound Pocket / MOZOS
  Outdoor-Xtreme model-name matches. Loss falls back to the local output.

## Device mockup geometry

The supplied 1000×1000 product image was measured at approximately 602×599 px
for the outer front and 450×335 px for the active display. The active display is
therefore about 74.8% of body width and 56.0% of body height, consistent with a
40.32×30.24 mm 320×240 panel inside a 54×54 mm Core2 face. The emulator uses a
429×429 px shell around the exact 320×240 canvas and places the three controls at
approximately 25%, 50% and 75% body width. This validates proportions, not
physical millimetres on an arbitrary monitor.

## What software cannot prove

- FT6336U calibration, glass-edge touch sensitivity, panel brightness, RGB565
  appearance, viewing angles and readability on the physical two-inch display.
- Runtime heap fragmentation, largest block, PSRAM latency, stack high-water
  marks, decoder underruns or scheduler stalls during TLS and network timeouts.
- Wi-Fi/A2DP coexistence, reconnect time and SBC interoperability with either
  owner speaker. Bluetooth LE Audio-only operation remains out of scope.
- Audio integrity over the operator HTTP MP3 redirect path, 60-minute/8-hour
  endurance, battery bridge, power interruption and corrupt-config recovery.
- TOK FM: MP3 transport exists, but the official player parser is still pending.
  VOX FM, Radio ESKA and ESKA Impreska remain HLS/HE-AAC unsupported.

## First hardware session

1. Run the clean host gate and identify the exact serial port and 16 MiB flash.
2. After explicit owner approval, read and hash the complete factory image; do
   not erase the device.
3. Flash only the full public-candidate lane and validate display, Inter atlas,
   touch transform, A/B/C, brightness, volume and built-in-speaker sound.
4. Join `OpenRadio-Setup` with the displayed WPA2 code, add one secured 2.4 GHz
   network and prove RMF FM first sound plus reboot persistence and forced
   Wi-Fi/stream recovery.
5. Pair Xiaomi, then MOZOS; prove remembered reconnect, local fallback and return
   to Bluetooth without dual output.
6. Run 15-minute smoke, 60-minute mandatory gate, then 2-hour and 8-hour soaks.
   Record heap, stacks, underruns, retries, reset reason and power behavior.

The detailed safe procedure remains in
`docs/75-hardware-arrival-handoff.en.md`. No flash, release or universal
compatibility claim is authorized by this software audit.
