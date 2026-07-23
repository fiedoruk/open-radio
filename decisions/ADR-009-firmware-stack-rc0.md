# ADR-009 — Firmware RC0 uses the narrow Arduino/PlatformIO lane

- **Status:** accepted for software RC0
- **Date:** 2026-07-13
- **Hardware validation:** pending

## Context

The product needs Core2 display/touch/speaker support, HTTP/ICY MP3 decoding,
Bluetooth Classic A2DP Source and a bounded project-owned recovery layer. The
research found two credible reuse paths: ESP-ADF and a smaller Arduino graph.

## Decision

Use pinned PlatformIO `6.1.19`, Espressif32 `6.13.0`, Arduino-ESP32 `2.0.17`,
M5Unified `0.2.18`, ESP32-A2DP `1.8.11` and the HTTP/ICY/MP3/libmad subset of
ESP8266Audio `2.4.1` for public firmware RC0.

Keep ESP-ADF `v2.8` as a private reference lane for Espressif's official
HTTP → MP3 → A2DP topology. Do not ship its build artifacts.

The project owns one PCM contract and one output router. It does not add Audio
Tools because the bounded ring and two adapters are smaller and sufficient.
AAC/HE-AAC is excluded from the public graph.

## Evidence

- Public candidate: `1,306,265` application flash bytes and `79,140` static RAM
  bytes before hardware validation.
- ESP-ADF example: `1,840,512` byte binary, leaving about 12% of its 2 MiB app
  partition, with a substantially larger component graph.
- Both lanes build from pinned inputs without flashing.

## Consequences

- Six launch stations are modeled as MP3-ready; three HLS/HE-AAC stations stay
  visible but explicitly unsupported until a separately licensed and measured
  solution exists.
- GPL-3.0 source/binary obligations apply through ESP8266Audio/libmad.
- Runtime reliability, audio quality, Wi-Fi/Bluetooth coexistence and speaker
  interoperability remain hardware gates.
