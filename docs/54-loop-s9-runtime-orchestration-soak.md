# 54 — Loop S9: runtime orchestration and virtual soak

**Status:** COMPLETE
**Mode:** BUILD / SOFTWARE-ONLY / T4 BOARD
**Expected size:** one macro-loop, four streams, twelve end-to-end tasks
**Hardware action:** prohibited until the separate T3 gate

## Goal

Turn the S8 service adapters into one deterministic application orchestrator
and prove bounded long-running recovery with virtual time before hardware
arrives. No real Wi-Fi, stream, Bluetooth, serial or NVS action is permitted.

## Stream 1 — bounded application orchestration

1. Define the event queue, timer wheel and ownership rules for storage,
   network, resolver, stream, output and UI services.
2. Implement a host application orchestrator with explicit boot, onboarding,
   playing, degraded, recovering, unsupported and safe-mode transitions.
3. Add queue overflow, stale-event and duplicate-event rejection without
   blocking UI or local-speaker fallback.

## Stream 2 — deterministic virtual soak

4. Generate seeded 1-hour, 2-hour, 8-hour and 24-hour virtual timelines.
5. Inject Wi-Fi loss, resolver timeout, stream stall, Bluetooth loss, power
   interruption and corrupt-slot reboot combinations.
6. Prove bounded retries, no timer overflow, no unbounded queue growth and
   eventual local fallback or safe mode.

## Stream 3 — diagnostics and resource contracts

7. Add a fixed-size redacted diagnostic ring with reason enums and counters.
8. Define host-measurable queue, retry, event and allocation budgets plus
   hardware-only heap/stack/underrun placeholders.
9. Generate operator-readable PL/EN diagnostic summaries without SSID,
   credential, endpoint, MAC/BSSID or station-logo data.

## Stream 4 — integration and QC

10. Project orchestrator states into the existing 320×240 simulator and Core2
    snapshot contract.
11. Compile public and diagnostic variants and compare virtual-soak evidence
    against the hardware-arrival matrix.
12. Run full regression, deterministic firmware build, source-only release
    rehearsal, privacy/codec scans, docs/control-plane sync and max simplify
    gate.

## Exit condition

- one orchestrator owns all S8 service transitions,
- 1/2/8/24-hour virtual soaks terminate with bounded resources,
- local output and safe mode remain available under combined faults,
- diagnostics remain fixed-size and redacted,
- simulator, host C++ and firmware build agree on state projection,
- no hardware, network, secret, account, publication or `private-workspace` write
  occurs.

## Completion evidence

- `RuntimeOrchestrator` is the only application-state owner; the superseded
  test-only controller and supervisor were removed.
- `RuntimeServiceBridge` converts storage, network, resolver, stream, Bluetooth,
  local-output and power facts into one ordered event stream.
- The generated contract fixes the event queue at 16 entries, timers at 8,
  diagnostics at 32 and retry delay at 600 seconds maximum.
- Four deterministic soaks cover 60, 120, 480 and 1,440 virtual minutes. Their
  621 generated fault events reach a maximum queue depth of 7 with zero queue
  and timer overflows.
- Short, medium and eight-hour runs recover to Bluetooth playback; the 24-hour
  corrupt-configuration run ends in local safe mode as designed.
- Full regression passes 95 Node tests, 5 native renderer cases and 80 firmware
  host cases. All five Core2 build-only variants compile.
- Two clean public builds are byte-identical at 1,293,616 bytes with SHA-256
  `71a94181e15d094ebed8ecff2f96562a9793beefab7c0ecb8104c17cc43b7623`.
- The public map contains no forbidden AAC, Helix or ESP-ADF codec symbols and
  the source-only release rehearsal contains 24 include roots, zero binaries
  and zero publications.
