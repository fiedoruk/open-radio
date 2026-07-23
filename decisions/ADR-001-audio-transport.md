# ADR-001 — transport audio do głośnika

**Status:** SUPERSEDED BY ADR-002
**Data:** 2026-07-13

## Kontekst

T-Display-S3 AMOLED używa ESP32-S3. Układ zapewnia Bluetooth LE, ale nie
Bluetooth Classic. Standardowy głośnik Bluetooth zwykle działa jako A2DP sink,
więc S3 nie może bezpośrednio pełnić roli A2DP source.

## Historyczna propozycja

Przyjąć architekturę dwufazową:

1. firmware S3 dekoduje radio i wystawia PCM po I2S,
2. pierwszy proof używa lokalnego DAC/amp,
3. docelowo I2S/analog trafia do dedykowanego modułu A2DP Source,
4. drugi klasyczny ESP32 jest fallbackiem, jeśli gotowy moduł nie spełni reconnect/status.

## Konsekwencje

Pozytywne:

- obecna płytka i obudowa pozostają użyteczne,
- radio można przetestować niezależnie od Bluetooth,
- driver wyjścia audio pozostaje wymienny.

Negatywne:

- co najmniej jeden dodatkowy moduł,
- większy pobór i trudniejsza obudowa,
- testy współistnienia Wi-Fi/BT są obowiązkowe.

## Warunek akceptacji

M5Stack Core2 zastępuje tę architekturę. MVP używa bezpośredniego A2DP Source,
a wbudowany głośnik Core2 jest fallbackiem.
