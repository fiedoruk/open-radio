# ADR-002 — M5Stack Core2 as the target board

**Status:** ACCEPTED
**Date:** 2026-07-13

## Context

The original T-Display-S3 AMOLED target cannot act as a standard Bluetooth
A2DP Source because ESP32-S3 lacks Bluetooth Classic. The product goal is an
all-in-one device with minimum hardware integration.

## Decision

Use M5Stack Core2 as the only MVP target.

Core2 provides the original dual-mode ESP32, 16 MB flash, 8 MB PSRAM, touch
display, enclosure, internal battery, built-in speaker and I2S amplifier. The
built-in speaker becomes both the first proof output and the runtime fallback.

## Consequences

- Direct A2DP Source becomes technically available.
- No external DAC, amplifier or Bluetooth transmitter is required for MVP.
- The display changes from AMOLED to IPS and the enclosure becomes larger.
- Wi-Fi and Bluetooth still share one 2.4 GHz radio and require soak tests.
- T-Display-S3 documentation is historical and no longer drives implementation.
