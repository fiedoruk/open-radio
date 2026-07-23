# 01 — M5Stack Core2 hardware audit

## Potwierdzony target

- SoC: ESP32-D0WDQ6-V3, dual-core 240 MHz.
- Wireless: Wi-Fi 2.4 GHz oraz Bluetooth Classic/BR/EDR + BLE.
- Memory: 16 MB flash, 8 MB PSRAM, 520 KB SRAM.
- Display: 2-inch 320 × 240 IPS with capacitive touch.
- Audio: built-in speaker and NS4168 I2S amplifier.
- Power: USB-C, internal 500 mAh battery and AXP192 PMU.
- Storage: microSD.

## Co usuwa zmianę płytki

- brak zewnętrznego DAC,
- brak zewnętrznego wzmacniacza dla pierwszego proofu,
- brak zewnętrznego nadajnika Bluetooth,
- brak drugiego ESP32,
- gotowa obudowa i ekran,
- bezpośredni A2DP Source na klasycznym ESP32.

## Nadal istniejące ograniczenia

- Wi-Fi i Bluetooth współdzielą jedno radio 2.4 GHz.
- A2DP Source łączy jeden sink i wyjściowo używa SBC.
- MP3/AAC ze stacji trzeba zdekodować do PCM przed A2DP.
- Krytyczne bufory/DMA nie mogą dowolnie korzystać z PSRAM.
- IPS i radio zwiększają pobór; powerbank jest częścią normalnego produktu.
- Stabilność wymaga testu na konkretnym głośniku Bluetooth.

## Pierwszy hardware smoke

Display, touch, PSRAM, PMU/battery, built-in speaker, reset reason i minimalny
internal heap. Żadnego radia ani Bluetooth przed przejściem tego gate'u.

## Źródła

- https://docs.m5stack.com/en/core/core2
- https://github.com/m5stack/M5Unified
- https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf
