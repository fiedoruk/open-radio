# 19 — Autonomiczny QC i state machine

## Cel nadrzędny

QC nie jest tylko zestawem testów przed wydaniem. Jest lokalnym supervisorem,
który obserwuje każdą warstwę i podejmuje ograniczone, deterministyczne próby
powrotu do dźwięku. Jedyny sukces użytkowy to stabilne `PLAYING`.

## Stany główne

```text
BOOT_SELF_TEST
  -> WIFI_SELECT
  -> STREAM_RESOLVE
  -> AUDIO_BUFFERING
  -> OUTPUT_CONNECT
  -> PLAYING

Każdy stan może przejść do RECOVERING.
RECOVERING może wrócić do poprzedniego stanu, użyć fallbacku albo wejść w
DEGRADED_PLAYING. CONFIG_REQUIRED jest dozwolone tylko bez znanej sieci.
```

## Hierarchia naprawy

1. Napraw lokalnie ten sam etap bez zrywania reszty pipeline.
2. Ponów działanie z rosnącym backoffem i jitterem.
3. Użyj last-known-good albo zatwierdzonej alternatywy.
4. Zdegraduj funkcję dodatkową, ale zachowaj dźwięk.
5. Zrestartuj tylko niesprawny podsystem.
6. Zrestartuj całe urządzenie wyłącznie po wyczerpaniu limitów.
7. Po powtarzalnym boot loopie uruchom tryb safe i wbudowany speaker.

## Polityki podsystemów

### Wi-Fi

- przechowuje do ośmiu lokalnie zatwierdzonych profili,
- skanuje, punktuje RSSI, ostatni sukces i liczbę ostatnich błędów,
- próbuje dostępnych znanych sieci, nie tylko ostatniej,
- po rozłączeniu nie kasuje hasła ani całej konfiguracji,
- nie łączy sieci otwartych i nie automatyzuje captive portalu,
- portal lokalny uruchamia dopiero po braku jakiejkolwiek znanej sieci.

### Stacja

- resolver pyta oficjalną powierzchnię operatora, gdy jest dostępna,
- transient CDN host nigdy nie staje się kanonicznym źródłem,
- endpoint ma health score, licznik błędów i czas kwarantanny,
- kolejność: primary -> alternate -> ponowne rozwiązanie -> last-known-good,
- cisza jest wykrywana przez brak ramek, brak postępu dekodera i brak PCM,
- wybrana stacja jest okresowo ponawiana po przejściu na awaryjną.

### Audio i Bluetooth

- kolejka PCM jest ograniczona i ma miernik underrun/overrun,
- A2DP łączy zapamiętany MAC i negocjuje SBC,
- brak AVRCP nie blokuje audio,
- po ograniczonym oknie reconnectu `OutputRouter` przełącza na Core2 speaker,
- próby A2DP trwają w tle z długim backoffem,
- ponowne przejście na BT nie może powodować pętli lub głośnego artefaktu.

### Pamięć i konfiguracja

- zapis jest atomowy: wersja robocza, walidacja, commit,
- ostatnia poprawna konfiguracja jest przechowywana osobno,
- `known-good` wymaga udanego odtwarzania przez określony czas,
- zapis zawiera wersję schematu i checksum,
- krytyczne bufory oraz minimalny internal heap są stale mierzone.

## Decyzja potrzebna

Gdy wybrana stacja nie działa po pełnym cyklu recovery, rekomendowane zachowanie
to automatyczne uruchomienie ostatniej działającej stacji, pokazanie jasnego
komunikatu i okresowe ponawianie stacji wybranej. To najlepiej realizuje cel
„radio ma grać”, ale właściciel musi zaakceptować zmianę stacji bez dotykania ekranu.

## Dowody QC

Firmware utrzymuje lokalne, ograniczone ring-buffer logów:

- powód ostatniego restartu,
- stan i licznik każdej klasy recovery,
- wybraną sieć bez zapisu/eksportu hasła,
- nazwę profilu BT i zanonimizowany identyfikator w ekranie diagnostyki,
- minimum internal heap,
- liczby underrunów i zmian outputu,
- ostatni udany endpoint i czas stabilnego grania.

Nic nie jest automatycznie wysyłane poza urządzenie.
