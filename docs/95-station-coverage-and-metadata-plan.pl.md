# Plan pokrycia stacji i metadanych

[English version](95-station-coverage-and-metadata-plan.en.md)

**Data:** 2026-07-15  
**Status:** plan wykonawczy po pierwszym uruchomieniu sprzętu; estymaty są
skupionym czasem inżynierskim, nie datą wydania.

## Stan dziewięciu stacji

| Stacja | Transport | Stan teraz | Warunek odbioru |
|---|---|---|---|
| RMF FM | MP3/ICY | działa w obecnym silniku | 60 min bez przerwy i poprawny reconnect |
| Radio ZET | MP3/ICY | działa w obecnym silniku | 60 min bez przerwy i poprawny reconnect |
| TOK FM | MP3/ICY | parser źródła do wykonania | oficjalny endpoint, LKG i 60 min |
| VOX FM | HLS/HE-AAC | brak dekodera | wspólny silnik HLS/HE-AAC i 60 min |
| Złote Przeboje | MP3/ICY | działa w obecnym silniku | 60 min bez przerwy i poprawny reconnect |
| Chillizet | MP3/ICY | działa w obecnym silniku | 60 min bez przerwy i poprawny reconnect |
| RMF MAXX | MP3/ICY | działa w obecnym silniku | 60 min bez przerwy i poprawny reconnect |
| Radio ESKA | HLS/HE-AAC | eksperymentalny kandydat urządzenia buduje się | dowód segment/dekodowanie, reconnect i 60 min |
| ESKA Impreska | HLS/HE-AAC | brak dekodera | wspólny silnik HLS/HE-AAC i 60 min |

Pięć stacji MP3 jest dziś wykonywalnych przez firmware. TOK FM jest osobnym,
małym pakietem parsera. Radio ESKA ma teraz eksperymentalną, ograniczoną
ścieżkę HLS/HE-AAC; VOX FM i ESKA Impreska pozostają odłączone, dopóki wspólny
silnik nie przejdzie bramki na urządzeniu.

## Kolejność i estymata

1. **Stabilizacja obecnych pięciu MP3 — 0,5–1 dnia.** Każda stacja dostaje
   test 60 min, reconnect Wi-Fi/streamu i licznik `audio_starvation == 0`.
2. **TOK FM — 1–2 dni.** Audyt oficjalnego playera, ograniczony parser,
   zapis last-known-good i test na urządzeniu.
3. **ESKA jako spike HLS/HE-AAC — dzień 1 wspólnego budżetu.** Parser
   master/media, jeden segment, próba dekodera z SBR i pomiar CPU/RAM. Wynik to
   jawne go/no-go.
4. **Produkcyjny HLS/HE-AAC — kolejne 2–4 dni.** Bufor segmentów, odświeżanie
   playlisty, względne URL-e, discontinuity, reconnect, rollover oraz wspólne
   wyjście lokalne/A2DP.
5. **VOX FM i ESKA Impreska — ostatnie 1–2 dni wspólnego budżetu.** Podpięcie
   do gotowego silnika, osobne resolvery i 60-minutowe testy każdej stacji.
6. **Bramka dziewięciu stacji — 1 dzień bez zmian funkcjonalnych.** Sekwencyjny
   test wszystkich stacji, utrata Wi-Fi, restart i odtworzenie LKG.

Etapy 3–5 mają jeden wspólny budżet **4–7 dni**, a nie trzy sumowane budżety.
Realna suma dla niezawodnego kompletu 9/9 wynosi około **6–10 skupionych dni
roboczych** po zamknięciu obecnych błędów P1: TOK FM 1–2, cały HLS 4–7 i
końcowa bramka 1 dzień. Największe ryzyko to potwierdzenie HE-AAC/SBR na ESP32,
nie sam parser playlisty.

## Okładka aktualnego utworu

Obecny firmware pokazuje `StreamTitle` i grafikę stacji, ale nie wyszukuje
okładki utworu. Plan jest celowo odseparowany od odtwarzania:

1. parser per stacja normalizuje `StreamTitle` do `artist` i `title`;
2. lookup uruchamia się tylko dla nowego, poprawnego tytułu i korzysta z
   udokumentowanego publicznego źródła z allowlisty;
3. pobierany obraz ma limit 96 KiB, jest dekodowany do 128×128 RGB565 poza
   gorącą ścieżką audio;
4. lokalny cache LRU przechowuje maksymalnie 16 okładek i 1 MiB;
5. timeout, brak wyniku lub błąd obrazu natychmiast wraca do logo/monogramu
   stacji; nigdy nie zatrzymuje radia;
6. nie używamy scrapingu Google ani Spotify i nie uruchamiamy własnego backendu.

Prototyp dla stacji MP3 to 1–2 dni. Wersja produkcyjna z cache, limitami,
redakcją logów i testami błędów to 2–4 dni. Metadane stacji HLS wchodzą po
gotowym silniku HLS.

## Definicja gotowości

`9/9 gotowe` oznacza: każda pozycja startuje z katalogu wbudowanego, odtwarza
60 minut na głośniku lokalnym i A2DP, odzyskuje Wi-Fi i stream, nie blokuje GUI,
a po restarcie potrafi użyć last-known-good bez zależności od zdalnego katalogu.
Okładki są dodatkiem i nie wchodzą do krytycznej ścieżki tej bramki.
