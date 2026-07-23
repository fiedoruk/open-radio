# 04 — Firmware stack Core2

## POC

```ini
[env:m5stack-core2]
platform = espressif32
board = m5stack-core2
framework = arduino
```

Wersje zostaną przypięte przed pierwszym buildem. Nie używamy `latest` w
reprodukowalnym środowisku.

## Hardware abstraction

`M5Unified` obsługuje display, touch, speaker, power i battery. Legacy
`M5Stack` jest deprecated i nie wchodzi do nowego kodu.

## Audio POC

1. Oficjalny M5Unified `WebRadio_with_ESP8266Audio` do local speaker proof.
2. `ESP32-A2DP` do osobnego PCM -> Bluetooth proof.
3. Własny adapter łączący dekoder z bounded PCM queue i A2DP callback.
4. `OutputRouter` wybiera BT albo local speaker; bez równoległego grania w MVP.

## Format wewnętrzny

- PCM 44.1 kHz,
- stereo,
- 16-bit signed,
- mono duplikowane do dwóch kanałów,
- inne sample rate wymagają jawnego resamplera.

## Kolejność kodeków

MP3 44.1 kHz jako jedyny POC. AAC i inne częstotliwości dopiero po stabilnym
MP3+A2DP. A2DP koduje wyjście do SBC niezależnie od formatu wejściowego stacji.

## Licencje

Zależności audio mają różne licencje, w tym GPL i licencje kodeków. Przed
pierwszym publicznym binarium wymagane są:

- wybrana licencja projektu,
- pinned dependency manifest,
- `THIRD-PARTY-NOTICES.md`,
- sprawdzenie zgodności MP3/AAC decoderów,
- decyzja, czy AAC w ogóle wchodzi do pierwszego release.

## Fallback

Jeśli Arduino pipeline nie przejdzie 24 h i trzech iteracji napraw, analizujemy
ESP-IDF + ESP-ADF. Nie ukrywamy problemu przez nieograniczony bufor.
