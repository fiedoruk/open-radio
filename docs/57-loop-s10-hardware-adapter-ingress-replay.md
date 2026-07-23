# 57 — Loop S10: hardware-adapter ingress and trace replay

**Status:** COMPLETE
**Mode:** BUILD / SOFTWARE-ONLY / T4 BOARD
**Expected size:** one macro-loop, four streams, twelve end-to-end tasks
**Hardware action:** prohibited until the separate T3 gate

## Goal

Prepare the S9 runtime for real asynchronous ESP32 services without pretending
that hardware has been tested. Every future NVS, Wi-Fi, HTTP/audio and Bluetooth
callback must cross a fixed-size single-owner ingress and be reproducible from a
redacted trace before it may mutate application state.

## Stream 1 — single-owner callback ingress

1. Define producer identity, sequence allocation, timestamp normalization and
   the one application-task ownership rule.
2. Implement a fixed-size C++ ingress mailbox that copies compact service facts
   without dynamic allocation or direct orchestrator mutation.
3. Add deterministic saturation, duplicate, late-callback and producer-restart
   behavior with explicit counters and no blocking fallback path.

## Stream 2 — adapter seams and replay format

4. Add compile-only NVS, Wi-Fi, resolver/audio and A2DP callback adapter seams
   that emit the same redacted fact envelope.
5. Define a versioned JSON trace schema with no credential, SSID, endpoint,
   BSSID/MAC, PCM or artwork payload.
6. Generate and replay hostile callback traces: reordered connect/loss, delayed
   stream completion, Bluetooth churn, duplicate power events and stale epochs.

## Stream 3 — clock and resource resilience

7. Add a monotonic clock normalizer and tests around 32-bit `millis()` rollover,
   backward host time and saturating 64-bit deadlines.
8. Define compile-only heap, task-stack, callback-latency and audio-underrun
   probes whose values remain `NOT MEASURED` until hardware exists.
9. Prove bounded mailbox depth, timer count, diagnostic capacity and replay
   convergence across seeded scheduling permutations.

## Stream 4 — projection, operations and QC

10. Project ingress health and source-agnostic failure reasons into the existing
    PL/EN diagnostics without adding secrets or new recovery policy to UI.
11. Prepare the hardware-arrival capture/replay procedure and evidence template
    without opening serial, Wi-Fi, Bluetooth or flashing a board.
12. Run full Node/C++/renderer regression, five Core2 build variants, two clean
    public builds, source-only release rehearsal, privacy/codec scans, docs and
    control-plane sync, then a max Simplify Gate.

## Exit condition

- only one application task may call `RuntimeOrchestrator`,
- all asynchronous producers use one bounded ingress fact envelope,
- hostile callback ordering replays deterministically in JS and C++,
- `millis()` rollover and stale producer epochs fail boundedly,
- hardware-only heap, stack, latency and underrun values are explicitly marked
  `NOT MEASURED`,
- no hardware, live network, secret, serial, flash, account, publication or
  `private-workspace` write occurs.

## Completion evidence

- One fixed-size ingress accepts seven producer classes into a 16-fact mailbox;
  only its owner-side drain calls `RuntimeOrchestrator`.
- Producer epoch, sequence, producer-kind mapping, saturation, duplicate, stale
  and contention failures are bounded and counted without a blocking fallback.
- Ten generated callback traces replay 98 facts in JavaScript and C++17,
  including three seeded healthy-boot permutations and 32-bit tick rollover.
- Heap, owner-task stack headroom, callback latency and audio underruns remain
  explicitly `NOT_MEASURED` in the hardware capture template.
- Regression passes 107 Node tests, 5 native renderer cases and 90 firmware host
  cases. All five Core2 variants compile.
- Two clean public builds produce byte-identical `firmware.bin` with SHA-256
  `ae83d154bdddab914f3dd33de605067086719385cb25c937e0832233c143ee8f`.
- Source-only release rehearsal passes with zero binary files and no publication.
- No hardware, live network, serial, flash, account, release or CC write occurred.
