# 93 — Final operational readiness

[Polska wersja](93-final-operational-readiness.pl.md)

**Date:** 2026-07-15

**Historical snapshot:** current hardware-lab truth is recorded in
[docs/104](104-cc-stabilization-closeout.en.md) and
[docs/105](105-final-gift-build-and-qc9-closeout.en.md).

**Software verdict:** `FINAL IMAGE FLASHED — HOST GATE PASS`

**Hardware verdict recorded on 2026-07-15:** `PARTIAL PASS`

## Closed before hardware arrival

- The local portal now uses a per-boot 48-bit WPA2 access code, a separate
  per-boot request token and AP-interface client binding.
- The firmware stores up to eight approved Wi-Fi profiles and migrates the
  earlier four-profile blob without guessing or discarding valid entries.
- A remembered Bluetooth speaker is bound to its device address; display names
  are no longer sufficient for automatic reconnect.
- The MP3 path stops unsupported sample rates or channel counts instead of
  silently producing wrong-rate audio. Its 32 KiB input buffer is allocated
  once and reused across retries, preferring PSRAM.
- The full build fails at compile time if ESP32 Wi-Fi/Bluetooth software
  coexistence is absent.
- The later H1 owner correction temporarily restored one explicit station-logo
  download action. S26 removed that runtime at the owner's request; the current
  hardware-lab lane uses the build-time logo pack described in docs/104.
- The final audio correction stages about 186 ms of PCM across the decoder and
  two M5 playback slots, preserves incomplete blocks and reports local queue
  starvation without exposing device or network identity.
- The weather adapter described by this dated snapshot was later removed from
  the current firmware and UI at the owner's request.
- The shared toolchain cache is kept outside the project and `.venv/` is
  ignored locally.

## Controlled final procedure

The single entry point is `scripts/core2-device-action.sh`. It requires
`ESP32_ALLOW_DEVICE_ACTION=1`, an existing confirmed `/dev/cu.*` port and a
second confirmation before flash or rollback. It refuses to overwrite the
factory backup, verifies exact 16 MiB size and SHA-256, and contains no erase
command.

H0 identity, the private factory backup and rollback verification passed. The
host gate, explicit final flash and per-segment write verification also passed;
a short redacted boot observation showed no panic or reset loop. Owner H1
inspection remains. Exact commands and stop conditions remain in
`docs/75-hardware-arrival-handoff.en.md`.

## Explicit residual gates

- Display, touch and built-in-speaker playback have partial physical evidence;
  the final no-gap audio check plus PMU/battery and SD behavior remain H1.
- Live MP3 playback, Wi-Fi/stream recovery and 60-minute endurance are H2.
- Xiaomi and MOZOS A2DP/SBC interoperability, exact-address reconnect, local
  fallback and RF coexistence are H3.
- Heap/PSRAM/stack/underrun measurements and 8-hour endurance are H4.
- First DIY bring-up does not enable irreversible secure-boot or flash-
  encryption eFuses. Physical-access confidentiality is not claimed; hardening
  is a separate post-H0 owner decision.
- A public security contact and any public release remain separate release
  gates and do not block private H0/H1 bring-up.

## Operational decision

This dated document does not define current readiness. Docs/104 and docs/105 do;
no current gate depends on weather or runtime station-logo downloads.
