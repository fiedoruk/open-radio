# 34 — Prior art i reuse: Core2 internet radio → Bluetooth A2DP Source

**Data researchu:** 2026-07-13
**Zakres:** M5Stack Core2, radio internetowe po Wi-Fi, wbudowany głośnik oraz
wysyłanie PCM do zewnętrznego głośnika jako Bluetooth Classic A2DP Source.
**Metoda:** dokumentacja producentów i publiczne repozytoria; bez klonowania,
instalacji, flashowania i bez testu sprzętowego.

## Werdykt zarządczy

Nie wymyślamy od zera transportu audio. Oficjalny
[ESP-ADF `pipeline_bt_source`](https://github.com/espressif/esp-adf/tree/release/v2.x/examples/player/pipeline_bt_source)
realizuje dokładnie rdzeń `HTTP po Wi-Fi -> MP3 decoder -> PCM -> Bluetooth
A2DP Source`. Osobno [M5Unified](https://github.com/m5stack/M5Unified) obsługuje
Core2, ekran, dotyk, zasilanie i lokalny głośnik zarówno w Arduino, jak i
ESP-IDF. Istnieją również gotowe komponenty HLS i HE-AAC.

Nie istnieje jednak znalezione, gotowe do wgrania firmware, które jednocześnie
spełnia wszystkie nasze wymagania: Core2, dziewięć polskich stacji, własny
interfejs 320x240, bezpośredni A2DP Source do głośnika, automatyczny fallback na
głośnik Core2, bounded recovery, brak cloud/OTA i nieruchomy katalog. Gotowe
projekty Core2 kończą się na lokalnym głośniku; projekty z A2DP Source nie mają
naszego produktu, recovery i portu Core2.

Wniosek: **reuse elementów i referencyjnych pipeline'ów, ale własna cienka
warstwa produktu, supervisor i OutputRouter**. Nie forkować całego cudego radia.

## Porównanie projektów i bibliotek

| Projekt / link | Hardware / stack | Audio input / output | BT Source? | Licencja | Reuse verdict | Ryzyka |
|---|---|---|---|---|---|---|
| [ESP-ADF `pipeline_bt_source`](https://github.com/espressif/esp-adf/tree/release/v2.x/examples/player/pipeline_bt_source) | Klasyczny ESP32, ESP-IDF + ESP-ADF; przykład domyślnie na LyraT | HTTP MP3 po Wi-Fi -> decoder -> `bt_stream_writer` -> głośnik BT | **Tak** — dokładny kierunek wymagany przez projekt | Root: Espressif MIT z ograniczeniem do produktów Espressif; kodeki mają osobne warunki | **Najmocniejszy golden reference i pierwszy hardware spike.** Reuse pipeline, tasków, ringbufferów, zdarzeń BT i reconnect | Brak portu Core2; przykład nie ma naszego fallbacku I2S, resolvera i QC; pełny ADF jest większy niż minimalistyczny Arduino build |
| [ESP-ADF HTTP/HLS](https://docs.espressif.com/projects/esp-adf/en/latest/api-reference/streams/index.html) + [ESP audio codec](https://github.com/espressif/esp-adf-libs/tree/master/esp_audio_codec) | ESP32 / ESP-IDF; elementy pipeline uruchamiane w osobnych taskach | HTTP, HTTPS i HLS; MP3, AAC-LC, HE-AAC i HE-AACv2 -> PCM | **Tak, po złożeniu** z A2DP writer; brak jednego oficjalnego przykładu HLS->A2DP | `LicenseRef-Espressif-Modified-MIT`, wyłącznie dla produktów Espressif; część kodeków jest dostarczana jako biblioteki binarne | **Silny reuse techniczny dla 9/9 stacji**, szczególnie HLS/TS/HE-AAC | Nie jest w pełni vendor-neutral/open-source; publiczne GPL binary wymaga osobnego audytu zgodności i notices; CPU/RAM nadal do pomiaru na Core2 |
| [M5Unified](https://github.com/m5stack/M5Unified) i [oficjalny WebRadio example](https://github.com/m5stack/M5Unified/tree/master/examples/Advanced/WebRadio_with_ESP8266Audio) | Core2; Arduino **i ESP-IDF**; display, touch, PMU, speaker | ICY/MP3 -> własny `AudioOutputM5Speaker` -> wbudowany głośnik | Nie; osobny [Bluetooth example](https://github.com/m5stack/M5Unified/tree/master/examples/Advanced/Bluetooth_with_ESP32A2DP) jest A2DP **Sink** | MIT; decoder przykładu ma osobną licencję | **Reuse bez zmian jako HAL Core2 oraz wzorzec lokalnego outputu/fallbacku** | Przykład radia nie ma A2DP Source, HLS ani recovery; nie przenosić demonstracyjnej logiki aplikacji 1:1 |
| [ESP32-A2DP](https://github.com/pschatzmann/ESP32-A2DP) | Klasyczny ESP32; Arduino, PlatformIO i ESP-IDF | Callback/Stream PCM 44.1 kHz, stereo 16-bit -> SBC -> A2DP Sink | **Tak**; discovery, pairing, reconnect, AVRCP i callback PCM | Apache-2.0 | **Najlepszy lekki kandydat, jeśli pozostajemy przy Arduino/M5Unified** | Sam nie pobiera ani nie dekoduje radia; Wi-Fi+BT dzieli RF; projekt zgłasza przypadki niedoboru RAM przy MP3+A2DP; wymaga bounded queue i resamplera |
| [Arduino Audio Tools](https://github.com/pschatzmann/arduino-audio-tools) | ESP32; Arduino/PlatformIO/IDF, stream-oriented glue | URL/ICY/HLS -> MP3/AAC decoder -> Queue/Resampler -> I2S lub A2DP | **Tak**, przez ESP32-A2DP; ma osobne przykłady A2DP i HLS | GPL-3.0; opcjonalne kodeki mają własne licencje | **Dobry prototyp kompozycyjny i źródło bounded buffer abstractions** | Oficjalny HLS example sam ostrzega o pauzach przy przeładowaniu danych; brak gotowego, kwalifikowanego `live HLS -> A2DP` na jednym Core2; wersje API zmieniały się |
| [ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S) | ESP32 z PSRAM; Arduino; aktywnie rozwijany | ICY/HTTP, MP3, AAC/AAC+ i inne -> I2S; klasyczny ESP32 dekoduje AAC+ tylko mono, S3 dodaje SBR/PS | Nie w głównym pipeline; [przykład transmittera](https://github.com/schreibfaul1/ESP32-audioI2S/tree/master/examples/I2S%20Bluetooth%20Transmitter) używa drugiego ESP32 lub zewnętrznego emitera | GPL-3.0; wbudowany kod AAC wymaga osobnego provenance audit | **Reuse parsera ICY, decoder/task lessons i testów kodeków, nie całej architektury outputu** | Brak bezpośredniego HLS playlist/TS w repo; I2S-centric design utrudnia ten sam PCM kierować do A2DP i lokalnego speaker; klasyczny ESP32 ma ograniczenie AAC+ |
| [ESP32-MiniWebRadio](https://github.com/schreibfaul1/ESP32-MiniWebRadio) | Głównie ESP32-S3/P4, zewnętrzny DAC, TFT i SD | Rozbudowane radio MP3/AAC+ -> I2S; web UI, FTP, Radio Browser | Nie na jednym układzie; opcjonalny zewnętrzny `KCX_BT_EMITTER` | GPL-3.0 | **Reuse idei oddzielnego audio tasku, station assets i buffer telemetry** | Inny hardware, dużo funkcji, zdalny katalog, FTP i mutowalne listy kolidują z immutable/no-cloud; fork byłby cięższy niż własny core |
| [Amellinium M5Stack-Core2-WebRadio](https://github.com/Amellinium/M5Stack-Core2-WebRadio) | Dokładnie Core2; Arduino Core 2.0.17, M5Core2, ESP8266Audio | ICY/MP3 -> 256 KB buffer -> wbudowany speaker; Wi-Fi onboarding i stacje z SD | Nie | GPL-3.0 | **Najlepszy gotowy reference dla pinów, touch onboarding i lokalnego MP3 na Core2** | Monolityczny `.ino`, legacy `M5Core2`, tylko MP3, mutable SD catalog, brak BT/recovery; aktywność 2025 nie usuwa długu architektonicznego |
| [bwbguard M5Stack-Core2-MediaPlayer](https://github.com/bwbguard/M5Stack-Core2-MediaPlayer) | Dokładnie Core2; starszy Arduino/M5Core2 | ICY/MP3 -> SPIRAM buffer -> wewnętrzny DAC/speaker | Nie | GitHub wykrywa GPL-3.0; README ma nieprecyzyjną deklarację o reuse | **Historyczny reference, zastąpiony przez nowszy fork Amellinium** | Ostatnia aktywność 2021, blokujące Wi-Fi, hardcoded stations/credentials, brak BT/HLS/QC; nie kopiować kodu bez provenance |
| [ESP8266Audio](https://github.com/earlephilhower/ESP8266Audio) | ESP8266/ESP32/RP2040; Arduino | HTTP/ICY -> MP3/AAC -> abstrakcja `AudioOutput`; działa w oficjalnym Core2 example | Nie ma gotowego A2DP outputu | GPL-3.0; Helix AAC w repo jest objęty RPSL/RSPL i osobnymi uwagami AAC | **Reuse MP3 decoder/input i interfejsu output dla local-speaker POC** | Dokumentacja nazywa HTTP source nierezylientnym; brak HLS; łączenie AAC z publicznym GPL firmware wymaga głębszego audytu licencji |
| [Squeezelite-ESP32](https://github.com/sle118/squeezelite-esp32) | ESP32 WROVER z PSRAM; ESP-IDF | LMS/SlimProto po Wi-Fi -> decode/resample -> I2S/SPDIF/**A2DP Source** | **Tak**; działający dowód Wi-Fi->BT na jednym klasycznym ESP32 | Brak jednej wykrytej licencji repo; `output_bt.c` deklaruje MIT, drzewo zawiera wiele licencji | **Reuse algorytmów output buffer, 44.1 kHz resampling i reconnect patterns; nie firmware** | Zależność od lokalnego LMS łamie autonomię; bardzo duży feature surface, OTA/web UI; mixed-license audit kosztowny |
| [AtlasCube](https://github.com/marcinozog/AtlasCube) | ESP32-S3, ESP-IDF 5.5.4 + ESP-ADF 2.8, custom board/display | HTTP/HLS MP3/AAC/FLAC -> lokalny DAC; HLS TS demux i recovery | **Nie dla naszego celu**; Bluetooth to zewnętrzny QCC5125 jako wejście/sink do lokalnego DAC | MIT projektu + zależności ESP-ADF o osobnych warunkach | **Bardzo dobry aktualny reference dla HLS, ICY, retry, web simulator i podziału usług** | Inny MCU bez Classic A2DP, zewnętrzny BT, OTA/update check/MQTT/mobile app; pełny fork łamie prostotę i immutable contract |
| [paulgreg/esp32-audio-station](https://github.com/paulgreg/esp32-audio-station) | ESP32 + zewnętrzny VS1053 | Web radio MP3/AAC lub telefon jako A2DP Sink -> lokalny output | Nie; „Bluetooth speaker” oznacza receiver/sink, nie nadajnik | Apache-2.0 projektu; fork decoder library i inne zależności osobno | **Nie pasuje do hardware ani kierunku BT; tylko reference przełączania źródeł** | Wymaga zewnętrznego VS1053 i hostowanego JSON katalogu, więc koliduje z all-in-one oraz immutable/no-cloud |

## Co jest już rozwiązane przez ekosystem

1. **Core2 HAL:** M5Unified obsługuje ekran, dotyk, speaker, power i baterię oraz
   działa pod ESP-IDF. Nie piszemy własnych driverów Core2.
2. **Dokładny MP3 -> BT pipeline:** ESP-ADF ma oficjalny przykład
   `http_stream -> mp3_decoder -> bt_stream_writer` działający na jednym
   klasycznym ESP32.
3. **A2DP Source:** ESP-IDF i ESP32-A2DP obsługują source, discovery, połączenie
   z sinkiem i podawanie PCM. Oficjalne ESP-IDF potwierdza role Source/Sink i
   SBC jako podstawowy kodek klasycznego ESP32.
4. **Wi-Fi + Classic BT coexistence:** jest wspierane przez ESP32, ale jedno
   radio 2.4 GHz jest dzielone czasowo. To nie jest zakaz architektoniczny,
   tylko obowiązkowy test przepustowości, underrunów i reconnect.
5. **HLS i HE-AAC:** ESP-ADF/esp-adf-libs mają parser HLS, TS i dekoder
   AAC-LC/HE-AAC/HE-AACv2. Arduino Audio Tools ma również composable HLS
   example, ale bez dowodu jakości na naszym połączeniu z A2DP.
6. **Lokalny speaker:** oficjalny przykład M5Unified zawiera gotowy
   `AudioOutputM5Speaker` i trójbuforowy adapter do wbudowanego głośnika.

Źródła producenta: [ESP-IDF A2DP API](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/bluetooth/esp_a2dp.html),
[ESP-IDF RF coexistence](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/coexist.html),
[ESP-ADF Bluetooth service](https://docs.espressif.com/projects/esp-adf/en/latest/api-reference/services/bluetooth_service.html),
[ESP-ADF audio pipeline](https://docs.espressif.com/projects/esp-adf/en/latest/api-reference/framework/audio_pipeline.html).

## Czego nadal nie daje żaden gotowiec

- naszego kontraktu `PLAYING` jako celu nadrzędnego i bounded supervisor,
- dokładnego resolvera dziewięciu polskich stacji i LKG bez wycieku endpointów,
- jednego `OutputRouter`, który bez restartu wybiera A2DP albo Core2 speaker,
- deterministycznego fallbacku po utracie Wi-Fi, streamu lub BT,
- naszego 320x240 GUI, tematów stacji i bilingwalnego kontraktu,
- dual-slot persistence, safe mode oraz immutable/no-OTA lifecycle,
- dowodu 24 h na jednym Core2 z konkretnymi polskimi HLS/HE-AAC streamami.

To jest właściwy obszar naszego kodu. Dekoderów, BT state machine i driverów
Core2 nie należy przepisywać bez wyniku eksperymentu pokazującego konieczność.

## Rekomendacja build-vs-reuse

### Rekomendowany tor: własny produkt na gotowych klockach

1. **Utrzymać własne:** katalog/resolver, health/LKG, persistence, supervisor,
   OutputRouter, UI i telemetry wyłącznie lokalną.
2. **Reuse bezpośredni:** M5Unified dla Core2 i lokalnego speaker output.
3. **Pierwszy hardware spike:** przenieść minimalny oficjalny ESP-ADF
   `pipeline_bt_source` na Core2 i zmierzyć `HTTP MP3 -> A2DP` bez GUI.
4. **Drugi spike:** do tego samego pipeline dołączyć lokalny output Core2 i
   przełączać dokładnie jeden aktywny sink.
5. **Trzeci spike:** HLS/HE-AAC -> PCM -> A2DP na jednej stacji ZPR, z pomiarem
   internal heap, PSRAM, underrunów i obciążenia rdzeni.
6. **Dopiero potem wybrać firmware stack:**
   - ESP-IDF + ESP-ADF, jeśli wygrywa stabilnością i przejdzie publiczny
     dependency/license gate;
   - M5Unified + ESP32-A2DP + Audio Tools, jeśli ważniejszy okaże się mniejszy
     i bardziej przejrzysty GPL stack.

Nie rekomenduję forkowania MiniWebRadio, AtlasCube, Squeezelite ani gotowego
Core2 WebRadio. Każdy z nich przynosi więcej cudzej polityki produktu niż
użytecznego kodu dla naszej kostki.

## Komponenty do reuse

| Priorytet | Komponent | Dokładny zakres reuse |
|---|---|---|
| P0 | [M5Unified](https://github.com/m5stack/M5Unified) | Core2 init, display/touch, PMU/battery, speaker HAL; bez legacy `M5Core2` |
| P0 | [ESP-ADF `pipeline_bt_source`](https://github.com/espressif/esp-adf/tree/release/v2.x/examples/player/pipeline_bt_source) | topologia zadań, ringbuffery, HTTP->MP3->A2DP, BT events i minimalny proof |
| P0 alternative | [ESP32-A2DP](https://github.com/pschatzmann/ESP32-A2DP) | A2DP Source, discovery/filter sink, reconnect, PCM callback, SBC negotiation |
| P1 | [M5Unified WebRadio output](https://github.com/m5stack/M5Unified/blob/master/examples/Advanced/WebRadio_with_ESP8266Audio/WebRadio_with_ESP8266Audio.ino) | adapter PCM do local speaker i wzorzec potrójnego bufora |
| P1 | [ESP-ADF HTTP/HLS](https://docs.espressif.com/projects/esp-adf/en/latest/api-reference/streams/index.html) | HTTP(S), playlist parser, live fetch i HLS segment handling |
| P1 conditional | [ESP audio codec](https://github.com/espressif/esp-adf-libs/tree/master/esp_audio_codec) | MP3/AAC/HE-AACv2 decoder tylko po dependency/license gate |
| P1 alternative | [Arduino Audio Tools](https://github.com/pschatzmann/arduino-audio-tools) | queue, resampler, HLS/ICY stream abstractions i host-testable glue |
| P2 reference | [Squeezelite `output_bt.c`](https://github.com/sle118/squeezelite-esp32/blob/master-v4.3/components/squeezelite/output_bt.c) | metryki underflow, 44.1 kHz output, bounded buffering i BT lifecycle patterns |
| P2 reference | [AtlasCube radio service](https://github.com/marcinozog/AtlasCube/tree/main/components/services) | aktualny ESP-ADF service split, HLS retry i ICY event handling; nie kopiować feature surface |

## Licencyjny stop-gate przed publicznym binarium

Projektowy `GPL-3.0-or-later` jest zgodny kierunkowo z M5Unified MIT,
ESP32-A2DP Apache-2.0 i bibliotekami GPL. Nie wolno jednak automatycznie uznać
całego firmware za licencyjnie zamknięte:

- ESP-ADF root i `esp-adf-libs` ograniczają część kodu do produktów Espressif;
  Core2 spełnia techniczny warunek użycia, ale warunek field-of-use wymaga
  sprawdzenia zgodności z dystrybucją GPL;
- `esp_audio_codec` zawiera gotowe biblioteki binarne, więc nie daje pełnej
  przejrzystości źródła;
- Helix AAC w ESP8266Audio/arduino-libhelix wskazuje RPSL/RSPL i dodatkowe
  obowiązki niezależne od licencji wrappera;
- AAC/HE-AAC ma osobny wymiar patentowy/licencyjny, nawet dla publicznego POC;
- każdy publiczny firmware potrzebuje pinned SBOM i
  `THIRD-PARTY-NOTICES.md`.

To nie blokuje software-only prototypu ani prywatnego testu Core2, ale blokuje
twierdzenie „w pełni otwarty, gotowy publiczny binary” przed audytem zależności.

## Ostateczna odpowiedź: czy wynajdujemy koło?

**Nie w warstwie audio. Tak — świadomie — w warstwie produktu i niezawodności.**
Gotowy jest transport HTTP/MP3/A2DP, HLS/AAC, Core2 HAL i lokalny speaker.
Unikalna wartość Open Radio Core2 to złożenie ich w małą, nieruchomą kostkę,
która zna polskie stacje, sama wraca do `PLAYING`, nie potrzebuje serwera i ma
udokumentowany failure contract. To uzasadnia własny projekt, ale nie własne
dekodery ani własny stos Bluetooth.
