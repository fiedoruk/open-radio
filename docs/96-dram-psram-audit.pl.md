# Audyt DRAM/PSRAM Core2

**Data:** 2026-07-15

**Zakres:** pełny firmware Wi-Fi + lokalne audio + Bluetooth A2DP + HLS/HE-AAC

## Werdykt

Wewnętrzny DRAM jest krytycznym budżetem tego urządzenia. Nie chodzi wyłącznie
o liczbę wolnych bajtów: Wi-Fi, Bluetooth, TLS, stosy FreeRTOS i część buforów
DMA potrzebują pamięci z odpowiednimi capability. Moduł ma 8 MB PSRAM, z czego
bieżąca konfiguracja stosu udostępnia około 4 MiB jako stertę capability;
nadaje się ona do dużych framebufferów, PCM, segmentów HLS oraz grafik, ale
nie zastępuje DRAM we wszystkich rolach.

Pierwszy pełny build po dołożeniu HLS potwierdził realny błąd budżetu:
linker zgłosił `.dram0.bss overflowed by 11664 bytes`. Atrybut `EXT_RAM_ATTR`
na ring-bufferze PCM nie działał w tej konfiguracji Arduino; mapa pokazała
`.ext_ram.bss = 0`, a `decodedFrames` zajmował `0x8014`, czyli 32 788 bajtów
wewnętrznego DRAM.

Bufor dekodera i kolejka Bluetooth są teraz jawnie alokowane przez
`heap_caps_calloc(..., MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT)`. Nie mają
fallbacku do DRAM: brak PSRAM zatrzymuje start audio zamiast po cichu zabrać
pamięć stosom radiowym.

## Wynik mapy po poprawce

Pełny wariant `core2-public-candidate`:

| Sekcja | Bajty |
|---|---:|
| `.dram0.data` | 30 068 |
| `.dram0.bss` | 38 448 |
| statyczny DRAM razem | 68 516 |
| statyczna przestrzeń do końca głównego segmentu DRAM | 56 064 |
| flash aplikacji raportowany przez PlatformIO | 2 364 917 |

Build przechodzi. Sama mapa nie mierzy jednak dynamicznego szczytu Wi-Fi,
Bluetooth ani TLS, dlatego bramka końcowa korzysta też z logów urządzenia.

## Jawne duże alokacje PSRAM

| Bufor | Maksymalny rozmiar |
|---|---:|
| framebuffer RGB565 320x240 | 153 600 B |
| ring zdekodowanego PCM, 262 144 ramki stereo | 1 048 576 B |
| ring Bluetooth, 262 144 ramki stereo | 1 048 576 B |
| wejściowy jitter-buffer MP3 | 4 096 B |
| trzy mono-bufory lokalnego głośnika | 294 912 B |
| blok do przekazania PCM, 49 152 ramek stereo | 196 608 B |
| ring HLS | 262 144 B |
| pojedynczy segment HLS | 196 608 B |

Suma jawnego najgorszego przypadku to 3 205 120 B (około 3,21 MB) plus małe obiekty,
tymczasowe sprite'y i narzut alokatora. Nie wszystkie ścieżki są aktywne
jednocześnie, ale bramka musi zakładać ich legalne nakładanie. Jest to możliwe
dla około 4 MiB PSRAM, lecz wymaga telemetrii i zakazu cichego fallbacku dużych
buforów do DRAM.

To datowana mapa. W S26 usunięto sieciowy runtime logotypów i jego alokacje;
bieżący opcjonalny build-time logo-pack nie przywraca tych buforów runtime.

Przed startem przypiętej biblioteki A2DP firmware jawnie zwalnia pamięć
kontrolera BLE i inicjalizuje kontroler tylko jako Bluetooth Classic. Jest to
istotne: domyślne `BTDM` rezerwowałoby DRAM dla nieużywanego BLE. Stos A2DP jest
uruchamiany dokładnie raz na boot; reconnect nie niszczy i nie tworzy ponownie
kontrolera ani Bluedroid.

## Co musi zostać w DRAM

- sterty i struktury stosów Wi-Fi oraz Bluetooth;
- stan TLS i bufory wymagane przez bibliotekę sieciową;
- stos głównej pętli oraz tasków HLS;
- pamięć wymagana przez peryferia/DMA;
- gorący stan dekoderów, jeżeli biblioteka nie dopuszcza PSRAM.

Nie przenosimy tych obszarów mechanicznie. Najpierw mierzymy największy
ciągły blok, minimum historyczne i high-water mark stosu.

## Telemetria i bramka sprzętowa

Firmware co 60 sekund wypisuje jeden zredagowany rekord:

`memory stage=runtime dram_free=... dram_min=... dram_largest=... psram_free=... psram_min=... psram_largest=... loop_stack_bytes=...`

Taski HLS raportują również swój stack high-water mark.

Telemetria audio rozdziela teraz normalny backpressure od realnej ciszy:

`audio_qc decoded_backpressure=... bt_active_silence_frames=... bt_idle_silence_frames=... bt_backpressure=... stream_starts=... stream_failures=... stream_stops=... bt_stack_starts=... bt_connect_attempts=... bt_media_starts=... bt_retries=... bt_fallbacks=... bt_pull_watchdogs=...`

`bt_active_silence_frames` jest właściwą miarą przerw A2DP podczas zdrowego
playbacku. Cisza emitowana przed startem lub podczas reconnect nie jest już
mylona z aktywnym underrunem.

Końcowy krótki przebieg 2026-07-15 wykazał `dram_free=27468`,
`dram_min=11840`, `dram_largest=15860`, około 2,44 MB wolnego PSRAM i 4 104
słowa high-water mark stosu pętli. Stos BT wystartował raz; odnotowano jedną
próbę połączenia, jeden start mediów, zero retry, fallbacków i watchdogów poboru
PCM. Początkowy restart źródła zwiększył `bt_active_silence_frames` do 10 368
(około 235 ms), po czym licznik nie rósł w kolejnych próbkach. To dobry wynik
krótkiej obserwacji, ale nie dowód bramki 60-minutowej.
Podczas testu trzeba zebrać wartości po:

1. starcie MP3 i po 60 minutach;
2. starcie ESKI/HLS i po odświeżeniu co najmniej 20 segmentów;
3. połączeniu i reconnect Bluetooth;
4. utracie oraz odzyskaniu Wi-Fi;
5. dziesięciu zmianach stacji.

Kandydat nie przechodzi bramki, jeśli alokacja audio PSRAM się nie powiedzie,
`dram_largest` systematycznie maleje po każdym reconnect, pojawia się reset
OOM/watchdog albo high-water mark któregokolwiek stosu zbliża się do zera.
Progi liczbowe zostaną zamrożone dopiero z pierwszego pełnego soaku na tej
konkretnej kostce; wcześniej byłyby liczbami bez dowodu.
