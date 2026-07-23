# S20 — domknięcie kanonicznego GUI urządzenia

> Historyczny snapshot S20. Po integracji runtime zastąpiony przez
> `docs/88-final-pre-hardware-audit.pl.md`.

[English version](87-s20-canonical-device-ui-closeout.en.md)

## Dlaczego ta korekta istnieje

Poprzednie domknięcie GUI było zbyt optymistyczne. Akceptowało wyraźnie inny
font firmware 5×7, pokazywało trzy tryby podglądu i nazywało zgodność
współrzędnych gotowym widokiem urządzenia. To nie był wystarczający dowód. S20
zastępuje te deklaracje zamiast udawać, że nadal są aktualne.

## Dostarczone

- jeden kanoniczny canvas urządzenia 320×240 bez zakładek, trybu SVG i zoomu,
- ta sama ścieżka framebufferu C++ RGB565 w emulatorze hostowym i firmware Core2,
- jeden dołączony atlas Inter 600 generowany offline ze źródła na licencji OFL,
  obejmujący ASCII, Latin-1, Latin Extended-A i wybraną interpunkcję,
- Ciemny B jako domyślny i Jasny A nadal wybierany na urządzeniu,
- ograniczony layout tekstu z jawnym liczeniem elips i testami rozszerzonych glifów,
- nawigacja tap, hold i poziomym swipe z fizycznym celem powrotu jako fallback,
- zapis ulubionego utworu, deduplikacja, lista, szczegóły i usuwanie po dwóch tapach,
- wygaszacz on/off, ograniczone czasy, niezależny display-off i tryb kota,
- aktualizacja ekranu tylko po zmianie oraz ograniczenie animacji przy presji bufora audio.

## Znalezione i naprawione wady

1. Generator fontu zapisywał metadane glifów poza kolejnością codepointów, a
   renderer używał binary search. Część rozszerzonych znaków wpadała więc w `?`.
   Generowanie jest teraz sortowane i chronione testem regresji.
2. Browser lab mógł wcześniej pokazać wariant projektu i kompozycję
   przeglądarkową, które nie dowodziły wyniku firmware. Usunięto je z
   kanonicznego emulatora urządzenia.
3. Dokumentacja i status nadal opisywały stary stan 5×7, 22 ekranów i 88 klatek.
   Aktualne dokumenty publiczne wskazują 26 ekranów i 104 klatki.
4. Poprzednie stwierdzenie „software scope complete” ukrywało lukę integracji
   core. Aktualny entry point kompiluje się, ale nie uruchamia Wi-Fi, resolwera
   endpointu, odtwarzania MP3 ani połączenia z zapamiętanym głośnikiem A2DP.

## Dowody walidacji

- renderer: 15 testów skupionych, 26 ekranów, 104 warianty PL/EN i Light A/Dark B,
- determinizm: dwa świeże buildy, SHA-256 macierzy
  `b494904b2bfadca9b88c1da2821392301866497c78e0c0573295e25f26ee7e6c`,
- firmware host: przechodzą suite kontraktu, parytetu usług, hostile input,
  runtime, ingress i kontrolera UI, w tym cztery deterministyczne wirtualne soaki,
- bramka build-only Core2: kompiluje się pięć wariantów; pełny kandydat używa
  94 652 bajtów statycznego RAM i 1 487 461 bajtów application flash; dwa czyste
  buildy dają ten sam obraz 1 494 032 bajtów o SHA-256
  `4779e68dda4a960a383cbdca193ed423af36059358d8ad9a212579a1087471ae`,
- struktura przeglądarki: dokładnie jeden widoczny canvas 320×240 i brak starego UI,
- bramka repozytorium: przed ship wymagane są assety generowane, kontrakty,
  parytet dokumentacji, testy i czysty diff.

Żadna komenda w tej pętli nie flashuje, nie kasuje i nie monitoruje urządzenia.

## Czego nadal nie udowodniono

- fizycznej czytelności Inter i minimalnego praktycznego rozmiaru tekstu,
- alfabetów innych niż łaciński; wymagający ich pakiet kraju potrzebuje osobno
  budżetowanego atlasu compile-time zamiast pobierania w runtime,
- realnej kalibracji dotyku, zachowania krawędzi i niezawodności gestów,
- koloru IPS, jasności, kąta widzenia i dokładnego wyglądu optycznego,
- kosztu animacji podczas dekodowania i transmisji live audio,
- recovery Wi-Fi/streamu, dźwięku lokalnego i odtwarzania A2DP/SBC,
- współpracy z Xiaomi Sound Pocket i MOZOS Outdoor-Xtreme,
- endurance 60 minut i osiem godzin.

## Praca core przed sprzętową walidacją UX

1. Połączyć wybór zapamiętanego Wi-Fi i koniec onboardingu z `WiFi.begin`.
2. Połączyć wynik resolwera i last-known-good z `Mp3StreamPipeline::start`.
3. Połączyć zapamiętaną tożsamość głośnika z `BluetoothA2DPSource::start`.
4. Tłumaczyć callbacki usług na fakty runtime i ograniczone akcje recovery.
5. Zatrzymywać i restartować usługi po zmianie stacji bez blokowania dotyku i renderu.
6. Dopiero potem przejść jawną bramkę dostawy sprzętu i zmierzyć ekran oraz audio.

## Simplify Gate

**Tryb:** maksymalny przegląd pre-ship. **Zakres:** kanoniczne GUI, renderer,
kontroler, emulator, ścieżka kompilacji firmware i dokumentacja publiczna.

**Werdykt:** `PASS WITH RISKS` dla programowego GUI; `BLOCKED` dla grającego
urządzenia. Jest jeden renderer, jeden atlas, jeden canvas urządzenia i jeden
kontrakt kontrolera. Pozostałe blokery to integracja usług core i dowody
fizyczne, a nie ukryte alternatywne ścieżki GUI.
