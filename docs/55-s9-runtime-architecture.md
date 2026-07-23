# 55 — S9 runtime architecture

**Status:** ACCEPTED / SOFTWARE-ONLY
**Target:** M5Stack Core2
**Hardware validation:** not performed

## Purpose

S9 turns the S8 service decisions into one bounded application runtime. Service
adapters report facts. They do not choose the product state, retry policy or
output route. `RuntimeOrchestrator` is the sole owner of those decisions.

## Ownership boundary

```text
S8 storage/network/resolver facts
           |
           v
RuntimeServiceBridge -- ordered sequence --> RuntimeOrchestrator
                                              | state + counters
                                              v
                                   Core2 UI / simulator projection
```

The bridge accepts already-redacted DTOs and emits only event kind, monotonic
time and sequence. It never carries an SSID, credential, endpoint, BSSID, MAC
or artwork payload. The simulator consumes an orchestrator snapshot; it does
not own recovery policy.

## State precedence

The runtime recomputes state in this order:

1. missing configuration -> `CONFIG_REQUIRED`,
2. corrupt configuration -> `SAFE_MODE`,
3. missing Wi-Fi -> `RECOVERING / WIFI`,
4. unsupported stream class -> `UNSUPPORTED_STATION`,
5. stalled stream -> `RECOVERING / STREAM`,
6. connected Bluetooth -> `PLAYING / BT`,
7. healthy stream plus local output -> `PLAYING` or `DEGRADED_PLAYING / LOCAL`,
8. no usable output -> `RECOVERING / BLUETOOTH`.

This ordering guarantees that corrupt storage cannot be hidden by a healthy
radio and that Bluetooth loss cannot silence an available local speaker.

## Bounded resources

| Resource | Limit | Failure behavior |
|---|---:|---|
| event queue | 16 | reject event, increment overflow, record diagnostic |
| retry timers | 8 | reject timer, increment overflow, record diagnostic |
| diagnostic ring | 32 | overwrite oldest, saturating overwrite counter |
| retry delay | 600,000 ms | saturating bounded backoff |

Events with an invalid kind, zero sequence, repeated sequence, older sequence
or time earlier than the accepted clock are rejected. Counters saturate instead
of wrapping. Timer deadlines use saturating addition.

## Recovery model

Network, stream and remembered-Bluetooth recovery use one timer per category.
The backoff sequence is 5, 30, 120 and 600 seconds, capped by the generated
contract. A successful service fact cancels its timer and resets that retry
attempt. Configuration failure cancels all timers.

Power interruption clears volatile Wi-Fi, stream and Bluetooth facts, preserves
the product's local-safe behavior and starts bounded network recovery. It does
not simulate persistence loss.

## Deterministic parity

`runtime/runtime-contract.json` is the input to
`scripts/generate-runtime-contract.mjs`. It generates:

- JavaScript runtime limits,
- four JSON soak fixtures,
- C++ runtime limits,
- C++ soak vectors,
- a generation manifest.

The JavaScript reference and C++ firmware replay the same 621 events across
2,100 virtual minutes. Each scenario checks terminal state, output, counters,
resource maxima and a canonical FNV-1a 64-bit state hash.

## Diagnostics and privacy

Diagnostics store only reason enum, application state, timestamp and sequence.
The PL/EN operator summary exposes fixed counts and state labels. Runtime
surface checks reject credentials, endpoint literals and network identities in
the public firmware source.

## Deliberate boundary for S10

The current bridge is synchronous and host-safe. Real Wi-Fi, audio and
Bluetooth callbacks may execute on different FreeRTOS tasks. They must not call
the orchestrator concurrently. S10 must add a fixed-size single-owner ingress
adapter so only one application task mutates runtime state, then replay hostile
callback ordering before hardware arrives.
