# 07 — Zasilanie i BOM

## BOM MVP

1. M5Stack Core2.
2. Kabel USB-C data/power.
3. Powerbank z poprawnym podtrzymaniem aktywnego obciążenia.
4. Jeden konkretny głośnik Bluetooth do kwalifikacji.

Brak dodatkowego DAC, wzmacniacza, nadajnika BT i drugiego ESP32.

## Kontrakt zasilania

- Normalny tryb: USB-C z powerbanku.
- Wewnętrzna bateria Core2 działa jako bridge przy krótkiej utracie USB.
- Firmware pokazuje źródło zasilania i poziom baterii.
- Utrata USB nie kasuje konfiguracji ani nie przerywa audio, jeśli bateria pozwala.
- Krytycznie niski poziom prowadzi do kontrolowanego shutdownu.

## Testy powerbanku

- start po podłączeniu USB,
- restart po krótkiej przerwie,
- zachowanie podczas ładowania,
- odłączenie i ponowne podłączenie kabla,
- czy powerbank nie wyłącza portu,
- 8 h Wi-Fi + BT + ekran przy stałym zasilaniu,
- reset reason po pełnym rozładowaniu.

## Obudowa

Core2 ma gotową obudowę. Dodatki mechaniczne dopiero później:

- podstawka,
- uchwyt do powerbanku,
- prosty organizer kabla,
- modele 3D community.
