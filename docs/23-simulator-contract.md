# 23 — Kontrakt emulatora Core2

## Cel

Browser simulator odwzorowuje dokładny logiczny viewport wyświetlacza Core2:
`320x240`. Nie udaje jeszcze czasów dekodera, jakości RF, sterownika dotyku ani
wydajności PSRAM. Jest źródłem prawdy dla układu ekranów, tekstów, touch targetów,
state machine i scenariuszy recovery.

## Dwie warstwy

1. `Device viewport` — dokładnie 320x240, bez narzędzi developerskich.
2. `Scenario panel` — poza urządzeniem; symuluje Wi-Fi, BT, stream i restart.

Panel scenariuszy nigdy nie trafi do firmware. Pozwala testować stany bez
sprzętu i bez ręcznego odłączania infrastruktury.

## Wspólny język stanów

Simulator i przyszły firmware używają tych samych nazw kontraktowych:

- `BOOT_SELF_TEST`,
- `ONBOARDING`,
- `WIFI_SELECT`,
- `STREAM_RESOLVE`,
- `AUDIO_BUFFERING`,
- `OUTPUT_CONNECT`,
- `PLAYING`,
- `RECOVERING`,
- `DEGRADED_PLAYING`,
- `CONFIG_REQUIRED`,
- `SAFE_MODE`.

Implementacje JavaScript i C++ pozostaną osobne, ale fixtures, nazwy stanów,
teksty i scenariusze mają być generowane z wersjonowanego kontraktu danych.

## Zakres testów bez hardware

- wszystkie kroki onboardingu,
- nawigacja dziewięciu stacji,
- PL/EN i długości tekstów,
- utrata/odzyskanie Wi-Fi,
- utrata/odzyskanie Bluetooth,
- niedostępna stacja i automatyczny fallback,
- restart oraz wznowienie last-known-good,
- brak zapisanej konfiguracji,
- touch targets i brak overflow,
- screenshoty referencyjne 320x240.

## Czego nie nazywamy zweryfikowanym

- realny pairing A2DP,
- coexistence Wi-Fi/BT,
- kodeki i transport audio,
- czas startu,
- pobór energii,
- działanie PMU, baterii i dotyku,
- 8/24 h soak.

Te elementy pozostają `HARDWARE_REQUIRED` do czasu testu na fizycznym Core2.
