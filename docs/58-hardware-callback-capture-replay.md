# 58 — Hardware callback capture and replay

**Status:** PREPARED / NOT EXECUTED
**Hardware validation:** false

## Purpose

When the Core2 arrives, capture only the same compact facts accepted by
`RuntimeIngress`. The capture is evidence for replay, not a general serial log.
It must remain safe to attach to a public issue after review.

## Capture boundary

Allowed fields:

- producer enum,
- producer epoch and sequence,
- raw 32-bit tick,
- runtime event enum,
- bounded ingress and runtime counters,
- firmware hash and declared hardware model.

Prohibited fields:

- SSID, password or credential material,
- stream endpoint or redirect target,
- BSSID, Bluetooth address or other device identifier,
- PCM/audio payload,
- station logo or artwork payload.

The prepared record is `hardware/callback-trace-capture-template.json`. Until a
separate hardware gate runs, `captureStatus` remains `NOT_CAPTURED`,
`hardwareValidated` remains `false` and all four resource measurements remain
`NOT_MEASURED`.

## Hardware-arrival procedure

1. Complete H0 factory backup and identify the exact firmware SHA-256.
2. Run only the approved H1/H2/H3 scenario from the validation matrix.
3. Export compact ingress facts to a temporary local file.
4. Run the redaction scan before the file enters the project tree.
5. Validate the trace schema and replay it through JS and C++ host runners.
6. Compare final state, output, counters, mailbox depth and state hash.
7. Delete the raw temporary log after the sanitized fixture is accepted.

No step in this document authorizes serial access, flashing, network use or
Bluetooth pairing. Those actions remain behind the hardware T3 gate.
