# ADR-005 — Standards-based Bluetooth compatibility

**Status:** ACCEPTED
**Date:** 2026-07-13

## Context

The product should work with the widest practical range of current and future
Bluetooth speakers. Literal universal compatibility cannot be tested or
guaranteed, especially for future Bluetooth LE Audio-only devices.

## Decision

The compatibility contract is Bluetooth Classic A2DP Source to a standards-
compliant A2DP Sink using SBC. Playback does not require AVRCP, absolute volume,
vendor applications or optional proprietary codecs.

The built-in Core2 speaker is the mandatory fallback. Compatibility claims are
backed by a public device matrix and never use the phrase `every Bluetooth
speaker now and forever`.

## Consequences

This maximizes interoperability on the original ESP32 while keeping the claim
testable. LE Audio-only sinks without Classic A2DP and vendor-specific pairing
flows are explicitly outside the hardware contract.
