# 62 — Community evidence contract

## Purpose

Community reports must improve reproducibility without becoming telemetry or a
channel for private payloads. Every accepted report is a bounded JSON object
linked to one firmware SHA-256. The project never uploads or submits it
automatically.

## Bluetooth compatibility

`community/schemas/bluetooth-compatibility-result.schema.json` records only a
controlled speaker class, Classic A2DP/LE Audio profile, A2DP Sink and SBC
support, optional AVRCP observation, reconnect bucket, local fallback and
outcome. It does not accept a speaker model, MAC address, owner identity or free
text. A passing result requires Classic A2DP Sink with SBC. LE Audio-only is
always `OUT_OF_SCOPE`.

## Station playback

`community/schemas/station-playback-result.schema.json` records the canonical
station ID, its declared capability class, a bounded outcome and duration
bucket. Runtime validation also enforces the catalog's MP3/HLS classification.
An unsupported codec cannot claim playback time.

## Callback replay

`community/schemas/callback-replay-packet.schema.json` accepts one slug ID and
1–64 compact facts. Facts contain only producer, epoch, sequence, 32-bit tick
and event type. The local CLI reuses the canonical ingress and orchestrator:

```bash
npm run replay:community -- community/fixtures/replay-good.json
```

The output contains fixed counters, terminal state/output and a deterministic
state hash. It never contains source payloads.

## Rejection order

1. private field names, URLs, MAC-like values or credential assignments ->
   `PRIVACY_REJECTED`,
2. malformed envelope or unknown non-private fields -> `SCHEMA_REJECTED`,
3. firmware hash different from the RC1 candidate -> `STALE_FIRMWARE`,
4. unknown report type -> `UNSUPPORTED_REPORT`.

No rejection path logs the rejected payload.

## Packaging

The source archive includes validators, schemas, fixtures and documentation.
The smaller community kit includes only sanitized fixtures plus deterministic
validation summaries. Both are rehearsed twice with fixed TAR metadata and no
compiled firmware, capture, screenshot or publication action.
