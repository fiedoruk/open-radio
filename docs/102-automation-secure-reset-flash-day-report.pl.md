# Raport dnia: automatyzacja, bezpieczny reset i flash — 2026-07-16

[English](102-automation-secure-reset-flash-day-report.en.md)

## Wynik

Dokładny publiczny kandydat S26 został zbudowany powtarzalnie, wgrany przez
strzeżoną ścieżkę urządzenia i przeszedł krótki, zredagowany smoke od bootu do
mediów Bluetooth. Odzyskał lokalny stan, uruchomił znane zabezpieczone Wi-Fi i
MP3, zachował głośnik kostki jako fallback i bez dotykania ekranu doszedł do
zapamiętanego głośnika A2DP/SBC.

To jest PASS flasha i krótkiego smoke, a nie macierzy reconnect 3/3, bramki 60
minut ani publicznego release. Destrukcyjny secure reset pokrywają testy hosta i
QA wizualne, ale celowo nie wykonano go na fizycznej kostce, bo usunąłby profile
potrzebne do tego smoke.

## Zmiany produktu zamknięte dzisiaj

- Bluetooth startuje automatycznie po zdrowym, zbuforowanym lokalnym playbacku.
  Zapamiętany adres ma pierwszeństwo; bez zapamiętanego peer uruchamia się
  niezależne od modelu wyszukiwanie Classic audio/rendering z auto-retry.
- Reconnect ma jednego właściciela. Nie uruchamia drugiego dialu źródła, zanim
  niższa warstwa A2DP nie zamknie callbackiem poprzedniej próby. Przerwy retry
  mają ograniczony jitter 8–20 s, aby nie synchronizować się z pagowaniem
  głośnika.
- Do ośmiu zatwierdzonych zabezpieczonych profili Wi-Fi pozostaje lokalnie i
  jest wybierane automatycznie. Sieci obce, otwarte i captive nie są autojoin.
- Onboarding hotspotu na tym samym telefonie może trzymać dane w RAM, zanim
  hotspot stanie się widoczny, i zapisuje je dopiero po prawdziwym połączeniu.
- Ustawienia mają teraz lokalny reset z czerwonym potwierdzeniem drugim
  dotknięciem. Czyści całą domyślną partycję NVS: profile Wi-Fi, tożsamość/bond
  Bluetooth, ulubione, konfigurację i cache aplikacji, po czym restartuje
  urządzenie do onboardingu.
- Wiersze ulubionych ponownie uruchamiają zapisaną stację. Usunięto pobieranie,
  dekodowanie i cache logotypów stacji w runtime; pozostają oryginalne monogramy,
  kolory stacji i niebieski Open Radio.

Nie zmieniono zamrożonych buforów PCM, pompy dekodera, rezerwy fallbacku,
polityki volume/AVRCP, routingu ani bramki standby przed mediami.

## Dokładny artefakt i strzeżony flash

- SHA-256 firmware:
  `ac3bda385a1300558463f1a31ddae1ddcadf062a95595fef80164aa85f583950`.
- Binarka: 2 232 656 B; flash aplikacji: 2 226 085 B; statyczny RAM: 68 516 B.
- Dwa czyste buildy były identyczne bajt w bajt.
- Preflight ponownie potwierdził ESP32-D0WDQ6-V3 rev. 3.1 i flash 16 MB.
- Prywatny, zweryfikowany backup fabryczny 16 MiB pozostał dostępny.
- Każdy zapis bootloadera, partycji, boot-app i aplikacji zgłosił
  `Hash of data verified`; narzędzie zakończyło hard resetem.
- Flash zachował istniejące NVS.

## Zredagowany smoke fizyczny

Po resecie wywołanym monitorem uruchomił się lokalny MP3, a pełna rezerwa
zdekodowanego audio wypełniła się przed startem Bluetooth w trybie remembered.
Pierwszy dial zakończył się czystym page-timeoutem po 5 150 ms, gdy sink nie był
gotowy. Następnie głośnik podniósł inbound ACL; supervisor natychmiast zlecił
zwykły dial profilu źródła, który osiągnął A2DP CONNECTED w 423 ms. Rezerwa
standby się wypełniła, a media wystartowały automatycznie.

Próbka okresowa po starcie mediów pokazała:

- route: Bluetooth; starty mediów: 1; starty stosu: 1; próby połączenia: 2;
- lokalne starvation: 0; aktywna cisza Bluetooth: 0; pull-watchdogi: 0;
- bufor Bluetooth: 260 864 ramek; bufor decoded: 225 536 ramek;
- start/stop/błędy strumienia: 2/1/0; w końcowych próbkach źródło działało, a
  po reopenie nie rosła aktywna cisza;
- minimum DRAM wewnętrznego: 19 720 B; minimum PSRAM: 569 787 B;
- końcowe raportowane maksima pętli ustabilizowały się w okolicy 90–99 ms.

## Bramka jakości

- Pełne `npm run check`: PASS.
- Testy Node: 197/197 PASS.
- Zestawy host firmware: PASS, w tym 11 przypadków kontrolera UI.
- Renderer: 17 przypadków, 28 ekranów i 112 wariantów; macierz deterministyczna
  PASS.
- Parity EN/PL, overflow, schematy, lock zależności, powierzchnia prywatności i
  hardware-readiness: PASS.
- Powierzchnia firmware: zero sekretów, dziewięć zatwierdzonych endpointów, pięć
  opcjonalnych usług i zero bundlowanych grafik stacji.
- Celowany Snyk root projektu: brak podatnych ścieżek. Szerszy skan workspace
  znalazł osobno High w `yard` wyłącznie w przykładzie dokumentacyjnym mruby z
  dzielonego drzewa `.tools/esp-adf`; ten vendorowy przykład jest poza
  artefaktem źródłowym i wgranym firmware.
- `git diff --check`: PASS.

## Otwarte bramki fizyczne

1. Wykonać trzy świeże cykle OFF/ready głośnika na dokładnym SHA; każdy ma
   automatycznie wrócić do słyszalnego BT, bez wzrostu active-silence,
   starvation i pull-watchdogów po starcie mediów.
2. Wykonać obowiązkową bramkę 60 minut MP3→A2DP z jednym wymuszonym recovery
   strumienia i potwierdzić stabilność pamięci.
3. Sprawdzić nadchodzący Soundcore Boom Go 3i pod kątem rzeczywistej zgodności
   Classic A2DP/SBC i osobno zweryfikować, czy jego wyjście USB zasili Core2.
   Deklaracja produktu pozostaje zgodnością standardową, nie uniwersalną.
4. Domknąć PMU/baterię, SD, recovery Wi-Fi i fizyczny sweep dziewięciu stacji,
   a później ośmiogodzinny soak release.

Do przejścia tych bramek właściwy werdykt brzmi: software i krótki smoke
sprzętowy PASS; release BLOCKED.
