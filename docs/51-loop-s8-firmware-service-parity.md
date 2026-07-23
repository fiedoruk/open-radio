# 51 — Loop S8: firmware service parity and hostile-input hardening

**Status:** COMPLETE
**Mode:** BUILD / SOFTWARE-ONLY / T4 BOARD
**Expected size:** one macro-loop, four streams, twelve end-to-end tasks
**Hardware action:** prohibited until the separate T3 gate

## Goal

Move from a compiled audio/UI RC0 skeleton to a firmware service graph whose
network selection, persistence, endpoint resolution and recovery decisions are
proven against the existing host contracts. Keep every real credential,
network connection, serial port and device write outside the loop.

## Stream 1 — contract generation and parity

1. Define compact firmware DTOs for configuration, Wi-Fi profile health,
   endpoint candidates, resolver health and UI snapshot state.
2. Generate C++ golden vectors from the existing deterministic JS traces rather
   than retyping expected values.
3. Add host C++ parity tests for success, bounded retry, quarantine,
   unsupported capability, corrupt storage and safe mode.

## Stream 2 — firmware service adapters

4. Implement a storage backend interface plus host fake and ESP NVS-shaped A/B
   adapter with commit marker, generation and checksum validation.
5. Implement a Wi-Fi selection adapter that consumes opaque scan facts, never
   autojoins open/unknown networks and emits bounded retry decisions.
6. Implement MP3 endpoint resolver adapters for the already-audited official
   response shapes, keeping transient media URLs out of generated evidence.

## Stream 3 — local onboarding and board UI integration

7. Compile a local onboarding route table with explicit content types, size
   limits, no remote assets and no browser storage.
8. Add configuration DTO validation and redacted diagnostics before any future
   write reaches the device store.
9. Connect application states to the Core2 display/touch adapter while
   preserving the shared 320×240 snapshot and hitbox contracts.

## Stream 4 — hostile-input, resource and release QC

10. Fuzz malformed configs, truncated/oversized HTTP responses, unknown enum
    values, timer overflow and queue saturation on the host.
11. Add build variants for onboarding-only, local-speaker fallback, BT-disabled
    diagnostics and corrupt-config safe mode; record size deltas.
12. Run full regression, two clean public builds, source-only release rehearsal,
    privacy/codec scans, docs/control-plane sync and max simplify gate.

## Exit condition

- firmware and host evaluate the same golden vectors,
- service adapters compile without real credentials or network access,
- corrupt/hostile inputs fail boundedly and preserve safe mode/local fallback,
- local onboarding has explicit route, size and redaction contracts,
- UI snapshot/hitbox parity remains green,
- public build remains MP3-only, deterministic and within resource budgets,
- no flash, serial, account, public release or `private-workspace` write occurs.

The loop does not end after one adapter or one successful build. Internal
checkpoints are not return points.

## Completion evidence — 2026-07-13

- One generator converts the canonical JS scenarios and traces into 27 C++17
  golden vectors: 9 network, 9 persistence and 9 resolver.
- Host firmware coverage now contains 14 application-contract, 27 parity and
  24 hostile-input cases.
- The NVS-shaped A/B adapter validates generation, commit marker, CRC32,
  payload shape, schema migration and safe-mode fallback through one backend
  interface and one host fake.
- Known-network selection, MP3/LKG resolution, official-response validation,
  onboarding routes, configuration redaction and UI/touch projection compile
  for both host and Core2.
- Truncated/oversized responses, unknown enums, corrupt slots, timer overflow
  and queue saturation fail boundedly.
- Five Core2 build variants compile and record binary-size deltas without
  connecting a network, opening serial, flashing or publishing.
- Variant-specific dependencies keep ESP32-A2DP in the public profile and
  ESP8266Audio only in public/local-speaker profiles; lightweight profiles use
  M5Unified alone.
- Two clean public builds produce the same 1,290,160-byte image with SHA-256
  `35507f9499b30588444dddc5bc7e7aacf837905112b53348140fbc84c4190d47`.
- Evidence lives in `output/firmware/s8-service-evidence.json`; architecture
  and remaining hardware boundaries live in
  `docs/52-s8-firmware-service-architecture.md`; the final max gate lives in
  `docs/53-s8-simplify-gate.md`.
