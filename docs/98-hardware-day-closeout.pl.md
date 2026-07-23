# Zamknięcie dnia sprzętowego — 2026-07-15

## Wynik

M5Stack Core2 uruchamia teraz strzeżony obraz hardware-lab, odzyskuje zatwierdzony
profil Wi-Fi, rozpoczyna MP3 na głośniku wbudowanym, następnie łączy zapamiętany
głośnik Bluetooth Classic A2DP/SBC i kieruje do niego dźwięk. Podczas pierwszego
dnia sprzętowego fizycznie potwierdzono ekran, dotyk, lokalne audio, czas z sieci
i odtwarzanie Bluetooth.

To jest operacyjny kandydat laboratoryjny, nie publiczny release. Przed wydaniem
repozytorium nadal wymaga pełnej macierzy recovery, testów baterii/SD oraz
późniejszej bramki ośmiogodzinnej.

## Dowody i granica odzyskiwania

- Fabryczny firmware `v2.4` (`20250703`) przeszedł bazowy test ekranu, dotyku i
  głośnika wbudowanego przed pierwszym flashem.
- Cel identyfikuje się jako ESP32-D0WDQ6-V3 rev. 3.1, kryształ 40 MHz, flash
  16 MB i PSRAM.
- Przed pierwszym zapisem wykonano i zweryfikowano prywatny pełny obraz
  fabryczny 16 MiB wraz z sumą kontrolną.
- Każdy zapis wykonał `scripts/core2-device-action.sh`; nie było pełnego erase,
  operacji eFuse, zapisu rollbacku, OTA, publicznego uploadu ani release.
- Końcowy artefakt laboratoryjny z 2026-07-15 ma SHA-256
  `04ce1c2aa5b169774464044d5fba83292be09538f3041dfc13bb179ea4efefe9`.

## Błędy znalezione i zamknięte na sprzęcie

1. Persystencja ulubionych przepełniała stos głównej pętli podczas bootu.
   Duże tablice robocze zostały jawnie przeniesione do PSRAM.
2. Natywne piksele RGB565 były wysyłane z błędną kolejnością bajtów. Ścieżka
   ekranu ustawia teraz jawnie tryb M5GFX przed pierwszym obrazem.
3. Poprawiono kolejność onboardingu i QR. Lokalny QR konfiguracji jest duży, a
   trzy pola pojemnościowe A/B/C używają wspólnej logiki kontrolera UI.
4. Zmiana jasności ponownie ustawiała gain głośnika. Jasność i głośność mają
   osobne cache sprzętowe; suwaki działają płynnie przy drag, a zapis NVS
   następuje raz po puszczeniu.
5. Zegar korzystał ze starego RTC/UTC i złej reguły czasu letniego. Opcjonalny
   SNTP zapisuje lokalny czas Europe/Warsaw dopiero po zakończonej synchronizacji;
   aktualny log urządzenia pokazał prawidłową godzinę CEST.
6. Pogoda była niedokładna i psuła ekran minimalny. Decyzją właściciela została
   usunięta z GUI oraz runtime; nie jest zależnością bootu ani odtwarzania.
7. Lokalna ścieżka głośnika usuwała PCM, którego M5Unified nie przyjął. PCM jest
   teraz tylko podglądany i usuwany po skutecznym zapisie, z dwoma blokami
   zapasu oraz telemetrią starvation.
8. Pobieranie logotypów blokowało playback i mogło zawisnąć po błędzie. Teraz
   działa jako ograniczony task w tle, nie startuje podczas krytycznego audio,
   ponawia brakujące elementy i loguje zredagowane etapy.
9. Bluetooth mylił chwilowy backpressure A2DP z rozłączeniem i wracał na
   głośnik kostki. Routing opiera się teraz na prawdziwym callbacku połączenia,
   a callback źródła zawsze dostarcza pełny pakiet PCM dla SBC, w razie potrzeby
   uzupełniony chwilową ciszą.
10. Asocjacja Wi-Fi i inicjalizacja Bluetooth nakładały się w najciaśniejszym
    oknie DRAM. Zapamiętany BT startuje dopiero po pierwszym zdekodowanym audio,
    czyli po potwierdzeniu Wi-Fi, resolvera i strumienia.
11. Producent A2DP trzymał sekcję krytyczną przy kopiowaniu całego bloku audio.
    Zapis jest teraz dzielony na sekcje po 256 ramek.
12. Pinowany parser ICY mógł czekać bez końca na urwany blok metadanych.
    Reprodukowalna poprawka zależności ogranicza oczekiwanie do 500 ms, po czym
    działa jedna ograniczona próba reconnectu źródła i zewnętrzny backoff stacji.
13. Recovery po timeoutach wielokrotnie niszczyło i uruchamiało stos A2DP, gdy
    callbacki biblioteki nadal posiadały stan Bluetooth. Obraz końcowy uruchamia
    jeden stos Classic-only na boot, przekazuje reconnect jednemu zewnętrznemu
    nadzorcy, routuje dopiero po `AUDIO_STARTED` i używa watchdogu poboru PCM bez
    rozbierania stosu.
14. Jedno wywołanie dekodera MP3 mogło wypełnić cały ring i blokować pętlę UI
    przez sekundy; fallback lokalny mógł też zostawić fragment zbyt duży do
    dopełnienia i zbyt mały do odtworzenia. Progi low/high ograniczają pracę
    dekodera, a lokalny low watermark zawsze dopuszcza pełny blok głośnika.

## Wynik audio i pamięci

Ring zdekodowanego PCM i zapas Bluetooth mają po 131 072 stereofoniczne ramki
w PSRAM. Zapas Bluetooth to około 2,97 s przy 44,1 kHz; progi low/high dekodera
utrzymują zwykłą pracę foreground w zakresie 8 192–16 384 ramek zamiast
wypełniać cały zapas w jednym przebiegu pętli. Zmiana stacji jawnie czyści
kolejki, aby nie odtwarzać starej stacji.

Końcowa telemetria z krótkiego soaku:

- starty strumienia: 2; błędy startu: 0; stop: 1; ostatni start: 3 574 ms;
- starty stosu Bluetooth: 1; próby połączenia: 1; starty mediów: 1;
- retry Bluetooth: 0; fallbacki: 0; watchdogi poboru PCM: 0;
- bufor Bluetooth: 129 920 ramek; callbacki poboru PCM: 73 233;
- aktywna cisza Bluetooth: 10 368 ramek (około 235 ms), dodana podczas jednego
  początkowego restartu źródła i bez dalszego wzrostu w kolejnych próbkach;
- cisza poza aktywnym playbackiem: 156 544 ramki;
- stabilny wolny DRAM: 27 468 B; minimum historyczne: 11 840 B;
- największy blok DRAM: 15 860 B;
- high-water mark stosu pętli: 4 104 słowa;
- wolny PSRAM: około 2,44 MB; minimum historyczne: około 2,43 MB;
- stabilne stalle pętli dekodera: około 79–88 ms, z okazjonalnym pełnym
  przebiegiem 99–170 ms przy flushu ekranu.

Poprzedni obraz osiągał `dram_min=484` B. Jawne zwolnienie pamięci kontrolera BLE
i inicjalizacja Bluetooth wyłącznie w trybie Classic, wraz z jednym żyjącym
stosem, podniosły zmierzone minimum do 11 840 B w końcowym przebiegu. Długi soak
nadal musi wykazać, że minimum i największy blok nie degradują się z czasem.

## Bramka buildu i testów hosta

- Pełne `npm run check`: PASS.
- Testy Node: 188/188 PASS.
- Zestawy host firmware: PASS.
- Renderer: 17 przypadków, 28 ekranów, 112 wariantów PASS; determinizm PASS.
- Parity UI/kontrolera, schematy, overflow, prywatność powierzchni, lock
  zależności i parity dokumentacji: PASS.
- Build hardware-lab: 2 364 917 B flash aplikacji; binarka firmware
  2 371 488 B.
- Końcowy strzeżony flash ponownie uruchomił pełną kontrolę repozytorium przed
  zapisem, zweryfikował każdy segment i wykonał hard reset.
- `git diff --check`: PASS.

## Stacje, metadane i grafiki

- Wbudowany katalog zawiera dziewięć zgodnych wpisów MP3 i nie potrzebuje
  zdalnego katalogu do bootu.
- ESKA używa w ścieżce operacyjnej zweryfikowanego MP3/ICY 128 kb/s. Silnik
  HLS/HE-AAC buduje się w wariancie hardware-lab, ale nie jest ścieżką katalogu
  release i nie przeszedł endurance.
- `StreamTitle` ICY jest pokazywany, gdy nadaje go operator. Brak tytułu nie jest
  uzupełniany zmyśloną wartością.
- Automatyczna okładka live nie jest uniwersalną metadaną radia. Przyszły,
  opcjonalny resolver może korzystać z API nadawcy, RadioDNS/SI lub wymiennego
  publicznego lookupu muzycznego, ale musi być cache'owany, izolowany od błędów
  i poza ścieżką playbacku.
- Ten datowany snapshot nadal opisywał lokalną akcję pobierania logo. S26
  usunęło ten runtime na polecenie właściciela; lane hardware-lab używa teraz
  opcjonalnego build-time logo-packu opisanego w docs/104.

## Pozostałe bramki

1. 2026-07-16 wykonać od początku i zapisać 60-minutowy endurance MP3→Bluetooth
   bez wzrostu aktywnej ciszy po starcie, resetu, rozłączenia ani trendu pamięci.
   Właściciel jawnie odroczył tę niedokończoną bramkę na koniec sesji 2026-07-15.
2. 2026-07-16 pięć razy wyłączyć i włączyć głośnik BT; potwierdzić natychmiastowy
   fallback lokalny i ograniczony automatyczny powrót A2DP.
3. Pięć razy przerwać i przywrócić zatwierdzone Wi-Fi; potwierdzić odzyskanie
   strumienia bez utraty zapamiętanego głośnika.
4. Przejść przez wszystkie dziewięć stacji i sprawdzić tytuły per operator.
5. Historyczne i zastąpione: test pobierania wszystkich logo usunięto razem z
   runtime S26. Żadna bieżąca bramka recovery nie pobiera logotypów stacji.
6. Wykonać smoke PMU/baterii wewnętrznej, zewnętrznego powerbanku i SD. Powerbank
   USB-C nie udostępnia Core2 standardowego procentu; wiarygodnie można pokazać
   wyłącznie lokalne fakty PMU.
7. Przed obrazem release i macierzą kompatybilności wykonać soak 8 h, przerwę
   zasilania i recovery uszkodzonej konfiguracji.

## Werdykt operacyjny

`PASS WITH RISKS` do nadzorowanego użytku laboratoryjnego. Obecna kostka nadaje
się do dalszego słuchania i testów recovery. H4 nie jest zaliczone: dowody z
60 minut i restartu głośnika odroczono do 2026-07-16. Publiczny release pozostaje
zablokowany do zapisania powyższych bramek. Jedyny planowany claim to zgodność
oparta o standard Bluetooth Classic A2DP/SBC; głośniki wyłącznie LE Audio są
poza zakresem.
