# 06 — Minimalny produkt i UI

## Ekran normalny

- nazwa stacji,
- stan audio: Bluetooth albo wbudowany speaker,
- mały stan Wi-Fi,
- głośność,
- poprzednia/następna stacja,
- brak animacji stale obciążających CPU.

## Pierwsza konfiguracja

Onboarding wymaga tylko Wi-Fi. Lokalizacja, region, strefa czasowa, kandydat
języka i stacja startowa dobierają się automatycznie; głośnik Bluetooth można
pominąć. Wszystkie wyniki można później poprawić w ustawieniach. Szczegóły są w
`docs/22-onboarding-contract.md`.

## Trzy powierzchnie produktu

1. `Now playing` — domyślny ekran.
2. `Stations` — prosta lista dziewięciu stacji.
3. `Settings` — Wi-Fi, Bluetooth, język, jasność, About i diagnostyka.

## Zachowanie dotyku

- duże strefy, możliwe do obsługi jednym palcem,
- żadnych ukrytych gestów wymaganych do podstawowego użycia,
- long press tylko dla rzadkich operacji: pairing/reset konfiguracji,
- UI nie zatrzymuje ani nie rekonfiguruje pipeline bez command queue.

## Stany błędów

Użytkownik widzi osobno:

- `Brak Wi-Fi / No Wi-Fi`,
- `Stacja niedostępna / Station unavailable`,
- `Łączenie głośnika / Connecting speaker`,
- `Gra z urządzenia / Playing locally`,
- `Ponawiam / Retrying`,
- kod diagnostyczny w widoku szczegółowym.

## Emulator przed hardware

Dokładny viewport 320x240 jest implementowany jako aplikacja przeglądarkowa.
Warstwa developerska poza ekranem symuluje awarie Wi-Fi, BT i streamu. Kontrakt
jest w `docs/23-simulator-contract.md`.

## Viral po stabilnym rdzeniu

- dopracowany ekran now-playing,
- QR do repo w About,
- oryginalne motywy community i prywatne pakiety logotypów,
- otwarte modele obudów/standów,
- prosty ekran wersji i autorstwa,
- gotowe pliki firmware z checksumą.
