# Silnik audio i kierunek kontroli jakości

[English version](94-audio-engine-quality.en.md)

**Data:** 2026-07-15  
**Status:** stanowisko inżynierskie; dowody wynegocjowanego kodeka Bluetooth i
pomiary odsłuchowe na fizycznych głośnikach są nadal przed nami.

## Stanowisko

Obecny tor nadaje się do testowania niezawodności, ale nie mamy jeszcze dowodu,
że daje 100% jakości dostępnej w źródle ani najwyższą jakość, jaką utrzyma
Bluetooth Core2. Topowy głośnik poprawi wzmacniacz, przetworniki i zachowanie w
pomieszczeniu, lecz nie odtworzy informacji utraconej przez kodek nadawcy ani
przez drugie stratne kodowanie SBC.

Praktyczny cel nie brzmi więc „lossless”. Brzmi: wybrać najlepsze oficjalne
źródło, zachować zdekodowany PCM bez clippingu, przerw i zbędnego resamplingu,
a następnie wynegocjować stabilne SBC wysokiej jakości.

## Obecny silnik

| Etap | Obecna implementacja | Znana granica |
|---|---|---|
| Wejście stacji | Oficjalne ścieżki MP3/ICY wspieranych stacji | Bitrate i processing nadawcy wyznaczają pierwszy sufit jakości |
| Dekodowanie | Dekoder MP3 `libmad` z ESP8266Audio | Akceptujemy wyjście stereo 44,1 kHz odpowiadające 16 bitom |
| Magistrala wewnętrzna | PCM signed 16-bit stereo, 44,1 kHz | Nie ma resamplera; zły format jest zatrzymywany zamiast grania w złym tempie |
| Wyjście lokalne | Kolejka głośnika M5Unified | Fallback i diagnostyka, nie referencja hi-fi |
| Wyjście Bluetooth | ESP32 Classic A2DP Source przez ESP32-A2DP | Obowiązkowa zgodność SBC; bez deklaracji aptX, LDAC i LE Audio |
| Recovery | 8192 ramek PCM w PSRAM plus dwa sloty M5 po 4096 ramek | Około 186 ms rezerwy dekodera i kolejne 186 ms w kolejce sprzętowej; RF coexistence i długoterminowe głodzenie wymagają pomiaru |

Wartości recovery w tej tabeli opisują stan zapisany 2026-07-15. Bieżące
wartości rezerwy runtime, standby i recovery Bluetooth utrzymuje
[docs/104](104-cc-stabilization-closeout.pl.md).

Wyjście lokalne nie odrzuca niepełnego bloku. Czeka na kompletne 4096 ramek,
kolejkuje najwyżej dwa sloty udostępniane przez M5Unified i raportuje każde
głodzenie kolejki po starcie jako zredagowany licznik szeregowy
`audio_starvation`. To bezpośrednio adresuje zbyt krótką kolejkę wykrytą w H1.
Duże ringi PCM i Bluetooth są teraz jawnie w PSRAM, aby zostawić wewnętrzny
DRAM dla Wi-Fi, Bluetooth, TLS i DMA.

ESP32-D0WDQ6-V3 obsługuje Bluetooth 4.2 BR/EDR + BLE. Sam numer generacji nie
wyznacza jakości dźwięku. Dla produktu liczy się Classic A2DP i wynegocjowana
konfiguracja SBC. Firmware nie zapisuje jeszcze trybu kanałów, bitpoolu ani
efektywnego bitrate’u SBC, więc twierdzenie, że obecne łącze osiąga maksimum,
byłoby zgadywaniem.

## Gdzie tracimy jakość

1. Większość źródeł radiowych to już stratne MP3 lub AAC, często z mocnym
   processingiem głośności po stronie nadawcy.
2. Radio dekoduje źródło do PCM.
3. A2DP Source ponownie koduje PCM do SBC dla głośnika.

To stratne transkodowanie jest główną granicą architektury. Stabilne SBC z
wysokim wynegocjowanym bitpoolem nadal może brzmieć bardzo dobrze dla radia
internetowego, ale nie jest bit-perfect. Dobry głośnik po prostu łatwiej pokaże
wady.

Obecna regulacja głośności steruje lokalnym głośnikiem M5. Głośność Bluetooth
normalnie ustawia się na samym głośniku; projekt nie wymaga AVRCP i obecnie nie
nakłada osobnego gainu DSP na PCM wysyłany przez Bluetooth.

## Prace jakościowe, które mają sens

P1 przed deklaracją jakości audio:

- zinwentaryzować faktyczny kodek, sample rate i bitrate każdej stacji;
- zapisać wynegocjowany sample rate, tryb kanałów, min/max bitpool i efektywne
  parametry SBC bez identyfikatorów urządzenia;
- wykorzystać lokalny licznik `audio_starvation` i dodać analogiczne liczniki
  odrzuconych ramek oraz przerw callbacków Bluetooth;
- udowodnić brak niezamierzonego resamplingu, zamiany kanałów, clippingu i DC;
- porównać lokalny PCM z referencyjnym dekoderem hostowym;
- zrobić stress RF przy Wi-Fi, odświeżaniu ekranu i każdym głośniku docelowym;
- przeprowadzić odsłuch wyrównany poziomem, a nie test „głośniejsze = lepsze”.

## Pakiety wykonawcze

1. **AQ0, ciągłość lokalna — 0,5 dnia:** 60 minut na każdej działającej stacji,
   aktywny ekran i pobieranie dodatków, wynik `audio_starvation == 0`.
2. **AQ1, telemetria jakości — 1–2 dni:** format/bitrate źródła, przerwy
   callbacków, wynegocjowany tryb kanałów i bitpool SBC, bez identyfikatora
   głośnika.
3. **AQ2, najlepsze źródła — 1–2 dni:** porównanie oficjalnych kandydatów i
   wybór najwyższej stabilnej jakości dla każdej stacji.
4. **AQ3, dwa docelowe głośniki — 1–2 dni:** RF stress, reconnect oraz
   wyrównane poziomem A/B z telefonem odtwarzającym ten sam stream.
5. **AQ4, DSP tylko po dowodzie — do 1 dnia:** gain/limiter wyłącznie wtedy,
   gdy pomiar potwierdzi clipping albo szkodliwe różnice poziomu.
6. **Bramka — 8 godzin:** soak bez słyszalnych przerw i bez nowych underrunów.

Po AQ0 można deklarować stabilną ścieżkę lokalną. Dopiero AQ1–AQ4 pozwalają
uczciwie powiedzieć, ile jakości daje źródło i konkretne połączenie Bluetooth.

P2 po pomiarach:

- wybierać najlepsze jakościowo stabilne oficjalne źródło każdej stacji;
- dodać ograniczony gain/limiter PCM tylko wtedy, gdy pomiary pokażą clipping
  albo duże różnice głośności między stacjami;
- stroić głębokość kolejek i politykę SBC wyłącznie na podstawie pomiarów;
- dodać ekran `Audio QC` z formatem źródła, PCM, parametrami SBC i licznikami.

aptX i LDAC nie są realistycznym domyślnym kierunkiem dla otwartego Core2: nie
należą do obecnego kontraktu ESP32-A2DP/SBC i wnoszą ograniczenia implementacji,
zgodności oraz licencji. Jeśli potrzebna będzie jakość wyższa od dobrego SBC,
zewnętrzny przewodowy DAC I2S albo inny hardware stanowi osobną linię produktu.

## ESKA i HLS/HE-AAC

Oficjalny player ESKI udostępnia obecnie
`https://liveradio.timesa.pl/2980-1.aac/playlist.m3u8`. Master deklaruje około
85 kbit/s oraz `mp4a.40.5`, czyli HE-AAC, a nie wspieraną dziś ścieżkę MP3.

Kandydat z 2026-07-15 ma już ograniczony parser playlist, prefetch segmentów
MPEG-TS w PSRAM, demux ADTS, Helix HE-AAC/SBR i resampling 48 -> 44,1 kHz.
Kompiluje się i jest podpięty do pozycji ESKA, ale pozostaje eksperymentalny
do czasu testu sprzętowego. Niezawodne wsparcie ESKI nadal wymaga:

1. ograniczonego parsera playlist HLS master i media;
2. rozwiązywania względnych URL-i, odświeżania segmentów i discontinuity;
3. przesuwnego bufora segmentów, który nie zagłodzi kolejki audio;
4. spike’a dekodera HE-AAC potwierdzającego SBR, RAM, CPU i licencję;
5. wspólnej ścieżki głośnika lokalnego oraz A2DP/SBC;
6. dowodów reconnectu, rolloveru playlisty i 60 minut działania.

Spike jednej stacji to około jednego skupionego dnia. Wersja przetestowana na
sprzęcie, odporna na awarie i obejmująca ESKĘ oraz pozostałe stacje HLS ZPR to
realnie cztery–siedem dni roboczych. Krytyczną niewiadomą jest dekoder:
przypięte ESP8266Audio buduje już ścieżkę Helix AAC, ale działanie HE-AAC/SBR
w czasie rzeczywistym nie zostało jeszcze potwierdzone na Core2.

## Bramka akceptacji

Nie deklarujemy `maksymalnej jakości`, dopóki dwa nazwane głośniki nie przejdą:

- 60 minut bez słyszalnych przerw i underrun PCM/SBC;
- reconnectu Wi-Fi i streamu bez trwałego pogorszenia jakości;
- zapisu wynegocjowanych parametrów SBC;
- wyrównanego poziomem A/B z tą samą stacją odtwarzaną przez telefon;
- 8-godzinnego soak dla kandydata wydania.

## Źródła podstawowe

- [Datasheet Espressif ESP32](https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf)
- [API Classic Bluetooth A2DP w ESP-IDF](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/bluetooth/esp_a2dp.html)
- [Dokumentacja M5Stack Core2](https://docs.m5stack.com/en/core/core2)
- [Oficjalny player Radia ESKA](https://player.eska.pl/?stream_uid=radio_eska)
- [Opis specyfikacji Bluetooth A2DP](https://www.bluetooth.com/specifications/specs/advanced-audio-distribution-profile-1-4/)
