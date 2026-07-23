# 83 — V3 Core2 opportunity study

[Polska wersja](83-v3-core2-opportunity-study.pl.md)

## Question

What additional product value can be extracted from M5Stack Core2 with a medium
implementation budget without turning the radio cube into a generic app
platform?

The official Core2 specification confirms a dual-core ESP32 at 240 MHz, 16 MB
flash, 8 MB PSRAM, capacitive touch display, RTC, six-axis IMU, vibration motor,
PDM microphone, TF-card slot, battery and power-management hardware. These are
the only built-in capabilities used by this study.

## Recommended V3 package

| Priority | Feature | Value | Effort | Product fit |
|---|---|---:|---:|---:|
| V3.1 | Sleep timer plus scheduled radio alarm | very high | medium | excellent |
| V3.2 | Local phone remote on `radio.local` | high | medium | excellent |
| V3.3 | Night mode, display policy and rain warning | high | low/medium | excellent |
| V3.4 | IMU gestures: flip to mute, lift to wake | medium/high | medium | good when opt-in |
| V3.5 | RTC and vibration alarm fallback | medium | low/medium | good |
| V3.6 | SD diagnostic export and recovery pack | medium | medium | excellent |
| V3.7 | Three bottom touch shortcuts | medium | low | excellent |
| V3.8 | Battery/power-outage bridge dashboard | medium | low | excellent |

## Best medium-budget scope

The strongest V3 is not more widgets. It is a bedside/kitchen radio package:

1. one-tap sleep timer: 15, 30, 45, 60 and 90 minutes,
2. up to three local alarm schedules stored on-device,
3. gradual volume ramp and station fallback,
4. vibration plus built-in-speaker fallback when Bluetooth is unavailable,
5. automatic night brightness and the S19 screen-off policy,
6. local phone remote for station, volume, sleep timer and alarm setup,
7. flip-to-mute and lift-to-wake as disabled-by-default IMU options,
8. SD export of redacted diagnostics and manual recovery configuration.

This package reuses the existing RTC, persistence, onboarding portal, local
speaker fallback, station resolver and settings UI. It creates a coherent radio
appliance instead of several unrelated features.

## Useful but optional

- Microphone: local hardware self-test and optional clap-to-wake experiment
  only. No recording, speech upload or always-on voice assistant.
- TF card: configuration export, local chimes and recovery evidence. Do not
  record or cache station audio.
- Vibration: silent alarm confirmation, failed-pairing cue and low-power warning.
- IMU: opt-in physical gestures only after false-trigger tests.

## Cat screensaver asset decision

The current deterministic Kiara is lightweight original procedural artwork,
not claimed as a photorealistic British Shorthair asset. A runtime animation
library is unnecessary on Core2; a future higher-detail form would be a small
original indexed sprite sheet converted offline into compile-time RGB565 frames.

- `crgimenes/neko` is BSD-2-Clause code but explicitly reuses sprites and sounds
  from the older Neko lineage, so the code license alone is not sufficient asset
  provenance for this project.
- `clawd-on-desk` is rejected because its bundled artwork is expressly excluded
  from the source license and remains all-rights-reserved.
- Pixelorama is a suitable MIT-licensed authoring tool, not a source of a
  ready-to-redistribute British Shorthair character.

Recommendation: keep procedural Kiara as the zero-dependency default, then only
commission or create a 6–8 frame grey British Shorthair sheet if physical-panel
testing proves the added flash and animation cost worthwhile.
Record author, license, palette, dimensions and source checksum before bundling.

## Rejected from the main product

- cloud account, remote dashboard or project-operated notification backend,
- generic Home Assistant/MQTT platform mode,
- news, calendar and social widgets,
- always-listening voice assistant,
- station recording or timeshifting,
- automatic OTA or remote app store,
- air-quality claims without an external calibrated sensor.

These either violate the single-purpose boundary, add ongoing operations, create
privacy expectations or require hardware that Core2 does not contain.

## Recommended order

After the physical H0-H3 gates, build V3.1 sleep/alarm and V3.2 local remote as
one product loop. Add IMU gestures only after the basic appliance has passed the
eight-hour playback and power-interruption gate. Keep microphone experiments in
a private branch until false activation and privacy behavior are measured.

## Sources

- M5Stack Core2 official specification:
  <https://docs.m5stack.com/en/core/core2>
- ESP-IDF system-time and SNTP documentation:
  <https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32/api-reference/system/system_time.html>
- Open-Meteo forecast fields used by the ambient display:
  <https://open-meteo.com/en/docs>
- Neko implementation and asset-provenance warning:
  <https://github.com/crgimenes/neko>
- Rejected all-rights-reserved desktop-pet artwork:
  <https://github.com/rullerzhou-afk/clawd-on-desk>
- MIT-licensed pixel-art authoring tool:
  <https://github.com/Orama-Interactive/Pixelorama>
