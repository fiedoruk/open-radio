# 59 — S10 callback ingress architecture

**Status:** ACCEPTED / SOFTWARE-ONLY
**Target:** M5Stack Core2
**Hardware validation:** not performed

## Purpose

ESP32 services may report facts from different callback tasks. S10 prevents
those callbacks from mutating application state directly. Every NVS, Wi-Fi,
resolver/audio, Bluetooth, output and power fact crosses one bounded ingress;
one application owner drains it into `RuntimeOrchestrator`.

## Ownership boundary

```text
NVS / Wi-Fi / resolver+stream / A2DP / output / power callbacks
                              |
                              v
              RuntimeServiceBridge (fact mapping only)
                              |
                              v
                RuntimeIngress (16 fixed envelopes)
                              |
                    owner-side drain only
                              v
                    RuntimeOrchestrator
                              |
                              v
                  Core2 UI / diagnostics
```

Producer callbacks perform a non-blocking try-lock, validate their event kind,
epoch and sequence, copy a compact envelope and return. They never allocate,
retry, wait, log an identity or call the orchestrator. Lock contention and a
full mailbox reject the fact and increment bounded counters.

## Fact envelope

The public envelope contains only:

- producer enum,
- producer epoch and sequence,
- raw 32-bit callback tick,
- runtime event enum.

The mapping rejects credentials, SSIDs, endpoints, BSSID/MAC addresses, audio
payload and artwork by construction. `callback-trace.schema.json` applies the
same strict public boundary to replay fixtures.

## Ordering and restart rules

Each producer owns a monotonically increasing sequence inside a non-zero epoch.
A newer epoch resets the accepted producer sequence. Facts from an older epoch,
duplicate sequence, stale sequence, invalid producer/event combination or zero
sequence are rejected explicitly. No rejected fact is silently converted into
a different runtime event.

## Clock normalization

`MonotonicTick32` lifts raw 32-bit ticks to a 64-bit owner timeline. A large
backward jump is treated as one `millis()` rollover. A small backward callback
tick is counted and clamped to the latest accepted time. Runtime deadlines keep
their existing saturating 64-bit arithmetic.

## Deterministic replay

`runtime/ingress-contract.json` generates the JavaScript and C++ limits and ten
golden traces. Seven explicit hostile scenarios cover rollover, delayed stream
completion, Bluetooth loss, producer restart, saturation, backward time,
invalid mapping and duplicate/stale sequence. Seeds 11, 29 and 47 permute a
healthy boot and converge to Bluetooth playback after a bounded settle tail.

The two runners compare terminal state, output, ingress counters, resource
maxima and a canonical FNV-1a state hash. The evidence is collected in
`output/firmware/s10-ingress-evidence.json`.

## Firmware adapter status

All service classes have typed bridge methods and compile in the public target.
The real ESP32 A2DP connection callback is wired to ingress and uses an atomic
callback sequence. NVS, Wi-Fi and resolver/audio remain compile-only adapter
seams until the hardware integration gate. This is intentionally not presented
as live FreeRTOS, network, storage or audio validation.

## Resource probes

The contract reserves four hardware-only observations:

- free internal heap,
- owner-task stack headroom,
- maximum callback latency,
- audio underruns.

All values remain `NOT_MEASURED`. The prepared capture procedure may populate
them only after a separate hardware and serial gate.
