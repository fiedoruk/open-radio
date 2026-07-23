# 00 — Intake v2: M5Stack Core2

## Cel

Zbudować możliwie proste i niezawodne radio internetowe, które po włączeniu
odtwarza polską stację przez zapamiętany głośnik Bluetooth.

## Zamrożone wymagania

- M5Stack Core2 jako jedyna płytka MVP.
- Stałe zasilanie USB-C z powerbanku.
- Wi-Fi jako źródło radia.
- Bluetooth A2DP jako główne wyjście.
- Wbudowany głośnik jako fallback.
- Polskie stacje i domyślne UI PL.
- Kod i techniczne interfejsy EN; dokumentacja publiczna EN/PL.
- Open source, widoczne autorstwo i community contributions.
- Brak chmury, kont i telemetrii w MVP.

## Lista stacji

RMF FM, Radio ZET, TOK FM, VOX FM, Złote Przeboje, Chillizet, RMF MAXX,
Radio ESKA i ESKA Impreska.

## Definicja prostoty

Prostota nie oznacza braku obsługi błędów. Oznacza:

- jeden główny flow,
- jeden zapamiętany głośnik,
- ostatnia działająca stacja,
- jeden lokalny katalog,
- czytelne stany,
- automatyczny recovery,
- minimum zależności.

## Poza MVP

Podcasty, nagrywanie, multiroom, aplikacja mobilna, wiele głośników, Spotify,
DRM, konta, cloud dashboard, automatyczne OTA i telemetria.

## Otwarte decyzje

Kanoniczna lista znajduje się w `docs/11-owner-questionnaire.md`.
