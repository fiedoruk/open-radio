# 08 — Plan walidacji Core2

## P-1 — software-only UI

- Canvas dokładnie 320x240,
- dziewięć motywów stacji,
- PL/EN key parity,
- onboarding Wi-Fi -> pierwszy dźwięk + automatyczna lokalizacja -> opcjonalny BT,
- Wi-Fi/BT/station recovery fixtures,
- browser screenshots i console 0 errors.

**Exit:** `npm run check`, browser flow oraz referencyjne screenshoty PASS.

## P-2 — software-only RGB565 renderer

- neutralny C++17 bez M5Unified/M5GFX,
- bufor 320x240 RGB565,
- clipping i ochrona przed undersized buffer,
- generowane stałe z kontraktu JSON,
- dwa czyste buildy z identycznym hashem i PPM.

**Exit:** testy native, generator drift check, deterministyczny hash i wizualny PPM PASS.

## P0 — hardware baseline

Display, touch, PSRAM, internal heap, speaker tone, PMU, battery i reset reason.

**Exit:** 10 restartów, poprawny target i brak reset loopa.

## P1 — local radio

Jeden bezpośredni MP3 44.1 kHz / 128 kb/s do wbudowanego speakera.

**Exit:** 60 minut, reconnect streamu i brak rosnącego zużycia pamięci.

## P2 — Bluetooth only

Generowany PCM do jednego konkretnego głośnika A2DP.

**Exit:** pairing, reconnect po obu power-cycle i 60 minut bez deadlocka.

## P3 — combined pipeline

Ten sam MP3 -> decoder -> PCM queue -> A2DP; statyczny minimalny ekran.

**Exit:** 2 godziny, mierzone underruny, heap i reconnect latency.

## P4 — resilience

- Wi-Fi off/on,
- głośnik off/on,
- stream timeout/404/redirect,
- restart Core2,
- odłączenie powerbanku,
- uszkodzona konfiguracja testowa,
- local speaker fallback.

**Exit:** 8 godzin bez trwałego deadlocka i bez interwencji przy odwracalnych awariach.

## P5 — release candidate

Pełny katalog stable, UI PL/EN, dokumentacja, licencje, checksumy i 24 h soak.

**Exit:** brak WDT/resetu, znane maksymalne przerwy oraz działający rollback konfiguracji.

## Po stabilnym MP3

AAC, różne sample rates, metadata i dodatkowe funkcje są
osobnymi etapami. Zielony build nie promuje ich automatycznie do stable.
