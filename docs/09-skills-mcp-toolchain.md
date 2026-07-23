# 09 — Skille, MCP i toolchain

## Odpowiedź wprost

Codex **nie ma obecnie pełnej, specjalistycznej bazy skilli/MCP dla ESP32**.
Nie ma lokalnego skilla ESP32/Arduino/PlatformIO/ESP-IDF ani MCP do flashowania,
portu szeregowego lub zarządzania urządzeniem.

To nie blokuje projektu. W embedded najważniejszy jest jawny, wersjonowany CLI
toolchain, dokumentacja producenta, schemat/pinout i fizyczny smoke. MCP nie
zastępuje żadnego z tych elementów.

## Dostępne kompetencje

- analiza i implementacja C/C++/Arduino,
- terminal, Git, testy i automatyzacja buildów,
- GitHub/Context7/browser do źródeł i przykładów,
- ogólne security/simplify review,
- `arduino-cli 1.5.1`,
- core ESP32 i jego wewnętrzne narzędzia do compile/upload,
- biblioteki graficzne: TFT_eSPI, Arduino_GFX, Adafruit GFX, U8g2,
- Python i `uv` do izolowanego local tooling.

## Braki lokalne

- PlatformIO Core,
- ESP-IDF (`idf.py`, CMake, Ninja),
- standalone `esptool` i serial terminal poza systemowym `screen`,
- LilyGo AMOLED Series, LVGL i biblioteka audio stream/decode,
- podłączona płytka/port USB,
- project-specific pinout i smoke fixtures.

## Rekomendowana strategia

1. **Bez nowego MCP.** Compile, upload i serial przez jawne CLI są prostsze do audytu.
2. **Project-local PlatformIO** z przypiętymi wersjami po decyzji D-04.
3. **Projektowy runbook** dla board identity, flash safety i serial smoke.
4. **Własny skill `esp32-radio` dopiero po 2–3 realnych loopach**, gdy workflow jest stabilny.

## Kandydat przyszłego skilla

Skill powinien zawierać:

- identyfikację board/revision,
- generowanie build profile bez zgadywania pinów,
- compile/size gate,
- flash proposal z portem i rollbackiem,
- serial log redaction,
- testy Wi-Fi/reconnect/audio underrun,
- matrycę bibliotek i wersji,
- zakaz zapisu sekretów.

Aktywacja skilla/pluginu lub globalnego toolchainu jest osobną decyzją. Nie
tworzymy MCP tylko dlatego, że urządzenie ma port szeregowy.

## Snapshot lokalny 2026-07-13

| Element | Stan |
|---|---|
| `arduino-cli` | 1.5.1 |
| `esp32:esp32` | 2.0.17, latest observed 3.3.10 |
| `arduino:esp32` | 2.0.18-arduino.5 |
| PlatformIO | brak |
| ESP-IDF standalone | brak |
| `esptool` standalone | brak; 4.5.1 wewnątrz core |
| Płytka USB | niewykryta |
| ESP32 skill/MCP | brak |
