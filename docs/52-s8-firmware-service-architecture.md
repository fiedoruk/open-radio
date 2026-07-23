# 52 — S8 firmware service architecture

## Purpose

S8 converts the completed JavaScript policy contracts into compact C++17
services that compile both on the host and for M5Stack Core2. It does not join a
network, parse a live broadcaster response, open a serial port or write NVS.

## Generated parity boundary

`scripts/generate-firmware-service-vectors.mjs` reads the canonical network,
persistence and resolver scenarios plus their deterministic traces. It emits
`firmware/generated/service_golden_vectors.hpp` and a hash manifest. The C++
tests evaluate 9 network, 9 persistence and 9 resolver vectors. Expected values
are never retyped in C++.

## Service graph

| Service | Input | Bounded result |
|---|---|---|
| A/B storage | fixed DTO and two slot records | newest committed valid generation or safe mode |
| Wi-Fi selection | up to 8 opaque scan facts | selected approved secured profile, local prompt or retry timestamp |
| MP3 resolver | capability, parser outcome and optional opaque LKG | primary, LKG, retry or unsupported |
| Discovery response | parser kind plus redacted HTTP facts | success, 404, stale or parse error |
| Onboarding | fixed route/method/content type/body size | accepted or explicit rejection |
| UI projection | runtime state, station and output | schema-v1 320×240 snapshot and canonical touch actions |

No service contains an SSID, password, BSSID, stream URL or transient media
host. Redacted diagnostics expose only counts, enum state and station index.

## Storage boundary

`StorageSlotBackend` is the only persistence interface. `HostSlotBackend`
provides deterministic tests. `NvsAbStorageAdapter` defines the device-facing
A/B protocol: payload first, CRC32, generation and commit marker last. Future
ESP NVS code implements only the backend reads and writes; it does not own boot
selection or migration policy.

## Local onboarding boundary

The route table fixes methods, content types and request limits. Generated
assets use `/network-onboarding/*`, contain no remote assets and retain no
browser storage. Configuration is validated before a future write. Maximum
configuration body size is 4096 bytes.

## Hostile-input boundary

Host tests reject invalid schema/locale/station/volume/network counts,
uncommitted or corrupt slots, future schema, truncated and oversized discovery
responses, wrong content types, timer overflow and saturated PCM queues. Every
failure stays bounded and preserves safe mode or local-speaker behavior.

## Build variants

Five compile-only environments are measured in
`output/firmware/s8-variant-sizes.json`: public candidate, onboarding-only,
local-speaker fallback, Bluetooth-disabled diagnostics and corrupt-config safe
mode. Audio and A2DP dependencies are declared per environment rather than
inherited by every build. The measured binaries are 1,290,160 bytes for public,
464,736 bytes for local speaker and 436,224 bytes for each lightweight profile.
These are diagnostic build proofs, not separate public products.

## Hardware boundary

Passing S8 proves deterministic policy parity and successful compilation. It
does not prove NVS behavior, Wi-Fi association, real endpoint parsing, touch
accuracy, audio playback, Bluetooth interoperability, RF coexistence, power or
soak reliability. Those remain in the hardware-arrival matrix.
