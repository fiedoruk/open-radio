# 13 — Architektura niezawodności

## Główna zasada

Urządzenie ma samodzielnie wracać do grania. Restart użytkownika jest ostatnim,
a nie podstawowym mechanizmem naprawy.

## Minimalny pipeline

```text
StationCatalog
  -> StreamResolver
  -> Decoder (MP3 first)
  -> PcmNormalizer (44.1 kHz / stereo / 16-bit)
  -> bounded PcmQueue
  -> OutputRouter
       -> BluetoothA2dpOutput
       -> Core2SpeakerOutput (fallback)

RecoverySupervisor observes every stage.
UiPresenter reads state; it never controls audio internals directly.
```

## Kolejność startu

1. Sprawdzenie NVS i last-known-good.
2. Ekran oraz podstawowa diagnostyka hardware.
3. Połączenie z ostatnią siecią Wi-Fi.
4. Próba odzyskania zapamiętanego głośnika po MAC.
5. Uruchomienie ostatniej działającej stacji.
6. Jeśli Bluetooth nie wróci w ograniczonym czasie — wbudowany głośnik.
7. UI pokazuje stan, ale nie blokuje startu audio.

## Recovery supervisor

Supervisor rozróżnia:

- brak Wi-Fi,
- brak DNS/HTTP,
- przekierowanie lub playlistę,
- brak danych streamu,
- błąd dekodera,
- underrun PCM,
- utratę Bluetooth,
- brak pamięci,
- reset watchdog/power.

Każda klasa ma osobny licznik, backoff i limit. Nie wykonujemy szybkiego restartu
w nieskończonej pętli.

## Recovery policy v1

| Problem | Automatyczna reakcja |
|---|---|
| Wi-Fi utracone | scan i wybór spośród znanych profili, reconnect z backoffem, bez kasowania konfiguracji |
| Stream milczy | ponowne otwarcie tego samego endpointu, potem alternatywa |
| HTTP 404/timeout | resolver, alternatywa, kwarantanna endpointu; następna działająca stacja po Q-17 |
| Bluetooth utracony | krótkie próby reconnect, potem wbudowany speaker |
| Dekoder zawiesza się | zamknięcie pipeline i czysty restart stacji |
| Konfiguracja uszkodzona | rollback do last-known-good |
| Brak pamięci | kontrolowany restart z zapisem powodu, bez boot loopa |

## Last-known-good

Osobno zapisujemy:

- do ośmiu zatwierdzonych sieci i ich health score,
- MAC głośnika,
- ostatnią stację,
- ostatni sprawdzony endpoint,
- wersję katalogu,
- wersję konfiguracji,
- ostatni poprawny boot i powód resetu.

Nowa konfiguracja staje się `known-good` dopiero po udanym odtwarzaniu.

Kontrakt atomowego zapisu A/B, CRC32, migracji v1 -> v2 i bezpiecznego bootu
jest zamknięty w `docs/35-persistence-contract.md`. Hostowy fault matrix znajduje
się w `docs/36-persistence-fault-matrix.md`; fizyczna trwałość NVS/flash pozostaje
bramką sprzętową.

Kontrakt wyboru do ośmiu sieci, scoringu, kwarantanny i bounded retry jest w
`docs/41-network-selection-contract.md`. Hostowy selector operuje wyłącznie na
opaque references; rzeczywiste SSID i credentials należą do prywatnego adaptera
urządzenia.

## Autonomiczny QC

Szczegółowa state machine, limity naprawy i lokalne dowody są w
`docs/19-autonomous-qc-state-machine.md`. Supervisor ma usuwać znane problemy,
nie maskować nieskończone pętle. Niedostępna funkcja dodatkowa degraduje się tak,
aby utrzymać dźwięk.

## Pamięć i zadania

- PSRAM: bufory sieciowe, większy bounded PCM ring buffer, cache UI.
- Internal RAM: DMA, stosy tasków i krytyczne bufory wymagane przez sterowniki.
- Mierzymy `minimum free internal heap`, nie tylko wolną PSRAM.
- UI odświeża się zdarzeniowo, docelowo 2–5 Hz podczas grania.
- W MVP nie odtwarzamy jednocześnie przez BT i local speaker.

## Bramka stabilności

1. 60 minut MP3 na wbudowanym speakerze.
2. 60 minut generowanego PCM przez A2DP.
3. 2 godziny MP3 -> PCM -> A2DP.
4. 8 godzin z reconnectami Wi-Fi, streamu i głośnika.
5. 24 godziny przed publicznym wydaniem stabilnym.

Po trzech nieudanych poprawkach tego samego problemu zatrzymujemy Arduino POC i
oceniamy ESP-IDF/ESP-ADF zamiast maskować błąd coraz większym buforem.
